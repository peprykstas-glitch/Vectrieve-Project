from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import uuid

# Внутрішні модулі нашого проєкту
from core.database import get_session
from models.user import User
from models.password_reset import PasswordResetToken
from core.security import verify_password, create_access_token, get_password_hash
from services.email_service import send_password_reset_email

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
    new_user = User(
        username=user_in.email,
        hashed_password=hashed,
    )
    
    # 3. Запис у БД (Асинхронно)
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    return {"message": "Workspace successfully provisioned"}


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
        
    # Видаємо JWT токен
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


# --- ЕНДПОІНТ ПОТОЧНОГО ЮЗЕРА ---
from api.deps import get_current_user

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {"email": current_user.username, "id": current_user.id}


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
        await send_password_reset_email(body.email, reset_token.token)

    # Always return the same response
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