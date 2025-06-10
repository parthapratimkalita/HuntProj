import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import ProviderVerificationCard from "@/components/admin/provider-verification-card";
import PropertyApprovalCard from "@/components/admin/property-approval-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Users, Home, ClipboardCheck } from "lucide-react";
import { Property, Provider } from "@shared/schema";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  // Fetch pending providers
  const { 
    data: pendingProviders = [], 
    isLoading: isLoadingProviders 
  } = useQuery<(Provider & { user: any })[]>({
    queryKey: ["/api/v1/admin/providers/pending"],
    enabled: !!user && user.role === "admin",
  });
  
  // Fetch all properties specifically for admin approval process
  const { 
    data: allProperties = [], 
    isLoading: isLoadingProperties 
  } = useQuery<Property[]>({
    queryKey: ["/api/v1/admin/properties/all"],
    enabled: !!user && user.role === "admin",
  });
  
  // Filter properties by status
  const pendingProperties = allProperties.filter(property => property.status === "pending");
  const documentsNeededProperties = allProperties.filter(property => property.status === "documents_needed");
  const approvedProperties = allProperties.filter(property => property.status === "active");
  
  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">You must be an admin to access this page.</p>
            <Button onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Pending Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoadingProviders ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  pendingProviders?.length || 0
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Pending Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoadingProperties ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  pendingProperties?.length || 0
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Documents Needed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoadingProperties ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  documentsNeededProperties?.length || 0
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Approved Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoadingProperties ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  approvedProperties?.length || 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="providers">
          <TabsList className="mb-6">
            <TabsTrigger value="providers">
              <Users className="mr-2 h-4 w-4" />
              Provider Verification
            </TabsTrigger>
            <TabsTrigger value="pending-properties">
              <Home className="mr-2 h-4 w-4" />
              Pending Properties
            </TabsTrigger>
            <TabsTrigger value="documents-needed">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Documents Needed
            </TabsTrigger>
            <TabsTrigger value="approved-properties">
              <Home className="mr-2 h-4 w-4" />
              Approved Listings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="providers">
            {isLoadingProviders ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingProviders && pendingProviders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingProviders.map(provider => (
                  <ProviderVerificationCard key={provider.id} provider={provider} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="h-20 w-20 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-50">
                  <ClipboardCheck className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No pending providers</h2>
                <p className="text-gray-600">
                  All provider applications have been processed.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pending-properties">
            {isLoadingProperties ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingProperties && pendingProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingProperties.map(property => (
                  <PropertyApprovalCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="h-20 w-20 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-50">
                  <ClipboardCheck className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No pending properties</h2>
                <p className="text-gray-600">
                  All property submissions have been reviewed.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="documents-needed">
            {isLoadingProperties ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : documentsNeededProperties && documentsNeededProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documentsNeededProperties.map(property => (
                  <PropertyApprovalCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="h-20 w-20 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-50">
                  <ClipboardCheck className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No documents needed</h2>
                <p className="text-gray-600">
                  All properties have sufficient documentation.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="approved-properties">
            {isLoadingProperties ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : approvedProperties && approvedProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedProperties.map(property => (
                  <PropertyApprovalCard key={property.id} property={property} viewOnly={true} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="h-20 w-20 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-50">
                  <ClipboardCheck className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No approved properties</h2>
                <p className="text-gray-600">
                  No properties have been approved yet.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
