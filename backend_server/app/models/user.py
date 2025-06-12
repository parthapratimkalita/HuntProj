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
    
    # SIMPLE: Only the status column (no foreign key!)
    host_application_status = Column(String, nullable=True)  # "pending", "approved", "rejected"

    # CLEAN RELATIONSHIPS: No circular dependencies
    properties = relationship("Property", back_populates="owner")
    bookings = relationship("Booking", back_populates="user")
    host_applications = relationship("HostApplication", back_populates="user")
    
    # Helper method to get current application details if needed (rare)
    def get_current_application(self, db_session):
        """
        Get the most recent application for this user
        Only use this when you actually need application details
        """
        return db_session.query(HostApplication)\
            .filter(HostApplication.user_id == self.id)\
            .order_by(HostApplication.created_at.desc())\
            .first()