import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle, Clock, XCircle, FileText } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import ProviderApplicationForm from "@/components/providers/provider-application-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HostApplication {
  id: number;
  user_id: number;
  phone: string;
  address: string;
  bio?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at?: string;
  admin_comment?: string;
  verification_documents?: string;
}

export default function ProviderApplyPage() {
  const { user, isLoading: isLoadingUser } = useAuth();
  const [_, navigate] = useLocation();
  
  // Check if user has an existing application
  const { data: application, isLoading: isLoadingApplication, refetch } = useQuery<HostApplication | null>({
    queryKey: [`/api/v1/users/application-status`, user?.id], // Include user ID in query key
    enabled: !!user && !isLoadingUser, // Wait for user to be fully loaded
    retry: 1, // Retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    // Return null if no application found
    queryFn: async () => {
      console.log('APPLICATION STATUS QUERY: Starting query for user:', user?.email);
      
      try {
        // Wait a moment for auth to stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get current session token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('APPLICATION STATUS QUERY: Session error:', sessionError);
          throw new Error(`Session error: ${sessionError.message}`);
        }
        
        if (!session) {
          console.error('APPLICATION STATUS QUERY: No active session found');
          throw new Error("No active session found");
        }
        
        console.log('APPLICATION STATUS QUERY: Making API request with token');
        
        const response = await fetch('/api/v1/users/application-status', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log('APPLICATION STATUS QUERY: Response status:', response.status);
        
        if (response.status === 404) {
          console.log('APPLICATION STATUS QUERY: No application found (404)');
          return null;
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('APPLICATION STATUS QUERY: Request failed:', response.status, errorText);
          throw new Error(`Failed to fetch application status: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('APPLICATION STATUS QUERY: Success! Data:', data);
        return data;
        
      } catch (error) {
        console.error('APPLICATION STATUS QUERY: Error:', error);
        // Return null on error instead of throwing, so the form is shown
        return null;
      }
    }
  });
  
  const isLoading = isLoadingUser || isLoadingApplication;
  
  useEffect(() => {
    // Redirect if not logged in
    if (!isLoadingUser && !user) {
      navigate("/auth");
    }
    
    // Redirect if already a provider (approved application)
    if (!isLoading && user?.role === "provider") {
      navigate("/provider/dashboard");
    }
  }, [user, isLoading, navigate]);
  
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
  
  if (!user) {
    return null; // Will redirect via useEffect
  }
  
  // If user already has an application, show status instead of form
  if (application) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        
        <main className="container mx-auto px-4 py-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <ApplicationStatusCard application={application} onRefresh={refetch} />
          </div>
        </main>
        
        <Footer />
        <MobileNav />
      </div>
    );
  }

  // Show application form if no existing application
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Become a HuntStay Host</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Share your hunting property with hunters around the world and earn extra income.
              Complete the application below to get started.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FileText className="text-primary text-xl h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold mb-2">1. Apply</h2>
              <p className="text-gray-600">
                Fill out your information and submit required documents for verification
              </p>
            </div>
            
            <div className="text-center">
              <div className="rounded-full bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="text-gray-400 text-xl h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold mb-2">2. Get Approved</h2>
              <p className="text-gray-600">
                We'll review your application and verify your documents
              </p>
            </div>
            
            <div className="text-center">
              <div className="rounded-full bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-gray-400 text-xl h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold mb-2">3. Start Hosting</h2>
              <p className="text-gray-600">
                Create listings for your properties and welcome hunters
              </p>
            </div>
          </div>
          
          <ProviderApplicationForm onSuccess={refetch} />
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}

// Component to show application status
function ApplicationStatusCard({ application, onRefresh }: { application: HostApplication, onRefresh: () => void }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-8 w-8 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case "rejected":
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Clock className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return "Your application is currently under review. We'll notify you once it's been processed.";
      case "approved":
        return "Congratulations! Your application has been approved. You can now start hosting on HuntStay.";
      case "rejected":
        return "Unfortunately, your application was not approved. Please see the admin comment below for more details.";
      default:
        return "Your application status is being updated.";
    }
  };

  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold mb-8">Your Host Application</h1>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon(application.status)}
          </div>
          <CardTitle className="text-2xl mb-2">Application Status</CardTitle>
          {getStatusBadge(application.status)}
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-gray-600">
            {getStatusMessage(application.status)}
          </p>
          
          <div className="space-y-4 text-left">
            <div>
              <label className="font-medium text-gray-700">Application ID:</label>
              <p className="text-gray-900">#{application.id}</p>
            </div>
            
            <div>
              <label className="font-medium text-gray-700">Submitted On:</label>
              <p className="text-gray-900">
                {new Date(application.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            
            {application.reviewed_at && (
              <div>
                <label className="font-medium text-gray-700">Reviewed On:</label>
                <p className="text-gray-900">
                  {new Date(application.reviewed_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
            
            {application.admin_comment && (
              <div>
                <label className="font-medium text-gray-700">Admin Comment:</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md">
                  {application.admin_comment}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-center space-x-4 pt-4">
            <Button variant="outline" onClick={onRefresh}>
              <Clock className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
            
            {application.status === "approved" && (
              <Button onClick={() => window.location.href = "/provider/dashboard"}>
                Go to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}