import asyncio
import smtplib
from email.message import EmailMessage

from app.core.settings import settings


def _send_email_sync(to_email: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    if settings.MAIL_USE_SSL:
        smtp_factory = smtplib.SMTP_SSL
    else:
        smtp_factory = smtplib.SMTP

    with smtp_factory(settings.MAIL_HOST, settings.MAIL_PORT, timeout=10) as smtp:
        if settings.MAIL_USE_TLS and not settings.MAIL_USE_SSL:
            smtp.starttls()
        if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
            smtp.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        smtp.send_message(message)


async def send_farmer_credentials_email(
    to_email: str,
    full_name: str,
    password: str,
) -> None:
    subject = "AgriSmart - Thông tin tài khoản nông dân"
    body = (
        f"Chào {full_name},\n\n"
        "Tài khoản nông dân của bạn đã được tạo.\n"
        f"Email đăng nhập: {to_email}\n"
        f"Mật khẩu tạm thời: {password}\n\n"
        "Vui lòng đăng nhập và đổi mật khẩu ngay sau lần đăng nhập đầu tiên.\n"
    )

    await asyncio.to_thread(_send_email_sync, to_email, subject, body)