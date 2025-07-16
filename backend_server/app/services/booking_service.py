from sqlalchemy.orm import Session
from app.models.booking import Booking
from app.models.enums import BookingStatus, PaymentStatus
from app.models.property import Property
from app.schemas.booking import BookingCreate
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
import json

class BookingService:
    """Service for managing bookings with business logic"""
    
    @staticmethod
    def create_property_snapshot(property_obj: Property) -> Dict[str, Any]:
        """
        Create a snapshot of property details at booking time
        This ensures booking details remain consistent even if property changes
        """
        return {
            "property_name": property_obj.property_name,
            "property_address": property_obj.address,
            "property_city": property_obj.city,
            "property_state": property_obj.state,
            "property_zip": property_obj.zip_code,
            "property_coordinates": {
                "latitude": float(property_obj.latitude),
                "longitude": float(property_obj.longitude)
            },
            "total_acres": property_obj.total_acres,
            "provider_info": {
                "provider_id": property_obj.provider_id,
                "provider_name": property_obj.provider.full_name if property_obj.provider else None,
                "provider_phone": property_obj.provider.phone if property_obj.provider else None,
                "provider_email": property_obj.provider.email if property_obj.provider else None
            },
            "property_details": {
                "rules": property_obj.rules,
                "safety_info": property_obj.safety_info,
                "license_requirements": property_obj.license_requirements,
                "season_info": property_obj.season_info,
                "facilities": property_obj.facilities or []
            },
            "snapshot_created_at": datetime.now(timezone.utc).isoformat()
        }
    
    @staticmethod
    def validate_hunting_package(
        property_obj: Property, 
        package_id: str, 
        package_name: str
    ) -> Optional[Dict[str, Any]]:
        """
        Validate and return hunting package details
        """
        if not property_obj.hunting_packages:
            return None
        
        for package in property_obj.hunting_packages:
            if (package.get("id") == package_id or 
                package.get("name") == package_name):
                return package
        
        return None
    
    @staticmethod
    def calculate_pricing(
        package_price: float,
        guest_count: int,
        service_fee_rate: float = 0.10,
        tax_rate: float = 0.0
    ) -> Dict[str, float]:
        """
        Calculate booking pricing breakdown
        """
        service_fee = round(package_price * service_fee_rate, 2)
        taxes = round(package_price * tax_rate, 2)
        total_price = package_price + service_fee + taxes
        
        return {
            "package_price": package_price,
            "service_fee": service_fee,
            "taxes": taxes,
            "total_price": total_price
        }
    
    @staticmethod
    def check_availability(
        db: Session,
        property_id: int,
        check_in_date: datetime,
        check_out_date: datetime,
        exclude_booking_id: Optional[int] = None
    ) -> bool:
        """
        Check if property is available for given dates
        """
        query = db.query(Booking).filter(
            Booking.property_id == property_id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
            (
                (Booking.check_in_date <= check_in_date) & 
                (Booking.check_out_date > check_in_date)
            ) | (
                (Booking.check_in_date < check_out_date) & 
                (Booking.check_out_date >= check_out_date)
            ) | (
                (Booking.check_in_date >= check_in_date) &
                (Booking.check_out_date <= check_out_date)
            )
        )
        
        if exclude_booking_id:
            query = query.filter(Booking.id != exclude_booking_id)
        
        return query.first() is None
    
    @staticmethod
    def create_booking(
        db: Session,
        booking_data: BookingCreate,
        user_id: int,
        property_obj: Property
    ) -> Booking:
        """
        Create a new booking with full validation and data population
        """
        # Validate hunting package
        hunting_package = BookingService.validate_hunting_package(
            property_obj, 
            booking_data.hunting_package_id,
            booking_data.hunting_package_name
        )
        
        if not hunting_package:
            raise ValueError("Selected hunting package not found")
        
        # Validate guest count
        max_hunters = hunting_package.get("max_hunters", 1)
        if booking_data.guest_count > max_hunters:
            raise ValueError(f"Guest count exceeds maximum allowed ({max_hunters})")
        
        # Validate pricing
        expected_pricing = BookingService.calculate_pricing(
            hunting_package.get("price", 0),
            booking_data.guest_count
        )
        
        if abs(booking_data.total_price - expected_pricing["total_price"]) > 0.01:
            raise ValueError("Pricing mismatch detected")
        
        # Check availability
        if not BookingService.check_availability(
            db, 
            booking_data.property_id,
            booking_data.check_in_date,
            booking_data.check_out_date
        ):
            raise ValueError("Property is not available for selected dates")
        
        # Create property snapshot
        property_snapshot = BookingService.create_property_snapshot(property_obj)
        
        # Determine accommodation details
        accommodation_included = hunting_package.get("accommodation_status") == "included"
        accommodation_type = None
        accommodation_name = None
        
        if accommodation_included and property_obj.accommodations:
            # Use default accommodation if included
            default_acc = property_obj.accommodations[0] if property_obj.accommodations else None
            if default_acc:
                accommodation_type = default_acc.get("type")
                accommodation_name = default_acc.get("name")
        
        # Create booking
        booking = Booking(
            property_id=booking_data.property_id,
            user_id=user_id,
            check_in_date=booking_data.check_in_date,
            check_out_date=booking_data.check_out_date,
            guest_count=booking_data.guest_count,
            lead_hunter_name=booking_data.lead_hunter_name,
            lead_hunter_phone=booking_data.lead_hunter_phone,
            lead_hunter_email=booking_data.lead_hunter_email,
            
            # Hunting package details
            hunting_package_id=booking_data.hunting_package_id,
            hunting_package_name=hunting_package.get("name"),
            hunting_package_type=hunting_package.get("hunting_type", "general"),
            hunting_package_duration=hunting_package.get("duration", 1),
            
            # Pricing
            package_price=expected_pricing["package_price"],
            service_fee=expected_pricing["service_fee"],
            taxes=expected_pricing["taxes"],
            total_price=expected_pricing["total_price"],
            
            # Accommodation
            accommodation_included=accommodation_included,
            accommodation_type=accommodation_type,
            accommodation_name=accommodation_name,
            
            # Additional details
            special_requests=booking_data.special_requests,
            property_snapshot=property_snapshot,
            booking_source="web",
            referral_code=booking_data.referral_code,
            booking_deadline=booking_data.check_in_date - timedelta(days=7),
            
            # Status
            status=BookingStatus.PENDING,
            payment_status=PaymentStatus.PENDING
        )
        
        return booking
    
    @staticmethod
    def confirm_booking(db: Session, booking_id: int) -> Booking:
        """Mark booking as confirmed (called after successful payment)"""
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")
        
        booking.status = BookingStatus.CONFIRMED
        booking.payment_status = PaymentStatus.PAID
        booking.confirmed_at = datetime.now(timezone.utc)
        booking.updated_at = datetime.now(timezone.utc)
        
        return booking
    
    @staticmethod
    def cancel_booking(
        db: Session, 
        booking_id: int, 
        reason: str = None,
        refund_payment: bool = False
    ) -> Booking:
        """Cancel a booking with optional refund"""
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")
        
        if booking.status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
            raise ValueError("Booking cannot be cancelled")
        
        booking.status = BookingStatus.CANCELLED
        booking.cancellation_reason = reason
        booking.cancelled_at = datetime.now(timezone.utc)
        booking.updated_at = datetime.now(timezone.utc)
        
        if refund_payment and booking.payment_status == PaymentStatus.PAID:
            booking.payment_status = PaymentStatus.PENDING  # Will be updated when refund is processed
        
        return booking
    
    @staticmethod
    def complete_booking(db: Session, booking_id: int) -> Booking:
        """Mark booking as completed (after hunt is finished)"""
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError("Booking not found")
        
        if booking.status != BookingStatus.CONFIRMED:
            raise ValueError("Only confirmed bookings can be completed")
        
        booking.status = BookingStatus.COMPLETED
        booking.completed_at = datetime.now(timezone.utc)
        booking.updated_at = datetime.now(timezone.utc)
        
        return booking
    
    @staticmethod
    def get_booking_statistics(db: Session, user_id: int = None, property_id: int = None) -> Dict[str, Any]:
        """Get booking statistics for user or property"""
        query = db.query(Booking)
        
        if user_id:
            query = query.filter(Booking.user_id == user_id)
        
        if property_id:
            query = query.filter(Booking.property_id == property_id)
        
        bookings = query.all()
        
        stats = {
            "total_bookings": len(bookings),
            "pending": len([b for b in bookings if b.status == BookingStatus.PENDING]),
            "confirmed": len([b for b in bookings if b.status == BookingStatus.CONFIRMED]),
            "completed": len([b for b in bookings if b.status == BookingStatus.COMPLETED]),
            "cancelled": len([b for b in bookings if b.status == BookingStatus.CANCELLED]),
            "total_revenue": sum([b.total_price for b in bookings if b.payment_status == PaymentStatus.PAID]),
            "average_booking_value": 0
        }
        
        if stats["total_bookings"] > 0:
            stats["average_booking_value"] = stats["total_revenue"] / len([b for b in bookings if b.payment_status == PaymentStatus.PAID])
        
        return stats