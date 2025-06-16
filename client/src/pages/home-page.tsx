import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Property, Wishlist } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import PropertyCard from "@/components/properties/property-card";
import PropertyMap from "@/components/properties/property-map";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { DateRangePicker } from "@/components/ui/date-picker";

export default function HomePage() {
  const { user } = useAuth();
  const [showMap, setShowMap] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | undefined>(undefined);
  const [filters, setFilters] = useState<{
    category: string | null;
    priceRange: number[];
    displayTotal: boolean;
    season: string;
    huntingType: string[];
  }>({
    category: null,
    priceRange: [0, 5000],
    displayTotal: false,
    season: "",
    huntingType: [],
  });

  // Sticky search bar state
  const [isSticky, setIsSticky] = useState(false);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [searchBarTop, setSearchBarTop] = useState(0);

  // Sticky search bar effect
  useEffect(() => {
    // Get the initial position of the search bar
    if (searchBarRef.current) {
      const rect = searchBarRef.current.getBoundingClientRect();
      setSearchBarTop(rect.top + window.scrollY);
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const headerHeight = 80; // Adjust based on your header height
      
      // Check if search bar should stick
      if (scrollTop >= (searchBarTop - headerHeight)) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchBarTop]);
  
  // Fetch only approved properties from API for all users
  const { data: properties, isLoading, error } = useQuery<Property[]>({
    queryKey: ["/api/v1/properties", { approvedOnly: true }],
  });
  
  // Fetch user's wishlist
  const { data: wishlistItems } = useQuery<(Wishlist & { property: Property })[]>({
    queryKey: ["/api/v1/user/wishlists"],
    enabled: !!user, // Only run this query if user is logged in
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });
        if (res.status === 401) return []; // Return empty array if unauthorized
        if (!res.ok) throw new Error("Failed to fetch wishlist");
        return await res.json();
      } catch (e) {
        console.error("Error fetching wishlist:", e);
        return []; // Return empty array on error
      }
    }
  });
  
  // Apply filters to properties
  const filteredProperties = properties?.filter(property => {
    // Filter by category (property type)
    if (filters.category && property.propertyType !== filters.category) {
      return false;
    }
    
    // Filter by price range
    if (property.price < filters.priceRange[0] || property.price > filters.priceRange[1]) {
      return false;
    }
    
    // Filter by season
    if (filters.season && !(property.amenities as string[])?.includes(filters.season)) {
      return false;
    }
    
    // Filter by hunting types
    if (filters.huntingType.length > 0) {
      const propertyAmenities = property.amenities as string[];
      const hasMatchingType = filters.huntingType.some(type => 
        propertyAmenities?.includes(type)
      );
      if (!hasMatchingType) {
        return false;
      }
    }
    
    return true;
  });
  
  const toggleMap = () => {
    setShowMap(!showMap);
  };
  
  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };
  
  const handleCategoryChange = (category: string | null) => {
    setFilters({
      ...filters,
      category: category
    });
  };
  
  const handlePropertySelect = (propertyId: number) => {
    setSelectedPropertyId(propertyId);
    // Scroll to the property card
    const propertyCard = document.getElementById(`property-${propertyId}`);
    if (propertyCard) {
      propertyCard.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Wild Connect Header */}
      <Header />
      
      {/* Hero Section */}
      <div className="relative w-full">
        {/* Hero Background */}
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <div 
          className="w-full h-[500px] md:h-[500px] bg-cover bg-center"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1604868365551-590c19e69168?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80')" 
          }}
        ></div>
        
        {/* Hero Content */}
        <div className="absolute inset-0 z-20 flex flex-col justify-center container mx-auto px-6 md:px-10">
          <div className="max-w-lg mb-20 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Hunt together.<br />
              Stay connected.
            </h1>
            <p className="text-white text-lg mb-6">
              Book your next adventure and discover hunting grounds, lodges, hunting teams, dog handlers, and guides.
            </p>
            <div className="flex flex-wrap gap-4 relative z-40">
              <Link href={user ? "/properties" : "/auth"}>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg">
                  {user ? "Explore properties" : "Login or Sign up"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
        
      {/* Sticky Search Bar */}
      <div 
        ref={searchBarRef}
        className={`${
          isSticky 
            ? 'fixed top-20 left-0 right-0 z-30' 
            : 'relative'
        } transition-all duration-300`}
      >
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="border rounded-lg p-3">
                <div className="text-xs text-gray-500">Destination</div>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    placeholder="Where?" 
                    className="w-full outline-none text-sm" 
                  />
                </div>
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <DateRangePicker 
                  onSelect={(range) => {
                    console.log("Selected date range:", range);
                    // You can update application state here with the selected dates
                  }}
                />
              </div>
              
              <div className="flex items-center">
                <div className="border rounded-lg p-3 flex-grow">
                  <div className="text-xs text-gray-500">Guests</div>
                  <div className="text-sm">Add guests...</div>
                </div>
                <button className="bg-amber-500 hover:bg-amber-600 text-white p-3 ml-2 rounded-lg">
                  <Search size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer when search bar becomes sticky */}
      {isSticky && <div className="h-24"></div>}
      
      {/* Game Type Categories */}
      <div className="bg-white pt-8 pb-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center overflow-x-auto py-4 no-scrollbar gap-8">
            {/* Category Icons */}
            <button className="flex flex-col items-center min-w-[70px]">
              <div className="flex items-center justify-center h-12 w-12 mb-1 bg-amber-400 text-white rounded-full">
                <i className="fas fa-trophy text-lg"></i>
              </div>
              <span className="text-xs font-medium">Best shots</span>
            </button>
            
            <button className="flex flex-col items-center min-w-[70px]">
              <div className="flex items-center justify-center h-12 w-12 mb-1 bg-gray-100 text-gray-700 rounded-full">
                <i className="fas fa-home text-lg"></i>
              </div>
              <span className="text-xs font-medium">Cabin hunts</span>
            </button>
            
            <button className="flex flex-col items-center min-w-[70px]">
              <div className="flex items-center justify-center h-12 w-12 mb-1 bg-gray-100 text-gray-700 rounded-full">
                <i className="fas fa-tree text-lg"></i>
              </div>
              <span className="text-xs font-medium">Stand hunts</span>
            </button>
            
            <button className="flex flex-col items-center min-w-[70px]">
              <div className="flex items-center justify-center h-12 w-12 mb-1 bg-gray-100 text-gray-700 rounded-full">
                <i className="fas fa-hiking text-lg"></i>
              </div>
              <span className="text-xs font-medium">Stalk hunts</span>
            </button>
            
            <button className="flex flex-col items-center min-w-[70px]">
              <div className="flex items-center justify-center h-12 w-12 mb-1 bg-gray-100 text-gray-700 rounded-full">
                <i className="fas fa-dove text-lg"></i>
              </div>
              <span className="text-xs font-medium">Bird hunts</span>
            </button>
            
            <button className="flex flex-col items-center min-w-[70px]">
              <div className="flex items-center justify-center h-12 w-12 mb-1 bg-gray-100 text-gray-700 rounded-full">
                <i className="fas fa-piggy-bank text-lg"></i>
              </div>
              <span className="text-xs font-medium">Wild boar</span>
            </button>
            
            <button className="flex flex-col items-center min-w-[70px]">
              <div className="flex items-center justify-center h-12 w-12 mb-1 bg-gray-100 text-gray-700 rounded-full">
                <i className="fas fa-paw text-lg"></i>
              </div>
              <span className="text-xs font-medium">Deer</span>
            </button>
            
            <button className="flex flex-col items-center min-w-[70px]">
              <div className="flex items-center justify-center h-12 w-12 mb-1 bg-gray-100 text-gray-700 rounded-full">
                <i className="fas fa-skull text-lg"></i>
              </div>
              <span className="text-xs font-medium">Moose</span>
            </button>
          </div>
        </div>
      </div>
      
      <main className="bg-white py-6 flex-grow pb-20 md:pb-6">
        <div className="container mx-auto px-4">
          {/* Map Toggle Button */}
          <div className="flex justify-end mb-4">
            <Button 
              onClick={toggleMap} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              {showMap ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z"></path>
                  </svg>
                  Hide Map
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                  </svg>
                  Show Map
                </>
              )}
            </Button>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Property Listings */}
            <div className={`w-full ${showMap ? 'lg:w-3/5' : 'lg:w-full'}`}>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                </div>
              ) : error ? (
                <div className="text-center py-10">
                  <p className="text-red-500">Failed to load properties. Please try again later.</p>
                </div>
              ) : (
                <>
                  <div className={`property-grid grid grid-cols-1 ${showMap ? 'sm:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'} gap-4`}>
                    {filteredProperties && filteredProperties.length > 0 ? (
                      filteredProperties.map(property => (
                        <div key={property.id} id={`property-${property.id}`} className="mb-6">
                          <PropertyCard
                            id={property.id}
                            title={property.title}
                            location={`${property.city}, ${property.state}`}
                            price={property.price}
                            images={property.images as string[]}
                            profileImageIndex={property.profileImageIndex || 0}
                            inWishlist={wishlistItems?.some(item => item.propertyId === property.id) || false}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-4 text-center py-10">
                        <p className="text-gray-500">No properties found matching your criteria.</p>
                        <Button 
                          className="mt-4 bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={() => setFilters({
                            category: null,
                            priceRange: [0, 1000],
                            displayTotal: false,
                            season: "",
                            huntingType: [],
                          })}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {filteredProperties && filteredProperties.length > 0 && (
                    <div className="mt-8 mb-4 text-center">
                      <Button className="bg-amber-500 hover:bg-amber-600 text-white w-full max-w-md mx-auto py-2">
                        Explore more
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Map Section - Toggle visibility with the map button */}
            {showMap && (
              <div className="w-full lg:w-2/5">
                <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 sticky top-20" style={{ height: 'calc(100vh - 140px)', minHeight: '680px' }}>
                  <PropertyMap 
                    properties={properties || []} 
                    selectedProperty={selectedPropertyId}
                    onPropertySelect={handlePropertySelect}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}