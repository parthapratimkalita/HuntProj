from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import datetime
from enum import Enum

class ApplicationStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class HostApplicationBase(BaseModel):
    phone: str
    address: str
    bio: str

class HostApplicationCreate(HostApplicationBase):
    document_urls: List[str]  # Required field - must have at least one document
    
    @validator('document_urls')
    def validate_document_urls(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one document URL is required')
        return v
    
    @validator('phone')
    def validate_phone(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Phone number is required')
        return v.strip()
    
    @validator('address')
    def validate_address(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Address is required')
        return v.strip()
    
    @validator('bio')
    def validate_bio(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Bio is required')
        return v.strip()

class HostApplicationReview(BaseModel):
    status: ApplicationStatusEnum
    admin_comment: Optional[str] = None

class HostApplication(BaseModel):
    """
    Schema for HostApplication with proper database constraints
    """
    # Required fields (NOT NULL in database)
    id: int
    user_id: int  # NOT NULL - every application belongs to a user
    phone: str    # NOT NULL - required for contact
    address: str  # NOT NULL - required for verification
    bio: str      # NOT NULL - required for application
    status: str   # NOT NULL - every application has a status
    verification_documents: str  # NOT NULL - required for verification
    
    # Timestamps (created_at should probably also be NOT NULL with default)
    created_at: datetime  # Should be NOT NULL with default NOW()
    
    # Optional fields (can be NULL)
    reviewed_at: Optional[datetime] = None
    admin_comment: Optional[str] = None
    
    @validator('status', pre=True)
    def validate_status(cls, v):
        """Convert enum to string if needed"""
        if hasattr(v, 'value'):
            return v.value
        elif hasattr(v, 'name'):
            return v.name
        return str(v)
    
    @validator('verification_documents', pre=True)
    def validate_verification_documents(cls, v):
        """Ensure verification_documents is a valid JSON string"""
        if isinstance(v, str):
            return v
        else:
            import json
            return json.dumps(v) if v is not None else "[]"
    
    class Config:
        from_attributes = True
        populate_by_name = True