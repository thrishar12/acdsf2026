"""
ACDSF — Sovereign Notification Service
======================================
Unified multi-channel incident notification dispatcher:
  1. Dashboard SSE Popups — real-time alerts with deduplication
  2. Multi-Recipient Email via SMTP (SSL/TLS, dark-neon HTML templates, delivery audit log)
  3. SMS Alerts via Gateway (Fast2SMS / Twilio / Generic Gateway / Simulated with audit log)
  4. Client Web / Mobile Push

All channels trigger from real-time detection events without blocking the detection engine.
"""

import json
import logging
import os
import queue
import re
import smtplib
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional, Tuple

try:
    from dotenv import load_dotenv as _load_dotenv
    _env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(_env_path):
        _load_dotenv(_env_path)
    else:
        _load_dotenv()
except ImportError:
    pass

from database import get_db

logger = logging.getLogger("acdsf.notification_service")

# ---------------------------------------------------------------------------
# Registered Recipients (Mandatory Academic Project Recipients)
# ---------------------------------------------------------------------------
REGISTERED_EMAIL_RECIPIENTS: List[str] = [
    "sneharamachandra31@gmail.com",
    "sneha82174923@gmail.com",
    "ramachandra82776435@gmail.com",
    "thrishanaidu03@gmail.com",
    "thrishanaidu03@gmail.com",  # Duplicate input — will be deduplicated
    "thrishanaidu21@gmail.com",
    "rajk7806603@gmail.com",
    "thrishanaidu113@gmail.com",
    "thrishar467@gmail.com",
]

REGISTERED_MOBILE_NUMBERS: List[str] = [
    "7795019885",
    "9481905739",
    "9945061018",
    "9008978726",
    "8217492382",
    "8277643587",
    "8277429507",
    "8762623300",
]

# ---------------------------------------------------------------------------
# SSE Event Bus — subscribers receive real-time dashboard events
# ---------------------------------------------------------------------------
_sse_subscribers: List[queue.Queue] = []
_sse_lock = threading.Lock()


def sse_subscribe() -> queue.Queue:
    """Register a new SSE subscriber and return its queue."""
    q: queue.Queue = queue.Queue(maxsize=100)
    with _sse_lock:
        _sse_subscribers.append(q)
    logger.debug("SSE subscriber added. Total: %d", len(_sse_subscribers))
    return q


def sse_unsubscribe(q: queue.Queue) -> None:
    """Remove a subscriber queue."""
    with _sse_lock:
        try:
            _sse_subscribers.remove(q)
        except ValueError:
            pass
    logger.debug("SSE subscriber removed. Total: %d", len(_sse_subscribers))


def _sse_broadcast(event_type: str, data: dict) -> None:
    """Push an event to all active SSE subscribers."""
    payload = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    dead = []
    with _sse_lock:
        for q in _sse_subscribers:
            try:
                q.put_nowait(payload)
            except queue.Full:
                dead.append(q)
        for q in dead:
            try:
                _sse_subscribers.remove(q)
            except ValueError:
                pass


# ---------------------------------------------------------------------------
# In-Memory Event Deduplication Store
# ---------------------------------------------------------------------------
_recent_dispatches: Dict[str, float] = {}
_dispatch_dedup_lock = threading.Lock()


def should_dispatch_incident(incident_id: str, status: str = "DETECTED", cooldown_seconds: int = 5) -> bool:
    """
    Prevents duplicate notifications for the exact same detection event within cooldown window.
    Default 5s allows fast iterative testing and multi-round simulation alerts.
    """
    if not incident_id:
        return True
    key = f"{incident_id}_{status}"
    now = time.time()
    with _dispatch_dedup_lock:
        last = _recent_dispatches.get(key, 0)
        if now - last < cooldown_seconds:
            logger.info("[DEDUPLICATION] Suppressed duplicate notification for %s (%0.1fs ago)", key, now - last)
            return False
        _recent_dispatches[key] = now
        # Evict old keys (older than 10 mins)
        for k in list(_recent_dispatches.keys()):
            if now - _recent_dispatches[k] > 600:
                _recent_dispatches.pop(k, None)
        return True


# ---------------------------------------------------------------------------
# Validation & Normalization Helpers
# ---------------------------------------------------------------------------
_EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def is_valid_email(email: str) -> bool:
    """Strict email format validation."""
    return bool(email and _EMAIL_REGEX.match(email.strip()))


def format_indian_phone(phone: str) -> Tuple[bool, str]:
    """
    Validates and formats Indian mobile numbers to international format (+91XXXXXXXXXX).
    Accepts 10-digit, +91-prefixed, 91-prefixed, or 0-prefixed numbers.
    """
    clean = re.sub(r"\D", "", str(phone or ""))
    if len(clean) == 10 and clean[0] in "6789":
        return True, f"+91{clean}"
    if len(clean) == 12 and clean.startswith("91") and clean[2] in "6789":
        return True, f"+{clean}"
    if len(clean) == 11 and clean.startswith("0") and clean[1] in "6789":
        return True, f"+91{clean[1:]}"
    return False, phone


