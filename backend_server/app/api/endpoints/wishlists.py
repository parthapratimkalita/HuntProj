from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import Any, List
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.property import Property, PropertyStatus
from app.models.wishlists import Wishlist
from app.schemas.wishlists import (
    Wishlist as WishlistSchema,
    WishlistCreate
)

router = APIRouter()

@router.post("/", response_model=WishlistSchema)
def add_to_wishlist(
    *,
    db: Session = Depends(get_db),
    wishlist_in: WishlistCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Add a property to user's wishlist
    """
    # Check if property exists and is approved
    property_obj = db.query(Property).filter(
        Property.id == wishlist_in.property_id,
        Property.status == PropertyStatus.APPROVED.value,
        Property.is_listed == True
    ).first()
    
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or not available"
        )
    
    # Check if already in wishlist
    existing = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.id,
        Wishlist.property_id == wishlist_in.property_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Property already in wishlist"
        )
    
    # Create wishlist entry
    wishlist = Wishlist(
        user_id=current_user.id,
        property_id=wishlist_in.property_id
    )
    db.add(wishlist)
    db.commit()
    db.refresh(wishlist)
    
    return wishlist

@router.get("/", response_model=List[WishlistSchema])
def get_my_wishlists(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Get current user's wishlist with property details
    """
    wishlists = db.query(Wishlist).options(
        joinedload(Wishlist.property)
    ).filter(
        Wishlist.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    return wishlists

@router.delete("/{property_id}")
def remove_from_wishlist(
    *,
    db: Session = Depends(get_db),
    property_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Remove a property from user's wishlist
    """
    wishlist = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.id,
        Wishlist.property_id == property_id
    ).first()
    
    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not in wishlist"
        )
    
    db.delete(wishlist)
    db.commit()
    
    return {"message": "Property removed from wishlist"}