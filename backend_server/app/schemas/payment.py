from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from app.models.enums import PaymentStatus, PaymentMethodType

class PaymentBase(BaseModel):
    booking_id: int
    amount: float
    currency: str = "usd"
    payment_method: str = "stripe"

class PaymentCreate(PaymentBase):
    """Schema for creating a payment (legacy)"""
    transaction_id: Optional[str] = None

class PaymentStripeCreate(BaseModel):
    """Schema for creating a Stripe payment"""
    booking_id: int
    stripe_payment_intent_id: str
    amount: float
    currency: str = "usd"

class PaymentUpdate(BaseModel):
    """Schema for updating payment status"""
    status: Optional[PaymentStatus] = None
    failure_reason: Optional[str] = None
    refund_reason: Optional[str] = None
    refund_amount: Optional[float] = None
    cancellation_reason: Optional[str] = None

class PaymentResponse(BaseModel):
    """Full payment response schema with authorization & capture support"""
    id: int
    booking_id: int
    
    # Stripe references
    stripe_payment_intent_id: Optional[str] = None
    stripe_charge_id: Optional[str] = None
    
    # Payment details
    amount: float
    currency: str
    status: PaymentStatus
    
    # Payment method info (non-sensitive)
    payment_method_type: Optional[PaymentMethodType] = None
    payment_method_brand: Optional[str] = None
    payment_method_last4: Optional[str] = None
    
    # Legacy fields
    transaction_id: Optional[str] = None
    payment_method: str
    
    # 🔥 NEW: Authorization & capture tracking
    authorized_at: Optional[datetime] = None
    capture_deadline: Optional[datetime] = None
    captured_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    
    # Business metadata
    failure_reason: Optional[str] = None
    refund_reason: Optional[str] = None
    refund_amount: Optional[float] = None
    cancellation_reason: Optional[str] = None  # 🔥 NEW
    
    # 🔥 NEW: Authorization metadata
    authorization_code: Optional[str] = None
    risk_score: Optional[int] = None
    processor_response: Optional[str] = None
    
    # 🔥 NEW: Capture tracking
    capture_requested_by: Optional[int] = None
    capture_requested_at: Optional[datetime] = None
    
    # Platform fee tracking
    platform_fee: Optional[float] = None
    provider_payout: Optional[float] = None
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # 🔥 NEW: Computed properties for authorization flow
    @property
    def is_authorized(self) -> bool:
        """Check if payment is in authorized state"""
        return self.status == PaymentStatus.AUTHORIZED
    
    @property
    def is_capturable(self) -> bool:
        """Check if payment can be captured"""
        if not self.is_authorized:
            return False
        
        if self.capture_deadline:
            return datetime.now(timezone.utc) < self.capture_deadline
        
        return True
    
    @property
    def is_paid(self) -> bool:
        """Check if payment is completed/paid"""
        return self.status == PaymentStatus.PAID
    
    @property
    def is_cancelled(self) -> bool:
        """Check if authorization was cancelled"""
        return self.status == PaymentStatus.CANCELLED
    
    @property
    def is_refunded(self) -> bool:
        """Check if payment was refunded"""
        return self.status in [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED]
    
    @property
    def days_until_capture_deadline(self) -> int:
        """Get number of days until capture deadline"""
        if not self.capture_deadline:
            return 0
        
        delta = self.capture_deadline - datetime.now(timezone.utc)
        return max(0, delta.days)
    
    @property
    def formatted_amount(self) -> str:
        """Get formatted amount as currency string"""
        return f"${self.amount:.2f}"
    
    @property
    def payment_method_display(self) -> str:
        """Get user-friendly payment method display"""
        if self.payment_method_brand and self.payment_method_last4:
            brand = self.payment_method_brand.title()
            return f"{brand} ending in {self.payment_method_last4}"
        elif self.payment_method_type:
            return self.payment_method_type.replace("_", " ").title()
        else:
            return "Card"
    
    @property
    def status_display(self) -> str:
        """Get user-friendly status display"""
        status_mapping = {
            PaymentStatus.PENDING: "Payment Pending",
            PaymentStatus.AUTHORIZED: "Payment Authorized",
            PaymentStatus.PAID: "Payment Completed",
            PaymentStatus.FAILED: "Payment Failed",
            PaymentStatus.CANCELLED: "Payment Cancelled",
            PaymentStatus.REFUNDED: "Refunded",
            PaymentStatus.PARTIALLY_REFUNDED: "Partially Refunded"
        }
        return status_mapping.get(self.status, self.status.value.title())

    class Config:
        from_attributes = True


# Stripe Integration Schemas
class PaymentIntentCreate(BaseModel):
    """Schema for creating a Stripe Payment Intent"""
    booking_id: int
    amount: int = Field(..., description="Amount in cents", gt=0)
    currency: str = Field(default="usd", description="Currency code")
    capture_method: str = Field(default="manual", description="Use manual for authorization flow")

class PaymentIntentResponse(BaseModel):
    """Response schema for Payment Intent creation"""
    client_secret: str
    payment_intent_id: str

class PaymentConfirmRequest(BaseModel):
    """Schema for confirming a payment"""
    payment_intent_id: str

class StripeWebhookEvent(BaseModel):
    """Schema for Stripe webhook events"""
    id: str
    type: str
    data: Dict[str, Any]
    created: int
    livemode: bool

class StripePaymentMethodDetails(BaseModel):
    """Schema for payment method details from Stripe"""
    type: str
    brand: Optional[str] = None
    last4: Optional[str] = None
    exp_month: Optional[int] = None
    exp_year: Optional[int] = None

class StripeCustomerInfo(BaseModel):
    """Schema for customer information"""
    email: str
    name: str
    phone: Optional[str] = None
    address: Optional[Dict[str, str]] = None

