import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Property } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";

export default function ProviderDashboardPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("properties");

  // Handle redirects based on auth state
  useEffect(() => {
    if (!isLoading && !user) {
      // User is definitely not logged in - redirect to auth
      navigate("/auth");
    }
    
    if (!isLoading && user && user.role !== "provider") {
      // User is logged in but not a provider - redirect to apply page
      navigate("/provider/apply");
    }
  }, [user, isLoading, navigate]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  // These cases will redirect via useEffect, but show nothing while redirecting
  if (!user || user.role !== "provider") {
    return null; // Will redirect via useEffect
  }

  // Get provider properties - user is definitely a provider at this point
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: [`/api/v1/provider/properties`],
    enabled: true, // Always enabled since we know user is a provider
    retry: 1,
  });

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      await apiRequest("DELETE", `/api/v1/provider/properties/${propertyId}`);
    },
    onSuccess: () => {
      toast({
        title: "Property deleted",
        description: "Your property has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/provider/properties"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  // Handler to redirect to property edit page
  const handleEditProperty = (property: Property) => {
    navigate(`/provider/properties/${property.id}/edit`);
  };

  // Handler to redirect to property creation page
  const handleAddProperty = () => {
    navigate('/provider/properties/new');
  };
  
  // Handler to delete a property
  const handleDeleteProperty = (propertyId: number) => {
    if (window.confirm("Are you sure you want to delete this property?")) {
      deletePropertyMutation.mutate(propertyId);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        <div className="container max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Provider Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.fullName || user.username}! Manage your properties and bookings.
        </p>
      </div>

      {/* Provider Status Card - Always shows verified since user.role === "provider" */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <div className="font-semibold">Status:</div>
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Verified Provider
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              Your account is verified. You can add and manage properties.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="properties" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="properties">Properties ({properties.length})</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {/* Properties Tab */}
        <TabsContent value="properties">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Your Properties</h2>
            <Button onClick={handleAddProperty} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          </div>
          
          {isLoadingProperties ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-gray-600">Loading properties...</p>
            </div>
          ) : properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {properties.map((property) => (
                <Card key={property.id} className="overflow-hidden flex flex-col">
                  {/* Property Image */}
                  <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
                    {property.images && Array.isArray(property.images) && property.images.length > 0 ? (
                      <img 
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                        <div className="text-center">
                          <div className="text-4xl mb-2">🏡</div>
                          <p className="text-sm">No images uploaded</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${
                      property.status === "active" 
                        ? "bg-green-100 text-green-800 border border-green-200" 
                        : property.status === "pending" 
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : property.status === "documents_needed"
                        ? "bg-blue-100 text-blue-800 border border-blue-200" 
                        : "bg-gray-100 text-gray-800 border border-gray-200"
                    }`}>
                      {property.status === "documents_needed" ? "Documents Needed" : 
                       property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </div>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1">{property.title}</CardTitle>
                    <CardDescription className="flex items-center text-sm">
                      📍 {property.city}, {property.state}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pb-2 flex-grow">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Price:</span>
                        <span className="font-medium">${property.price}/{property.priceUnit || 'night'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Capacity:</span>
                        <span className="font-medium">{property.capacity} {property.capacity === 1 ? 'guest' : 'guests'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span className="font-medium capitalize">{property.propertyType}</span>
                      </div>
                    </div>
                    
                    {/* Admin Feedback */}
                    {property.status === "documents_needed" && property.adminFeedback && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
                        <div className="flex items-start gap-2">
                          <div className="text-blue-600 text-sm font-medium">Admin Feedback:</div>
                        </div>
                        <p className="text-blue-800 text-sm mt-1">{property.adminFeedback}</p>
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex justify-end gap-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditProperty(property)}
                      className="flex items-center gap-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteProperty(property.id)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            // Empty state
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="text-center py-12">
                <div className="text-6xl mb-4">🏡</div>
                <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                <p className="text-gray-600 mb-6">
                  Start earning by listing your hunting property on HuntStay.
                </p>
                <Button onClick={handleAddProperty} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Property
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-semibold mb-2">Booking Management</h3>
              <p className="text-gray-600 mb-6">
                Track and manage your property bookings and reservations.
              </p>
              <p className="text-sm text-gray-500">Coming soon!</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="text-lg font-semibold mb-2">Reviews & Ratings</h3>
              <p className="text-gray-600 mb-6">
                View and respond to guest reviews for your properties.
              </p>
              <p className="text-sm text-gray-500">Coming soon!</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}