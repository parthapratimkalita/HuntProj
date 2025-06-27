import { useState } from "react";
import { Property } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Check, X, ExternalLink, MapPin, User, Home, FileQuestion } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PropertyApprovalCardProps {
  property: Property;
  viewOnly?: boolean;
}

export default function PropertyApprovalCard({ property, viewOnly = false }: PropertyApprovalCardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // State for viewing feedback 
  const [showAdminFeedbackModal, setShowAdminFeedbackModal] = useState(false);
  
  const handleApproval = async (status: "active" | "rejected" | "documents_needed") => {
    if (status === "documents_needed" && !feedbackText) {
      setShowFeedbackModal(true);
      return;
    }
    
    setIsLoading(true);
    
    try {
      await apiRequest("PATCH", `/api/v1/admin/properties/${property.id}/approve`, { 
        status, 
        feedback: status === "documents_needed" ? feedbackText : undefined
      });
      
      let actionText = "approved";
      if (status === "rejected") actionText = "rejected";
      if (status === "documents_needed") actionText = "marked as needing more documents";
      
      toast({
        title: `Property ${actionText}`,
        description: `Property "${property.title}" has been ${actionText}.`,
      });
      
      // Close feedback modal if open
      if (showFeedbackModal) {
        setShowFeedbackModal(false);
        setFeedbackText("");
      }
      
      // Invalidate property queries
      queryClient.invalidateQueries({ queryKey: ["/api/v1/properties/"] });
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "An error occurred while processing your request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle viewing admin feedback
  const handleViewFeedback = () => {
    setShowAdminFeedbackModal(true);
  };
  
  const displayAmenities = (amenities: string[] | undefined) => {
    if (!amenities || !Array.isArray(amenities) || amenities.length === 0) {
      return "None specified";
    }
    
    return amenities
      .map(amenity => amenity.replace(/_/g, ' '))
      .slice(0, 3)
      .join(", ") + (amenities.length > 3 ? ` +${amenities.length - 3} more` : "");
  };
  
  const displayHuntingTypes = (huntingTypes: string[] | undefined) => {
    if (!huntingTypes || !Array.isArray(huntingTypes) || huntingTypes.length === 0) {
      return "None specified";
    }
    
    return huntingTypes.join(", ");
  };
  
  const getMainImage = () => {
    if (property.images && Array.isArray(property.images) && property.images.length > 0) {
      return property.images[0];
    }
    return "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400";
  };
  
  // Formatting the address
  const formatLocation = () => {
    return `${property.city}, ${property.state}`;
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative h-48">
        <img 
          src={getMainImage()} 
          alt={property.title} 
          className="w-full h-full object-cover"
        />
        <Badge className="absolute top-2 right-2 bg-primary">
          {property.status}
        </Badge>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{property.title}</CardTitle>
        <CardDescription className="flex items-center">
          <MapPin className="h-4 w-4 mr-1" /> {formatLocation()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-2">
        <div className="text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-gray-500 flex items-center">
              <Home className="h-4 w-4 mr-1" /> Type
            </span>
            <span className="font-medium">{property.propertyType}</span>
          </div>
          
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Category</span>
            <span className="font-medium">{property.category}</span>
          </div>
          
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Amenities</span>
            <span className="font-medium">{displayAmenities(property.amenities as string[])}</span>
          </div>
          
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Size</span>
            <span className="font-medium">{property.size} {property.sizeUnit}</span>
          </div>
          
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Price</span>
            <span className="font-medium">${property.price}/{property.priceUnit}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-500">Capacity</span>
            <span className="font-medium">{property.capacity} guests</span>
          </div>
        </div>
        
        <Separator />
        
        <div className="text-sm">
          <p className="text-gray-600 line-clamp-3">{property.description}</p>
          <Button variant="link" className="p-0 h-auto text-xs" asChild>
            <a href={`/properties/${property.id}`} target="_blank">
              View full details <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="justify-between">
        {viewOnly ? (
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <a href={`/properties/${property.id}`} target="_blank" className="flex items-center">
              <ExternalLink className="h-4 w-4 mr-1" />
              View Details
            </a>
          </Button>
        ) : (
          <>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleApproval("rejected")}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1 text-destructive" />
                Reject
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleApproval("documents_needed")}
                disabled={isLoading}
              >
                <FileQuestion className="h-4 w-4 mr-1 text-amber-500" />
                Request Docs
              </Button>
            </div>
            <Button 
              size="sm" 
              onClick={() => handleApproval("active")}
              disabled={isLoading}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </>
        )}
      </CardFooter>
      
      {/* Add feedback badge if property has adminFeedback */}
      {property.adminFeedback && (
        <div className="absolute top-2 left-2">
          <Badge 
            variant="secondary" 
            className="cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-800"
            onClick={handleViewFeedback}
          >
            <FileQuestion className="h-3 w-3 mr-1" />
            View Feedback
          </Badge>
        </div>
      )}
      
      {/* Feedback Modal for Document Requests */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Additional Documents</DialogTitle>
            <DialogDescription>
              Specify what additional documents or information you need from the property owner.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="Please provide specific details about what documents are needed..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleApproval("documents_needed")}
              disabled={!feedbackText.trim()}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal for viewing admin feedback */}
      <Dialog open={showAdminFeedbackModal} onOpenChange={setShowAdminFeedbackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Feedback</DialogTitle>
            <DialogDescription>
              The following feedback was provided for this property.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-amber-50 p-4 border border-amber-200 rounded-md mt-2">
            <p className="text-amber-800 whitespace-pre-wrap">{property.adminFeedback}</p>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowAdminFeedbackModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