class StripeMetadata(BaseModel):
    """Schema for Stripe metadata"""
    booking_id: str
    user_id: str
    property_id: str
    property_name: str
    package_name: str
    package_type: str
    guest_count: str
    check_in_date: str
    check_out_date: str
    customer_email: str
    platform: str = "huntstay"

# 🔥 NEW: Authorization & Capture specific schemas
class AuthorizationConfirmResponse(BaseModel):
    """Response for successful payment authorization"""
    message: str
    booking_id: int
    payment_id: int
    payment_status: str
    booking_status: str
    next_step: str

class CapturePaymentRequest(BaseModel):
    """Schema for capturing an authorized payment"""
    amount: Optional[int] = None  # Amount in cents, if different from authorized amount
    provider_notes: Optional[str] = None

class CapturePaymentResponse(BaseModel):
    """Response for successful payment capture"""
    message: str
    booking_id: int
    payment_id: int
    payment_status: str
    booking_status: str
    amount_captured: float

class CancelAuthorizationRequest(BaseModel):
    """Schema for cancelling a payment authorization"""
    cancellation_reason: str = Field(..., min_length=1, max_length=500)
    offer_alternative: Optional[bool] = False
    alternative_message: Optional[str] = None

class CancelAuthorizationResponse(BaseModel):
    """Response for cancelled authorization"""
    message: str
    booking_id: int
    payment_id: int
    payment_status: str
    booking_status: str
    reason: str

class RefundRequest(BaseModel):
    """Schema for processing refunds"""
    reason: str = "requested_by_customer"
    amount: Optional[float] = None  # If None, refund full amount

class RefundResponse(BaseModel):
    """Response schema for refund operations"""
    refund_id: str
    amount: float
    status: PaymentStatus
    message: str

# Payment summary schemas
class PaymentSummary(BaseModel):
    """Summary of payment for booking display with authorization info"""
    id: int
    booking_id: int
    amount: float
    status: PaymentStatus
    payment_method_type: Optional[PaymentMethodType] = None
    payment_method_brand: Optional[str] = None
    payment_method_last4: Optional[str] = None
    
    # 🔥 NEW: Authorization timing
    authorized_at: Optional[datetime] = None
    capture_deadline: Optional[datetime] = None
    captured_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    # 🔥 NEW: Quick status indicators
    @property
    def is_awaiting_capture(self) -> bool:
        """Check if authorization is awaiting capture"""
        return self.status == PaymentStatus.AUTHORIZED
    
    @property
    def payment_method_display(self) -> str:
        """Get user-friendly payment method display"""
        if self.payment_method_brand and self.payment_method_last4:
            brand = self.payment_method_brand.title()
            return f"{brand} ending in {self.payment_method_last4}"
        return "Card"
    
    @property
    def formatted_amount(self) -> str:
        """Get formatted amount"""
        return f"${self.amount:.2f}"
    
    class Config:
        from_attributes = True

# 🔥 NEW: Authorization status schema
class AuthorizationStatus(BaseModel):
    """Current authorization status for a payment"""
    payment_id: int
    booking_id: int
    status: PaymentStatus
    authorized_amount: Optional[float] = None
    authorized_at: Optional[datetime] = None
    capture_deadline: Optional[datetime] = None
    days_until_deadline: Optional[int] = None
    can_be_captured: bool
    can_be_cancelled: bool
    payment_method_display: Optional[str] = None

# 🔥 NEW: Provider payment dashboard schemas
class ProviderPaymentStats(BaseModel):
    """Payment statistics for provider dashboard"""
    total_payments: int
    authorized_payments: int
    captured_payments: int
    cancelled_payments: int
    
    # Revenue tracking
    total_authorized_amount: float
    total_captured_amount: float
    pending_capture_amount: float
    
    # This month stats
    this_month_captured: float
    this_month_authorized: float
    
    # Payment method breakdown
    payment_method_breakdown: Dict[PaymentMethodType, int] = {
        PaymentMethodType.CARD: 0,
        PaymentMethodType.APPLE_PAY: 0,
        PaymentMethodType.GOOGLE_PAY: 0,
        PaymentMethodType.OTHER: 0
    }

class AuthorizationAlert(BaseModel):
    """Alert for authorizations requiring attention"""
    payment_id: int
    booking_id: int
    guest_name: str
    property_name: str
    authorized_amount: float
    authorized_at: datetime
    expires_in_hours: int
    urgency_level: str  # "low", "medium", "high", "urgent"

# 🔥 NEW: Batch operations for providers
class BatchPaymentAction(BaseModel):
    """Schema for batch payment operations"""
    payment_ids: List[int] = Field(..., min_items=1, max_items=50)
    action: str = Field(..., pattern="^(capture|cancel)$")
    reason: Optional[str] = None

class BatchPaymentResult(BaseModel):
    """Result of batch payment operations"""
    successful: List[int]
    failed: List[Dict[str, Any]]
    total_processed: int
    total_amount_affected: float


# 🔥 NEW: Risk assessment schema
class PaymentRiskAssessment(BaseModel):
    """Payment risk assessment from Stripe"""
    payment_id: int
    risk_score: Optional[int] = None  # 0-100, higher = riskier
    risk_level: str = "normal"  # "normal", "elevated", "high"
    outcome: str = "authorized"  # "authorized", "manual_review", "declined"
    reason: Optional[str] = None
    recommendations: List[str] = []

# Health check schema
class PaymentHealthStatus(BaseModel):
    """Payment system health status"""
    status: str  # "healthy", "degraded", "unhealthy"
    stripe_connected: bool
    webhook_status: str
    recent_failures: int
    last_successful_payment: Optional[datetime] = None
    timestamp: datetime