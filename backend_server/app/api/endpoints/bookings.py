from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List
from datetime import datetime
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.property import Property
from app.models.booking import Booking, BookingStatus
from app.schemas.booking import (
    Booking as BookingSchema,
    BookingCreate,
    BookingUpdate,
    BookingSearch
)
from app.services.email import send_booking_confirmation_email

router = APIRouter()

@router.post("/", response_model=BookingSchema)
def create_booking(
    *,
    db: Session = Depends(get_db),
    booking_in: BookingCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new booking
    """
    # Check if property exists and is available
    property = db.query(Property).filter(Property.id == booking_in.property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    if not property.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Property is not available"
        )
    
    # Check for overlapping bookings
    overlapping_booking = db.query(Booking).filter(
        Booking.property_id == booking_in.property_id,
        Booking.status != BookingStatus.CANCELLED,
        (
            (Booking.check_in_date <= booking_in.check_in_date) & 
            (Booking.check_out_date >= booking_in.check_in_date)
        ) | (
            (Booking.check_in_date <= booking_in.check_out_date) & 
            (Booking.check_out_date >= booking_in.check_out_date)
        )
    ).first()
    
    if overlapping_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Property is already booked for these dates"
        )
    
    # Create booking
    booking = Booking(
        **booking_in.dict(),
        user_id=current_user.id,
        status=BookingStatus.PENDING,
        payment_status="pending"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    # Send confirmation email
    send_booking_confirmation_email(current_user.email, booking.__dict__)
    
    return booking

@router.get("/", response_model=List[BookingSchema])
def read_bookings(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: BookingSearch = None,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve bookings with optional search filters
    """
    query = db.query(Booking)
    
    # Apply filters
    if search:
        if search.user_id:
            query = query.filter(Booking.user_id == search.user_id)
        if search.property_id:
            query = query.filter(Booking.property_id == search.property_id)
        if search.status:
            query = query.filter(Booking.status == search.status)
        if search.start_date:
            query = query.filter(Booking.check_in_date >= search.start_date)
        if search.end_date:
            query = query.filter(Booking.check_out_date <= search.end_date)
    
    # Filter by user role
    if current_user.role != "admin":
        query = query.filter(Booking.user_id == current_user.id)
    
    bookings = query.offset(skip).limit(limit).all()
    return bookings

@router.get("/{booking_id}", response_model=BookingSchema)
def read_booking(
    *,
    db: Session = Depends(get_db),
    booking_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get booking by ID
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    if booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return booking

@router.put("/{booking_id}", response_model=BookingSchema)
def update_booking(
    *,
    db: Session = Depends(get_db),
    booking_id: int,
    booking_in: BookingUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update booking
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    if booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Update booking
    for field, value in booking_in.dict(exclude_unset=True).items():
        setattr(booking, field, value)
    
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking

@router.delete("/{booking_id}")
def delete_booking(
    *,
    db: Session = Depends(get_db),
    booking_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete booking
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    if booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    db.delete(booking)
    db.commit()
    return {"message": "Booking deleted successfully"} 