import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CheckCircle, Clock, XCircle, FileText, AlertTriangle, Home } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import ProviderApplicationForm from "@/components/providers/provider-application-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ProviderApplyPage() {
  const { user, isLoading: isLoadingUser } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    // Redirect if not logged in
    if (!isLoadingUser && !user) {
      navigate("/auth");
    }
    
    // Redirect if already a provider (approved application)
    if (!isLoadingUser && user?.role === "provider") {
      navigate("/provider/dashboard");
    }
  }, [user, isLoadingUser, navigate]);
  
  // Show loading while checking auth
  if (isLoadingUser) {
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
  
  // INSTANT STATUS CHECK: Use data already in user object
  const applicationStatus = (user.hostApplicationStatus || user.host_application_status)?.toLowerCase();
  
  console.log("APPLY PAGE DEBUG: User host status:", applicationStatus);
  console.log("APPLY PAGE DEBUG: User role:", user.role);
  
  // Handle successful application submission
  const handleApplicationSuccess = () => {
    toast({
      title: "Application submitted!",
      description: "We'll review your application and get back to you soon.",
    });
    
    // Refresh user data to get updated status
    queryClient.invalidateQueries({ queryKey: ["/api/v1/users/me"] });
  };

  // DECISION LOGIC: What to show based on status
  const shouldShowForm = !applicationStatus || applicationStatus === "rejected";
  const shouldShowStatus = applicationStatus === "pending" || applicationStatus === "approved";

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Become a HuntStay Host</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Share your hunting property with hunters around the world and earn extra income.
              {shouldShowForm ? " Complete the application below to get started." : ""}
            </p>
          </div>
          
          {/* Show Process Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-green-100">
                <FileText className="text-xl h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold mb-2">1. Apply</h2>
              <p className="text-gray-600">
                Fill out your information and submit required documents for verification
              </p>
              {applicationStatus && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {applicationStatus === "pending" ? "✓ Completed" : 
                     applicationStatus === "approved" ? "✓ Completed" : 
                     applicationStatus === "rejected" ? "❌ Rejected" : ""}
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <div className={`rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 ${
                applicationStatus === "pending" || applicationStatus === "approved" ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Clock className={`text-xl h-6 w-6 ${
                  applicationStatus === "pending" || applicationStatus === "approved" ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <h2 className="text-lg font-semibold mb-2">2. Get Approved</h2>
              <p className="text-gray-600">
                We'll review your application and verify your documents
              </p>
              {applicationStatus === "pending" && (
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    🔄 In Review
                  </Badge>
                </div>
              )}
              {applicationStatus === "approved" && (
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    ✅ Approved
                  </Badge>
                </div>
              )}
              {applicationStatus === "rejected" && (
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                    ❌ Rejected
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <div className={`rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 ${
                applicationStatus === "approved" ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <CheckCircle className={`text-xl h-6 w-6 ${
                  applicationStatus === "approved" ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <h2 className="text-lg font-semibold mb-2">3. Start Hosting</h2>
              <p className="text-gray-600">
                Create listings for your properties and welcome hunters
              </p>
              {applicationStatus === "approved" && (
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    🎉 Ready to Host
                  </Badge>
                </div>
              )}
            </div>
          </div>
          
          {/* CONDITIONAL RENDERING: Show form OR status based on application state */}
          {shouldShowStatus && (
            <ApplicationStatusCard 
              status={applicationStatus} 
              onRefresh={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/v1/users/me"] });
              }}
            />
          )}
          
          {shouldShowForm && (
            <>
              {applicationStatus === "rejected" && (
                <Alert className="mb-6 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Your previous application was not approved. You can submit a new application below. 
                    Please review our requirements and ensure all information is accurate.
                  </AlertDescription>
                </Alert>
              )}
              
              <ProviderApplicationForm onSuccess={handleApplicationSuccess} />
            </>
          )}
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}

// Component to show application status
function ApplicationStatusCard({ 
  status, 
  onRefresh 
}: { 
  status: string;
  onRefresh: () => void;
}) {
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
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Not Approved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return "Your application is currently under review. We'll notify you once it's been processed. This typically takes 2-3 business days.";
      case "approved":
        return "Congratulations! Your application has been approved. You can now start hosting on HuntStay and create property listings.";
      case "rejected":
        return "Unfortunately, your application was not approved at this time. Please contact our support team for more details and guidance on reapplying.";
      default:
        return "Your application status is being updated.";
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {getStatusIcon(status)}
        </div>
        <CardTitle className="text-2xl mb-2">Application Status</CardTitle>
        {getStatusBadge(status)}
      </CardHeader>
      
      <CardContent className="space-y-6">
        <p className="text-gray-600 text-center">
          {getStatusMessage(status)}
        </p>
        
        {status === "pending" && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>What happens next?</strong><br />
              Our team is reviewing your documents and information. You'll receive an email notification 
              once the review is complete. Please ensure your email notifications are enabled.
            </AlertDescription>
          </Alert>
        )}
        
        {status === "approved" && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Welcome to HuntStay!</strong><br />
              You're now part of our host community. You can start creating property listings 
              and welcoming hunters to your property.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-center space-x-4 pt-4">
          <Button variant="outline" onClick={onRefresh}>
            <Clock className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          
          {status === "approved" && (
            <Button onClick={() => window.location.href = "/provider/dashboard"}>
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          )}
          
          {status === "rejected" && (
            <Button variant="outline" onClick={() => window.location.href = "/contact"}>
              Contact Support
            </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
}