from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum

class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class HostApplication(Base):
    __tablename__ = "host_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    phone = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    bio = Column(Text, nullable=True)  # ADD THIS LINE
    verification_documents = Column(Text, nullable=True)  # ADD THIS LINE
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    admin_comment = Column(Text, nullable=True)
    
    user = relationship("User")