from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

# --- ЧИСТІ ІМПОРТИ (без app. і без крапок на початку) ---
from core.security import SECRET_KEY, ALGORITHM
from models.user import User, TokenData
from core.database import get_session
# --------------------------------------------------------

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    session: AsyncSession = Depends(get_session)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
        
    # --- Асинхронний пошук замість session.query ---
    statement = select(User).where(User.username == token_data.username)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
        
    return user