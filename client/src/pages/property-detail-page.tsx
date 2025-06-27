import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Property } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Star, MapPin, User, Heart, Share2, ArrowLeft, Home, Loader2, 
  Calendar, ChevronLeft, ChevronRight, Check, Target, Trees,
  Mountain, Fish, Award, Shield, BookOpen, Map, Maximize2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { sanitizeHuntingPackage, sanitizeAccommodation, sanitizeWildlifeInfo, sanitizeAcreageBreakdown } from "@/components/properties/property-form/property-form-schema";

// Property Location Map Component
interface PropertyLocationMapProps {
  property: any;
  className?: string;
}

// Complete PropertyDetailSkeleton component with all sections
const PropertyDetailSkeleton = () => {
  return (
    <div className="animate-pulse">
      {/* Back button skeleton */}
      <div className="h-10 bg-gray-200 rounded-md w-32 mb-4"></div>
      
      {/* Property Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex-1">
            <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="flex mt-4 md:mt-0 space-x-2">
            <div className="h-9 bg-gray-200 rounded w-20"></div>
            <div className="h-9 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>

      {/* Main Profile Image */}
      <div className="mb-8">
        <div className="relative w-full h-96 md:h-[500px] bg-gray-200 rounded-xl">
          <div className="absolute top-4 right-4 h-8 w-24 bg-gray-300 rounded"></div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Host Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-gray-200"></div>
                <div>
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                </div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>

          {/* Property Details Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="h-6 bg-gray-200 rounded w-6 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>

          {/* Wildlife Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-28"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Booking Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow sticky top-24 p-6">
            <div className="h-6 bg-gray-200 rounded w-40 mb-6"></div>
            
            {/* Package skeletons */}
            <div className="space-y-4 mb-6">
              {[1, 2].map(i => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-200 rounded w-28"></div>
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="h-px bg-gray-200 my-6"></div>
            
            {/* Guest selection */}
            <div className="mb-6">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
            
            <div className="h-px bg-gray-200 my-6"></div>
            
            {/* Price breakdown */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            
            {/* Book button */}
            <div className="h-12 bg-gray-200 rounded w-full mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
};



function PropertyLocationMap({ property, className = "" }: PropertyLocationMapProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  useEffect(() => {
    // Dynamically load Leaflet CSS and JS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    
    if (!window.L && !document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else if (window.L) {
      setMapLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (mapLoaded && property.latitude && property.longitude) {
      initializeMap('property-map', false);
    }
  }, [mapLoaded, property]);

  useEffect(() => {
    if (isExpanded && mapLoaded && property.latitude && property.longitude) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        initializeMap('expanded-map', true);
      }, 100);
    }
  }, [isExpanded, mapLoaded, property]);

  const initializeMap = (containerId: string, isExpandedView: boolean) => {
    const container = document.getElementById(containerId);
    if (!container || !window.L) return;

    // Clear existing map
    container.innerHTML = '';

    const lat = parseFloat(property.latitude.toString());
    const lng = parseFloat(property.longitude.toString());

    if (isNaN(lat) || isNaN(lng)) return;

    // Create map
    const map = window.L.map(containerId, {
      center: [lat, lng],
      zoom: isExpandedView ? 14 : 12,
      zoomControl: true,
      scrollWheelZoom: isExpandedView, // Only allow scroll zoom in expanded view
      dragging: isExpandedView,
      touchZoom: isExpandedView,
      doubleClickZoom: isExpandedView,
      boxZoom: isExpandedView,
      keyboard: isExpandedView
    });

    // Add tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Custom property marker
    const propertyIcon = window.L.divIcon({
      html: `
        <div style="
          background: #ef4444;
          width: 30px;
          height: 30px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            color: white;
            font-size: 12px;
            font-weight: bold;
            transform: rotate(45deg);
          ">🏹</div>
        </div>
      `,
      className: 'property-location-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });

    // Add marker
    const marker = window.L.marker([lat, lng], { icon: propertyIcon }).addTo(map);
    
    // Add popup
    marker.bindPopup(`
      <div style="text-align: center; padding: 8px;">
        <strong>${property.property_name}</strong><br/>
        <span style="color: #666;">${property.city}, ${property.state}</span><br/>
        <span style="color: #666; font-size: 12px;">${property.total_acres} acres</span>
      </div>
    `);

    // Add property boundary circle (approximate)
    const acreageRadius = Math.sqrt(property.total_acres * 4047) / 4; // Rough radius in meters
    window.L.circle([lat, lng], {
      color: '#16a34a',
      fillColor: '#16a34a',
      fillOpacity: 0.1,
      radius: Math.min(acreageRadius, 1000) // Cap at 1km for display
    }).addTo(map);

    // Fit bounds for expanded view
    if (isExpandedView) {
      const bounds = window.L.latLngBounds([
        [lat - 0.01, lng - 0.01],
        [lat + 0.01, lng + 0.01]
      ]);
      map.fitBounds(bounds, { padding: [20, 20] });
    }

    // Invalidate size after a short delay to ensure proper rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  };

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Property Location
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="flex items-center"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Expand Map
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Location Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Address</div>
                <div className="font-medium">{property.address}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">City, State</div>
                <div className="font-medium">{property.city}, {property.state} {property.zip_code}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Coordinates</div>
                <div className="font-medium text-sm">
                  {parseFloat(property.latitude).toFixed(4)}, {parseFloat(property.longitude).toFixed(4)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Property Size</div>
                <div className="font-medium">{property.total_acres} acres</div>
              </div>
            </div>

            {/* Map Container */}
            <div className="relative">
              <div 
                id="property-map" 
                className="w-full h-64 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center"
                style={{ minHeight: '256px' }}
              >
                {!mapLoaded && (
                  <div className="text-gray-500 text-center">
                    <Map className="w-8 h-8 mx-auto mb-2" />
                    <div>Loading map...</div>
                  </div>
                )}
              </div>
              
              {/* Overlay for click to expand */}
              <div 
                className="absolute inset-0 bg-transparent cursor-pointer rounded-lg"
                onClick={() => setIsExpanded(true)}
                title="Click to expand map"
              />
            </div>

            {/* Map Info */}
            <div className="text-sm text-gray-600 text-center">
              <MapPin className="w-4 h-4 inline mr-1" />
              Approximate location • Click map to explore area
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Map Modal */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              {property.property_name} - Property Location
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 p-6 pt-4">
            <div className="h-full">
              <div 
                id="expanded-map" 
                className="w-full h-full rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center"
                style={{ minHeight: 'calc(90vh - 120px)' }}
              >
                {!mapLoaded && (
                  <div className="text-gray-500 text-center">
                    <Map className="w-8 h-8 mx-auto mb-2" />
                    <div>Loading detailed map...</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6 pt-0 border-t">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div>
                <MapPin className="w-4 h-4 inline mr-1" />
                {property.address}, {property.city}, {property.state}
              </div>
              <div>
                {property.total_acres} acres • Hunting Property
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PropertyDetailPageProps {
  id: number;
}

export default function PropertyDetailPage({ id }: PropertyDetailPageProps) {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [guests, setGuests] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  
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
      document.title = `${property.property_name} | HuntStay`;
    }
  }, [property]);

  // Set default selected package
  useEffect(() => {
    if (property?.hunting_packages && property.hunting_packages.length > 0 && !selectedPackage) {
      setSelectedPackage(sanitizeHuntingPackage(property.hunting_packages[0]));
    }
  }, [property, selectedPackage]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-6 flex-grow max-w-7xl">
          <PropertyDetailSkeleton />
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
  
  // Get display images from new schema
  const getDisplayImages = () => {
    if (property.property_images && Array.isArray(property.property_images) && property.property_images.length > 0) {
      return property.property_images.map((img: any) => {
        if (typeof img === 'string') {
          return formatImagePath(img);
        } else if (img && typeof img === 'object' && img.url) {
          return formatImagePath(img.url);
        }
        return '';
      }).filter(Boolean);
    }
    
    // Fallback placeholder images
    return [
      "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      "https://images.unsplash.com/photo-1542718610-a1d656d1884c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
    ];
  };

  const formatImagePath = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return path.startsWith('/') ? path : `/${path}`;
  };

  const displayImages = getDisplayImages();
  const profileImage = displayImages[property.profile_image_index || 0] || displayImages[0];
  const otherImages = displayImages.filter((_, index) => index !== (property.profile_image_index || 0));

  // Calculate booking details based on selected package
  const packagePrice = selectedPackage?.price || 0;
  const serviceFee = Math.round(packagePrice * 0.1);
  const totalPrice = packagePrice + serviceFee;
  
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
    
    if (!selectedPackage) {
      toast({
        title: "Select package",
        description: "Please select a hunting package",
        variant: "default",
      });
      return;
    }
    
    setIsBooking(true);
    
    try {
      const booking = {
        propertyId: property.id,
        huntingPackageId: selectedPackage.id || selectedPackage.name,
        guestCount: guests,
        totalPrice,
        packageDetails: selectedPackage
      };
      
      await apiRequest("POST", "/api/v1/bookings", booking);
      
      toast({
        title: "Booking successful",
        description: `Your ${selectedPackage.name} at ${property.property_name} has been booked!`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/v1/user/bookings"] });
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

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % otherImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + otherImages.length) % otherImages.length);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-6 flex-grow max-w-7xl">
        {/* Back button */}
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to all properties
        </Button>
        
        {/* Property Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{property.property_name}</h1>
              <div className="flex items-center text-gray-600 mb-2">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{property.city}, {property.state}</span>
                <span className="mx-2">•</span>
                <span>{property.total_acres} acres</span>
              </div>
              {property.avgRating && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 mr-1" />
                  <span className="font-medium">{property.avgRating.toFixed(1)}</span>
                  <span className="mx-1">•</span>
                  <span className="text-gray-600">{property.reviews?.length || 0} reviews</span>
                </div>
              )}
            </div>
            <div className="flex mt-4 md:mt-0 space-x-2">
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Heart className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Main Profile Image */}
        <div className="mb-8">
          <div className="relative w-full h-96 md:h-[500px] rounded-xl overflow-hidden">
            <img 
              src={profileImage} 
              alt={`${property.property_name} - Main view`} 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4">
              <Badge variant="secondary" className="bg-black/50 text-white border-none">
                Main photo
              </Badge>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Host Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {property.provider?.avatar_url ? (
                        <img 
                          src={property.provider.avatar_url} 
                          alt={property.provider.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        Hosted by {property.provider?.full_name || "Property Owner"}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Hunter & Guide • Host since {property.provider?.created_at 
                          ? new Date(property.provider.created_at).getFullYear() 
                          : new Date(property.created_at).getFullYear()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trees className="w-5 h-5 mr-2" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Mountain className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium">{property.total_acres} Acres</div>
                    <div className="text-sm text-gray-600">Total Property</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium">{property.hunting_packages?.length || 0}</div>
                    <div className="text-sm text-gray-600">Hunt Packages</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Fish className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-medium">{property.wildlife_info?.length || 0}</div>
                    <div className="text-sm text-gray-600">Wildlife Species</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle>About this property</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                  {property.description}
                </p>
              </CardContent>
            </Card>

            {/* Wildlife Information */}
            {property.wildlife_info && property.wildlife_info.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Fish className="w-5 h-5 mr-2" />
                    Wildlife & Game
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {property.wildlife_info.map((wildlife: any, index: number) => {
                      // Sanitize wildlife data to handle both formats
                      const sanitizedWildlife = sanitizeWildlifeInfo(wildlife);
                      
                      return (
                        <div key={index} className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2 capitalize">
                            {sanitizedWildlife.species.replace(/_/g, ' ')}
                          </h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>Population: ~{sanitizedWildlife.estimatedPopulation}</div>
                            <div>
                              Density: 
                              <Badge variant="outline" className="text-xs ml-2">
                                {sanitizedWildlife.populationDensity}
                              </Badge>
                            </div>
                            {sanitizedWildlife.seasonInfo && (
                              <div>Best season: {sanitizedWildlife.seasonInfo}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Terrain & Acreage Breakdown */}
            {property.acreage_breakdown && property.acreage_breakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mountain className="w-5 h-5 mr-2" />
                    Terrain & Acreage Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {property.acreage_breakdown.map((terrain: any, index: number) => {
                      const sanitizedTerrain = sanitizeAcreageBreakdown(terrain);
                      
                      return (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium capitalize">
                              {sanitizedTerrain.terrainType.replace(/_/g, ' ')}
                            </h4>
                            <Badge variant="secondary">{sanitizedTerrain.acres} acres</Badge>
                          </div>
                          {sanitizedTerrain.description && (
                            <p className="text-sm text-gray-600">{sanitizedTerrain.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Facilities */}
            {property.facilities && property.facilities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Home className="w-5 h-5 mr-2" />
                    Property Facilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.facilities.map((facility: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm capitalize">
                          {facility.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rules & Information */}
            {(property.rules || property.safety_info || property.license_requirements || property.season_info) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Important Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {property.rules && (
                    <div>
                      <h4 className="font-medium mb-2">Property Rules</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{property.rules}</p>
                    </div>
                  )}
                  
                  {property.safety_info && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Safety Information
                      </h4>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{property.safety_info}</p>
                    </div>
                  )}
                  
                  {property.license_requirements && (
                    <div>
                      <h4 className="font-medium mb-2">License Requirements</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{property.license_requirements}</p>
                    </div>
                  )}
                  
                  {property.season_info && (
                    <div>
                      <h4 className="font-medium mb-2">Season Information</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{property.season_info}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Accommodation Options */}
            {property.accommodations && property.accommodations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Home className="w-5 h-5 mr-2" />
                    Accommodation Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {property.accommodations.map((acc: any, index: number) => {
                      const sanitizedAcc = sanitizeAccommodation(acc);
                      
                      return (
                        <div key={index} className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">{sanitizedAcc.name}</h4>
                          <Badge variant="outline" className="mb-2">{sanitizedAcc.type}</Badge>
                          
                          <div className="space-y-1 text-sm text-gray-600 mb-3">
                            <div>Capacity: {sanitizedAcc.capacity} guests</div>
                            <div>{sanitizedAcc.bedrooms} bedrooms • {sanitizedAcc.bathrooms} bathrooms</div>
                            {sanitizedAcc.pricePerNight > 0 && (
                              <div className="font-medium text-gray-900">
                                ${sanitizedAcc.pricePerNight}/night
                              </div>
                            )}
                          </div>
                          
                          {sanitizedAcc.description && (
                            <p className="text-sm text-gray-600 mb-3">{sanitizedAcc.description}</p>
                          )}
                          
                          {sanitizedAcc.amenities && sanitizedAcc.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {sanitizedAcc.amenities.map((amenity: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {amenity.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Images Gallery */}
            {otherImages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Property Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <img 
                        src={otherImages[currentImageIndex]} 
                        alt={`Property view ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {otherImages.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                          onClick={prevImage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                          onClick={nextImage}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                          <div className="flex space-x-2">
                            {otherImages.map((_, index) => (
                              <button
                                key={index}
                                className={`w-2 h-2 rounded-full ${
                                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                }`}
                                onClick={() => setCurrentImageIndex(index)}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Thumbnail strip */}
                  {otherImages.length > 1 && (
                    <div className="mt-4 grid grid-cols-4 md:grid-cols-6 gap-2">
                      {otherImages.map((image, index) => (
                        <button
                          key={index}
                          className={`aspect-square rounded-lg overflow-hidden border-2 ${
                            index === currentImageIndex ? 'border-primary' : 'border-transparent'
                          }`}
                          onClick={() => setCurrentImageIndex(index)}
                        >
                          <img 
                            src={image} 
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-400" />
                  {property.avgRating ? `${property.avgRating.toFixed(1)} · ${property.reviews?.length || 0} reviews` : 'No reviews yet'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {property.reviews && property.reviews.length > 0 ? (
                  <div className="space-y-6">
                    {property.reviews.slice(0, 3).map((review, index) => (
                      <div key={index} className="border-b pb-4 last:border-b-0">
                        <div className="flex items-center mb-2">
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
                      <Button variant="outline" className="w-full">
                        Show all {property.reviews.length} reviews
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600">Be the first to leave a review!</p>
                )}
              </CardContent>
            </Card>

            {/* Property Location Map */}
            <PropertyLocationMap 
              property={property}
              className="mt-8"
            />
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Hunting Packages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Package Selection */}
                {property.hunting_packages.map((pkg: any, index: number) => {
                  const sanitizedPkg = sanitizeHuntingPackage(pkg);
                  
                  return (
                    <div 
                      key={index} 
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedPackage?.name === sanitizedPkg.name 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPackage(sanitizedPkg)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{sanitizedPkg.name}</h4>
                          <Badge variant="outline" className="text-xs mt-1">
                            {sanitizedPkg.huntingType.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        {selectedPackage?.name === sanitizedPkg.name && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{sanitizedPkg.description}</p>
                      
                      {/* Package includes */}
                      {sanitizedPkg.includedItems && sanitizedPkg.includedItems.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Includes:</p>
                          <div className="flex flex-wrap gap-1">
                            {sanitizedPkg.includedItems.map((item: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {item.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {sanitizedPkg.duration} days • Up to {sanitizedPkg.maxHunters} hunters
                        </div>
                        <div className="font-semibold text-lg">${sanitizedPkg.price}</div>
                      </div>
                      
                      {sanitizedPkg.accommodationStatus === 'included' && (
                        <div className="mt-2 text-xs text-green-600">
                          ✓ Accommodation included
                        </div>
                      )}
                    </div>
                  );
                })}

                {selectedPackage && (
                  <>
                    <Separator />
                    
                    {/* Guest Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Number of Hunters
                      </label>
                      <select
                        value={guests}
                        onChange={(e) => setGuests(parseInt(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      >
                        {Array.from({ length: selectedPackage.maxHunters }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'hunter' : 'hunters'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Separator />

                    {/* Price Breakdown */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">{selectedPackage.name}</span>
                        <span>${selectedPackage.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Service fee</span>
                        <span>${serviceFee}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span>${totalPrice}</span>
                      </div>
                    </div>

                    {/* Book Button */}
                    <Button 
                      className="w-full py-3 text-lg" 
                      onClick={handleBook}
                      disabled={isBooking}
                    >
                      {isBooking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Calendar className="mr-2 h-4 w-4" />
                          Book This Package
                        </>
                      )}
                    </Button>

                    <div className="text-center text-sm text-gray-500">
                      You won't be charged yet
                    </div>
                  </>
                )}

                {!selectedPackage && (
                  <div className="text-center py-8 text-gray-600">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>Select a hunting package above to book</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}