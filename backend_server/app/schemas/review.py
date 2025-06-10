from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None

class ReviewCreate(ReviewBase):
    property_id: int

class Review(ReviewBase):
    id: int
    user_id: int
    property_id: int
    created_at: datetime

    class Config:
        from_attributes = True 