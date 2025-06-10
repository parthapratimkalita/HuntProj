from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    
    # Optional profile fields (filled later)
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str
    # Only require essentials for signup
    full_name: str  # Required for signup
    
class UserUpdate(BaseModel):
    # All optional for updates - user can update any field
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None

# For host applications - validate required fields
class UserHostValidation(BaseModel):
    phone: str  # Required for hosting
    address: str  # Required for hosting
    city: str  # Required for hosting
    
    @validator('phone')
    def phone_must_be_valid(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError('Valid phone number is required for hosting')
        return v
    
    @validator('address')
    def address_must_be_complete(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError('Complete address is required for hosting')
        return v

class UserInDBBase(UserBase):
    id: int
    is_verified: bool
    role: str  # "user", "host", "admin"
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# What gets returned to frontend
class User(UserInDBBase):
    # Convert to camelCase for frontend
    fullName: Optional[str] = Field(None, alias="full_name")
    zipCode: Optional[str] = Field(None, alias="zip_code")
    avatarUrl: Optional[str] = Field(None, alias="avatar_url")
    isActive: bool = Field(alias="is_active")
    isVerified: bool = Field(alias="is_verified")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: Optional[datetime] = Field(None, alias="updated_at")
    
    class Config:
        from_attributes = True
        populate_by_name = True
        allow_population_by_field_name = True

# For checking if user can become a host
class UserHostReadiness(BaseModel):
    can_apply_for_host: bool
    missing_fields: list[str] = []
    
    @classmethod
    def check_user_readiness(cls, user: User):
        missing = []
        if not user.phone:
            missing.append("phone")
        if not user.address:
            missing.append("address")
        if not user.city:
            missing.append("city")
            
        return cls(
            can_apply_for_host=len(missing) == 0,
            missing_fields=missing
        )

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None