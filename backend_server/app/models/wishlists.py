from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Wishlist(Base):
    __tablename__ = "wishlists"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Unique constraint to prevent duplicate wishlists
    __table_args__ = (
        UniqueConstraint('user_id', 'property_id', name='unique_user_property_wishlist'),
    )
    
    # Relationships
    user = relationship("User", back_populates="wishlists")
    property = relationship("Property", back_populates="wishlists")