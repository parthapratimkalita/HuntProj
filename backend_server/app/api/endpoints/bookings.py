from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import Any, List
from datetime import datetime, timezone, timedelta
from app.api.endpoints.payments import create_payment_intent
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.property import Property
from app.models.booking import Booking
from app.models.enums import BookingStatus, PaymentStatus, PropertyStatus
from app.schemas.booking import (
    BookingResponse,
    BookingCreate,
    BookingUpdate,
    BookingSearch,
    BookingSimple,
    PropertyOwnerBookingView
)
from app.schemas.payment import PaymentIntentCreate, PaymentIntentResponse
from app.services.email import send_booking_confirmation_email
import json
from typing import Optional, List, Dict, Any

router = APIRouter()

def create_property_snapshot(property_obj):
    """Create a snapshot of property details at booking time"""
    return {
        "property_name": property_obj.property_name,
        "property_address": property_obj.address,
        "property_city": property_obj.city,
        "property_state": property_obj.state,
        "property_coordinates": {
            "latitude": float(property_obj.latitude),
            "longitude": float(property_obj.longitude)
        },
        "total_acres": property_obj.total_acres,
        "provider_info": {
            "provider_name": property_obj.provider.full_name,
            "provider_phone": property_obj.provider.phone,
            "provider_email": property_obj.provider.email
        } if property_obj.provider else None,
        "hunting_package_details": {
            "rules": property_obj.rules,
            "safety_info": property_obj.safety_info,
            "license_requirements": property_obj.license_requirements
        }
    }

