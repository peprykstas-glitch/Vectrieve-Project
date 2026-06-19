from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from pydantic import BaseModel, EmailStr

# Внутрішні модулі нашого проєкту
from core.database import get_session
from models.user import User
from core.security import verify_password, create_access_token, get_password_hash

router = APIRouter()

# --- СХЕМА ДАНИХ (Контракт з фронтендом) ---
class UserCreate(BaseModel):
    fullName: str
    email: EmailStr
    password: str
    company: str | None = None

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
    
    # Перевіряємо пароль
    if not user or not await verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
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