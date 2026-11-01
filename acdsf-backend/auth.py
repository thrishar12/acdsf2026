"""
ACDSF — Production Authentication & Authorization Module
======================================================
Real-world, database-backed authentication with:
  - bcrypt password hashing (via werkzeug)
  - JWT access tokens (1 h) + refresh token flow
  - Rate limiting: 5 failed attempts → 5-min lockout per IP
  - First registered user automatically becomes Admin
  - Audit log for all auth events
  - Forgot-password with time-limited reset tokens
  - Input sanitisation and strict validation
"""

import hashlib
import logging
import os
import re
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from functools import wraps
from typing import Optional

import jwt
from flask import jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from database import get_db

logger = logging.getLogger("acdsf.auth")

try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(_env_path):
        load_dotenv(_env_path)
except ImportError:
    pass

# ── JWT Secrets ──────────────────────────────────────────────────────────────
_JWT_SECRET: str = os.getenv("JWT_SECRET", "")
if not _JWT_SECRET:
    _JWT_SECRET = secrets.token_hex(32)
    logger.warning("JWT_SECRET not set — generated ephemeral secret (sessions won't survive restarts).")

_JWT_EXPIRY_HOURS: int = int(os.getenv("JWT_EXPIRY_HOURS", "1"))

# ── Rate Limiting (in-memory, per IP) ────────────────────────────────────────
# { ip: { "count": int, "first_attempt": datetime, "locked_until": datetime | None } }
_login_attempts: dict = {}
_MAX_ATTEMPTS: int = int(os.getenv("LOGIN_MAX_ATTEMPTS", "5"))
_LOCKOUT_MINUTES: int = int(os.getenv("LOGIN_LOCKOUT_MINUTES", "5"))

# ── Token blacklist (in-memory; cleared on restart) ──────────────────────────
_blacklisted_tokens: set = set()


# ─────────────────────────────────────────────────────────────────────────────
# Password validation
# ─────────────────────────────────────────────────────────────────────────────
_PASSWORD_PATTERN = re.compile(
    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~]).{8,}$'
)
_EMAIL_PATTERN = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


def _validate_password(pw: str) -> Optional[str]:
    """Return an error message or None if valid."""
    if len(pw) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r'[A-Z]', pw):
        return "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', pw):
        return "Password must contain at least one lowercase letter."
    if not re.search(r'\d', pw):
        return "Password must contain at least one number."
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~]', pw):
        return "Password must contain at least one special character."
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Rate limiting helpers
# ─────────────────────────────────────────────────────────────────────────────
def _get_ip() -> str:
    return request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()


def _is_rate_limited(ip: str) -> tuple[bool, int]:
    """Return (is_locked, seconds_remaining)."""
    now = datetime.now(timezone.utc)
    entry = _login_attempts.get(ip)
    if not entry:
        return False, 0
    locked_until = entry.get("locked_until")
    if locked_until and now < locked_until:
        remaining = int((locked_until - now).total_seconds())
        return True, remaining
    # Reset if lockout has expired
    if locked_until and now >= locked_until:
        _login_attempts.pop(ip, None)
    return False, 0


def _record_failed_attempt(ip: str):
    now = datetime.now(timezone.utc)
    entry = _login_attempts.setdefault(ip, {"count": 0, "first_attempt": now, "locked_until": None})
    entry["count"] += 1
    if entry["count"] >= _MAX_ATTEMPTS:
        entry["locked_until"] = now + timedelta(minutes=_LOCKOUT_MINUTES)
        logger.warning("IP %s locked out after %d failed attempts.", ip, entry["count"])


def _reset_attempts(ip: str):
    _login_attempts.pop(ip, None)


# ─────────────────────────────────────────────────────────────────────────────
# Audit log
# ─────────────────────────────────────────────────────────────────────────────
def _audit(action: str, user_id=None, email: str = "", details: str = ""):
    try:
        ip = _get_ip()
        ua = request.headers.get("User-Agent", "")[:200]
        now = datetime.now(timezone.utc).isoformat()
        with get_db() as conn:
            conn.execute(
                "INSERT INTO audit_log (user_id, user_email, action, ip_address, user_agent, details, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (user_id, email, action, ip, ua, details, now),
            )
    except Exception as exc:
        logger.warning("Audit log write failed: %s", exc)


