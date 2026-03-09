from __future__ import annotations
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body_html: str) -> bool:
    """Send an email via SMTP. Returns True on success, False on failure."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured — email not sent to %s", to)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = to
    msg.attach(MIMEText(body_html, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], [to], msg.as_string())
        logger.info("Email sent to %s (subject: %s)", to, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


def send_temp_password_email(to: str, full_name: str, temp_password: str) -> bool:
    subject = "IZ Leads — Your Temporary Password"
    body = f"""
    <html><body>
    <p>Hi {full_name},</p>
    <p>You requested a password reset for your IZ Leads account.</p>
    <p>Your temporary password is: <strong>{temp_password}</strong></p>
    <p>Please log in and change your password immediately.</p>
    <p>If you did not request this, please contact your administrator.</p>
    <br/>
    <p>— IZ Leads Team</p>
    </body></html>
    """
    return send_email(to, subject, body)
