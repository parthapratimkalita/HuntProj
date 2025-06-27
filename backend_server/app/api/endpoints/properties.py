from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List, Optional
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.property import Property, PropertyStatus
from app.models.booking import Booking
from app.models.review import Review
from app.schemas.property import (
    Property as PropertySchema,
    PropertySimple,
    PropertyCreate,
    PropertyUpdate,
    PropertySearch,
    PropertyDraftCreate,
)
from app.schemas.review import Review as ReviewSchema, ReviewCreate
from app.core.supabase import supabase
import json

router = APIRouter()

def validate_provider_permissions(current_user: User):
    """
    Helper function to validate provider permissions with detailed error messages
    """
    print(f"VALIDATION DEBUG: Checking user permissions")
    print(f"VALIDATION DEBUG: User ID: {current_user.id}")
    print(f"VALIDATION DEBUG: User email: {current_user.email}")
    print(f"VALIDATION DEBUG: User role: '{current_user.role}'")
    print(f"VALIDATION DEBUG: Host application status: '{current_user.host_application_status}'")
    
    # Check if user role is provider
    user_role = (current_user.role or "").lower().strip()
    if user_role != "provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Must have provider role to create properties. Current role: '{current_user.role}'"
        )
    
    # Check if user is approved
    user_status = (current_user.host_application_status or "").lower().strip()
    if user_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Must have approved host application status to create properties. Current status: '{current_user.host_application_status}'"
        )
    
    print(f"VALIDATION DEBUG: User validation passed!")

def convert_pydantic_to_dict(obj):
    """
    Helper function to convert Pydantic models to dictionaries for JSON serialization
    """
    if hasattr(obj, 'dict'):
        # It's a Pydantic model
        return obj.dict()
    elif isinstance(obj, list):
        # It's a list, convert each item
        return [convert_pydantic_to_dict(item) for item in obj]
    elif isinstance(obj, dict):
        # It's already a dict, convert nested items
        return {key: convert_pydantic_to_dict(value) for key, value in obj.items()}
    else:
        # It's a primitive type
        return obj

