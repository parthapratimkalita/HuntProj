from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import Any, List
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.property import Property
from app.models.enums import PropertyStatus
from app.models.wishlists import Wishlist
from app.schemas.wishlists import (
    WishlistResponse,
    WishlistCreate
)
from app.core.cache import cached_query, invalidate_wishlist_cache

router = APIRouter()

@router.post("/", response_model=WishlistResponse)
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
        Property.status == PropertyStatus.APPROVED,
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
    
    # Invalidate wishlist cache for this user
    invalidate_wishlist_cache(current_user.id)
    
    return wishlist

@cached_query(ttl=300, cache_key_prefix="wishlists")
def _get_user_wishlists_cached(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
) -> List[Wishlist]:
    """
    Cached function to get user's wishlist with optimized joins
    """
    wishlists = db.query(Wishlist).options(
        joinedload(Wishlist.property).joinedload(Property.provider)
    ).filter(
        Wishlist.user_id == user_id
    ).order_by(
        Wishlist.created_at.desc()  # Most recent first
    ).offset(skip).limit(limit).all()
    
    return wishlists

@router.get("/", response_model=List[WishlistResponse])
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
    wishlists = _get_user_wishlists_cached(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
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
    
    # Invalidate wishlist cache for this user
    invalidate_wishlist_cache(current_user.id)
    
    return {"message": "Property removed from wishlist"}