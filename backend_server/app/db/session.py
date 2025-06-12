from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
from typing import Generator

# Get database URL from settings
SQLALCHEMY_DATABASE_URL = settings.get_database_uri()

# Create SQLAlchemy engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # Connection pool settings for better performance
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=300,    # Recycle connections every 5 minutes
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

def get_db() -> Generator:
    """
    Database dependency that provides a database session
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        # Log the error for debugging
        print(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Alternative async version for future use
async def get_async_db():
    """
    Async database dependency (for future use with async SQLAlchemy)
    """
    # This would be implemented when upgrading to async SQLAlchemy
    pass