from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str  # Required field in database
    
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
    role: str  # "user", "provider", "admin"
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # IMPORTANT: Add host application status to the base class
    host_application_status: Optional[str] = None  # "pending", "approved", "rejected"

    class Config:
        from_attributes = True

# What gets returned to frontend - FIXED FIELD MAPPING
class User(UserInDBBase):
    # Convert to camelCase for frontend - FIXED MAPPINGS
    fullName: str = Field(alias="full_name")  # Required field - not Optional
    zipCode: Optional[str] = Field(None, alias="zip_code")
    avatarUrl: Optional[str] = Field(None, alias="avatar_url")
    isActive: bool = Field(alias="is_active")
    isVerified: bool = Field(alias="is_verified")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: Optional[datetime] = Field(None, alias="updated_at")
    
    # FIXED: Correct field mapping for host application status
    hostApplicationStatus: Optional[str] = Field(None, alias="host_application_status")
    
    class Config:
        from_attributes = True
        populate_by_name = True
        allow_population_by_field_name = True
        # IMPORTANT: This allows both snake_case and camelCase field names
        extra = "forbid"  # Prevent extra fields

# Alternative approach - if the mapping still doesn't work, try this:
class UserAlternative(UserInDBBase):
    """Alternative User schema that exposes snake_case directly"""
    # Keep everything in snake_case for frontend
    full_name: str
    zip_code: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # This should work directly without alias
    host_application_status: Optional[str] = None
    
    class Config:
        from_attributes = True

# For checking if user can become a host
class UserHostReadiness(BaseModel):
    can_apply_for_host: bool
    missing_fields: list[str] = []
    current_application_status: Optional[str] = None  # Added for completeness
    
    @classmethod
    def check_user_readiness(cls, user):  # Accept either User type
        missing = []
        
        # Handle both camelCase and snake_case field names
        phone = getattr(user, 'phone', None)
        address = getattr(user, 'address', None) 
        city = getattr(user, 'city', None)
        host_status = getattr(user, 'hostApplicationStatus', None) or getattr(user, 'host_application_status', None)
        
        if not phone:
            missing.append("phone")
        if not address:
            missing.append("address")
        if not city:
            missing.append("city")
        
        # User can apply if they have no missing fields AND no existing application
        can_apply = len(missing) == 0 and host_status is None
            
        return cls(
            can_apply_for_host=can_apply,
            missing_fields=missing,
            current_application_status=host_status
        )

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None