from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.property import Property
from app.schemas.user import User

class WishlistBase(BaseModel):
    property_id: int

class WishlistCreate(WishlistBase):
    pass

class Wishlist(WishlistBase):
    id: int
    user_id: int
    created_at: datetime
    property: Optional[Property] = None
    user: Optional[User] = None

    class Config:
        from_attributes = True