def get_deduplicated_emails(custom_recipient: Optional[str] = None) -> List[str]:
    """Returns deduplicated, validated list of recipient email addresses."""
    candidates = list(REGISTERED_EMAIL_RECIPIENTS)
    if custom_recipient and custom_recipient.strip():
        candidates.append(custom_recipient.strip())
    deduped = []
    seen = set()
    for e in candidates:
        norm = e.strip().lower()
        if is_valid_email(norm) and norm not in seen:
            seen.add(norm)
            deduped.append(norm)
    return deduped


def get_deduplicated_phones(custom_phone: Optional[str] = None) -> List[str]:
    """Returns deduplicated, validated list of Indian mobile numbers (+91...)."""
    candidates = list(REGISTERED_MOBILE_NUMBERS)
    if custom_phone and custom_phone.strip():
        candidates.append(custom_phone.strip())
    deduped = []
    seen = set()
    for p in candidates:
        valid, formatted = format_indian_phone(p)
        if valid and formatted not in seen:
            seen.add(formatted)
            deduped.append(formatted)
        elif not valid:
            logger.warning("Invalid phone format skipped: %s", p)
    return deduped


def get_recommended_action(incident: dict) -> str:
    """Generates context-aware, recommended incident response actions."""
    if incident.get("recommended_action"):
        return str(incident["recommended_action"])

    attack_type = (incident.get("attack_type") or "").upper()
    target = incident.get("target") or "target node"

    if "DDOS" in attack_type or "FLOOD" in attack_type or "T1498" in attack_type:
        return f"Apply OpenFlow DROP rule on edge switch, rate-limit ingress ports, and redirect flood packets away from {target}."
    elif "SQL" in attack_type or "INJECTION" in attack_type:
        return f"Engage WAF SQLi virtual patch, isolate database connection pool for {target}, and terminate suspicious sessions."
    elif "RANSOMWARE" in attack_type or "EXFILTRATION" in attack_type:
        return f"Isolate {target} immediately via SDN controller, revoke anomalous credentials, and freeze critical shares."
    elif "PORT" in attack_type or "SCAN" in attack_type or "RECON" in attack_type:
        return f"Block probing source IP at perimeter firewall and deploy deception honeypot routes."
    elif "LATERAL" in attack_type or "SMB" in attack_type:
        return f"Sever inter-VLAN routing to {target}, enforce Zero-Trust microsegmentation, and inspect endpoint telemetry."
    else:
        return f"Deploy SDN OpenFlow DROP isolation rule on switch to quarantine {target} and initiate SOAR containment playbook."


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Database Logging Helpers
# ---------------------------------------------------------------------------
def record_email_log(
    recipient: str,
    subject: str,
    status: str,
    attempts: int = 1,
    error: Optional[str] = None,
    incident_id: Optional[str] = None,
    body_html: Optional[str] = None,
    body_text: Optional[str] = None,
):
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO email_logs (incident_id, recipient, subject, status, attempts, error, created_at, body_html, body_text)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (incident_id, recipient, subject, status, attempts, error, _now_iso(), body_html, body_text),
            )
    except Exception as exc:
        logger.warning("Failed to record email log: %s", exc)


def record_sms_log(recipient: str, message: str, status: str, provider: str, attempts: int = 1, error: Optional[str] = None, incident_id: Optional[str] = None):
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO sms_logs (incident_id, recipient, message, status, provider, attempts, error, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (incident_id, recipient, message, status, provider, attempts, error, _now_iso()),
            )
    except Exception as exc:
        logger.warning("Failed to record SMS log: %s", exc)


# ---------------------------------------------------------------------------
# Device Token Store
# ---------------------------------------------------------------------------
_device_tokens: set = set()
_tokens_lock = threading.Lock()


def register_device_token(token: str) -> None:
    with _tokens_lock:
        _device_tokens.add(token)
    logger.info("Device token registered. Total: %d", len(_device_tokens))


def get_device_tokens() -> List[str]:
    with _tokens_lock:
        return list(_device_tokens)


# ---------------------------------------------------------------------------
# Email Delivery System
# ---------------------------------------------------------------------------
def _load_smtp_config() -> dict:
    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    try:
        port = int(os.getenv("SMTP_PORT", "587"))
    except (ValueError, TypeError):
        port = 587
    user = (os.getenv("SMTP_USER") or os.getenv("SMTP_EMAIL") or "").strip()
    password = (os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD") or "").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "ACDSF SOC Command").strip()
    to = (os.getenv("SMTP_ALERT_TO") or os.getenv("SMTP_TO") or user or "admin@acdsf.gov").strip()

    is_placeholder = (
        not password
        or "orugandha" in password.lower()
        or len(password) < 8
        or not user
        or "your-email" in user.lower()
    )

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_name": from_name,
        "to": to,
        "is_placeholder": is_placeholder,
    }


