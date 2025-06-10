from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class HostApplicationBase(BaseModel):
    phone: str
    address: str
    bio: str  # Required field

class HostApplicationCreate(HostApplicationBase):
    document_urls: List[str]  # Required field - must have at least one document

class HostApplicationReview(BaseModel):
    status: str  # 'approved' or 'rejected'
    admin_comment: Optional[str] = None

class HostApplication(HostApplicationBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    admin_comment: Optional[str] = None
    verification_documents: str  # Required - stores JSON string of document URLs
    
    class Config:
        from_attributes = True