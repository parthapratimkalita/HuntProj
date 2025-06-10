import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist } from "@/hooks/use-wishlist"; 
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  id: number;
  title: string;
  location: string;
  price: number;
  images: string[];
  rating?: number;
  inWishlist?: boolean;
  dates?: string;
  profileImageIndex?: number;
}

export default function PropertyCard({
  id,
  title,
  location,
  price,
  images,
  rating,
  inWishlist = false,
  dates,
  profileImageIndex = 0,
}: PropertyCardProps) {
  const { user } = useAuth();
  const { isInWishlist: checkWishlistStatus, addToWishlist, removeFromWishlist } = useWishlist();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [wishlistStatus, setWishlistStatus] = useState(inWishlist);
  const [isLoading, setIsLoading] = useState(false);
  
  // Keep the wishlist status in sync with the context
  useEffect(() => {
    setWishlistStatus(inWishlist || checkWishlistStatus(id));
  }, [id, inWishlist, checkWishlistStatus]);
  
  // Placeholder images for development
  const placeholderImages = [
    "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    "https://images.unsplash.com/photo-1510798831971-661eb04b3739?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    "https://images.unsplash.com/photo-1542718610-a1d656d1884c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400"
  ];
  
  // Ensure all image paths are properly formatted with leading slash if needed
  const formatImagePath = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return path.startsWith('/') ? path : `/${path}`;
  };
  
  const formattedImages = images.map(formatImagePath);
  const displayImages = formattedImages.length > 0 ? formattedImages : placeholderImages;
  
  // Get the profile image or default to the first image if invalid index
  const getProfileImage = () => {
    if (profileImageIndex !== undefined && profileImageIndex >= 0 && profileImageIndex < displayImages.length) {
      return displayImages[profileImageIndex];
    }
    return displayImages[0];
  };
  
  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
  };
  
  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
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
    
    if (isLoading) return; // Prevent multiple clicks
    
    // Optimistically update UI immediately for better user experience
    const newWishlistStatus = !wishlistStatus;
    setWishlistStatus(newWishlistStatus);
    setIsLoading(true);
    
    try {
      if (!newWishlistStatus) {
        // Use the context method to remove from wishlist (toast is handled in the hook)
        await removeFromWishlist(id);
        // Toast removed to prevent duplication with useWishlist hook
      } else {
        // Use the context method to add to wishlist (toast is handled in the hook)
        await addToWishlist(id);
        // Toast removed to prevent duplication with useWishlist hook
      }
    } catch (error) {
      // Revert optimistic update on error
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

  return (
    <Link href={`/properties/${id}`}>
      <div className="property-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 bg-white cursor-pointer">
        {/* Property Images - new Instagram style gallery */}
        <div className="relative">
          {/* Show only the profile image in the card view */}
          <img 
            src={getProfileImage()} 
            alt={title} 
            className="w-full h-64 object-cover"
          />
          
          {/* Show image count badge */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-3 left-3 bg-black bg-opacity-60 px-2 py-1 rounded-md">
              <span className="text-white text-xs font-medium">{displayImages.length} photos</span>
            </div>
          )}
          
          {/* Wishlist button */}
          <button 
            className="absolute top-3 right-3 text-gray-100 hover:text-white"
            onClick={handleWishlist}
            disabled={isLoading}
          >
            <Heart 
              className={cn(
                "text-xl drop-shadow-md", 
                wishlistStatus ? "fill-primary text-primary" : "fill-transparent text-white"
              )} 
            />
          </button>
          
          {/* We removed the pagination dots since we're using a grid display */}
        </div>

        {/* Property Info */}
        <div className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-lg text-ellipsis">{title}</h3>
            {rating && (
              <div className="flex items-center">
                <i className="fas fa-star text-primary text-sm"></i>
                <span className="ml-1 text-sm font-medium">{rating.toFixed(2)}</span>
              </div>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">{location || 'Location not specified'}</p>
          {dates && <p className="text-gray-500 text-sm">{dates}</p>}
          <p className="mt-2"><span className="font-semibold">${price}</span> night</p>
        </div>
      </div>
    </Link>
  );
}
