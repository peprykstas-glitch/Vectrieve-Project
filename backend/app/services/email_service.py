"""
Email service for sending transactional emails (password reset, account approval alerts).

Delivery Strategy:
1. Resend API (HTTPS Port 443): Highly reliable for cloud VPS (DigitalOcean/AWS) where raw SMTP is blocked.
2. Async SMTP (aiosmtplib): If SMTP credentials are provided in .env.
3. Dev Mode Console Log: Fallback when neither is configured.
"""

import httpx
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings


async def _dispatch_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Internal helper to dispatch emails via Resend HTTPS API or SMTP fallback."""
    # 1. Try Resend HTTPS API (Port 443 — guaranteed no SMTP port block)
    if settings.RESEND_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": settings.RESEND_FROM,
                        "to": [to_email],
                        "subject": subject,
                        "html": html_body,
                        "text": text_body,
                    },
                )
                if res.status_code in (200, 201):
                    print(f"✅ [Resend API] Email sent to {to_email}: {subject}")
                    return True
                else:
                    print(f"⚠️ [Resend API] Error {res.status_code}: {res.text}")
        except Exception as ex:
            print(f"⚠️ [Resend API] Failed to send email via HTTPS: {ex}")

    # 2. Try SMTP if configured
    if settings.SMTP_HOST and settings.SMTP_USER:
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SMTP_FROM or "noreply@vectrieve.ai"
            msg["To"] = to_email
            msg["Subject"] = subject

            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
                timeout=6.0,
            )
            print(f"✅ [SMTP] Email sent to {to_email}: {subject}")
            return True
        except Exception as ex:
            print(f"⚠️ [SMTP] Failed to send email to {to_email}: {ex}")

    # 3. Dev mode fallback
    print("=" * 60)
    print(f"📧 [DEV CONSOLE EMAIL] To: {to_email} | Subject: {subject}")
    print(text_body.strip())
    print("=" * 60)
    return True


async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send a password reset email with a one-time link."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    subject = "Neurach AI — Password Reset Request"

    html_body = f"""
    <div style="background-color: #050505; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; margin: 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 0 auto; background-color: #0c0c0e; border: 1px solid #27272a; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            <tr>
                <td style="padding: 36px 36px 20px 36px; text-align: center;">
                    <div style="display: inline-block; padding: 10px 18px; border-radius: 12px; background: linear-gradient(135deg, #4f46e5, #06b6d4); margin-bottom: 12px;">
                        <span style="color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Neurach AI</span>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="padding: 10px 36px 36px 36px;">
                    <h2 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 14px 0;">Reset your master password</h2>
                    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0 0 26px 0;">
                        We received a request to reset the password for your Neurach workspace account. Click the secure button below to choose a new password.
                    </p>
                    
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="{reset_url}" 
                           style="display: inline-block; background-color: #ffffff; color: #000000; text-decoration: none; 
                                  padding: 13px 36px; border-radius: 10px; font-size: 14px; font-weight: 700; 
                                  box-shadow: 0 4px 14px rgba(255, 255, 255, 0.2);">
                            Set New Password →
                        </a>
                    </div>
                    
                    <div style="border-top: 1px solid #1f1f23; padding-top: 20px; margin-top: 20px;">
                        <p style="color: #71717a; font-size: 12px; line-height: 1.5; margin: 0;">
                            ⏳ This link expires in <strong style="color: #f43f5e;">1 hour</strong>. If you did not request a password reset, you can safely disregard this email.
                        </p>
                    </div>
                </td>
            </tr>
        </table>
    </div>
    """

    text_body = f"""
Neurach AI — Password Reset Request

We received a request to reset the password for your account.
Click the link below to choose a new password:

{reset_url}

This link expires in 1 hour. If you did not request this, ignore this email.
    """

    return await _dispatch_email(to_email, subject, html_body, text_body)


async def send_user_approved_email(to_email: str) -> bool:
    """Send an account approved notification to the user."""
    login_url = f"{settings.FRONTEND_URL}/login"
    subject = "Neurach AI — Workspace Access Approved"

    html_body = f"""
    <div style="background-color: #050505; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; margin: 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 0 auto; background-color: #0c0c0e; border: 1px solid #27272a; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            <tr>
                <td style="padding: 36px 36px 20px 36px; text-align: center;">
                    <div style="display: inline-block; padding: 10px 18px; border-radius: 12px; background: linear-gradient(135deg, #10b981, #059669); margin-bottom: 12px;">
                        <span style="color: #ffffff; font-size: 20px; font-weight: 800;">✓ Access Approved</span>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="padding: 10px 36px 36px 36px;">
                    <h2 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 14px 0;">Your account is ready</h2>
                    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0 0 26px 0;">
                        An administrator has approved your Neurach workspace access. You can now sign in with your corporate email and password.
                    </p>
                    
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="{login_url}" 
                           style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; 
                                  padding: 13px 36px; border-radius: 10px; font-size: 14px; font-weight: 700; 
                                  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
                            Sign In to Neurach →
                        </a>
                    </div>
                </td>
            </tr>
        </table>
    </div>
    """

    text_body = f"""
Neurach AI — Workspace Access Approved

Your account has been approved by the workspace administrator.
You can now sign in at:

{login_url}
    """

    return await _dispatch_email(to_email, subject, html_body, text_body)


async def send_admin_new_user_alert(new_user_email: str) -> bool:
    """Notify system administrators when a new user registers and awaits approval."""
    admin_list = [u.strip() for u in settings.ADMIN_EMAILS.split(",") if u.strip()]
    if not admin_list:
        return False

    admin_url = f"{settings.FRONTEND_URL}/analytics"
    subject = f"Neurach AI — New User Approval Request ({new_user_email})"

    html_body = f"""
    <div style="background-color: #050505; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table align="center" width="100%" style="max-width: 540px; margin: 0 auto; background-color: #0c0c0e; border: 1px solid #27272a; border-radius: 18px; padding: 24px;">
            <tr>
                <td>
                    <h3 style="color: #ffffff; margin-top: 0;">New User Pending Approval</h3>
                    <p style="color: #a1a1aa; font-size: 14px;">
                        A new user has registered and is requesting workspace access:
                    </p>
                    <div style="background: #18181b; padding: 12px 16px; border-radius: 8px; color: #38bdf8; font-family: monospace; font-size: 14px; margin: 16px 0;">
                        {new_user_email}
                    </div>
                    <a href="{admin_url}" style="display: inline-block; background: #ffffff; color: #000; padding: 10px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px;">
                        Review in Admin Panel →
                    </a>
                </td>
            </tr>
        </table>
    </div>
    """

    text_body = f"""
New user registered on Neurach AI:
Email: {new_user_email}

Review and approve in the Admin Panel:
{admin_url}
    """

    for admin_email in admin_list:
        await _dispatch_email(admin_email, subject, html_body, text_body)
    return True
