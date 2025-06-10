from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import Any, List
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.property import Property, PropertyImage, PropertyStatus
from app.models.booking import Booking
from app.models.review import Review
from app.schemas.property import (
    Property as PropertySchema,
    PropertyCreate,
    PropertyUpdate,
    PropertySearch,
    PropertyImage as PropertyImageSchema
)
from app.schemas.review import Review as ReviewSchema, ReviewCreate
from app.services.file_upload import save_upload_file, delete_file
from app.core.supabase import supabase
import uuid

router = APIRouter()

@router.post("/", response_model=PropertySchema)
def create_property(
    *,
    db: Session = Depends(get_db),
    property_in: PropertyCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new property (status is pending by default)
    """
    property = Property(
        **property_in.dict(),
        owner_id=current_user.id,
        status=PropertyStatus.PENDING
    )
    db.add(property)
    db.commit()
    db.refresh(property)
    return property

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
    return db.query(Property).filter(Property.status == PropertyStatus.PENDING).all()

@router.post("/{property_id}/approve", response_model=PropertySchema)
def approve_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Admin: Approve a property listing
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    property.status = PropertyStatus.APPROVED
    db.commit()
    db.refresh(property)
    return property

@router.post("/{property_id}/reject", response_model=PropertySchema)
def reject_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Admin: Reject a property listing
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    property.status = PropertyStatus.REJECTED
    db.commit()
    db.refresh(property)
    return property

@router.get("/", response_model=List[PropertySchema])
def read_properties(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: PropertySearch = None,
) -> Any:
    """
    Retrieve approved properties with optional search filters
    """
    query = db.query(Property).filter(Property.status == PropertyStatus.APPROVED)
    if search:
        if search.min_price:
            query = query.filter(Property.price >= search.min_price)
        if search.max_price:
            query = query.filter(Property.price <= search.max_price)
        if search.location:
            query = query.filter(Property.location.ilike(f"%{search.location}%"))
        if search.bedrooms:
            query = query.filter(Property.bedrooms >= search.bedrooms)
        if search.bathrooms:
            query = query.filter(Property.bathrooms >= search.bathrooms)
    properties = query.offset(skip).limit(limit).all()
    return properties

@router.get("/{property_id}", response_model=PropertySchema)
def read_property(
    *,
    db: Session = Depends(get_db),
    property_id: int,
) -> Any:
    """
    Get property by ID
    """
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    return property

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
    """
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    if property.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    for field, value in property_in.dict(exclude_unset=True).items():
        setattr(property, field, value)
    
    db.add(property)
    db.commit()
    db.refresh(property)
    return property

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
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    if property.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Delete associated images
    for image in property.images:
        delete_file(image.image_url)
    
    db.delete(property)
    db.commit()
    return {"message": "Property deleted successfully"}

@router.post("/{property_id}/images", response_model=PropertyImageSchema)
async def upload_property_image(
    *,
    db: Session = Depends(get_db),
    property_id: int,
    file: UploadFile = File(...),
    is_primary: bool = False,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Upload property image
    """
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    if property.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Save image file
    image_path = await save_upload_file(file, f"properties/{property_id}")
    
    # If this is set as primary, unset any existing primary images
    if is_primary:
        db.query(PropertyImage).filter(
            PropertyImage.property_id == property_id,
            PropertyImage.is_primary == True
        ).update({"is_primary": False})
    
    # Create image record
    image = PropertyImage(
        property_id=property_id,
        image_url=image_path,
        is_primary=is_primary
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image

@router.delete("/{property_id}/images/{image_id}")
def delete_property_image(
    *,
    db: Session = Depends(get_db),
    property_id: int,
    image_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete property image
    """
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    if property.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    image = db.query(PropertyImage).filter(
        PropertyImage.id == image_id,
        PropertyImage.property_id == property_id
    ).first()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    # Delete image file
    delete_file(image.image_url)
    
    db.delete(image)
    db.commit()
    return {"message": "Image deleted successfully"}

@router.post("/upload-image/", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload an image to Supabase Storage and return the public URL.
    """
    file_ext = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_content = await file.read()
    try:
        res = supabase.storage.from_('property-images').upload(unique_filename, file_content)
        if res.get("error"):
            raise Exception(res["error"]["message"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    public_url = supabase.storage.from_('property-images').get_public_url(unique_filename)
    return {"url": public_url}

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