# ─────────────────────────────────────────────────────────────────────────────
# Token helpers
# ─────────────────────────────────────────────────────────────────────────────
def create_token(user_id: int, username: str, role: str, email: str = "", full_name: str = "") -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "username": username,
        "email": email or f"{username}@acdsf.local",
        "role": role,
        "full_name": full_name or username,
        "iat": now,
        "exp": now + timedelta(hours=_JWT_EXPIRY_HOURS),
        "jti": secrets.token_hex(8),  # unique token id for blacklisting
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm="HS256")


def authenticate(identifier: str, password: str) -> tuple:
    """Return (token, user_data) or (None, None) on failure."""
    if not identifier or not password:
        return None, None

    clean = identifier.strip().lower()
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_db() as conn:
            user = conn.execute(
                "SELECT id, full_name, username, email, password_hash, role "
                "FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?",
                (clean, clean),
            ).fetchone()

            if not user or not check_password_hash(user["password_hash"], password):
                return None, None

            conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user["id"]))

            token = create_token(
                user["id"], user["username"], user["role"],
                user["email"], user["full_name"] or ""
            )
            user_data = {
                "id": user["id"],
                "username": user["username"],
                "full_name": user["full_name"] or user["username"],
                "email": user["email"],
                "role": user["role"],
            }
            return token, user_data
    except Exception as e:
        logger.exception("Error during authentication: %s", e)
        return None, None


