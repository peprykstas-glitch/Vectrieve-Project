import asyncio
from datetime import datetime, timedelta
from jose import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from core.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

ph = PasswordHasher()

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Non-blocking password verification"""
    def _verify():
        try:
            return ph.verify(hashed_password, plain_password)
        except VerifyMismatchError:
            return False
    return await asyncio.to_thread(_verify)

async def get_password_hash(password: str) -> str:
    """Non-blocking password hashing"""
    def _hash():
        return ph.hash(password)
    return await asyncio.to_thread(_hash)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_access_token(token: str) -> dict:
    from jose import JWTError
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return {}