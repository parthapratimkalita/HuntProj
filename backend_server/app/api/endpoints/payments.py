from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment
from app.schemas.booking import Payment as PaymentSchema, PaymentCreate

router = APIRouter()

@router.post("/", response_model=PaymentSchema)
def create_payment(
    *,
    db: Session = Depends(get_db),
    payment_in: PaymentCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new payment
    """
    # Check if booking exists and belongs to user
    booking = db.query(Booking).filter(Booking.id == payment_in.booking_id).first()
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
    
    # Check if payment amount matches booking total
    if payment_in.amount != booking.total_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount does not match booking total"
        )
    
    # Create payment
    payment = Payment(**payment_in.dict())
    db.add(payment)
    
    # Update booking status
    booking.payment_status = "paid"
    if booking.status == BookingStatus.PENDING:
        booking.status = BookingStatus.CONFIRMED
    
    db.commit()
    db.refresh(payment)
    return payment

@router.get("/", response_model=List[PaymentSchema])
def read_payments(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve payments
    """
    query = db.query(Payment).join(Booking)
    
    # Filter by user role
    if current_user.role != "admin":
        query = query.filter(Booking.user_id == current_user.id)
    
    payments = query.offset(skip).limit(limit).all()
    return payments

@router.get("/{payment_id}", response_model=PaymentSchema)
def read_payment(
    *,
    db: Session = Depends(get_db),
    payment_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get payment by ID
    """
    payment = db.query(Payment).join(Booking).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    if payment.booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return payment

@router.put("/{payment_id}/refund")
def refund_payment(
    *,
    db: Session = Depends(get_db),
    payment_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Process payment refund
    """
    payment = db.query(Payment).join(Booking).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    if payment.booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Update payment status
    payment.status = "refunded"
    
    # Update booking status
    payment.booking.status = BookingStatus.CANCELLED
    payment.booking.payment_status = "refunded"
    
    db.commit()
    return {"message": "Payment refunded successfully"} 