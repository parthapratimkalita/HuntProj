from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    role = Column(String, default="user")  # "user", "provider", "admin"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Profile fields
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    
    # Host application status
    host_application_status = Column(String, nullable=True)  # "pending", "approved", "rejected"

    # Relationships
    properties = relationship("Property", back_populates="provider", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    wishlists = relationship("Wishlist", back_populates="user", cascade="all, delete-orphan")
    host_applications = relationship("HostApplication", back_populates="user")