@router.post("/", response_model=BookingResponse)
def create_booking(
    *,
    db: Session = Depends(get_db),
    booking_in: BookingCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new booking with enhanced data structure
    """
    # Check if property exists and is available
    property_obj = db.query(Property).options(
        joinedload(Property.provider)
    ).filter(
        Property.id == booking_in.property_id,
        Property.status == PropertyStatus.APPROVED,
        Property.is_listed == True
    ).first()
    
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or not available"
        )
    
    # Validate hunting package exists
    hunting_package = None
    for package in property_obj.hunting_packages or []:
        if package.get("id") == booking_in.hunting_package_id or package.get("name") == booking_in.hunting_package_name:
            hunting_package = package
            break
    
    if not hunting_package:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected hunting package not found"
        )
    
    # Validate guest count - check both camelCase and snake_case formats
    max_hunters = hunting_package.get("maxHunters") or hunting_package.get("max_hunters", 1)
    if booking_in.guest_count > max_hunters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guest count exceeds maximum allowed ({max_hunters})"
        )
    
    # Verify pricing (security check) - package_price should be base_price * guest_count
    base_package_price = hunting_package.get("price") or hunting_package.get("base_price", 0)
    expected_package_price = base_package_price * booking_in.guest_count
    if abs(booking_in.package_price - expected_package_price) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Package price mismatch. Expected {expected_package_price} for {booking_in.guest_count} hunters at ${base_package_price} each, got {booking_in.package_price}"
        )
    
    # Check for overlapping bookings
    overlapping_booking = db.query(Booking).filter(
        Booking.property_id == booking_in.property_id,
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        (
            (Booking.check_in_date <= booking_in.check_in_date) & 
            (Booking.check_out_date > booking_in.check_in_date)
        ) | (
            (Booking.check_in_date < booking_in.check_out_date) & 
            (Booking.check_out_date >= booking_in.check_out_date)
        ) | (
            (Booking.check_in_date >= booking_in.check_in_date) &
            (Booking.check_out_date <= booking_in.check_out_date)
        )
    ).first()
    
    if overlapping_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Property is already booked for these dates"
        )
    
    # Create property snapshot
    property_snapshot = create_property_snapshot(property_obj)
    
    # Create booking
    booking = Booking(
        property_id=booking_in.property_id,
        user_id=current_user.id,
        check_in_date=booking_in.check_in_date,
        check_out_date=booking_in.check_out_date,
        guest_count=booking_in.guest_count,
        lead_hunter_name=booking_in.lead_hunter_name or current_user.full_name,
        lead_hunter_phone=booking_in.lead_hunter_phone or current_user.phone,
        lead_hunter_email=booking_in.lead_hunter_email or current_user.email,
        hunting_package_id=booking_in.hunting_package_id,
        hunting_package_name=booking_in.hunting_package_name,
        hunting_package_type=booking_in.hunting_package_type,
        hunting_package_duration=booking_in.hunting_package_duration,
        package_price=booking_in.package_price,
        service_fee=booking_in.service_fee,
        taxes=booking_in.taxes,
        total_price=booking_in.total_price,
        accommodation_included=booking_in.accommodation_included,
        accommodation_type=booking_in.accommodation_type,
        accommodation_name=booking_in.accommodation_name,
        special_requests=booking_in.special_requests,
        property_snapshot=property_snapshot,
        booking_source="web",
        referral_code=booking_in.referral_code,
        booking_deadline=booking_in.check_in_date - timedelta(days=7),  # 7 days before
        status=BookingStatus.PENDING,
        payment_status=PaymentStatus.PENDING
    )
    
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    return booking

@router.get("/", response_model=List[BookingSimple])
def read_bookings(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve user's bookings
    """
    query = db.query(Booking).filter(Booking.user_id == current_user.id)
    
    if status:
        try:
            booking_status = BookingStatus(status)
            query = query.filter(Booking.status == booking_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid booking status"
            )
    
    bookings = query.order_by(Booking.created_at.desc()).offset(skip).limit(limit).all()
    return bookings

@router.get("/my-bookings", response_model=List[BookingResponse])
def get_my_bookings(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    include_cancelled: bool = False
) -> Any:
    """
    Get detailed view of user's bookings
    """
    query = db.query(Booking).filter(Booking.user_id == current_user.id)
    
    if not include_cancelled:
        query = query.filter(Booking.status != BookingStatus.CANCELLED)
    
    bookings = query.order_by(Booking.created_at.desc()).all()
    return bookings


@router.get("/provider", response_model=List[PropertyOwnerBookingView])
def get_provider_bookings(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Get all bookings for properties owned by the current provider
    """
    # Verify user is a provider
    if current_user.role != "provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Must be a provider to view provider bookings"
        )
    
    # Get all properties owned by this provider
    provider_properties = db.query(Property).filter(
        Property.provider_id == current_user.id
    ).all()
    
    if not provider_properties:
        return []
    
    property_ids = [prop.id for prop in provider_properties]
    
    # Get bookings for these properties with user info
    query = db.query(Booking).options(
        joinedload(Booking.user)
    ).filter(
        Booking.property_id.in_(property_ids)
    )
    
    # Filter by status if provided
    if status:
        try:
            booking_status = BookingStatus(status.upper())
            query = query.filter(Booking.status == booking_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid booking status"
            )
    
    bookings = query.order_by(
        Booking.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    # Format for provider view with enhanced information
    formatted_bookings = []
    for booking in bookings:
        # Get the property info for this booking
        property_info = next(
            (prop for prop in provider_properties if prop.id == booking.property_id), 
            None
        )
        
        formatted_booking = {
            "id": booking.id,
            "property_id": booking.property_id,
            "user_id": booking.user_id,
            "check_in_date": booking.check_in_date,
            "check_out_date": booking.check_out_date,
            "guest_count": booking.guest_count,
            "lead_hunter_name": booking.lead_hunter_name,
            "lead_hunter_phone": booking.lead_hunter_phone,
            "lead_hunter_email": booking.lead_hunter_email,
            "hunting_package_name": booking.hunting_package_name,
            "hunting_package_type": booking.hunting_package_type,
            "hunting_package_duration": booking.hunting_package_duration,
            "total_price": booking.total_price,
            "status": booking.status,
            "payment_status": booking.payment_status,
            "special_requests": booking.special_requests,
            "created_at": booking.created_at,
            "property_snapshot": {
                "property_name": property_info.property_name if property_info else "Unknown Property",
                "property_city": property_info.city if property_info else "",
                "property_state": property_info.state if property_info else ""
            },
            "user": {
                "full_name": booking.user.full_name if booking.user else "Unknown User",
                "email": booking.user.email if booking.user else "",
                "phone": booking.user.phone if booking.user else ""
            } if booking.user else None
        }
        formatted_bookings.append(formatted_booking)
    
    return formatted_bookings

@router.get("/property/{property_id}", response_model=List[PropertyOwnerBookingView])
def get_property_bookings(
    *,
    db: Session = Depends(get_db),
    property_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get bookings for a specific property (property owner only)
    """
    # Verify user owns the property
    property_obj = db.query(Property).filter(
        Property.id == property_id,
        Property.provider_id == current_user.id
    ).first()
    
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or unauthorized"
        )
    
    # Get bookings with user info
    bookings = db.query(Booking).options(
        joinedload(Booking.user)
    ).filter(
        Booking.property_id == property_id
    ).order_by(Booking.created_at.desc()).all()
    
    # Format for property owner view
    formatted_bookings = []
    for booking in bookings:
        formatted_bookings.append({
            "id": booking.id,
            "user_name": booking.user.full_name if booking.user else "Unknown",
            "user_email": booking.user.email if booking.user else "Unknown",
            "hunting_package_name": booking.hunting_package_name,
            "check_in_date": booking.check_in_date,
            "check_out_date": booking.check_out_date,
            "guest_count": booking.guest_count,
            "total_price": booking.total_price,
            "status": booking.status,
            "payment_status": booking.payment_status,
            "special_requests": booking.special_requests,
            "lead_hunter_name": booking.lead_hunter_name,
            "lead_hunter_phone": booking.lead_hunter_phone,
            "created_at": booking.created_at
        })
    
    return formatted_bookings

@router.get("/{booking_id}", response_model=BookingResponse)
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
    
    # Check permissions
    if booking.user_id != current_user.id and current_user.role != "admin":
        # Also allow property owner to view bookings
        if current_user.role == "provider":
            property_obj = db.query(Property).filter(
                Property.id == booking.property_id,
                Property.provider_id == current_user.id
            ).first()
            if not property_obj:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough permissions"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    return booking

@router.put("/{booking_id}", response_model=BookingResponse)
def update_booking(
    *,
    db: Session = Depends(get_db),
    booking_id: int,
    booking_in: BookingUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update booking details
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check permissions
    if booking.user_id != current_user.id and current_user.role not in ["admin", "provider"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Only allow certain updates after confirmation
    if booking.status == BookingStatus.CONFIRMED:
        allowed_fields = ["special_requests", "lead_hunter_name", "lead_hunter_phone", "lead_hunter_email"]
        update_data = booking_in.dict(exclude_unset=True)
        
        # Admin and provider can update more fields
        if current_user.role in ["admin", "provider"]:
            allowed_fields.extend(["booking_notes", "status", "cancellation_reason"])
        
        # Filter to only allowed fields
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    else:
        # All fields allowed for pending bookings
        filtered_data = booking_in.dict(exclude_unset=True)
    
    # Update booking fields
    for field, value in filtered_data.items():
        if field == "status" and value == BookingStatus.CANCELLED:
            booking.cancelled_at = datetime.now(timezone.utc)
        elif field == "status" and value == BookingStatus.COMPLETED:
            booking.completed_at = datetime.now(timezone.utc)
        
        setattr(booking, field, value)
    
    booking.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(booking)
    
    return booking

@router.post("/{booking_id}/cancel")
def cancel_booking(
    *,
    db: Session = Depends(get_db),
    booking_id: int,
    cancellation_reason: str = None,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Cancel a booking
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check permissions
    if booking.user_id != current_user.id and current_user.role not in ["admin", "provider"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check if booking can be cancelled
    if booking.status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking cannot be cancelled"
        )
    
    # Check cancellation deadline
    if booking.booking_deadline and datetime.now(timezone.utc) > booking.booking_deadline:
        if current_user.role not in ["admin", "provider"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cancellation deadline has passed"
            )
    
    # Cancel booking
    booking.status = BookingStatus.CANCELLED
    booking.cancellation_reason = cancellation_reason
    booking.cancelled_at = datetime.now(timezone.utc)
    
    # If payment was made, it will need to be refunded separately
    if booking.payment_status == PaymentStatus.PAID:
        booking.payment_status = PaymentStatus.PENDING  # Will be updated when refund is processed
    
    db.commit()
    
    return {
        "message": "Booking cancelled successfully",
        "booking_id": booking.id,
        "status": booking.status
    }

@router.post("/{booking_id}/confirm")
def confirm_booking(
    *,
    db: Session = Depends(get_db),
    booking_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Confirm a booking (called after successful payment)
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check permissions
    if booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending bookings can be confirmed"
        )
    
    # Confirm booking
    booking.status = BookingStatus.CONFIRMED
    booking.payment_status = PaymentStatus.PAID
    booking.confirmed_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(booking)
    
    # Send confirmation email
    try:
        send_booking_confirmation_email(current_user.email, booking)
    except Exception as e:
        print(f"Failed to send confirmation email: {e}")
    
    return {
        "message": "Booking confirmed successfully",
        "booking_id": booking.id,
        "status": booking.status
    }

# Payment Integration Endpoints
@router.post("/{booking_id}/create-payment-intent", response_model=PaymentIntentResponse)
async def create_booking_payment_intent(
    *,
    db: Session = Depends(get_db),
    booking_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create payment intent for a specific booking
    """
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or unauthorized"
        )
    
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is not in pending status"
        )
    
    # Import payment service here to avoid circular imports
    
    
    payment_data = PaymentIntentCreate(
        booking_id=booking_id,
        amount=int(booking.total_price * 100),  # Convert to cents
        currency="usd"
    )
    
    return await create_payment_intent(
        db=db,
        payment_data=payment_data,
        current_user=current_user
    )

@router.post("/{booking_id}/confirm-payment")
async def confirm_booking_payment(
    *,
    db: Session = Depends(get_db),
    booking_id: int,
    payment_intent_id: str,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Confirm payment for a specific booking
    """
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or unauthorized"
        )
    
    # Import payment service here to avoid circular imports
    from app.api.v1.endpoints.payments import confirm_payment
    
    result = await confirm_payment(
        db=db,
        payment_intent_id=payment_intent_id,
        current_user=current_user
    )
    
    return result

@router.delete("/{booking_id}")
def delete_booking(
    *,
    db: Session = Depends(get_db),
    booking_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete booking (admin only or within cancellation window)
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Only admin or booking owner can delete
    if booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Can only delete pending bookings or if admin
    if booking.status != BookingStatus.PENDING and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete pending bookings"
        )
    
    # Check if any payments exist
    if booking.payments and any(p.status == PaymentStatus.PAID for p in booking.payments):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete booking with completed payments. Cancel instead."
        )
    
    db.delete(booking)
    db.commit()
    
    return {"message": "Booking deleted successfully"}
