from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .property import Property
from .user import User

class PaymentBase(BaseModel):
    amount: float
    payment_method: str
    transaction_id: Optional[str] = None
    status: str = "pending"

class PaymentCreate(PaymentBase):
    booking_id: int

class Payment(PaymentBase):
    id: int
    booking_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BookingBase(BaseModel):
    property_id: int
    check_in_date: datetime
    check_out_date: datetime
    total_price: float
    special_requests: Optional[str] = None

class BookingCreate(BookingBase):
    pass

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    special_requests: Optional[str] = None

class Booking(BookingBase):
    id: int
    user_id: int
    status: str
    payment_status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    property: Property
    user: User
    payments: List[Payment] = []

    class Config:
        from_attributes = True

class BookingSearch(BaseModel):
    user_id: Optional[int] = None
    property_id: Optional[int] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None 