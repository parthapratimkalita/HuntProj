from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.db.session import Base
import enum

class PropertyStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Property(Base):
    __tablename__ = "properties"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Basic Information (Phase 1 - Required)
    property_name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    
    # Location (Phase 1 - Required)
    address = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    zip_code = Column(String, nullable=False)
    country = Column(String, nullable=False, default='United States')
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Property Details (Phase 1 - Required)
    total_acres = Column(Integer, nullable=False)
    primary_terrain = Column(String, nullable=True)
    
    # Complex Fields (JSONB)
    acreage_breakdown = Column(JSONB, nullable=True, default=list)
    wildlife_info = Column(JSONB, nullable=True, default=list)
    
    # Phase 2 Fields (Required for completion)
    hunting_packages = Column(JSONB, nullable=True, default=list)
    accommodations = Column(JSONB, nullable=True, default=list)
    facilities = Column(JSONB, nullable=True, default=list)
    
    # Additional Information
    rules = Column(Text, nullable=True)
    safety_info = Column(Text, nullable=True)
    license_requirements = Column(Text, nullable=True)
    season_info = Column(Text, nullable=True)
    
    # Images
    property_images = Column(JSONB, nullable=True, default=list)
    profile_image_index = Column(Integer, default=0)
    
    # Status & Control
    status = Column(Enum(PropertyStatus), default=PropertyStatus.DRAFT)
    admin_feedback = Column(Text, nullable=True)
    is_listed = Column(Boolean, default=False)
    
    # Draft Tracking
    draft_completed_phase = Column(Integer, nullable=True)  # 1 or 2
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships - using string references to avoid circular imports
    provider = relationship("User", back_populates="properties")
    bookings = relationship("Booking", back_populates="property", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="property", cascade="all, delete-orphan")
    wishlists = relationship("Wishlist", back_populates="property", cascade="all, delete-orphan")