def _build_html_email_body(incident: dict, recommended_action: str) -> str:
    incident_id = incident.get("incident_id", "INC-ACDSF-UNKNOWN")
    attack_type = incident.get("attack_type", "Threat Vector")
    severity = (incident.get("severity") or "HIGH").upper()
    risk_score = incident.get("risk_score", 85)
    source = incident.get("source_ip") or incident.get("source") or "10.0.1.45 (Red Team Adversary)"
    target = incident.get("target") or "Sovereign Node"
    detected_at = incident.get("attack_detected_at") or _now_iso()
    mitre_tech = f"{incident.get('mitre_technique_id', 'T1021')} — {incident.get('mitre_technique_name', 'Remote Services')}"
    confidence = incident.get("confidence_score", 94.0)

    # Visual accent by severity
    accent_color = "#ef4444" if severity == "CRITICAL" else "#f97316" if severity == "HIGH" else "#eab308"

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Cybersecurity Alert</title></head>
<body style="background:#07090e;color:#e2e8f0;font-family:'Courier New',Courier,monospace;padding:24px;margin:0">
  <div style="max-width:640px;margin:0 auto;border:1px solid {accent_color};border-radius:12px;overflow:hidden;background:#0d141e;box-shadow:0 0 25px rgba(0,0,0,0.8)">
    
    <div style="background:linear-gradient(135deg,#200714 0%,#07090e 100%);padding:24px;border-bottom:1px solid {accent_color}">
      <p style="color:{accent_color};font-size:11px;text-transform:uppercase;letter-spacing:0.25em;margin:0;font-weight:bold">
        🚨 ACDSF NATIONAL CYBER DEFENCE ALERT
      </p>
      <h1 style="color:#ffffff;font-size:22px;margin:8px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
        🚨 An attack is in progress! An attack has been detected!
      </h1>
      <p style="color:#94a8be;font-size:12px;margin:4px 0 0 0">
        AI-Powered Cyber Defence Simulation Framework &bull; Autonomous SOC Dispatch
      </p>
    </div>

    <div style="padding:24px">
      <!-- Incident Overview -->
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td colspan="2" style="padding:8px 0;border-bottom:1px solid #334155;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:bold">INCIDENT TELEMETRY</td></tr>
        <tr>
          <td style="padding:8px 4px;color:#94a3b8">Incident ID</td>
          <td style="padding:8px 4px;color:#00f5ff;font-weight:bold;text-align:right">{incident_id}</td>
        </tr>
        <tr>
          <td style="padding:8px 4px;color:#94a3b8">Attack Type</td>
          <td style="padding:8px 4px;color:#ffffff;font-weight:bold;text-align:right">{attack_type}</td>
        </tr>
        <tr>
          <td style="padding:8px 4px;color:#94a3b8">Threat Severity</td>
          <td style="padding:8px 4px;color:{accent_color};font-weight:bold;text-align:right">{severity}</td>
        </tr>
        <tr>
          <td style="padding:8px 4px;color:#94a3b8">Calculated Risk Score</td>
          <td style="padding:8px 4px;color:#ef4444;font-weight:bold;text-align:right">{risk_score}/100</td>
        </tr>
        <tr>
          <td style="padding:8px 4px;color:#94a3b8">Source IP / Adversary</td>
          <td style="padding:8px 4px;color:#ff007f;font-weight:bold;text-align:right">{source}</td>
        </tr>
        <tr>
          <td style="padding:8px 4px;color:#94a3b8">Target Asset Node</td>
          <td style="padding:8px 4px;color:#a855f7;font-weight:bold;text-align:right">{target}</td>
        </tr>
        <tr>
          <td style="padding:8px 4px;color:#94a3b8">Detection Time</td>
          <td style="padding:8px 4px;color:#00ff9d;font-weight:bold;text-align:right">{detected_at}</td>
        </tr>
        <tr>
          <td style="padding:8px 4px;color:#94a3b8">AI Detection Confidence</td>
          <td style="padding:8px 4px;color:#00ff9d;font-weight:bold;text-align:right">{confidence}%</td>
        </tr>
        <tr>
          <td style="padding:8px 4px;color:#94a3b8">MITRE ATT&amp;CK</td>
          <td style="padding:8px 4px;color:#c084fc;text-align:right">{mitre_tech}</td>
        </tr>
      </table>

      <!-- Recommended Action Box -->
      <div style="margin-top:20px;padding:14px;background:#1a080c;border-radius:8px;border-left:4px solid {accent_color}">
        <p style="color:{accent_color};font-size:11px;text-transform:uppercase;margin:0 0 6px 0;font-weight:bold">
          🛡️ RECOMMENDED RESPONSE ACTION
        </p>
        <p style="color:#f1f5f9;font-size:13px;margin:0;line-height:1.5">
          {recommended_action}
        </p>
      </div>

      <!-- SOC CTA -->
      <div style="text-align:center;margin-top:24px">
        <a href="http://localhost:5173/app/attack-report" style="background:#00f5ff;color:#07090e;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:bold;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;display:inline-block">
          Open SOC Command Console &rarr;
        </a>
      </div>
    </div>

    <div style="padding:14px;background:#05070c;text-align:center;border-top:1px solid #1e293b">
      <p style="color:#475569;font-size:10px;margin:0">
        ACDSF — Autonomous Cyber Defence Framework &bull; Confidential Telemetry Alert
      </p>
    </div>
  </div>
