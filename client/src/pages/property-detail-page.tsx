import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Property } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import PropertyModal from "@/components/properties/property-modal";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Separator } from "@/components/ui/separator";
import { DateRange } from "react-day-picker";
import { format, differenceInDays } from "date-fns";
import { 
  Star, MapPin, User, Heart, Share2, Calendar,
  Wifi, Map, Car, Dog, Flame, Snowflake, Crosshair, 
  Utensils, Network, Tent, ArrowLeft, Home, Loader2 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface PropertyDetailPageProps {
  id: number;
}

export default function PropertyDetailPage({ id }: PropertyDetailPageProps) {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Fetch property details
  const { data: property, isLoading, error } = useQuery<Property & { 
    provider?: any,
    reviews?: any[],
    avgRating?: number
  }>({
    queryKey: [`/api/v1/properties/${id}`],
  });
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Set title and meta tags dynamically
  useEffect(() => {
    if (property) {
      document.title = `${property.title} | HuntStay`;
      
      // Update meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', 
        `Book ${property.title} in ${property.location}. ${property.description.substring(0, 150)}...`
      );
    }
  }, [property]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }
  
  if (error || !property) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
            <p className="text-gray-600 mb-6">The property you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate("/")}>
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }
  
  // Calculate booking details
  const nights = dateRange?.from && dateRange?.to 
    ? differenceInDays(dateRange.to, dateRange.from)
    : 0;
  
  const subTotal = property.pricePerNight * nights;
  const cleaningFee = Math.round(property.pricePerNight * 0.15);
  const serviceFee = Math.round(property.pricePerNight * 0.1 * nights);
  const totalPrice = subTotal + cleaningFee + serviceFee;
  
  const handleBook = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to book this property",
        variant: "default",
      });
      navigate("/auth");
      return;
    }
    
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Select dates",
        description: "Please select check-in and checkout dates",
        variant: "default",
      });
      return;
    }
    
    setIsBooking(true);
    
    try {
      const booking = {
        propertyId: property.id,
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: format(dateRange.to, "yyyy-MM-dd"),
        guestCount: guests,
        totalPrice
      };
      
      await apiRequest("POST", "/api/v1/bookings", booking);
      
      toast({
        title: "Booking successful",
        description: `Your stay at ${property.title} has been booked!`,
      });
      
      // Invalidate bookings queries
      queryClient.invalidateQueries({ queryKey: ["/api/v1/user/bookings"] });
      
      // Navigate to bookings page
      navigate("/bookings");
    } catch (error) {
      toast({
        title: "Booking failed",
        description: "There was an error booking this property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };
  
  // Function to render feature icons based on amenities array
  const renderFeature = (amenity: string) => {
    const amenityMap: Record<string, { icon: React.ReactNode, label: string }> = {
      "wifi": { icon: <Wifi className="text-gray-500 mt-1 mr-4 text-xl" />, label: "Wifi available" },
      "parking": { icon: <Car className="text-gray-500 mt-1 mr-4 text-xl" />, label: "Free parking" },
      "pet_friendly": { icon: <Dog className="text-gray-500 mt-1 mr-4 text-xl" />, label: "Dog friendly" },
      "fireplace": { icon: <Flame className="text-gray-500 mt-1 mr-4 text-xl" />, label: "Indoor fireplace" },
      "freezer": { icon: <Snowflake className="text-gray-500 mt-1 mr-4 text-xl" />, label: "Freezer storage" },
      "shooting_range": { icon: <Crosshair className="text-gray-500 mt-1 mr-4 text-xl" />, label: "Shooting range" },
      "meals_included": { icon: <Utensils className="text-gray-500 mt-1 mr-4 text-xl" />, label: "Meals included" },
      "hunting_grounds": { icon: <Network className="text-gray-500 mt-1 mr-4 text-xl" />, label: "Private hunting grounds" },
      "guide_services": { icon: <Map className="text-gray-500 mt-1 mr-4 text-xl" />, label: "Guide services" },
      "lodge_experience": { icon: <Tent className="text-gray-500 mt-1 mr-4 text-xl" />, label: "Full lodge experience" }
    };
    
    return amenityMap[amenity] || { 
      icon: <i className="fas fa-check text-gray-500 mt-1 mr-4 text-xl"></i>,
      label: amenity.replace(/_/g, ' ')
    };
  };
  
  const formatImagePath = (path: string) => {
    if (!path) return '';
    // If it's an external URL, return as is
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // Make sure local paths start with a slash
    return path.startsWith('/') ? path : `/${path}`;
  };

  const getDisplayImages = () => {
    if (property.images && Array.isArray(property.images) && property.images.length > 0) {
      // Apply path formatting to each image
      return property.images.map(formatImagePath);
    }
    
    // Fallback placeholder images
    return [
      "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      "https://images.unsplash.com/photo-1542718610-a1d656d1884c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      "https://pixabay.com/get/g69dc78be3977a07b13db58d6602fbf509406f702668fa12eeeb3057033ab3cde62749330eb07ec20f50be623e15028f455b32e57667b408aa34a3c4a11a3f2dd_1280.jpg"
    ];
  };
  
  const displayImages = getDisplayImages();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-6 flex-grow">
        {/* Back button */}
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to all properties
        </Button>
        
        {/* Property Title & Actions */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{property.title}</h1>
          <div className="flex flex-wrap items-center justify-between mt-2">
            <div className="flex items-center text-sm">
              {property.avgRating && (
                <span className="flex items-center mr-2">
                  <Star className="h-4 w-4 text-primary mr-1" />
                  <span>{property.avgRating.toFixed(1)}</span>
                  <span className="mx-1">·</span>
                  <span className="underline">{property.reviews?.length || 0} reviews</span>
                </span>
              )}
              <span className="flex items-center">
                <MapPin className="h-4 w-4 text-gray-500 mr-1" />
                {property.location}
              </span>
            </div>
            <div className="flex mt-2 sm:mt-0">
              <Button variant="ghost" size="sm" className="text-sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="ghost" size="sm" className="text-sm">
                <Heart className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </div>
        
        {/* Property Images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8">
          {/* Main large image - always shown */}
          <img 
            src={displayImages[0]} 
            alt={`${property.title} - Main`} 
            className="rounded-tl-xl rounded-bl-xl md:rounded-bl-none md:h-[500px] w-full object-cover" 
          />
          
          {/* Grid of smaller images - only shown if more than 1 image exists */}
          {displayImages.length > 1 ? (
            <div className="hidden md:grid grid-cols-2 gap-2">
              {/* Dynamically render additional images based on availability */}
              {[1, 2, 3, 4].map((index) => {
                if (index < displayImages.length) {
                  // Image exists, display it
                  return (
                    <img 
                      key={index}
                      src={displayImages[index]} 
                      alt={`${property.title} - ${index === 1 ? 'Interior' : 'Additional'}`} 
                      className={`
                        ${index === 1 ? 'rounded-tr-xl' : ''} 
                        ${index === 4 ? 'rounded-br-xl' : ''} 
                        h-[245px] w-full object-cover
                      `}
                    />
                  );
                } else {
                  // No image at this index, show placeholder
                  return (
                    <div 
                      key={index}
                      className={`
                        ${index === 1 ? 'rounded-tr-xl' : ''} 
                        ${index === 4 ? 'rounded-br-xl' : ''} 
                        h-[245px] w-full bg-gray-200 flex items-center justify-center
                      `}
                    >
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            // If only one image, show placeholder grid cells
            <div className="hidden md:grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((index) => (
                <div 
                  key={index}
                  className={`
                    ${index === 1 ? 'rounded-tr-xl' : ''} 
                    ${index === 4 ? 'rounded-br-xl' : ''} 
                    h-[245px] w-full bg-gray-200 flex items-center justify-center
                  `}
                >
                  <span className="text-gray-400 text-sm">No image</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Property Info & Booking */}
        <div className="flex flex-col lg:flex-row">
          <div className="w-full lg:w-2/3 pr-0 lg:pr-12">
            {/* Host Info */}
            <div className="flex justify-between items-start pb-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold">
                  {property.type} hosted by {property.provider?.user?.fullName || "Owner"}
                </h2>
                <p className="text-gray-600 mt-1">
                  {property.maxGuests} guests • {property.bedrooms} bedrooms • {property.bathrooms} bathrooms
                  {property.acres ? ` • ${property.acres} acres` : ''}
                </p>
              </div>
              <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-6 w-6 text-gray-600" />
              </div>
            </div>
            
            {/* Property Features */}
            <div className="py-6 border-b border-gray-200">
              <div className="space-y-4">
                {property.amenities && Array.isArray(property.amenities) && 
                  property.amenities.slice(0, 3).map((amenity, index) => {
                    const { icon, label } = renderFeature(amenity);
                    return (
                      <div key={index} className="flex items-start">
                        {icon}
                        <div>
                          <h4 className="font-medium">{label}</h4>
                          <p className="text-gray-600 text-sm">
                            {amenity === "hunting_grounds" ? `${property.acres || 0} acres of exclusive access` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
            
            {/* Description */}
            <div className="py-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4">About this place</h3>
              <p className="text-gray-700 whitespace-pre-line">
                {property.description}
              </p>
            </div>
            
            {/* Amenities */}
            <div className="py-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4">What this place offers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {property.amenities && Array.isArray(property.amenities) && 
                  property.amenities.map((amenity, index) => {
                    const { icon, label } = renderFeature(amenity);
                    return (
                      <div key={index} className="flex items-center">
                        {icon}
                        <span>{label}</span>
                      </div>
                    );
                  })
                }
              </div>
            </div>
            
            {/* Hunting Types */}
            {property.huntingTypes && Array.isArray(property.huntingTypes) && property.huntingTypes.length > 0 && (
              <div className="py-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Hunting Types Available</h3>
                <div className="flex flex-wrap gap-2">
                  {property.huntingTypes.map((type, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Reviews */}
            <div className="py-6">
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 text-primary mr-2" />
                <h3 className="text-lg font-semibold">
                  {property.avgRating ? `${property.avgRating.toFixed(1)} · ${property.reviews?.length || 0} reviews` : 'No reviews yet'}
                </h3>
              </div>
              
              {property.reviews && property.reviews.length > 0 ? (
                <div className="space-y-6">
                  {property.reviews.slice(0, 3).map((review, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{review.user?.fullName || "Guest"}</p>
                          <p className="text-gray-500 text-sm">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                    </div>
                  ))}
                  
                  {property.reviews.length > 3 && (
                    <Button variant="outline">
                      Show all {property.reviews.length} reviews
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">Be the first to leave a review!</p>
              )}
            </div>
          </div>
          
          {/* Booking Section */}
          <div className="w-full lg:w-1/3 mt-8 lg:mt-0">
            <div className="border border-gray-200 rounded-xl p-6 shadow-lg sticky top-24">
              <div className="flex justify-between items-baseline mb-4">
                <span>
                  <span className="text-xl font-semibold">${property.pricePerNight}</span> night
                </span>
                {property.avgRating && (
                  <div className="flex items-center text-sm">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="ml-1">{property.avgRating.toFixed(1)} · </span>
                    <span className="text-gray-600 ml-1">
                      {property.reviews?.length || 0} reviews
                    </span>
                  </div>
                )}
              </div>

              {/* Date Picker */}
              <div className="mb-4">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
                
                <div className="mt-4">
                  <label htmlFor="guests" className="block text-sm font-medium mb-1">
                    Guests
                  </label>
                  <select
                    id="guests"
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {Array.from({ length: property.maxGuests }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reserve Button */}
              <Button 
                className="w-full py-6" 
                onClick={handleBook}
                disabled={isBooking || !dateRange?.from || !dateRange?.to}
              >
                {isBooking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : dateRange?.from && dateRange?.to ? (
                  "Reserve"
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Select dates
                  </>
                )}
              </Button>

              {/* Price Breakdown */}
              {dateRange?.from && dateRange?.to && (
                <div className="mt-4">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700 underline">${property.pricePerNight} x {nights} nights</span>
                    <span>${subTotal}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700 underline">Cleaning fee</span>
                    <span>${cleaningFee}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700 underline">Service fee</span>
                    <span>${serviceFee}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between pt-4 font-semibold">
                    <span>Total</span>
                    <span>${totalPrice}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <PropertyModal 
        property={property} 
        open={showBookingModal} 
        onOpenChange={setShowBookingModal} 
      />
      
      <Footer />
      <MobileNav />
    </div>
  );
}
