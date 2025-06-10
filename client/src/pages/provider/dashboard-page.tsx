import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Property, Provider } from "@shared/schema";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function ProviderDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("properties");

  // Get provider details - using the configured queryFn from queryClient
  // that automatically handles authorization headers and error handling
  const { data: provider, isLoading: isLoadingProvider } = useQuery<Provider | null>({
    queryKey: [`/api/v1/provider/user/${user?.id}`],
    enabled: !!user,
    retry: false, // Don't retry for provider checking - if 401, user isn't a provider
    gcTime: 0,    // Don't cache this data
    staleTime: 0, // Always refetch
    
    // Custom error handling to return null if API returns 401/404 (not a provider)
    queryFn: getQueryFn({ 
      on401: "returnNull" 
    }) as any,
  });

  // Get provider properties if provider exists
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: [`/api/v1/provider/properties/${provider?.id}`],
    enabled: !!provider?.id,
    retry: false,
    gcTime: 0,
    staleTime: 0,
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
    setLocation(`/provider/properties/${property.id}/edit`);
  };

  // Handler to redirect to property creation page
  const handleAddProperty = () => {
    setLocation('/provider/properties/new');
  };
  
  // Handler to delete a property
  const handleDeleteProperty = (propertyId: number) => {
    if (window.confirm("Are you sure you want to delete this property?")) {
      deletePropertyMutation.mutate(propertyId);
    }
  };

  if (isLoadingProvider) {
    return <div className="flex justify-center p-12">Loading provider details...</div>;
  }

  // Check if the user has applied to be a provider
  const hasApplied = !!provider;

  // If the user hasn't applied yet, show apply button
  if (!hasApplied) {
    return (
      <div className="container max-w-5xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Provider Dashboard</h1>
        <p className="text-gray-500 mb-6">You need to be a verified provider to access this page.</p>
        <Button asChild>
          <Link href="/provider/apply">Apply to become a Provider</Link>
        </Button>
      </div>
    );
  }
  
  // If the user has applied but isn't approved yet, show pending status
  if (provider.verificationStatus !== "approved") {
    return (
      <div className="container max-w-5xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Provider Dashboard</h1>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 mb-6 max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-amber-100">
            <div className="w-8 h-8 rounded-full bg-amber-400 animate-pulse"></div>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Application {provider.verificationStatus}</h2>
          
          {provider.verificationStatus === "pending" && (
            <>
              <p className="text-gray-600 mb-4">
                Your provider application is currently under review. 
                Our team will review your information and documents and get back to you soon.
              </p>
              <p className="text-sm text-gray-500">
                This usually takes 1-2 business days. You'll receive a notification when your status changes.
              </p>
            </>
          )}
          
          {provider.verificationStatus === "rejected" && (
            <>
              <p className="text-gray-600 mb-4">
                Unfortunately, your provider application was rejected. 
                This may be due to incomplete information or verification issues.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                If you believe this is a mistake, please contact our support team.
              </p>
              <Button asChild variant="outline">
                <Link href="/provider/apply">Apply Again</Link>
              </Button>
            </>
          )}
          
          {provider.verificationStatus === "documents_needed" && (
            <>
              <p className="text-gray-600 mb-4">
                We need additional documentation for your provider application.
                Please check your email for more details on what's needed.
              </p>
              <Button asChild>
                <Link href="/provider/apply">Update Application</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Provider Dashboard</h1>
      <p className="text-muted-foreground mb-6">
        Manage your properties and bookings
      </p>

      {/* Provider Status Card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>Account Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <div className="font-semibold">Status:</div>
            <div 
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                provider.verificationStatus === "approved" 
                  ? "bg-green-100 text-green-800" 
                  : provider.verificationStatus === "rejected" 
                  ? "bg-red-100 text-red-800" 
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {provider.verificationStatus.charAt(0).toUpperCase() + provider.verificationStatus.slice(1)}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {provider.verificationStatus === "pending" && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-400 animate-pulse"></div>
                Your application is pending approval from administrators.
              </div>
            )}
            {provider.verificationStatus === "approved" && (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Your account is verified. You can add and manage properties.
              </div>
            )}
            {provider.verificationStatus === "rejected" && (
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-red-600" />
                Your application was rejected. Please contact support for more information.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="properties" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {/* Properties Tab */}
        <TabsContent value="properties">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Properties</h2>
            {provider.verificationStatus === "approved" && (
              <Button onClick={handleAddProperty}>
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            )}
          </div>
          
          {isLoadingProperties ? (
            <div className="text-center p-12">Loading properties...</div>
          ) : properties && properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {properties.map((property) => (
                <Card key={property.id} className="overflow-hidden flex flex-col">
                  {/* Property Image */}
                  <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
                    {property.images && Array.isArray(property.images) && property.images.length > 0 ? (
                      <img 
                        src={Array.isArray(property.images) ? property.images[0] : property.images}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                        No images available
                      </div>
                    )}
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                      property.status === "active" 
                        ? "bg-green-100 text-green-800" 
                        : property.status === "pending" 
                        ? "bg-amber-100 text-amber-800"
                        : property.status === "documents_needed"
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {property.status === "documents_needed" ? "Documents Needed" : property.status}
                    </div>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{property.title}</CardTitle>
                    </div>
                    <CardDescription>{property.address}, {property.city}, {property.state}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2 flex-grow">
                    <div className="text-sm mb-1">
                      <span className="font-medium">Price:</span> ${property.price}/{property.priceUnit || 'night'}
                    </div>
                    <div className="text-sm mb-1">
                      <span className="font-medium">Capacity:</span> {property.capacity} {property.capacity === 1 ? 'person' : 'people'}
                    </div>
                    <div className="text-sm mb-2">
                      <span className="font-medium">Type:</span> {property.propertyType}
                    </div>
                    
                    {property.status === "documents_needed" && property.adminFeedback && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md text-sm">
                        <strong>Admin Feedback:</strong>
                        <p className="text-gray-700 mt-1">{property.adminFeedback}</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 pt-2 mt-auto">
                    <Button variant="outline" size="sm" onClick={() => handleEditProperty(property)}>
                      <Edit2 className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteProperty(property.id)}>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-12 border rounded-lg bg-gray-50">
              <p className="text-muted-foreground mb-4">You don't have any properties yet.</p>
              {provider.verificationStatus === "approved" ? (
                <Button onClick={handleAddProperty}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Property
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You can add properties once your account is approved.
                </p>
              )}
            </div>
          )}
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <div className="text-center p-12 border rounded-lg bg-gray-50">
            <p className="text-muted-foreground">Booking management will be available soon!</p>
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <div className="text-center p-12 border rounded-lg bg-gray-50">
            <p className="text-muted-foreground">Reviews management will be available soon!</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* No longer using dialog form, redirecting to dedicated form pages instead */}
    </div>
  );
}