from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class PropertyStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING" 
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

# Subschemas for better type safety - FIXED with field aliases
class AcreageBreakdown(BaseModel):
    acres: int
    terrainType: str = Field(alias="terrain_type")  # Accept both camelCase and snake_case
    # description: Optional[str] = None
    
    class Config:
        allow_population_by_field_name = True  # Allow both field names
        populate_by_name = True

class WildlifeInfo(BaseModel):
    species: str
    #estimatedPopulation: int = Field(alias="estimated_population")  # Accept both formats
    populationDensity: int = Field(alias="population_density", ge=0, le=100) 
    #seasonInfo: Optional[str] = Field(default=None, alias="season_info")  # Accept both formats
    
    class Config:
        allow_population_by_field_name = True  # Allow both field names
        populate_by_name = True

class HuntingPackage(BaseModel):
    name: str
    huntingType: str = Field(alias="hunting_type")  # Accept both formats
    duration: int
    price: float
    maxHunters: int = Field(alias="max_hunters")  # Accept both formats
    description: str
    includedItems: List[str] = Field(default=[], alias="included_items")  # Accept both formats
    accommodationStatus: str = Field(alias="accommodation_status")  # Accept both formats
    defaultAccommodation: Optional[str] = Field(default=None, alias="default_accommodation")  # Accept both formats
    
    class Config:
        allow_population_by_field_name = True  # Allow both field names
        populate_by_name = True

class AccommodationOption(BaseModel):
    type: str
    name: str
    description: Optional[str] = None
    bedrooms: int
    bathrooms: float
    capacity: int
    pricePerNight: float = Field(alias="price_per_night")  # Accept both formats
    amenities: List[str] = []
    
    class Config:
        allow_population_by_field_name = True  # Allow both field names
        populate_by_name = True

class PropertyImage(BaseModel):
    url: str
    filename: Optional[str] = None
    uploaded_at: Optional[str] = None
    size: Optional[int] = None

# PHASE 1 - Draft Creation Schema
class PropertyDraftCreate(BaseModel):
    """Schema for creating a property draft (Phase 1)"""
    # Basic Information
    property_name: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=20)
    
    # Location
    address: str
    city: str
    state: str
    zip_code: str
    country: str = "United States"
    latitude: float
    longitude: float
    
    # Property Details
    total_acres: int = Field(..., gt=0)
    #primary_terrain: Optional[str] = None
    
    # Optional for Phase 1 - Handle both naming conventions
    acreage_breakdown: Optional[List[AcreageBreakdown]] = []
    wildlife_info: Optional[List[WildlifeInfo]] = []
    
    # Images - at least profile image required
    property_images: List[PropertyImage] = Field(..., min_items=1)
    profile_image_index: int = 0
    
    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

# PHASE 2 - Complete Property Schema
class PropertyCreate(BaseModel):
    """Schema for creating a complete property (both phases)"""
    # Phase 1 fields
    property_name: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=20)
    
    # Location
    address: str
    city: str
    state: str
    zip_code: str
    country: str = "United States"
    latitude: float
    longitude: float
    
    # Property Details
    total_acres: int = Field(..., gt=0)
    #primary_terrain: Optional[str] = None
    acreage_breakdown: Optional[List[AcreageBreakdown]] = []
    wildlife_info: Optional[List[WildlifeInfo]] = []
    
    # Phase 2 required fields
    hunting_packages: List[HuntingPackage] = Field(..., min_items=1)
    accommodations: List[AccommodationOption] = Field(..., min_items=1)
    facilities: Optional[List[str]] = []
    
    # Additional Info
    rules: Optional[str] = None
    safety_info: Optional[str] = None
    license_requirements: Optional[str] = None
    season_info: Optional[str] = None
    
    # Images
    property_images: List[PropertyImage] = Field(..., min_items=1)
    profile_image_index: int = 0
    
    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

# Update Schema
class PropertyUpdate(BaseModel):
    """Schema for updating properties"""
    # Basic fields (locked for approved properties)
    property_name: Optional[str] = None
    description: Optional[str] = None
    
    # Location (locked for approved properties)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Always editable
    total_acres: Optional[int] = None
    #primary_terrain: Optional[str] = None
    acreage_breakdown: Optional[List[AcreageBreakdown]] = None
    wildlife_info: Optional[List[WildlifeInfo]] = None
    hunting_packages: Optional[List[HuntingPackage]] = None
    accommodations: Optional[List[AccommodationOption]] = None
    facilities: Optional[List[str]] = None
    rules: Optional[str] = None
    safety_info: Optional[str] = None
    license_requirements: Optional[str] = None
    season_info: Optional[str] = None
    property_images: Optional[List[PropertyImage]] = None
    profile_image_index: Optional[int] = None
    
    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

# Provider info schema
class ProviderInfo(BaseModel):
    """Provider user information"""
    id: int
    full_name: str
    username: str
    avatar_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Response Schema
class Property(BaseModel):
    """Complete property response schema"""
    id: int
    provider_id: int
    
    # Basic Info
    property_name: str
    description: str
    
    # Location
    address: str
    city: str
    state: str
    zip_code: str
    country: str
    latitude: float
    longitude: float
    
    # Property Details
    total_acres: int
    #primary_terrain: Optional[str]
    acreage_breakdown: Optional[List[AcreageBreakdown]]
    wildlife_info: Optional[List[WildlifeInfo]]
    
    # Hunting & Accommodation
    hunting_packages: Optional[List[HuntingPackage]]
    accommodations: Optional[List[AccommodationOption]]
    facilities: Optional[List[str]]
    
    # Additional Info
    rules: Optional[str]
    safety_info: Optional[str]
    license_requirements: Optional[str]
    season_info: Optional[str]
    
    # Images
    property_images: Optional[List[PropertyImage]]
    profile_image_index: int
    
    # Status
    status: PropertyStatusEnum
    admin_feedback: Optional[str]
    is_listed: bool
    draft_completed_phase: Optional[int]
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Relations - Now we include provider
    provider: Optional[ProviderInfo] = None
    # reviews: Optional[List[dict]] = []
    # avg_rating: Optional[float] = None

    class Config:
        from_attributes = True
        allow_population_by_field_name = True
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Alternative approach - create a simplified response schema
class PropertySimple(BaseModel):
    """Simplified property response schema without relationships"""
    id: int
    provider_id: int
    
    # Basic Info
    property_name: str
    description: str
    
    # Location
    address: str
    city: str
    state: str
    zip_code: str
    country: str
    latitude: float
    longitude: float
    
    # Property Details
    total_acres: int
    #primary_terrain: Optional[str]
    acreage_breakdown: Optional[List[AcreageBreakdown]]
    wildlife_info: Optional[List[WildlifeInfo]]
    
    # Hunting & Accommodation
    hunting_packages: Optional[List[HuntingPackage]]
    accommodations: Optional[List[AccommodationOption]]
    facilities: Optional[List[str]]
    
    # Additional Info
    rules: Optional[str]
    safety_info: Optional[str]
    license_requirements: Optional[str]
    season_info: Optional[str]
    
    # Images
    property_images: Optional[List[PropertyImage]]
    profile_image_index: int
    
    # Status
    status: PropertyStatusEnum
    admin_feedback: Optional[str]
    is_listed: bool
    draft_completed_phase: Optional[int]
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
        allow_population_by_field_name = True
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Search Schema
class PropertySearch(BaseModel):
    hunting_type: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None
    min_acres: Optional[int] = None
    max_acres: Optional[int] = None
    terrain: Optional[str] = None
    wildlife_species: Optional[str] = None