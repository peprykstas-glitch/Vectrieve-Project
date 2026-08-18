from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import uuid
import httpx

# Внутрішні модулі нашого проєкту
from core.database import get_session
from models.user import User
from models.password_reset import PasswordResetToken
from core.security import verify_password, create_access_token, get_password_hash
from services.email_service import send_password_reset_email
from core.config import settings

router = APIRouter()

# --- СХЕМА ДАНИХ (Контракт з фронтендом) ---
class UserCreate(BaseModel):
    fullName: str
    email: EmailStr
    password: str
    company: str | None = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str

# --- ЕНДПОІНТ РЕЄСТРАЦІЇ ---
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserCreate, 
    session: AsyncSession = Depends(get_session)
):
    # --- ДЕБАГ: Ловимо привида в системі ---
    print(f"🛑 [DEBUG] Реальна довжина пароля, що прийшла: {len(user_in.password)} символів")
    print(f"🛑 [DEBUG] Перші 15 символів: {user_in.password[:15]}...")

    # 1. Перевірка на дублікат (Асинхронно)
    statement = select(User).where(User.username == user_in.email) 
    result = await session.execute(statement)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists."
        )

    # 🛡️ ПРИМУСОВИЙ ЗАХИСТ: Argon2 limit
    if len(user_in.password) > 72:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be less than 72 characters long."
        )
    safe_password = user_in.password

    # 2. Створення об'єкта користувача (хешуємо безпечний пароль)
    hashed = await get_password_hash(safe_password)
    
    admin_list = {u.strip().lower() for u in settings.ADMIN_EMAILS.split(",") if u.strip()}
    is_admin = user_in.email.strip().lower() in admin_list

    # Admins are auto-approved; regular signups require admin approval
    new_user = User(
        username=user_in.email,
        hashed_password=hashed,
        is_admin=is_admin,
        is_approved=is_admin,
    )
    
    # 3. Запис у БД (Асинхронно)
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    # Send admin notification asynchronously
    try:
        from services.email_service import send_admin_new_user_alert
        import asyncio
        asyncio.create_task(send_admin_new_user_alert(user_in.email))
    except Exception as ex:
        print(f"⚠️ Failed to queue admin alert: {ex}")

    return {
        "message": "Account created. Awaiting administrator approval before access is granted." if not is_admin else "Workspace successfully provisioned",
        "is_approved": new_user.is_approved
    }


# --- ЕНДПОІНТ ЛОГІНУ ---
@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    session: AsyncSession = Depends(get_session)
):
    # Шукаємо користувача асинхронно
    statement = select(User).where(User.username == form_data.username)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    # Перевіряємо користувача та пароль окремо для точних помилок
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This email address is not registered.",
        )
    if not await verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact your workspace administrator.",
        )
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval. You will receive access once approved.",
        )
        
    # Видаємо JWT токен
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


# --- ЕНДПОІНТ GOOGLE OAUTH2 (Smart Account Unification) ---
@router.post("/google")
async def google_auth(
    body: GoogleAuthRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Exchanges Google OAuth2 authorization code for user profile,
    performs smart account unification without duplicating users,
    and returns a valid JWT access token.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth2 is not configured on the server."
        )

    # 1. Exchange code for Google access token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": body.code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": body.redirect_uri,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_res = await client.post(token_url, data=token_data)
        if token_res.status_code != 200:
            print(f"🛑 Google Token Error: {token_res.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to authenticate with Google. Invalid or expired code.",
            )
        tokens = token_res.json()
        google_access_token = tokens.get("access_token")

        # 2. Fetch Google User Profile
        userinfo_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
        if userinfo_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve Google user profile.",
            )
        userinfo = userinfo_res.json()

    google_id = userinfo.get("sub")
    email = userinfo.get("email")

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not return a valid email or ID.",
        )

    email = email.strip().lower()

    # 3. Smart Account Unification Logic
    # Strategy A: Check if a user with this google_id already exists
    stmt_gid = select(User).where(User.google_id == google_id)
    res_gid = await session.execute(stmt_gid)
    user = res_gid.scalar_one_or_none()

    # Strategy B: If not found by google_id, check if user exists by email (link existing password account)
    if not user:
        stmt_email = select(User).where(User.username == email)
        res_email = await session.execute(stmt_email)
        user = res_email.scalar_one_or_none()

        if user:
            # Link Google ID to existing user account seamlessly
            user.google_id = google_id
            session.add(user)
            await session.commit()
            await session.refresh(user)

    # Strategy C: First-time signup with Google -> Auto-create user
    if not user:
        admin_list = {u.strip().lower() for u in settings.ADMIN_EMAILS.split(",") if u.strip()}
        is_admin = email in admin_list

        dummy_hash = await get_password_hash(uuid.uuid4().hex + "VectrieveGoogleOAuth!")
        user = User(
            username=email,
            hashed_password=dummy_hash,
            is_admin=is_admin,
            is_approved=True,  # Google verified email is pre-approved
            is_active=True,
            google_id=google_id,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    # 4. Check account status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact your workspace administrator.",
        )
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval.",
        )

    # 5. Issue JWT access token
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.username,
            "is_admin": user.is_admin,
        }
    }


# --- ЕНДПОІНТ ПОТОЧНОГО ЮЗЕРА ---
from api.deps import get_current_user

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {"email": current_user.username, "id": current_user.id, "is_admin": current_user.is_admin}


# --- ЕНДПОІНТ ЗАБУВ ПАРОЛЬ ---
@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Always returns 200 regardless of whether the email exists.
    This prevents email enumeration attacks.
    """
    # Find user by email
    statement = select(User).where(User.username == body.email)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if user:
        # Invalidate any existing unused tokens for this user
        existing_tokens = await session.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used == False,
            )
        )
        for old_token in existing_tokens.scalars().all():
            old_token.used = True

        # Create new token (valid for 1 hour)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=str(uuid.uuid4()),
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        session.add(reset_token)
        await session.commit()

        # Send email (async, non-blocking)
        try:
            await send_password_reset_email(body.email, reset_token.token)
        except Exception as e:
            print(f"⚠️ Email send exception: {e}")

        return {"message": "If this email is registered, a password reset link has been sent."}

    # If user not found, still return standard message
    return {"message": "If this email is registered, a password reset link has been sent."}


# --- ЕНДПОІНТ СКИДАННЯ ПАРОЛЮ ---
@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
):
    """Validate the reset token and update the user's password."""
    # Find the token
    statement = select(PasswordResetToken).where(
        PasswordResetToken.token == body.token,
        PasswordResetToken.used == False,
    )
    result = await session.execute(statement)
    reset_token = result.scalar_one_or_none()

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link. Please request a new one.",
        )

    # Check expiry
    if datetime.utcnow() > reset_token.expires_at:
        reset_token.used = True
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has expired. Please request a new one.",
        )

    # Validate password length
    if len(body.new_password) > 72:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be less than 72 characters long.",
        )

    # Update user's password
    user_result = await session.execute(
        select(User).where(User.id == reset_token.user_id)
    )
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account not found.",
        )

    user.hashed_password = await get_password_hash(body.new_password)
    reset_token.used = True

    await session.commit()
    print(f"✅ Password reset successfully for user: {user.username}")

    return {"message": "Password has been reset successfully. You can now sign in."}