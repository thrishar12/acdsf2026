"""
ACDSF — OTP Notification Service (Robust SMTP)
==============================================
Handles dispatching 6-digit verification codes via Email and SMS.
"""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

try:
    from dotenv import load_dotenv as _load_dotenv
    _env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(_env_path):
        _load_dotenv(_env_path)
    else:
        _load_dotenv()
except ImportError:
    pass

logger = logging.getLogger("acdsf.otp")


def _get_smtp_cfg():
    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    try:
        port = int(os.getenv("SMTP_PORT", "587"))
    except (ValueError, TypeError):
        port = 587
    user = (os.getenv("SMTP_USER") or os.getenv("SMTP_EMAIL") or "").strip()
    pwd = (os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD") or "").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "ACDSF Cyber Defence").strip()
    return host, port, user, pwd, from_name


def is_email(identifier: str) -> bool:
    return "@" in identifier and "." in identifier.split("@")[-1]


def is_phone(identifier: str) -> bool:
    import re
    return bool(re.match(r"^\+?\d{10,15}$", identifier.replace(" ", "")))


def send_otp(identifier: str, otp_code: str) -> tuple[bool, str, str]:
    """
    Determines channel and dispatches the OTP.
    Returns (success: bool, channel: str, error_message: str)
    """
    clean = identifier.strip()

    if is_email(clean):
        success, msg = _send_email_otp(clean, otp_code)
        return success, "email", msg
    elif is_phone(clean):
        success, msg = _send_sms_otp(clean, otp_code)
        return success, "sms", msg
    else:
        # Fallback to email if ambiguous
        success, msg = _send_email_otp(clean, otp_code)
        return success, "email", msg


def _send_email_otp(recipient: str, otp_code: str) -> tuple[bool, str]:
    """Dispatch OTP via SMTP with robust error handling."""
    host, port, user, pwd, from_name = _get_smtp_cfg()

    if not user or not pwd:
        logger.warning(f"[SIMULATED EMAIL] To: {recipient} | OTP: {otp_code}")
        return True, ""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your ACDSF Clearance Verification Code"
    msg["From"] = f"{from_name} <{user}>"
    msg["To"] = recipient

    html = f"""
    <html>
      <body style="background-color: #030712; color: #f1f5f9; font-family: monospace; padding: 20px;">
        <h2 style="color: #00f5ff; letter-spacing: 2px;">ACDSF NATIONAL SECURITY GATEWAY</h2>
        <p>A clearance verification request was initiated for this identifier.</p>
        <p>Your one-time passphrase is:</p>
        <div style="background-color: #0f172a; border: 1px solid #38bdf8; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #38bdf8; text-align: center; max-width: 200px;">
          {otp_code}
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
          This code expires in 5 minutes.<br>
          If you did not request this, please notify your security commander immediately.
        </p>
      </body>
    </html>
    """
    msg.attach(MIMEText(html, "html"))

    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            server.starttls()

        server.login(user, pwd)
        server.send_message(msg)
        server.quit()
        logger.info(f"OTP successfully emailed to {recipient}")
        return True, ""

    except smtplib.SMTPAuthenticationError as e:
        err_msg = f"SMTP Authentication failed: {str(e)}"
        logger.error(err_msg)
        return False, "Email service configuration error (Auth Failed). Contact administrator."
    except smtplib.SMTPConnectError as e:
        err_msg = f"SMTP Connection failed: {str(e)}"
        logger.error(err_msg)
        return False, "Email service unreachable. Contact administrator."
    except Exception as e:
        err_msg = f"Unexpected SMTP error: {str(e)}"
        logger.exception(err_msg)
        return False, "Failed to send email due to an internal server error."


def _send_sms_otp(phone_number: str, otp_code: str) -> tuple[bool, str]:
    """Dispatch OTP via SMS (Simulated unless Twilio configured)."""
    logger.warning(f"[SIMULATED SMS] To: {phone_number} | OTP: {otp_code}")
    return True, ""