@router.post("/draft", response_model=PropertySimple)
async def create_property_draft(
    property_data: PropertyDraftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create a draft property with phase 1 data only
    """
    print("=" * 60)
    print("CREATE DRAFT: Starting draft property creation")
    print("=" * 60)
    
    try:
        validate_provider_permissions(current_user)
        
        print(f"CREATE DRAFT: User validation passed")
        print(f"CREATE DRAFT: Processing draft data...")
        
        # Validate that at least profile image has been uploaded
        if not property_data.property_images or len(property_data.property_images) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one profile image is required"
            )
        
        # Convert Pydantic models to dictionaries for JSONB storage
        acreage_breakdown_dict = convert_pydantic_to_dict(property_data.acreage_breakdown) if property_data.acreage_breakdown else []
        wildlife_info_dict = convert_pydantic_to_dict(property_data.wildlife_info) if property_data.wildlife_info else []
        property_images_dict = convert_pydantic_to_dict(property_data.property_images)
        
        print(f"CREATE DRAFT: Converted data to dictionaries")
        print(f"CREATE DRAFT: Acreage breakdown: {acreage_breakdown_dict}")
        print(f"CREATE DRAFT: Wildlife info: {wildlife_info_dict}")
        
        # Create draft property with phase 1 data
        property_obj = Property(
            provider_id=current_user.id,
            property_name=property_data.property_name,
            description=property_data.description,
            address=property_data.address,
            city=property_data.city,
            state=property_data.state,
            zip_code=property_data.zip_code,
            country=property_data.country,
            latitude=property_data.latitude,
            longitude=property_data.longitude,
            total_acres=property_data.total_acres,
            primary_terrain=property_data.primary_terrain,
            acreage_breakdown=acreage_breakdown_dict,
            wildlife_info=wildlife_info_dict,
            property_images=property_images_dict,
            profile_image_index=property_data.profile_image_index,
            # Empty arrays for phase 2 data
            hunting_packages=[],
            accommodations=[],
            facilities=[],
            # Set as draft
            status=PropertyStatus.DRAFT.value,
            draft_completed_phase=1,
            is_listed=False  # Drafts are never listed
        )
        
        db.add(property_obj)
        db.commit()
        db.refresh(property_obj)
        
        print(f"CREATE DRAFT: SUCCESS - Draft created with ID: {property_obj.id}")
        print("=" * 60)
        
        return property_obj
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"CREATE DRAFT: UNEXPECTED ERROR - {str(e)}")
        print("=" * 60)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create draft: {str(e)}"
        )

@router.put("/{property_id}/complete", response_model=PropertySchema)
async def complete_property_draft(
    property_id: int,
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Complete a draft property with all remaining data
    """
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property_obj.provider_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this property")
    
    if property_obj.status != PropertyStatus.DRAFT.value:
        raise HTTPException(
            status_code=400, 
            detail=f"Property is not a draft. Current status: {property_obj.status}"
        )
    
    try:
        # Convert Pydantic models to dictionaries
        update_data = property_data.dict(exclude_unset=True)
        
        # Ensure required phase 2 fields are present
        if not update_data.get('hunting_packages') or len(update_data['hunting_packages']) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least one hunting package is required to complete the property"
            )
        
        if not update_data.get('accommodations') or len(update_data['accommodations']) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least one accommodation option is required to complete the property"
            )
        
        # Convert complex fields to dictionaries
        for field in ['acreage_breakdown', 'wildlife_info', 'hunting_packages', 'accommodations', 'property_images']:
            if field in update_data and update_data[field] is not None:
                update_data[field] = convert_pydantic_to_dict(update_data[field])
        
        # Update all fields
        for field, value in update_data.items():
            setattr(property_obj, field, value)
        
        # Update status and phase
        property_obj.status = PropertyStatus.PENDING.value
        property_obj.draft_completed_phase = 2
        
        db.commit()
        db.refresh(property_obj)
        
        return property_obj
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete draft: {str(e)}"
        )

@router.put("/{property_id}/toggle-listing", response_model=PropertySchema)
async def toggle_property_listing(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Toggle property listing status (list/delist)
    Only approved properties can be listed/delisted
    """
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property_obj.provider_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this property")
    
    if property_obj.status != PropertyStatus.APPROVED.value:
        raise HTTPException(
            status_code=400, 
            detail=f"Only approved properties can be listed/delisted. Current status: {property_obj.status}"
        )
    
    # Toggle the listing status
    property_obj.is_listed = not property_obj.is_listed
    db.commit()
    db.refresh(property_obj)
    
    return property_obj

@router.post("/", response_model=PropertySchema)
async def create_property(
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new hunting property with enhanced validation and error handling
    Accepts JSON data with property details including uploaded image URLs
    """
    
    print("=" * 60)
    print("CREATE PROPERTY: Starting property creation process")
    print("=" * 60)
    
    try:
        # Validate user permissions first
        validate_provider_permissions(current_user)
        
        print(f"CREATE PROPERTY: User validation passed")
        print(f"CREATE PROPERTY: Processing property data...")
        print(f"CREATE PROPERTY: Received property_images: {property_data.property_images}")
        
        # Validate that images have been uploaded
        if not property_data.property_images or len(property_data.property_images) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one property image is required"
            )
        
        # Convert Pydantic models to dictionaries for JSONB storage
        acreage_breakdown_dict = convert_pydantic_to_dict(property_data.acreage_breakdown) if property_data.acreage_breakdown else []
        wildlife_info_dict = convert_pydantic_to_dict(property_data.wildlife_info) if property_data.wildlife_info else []
        hunting_packages_dict = convert_pydantic_to_dict(property_data.hunting_packages)
        accommodations_dict = convert_pydantic_to_dict(property_data.accommodations)
        property_images_dict = convert_pydantic_to_dict(property_data.property_images)
        
        print(f"CREATE PROPERTY: Creating property database record...")
        
        property_obj = Property(
            provider_id=current_user.id,
            property_name=property_data.property_name,
            description=property_data.description,
            address=property_data.address,
            city=property_data.city,
            state=property_data.state,
            zip_code=property_data.zip_code,
            country=property_data.country,
            latitude=property_data.latitude,
            longitude=property_data.longitude,
            total_acres=property_data.total_acres,
            primary_terrain=property_data.primary_terrain,
            acreage_breakdown=acreage_breakdown_dict,
            wildlife_info=wildlife_info_dict,
            hunting_packages=hunting_packages_dict,
            accommodations=accommodations_dict,
            facilities=property_data.facilities or [],
            rules=property_data.rules,
            safety_info=property_data.safety_info,
            license_requirements=property_data.license_requirements,
            season_info=property_data.season_info,
            property_images=property_images_dict,
            profile_image_index=property_data.profile_image_index,
            status=PropertyStatus.PENDING.value,
            draft_completed_phase=2,  # Full completion
            is_listed=False  # Will be listed after approval
        )
        
        db.add(property_obj)
        db.commit()
        db.refresh(property_obj)
        
        print(f"CREATE PROPERTY: SUCCESS - Property created with ID: {property_obj.id}")
        print("=" * 60)
        
        return property_obj
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"CREATE PROPERTY: UNEXPECTED ERROR - {str(e)}")
        print("=" * 60)
        
        # Rollback database changes
        db.rollback()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create property: {str(e)}"
        )

