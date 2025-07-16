from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import Any, List
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.booking import Booking
from app.models.enums import BookingStatus, PaymentStatus
from app.models.payment import Payment
from app.models.property import Property
from app.schemas.payment import (
    PaymentResponse,
    PaymentCreate,
    PaymentUpdate,
    PaymentSummary,
    RefundRequest,
    RefundResponse,
    AuthorizationConfirmResponse,
    CapturePaymentResponse,
    CancelAuthorizationResponse,
    CancelAuthorizationRequest,
    PaymentIntentCreate, 
    PaymentIntentResponse,
    PaymentConfirmRequest
)
import stripe
from app.core.config import settings
import os
from datetime import datetime, timezone, timedelta

# Initialize Stripe with your secret key
stripe.api_key = settings.STRIPE_SECRET_KEY

print(f"Stripe API Key configured: {bool(stripe.api_key)}")

router = APIRouter()

# Replace the create_payment_intent function in your payments.py file

@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    *,
    db: Session = Depends(get_db),
    payment_data: PaymentIntentCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create a Stripe Payment Intent with AUTHORIZATION ONLY (manual capture)
    Money will be held but not captured until provider confirms booking
    """
    print(f"CREATE PAYMENT INTENT DEBUG: Starting for booking {payment_data.booking_id}")
    
    # Verify booking exists and belongs to user
    booking = db.query(Booking).options(
        joinedload(Booking.property).joinedload(Property.provider)
    ).filter(
        Booking.id == payment_data.booking_id,
        Booking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or unauthorized"
        )
    
    # Check if booking is in correct status
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is not in pending status"
        )
    
    # Check if payment amount matches booking total
    expected_amount = int(booking.total_price * 100)  # Convert to cents
    if payment_data.amount != expected_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount mismatch. Expected {expected_amount}, got {payment_data.amount}"
        )
    
    # Check if payment intent already exists for this booking
    existing_payment = db.query(Payment).filter(
        Payment.booking_id == booking.id,
        Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.AUTHORIZED])
    ).first()
    
    if existing_payment:
        # Return existing payment intent
        try:
            intent = stripe.PaymentIntent.retrieve(existing_payment.stripe_payment_intent_id)
            return PaymentIntentResponse(
                client_secret=intent.client_secret,
                payment_intent_id=intent.id
            )
        except stripe.error.StripeError as e:
            print(f"CREATE PAYMENT INTENT DEBUG: Existing intent invalid: {e}")
            # If Stripe payment intent is invalid, create a new one
            db.delete(existing_payment)
            db.commit()
    
    try:
        # Get property details for rich metadata
        property_obj = booking.property
        
        # Create Stripe Payment Intent for card payments
        intent = stripe.PaymentIntent.create(
            amount=payment_data.amount,
            currency=payment_data.currency,
            
            # 🔥 KEY CHANGE: Use manual capture for authorization & capture flow
            capture_method='manual',  # This holds the money without charging
            
            # 🔥 REMOVED: confirmation_method (conflicts with automatic_payment_methods)
            # confirmation_method='automatic',
            
            # Rich metadata for Stripe Dashboard and webhooks
            metadata={
                # Booking identifiers
                'booking_id': str(booking.id),
                'user_id': str(current_user.id),
                'property_id': str(booking.property_id),
                'flow_type': 'authorization_capture',
                
                # Customer info
                'customer_email': current_user.email,
                'customer_name': current_user.full_name or current_user.username,
                'lead_hunter_name': booking.lead_hunter_name or current_user.full_name or current_user.username,
                'lead_hunter_phone': booking.lead_hunter_phone or current_user.phone or '',
                
                # Property details
                'property_name': property_obj.property_name if property_obj else 'Unknown Property',
                'property_location': f"{property_obj.city}, {property_obj.state}" if property_obj else 'Unknown Location',
                'provider_id': str(property_obj.provider_id) if property_obj else '',
                'provider_email': property_obj.provider.email if property_obj and property_obj.provider else '',
                
                # Package details
                'package_name': booking.hunting_package_name or 'Unknown Package',
                'package_type': booking.hunting_package_type or 'Unknown Type',
                'package_duration': str(booking.hunting_package_duration or 0),
                'guest_count': str(booking.guest_count),
                
                # Dates
                'check_in_date': booking.check_in_date.isoformat(),
                'check_out_date': booking.check_out_date.isoformat(),
                
                # Pricing breakdown
                'package_price': str(booking.package_price),
                'service_fee': str(booking.service_fee),
                'total_price': str(booking.total_price),
                
                # Business context
                'booking_source': booking.booking_source or 'web',
                'platform': 'huntstay',
                'environment': os.getenv('ENVIRONMENT', 'development'),
            },
            
            # Description for Stripe Dashboard
            description=f"Hunting authorization: {booking.hunting_package_name or 'Unknown Package'} at {property_obj.property_name if property_obj else 'Unknown Property'}",
            
            # Receipt email
            receipt_email=current_user.email,
            
            # Statement descriptor (appears on credit card statement)
            statement_descriptor='HUNTSTAY AUTH',
            statement_descriptor_suffix=property_obj.city[:5].upper() if property_obj and property_obj.city else 'HUNT',
            
            # Card payments only
            payment_method_types=['card'],
        )
        
        # Store payment intent in database with PENDING status
        payment = Payment(
            booking_id=booking.id,
            stripe_payment_intent_id=intent.id,
            amount=payment_data.amount / 100,  # Convert back to dollars
            currency=payment_data.currency,
            status="pending",  # Will become "authorized" after customer confirms
            payment_method="stripe",
            capture_deadline=datetime.now(timezone.utc) + timedelta(days=7)  # Stripe auth expires in 7 days
        )
        
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        print(f"CREATE PAYMENT INTENT DEBUG: Success - Intent created: {intent.id}")
        
        return PaymentIntentResponse(
            client_secret=intent.client_secret,
            payment_intent_id=intent.id
        )
        
    except stripe.error.StripeError as e:
        print(f"CREATE PAYMENT INTENT DEBUG: Stripe error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        print(f"CREATE PAYMENT INTENT DEBUG: Unexpected error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment intent: {str(e)}"
        )

@router.post("/confirm-authorization", response_model=AuthorizationConfirmResponse)
async def confirm_authorization(
    *,
    db: Session = Depends(get_db),
    request: PaymentConfirmRequest,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Confirm that payment authorization succeeded (customer completed card entry)
    This does NOT charge the customer yet - only confirms the authorization
    """
    print(f"CONFIRM AUTH DEBUG: Starting authorization confirmation for payment_intent_id: {request.payment_intent_id}")
    
    # Find payment by payment intent ID
    payment = db.query(Payment).options(
        joinedload(Payment.booking).joinedload(Booking.property).joinedload(Property.provider)
    ).filter(
        Payment.stripe_payment_intent_id == request.payment_intent_id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Verify payment belongs to current user
    if payment.booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized to confirm this payment"
        )
    
    try:
        # Retrieve payment intent from Stripe to verify status
        print("CONFIRM AUTH DEBUG: Retrieving payment intent from Stripe...")
        intent = stripe.PaymentIntent.retrieve(request.payment_intent_id)
        print(f"CONFIRM AUTH DEBUG: Intent status: {intent.status}")
        
        if intent.status == "requires_capture":
            # Authorization successful - money is held but not captured
            payment.status = PaymentStatus.AUTHORIZED
            payment.authorized_at = datetime.now(timezone.utc)
            
            # Update booking status to show authorization is complete
            booking = payment.booking
            booking.status = BookingStatus.PENDING  # Still pending provider confirmation
            booking.payment_status = PaymentStatus.AUTHORIZED
            booking.payment_authorized_at = datetime.now(timezone.utc)
            booking.provider_notified_at = datetime.now(timezone.utc)
            booking.provider_response_deadline = datetime.now(timezone.utc) + timedelta(days=5)  # Give provider 5 days
            booking.updated_at = datetime.now(timezone.utc)
            
            print("CONFIRM AUTH DEBUG: Committing authorization to database...")
            db.commit()
            
            # TODO: Send notification to property provider
            # await send_provider_booking_notification(booking)
            
            print("CONFIRM AUTH DEBUG: Authorization confirmed successfully")
            
            return AuthorizationConfirmResponse(
                message="Payment authorized successfully. Waiting for provider confirmation.",
                booking_id=booking.id,
                payment_id=payment.id,
                payment_status=PaymentStatus.AUTHORIZED,
                booking_status=booking.status.value if hasattr(booking.status, 'value') else booking.status,
                next_step="provider_confirmation_required"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Authorization not successful. Status: {intent.status}"
            )
            
    except stripe.error.StripeError as e:
        print(f"CONFIRM AUTH DEBUG: Stripe error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        print(f"CONFIRM AUTH DEBUG: Unexpected error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm authorization: {str(e)}"
        )