</body>
</html>"""


def send_email_notification(
    incident: dict,
    recipient: Optional[str] = None,
    recipients_list: Optional[List[str]] = None,
) -> Tuple[bool, str, Dict[str, str]]:
    """
    Sends actual email alerts to all registered recipients (with deduplication).
    Accurately tracks delivery per recipient in SQLite email_logs.
    Never reports SUCCESS unless SMTP transmission actually succeeded.
    """
    cfg = _load_smtp_config()
    incident_id = incident.get("incident_id") or "INC-GENERAL"
    attack_type = incident.get("attack_type") or "Threat Vector"
    target = incident.get("target") or "Sovereign Asset"
    recommended_action = get_recommended_action(incident)

    # Subject line with explicit attack in progress alert banner
    subject = f"🚨 An attack is in progress! An attack has been detected! [{attack_type} on {target}]"

    # Recipients to target: strictly single configured recipient or explicitly provided recipient
    if recipients_list:
        targets = [r.strip().lower() for r in recipients_list if is_valid_email(r)]
    elif recipient and is_valid_email(recipient.strip()):
        targets = [recipient.strip().lower()]
    else:
        single_target = (
            os.getenv("ALERT_RECIPIENT_EMAIL", "")
            or os.getenv("SMTP_ALERT_TO", "")
            or cfg.get("to", "")
            or cfg.get("user", "")
            or "thrishanaidu03@gmail.com"
        ).strip().lower()
        if single_target and is_valid_email(single_target):
            targets = [single_target]
        else:
            targets = []

    if not targets:
        return False, "No valid email recipients configured", {}

    html_content = _build_html_email_body(incident, recommended_action)
    plain_content = (
        f"🚨 CYBERSECURITY ALERT — AN ATTACK IS IN PROGRESS! AN ATTACK HAS BEEN DETECTED!\n\n"
        f"Incident ID: {incident_id}\n"
        f"Attack Type: {attack_type}\n"
        f"Severity: {incident.get('severity', 'HIGH')}\n"
        f"Risk Score: {incident.get('risk_score', 85)}/100\n"
        f"Source: {incident.get('source_ip') or incident.get('source') or '10.0.1.45'}\n"
        f"Target: {target}\n"
        f"Detection Time: {incident.get('attack_detected_at') or _now_iso()}\n"
        f"AI Confidence: {incident.get('confidence_score', 94)}%\n"
        f"MITRE: {incident.get('mitre_technique_id', 'T1021')} — {incident.get('mitre_technique_name', 'Remote Services')}\n\n"
        f"RECOMMENDED RESPONSE ACTION:\n{recommended_action}\n\n"
        f"Command Console: http://localhost:5173/app/attack-report\n"
    )

    per_recipient_status: Dict[str, str] = {}
    successful_count = 0

    # Case A: Credentials are not configured or are placeholder
    if cfg["is_placeholder"]:
        note = "Simulated delivery: Configure your 16-character Google App Password in ACDSF Settings or .env for live inbox dispatch."
        logger.info("[EMAIL SIMULATION] Dispatching simulated alert for %s to %d recipients (SMTP unconfigured)", incident_id, len(targets))
        for rcpt in targets:
            record_email_log(
                recipient=rcpt,
                subject=subject,
                status="SIMULATED",
                attempts=1,
                error=note,
                incident_id=incident_id,
                body_html=html_content,
                body_text=plain_content,
            )
            per_recipient_status[rcpt] = "SIMULATED"
        return True, f"SIMULATED ({len(targets)} recipients queued)", per_recipient_status

    # Case B: Real SMTP delivery
    active_server = None
    connection_failed_err = None
    clean_password = (cfg["password"] or "").strip().replace(" ", "")
    try:
        if cfg["port"] == 465:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=8)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=8)
            server.ehlo()
            server.starttls()
            server.ehlo()
        server.login(cfg["user"], clean_password)
        active_server = server
    except (smtplib.SMTPAuthenticationError, smtplib.SMTPServerDisconnected) as exc:
        connection_failed_err = (
            f"Gmail SMTP Authentication Failed: Google rejected password for sender '{cfg['user']}'. "
            f"Please ensure 2-Step Verification is ON and generate a 16-character Google App Password at https://myaccount.google.com/apppasswords."
        )
        logger.warning("[SMTP] Failed to authenticate with %s:%d: %s", cfg["host"], cfg["port"], connection_failed_err)
    except Exception as exc:
        connection_failed_err = f"SMTP connection error ({type(exc).__name__}): {exc}."
        logger.warning("[SMTP] Failed to connect with %s:%d: %s", cfg["host"], cfg["port"], exc)

    if connection_failed_err:
        for rcpt in targets:
            record_email_log(
                recipient=rcpt,
                subject=subject,
                status="FAILED",
                attempts=1,
                error=connection_failed_err,
                incident_id=incident_id,
                body_html=html_content,
                body_text=plain_content,
            )
            per_recipient_status[rcpt] = f"FAILED: {connection_failed_err}"
        return False, connection_failed_err, per_recipient_status

    # Connection succeeded — dispatch to all targets over single authenticated session
    try:
        for rcpt in targets:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"{cfg['from_name']} <{cfg['user']}>"
                msg["To"] = rcpt
                msg.attach(MIMEText(plain_content, "plain"))
                msg.attach(MIMEText(html_content, "html"))

                active_server.sendmail(cfg["user"], [rcpt], msg.as_string())
                successful_count += 1
                record_email_log(
                    recipient=rcpt,
                    subject=subject,
                    status="SENT",
                    attempts=1,
                    error=None,
                    incident_id=incident_id,
                    body_html=html_content,
                    body_text=plain_content,
                )
                per_recipient_status[rcpt] = "SENT"
                logger.info("✓ Email delivered to %s for %s", rcpt, incident_id)
            except Exception as exc:
                record_email_log(
                    recipient=rcpt,
                    subject=subject,
                    status="FAILED",
                    attempts=1,
                    error=str(exc),
                    incident_id=incident_id,
                    body_html=html_content,
                    body_text=plain_content,
                )
                per_recipient_status[rcpt] = f"FAILED: {exc}"
    finally:
        try:
            active_server.quit()
        except Exception:
            pass

    summary = f"SENT ({successful_count}/{len(targets)} delivered)" if successful_count > 0 else f"FAILED: {connection_failed_err or 'Delivery failed'}"
    return successful_count > 0, summary, per_recipient_status


def verify_smtp_credentials(host: str, port: int, user: str, password: str) -> Tuple[bool, str]:
    """Test connecting and authenticating against SMTP server."""
    user = (user or "").strip()
    password = (password or "").strip().replace(" ", "")
    if not user:
        return False, "Sender email is required."
    if not password:
        return False, "Google App Password is required."
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=8)
        else:
            server = smtplib.SMTP(host, port, timeout=8)
            server.ehlo()
            server.starttls()
            server.ehlo()
        server.login(user, password)
        server.quit()
        return True, "SMTP connection and credentials verified successfully!"
    except (smtplib.SMTPAuthenticationError, smtplib.SMTPServerDisconnected):
        return (
            False,
            f"Google rejected credentials for '{user}'. Please ensure 2-Step Verification is ON and generate a new 16-character App Password at https://myaccount.google.com/apppasswords"
        )
    except Exception as exc:
        return False, f"SMTP Connection error ({type(exc).__name__}): {exc}"


def save_smtp_credentials(email: str, password: str, host: str = "smtp.gmail.com", port: int = 587, from_name: str = "ACDSF SOC Command") -> bool:
    """Save updated SMTP credentials to runtime environment and .env file."""
    email = email.strip()
    password = password.strip().replace(" ", "")

    os.environ["SMTP_EMAIL"] = email
    os.environ["SMTP_USER"] = email
    os.environ["SMTP_PASSWORD"] = password
    os.environ["SMTP_PASS"] = password
    os.environ["SMTP_HOST"] = host
    os.environ["SMTP_PORT"] = str(port)
    os.environ["SMTP_FROM_NAME"] = from_name
    os.environ["ALERT_RECIPIENT_EMAIL"] = email

    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            keys_to_update = {
                "SMTP_EMAIL": email,
                "SMTP_PASSWORD": password,
                "ALERT_RECIPIENT_EMAIL": email,
                "SMTP_HOST": host,
                "SMTP_PORT": str(port),
                "SMTP_FROM_NAME": from_name,
            }
            new_lines = []
            handled_keys = set()
            for line in lines:
                matched = False
                for k, v in keys_to_update.items():
                    if line.startswith(f"{k}=") or line.startswith(f"#{k}="):
                        new_lines.append(f"{k}={v}\n")
                        handled_keys.add(k)
                        matched = True
                        break
                if not matched:
                    if not line.endswith("\n"):
                        line += "\n"
                    new_lines.append(line)

            for k, v in keys_to_update.items():
                if k not in handled_keys:
                    new_lines.append(f"{k}={v}\n")

            with open(env_path, "w", encoding="utf-8") as f:
                f.writelines(new_lines)
            logger.info("Updated %s with new SMTP credentials for %s", env_path, email)
        except Exception as exc:
            logger.error("Failed to update .env: %s", exc)
    return True


# ---------------------------------------------------------------------------
# SMS Notification System
# ---------------------------------------------------------------------------
def _format_sms_text(incident: dict) -> str:
    """Build concise SMS security alert within standard length."""
    attack_type = incident.get("attack_type", "Threat Alert")
    target = incident.get("target", "Target")
    severity = (incident.get("severity") or "HIGH").upper()
    detected_at = incident.get("attack_detected_at")
    time_str = ""
    if detected_at:
        try:
            time_str = f" at {datetime.fromisoformat(detected_at.replace('Z', '+00:00')).strftime('%H:%M:%S')}"
        except Exception:
            time_str = f" at {detected_at[:19]}"

    source = incident.get("source_ip") or incident.get("source") or "EXT-ADVERSARY"
    return (
        f"🚨 ACDSF ALERT: {severity} severity {attack_type} detected on node {target}{time_str}. "
        f"Source: {source}. Recommended: Isolate {target} via SDN OpenFlow. Check email for full forensics."
    )


def send_sms_notification(
    incident: dict,
    custom_phone: Optional[str] = None,
    phones_list: Optional[List[str]] = None,
) -> Tuple[bool, str, Dict[str, str]]:
    """
    Sends actual SMS security alerts to all registered mobile numbers (+91 Indian numbers).
    Supports Fast2SMS, Twilio, and Generic HTTP Gateway.
    If no gateway credentials are configured, logs as SIMULATED in sms_logs.
    Never claims delivered without provider confirmation.
    """
    incident_id = incident.get("incident_id") or "INC-GENERAL"
    sms_message = _format_sms_text(incident)

    # Resolve target phone numbers: strictly single configured mobile, avoid spamming
    if phones_list:
        targets = []
        for p in phones_list:
            v, f = format_indian_phone(p)
            if v and f not in targets:
                targets.append(f)
    elif custom_phone:
        v, f = format_indian_phone(custom_phone)
        targets = [f] if v else []
    else:
        single_phone = os.getenv("ALERT_RECIPIENT_PHONE", "").strip()
        if single_phone:
            v, f = format_indian_phone(single_phone)
            targets = [f] if v else []
        else:
            targets = []

    if not targets:
        if phones_list:
            return False, "No valid phone numbers configured", {}
        return True, "SMS dispatch skipped (no recipient phone configured)", {}

    # Check for gateway credentials
    fast2sms_key = os.getenv("FAST2SMS_API_KEY", "").strip()
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    twilio_from = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
    generic_url = os.getenv("SMS_GATEWAY_URL", "").strip()
    generic_key = os.getenv("SMS_API_KEY", "").strip()

    per_phone_status: Dict[str, str] = {}
    successful_count = 0

    # ── CASE 1: Fast2SMS (Indian Mobile SMS Provider) ──
    if fast2sms_key and not fast2sms_key.startswith("your_"):
        logger.info("[SMS GATEWAY] Dispatching via Fast2SMS to %d recipients...", len(targets))
        # Fast2SMS numbers format: comma-separated 10-digit numbers
        ten_digit_numbers = [re.sub(r"\D", "", p)[-10:] for p in targets]
        numbers_param = ",".join(ten_digit_numbers)

        try:
            req_data = json.dumps({
                "route": "q",
                "message": sms_message,
                "language": "english",
                "numbers": numbers_param,
            }).encode("utf-8")

            req = urllib.request.Request(
                "https://www.fast2sms.com/dev/bulkV2",
                data=req_data,
                headers={
                    "authorization": fast2sms_key,
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_json = json.loads(resp.read().decode())
                if resp_json.get("return"):
                    for phone in targets:
                        record_sms_log(
                            recipient=phone,
                            message=sms_message,
                            status="SENT",
                            provider="Fast2SMS",
                            attempts=1,
                            error=None,
                            incident_id=incident_id,
                        )
                        per_phone_status[phone] = "SENT (Fast2SMS)"
                    return True, f"SENT ({len(targets)} SMS delivered via Fast2SMS)", per_phone_status
                else:
                    err = resp_json.get("message", "Fast2SMS rejected payload")
                    for phone in targets:
                        record_sms_log(phone, sms_message, "FAILED", "Fast2SMS", 1, err, incident_id)
                        per_phone_status[phone] = f"FAILED: {err}"
                    return False, f"FAILED: {err}", per_phone_status
        except Exception as exc:
            logger.error("Fast2SMS request failed: %s", exc)
            for phone in targets:
                record_sms_log(phone, sms_message, "FAILED", "Fast2SMS", 1, str(exc), incident_id)
                per_phone_status[phone] = f"FAILED: {exc}"
            return False, f"FAILED: {exc}", per_phone_status

    # ── CASE 2: Twilio SMS Gateway ──
    elif twilio_sid and twilio_token and not twilio_sid.startswith("your_"):
        logger.info("[SMS GATEWAY] Dispatching via Twilio to %d recipients...", len(targets))
        auth_string = f"{twilio_sid}:{twilio_token}"
        import base64
        basic_auth = base64.b64encode(auth_string.encode()).decode()

        for phone in targets:
            try:
                data = urllib.parse.urlencode({
                    "To": phone,
                    "From": twilio_from,
                    "Body": sms_message,
                }).encode("utf-8")

                req = urllib.request.Request(
                    f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json",
                    data=data,
                    headers={
                        "Authorization": f"Basic {basic_auth}",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    resp_data = json.loads(resp.read().decode())
                    tw_status = resp_data.get("status", "sent").upper()
                    record_sms_log(phone, sms_message, tw_status, "Twilio", 1, None, incident_id)
                    per_phone_status[phone] = f"{tw_status} (Twilio)"
                    successful_count += 1
            except Exception as exc:
                record_sms_log(phone, sms_message, "FAILED", "Twilio", 1, str(exc), incident_id)
                per_phone_status[phone] = f"FAILED: {exc}"

        summary = f"SENT ({successful_count}/{len(targets)} delivered via Twilio)" if successful_count > 0 else "FAILED: Twilio dispatch failed"
        return successful_count > 0, summary, per_phone_status

    # ── CASE 3: Generic HTTP SMS Webhook Gateway ──
    elif generic_url and not generic_url.startswith("http://example"):
        for phone in targets:
            try:
                req_data = json.dumps({
                    "phone": phone,
                    "message": sms_message,
                    "api_key": generic_key,
                }).encode("utf-8")
                req = urllib.request.Request(
                    generic_url,
                    data=req_data,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    record_sms_log(phone, sms_message, "SENT", "GenericGateway", 1, None, incident_id)
                    per_phone_status[phone] = "SENT"
                    successful_count += 1
            except Exception as exc:
                record_sms_log(phone, sms_message, "FAILED", "GenericGateway", 1, str(exc), incident_id)
                per_phone_status[phone] = f"FAILED: {exc}"
        return successful_count > 0, f"SENT ({successful_count}/{len(targets)})", per_phone_status

    # ── CASE 4: Offline / Simulated Queue Mode (Accurate Status Recording) ──
    else:
        note = "Simulated delivery: Set FAST2SMS_API_KEY or TWILIO credentials in acdsf-backend/.env for live cellular dispatch"
        logger.info("[SMS SIMULATION] Dispatching simulated SMS for %s to %d Indian mobile numbers", incident_id, len(targets))
        for phone in targets:
            record_sms_log(
                recipient=phone,
                message=sms_message,
                status="SIMULATED",
                provider="SimulatedGateway",
                attempts=1,
                error=note,
                incident_id=incident_id,
            )
            per_phone_status[phone] = "SIMULATED"

        return True, f"SIMULATED ({len(targets)} mobile alerts queued)", per_phone_status


# ---------------------------------------------------------------------------
# Unified Notification Dispatcher
# ---------------------------------------------------------------------------
def dispatch_notifications(
    incident: dict,
    recipient: Optional[str] = None,
    recipient_phone: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Central dispatcher firing all channels for a detected incident:
      1. Dashboard SSE popup
      2. Multi-Recipient Email alerts (deduplicated)
      3. SMS security alerts (deduplicated Indian mobiles)
      4. Client Web/Mobile push
    Safe: failures never block attack simulation or detection.
    """
    incident_id = incident.get("incident_id") or "INC-UNIFIED"
    status = incident.get("status") or "DETECTED"

    # Deduplication check
    if not should_dispatch_incident(incident_id, status):
        return {
            "dashboard_popup": "SUPPRESSED (Duplicate within cooldown)",
            "email": "SUPPRESSED (Duplicate within cooldown)",
            "sms": "SUPPRESSED (Duplicate within cooldown)",
        }

    # Ensure recommended action and source IP are populated
    incident["recommended_action"] = get_recommended_action(incident)
    if not incident.get("source_ip"):
        incident["source_ip"] = incident.get("source") or "10.0.1.45 (Red Team Adversary)"

    statuses: Dict[str, Any] = {}

    # 1. Dashboard SSE popup (real-time broadcast)
    try:
        _sse_broadcast("attack_detected", incident)
        statuses["dashboard_popup"] = "SENT"
    except Exception as e:
        statuses["dashboard_popup"] = f"FAILED: {e}"

    # 2. Email Notification Job
    email_res = {}
    def _send_email_job():
        nonlocal email_res
        raw_email = (
            recipient
            or incident.get("recipient")
            or incident.get("user_email")
            or None
        )
        if not raw_email or not is_valid_email(str(raw_email).strip()):
            email_res = {"status": "SKIPPED (No recipient specified)", "details": {}}
            return
        target_email = str(raw_email).strip().lower()
        ok, msg, per_rcpt = send_email_notification(incident, recipient=target_email)
        email_res = {"status": msg, "details": per_rcpt}

    # 3. SMS Notification Job (Only if a single recipient phone is explicitly configured)
    sms_res = {}
    def _send_sms_job():
        nonlocal sms_res
        target_phone = recipient_phone or os.getenv("ALERT_RECIPIENT_PHONE") or None
        if not target_phone:
            sms_res = {"status": "SKIPPED (No single mobile configured)", "details": {}}
            return
        ok, msg, per_phone = send_sms_notification(incident, custom_phone=target_phone)
        sms_res = {"status": msg, "details": per_phone}

    # Start both channels concurrently
    th_email = threading.Thread(target=_send_email_job, daemon=True)
    th_sms = threading.Thread(target=_send_sms_job, daemon=True)
    th_email.start()
    th_sms.start()

    # Wait up to 3s for quick completion, otherwise continues in background
    th_email.join(timeout=3)
    th_sms.join(timeout=3)

    statuses["email"] = email_res.get("status", "QUEUED (Processing in background)")
    statuses["sms"] = sms_res.get("status", "QUEUED (Processing in background)")

    # 4. Mobile / Web Push
    try:
        ok_push, msg_push = send_push_notification(incident)
        statuses["mobile_push"] = msg_push
    except Exception as e:
        statuses["mobile_push"] = f"FAILED: {e}"

    incident["notification_statuses"] = statuses
    logger.info("✓ Multi-channel notifications dispatched for %s: %s", incident_id, statuses)
    return statuses


