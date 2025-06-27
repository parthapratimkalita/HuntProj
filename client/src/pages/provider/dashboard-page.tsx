import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Loader2, 
  Eye, 
  EyeOff, 
  FileText,
  AlertTriangle,
  Clock,
  MapPin,
  Home,
  ArrowRight,
  Calendar,
  Users,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Property } from "@/types/property";

export default function ProviderDashboardPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("properties");

  // Handle redirects based on auth state
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
    
    if (!isLoading && user && user.role !== "provider") {
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

  if (!user || user.role !== "provider") {
    return null;
  }

  // Get all provider properties (including drafts)
  const { data: allProperties = [], isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: ['/api/v1/properties/my-properties?include_drafts=true'],
    enabled: true,
    retry: 1,
  });

  // Separate properties by status
  const draftProperties = allProperties.filter(p => p.status === "DRAFT");
  const pendingProperties = allProperties.filter(p => p.status === "PENDING");
  const approvedProperties = allProperties.filter(p => p.status === "APPROVED");
  const rejectedProperties = allProperties.filter(p => p.status === "REJECTED");

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      const response = await apiRequest("DELETE", `/api/v1/properties/${propertyId}`);
      if (!response.ok) {
        throw new Error('Failed to delete property');
      }
    },
    onSuccess: () => {
      toast({
        title: "Property deleted",
        description: "Your property has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/properties/my-properties"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  // Toggle listing mutation
  const toggleListingMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      const response = await apiRequest("PUT", `/api/v1/properties/${propertyId}/toggle-listing`);
      if (!response.ok) {
        throw new Error('Failed to toggle listing status');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Listing status updated",
        description: data.is_listed 
          ? "Property is now visible to hunters" 
          : "Property has been hidden from search results",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/properties/my-properties"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update listing status",
        variant: "destructive",
      });
    },
  });

  // Handler to continue editing draft
  const handleContinueDraft = (property: Property) => {
    navigate(`/provider/properties/${property.id}/edit?continue_draft=true`);
  };

  // Handler to edit property
  const handleEditProperty = (property: Property) => {
    navigate(`/provider/properties/${property.id}/edit`);
  };

  // Handler to create new property
  const handleAddProperty = () => {
    navigate('/provider/properties/new');
  };
  
  // Handler to delete a property
  const handleDeleteProperty = (propertyId: number) => {
    if (window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      deletePropertyMutation.mutate(propertyId);
    }
  };

  // Helper function to get property image URL
  const getPropertyImageUrl = (property: Property): string => {
    if (!property.property_images || property.property_images.length === 0) {
      return '';
    }
    
    const index = property.profile_image_index || 0;
    const image = property.property_images[index] || property.property_images[0];
    
    if (typeof image === 'string') {
      return image;
    } else if (image && typeof image === 'object' && 'url' in image) {
      return image.url;
    }
    
    return '';
  };

  // Helper function to get the lowest price from hunting packages
  const getStartingPrice = (property: Property): number => {
    if (!property.hunting_packages || property.hunting_packages.length === 0) {
      return 0;
    }
    
    const prices = property.hunting_packages.map(pkg => pkg.price || 0);
    return Math.min(...prices);
  };

  // Helper function to get status badge color and icon
  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          className: "bg-green-100 text-green-800 border border-green-200",
          icon: <Check className="w-3 h-3" />
        };
      case "PENDING":
        return {
          className: "bg-amber-100 text-amber-800 border border-amber-200",
          icon: <Clock className="w-3 h-3" />
        };
      case "REJECTED":
        return {
          className: "bg-red-100 text-red-800 border border-red-200",
          icon: <AlertTriangle className="w-3 h-3" />
        };
      case "DRAFT":
        return {
          className: "bg-gray-100 text-gray-800 border border-gray-200",
          icon: <FileText className="w-3 h-3" />
        };
      default:
        return {
          className: "bg-gray-100 text-gray-800 border border-gray-200",
          icon: null
        };
    }
  };

  // Property card component
  const PropertyCard = ({ property }: { property: Property }) => {
    const statusProps = getStatusBadgeProps(property.status);
    const isDraft = property.status === "DRAFT";
    const isApproved = property.status === "APPROVED";
    
    return (
      <Card key={property.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
        {/* Property Image */}
        <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
          {property.property_images && property.property_images.length > 0 ? (
            <img 
              src={getPropertyImageUrl(property)}
              alt={property.property_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
              <div className="text-center">
                <Home className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">No images uploaded</p>
              </div>
            </div>
          )}
          
          {/* Status Badge */}
          <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            statusProps.className
          }`}>
            {statusProps.icon}
            {property.status}
          </div>

          {/* Draft Phase Badge */}
          {isDraft && (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              Phase {property.draft_completed_phase || 1} of 2
            </div>
          )}

          {/* Listing Status Badge for Approved Properties */}
          {isApproved && (
            <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              property.is_listed 
                ? "bg-green-100 text-green-800 border border-green-200" 
                : "bg-gray-100 text-gray-800 border border-gray-200"
            }`}>
              {property.is_listed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {property.is_listed ? "Listed" : "Unlisted"}
            </div>
          )}
        </div>
        
        <CardHeader className="pb-2">
          <CardTitle className="text-lg line-clamp-1">{property.property_name}</CardTitle>
          <CardDescription className="flex items-center text-sm gap-1">
            <MapPin className="w-3 h-3" />
            {property.city}, {property.state}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pb-2 flex-grow">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Acres:</span>
              <span className="font-medium">{property.total_acres} acres</span>
            </div>
            
            {!isDraft && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Packages:</span>
                  <span className="font-medium">{property.hunting_packages?.length || 0} available</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Starting from:</span>
                  <span className="font-medium">
                    ${getStartingPrice(property)}
                  </span>
                </div>
              </>
            )}

            {isDraft && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
                <p className="text-blue-800 text-sm">
                  <strong>Draft:</strong> Complete phase 2 to submit for approval
                </p>
              </div>
            )}
            
            {/* Admin Feedback for rejected properties */}
            {property.status === "REJECTED" && property.admin_feedback && (
              <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-red-600 text-sm font-medium">Admin Feedback:</div>
                    <p className="text-red-800 text-sm mt-1">{property.admin_feedback}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Wildlife info preview */}
            {property.wildlife_info && property.wildlife_info.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {property.wildlife_info.slice(0, 3).map((wildlife, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {wildlife.species.replace(/_/g, ' ')}
                  </Badge>
                ))}
                {property.wildlife_info.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{property.wildlife_info.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between gap-2 pt-2 border-t">
          {isDraft ? (
            <>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => handleContinueDraft(property)}
                className="flex items-center gap-1 flex-1"
              >
                Continue Setup
                <ArrowRight className="h-3 w-3" />
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => handleDeleteProperty(property.id)}
                disabled={deletePropertyMutation.isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              {isApproved && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleListingMutation.mutate(property.id)}
                  disabled={toggleListingMutation.isPending}
                  className="flex items-center gap-1"
                >
                  {property.is_listed ? (
                    <>
                      <EyeOff className="h-3 w-3" />
                      Delist
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" />
                      List
                    </>
                  )}
                </Button>
              )}
              
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
                disabled={deletePropertyMutation.isPending}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow bg-gray-50">
        <div className="container max-w-7xl mx-auto p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Provider Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.fullName || user.username}! Manage your properties and bookings.
            </p>
          </div>

          {/* Provider Status Card */}
          <Card className="mb-8 border-l-4 border-l-green-600">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">Status:</span>
                <Badge className="bg-green-100 text-green-800">
                  Verified Provider
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Your account is verified. You can add and manage properties.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Properties Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Total Properties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allProperties.length}</div>
                <p className="text-xs text-muted-foreground mt-1">All properties</p>
              </CardContent>
            </Card>
            
            <Card className="border-t-4 border-t-gray-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Drafts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{draftProperties.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Incomplete properties</p>
              </CardContent>
            </Card>
            
            <Card className="border-t-4 border-t-green-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Approved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{approvedProperties.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Active properties</p>
              </CardContent>
            </Card>
            
            <Card className="border-t-4 border-t-amber-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Listed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {approvedProperties.filter(p => p.is_listed).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Visible to hunters</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Content */}
          <Tabs defaultValue="properties" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-6">
              <TabsList>
                <TabsTrigger value="properties">
                  All Properties ({allProperties.length})
                </TabsTrigger>
                <TabsTrigger value="drafts">
                  Drafts ({draftProperties.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({pendingProperties.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({approvedProperties.length})
                </TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
              </TabsList>
              
              <Button onClick={handleAddProperty} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Property
              </Button>
            </div>

            {/* All Properties Tab */}
            <TabsContent value="properties">
              {isLoadingProperties ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-gray-600">Loading properties...</p>
                </div>
              ) : allProperties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allProperties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-200">
                  <CardContent className="text-center py-12">
                    <Home className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                    <p className="text-gray-600 mb-6">
                      Start earning by listing your hunting property on HuntStay.
                    </p>
                    <Button onClick={handleAddProperty} className="flex items-center gap-2 mx-auto">
                      <Plus className="h-4 w-4" />
                      Add Your First Property
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Drafts Tab */}
            <TabsContent value="drafts">
              {draftProperties.length > 0 ? (
                <div className="space-y-4">
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Complete your draft properties to submit them for approval. 
                      Draft properties are saved but not visible to hunters.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {draftProperties.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-200">
                  <CardContent className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No draft properties</h3>
                    <p className="text-gray-600">
                      You don't have any draft properties at the moment.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Pending Tab */}
            <TabsContent value="pending">
              {pendingProperties.length > 0 ? (
                <div className="space-y-4">
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      These properties are awaiting admin approval. 
                      You'll be notified once they're reviewed.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingProperties.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-200">
                  <CardContent className="text-center py-12">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No pending properties</h3>
                    <p className="text-gray-600">
                      You don't have any properties pending approval.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved">
              {approvedProperties.length > 0 ? (
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      These properties are approved and can be listed or delisted at any time. 
                      Listed properties are visible to hunters searching for places to stay.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {approvedProperties.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-200">
                  <CardContent className="text-center py-12">
                    <Check className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No approved properties yet</h3>
                    <p className="text-gray-600 mb-6">
                      Submit a property and get it approved to start receiving bookings.
                    </p>
                    <Button onClick={handleAddProperty} className="flex items-center gap-2 mx-auto">
                      <Plus className="h-4 w-4" />
                      Add Property
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">Booking Management</h3>
                  <p className="text-gray-600 mb-6">
                    Track and manage your property bookings and reservations.
                  </p>
                  <p className="text-sm text-gray-500">Coming soon!</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Rejected Properties Section (if any) */}
          {rejectedProperties.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 text-red-600">Rejected Properties</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rejectedProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}