@router.post("/capture-payment/{booking_id}", response_model=CapturePaymentResponse)
async def capture_payment(
    *,
    db: Session = Depends(get_db),
    booking_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    PROVIDER ENDPOINT: Capture the authorized payment (actually charge the customer)
    This should be called when provider confirms the booking
    """
    print(f"CAPTURE PAYMENT DEBUG: Provider {current_user.id} attempting to capture payment for booking {booking_id}")
    
    # Find booking and verify provider owns the property
    booking = db.query(Booking).options(
        joinedload(Booking.property),
        joinedload(Booking.payments),
        joinedload(Booking.user)
    ).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Verify current user is the property provider or admin
    if booking.property.provider_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the property provider can capture payment"
        )
    
    # Find the authorized payment
    payment = None
    for p in booking.payments:
        if p.status == PaymentStatus.AUTHORIZED:
            payment = p
            break
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No authorized payment found for this booking"
        )
    
    # Check if authorization has expired
    if payment.capture_deadline and datetime.now(timezone.utc) > payment.capture_deadline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment authorization has expired. Guest will need to re-authorize payment."
        )
    
    try:
        # Capture the payment in Stripe
        print(f"CAPTURE PAYMENT DEBUG: Capturing payment intent {payment.stripe_payment_intent_id}")
        intent = stripe.PaymentIntent.capture(payment.stripe_payment_intent_id)
        print(f"CAPTURE PAYMENT DEBUG: Capture result status: {intent.status}")
        
        if intent.status == "succeeded":
            # Update payment status
            payment.status = PaymentStatus.PAID
            payment.completed_at = datetime.now(timezone.utc)
            payment.captured_at = datetime.now(timezone.utc)  # Set captured_at timestamp
            payment.capture_requested_by = current_user.id  # Track who captured the payment
            payment.capture_requested_at = datetime.now(timezone.utc)
            
            # Extract charge information if available
            if hasattr(intent, 'charges') and intent.charges and hasattr(intent.charges, 'data'):
                if len(intent.charges.data) > 0:
                    charge = intent.charges.data[0]
                    payment.stripe_charge_id = charge.id
                    payment.transaction_id = charge.id
                    
                    # Store payment method details
                    if hasattr(charge, 'payment_method_details') and charge.payment_method_details:
                        pm_details = charge.payment_method_details
                        if hasattr(pm_details, 'type'):
                            payment.payment_method_type = pm_details.type
                        
                        if hasattr(pm_details, 'card') and pm_details.card:
                            if hasattr(pm_details.card, 'brand'):
                                payment.payment_method_brand = pm_details.card.brand
                            if hasattr(pm_details.card, 'last4'):
                                payment.payment_method_last4 = pm_details.card.last4
            
            # Update booking status
            booking.status = BookingStatus.CONFIRMED
            booking.payment_status = PaymentStatus.PAID
            booking.confirmed_at = datetime.now(timezone.utc)
            booking.updated_at = datetime.now(timezone.utc)
            
            db.commit()
            
            # TODO: Send confirmation email to guest
            # await send_booking_confirmation_email(booking.user.email, booking)
            
            print("CAPTURE PAYMENT DEBUG: Payment captured successfully")
            
            return CapturePaymentResponse(
                message="Payment captured successfully. Booking confirmed.",
                booking_id=booking.id,
                payment_id=payment.id,
                payment_status=PaymentStatus.PAID,
                booking_status="confirmed",
                amount_captured=payment.amount
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment capture failed. Status: {intent.status}"
            )
            
    except stripe.error.StripeError as e:
        print(f"CAPTURE PAYMENT DEBUG: Stripe error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe capture error: {str(e)}"
        )
    except Exception as e:
        print(f"CAPTURE PAYMENT DEBUG: Unexpected error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to capture payment: {str(e)}"
        )

@router.post("/cancel-authorization/{booking_id}", response_model=CancelAuthorizationResponse)
async def cancel_authorization(
    *,
    db: Session = Depends(get_db),
    booking_id: int,
    request: CancelAuthorizationRequest,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    PROVIDER ENDPOINT: Cancel the authorized payment (release the hold)
    This should be called when provider rejects the booking
    """
    print(f"CANCEL AUTH DEBUG: Attempting to cancel authorization for booking {booking_id}")
    
    # Find booking and verify provider owns the property
    booking = db.query(Booking).options(
        joinedload(Booking.property),
        joinedload(Booking.payments),
        joinedload(Booking.user)
    ).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Verify current user is the property provider or admin
    if booking.property.provider_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the property provider can cancel authorization"
        )
    
    # Find the authorized payment
    payment = None
    for p in booking.payments:
        if p.status == PaymentStatus.AUTHORIZED:
            payment = p
            break
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No authorized payment found for this booking"
        )
    
    try:
        # Cancel the payment intent in Stripe
        print(f"CANCEL AUTH DEBUG: Canceling payment intent {payment.stripe_payment_intent_id}")
        intent = stripe.PaymentIntent.cancel(payment.stripe_payment_intent_id)
        print(f"CANCEL AUTH DEBUG: Cancel result status: {intent.status}")
        
        if intent.status == "canceled":
            # Update payment status
            payment.status = PaymentStatus.CANCELLED
            payment.failure_reason = f"Provider cancelled: {request.cancellation_reason}"
            payment.cancelled_at = datetime.now(timezone.utc)  # Set cancelled_at timestamp
            payment.cancellation_reason = request.cancellation_reason  # Store cancellation reason
            payment.updated_at = datetime.now(timezone.utc)
            
            # Update booking status
            booking.status = BookingStatus.CANCELLED
            booking.payment_status = PaymentStatus.CANCELLED
            booking.cancellation_reason = request.cancellation_reason
            booking.cancelled_at = datetime.now(timezone.utc)
            booking.updated_at = datetime.now(timezone.utc)
            
            db.commit()
            
            # TODO: Send cancellation email to guest
            # await send_booking_cancellation_email(booking.user.email, booking, request.cancellation_reason)
            
            print("CANCEL AUTH DEBUG: Authorization cancelled successfully")
            
            return CancelAuthorizationResponse(
                message="Authorization cancelled successfully. No charge made to customer.",
                booking_id=booking.id,
                payment_id=payment.id,
                payment_status=PaymentStatus.CANCELLED,
                booking_status="cancelled",
                reason=request.cancellation_reason
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Authorization cancellation failed. Status: {intent.status}"
            )
            
    except stripe.error.StripeError as e:
        print(f"CANCEL AUTH DEBUG: Stripe error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe cancellation error: {str(e)}"
        )
    except Exception as e:
        print(f"CANCEL AUTH DEBUG: Unexpected error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel authorization: {str(e)}"
        )

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """
    Handle Stripe webhook events for authorization & capture flow
    """
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        print(f"WEBHOOK DEBUG: Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        print(f"WEBHOOK DEBUG: Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    print(f"WEBHOOK DEBUG: Processing event: {event['type']}")
    
    # Handle authorization events
    if event['type'] == 'payment_intent.amount_capturable_updated':
        # Authorization successful - money is held
        payment_intent = event['data']['object']
        print(f"WEBHOOK DEBUG: Authorization successful for {payment_intent['id']}")
        
        payment = db.query(Payment).options(
            joinedload(Payment.booking)
        ).filter(
            Payment.stripe_payment_intent_id == payment_intent['id']
        ).first()
        
        if payment and payment.status == PaymentStatus.PENDING:
            payment.status = PaymentStatus.AUTHORIZED
            payment.authorized_at = datetime.now(timezone.utc)
            
            # Update booking
            payment.booking.payment_status = PaymentStatus.AUTHORIZED
            payment.booking.payment_authorized_at = datetime.now(timezone.utc)
            payment.booking.updated_at = datetime.now(timezone.utc)
            
            db.commit()
            print(f"WEBHOOK DEBUG: Updated payment {payment.id} to authorized status")
            
    elif event['type'] == 'payment_intent.succeeded':
        # Payment captured successfully
        payment_intent = event['data']['object']
        print(f"WEBHOOK DEBUG: Payment captured for {payment_intent['id']}")
        
        payment = db.query(Payment).options(
            joinedload(Payment.booking)
        ).filter(
            Payment.stripe_payment_intent_id == payment_intent['id']
        ).first()
        
        if payment and payment.status == PaymentStatus.AUTHORIZED:
            payment.status = PaymentStatus.PAID
            payment.completed_at = datetime.now(timezone.utc)
            payment.captured_at = datetime.now(timezone.utc)  # Set captured_at in webhook
            
            # Extract charge information
            if payment_intent.get('charges', {}).get('data'):
                charge = payment_intent['charges']['data'][0]
                payment.stripe_charge_id = charge['id']
                payment.transaction_id = charge['id']
            
            # Update booking
            payment.booking.status = BookingStatus.CONFIRMED
            payment.booking.payment_status = PaymentStatus.PAID
            payment.booking.confirmed_at = datetime.now(timezone.utc)
            
            db.commit()
            print(f"WEBHOOK DEBUG: Updated payment {payment.id} to paid status")
            
    elif event['type'] == 'payment_intent.canceled':
        # Authorization cancelled
        payment_intent = event['data']['object']
        print(f"WEBHOOK DEBUG: Authorization cancelled for {payment_intent['id']}")
        
        payment = db.query(Payment).options(
            joinedload(Payment.booking)
        ).filter(
            Payment.stripe_payment_intent_id == payment_intent['id']
        ).first()
        
        if payment:
            payment.status = PaymentStatus.CANCELLED
            payment.cancelled_at = datetime.now(timezone.utc)  # Set cancelled_at in webhook
            payment.updated_at = datetime.now(timezone.utc)
            
            # Update booking if not already cancelled
            if payment.booking.status != BookingStatus.CANCELLED:
                payment.booking.status = BookingStatus.CANCELLED
                payment.booking.payment_status = PaymentStatus.CANCELLED
                payment.booking.cancelled_at = datetime.now(timezone.utc)
            
            db.commit()
            print(f"WEBHOOK DEBUG: Updated payment {payment.id} to cancelled status")
            
    elif event['type'] == 'payment_intent.payment_failed':
        # Payment authorization failed
        payment_intent = event['data']['object']
        print(f"WEBHOOK DEBUG: Payment failed for {payment_intent['id']}")
        
        payment = db.query(Payment).filter(
            Payment.stripe_payment_intent_id == payment_intent['id']
        ).first()
        
        if payment:
            payment.status = PaymentStatus.FAILED
            if payment_intent.get('last_payment_error'):
                payment.failure_reason = payment_intent['last_payment_error'].get('message', 'Payment failed')
            
            db.commit()
            print(f"WEBHOOK DEBUG: Updated payment {payment.id} to failed status")
    
    return {"status": "success"}

@router.post("/refund/{payment_id}", response_model=RefundResponse)
async def refund_payment(
    *,
    db: Session = Depends(get_db),
    payment_id: int,
    refund_request: RefundRequest,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Process payment refund through Stripe
    Only works for captured/paid payments
    """
    payment = db.query(Payment).options(
        joinedload(Payment.booking).joinedload(Booking.property)
    ).filter(Payment.id == payment_id).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Check permissions
    if payment.booking.user_id != current_user.id and current_user.role != "admin":
        # Also allow property owner to issue refunds
        if current_user.role == "provider":
            if payment.booking.property.provider_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to refund this payment"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to refund this payment"
            )
    
    if payment.status != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only refund completed payments"
        )
    
    # Calculate refund amount
    refund_amount = refund_request.amount or payment.amount
    if refund_amount > payment.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refund amount cannot exceed payment amount"
        )
    
    try:
        # Create refund in Stripe
        refund = stripe.Refund.create(
            payment_intent=payment.stripe_payment_intent_id,
            amount=int(refund_amount * 100),  # Convert to cents
            reason=refund_request.reason,
            metadata={
                'booking_id': str(payment.booking_id),
                'refund_requested_by': current_user.email,
                'original_amount': str(payment.amount),
                'refund_amount': str(refund_amount),
            }
        )
        
        # Update payment and booking status
        if refund_amount >= payment.amount:
            payment.status = PaymentStatus.REFUNDED
            payment.booking.status = BookingStatus.REFUNDED
            payment.booking.payment_status = PaymentStatus.REFUNDED
        else:
            payment.status = PaymentStatus.PARTIALLY_REFUNDED
            payment.booking.payment_status = PaymentStatus.PARTIALLY_REFUNDED
        
        payment.refund_amount = refund_amount
        payment.refund_reason = refund_request.reason
        payment.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        return RefundResponse(
            refund_id=refund.id,
            amount=refund_amount,
            status=payment.status,
            message="Payment refunded successfully"
        )
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe refund error: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process refund: {str(e)}"
        )

# Read endpoints
@router.get("/", response_model=List[PaymentSummary])
def read_payments(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve user's payments
    """
    query = db.query(Payment).join(Booking).filter(Booking.user_id == current_user.id)
    
    # Admin can see all payments
    if current_user.role == "admin":
        query = db.query(Payment).join(Booking)
    
    payments = query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()
    return payments

@router.get("/{payment_id}", response_model=PaymentResponse)
def read_payment(
    *,
    db: Session = Depends(get_db),
    payment_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get payment by ID
    """
    payment = db.query(Payment).options(
        joinedload(Payment.booking)
    ).filter(Payment.id == payment_id).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Check permissions
    if payment.booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return payment

# Legacy endpoints for backward compatibility
@router.post("/legacy", response_model=PaymentResponse)
def create_payment_legacy(
    *,
    db: Session = Depends(get_db),
    payment_in: PaymentCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new payment (legacy endpoint for backward compatibility)
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
    payment = Payment(
        booking_id=payment_in.booking_id,
        amount=payment_in.amount,
        currency=payment_in.currency,
        payment_method=payment_in.payment_method,
        transaction_id=payment_in.transaction_id,
        status="paid"  # Legacy payments are assumed completed
    )
    db.add(payment)
    
    # Update booking status
    booking.payment_status = PaymentStatus.PAID
    if booking.status == BookingStatus.PENDING:
        booking.status = BookingStatus.CONFIRMED
        booking.confirmed_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(payment)
    return payment

# Health check endpoint
@router.get("/health")
def payment_health_check():
    """
    Check if payment system is working
    """
    try:
        # Test Stripe connection
        stripe.Account.retrieve()
        return {
            "status": "healthy",
            "stripe_connected": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "stripe_connected": False,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }