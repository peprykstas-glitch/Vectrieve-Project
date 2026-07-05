"""
Email service for sending transactional emails (password reset, etc.).

Uses aiosmtplib for async SMTP delivery.
Fallback: if SMTP is not configured, prints the email content to console (dev mode).
"""

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings


async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send a password reset email with a one-time link.
    
    Returns True if sent successfully, False otherwise.
    In dev mode (no SMTP configured), prints the link to console.
    """
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    subject = "Vectrieve — Password Reset"
    html_body = f"""
    <div style="background-color: #020202; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; margin: 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #09090b; border: 1px solid #1f1f23; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
            <!-- Header Banner -->
            <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                        <tr>
                            <td style="vertical-align: middle; padding-right: 12px;">
                                <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #7c3aed, #9333ea); text-align: center;">
                                    <span style="color: white; font-size: 20px; line-height: 40px; font-weight: 700;">V</span>
                                </div>
                            </td>
                            <td style="vertical-align: middle;">
                                <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Vectrieve</span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <!-- Content -->
            <tr>
                <td style="padding: 20px 40px 40px 40px;">
                    <h3 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Reset your master password</h3>
                    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0 0 28px 0;">
                        We received a request to reset the cryptographic master password for your Vectrieve workspace. Click the secure action button below to establish a new password.
                    </p>
                    
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 32px 0;">
                        <tr>
                            <td align="center">
                                <a href="{reset_url}" 
                                   style="display: inline-block; background-color: #ffffff; color: #000000; text-decoration: none; 
                                          padding: 14px 40px; border-radius: 12px; font-size: 14px; font-weight: 600; 
                                          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);">
                                    Reset Password
                                </a>
                            </td>
                        </tr>
                    </table>
                    
                    <div style="border-top: 1px solid #1f1f23; padding-top: 24px; margin-top: 8px;">
                        <p style="color: #71717a; font-size: 12px; line-height: 1.6; margin: 0;">
                            This secure link will automatically expire in <strong style="color: #f43f5e;">1 hour</strong> due to enterprise security policies.
                        </p>
                        <p style="color: #52525b; font-size: 11px; line-height: 1.5; margin: 12px 0 0 0;">
                            If you did not initiate this request, you can safely disregard this email. Your master credentials remain fully secure.
                        </p>
                    </div>
                </td>
            </tr>
            <!-- Footer -->
            <tr>
                <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #1f1f23; background-color: #070708;">
                    <p style="color: #52525b; font-size: 11px; margin: 0; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">
                        Vectrieve AI • Enterprise RAG Assistant
                    </p>
                </td>
            </tr>
        </table>
    </div>
    """

    text_body = f"""
Vectrieve — Password Reset

We received a request to reset your password.
Click the link below to choose a new password:

{reset_url}

This link expires in 1 hour. If you didn't request this, ignore this email.
    """

    # --- Dev mode: no SMTP configured ---
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        print("=" * 60)
        print("📧 [DEV MODE] Password Reset Email")
        print(f"   To: {to_email}")
        print(f"   Reset URL: {reset_url}")
        print("=" * 60)
        return True

    # --- Production: send via SMTP ---
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.SMTP_FROM
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
        )
        print(f"✅ Password reset email sent to {to_email}")
        return True

    except Exception as e:
        print(f"⚠️ Failed to send password reset email to {to_email}: {e}")
        return False
