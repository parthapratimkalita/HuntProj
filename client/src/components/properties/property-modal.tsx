import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Separator } from "@/components/ui/separator";
import { DateRange } from "react-day-picker";
import { format, differenceInDays } from "date-fns";
import { Property } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  User, Heart, Share2, Wifi, Map, Car, Dog, 
  Flame, Snowflake, Crosshair, Utensils, Network, Tent 
} from "lucide-react";

interface PropertyModalProps {
  property: Property & { 
    provider?: any, 
    reviews?: any[],
    avgRating?: number
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PropertyModal({ property, open, onOpenChange }: PropertyModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  
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
      
      // Close modal
      onOpenChange(false);
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
  
  // Format image paths to ensure they have correct URLs
  const formatImagePath = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return path.startsWith('/') ? path : `/${path}`;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-auto">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold">{property.title}</DialogTitle>
            <div className="flex items-center space-x-4">
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
          <DialogDescription className="text-lg text-gray-700">{property.location}</DialogDescription>
        </DialogHeader>
        
        {/* Property Images */}
        <div className="grid grid-cols-2 gap-2 my-6">
          {/* Main large image - always shown */}
          <img 
            src={Array.isArray(property.images) && property.images.length > 0 
              ? formatImagePath(property.images[0])
              : "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
            } 
            alt={`${property.title} - Main`} 
            className="rounded-l-xl col-span-1 row-span-2 w-full h-full object-cover" 
          />
          
          {/* Right column with additional images */}
          <div className="grid grid-cols-1 gap-2">
            {/* First additional image - show if exists */}
            {Array.isArray(property.images) && property.images.length > 1 ? (
              <img 
                src={formatImagePath(property.images[1])}
                alt={`${property.title} - Interior`} 
                className="rounded-tr-xl w-full h-full object-cover" 
              />
            ) : (
              <div className="rounded-tr-xl w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-sm">No additional image</span>
              </div>
            )}
            
            {/* Second additional image - show if exists */}
            {Array.isArray(property.images) && property.images.length > 2 ? (
              <img 
                src={formatImagePath(property.images[2])}
                alt={`${property.title} - Landscape`} 
                className="rounded-br-xl w-full h-full object-cover" 
              />
            ) : (
              <div className="rounded-br-xl w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-sm">No additional image</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Property Content */}
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-2/3 pr-0 md:pr-8">
            {/* Host Info */}
            <div className="py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Hosted by {property.provider?.user?.fullName || "Owner"}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Hunter & Guide · Host since {new Date(property.createdAt).getFullYear()}
                  </p>
                </div>
                <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div className="py-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {property.amenities && Array.isArray(property.amenities) && 
                  property.amenities.slice(0, 4).map((amenity, index) => {
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
              <p className="text-gray-700">
                {property.description}
              </p>
              <Button variant="link" className="px-0 mt-2 text-primary font-semibold">
                Show more
              </Button>
            </div>

            {/* Amenities */}
            <div className="py-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold mb-4">What this place offers</h3>
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
              {property.amenities && Array.isArray(property.amenities) && property.amenities.length > 6 && (
                <Button variant="outline" className="mt-6">
                  Show all {property.amenities.length} amenities
                </Button>
              )}
            </div>
          </div>

          {/* Booking Section */}
          <div className="w-full md:w-1/3 mt-6 md:mt-0">
            <div className="border border-gray-200 rounded-xl p-6 shadow-lg sticky top-24">
              <div className="flex justify-between items-baseline mb-6">
                <span>
                  <span className="text-xl font-semibold">${property.pricePerNight}</span> night
                </span>
                {property.avgRating && (
                  <div className="flex items-center text-sm">
                    <i className="fas fa-star text-primary"></i>
                    <span className="ml-1">{property.avgRating.toFixed(2)} · </span>
                    <Button variant="link" className="text-gray-600 ml-1 p-0 h-auto">
                      {property.reviews?.length || 0} reviews
                    </Button>
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
                {isBooking ? "Processing..." : "Reserve"}
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
      </DialogContent>
    </Dialog>
  );
}
