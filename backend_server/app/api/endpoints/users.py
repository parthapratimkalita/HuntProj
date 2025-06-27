from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Any, List, Optional
from app.core.security import get_current_user, get_password_hash, get_supabase_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import User as UserSchema, UserUpdate
from app.models.host_application import HostApplication, ApplicationStatus
from app.schemas.host_application import HostApplication as HostApplicationSchema, HostApplicationCreate, HostApplicationReview
from sqlalchemy.sql import func
import json

router = APIRouter()

@router.get("/me", response_model=UserSchema)
def read_user_me(
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get current user profile WITH host application status included!
    NO MORE ADDITIONAL API CALLS NEEDED! 🚀
    """
    print(f"USER ME DEBUG: Returning user with host status: {current_user.host_application_status}")
    return current_user

@router.put("/me", response_model=UserSchema)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update current user profile
    """
    print(f"UPDATE USER DEBUG: Received data: {user_in.dict(exclude_unset=True)}")
    
    if user_in.email and user_in.email != current_user.email:
        user = db.query(User).filter(User.email == user_in.email).first()
        if user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    if user_in.username and user_in.username != current_user.username:
        user = db.query(User).filter(User.username == user_in.username).first()
        if user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Update user fields
    update_data = user_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password" and value:
            value = get_password_hash(value)
        # Handle camelCase to snake_case conversion if needed
        if field == "fullName":
            setattr(current_user, "full_name", value)
        elif field == "zipCode":
            setattr(current_user, "zip_code", value)
        elif field == "avatarUrl":
            setattr(current_user, "avatar_url", value)
        else:
            setattr(current_user, field, value)
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    print(f"UPDATE USER DEBUG: User updated successfully. Avatar URL: {current_user.avatar_url}")
    return current_user

@router.patch("/me", response_model=UserSchema)
def patch_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update current user profile (PATCH version) - Handles avatar_url updates
    """
    print(f"PATCH USER DEBUG: Received data: {user_in.dict(exclude_unset=True)}")
    
    # Check for email conflicts only if email is being updated
    if user_in.email and user_in.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_in.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Check for username conflicts only if username is being updated
    if user_in.username and user_in.username != current_user.username:
        existing_user = db.query(User).filter(User.username == user_in.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Update user fields - handle both camelCase and snake_case
    update_data = user_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password" and value:
            # Hash password if provided
            value = get_password_hash(value)
            setattr(current_user, field, value)
        elif field == "fullName":
            # Handle camelCase from frontend
            setattr(current_user, "full_name", value)
        elif field == "zipCode":
            # Handle camelCase from frontend
            setattr(current_user, "zip_code", value)
        elif field == "avatarUrl":
            # Handle camelCase from frontend
            setattr(current_user, "avatar_url", value)
            print(f"PATCH USER DEBUG: Setting avatar_url to: {value}")
        elif field in ["full_name", "zip_code", "avatar_url"]:
            # Handle snake_case directly
            setattr(current_user, field, value)
            if field == "avatar_url":
                print(f"PATCH USER DEBUG: Setting avatar_url (snake_case) to: {value}")
        else:
            # Handle other fields directly
            setattr(current_user, field, value)
    
    # Special handling for avatar_url removal (when set to null/None)
    if "avatar_url" in update_data and update_data["avatar_url"] is None:
        current_user.avatar_url = None
        print(f"PATCH USER DEBUG: Avatar URL removed (set to None)")
    elif "avatarUrl" in update_data and update_data["avatarUrl"] is None:
        current_user.avatar_url = None
        print(f"PATCH USER DEBUG: Avatar URL removed via camelCase (set to None)")
    
    # Update the updated_at timestamp
    current_user.updated_at = func.now()
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    print(f"PATCH USER DEBUG: User updated successfully. Final avatar_url: {current_user.avatar_url}")
    return current_user

@router.post("/apply-host", response_model=HostApplicationSchema)
async def apply_for_host(
    application_in: HostApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    User applies to become a host/owner with enhanced fields including bio and documents.
    NOW OPTIMIZED: Uses host_application_status from user table for instant checks!
    """
    print("=" * 50)
    print("APPLY HOST DEBUG: OPTIMIZED VERSION")
    print(f"APPLY HOST DEBUG: User: {current_user.email}")
    print(f"APPLY HOST DEBUG: Current host status: {current_user.host_application_status}")
    
    # FAST CHECK: Use the new column instead of querying host_applications table
    if current_user.host_application_status:
        print(f"APPLY HOST DEBUG: User already has status: {current_user.host_application_status}")
        if current_user.host_application_status == "pending":
            raise HTTPException(status_code=400, detail="You already have a pending application.")
        elif current_user.host_application_status == "approved":
            raise HTTPException(status_code=400, detail="You already have an approved application.")
        else:  # REJECTED
            raise HTTPException(status_code=400, detail="You have a previous application. Please contact support to reapply.")
    
    try:
        application = HostApplication(
            user_id=current_user.id,
            phone=application_in.phone,
            address=application_in.address,
            bio=application_in.bio,
            status=ApplicationStatus.PENDING,
            verification_documents=json.dumps(application_in.document_urls)
        )
        
        db.add(application)
        db.commit()
        db.refresh(application)
        
        # UPDATE USER TABLE: Set the status and ID
        current_user.host_application_status = "pending"
        db.commit()
        db.refresh(current_user)
        
        print(f"APPLY HOST DEBUG: Application created and user updated - Status: {current_user.host_application_status}")
        print("=" * 50)
        
        return application
        
    except Exception as e:
        print(f"APPLY HOST DEBUG: Error creating application: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create application: {str(e)}")

@router.get("/host-applications", response_model=List[HostApplicationSchema])
async def list_host_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Admin: List all host applications.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return db.query(HostApplication).all()

@router.post("/host-applications/{application_id}/review", response_model=HostApplicationSchema)
async def review_host_application(
    application_id: int,
    review: HostApplicationReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Admin: Approve or reject a host application.
    NOW OPTIMIZED: Updates user table automatically!
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    application = db.query(HostApplication).filter(HostApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != ApplicationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Application already reviewed")
    if review.status not in [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Update application
    application.status = review.status
    application.reviewed_at = func.now()
    application.admin_comment = review.admin_comment
    
    # UPDATE USER TABLE: Set the new status
    user = db.query(User).filter(User.id == application.user_id).first()
    if user:
        user.host_application_status = review.status.value  # Convert enum to string
        if review.status == ApplicationStatus.APPROVED:
            user.role = "provider"  # Promote to provider
        
    db.commit()
    db.refresh(application)
    
    print(f"REVIEW DEBUG: Updated user {user.email} status to {user.host_application_status}")
    
    return application

# REMOVED: application-status endpoint - NO LONGER NEEDED! 🎉
# The status is now available directly in the /me endpoint

@router.post("/sync-profile", response_model=UserSchema)
async def sync_profile(
    request: Request,
    db: Session = Depends(get_db),
    supabase_user = Depends(get_supabase_user),
) -> Any:
    """
    Ensure a user profile exists for the authenticated Supabase user. If not, create it.
    """
    print("=" * 50)
    print("SYNC PROFILE DEBUG: ENDPOINT CALLED")
    print("SYNC PROFILE DEBUG: supabase_user:", supabase_user.email)
    
    try:
        data = await request.json()
        print("SYNC PROFILE DEBUG: Request data:", data)
    except Exception as e:
        print("SYNC PROFILE DEBUG: Error reading request data:", e)
        raise HTTPException(status_code=400, detail="Invalid JSON data")
    
    # Check if user exists by email from Supabase user
    existing_user = db.query(User).filter(User.email == supabase_user.email).first()
    
    if existing_user:
        return existing_user
    
    # Create new user profile
    username = data.get("username")
    full_name = data.get("full_name")
    
    if not username or not full_name:
        raise HTTPException(status_code=400, detail="Username and full name are required")
    
    # Check if username is already taken
    existing_username = db.query(User).filter(User.username == username).first()
    
    if existing_username:
        base_username = username
        counter = 1
        while existing_username:
            username = f"{base_username}{counter}"
            existing_username = db.query(User).filter(User.username == username).first()
            counter += 1
    
    try:
        user = User(
            email=supabase_user.email,
            username=username,
            full_name=full_name,
            is_active=True,
            is_verified=True,
            role="user",
            # Host application status defaults to NULL (no application yet)
            host_application_status=None,
            # Initialize other profile fields as None
            phone=None,
            address=None,
            city=None,
            state=None,
            zip_code=None,
            country=None,
            bio=None,
            avatar_url=None,  # Initialize avatar URL as None
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print("SYNC PROFILE DEBUG: SUCCESS - User created")
        print("=" * 50)
        return user
        
    except Exception as e:
        print(f"SYNC PROFILE DEBUG: ERROR creating user: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

# Standard user CRUD operations remain the same...

@router.get("/", response_model=List[UserSchema])
def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve users
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserSchema)
def read_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get a specific user by id
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if user == current_user:
        return user
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete a user
    """
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}