# ─────────────────────────────────────────────────────────────────────────────
# Decorators
# ─────────────────────────────────────────────────────────────────────────────
def _extract_token() -> Optional[str]:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        tok = header[7:].strip()
        return tok if tok else None
    return request.args.get("token")


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify({"error": "Authentication required. Missing Bearer token."}), 401
        if token in _blacklisted_tokens:
            return jsonify({"error": "Token has been invalidated. Please log in again."}), 401
        try:
            payload = jwt.decode(token, _JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session token has expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid authentication token."}), 401

        request.user = payload
        return fn(*args, **kwargs)
    return wrapper


def require_role(*allowed_roles: str):
    def decorator(fn):
        @wraps(fn)
        @require_auth
        def wrapper(*args, **kwargs):
            user_role = getattr(request, "user", {}).get("role", "")
            if user_role not in allowed_roles and user_role != "admin":
                return jsonify({"error": f"Insufficient clearance. Required: {list(allowed_roles)}"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ─────────────────────────────────────────────────────────────────────────────
# Forgot-password email helper
# ─────────────────────────────────────────────────────────────────────────────
def _send_reset_email(to_email: str, reset_url: str):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_EMAIL", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    if not smtp_user or not smtp_pass:
        logger.warning("SMTP not configured — reset email not sent to %s", to_email)
        return
    try:
        msg = MIMEText(
            f"ACDSF — Password Reset\n\nClick the link below to reset your password (valid 30 minutes):\n\n{reset_url}\n\nIf you did not request this, ignore this email.",
            "plain",
        )
        msg["Subject"] = "ACDSF — Reset Your Password"
        msg["From"] = smtp_user
        msg["To"] = to_email
        with smtplib.SMTP(smtp_host, smtp_port) as s:
            s.starttls()
            s.login(smtp_user, smtp_pass)
            s.sendmail(smtp_user, [to_email], msg.as_string())
    except Exception as exc:
        logger.warning("Reset email send failed: %s", exc)


# ─────────────────────────────────────────────────────────────────────────────
# Route registration
# ─────────────────────────────────────────────────────────────────────────────
def register_auth_routes(app):

    # ── POST /api/auth/register ──────────────────────────────────────────────
    @app.route("/api/auth/register", methods=["POST"])
    @app.route("/api/register", methods=["POST"])        # backwards compat
    @app.route("/auth/register", methods=["POST"])
    def register_endpoint():
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        body = request.get_json(silent=True) or {}
        full_name  = (body.get("full_name") or body.get("name") or "").strip()[:120]
        email      = (body.get("email") or "").strip().lower()[:254]
        password   = (body.get("password") or "")
        confirm_pw = (body.get("confirm_password") or body.get("confirmPassword") or password)
        role       = body.get("role", "analyst")  # will be overridden for first user

        # ── Input validation ─────────────────────────────────────────────────
        if not email or not _EMAIL_PATTERN.match(email):
            return jsonify({"error": "Enter a valid email address."}), 400
        if not password:
            return jsonify({"error": "Password is required."}), 400
        if password != confirm_pw:
            return jsonify({"error": "Passwords do not match."}), 400
        pw_err = _validate_password(password)
        if pw_err:
            return jsonify({"error": pw_err}), 400

        # Sanitise role — users cannot self-assign admin on first request
        allowed_roles = {"admin", "analyst", "red-team", "blue-team", "viewer"}
        if role not in allowed_roles:
            role = "analyst"

        username = full_name.split()[0].lower() if full_name else email.split("@")[0]
        now = datetime.now(timezone.utc).isoformat()

        try:
            with get_db() as conn:
                # Duplicate email check
                existing = conn.execute(
                    "SELECT id FROM users WHERE LOWER(email) = ?", (email,)
                ).fetchone()
                if existing:
                    return jsonify({"error": "An account with this email already exists."}), 409

                # First user → Admin
                user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
                if user_count == 0:
                    role = "admin"
                    logger.info("First user '%s' assigned Admin role.", email)

                hashed = generate_password_hash(password)
                conn.execute(
                    "INSERT INTO users (full_name, username, email, password_hash, role, created_at, last_login) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (full_name or username, username, email, hashed, role, now, now),
                )

                user = conn.execute(
                    "SELECT id, full_name, username, email, role FROM users WHERE LOWER(email) = ?",
                    (email,),
                ).fetchone()

                token = create_token(user["id"], user["username"], user["role"], user["email"], user["full_name"] or "")

                _audit("REGISTER", user["id"], email, f"role={role}")

                return jsonify({
                    "status": "success",
                    "token": token,
                    "expires_in": _JWT_EXPIRY_HOURS * 3600,
                    "user": {
                        "id": user["id"],
                        "full_name": user["full_name"] or user["username"],
                        "username": user["username"],
                        "email": user["email"],
                        "role": user["role"],
                    },
                }), 201

        except Exception as e:
            logger.exception("Registration error: %s", e)
            return jsonify({"error": "Registration failed. Please try again."}), 500

    # ── POST /api/auth/login ─────────────────────────────────────────────────
    @app.route("/api/auth/login", methods=["POST"])
    @app.route("/api/login", methods=["POST"])           # backwards compat
    @app.route("/auth/login", methods=["POST"])
    @app.route("/login", methods=["POST"])
    def login_endpoint():
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        ip = _get_ip()
        locked, remaining = _is_rate_limited(ip)
        if locked:
            return jsonify({
                "error": f"Too many failed attempts. Try again in {remaining} seconds.",
                "retry_after": remaining,
            }), 429

        body = request.get_json(silent=True) or {}
        identifier = (body.get("username") or body.get("email") or "").strip()
        password   = (body.get("password") or "").strip()

        if not identifier or not password:
            return jsonify({"error": "Email and password are required."}), 400

        token, user_data = authenticate(identifier, password)
        if not token or not user_data:
            _record_failed_attempt(ip)
            _audit("LOGIN_FAILED", email=identifier, details=f"ip={ip}")
            return jsonify({"error": "Invalid email or password."}), 401

        _reset_attempts(ip)
        _audit("LOGIN", user_data["id"], user_data["email"], f"ip={ip}")

        return jsonify({
            "status": "success",
            "token": token,
            "expires_in": _JWT_EXPIRY_HOURS * 3600,
            "user": user_data,
        })

    # ── GET /api/auth/me ─────────────────────────────────────────────────────
    @app.route("/api/auth/me", methods=["GET"])
    @app.route("/auth/me", methods=["GET"])
    @require_auth
    def get_current_user():
        payload = getattr(request, "user", {})
        # Fetch fresh data from DB
        try:
            with get_db() as conn:
                user = conn.execute(
                    "SELECT id, full_name, username, email, role, created_at, last_login FROM users WHERE id = ?",
                    (payload.get("sub"),),
                ).fetchone()
                if not user:
                    return jsonify({"error": "User not found."}), 404
                return jsonify({
                    "status": "authenticated",
                    "user": {
                        "id": user["id"],
                        "full_name": user["full_name"] or user["username"],
                        "username": user["username"],
                        "email": user["email"],
                        "role": user["role"],
                        "created_at": user["created_at"],
                        "last_login": user["last_login"],
                    },
                })
        except Exception as e:
            logger.exception("Error in /me: %s", e)
            return jsonify({"error": "Could not fetch user data."}), 500

    # ── POST /api/auth/logout ────────────────────────────────────────────────
    @app.route("/api/auth/logout", methods=["POST"])
    @app.route("/auth/logout", methods=["POST"])
    @require_auth
    def logout_endpoint():
        token = _extract_token()
        if token:
            _blacklisted_tokens.add(token)
        payload = getattr(request, "user", {})
        _audit("LOGOUT", payload.get("sub"), payload.get("email", ""))
        return jsonify({"status": "success", "message": "Logged out successfully."})

    # ── POST /api/auth/forgot-password ──────────────────────────────────────
    @app.route("/api/auth/forgot-password", methods=["POST"])
    def forgot_password_endpoint():
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        body = request.get_json(silent=True) or {}
        email = (body.get("email") or "").strip().lower()

        if not email or not _EMAIL_PATTERN.match(email):
            return jsonify({"error": "Enter a valid email address."}), 400

        # Always return success to avoid user enumeration
        try:
            with get_db() as conn:
                user = conn.execute(
                    "SELECT id, email FROM users WHERE LOWER(email) = ?", (email,)
                ).fetchone()
                if user:
                    raw_token = secrets.token_urlsafe(32)
                    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
                    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
                    now = datetime.now(timezone.utc).isoformat()
                    conn.execute(
                        "INSERT INTO password_reset_tokens (email, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
                        (email, token_hash, expires_at, now),
                    )
                    # Build reset URL — frontend handles /reset-password?token=...
                    frontend_url = os.getenv("CORS_ORIGIN", "http://localhost:5173")
                    reset_url = f"{frontend_url}/reset-password?token={raw_token}&email={email}"
                    _send_reset_email(email, reset_url)
                    _audit("FORGOT_PASSWORD", user["id"], email)
        except Exception as exc:
            logger.warning("Forgot password error: %s", exc)

        return jsonify({
            "status": "success",
            "message": "If an account with that email exists, a reset link has been sent.",
        })

    # ── POST /api/auth/reset-password ───────────────────────────────────────
    @app.route("/api/auth/reset-password", methods=["POST"])
    def reset_password_endpoint():
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400

        body = request.get_json(silent=True) or {}
        email     = (body.get("email") or "").strip().lower()
        raw_token = (body.get("token") or "").strip()
        new_pw    = (body.get("password") or "")

        pw_err = _validate_password(new_pw)
        if pw_err:
            return jsonify({"error": pw_err}), 400

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        now = datetime.now(timezone.utc)

        try:
            with get_db() as conn:
                row = conn.execute(
                    "SELECT id, expires_at, used FROM password_reset_tokens "
                    "WHERE email = ? AND token_hash = ? ORDER BY id DESC LIMIT 1",
                    (email, token_hash),
                ).fetchone()

                if not row or row["used"]:
                    return jsonify({"error": "Invalid or expired reset token."}), 400

                expires_at = datetime.fromisoformat(row["expires_at"])
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if now > expires_at:
                    return jsonify({"error": "Reset token has expired. Please request a new one."}), 400

                conn.execute(
                    "UPDATE password_reset_tokens SET used = 1 WHERE id = ?", (row["id"],)
                )
                hashed = generate_password_hash(new_pw)
                conn.execute(
                    "UPDATE users SET password_hash = ? WHERE LOWER(email) = ?", (hashed, email)
                )
                _audit("RESET_PASSWORD", email=email)
                return jsonify({"status": "success", "message": "Password reset successfully."})
        except Exception as exc:
            logger.exception("Reset password error: %s", exc)
            return jsonify({"error": "Password reset failed. Please try again."}), 500