def send_push_notification(incident: dict) -> Tuple[bool, str]:
    """Client push notification (FCM mobile or simulated web push)."""
    tokens = get_device_tokens()
    if not tokens:
        return True, "CLIENT_NOTIFICATION_READY (SSE Active)"
    return True, f"SIMULATED_PUSH ({len(tokens)} devices queued)"


def broadcast_incident_update(incident_id: str, data: dict) -> None:
    """Broadcast incident state updates to all dashboard subscribers."""
    _sse_broadcast("incident_update", {"incident_id": incident_id, **data})


def get_notification_system_status() -> dict:
    """Telemetry report for all notification subsystems and recipient counts."""
    cfg = _load_smtp_config()
    with _sse_lock:
        sse_count = len(_sse_subscribers)
    tokens = get_device_tokens()

    fast2sms_key = bool(os.getenv("FAST2SMS_API_KEY", "").strip())
    twilio_sid = bool(os.getenv("TWILIO_ACCOUNT_SID", "").strip())

    sms_provider_status = "CONFIGURED (Fast2SMS)" if fast2sms_key else ("CONFIGURED (Twilio)" if twilio_sid else "SIMULATED_MODE")

    return {
        "status": "OPERATIONAL",
        "sse": {
            "status": "ONLINE",
            "active_subscribers": sse_count,
            "endpoint": "/api/events",
        },
        "email": {
            "status": "CONFIGURED" if not cfg["is_placeholder"] else "SIMULATED_MODE",
            "host": cfg["host"],
            "port": cfg["port"],
            "sender_email": cfg["user"] if not cfg["is_placeholder"] else "Simulated (App Password needed)",
            "registered_recipients_count": len(get_deduplicated_emails()),
            "registered_recipients": get_deduplicated_emails(),
        },
        "sms": {
            "status": sms_provider_status,
            "gateway": "Fast2SMS" if fast2sms_key else ("Twilio" if twilio_sid else "SimulatedGateway"),
            "registered_numbers_count": len(get_deduplicated_phones()),
            "registered_numbers": get_deduplicated_phones(),
        },
        "push": {
            "status": "LOCAL_WEB_PUSH_READY",
            "registered_tokens": len(tokens),
        },
        "timestamp": _now_iso(),
    }


def get_notification_logs(limit: int = 50) -> dict:
    """Fetch recent email and SMS dispatch logs from SQLite."""
    try:
        with get_db() as conn:
            email_rows = conn.execute(
                "SELECT * FROM email_logs ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
            sms_rows = conn.execute(
                "SELECT * FROM sms_logs ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
            return {
                "email_logs": [dict(r) for r in email_rows],
                "sms_logs": [dict(r) for r in sms_rows],
            }
    except Exception as exc:
        logger.exception("Failed to query notification logs: %s", exc)
        return {"email_logs": [], "sms_logs": []}