@router.get("/pending", response_model=List[PropertySchema])
def list_pending_properties(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Admin: List all pending property listings
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return db.query(Property).filter(Property.status == PropertyStatus.PENDING.value).all()

@router.post("/{property_id}/approve", response_model=PropertySchema)
def approve_property(
    property_id: int,
    admin_feedback: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Admin: Approve a property listing
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    
    property_obj.status = PropertyStatus.APPROVED.value
    property_obj.is_listed = True  # Automatically list when approved
    if admin_feedback:
        property_obj.admin_feedback = admin_feedback
    
    db.commit()
    db.refresh(property_obj)
    return property_obj

@router.post("/{property_id}/reject", response_model=PropertySchema)
def reject_property(
    property_id: int,
    admin_feedback: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Admin: Reject a property listing
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    
    property_obj.status = PropertyStatus.REJECTED.value
    property_obj.is_listed = False  # Ensure rejected properties are not listed
    property_obj.admin_feedback = admin_feedback
    
    db.commit()
    db.refresh(property_obj)
    return property_obj

@router.get("/", response_model=List[PropertySchema])
def read_properties(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: PropertySearch = None,
    approved_only: bool = True,
    listed_only: bool = True,  # New parameter
) -> Any:
    """
    Retrieve properties with enhanced search filters
    By default, only shows approved and listed properties
    """
    query = db.query(Property)
    
    # Filter by approval status if requested
    if approved_only:
        print(f"DEBUG: Filtering by status = {PropertyStatus.APPROVED.value}")
        query = query.filter(Property.status == PropertyStatus.APPROVED.value)
    
    # Filter by listing status if requested
    if listed_only:
        query = query.filter(Property.is_listed == True)
    
    if search:
        # New search filters
        if search.hunting_type:
            query = query.filter(Property.hunting_packages.op('?')(search.hunting_type))
        if search.min_acres:
            query = query.filter(Property.total_acres >= search.min_acres)
        if search.max_acres:
            query = query.filter(Property.total_acres <= search.max_acres)
        if search.terrain:
            query = query.filter(Property.primary_terrain == search.terrain)
        if search.wildlife_species:
            query = query.filter(Property.wildlife_info.op('?')(search.wildlife_species))
        
        # Location search filters
        if search.city:
            query = query.filter(Property.city.ilike(f"%{search.city}%"))
        if search.state:
            query = query.filter(Property.state.ilike(f"%{search.state}%"))
    
    properties = query.offset(skip).limit(limit).all()
    return properties

@router.get("/my-properties", response_model=List[PropertySchema])
def get_my_properties(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    include_drafts: bool = True,  # Include drafts by default
    status: Optional[str] = None,  # Filter by specific status
) -> Any:
    """
    Get properties for current provider
    """
    user_role = (current_user.role or "").lower().strip()
    if user_role != "provider":
        raise HTTPException(
            status_code=403, 
            detail=f"Must be a provider to view properties. Current role: '{current_user.role}'"
        )
    
    query = db.query(Property).filter(Property.provider_id == current_user.id)
    
    # Filter by status if specified
    if status:
        if status.upper() in [s.value for s in PropertyStatus]:
            query = query.filter(Property.status == status.upper())
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status: {status}"
            )
    elif not include_drafts:
        # Exclude drafts if not explicitly included
        query = query.filter(Property.status != PropertyStatus.DRAFT.value)
    
    return query.all()

@router.get("/{property_id}", response_model=PropertySchema)
def read_property(
    *,
    db: Session = Depends(get_db),
    property_id: int,
    current_user: Optional[User] = Depends(get_current_user),
) -> Any:
    """
    Get property by ID with provider (user) information
    Public can view approved, listed properties
    Providers can view their own properties in any status
    """
    # Join with User table to get provider information
    from sqlalchemy.orm import joinedload
    
    property_obj = db.query(Property).options(
        joinedload(Property.provider)  # This loads the user data
    ).filter(Property.id == property_id).first()
    
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    # Check access permissions
    if current_user and property_obj.provider_id == current_user.id:
        # Provider can view their own property in any status
        pass
    elif property_obj.status == PropertyStatus.APPROVED.value and property_obj.is_listed:
        # Public can view approved and listed properties
        pass
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this property"
        )
    
    # Convert to dict and add provider info
    property_dict = {
        "id": property_obj.id,
        "provider_id": property_obj.provider_id,
        "property_name": property_obj.property_name,
        "description": property_obj.description,
        "address": property_obj.address,
        "city": property_obj.city,
        "state": property_obj.state,
        "zip_code": property_obj.zip_code,
        "country": property_obj.country,
        "latitude": property_obj.latitude,
        "longitude": property_obj.longitude,
        "total_acres": property_obj.total_acres,
        "primary_terrain": property_obj.primary_terrain,
        "acreage_breakdown": property_obj.acreage_breakdown,
        "wildlife_info": property_obj.wildlife_info,
        "hunting_packages": property_obj.hunting_packages,
        "accommodations": property_obj.accommodations,
        "facilities": property_obj.facilities,
        "rules": property_obj.rules,
        "safety_info": property_obj.safety_info,
        "license_requirements": property_obj.license_requirements,
        "season_info": property_obj.season_info,
        "property_images": property_obj.property_images,
        "profile_image_index": property_obj.profile_image_index,
        "status": property_obj.status,
        "admin_feedback": property_obj.admin_feedback,
        "is_listed": property_obj.is_listed,
        "draft_completed_phase": property_obj.draft_completed_phase,
        "created_at": property_obj.created_at,
        "updated_at": property_obj.updated_at,
        # Add provider information
        "provider": {
            "id": property_obj.provider.id,
            "full_name": property_obj.provider.full_name,
            "username": property_obj.provider.username,
            "avatar_url": property_obj.provider.avatar_url,
            "created_at": property_obj.provider.created_at,
        } if property_obj.provider else None
    }
    
    return property_dict


@router.put("/{property_id}", response_model=PropertySchema)
def update_property(
    *,
    db: Session = Depends(get_db),
    property_id: int,
    property_in: PropertyUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update property
    For approved properties, certain fields are locked
    """
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    if property_obj.provider_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    update_data = property_in.dict(exclude_unset=True)
    
    # If property is approved, prevent changes to locked fields
    if property_obj.status == PropertyStatus.APPROVED.value and current_user.role != "admin":
        locked_fields = ['property_name', 'address', 'city', 'state', 'zip_code', 'latitude', 'longitude']
        for field in locked_fields:
            if field in update_data:
                del update_data[field]
                print(f"Removed locked field {field} from update for approved property")
    
    # Convert complex fields to dictionaries
    for field in ['acreage_breakdown', 'wildlife_info', 'hunting_packages', 'accommodations', 'property_images']:
        if field in update_data and update_data[field] is not None:
            update_data[field] = convert_pydantic_to_dict(update_data[field])
    
    # Update fields
    for field, value in update_data.items():
        setattr(property_obj, field, value)
    
    # Handle status changes based on property state
    if property_obj.status == PropertyStatus.DRAFT.value:
        # If it's still a draft and has all required fields, allow completion
        if (property_obj.hunting_packages and len(property_obj.hunting_packages) > 0 and
            property_obj.accommodations and len(property_obj.accommodations) > 0):
            property_obj.status = PropertyStatus.PENDING.value
            property_obj.draft_completed_phase = 2
    elif property_obj.status == PropertyStatus.REJECTED.value:
        # Only reset to pending if significant changes were made
        if any(field in update_data for field in ['hunting_packages', 'accommodations', 'total_acres', 'wildlife_info']):
            property_obj.status = PropertyStatus.PENDING.value
    # If APPROVED, status remains APPROVED regardless of changes
    
    db.add(property_obj)
    db.commit()
    db.refresh(property_obj)
    return property_obj

@router.delete("/{property_id}")
def delete_property(
    *,
    db: Session = Depends(get_db),
    property_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete property
    """
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    if property_obj.provider_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Delete associated images from storage
    if property_obj.property_images:
        for image in property_obj.property_images:
            try:
                # Extract filename from URL and delete from Supabase
                if isinstance(image, dict) and 'url' in image:
                    # Parse the URL to get the file path
                    url_parts = image['url'].split('/storage/v1/object/public/property-images/')
                    if len(url_parts) > 1:
                        file_path = url_parts[1]
                        supabase.storage.from_('property-images').remove([file_path])
                elif isinstance(image, str):
                    # Handle string URLs
                    url_parts = image.split('/storage/v1/object/public/property-images/')
                    if len(url_parts) > 1:
                        file_path = url_parts[1]
                        supabase.storage.from_('property-images').remove([file_path])
            except Exception as e:
                print(f"Error deleting image from storage: {e}")
    
    db.delete(property_obj)
    db.commit()
    return {"message": "Property deleted successfully"}

@router.post("/{property_id}/reviews/", response_model=ReviewSchema)
async def create_review(
    property_id: int,
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a review for a property.
    """
    # Check if property exists
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Check if user has already reviewed this property
    existing_review = db.query(Review).filter(
        Review.property_id == property_id,
        Review.user_id == current_user.id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=400, 
            detail="You have already reviewed this property"
        )
    
    review = Review(
        user_id=current_user.id,
        property_id=property_id,
        rating=review_in.rating,
        comment=review_in.comment
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

@router.get("/{property_id}/reviews/", response_model=List[ReviewSchema])
async def list_reviews(
    property_id: int,
    db: Session = Depends(get_db)
):
    """
    List all reviews for a property.
    """
    reviews = db.query(Review).filter(Review.property_id == property_id).all()
    return reviews

@router.get("/test-supabase", response_model=dict)
async def test_supabase_connection(
    current_user: User = Depends(get_current_user)
):
    """
    Test Supabase storage connection
    """
    try:
        # Try to list files in property-images bucket
        result = supabase.storage.from_('property-images').list()
        
        # Handle different response formats
        files_count = 0
        if result:
            if isinstance(result, list):
                files_count = len(result)
            elif hasattr(result, 'data') and result.data:
                files_count = len(result.data)
        
        return {
            "status": "success", 
            "message": "Supabase connection working",
            "bucket_accessible": True,
            "files_count": files_count,
            "user_id": current_user.id,
            "user_role": current_user.role
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Supabase connection failed: {str(e)}",
            "bucket_accessible": False,
            "user_id": current_user.id,
            "user_role": current_user.role
        }