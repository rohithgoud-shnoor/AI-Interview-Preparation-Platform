from typing import Optional
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    name: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None

class GoogleLoginRequest(BaseModel):
    token: str

class RecordingCreate(BaseModel):
    question: str
    video_url: str

class Recording(BaseModel):
    id: int
    user_id: int
    question: str
    video_url: str
    created_at: str

    class Config:
        from_attributes = True
