import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Heart, MapPin, Star, Camera } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist } from "@/hooks/use-wishlist"; 
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  id: number;
  propertyName: string;
  location?: string;
  city?: string;
  state?: string;
  huntingPackages?: Array<{
    name: string;
    price: number;
    duration: number;
    huntingType?: string;
  }>;
  propertyImages?: Array<{
    url: string;
    filename?: string;
  }> | string[];
  rating?: number;
  inWishlist?: boolean;
  dates?: string;
  profileImageIndex?: number;
}

// Skeleton component for loading state
function PropertyCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden shadow-md bg-white animate-pulse">
      {/* Image skeleton */}
      <div className="relative aspect-[4/3] bg-gray-200" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-2">
        <div className="min-h-[28px]">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
        </div>
        <div className="min-h-[20px]">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="min-h-[20px]" />
        <div className="min-h-[48px] pt-2 border-t">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-2/3 mt-2" />
        </div>
      </div>
    </div>
  );
}

export default function PropertyCard({
  id,
  propertyName,
  location,
  city,
  state,
  huntingPackages,
  propertyImages,
  rating,
  inWishlist = false,
  dates,
  profileImageIndex = 0,
}: PropertyCardProps) {
  const { user } = useAuth();
  const { isInWishlist: checkWishlistStatus, addToWishlist, removeFromWishlist } = useWishlist();
  const { toast } = useToast();
  const [wishlistStatus, setWishlistStatus] = useState(inWishlist);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Keep the wishlist status in sync with the context
  useEffect(() => {
    setWishlistStatus(inWishlist || checkWishlistStatus(id));
  }, [id, inWishlist, checkWishlistStatus]);
  
  // Placeholder image for errors
  const placeholderImage = "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400";
  
  // Process images for new schema
  const getImageUrls = () => {
    if (!propertyImages || propertyImages.length === 0) {
      return [placeholderImage];
    }
    
    return propertyImages.map(img => {
      if (typeof img === 'string') {
        return formatImagePath(img);
      } else if (img && typeof img === 'object' && img.url) {
        return formatImagePath(img.url);
      }
      return placeholderImage;
    });
  };
  
  // Ensure all image paths are properly formatted
  const formatImagePath = (path: string) => {
    if (!path) return placeholderImage;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return path.startsWith('/') ? path : `/${path}`;
  };
  
  const displayImages = getImageUrls();
  
  // Get the profile image
  const getProfileImage = () => {
    if (profileImageIndex !== undefined && profileImageIndex >= 0 && profileImageIndex < displayImages.length) {
      return displayImages[profileImageIndex];
    }
    return displayImages[0];
  };
  
  // Get price from hunting packages
  const getDisplayPrice = () => {
    if (!huntingPackages || huntingPackages.length === 0) {
      return 0;
    }
    const prices = huntingPackages.map(pkg => pkg.price || 0).filter(price => price > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };
  
  // Get location string
  const getLocationString = () => {
    if (location) return location;
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    if (state) return state;
    return 'Location not specified';
  };
  
  // Get primary hunting type
  const getPrimaryHuntingType = () => {
    if (!huntingPackages || huntingPackages.length === 0) return null;
    const huntingType = huntingPackages[0].huntingType;
    if (!huntingType) return null;
    
    // Format hunting type for display
    return huntingType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save properties to your wishlist",
        variant: "default",
      });
      return;
    }
    
    if (isLoading) return;
    
    const newWishlistStatus = !wishlistStatus;
    setWishlistStatus(newWishlistStatus);
    setIsLoading(true);
    
    try {
      if (!newWishlistStatus) {
        await removeFromWishlist(id);
      } else {
        await addToWishlist(id);
      }
    } catch (error) {
      setWishlistStatus(!newWishlistStatus);
      toast({
        title: "Error",
        description: "There was an error updating your wishlist",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const displayPrice = getDisplayPrice();
  const primaryHuntingType = getPrimaryHuntingType();

  return (
    <Link href={`/properties/${id}`}>
      <div className="property-card group rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 bg-white cursor-pointer">
        {/* Property Image with fixed aspect ratio to prevent CLS */}
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          {/* Loading skeleton */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse">
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          )}
          
          {/* Main image */}
          <img 
            src={imageError ? placeholderImage : getProfileImage()} 
            alt={propertyName} 
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
              imageLoaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0'
            }`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
          />
          
          {/* Gradient overlay for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Image count badge */}
          {displayImages.length > 1 && imageLoaded && (
            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
              <span className="text-white text-xs font-medium flex items-center gap-1">
                <Camera className="w-3 h-3" />
                {displayImages.length}
              </span>
            </div>
          )}
          
          {/* Hunting type badge */}
          {primaryHuntingType && imageLoaded && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md">
              <span className="text-gray-800 text-xs font-medium">{primaryHuntingType}</span>
            </div>
          )}
          
          {/* Wishlist button */}
          <button 
            className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full transition-all duration-200 hover:scale-110"
            onClick={handleWishlist}
            disabled={isLoading}
            aria-label={wishlistStatus ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart 
              className={cn(
                "w-5 h-5 transition-all duration-200", 
                wishlistStatus ? "fill-red-500 text-red-500" : "fill-transparent text-gray-700 hover:text-red-500"
              )} 
            />
          </button>
        </div>

        {/* Property Info with fixed heights to prevent CLS */}
        <div className="p-4 space-y-2">
          {/* Title and Rating Section - Fixed height */}
          <div className="min-h-[28px] flex justify-between items-start gap-2">
            <h3 className="font-semibold text-lg leading-tight line-clamp-1 flex-1 text-gray-900">
              {propertyName}
            </h3>
            {rating !== undefined && rating > 0 && (
              <div className="flex items-center flex-shrink-0 gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium text-gray-900">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          {/* Location Section - Fixed height */}
          <div className="min-h-[20px] flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <p className="text-gray-600 text-sm line-clamp-1">{getLocationString()}</p>
          </div>
          
          {/* Dates Section - Fixed height even if no dates */}
          <div className="min-h-[20px]">
            {dates ? (
              <p className="text-gray-500 text-sm">{dates}</p>
            ) : (
              <p className="text-gray-400 text-xs">Available year-round</p>
            )}
          </div>
          
          {/* Price and Package Info Section - Fixed height */}
          <div className="min-h-[48px] pt-2 border-t border-gray-100">
            {displayPrice > 0 ? (
              <div>
                <p className="flex items-baseline gap-1">
                  <span className="text-lg font-semibold text-gray-900">${displayPrice}</span>
                  <span className="text-gray-500 text-sm">/ package</span>
                </p>
                {/* Package info */}
                {huntingPackages && huntingPackages.length > 0 && (
                  <p className="text-gray-500 text-xs mt-1">
                    {huntingPackages.length} hunting {huntingPackages.length === 1 ? 'package' : 'packages'} • 
                    {' '}{Math.min(...huntingPackages.map(pkg => pkg.duration || 1))}-{Math.max(...huntingPackages.map(pkg => pkg.duration || 1))} days
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-gray-500 text-sm">Contact for pricing</p>
                {huntingPackages && huntingPackages.length > 0 && (
                  <p className="text-gray-400 text-xs mt-1">
                    {huntingPackages.length} package{huntingPackages.length > 1 ? 's' : ''} available
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Export skeleton component for use in loading states
export { PropertyCardSkeleton };