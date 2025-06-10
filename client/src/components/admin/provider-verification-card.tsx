import { useState } from "react";
import { Provider, User } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, Phone, UserCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProviderVerificationCardProps {
  provider: Provider & { user: User };
}

export default function ProviderVerificationCard({ provider }: ProviderVerificationCardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Debug logging to see provider data
  console.log('Provider data in verification card:', provider);
  
  // Helper to format document URLs properly
  const formatDocumentUrl = (docPath: string) => {
    // If the path already starts with http or https, return as is
    if (docPath.startsWith('http://') || docPath.startsWith('https://')) {
      return docPath;
    }
    
    // Extract the filename from paths like "uploads/filename.ext"
    const fileName = docPath.includes('/') 
      ? docPath.split('/').pop() 
      : docPath;
    
    // Create a properly formatted URL to the uploads directory
    return `/uploads/${fileName}`;
  };
  
  const handleVerification = async (status: "approved" | "rejected") => {
    setIsLoading(true);
    
    try {
      console.log(`Processing provider ${provider.id} with status ${status}`);
      
      // Making the API request with detailed logging
      const response = await apiRequest(
        "PATCH", 
        `/api/v1/admin/providers/${provider.id}/verify`, 
        { status }
      );
      
      console.log("Provider verification response:", response);
      
      toast({
        title: status === "approved" ? "Provider approved" : "Provider rejected",
        description: `Provider "${provider.user.fullName}" has been ${status === "approved" ? "approved" : "rejected"}.`,
      });
      
      // Invalidate provider queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/providers/pending"] });
      
      // Force a delay to let the backend process the change
      setTimeout(() => {
        // Refresh the page to show updated state
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error processing provider verification:", error);
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "An error occurred while processing your request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderDocumentList = () => {
    // Access verificationDocuments from the provider object
    if (!provider.verificationDocuments || 
        !Array.isArray(provider.verificationDocuments) || 
        provider.verificationDocuments.length === 0) {
      return <p className="text-gray-500 italic">No documents uploaded</p>;
    }
    
    // Log the documents and their formatted URLs for debugging
    console.log('Provider documents:', provider.verificationDocuments);
    provider.verificationDocuments.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`, doc, '→ Formatted URL:', formatDocumentUrl(doc));
    });
    
    return (
      <ul className="list-disc list-inside text-sm">
        {provider.verificationDocuments.map((doc, index) => {
          const formattedUrl = formatDocumentUrl(doc);
          return (
            <li key={index} className="text-primary">
              <a 
                href={formattedUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:underline"
                onClick={() => console.log(`Clicking document ${index + 1}:`, formattedUrl)}
              >
                Document {index + 1}
              </a>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{provider.user.fullName}</CardTitle>
            <CardDescription className="flex items-center">
              <UserCircle className="h-4 w-4 mr-1" /> @{provider.user.username}
            </CardDescription>
          </div>
          <Badge className={provider.verificationStatus === "pending" ? "bg-amber-500" : "bg-primary"}>
            {provider.verificationStatus}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-2">
        <div className="text-sm space-y-1">
          <div className="flex items-center">
            <Mail className="h-4 w-4 mr-2 text-gray-500" />
            <span>{provider.user.email}</span>
          </div>
          
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-2 text-gray-500" />
            <span>{provider.businessPhone || provider.user.phone || "No phone provided"}</span>
          </div>
          
          <p className="text-gray-600 mt-2">{provider.businessAddress || provider.user.address || "No address provided"}</p>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-medium mb-1">Business Description</h4>
          <p className="text-sm text-gray-600">{provider.businessDescription || provider.user.bio || "No description provided"}</p>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-medium mb-1">Uploaded Documents</h4>
          {renderDocumentList()}
        </div>
      </CardContent>
      
      <CardFooter className="justify-between pt-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleVerification("rejected")}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-1 text-destructive" />
          Reject
        </Button>
        <Button 
          size="sm" 
          onClick={() => handleVerification("approved")}
          disabled={isLoading}
        >
          <Check className="h-4 w-4 mr-1" />
          Approve
        </Button>
      </CardFooter>
    </Card>
  );
}
