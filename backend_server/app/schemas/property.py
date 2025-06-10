from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime

class PropertyImageBase(BaseModel):
    image_url: str
    is_primary: bool = False

class PropertyImageCreate(PropertyImageBase):
    pass

class PropertyImage(PropertyImageBase):
    id: int
    property_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class PropertyBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    location: str
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area: Optional[float] = None
    is_available: bool = True
    hunts_offered: Optional[List[str]] = None
    facilities: Optional[List[str]] = None
    status: Optional[str] = None

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(PropertyBase):
    pass

class Property(PropertyBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    images: List[PropertyImage] = []

    class Config:
        from_attributes = True

class PropertySearch(BaseModel):
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    location: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None 