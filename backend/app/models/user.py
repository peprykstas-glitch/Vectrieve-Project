from sqlmodel import SQLModel, Field
from pydantic import BaseModel

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    is_approved: bool = Field(default=False)
    google_id: str | None = Field(default=None, index=True, nullable=True)

class UserCreate(SQLModel):
    username: str
    password: str

class UserRead(SQLModel):
    id: int
    username: str
    is_active: bool
    is_admin: bool
    is_approved: bool
    google_id: str | None = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None