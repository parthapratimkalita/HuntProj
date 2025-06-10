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
    Get current user profile
    """
    print(f"USER ME DEBUG: Returning user: {current_user.email}, ID: {current_user.id}")
    print(f"USER ME DEBUG: User fields: username={current_user.username}, full_name={getattr(current_user, 'full_name', 'NOT_FOUND')}")
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
        else:
            setattr(current_user, field, value)
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

# Add PATCH endpoint for frontend compatibility
@router.patch("/me", response_model=UserSchema)
def patch_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update current user profile (PATCH version)
    """
    return update_user_me(db=db, user_in=user_in, current_user=current_user)

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

@router.post("/apply-host", response_model=HostApplicationSchema)
async def apply_for_host(
    application_in: HostApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    User applies to become a host/owner with enhanced fields including bio and documents.
    """
    print("=" * 50)
    print("APPLY HOST DEBUG: ENDPOINT CALLED")
    print(f"APPLY HOST DEBUG: User: {current_user.email}")
    print(f"APPLY HOST DEBUG: Phone: {application_in.phone}")
    print(f"APPLY HOST DEBUG: Address: {application_in.address}")
    print(f"APPLY HOST DEBUG: Bio: {application_in.bio}")
    print(f"APPLY HOST DEBUG: Document URLs: {application_in.document_urls}")
    
    # Check if user already has ANY application (not just pending)
    existing = db.query(HostApplication).filter(
        HostApplication.user_id == current_user.id
    ).first()
    
    if existing:
        print(f"APPLY HOST DEBUG: User already has application with status: {existing.status}")
        if existing.status == ApplicationStatus.PENDING:
            raise HTTPException(status_code=400, detail="You already have a pending application.")
        elif existing.status == ApplicationStatus.APPROVED:
            raise HTTPException(status_code=400, detail="You already have an approved application.")
        else:  # REJECTED
            raise HTTPException(status_code=400, detail="You have a previous application. Please contact support to reapply.")
    
    try:
        application = HostApplication(
            user_id=current_user.id,
            phone=application_in.phone,
            address=application_in.address,
            bio=application_in.bio,  # Required field
            # Store document URLs as JSON string (required)
            verification_documents=json.dumps(application_in.document_urls)
        )
        
        db.add(application)
        db.commit()
        db.refresh(application)
        
        print("APPLY HOST DEBUG: Application created successfully")
        print(f"APPLY HOST DEBUG: Application ID: {application.id}")
        print("=" * 50)
        
        return application
        
    except Exception as e:
        print(f"APPLY HOST DEBUG: Error creating application: {e}")
        print(f"APPLY HOST DEBUG: Exception type: {type(e)}")
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
    application.status = review.status
    application.reviewed_at = func.now()
    application.admin_comment = review.admin_comment
    db.commit()
    db.refresh(application)
    # Promote user to owner if approved
    if review.status == ApplicationStatus.APPROVED:
        user = db.query(User).filter(User.id == application.user_id).first()
        if user:
            user.role = "owner"
            db.commit()
    return application

@router.get("/application-status")  # Remove response_model temporarily to debug
def get_application_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get the current user's host application status
    """
    print("=" * 50)
    print("APPLICATION STATUS DEBUG: ENDPOINT CALLED")
    print(f"APPLICATION STATUS DEBUG: User: {current_user.email}")
    
    try:
        # Find the user's most recent application
        application = db.query(HostApplication).filter(
            HostApplication.user_id == current_user.id
        ).order_by(HostApplication.created_at.desc()).first()
        
        if not application:
            print("APPLICATION STATUS DEBUG: No application found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No application found for this user"
            )
        
        print(f"APPLICATION STATUS DEBUG: Found application ID {application.id}")
        print(f"APPLICATION STATUS DEBUG: Raw application object: {application}")
        
        # Check each field individually
        print(f"APPLICATION STATUS DEBUG: id = {application.id} (type: {type(application.id)})")
        print(f"APPLICATION STATUS DEBUG: user_id = {application.user_id} (type: {type(application.user_id)})")
        print(f"APPLICATION STATUS DEBUG: phone = '{application.phone}' (type: {type(application.phone)})")
        print(f"APPLICATION STATUS DEBUG: address = '{application.address}' (type: {type(application.address)})")
        print(f"APPLICATION STATUS DEBUG: bio = '{application.bio}' (type: {type(application.bio)})")
        print(f"APPLICATION STATUS DEBUG: status = {application.status} (type: {type(application.status)})")
        print(f"APPLICATION STATUS DEBUG: created_at = {application.created_at} (type: {type(application.created_at)})")
        print(f"APPLICATION STATUS DEBUG: reviewed_at = {application.reviewed_at} (type: {type(application.reviewed_at)})")
        print(f"APPLICATION STATUS DEBUG: admin_comment = {application.admin_comment} (type: {type(application.admin_comment)})")
        print(f"APPLICATION STATUS DEBUG: verification_documents = '{application.verification_documents}' (type: {type(application.verification_documents)})")
        
        # Try to create the Pydantic model manually to see what fails
        try:
            from app.schemas.host_application import HostApplication as HostApplicationSchema
            print("APPLICATION STATUS DEBUG: Attempting to create Pydantic model...")
            
            pydantic_data = {
                "id": application.id,
                "user_id": application.user_id,
                "phone": application.phone,
                "address": application.address,
                "bio": application.bio,
                "status": application.status.value if hasattr(application.status, 'value') else str(application.status),
                "created_at": application.created_at,
                "reviewed_at": application.reviewed_at,
                "admin_comment": application.admin_comment,
                "verification_documents": application.verification_documents
            }
            
            print(f"APPLICATION STATUS DEBUG: Pydantic data: {pydantic_data}")
            
            # Try to create the Pydantic object
            pydantic_obj = HostApplicationSchema(**pydantic_data)
            print(f"APPLICATION STATUS DEBUG: Pydantic object created successfully: {pydantic_obj}")
            
            return pydantic_obj
            
        except Exception as pydantic_error:
            print(f"APPLICATION STATUS DEBUG: Pydantic creation failed: {pydantic_error}")
            print(f"APPLICATION STATUS DEBUG: Pydantic error type: {type(pydantic_error)}")
            
            # Return raw dict as fallback
            result = {
                "id": application.id,
                "user_id": application.user_id,
                "phone": application.phone,
                "address": application.address,
                "bio": application.bio,
                "status": application.status.value if hasattr(application.status, 'value') else str(application.status),
                "created_at": application.created_at.isoformat() if application.created_at else None,
                "reviewed_at": application.reviewed_at.isoformat() if application.reviewed_at else None,
                "admin_comment": application.admin_comment,
                "verification_documents": application.verification_documents
            }
            
            print(f"APPLICATION STATUS DEBUG: Returning raw dict: {result}")
            print("=" * 50)
            return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"APPLICATION STATUS DEBUG: Unexpected error: {e}")
        print(f"APPLICATION STATUS DEBUG: Exception type: {type(e)}")
        import traceback
        print(f"APPLICATION STATUS DEBUG: Traceback: {traceback.format_exc()}")
        print("=" * 50)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

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
    print("SYNC PROFILE DEBUG: supabase_user:", supabase_user)
    print("SYNC PROFILE DEBUG: supabase_user.email:", supabase_user.email)
    print("SYNC PROFILE DEBUG: supabase_user.id:", supabase_user.id)
    
    try:
        data = await request.json()
        print("SYNC PROFILE DEBUG: Request data:", data)
    except Exception as e:
        print("SYNC PROFILE DEBUG: Error reading request data:", e)
        raise HTTPException(status_code=400, detail="Invalid JSON data")
    
    # Check if user exists by email from Supabase user
    print("SYNC PROFILE DEBUG: Checking if user exists in database...")
    existing_user = db.query(User).filter(User.email == supabase_user.email).first()
    print("SYNC PROFILE DEBUG: Existing user found:", existing_user)
    
    if existing_user:
        print("SYNC PROFILE DEBUG: User already exists, returning existing user")
        return existing_user  # Return the actual user object
    
    # Create new user profile
    username = data.get("username")
    full_name = data.get("full_name")
    
    print(f"SYNC PROFILE DEBUG: Username from request: {username}")
    print(f"SYNC PROFILE DEBUG: Full name from request: {full_name}")
    
    if not username or not full_name:
        print("SYNC PROFILE DEBUG: Missing username or full_name")
        raise HTTPException(status_code=400, detail="Username and full name are required")
    
    # Check if username is already taken
    print("SYNC PROFILE DEBUG: Checking if username is taken...")
    existing_username = db.query(User).filter(User.username == username).first()
    original_username = username
    
    if existing_username:
        print(f"SYNC PROFILE DEBUG: Username {username} is taken, generating unique username...")
        base_username = username
        counter = 1
        while existing_username:
            username = f"{base_username}{counter}"
            existing_username = db.query(User).filter(User.username == username).first()
            counter += 1
        print(f"SYNC PROFILE DEBUG: New unique username: {username}")
    
    print(f"SYNC PROFILE DEBUG: Creating user with:")
    print(f"  - Email: {supabase_user.email}")
    print(f"  - Username: {username}")
    print(f"  - Full name: {full_name}")
    
    try:
        user = User(
            email=supabase_user.email,
            username=username,
            full_name=full_name,
            is_active=True,
            is_verified=True,
            role="user"
        )
        print("SYNC PROFILE DEBUG: User object created")
        
        db.add(user)
        print("SYNC PROFILE DEBUG: User added to session")
        
        db.commit()
        print("SYNC PROFILE DEBUG: Database commit executed")
        
        db.refresh(user)
        print(f"SYNC PROFILE DEBUG: User refreshed, ID: {user.id}")
        
        # Double-check that user was actually saved
        saved_user = db.query(User).filter(User.email == supabase_user.email).first()
        print(f"SYNC PROFILE DEBUG: User verification query result: {saved_user}")
        print(f"SYNC PROFILE DEBUG: Saved user ID: {saved_user.id if saved_user else 'None'}")
        
        print("SYNC PROFILE DEBUG: SUCCESS - User created successfully")
        print("=" * 50)
        return user  # Return the actual user object instead of message
        
    except Exception as e:
        print(f"SYNC PROFILE DEBUG: ERROR creating user: {e}")
        print(f"SYNC PROFILE DEBUG: Exception type: {type(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")
    
    