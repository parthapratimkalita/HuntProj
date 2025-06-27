from typing import Optional
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.supabase import supabase
from app.db.session import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fixed OAuth2PasswordBearer configuration for Supabase tokens
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)

async def get_supabase_user(token: str = Depends(oauth2_scheme)):
    """
    Get Supabase user info from token without requiring database user to exist
    """
    print(f"SUPABASE AUTH DEBUG: Received token: {token[:20] if token else 'None'}...")
    
    if not token:
        print("SUPABASE AUTH DEBUG: No token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        print("SUPABASE AUTH DEBUG: Verifying token with Supabase...")
        
        # Verify token with Supabase (this is the ONLY JWT verification you need)
        user_response = supabase.auth.get_user(token)
        
        print(f"SUPABASE AUTH DEBUG: Supabase response: {user_response}")
        
        if not user_response or not user_response.user:
            print("SUPABASE AUTH DEBUG: Invalid token or no user in response")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        print(f"SUPABASE AUTH DEBUG: Successfully validated user: {user_response.user.email}")
        return user_response.user
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"SUPABASE AUTH DEBUG: Unexpected error: {e}")
        print(f"SUPABASE AUTH DEBUG: Error type: {type(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Get current user from token - requires user to exist in database
    """
    print("🚀 USING CORRECT get_current_user FROM app.core.security 🚀")
    print(f"GET_CURRENT_USER DEBUG: Received token: {token[:20] if token else 'None'}...")
    
    if not token:
        print("GET_CURRENT_USER DEBUG: No token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Only use Supabase for token verification
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            print("GET_CURRENT_USER DEBUG: Invalid token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        supabase_user = user_response.user
        print(f"GET_CURRENT_USER DEBUG: Supabase user validated: {supabase_user.email}")
        
        # IMPORTANT: Find by EMAIL, not by sub claim or ID
        print(f"GET_CURRENT_USER DEBUG: Looking for user by EMAIL: {supabase_user.email}")
        db_user = db.query(User).filter(User.email == supabase_user.email).first()
        
        if not db_user:
            print(f"GET_CURRENT_USER DEBUG: User {supabase_user.email} not found in database")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in database. Please complete profile setup."
            )
        
        if not db_user.is_active:
            print(f"GET_CURRENT_USER DEBUG: User {supabase_user.email} is inactive")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        print(f"GET_CURRENT_USER DEBUG: Successfully retrieved user from database: {db_user.email}")
        return db_user
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"GET_CURRENT_USER DEBUG: Unexpected error: {e}")
        print(f"GET_CURRENT_USER DEBUG: Error details: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_optional(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> Optional[User]:
    """
    Get current user from token - returns None if user doesn't exist in database
    """
    if not token:
        return None
        
    try:
        # Only use Supabase for token verification
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return None
        
        supabase_user = user_response.user
        
        # Get user from database - return None if not found
        db_user = db.query(User).filter(User.email == supabase_user.email).first()
        return db_user
        
    except Exception as e:
        print(f"get_current_user_optional error: {e}")
        return None