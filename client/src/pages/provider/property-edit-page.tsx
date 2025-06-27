import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Property } from "@/types/property";

// Import all the modular components
import BasicInfoSection from "@/components/properties/property-form/basic-info-section";
import LocationSection from "@/components/properties/property-form/location-section";
import HuntingPackagesSection from "@/components/properties/property-form/hunting-packages-section";
import AccommodationsSection from "@/components/properties/property-form/accommodations-section";
import FacilitiesSection from "@/components/properties/property-form/facilities-section";
import PropertyImagesSection from "@/components/properties/property-form/property-images-section";
import AdditionalInfoSection from "@/components/properties/property-form/additional-info-section";

import {
  PropertyFormData,
  HuntingPackage,
  AccommodationOption,
  AcreageBreakdown,
  WildlifeInfo,
  propertyUpdateFormSchema,
  propertyFormSchema,
  transformFormDataForSubmission,
  createNewHuntingPackage,
  createNewAccommodation,
  createNewAcreageBreakdown,
  createNewWildlifeInfo,
  sanitizeHuntingPackage,
  sanitizeAccommodation,
  sanitizeAcreageBreakdown,
  sanitizeWildlifeInfo,
} from "@/components/properties/property-form/property-form-schema";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  ArrowLeft, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Image as ImageIcon,
  Lock,
  Save,
  ArrowRight,
  FileText,
  Eye,
  EyeOff,
  MapPin,
  Home,
  Shield
} from "lucide-react";

interface PropertyEditPageProps {
  id: string;
}

export default function PropertyEditPage({ id }: PropertyEditPageProps) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const searchParams = useSearch();
  const continueDraft = searchParams.includes('continue_draft=true');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [isDraft, setIsDraft] = useState(false);
  const [draftProgress, setDraftProgress] = useState(0);
  
  // Image handling states
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [profileImageIndex, setProfileImageIndex] = useState<number>(0);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

  // Dynamic form states
  const [huntingPackages, setHuntingPackages] = useState<HuntingPackage[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationOption[]>([]);
  const [acreageBreakdown, setAcreageBreakdown] = useState<AcreageBreakdown[]>([]);
  const [wildlifeInfo, setWildlifeInfo] = useState<WildlifeInfo[]>([]);
  
  const isProvider = user?.role === "provider" && 
    (user?.hostApplicationStatus || user?.host_application_status)?.toLowerCase() === "approved";
  
  // Fetch existing property data
  const { data: property, isLoading: isLoadingProperty } = useQuery<Property>({
    queryKey: [`/api/v1/properties/${id}`],
    enabled: !!id && !!user && isProvider,
  });

  // Form initialization
  const form = useForm<PropertyFormData>({
    resolver: zodResolver(property?.status === "DRAFT" ? propertyFormSchema : propertyUpdateFormSchema),
    mode: "onChange",
    defaultValues: {
      propertyName: "",
      description: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      latitude: "",
      longitude: "",
      totalAcres: 0,
      terrain: "",
      acreageBreakdown: [],
      wildlifeInfo: [],
      huntingPackages: [],
      accommodations: [],
      facilities: [],
      rules: "",
      safety: "",
      licenses: "",
      seasonInfo: "",
      propertyImages: undefined,
      status: "PENDING",
    },
  });

  // Calculate draft completion progress
  const calculateDraftProgress = () => {
    let progress = 0;
    const phase1Fields = 25; // Each field worth ~4%
    const phase2Fields = 25;
    
    // Phase 1 progress
    if (form.getValues('propertyName')) progress += 4;
    if (form.getValues('description')) progress += 4;
    if (form.getValues('address')) progress += 4;
    if (form.getValues('city')) progress += 4;
    if (form.getValues('state')) progress += 4;
    if (form.getValues('zipCode')) progress += 4;
    if (form.getValues('latitude')) progress += 4;
    if (form.getValues('longitude')) progress += 4;
    if (form.getValues('totalAcres')) progress += 4;
    if (uploadedImageUrls.length > 0) progress += 10;
    
    // Phase 2 progress
    if (huntingPackages.length > 0) progress += 25;
    if (accommodations.length > 0) progress += 25;
    
    setDraftProgress(Math.min(progress, 100));
  };

  // Load property data into form when fetched
  useEffect(() => {
    if (property) {
      console.log('Loading property data:', property);
      
      // Set draft status and phase
      setIsDraft(property.status === "DRAFT");
      const draftPhase = (property as any).draft_completed_phase;
      setCurrentPhase(draftPhase || 1);
      
      // If continuing draft and it's phase 1, move to phase 2
      if (continueDraft && property.status === "DRAFT" && draftPhase === 1) {
        setCurrentPhase(2);
      }
      
      // Basic fields
      form.setValue('propertyName', property.property_name);
      form.setValue('description', property.description);
      form.setValue('address', property.address);
      form.setValue('city', property.city);
      form.setValue('state', property.state);
      form.setValue('zipCode', property.zip_code);
      form.setValue('country', property.country || 'United States');
      form.setValue('latitude', property.latitude?.toString() || '');
      form.setValue('longitude', property.longitude?.toString() || '');
      form.setValue('totalAcres', property.total_acres);
      form.setValue('terrain', property.primary_terrain || '');
      
      // Additional fields
      form.setValue('rules', property.rules || '');
      form.setValue('safety', property.safety_info || '');
      form.setValue('licenses', property.license_requirements || '');
      form.setValue('seasonInfo', property.season_info || '');
      form.setValue('facilities', property.facilities || []);
      
      // Parse hunting packages
      if (property.hunting_packages && property.hunting_packages.length > 0) {
        try {
          const packages = property.hunting_packages.map((pkg: any) => {
            if (typeof pkg === 'object' && pkg !== null) {
              return sanitizeHuntingPackage(pkg);
            }
            if (typeof pkg === 'string') {
              return sanitizeHuntingPackage(JSON.parse(pkg));
            }
            return sanitizeHuntingPackage(pkg);
          });
          setHuntingPackages(packages);
          form.setValue('huntingPackages', packages);
        } catch (error) {
          console.error('Error parsing hunting packages:', error);
          setHuntingPackages([createNewHuntingPackage()]);
        }
      } else if (property.status === "DRAFT") {
        setHuntingPackages([createNewHuntingPackage()]);
      }
      
      // Parse accommodations
      if (property.accommodations && property.accommodations.length > 0) {
        try {
          const accoms = property.accommodations.map((acc: any) => {
            if (typeof acc === 'object' && acc !== null) {
              return sanitizeAccommodation(acc);  // USE SANITIZER
            }
            if (typeof acc === 'string') {
              return sanitizeAccommodation(JSON.parse(acc));  // USE SANITIZER
            }
            return sanitizeAccommodation(acc);  // USE SANITIZER
          });
          setAccommodations(accoms);
          form.setValue('accommodations', accoms);
          console.log('Loaded accommodations:', accoms);
        } catch (error) {
          console.error('Error parsing accommodations:', error);
          setAccommodations([createNewAccommodation()]);
        }
      } else {
        setAccommodations([createNewAccommodation()]);
      }
      
      // Parse acreage breakdown
      if (property.acreage_breakdown && property.acreage_breakdown.length > 0) {
        try {
          const breakdown = property.acreage_breakdown.map((item: any) => {
            if (typeof item === 'object' && item !== null) {
              return sanitizeAcreageBreakdown(item);  // USE SANITIZER
            }
            if (typeof item === 'string') {
              return sanitizeAcreageBreakdown(JSON.parse(item));  // USE SANITIZER
            }
            return sanitizeAcreageBreakdown(item);  // USE SANITIZER
          });
          setAcreageBreakdown(breakdown);
          form.setValue('acreageBreakdown', breakdown);
        } catch (error) {
          console.error('Error parsing acreage breakdown:', error);
          setAcreageBreakdown([createNewAcreageBreakdown()]);
        }
      } else {
        setAcreageBreakdown([createNewAcreageBreakdown()]);
      }
      
      // Parse wildlife info - FIXED: Handle species properly
      if (property.wildlife_info && property.wildlife_info.length > 0) {
        try {
          const wildlife = property.wildlife_info.map((item: any) => {
            if (typeof item === 'object' && item !== null) {
              return sanitizeWildlifeInfo(item);  // USE SANITIZER
            }
            if (typeof item === 'string') {
              return sanitizeWildlifeInfo(JSON.parse(item));  // USE SANITIZER
            }
            return sanitizeWildlifeInfo(item);  // USE SANITIZER
          });
          setWildlifeInfo(wildlife);
          form.setValue('wildlifeInfo', wildlife);
          console.log('Loaded wildlife info with species:', wildlife);
        } catch (error) {
          console.error('Error parsing wildlife info:', error);
          setWildlifeInfo([createNewWildlifeInfo()]);
        }
      } else {
        setWildlifeInfo([createNewWildlifeInfo()]);
      }
      
      // Images
      if (property.property_images && property.property_images.length > 0) {
        const imageUrls = property.property_images.map((img: any) => 
          typeof img === 'string' ? img : img.url
        );
        setExistingImageUrls(imageUrls);
        setUploadedImageUrls(imageUrls);
        form.setValue('propertyImages', imageUrls as any);
      }
      setProfileImageIndex(property.profile_image_index || 0);
      
      // Calculate initial progress for drafts
      if (property.status === "DRAFT") {
        calculateDraftProgress();
      }
    }
  }, [property, form, continueDraft]);

  // Sync arrays with form
  useEffect(() => {
    if (huntingPackages.length > 0) {
      form.setValue('huntingPackages', huntingPackages, { shouldValidate: false });
    }
  }, [huntingPackages, form]);

  useEffect(() => {
    if (accommodations.length > 0) {
      form.setValue('accommodations', accommodations, { shouldValidate: false });
    }
  }, [accommodations, form]);

  useEffect(() => {
    if (acreageBreakdown.length > 0) {
      form.setValue('acreageBreakdown', acreageBreakdown, { shouldValidate: false });
    }
  }, [acreageBreakdown, form]);

  useEffect(() => {
    if (wildlifeInfo.length > 0) {
      form.setValue('wildlifeInfo', wildlifeInfo, { shouldValidate: false });
    }
  }, [wildlifeInfo, form]);

  // Calculate progress when form values change
  useEffect(() => {
    if (isDraft) {
      calculateDraftProgress();
    }
  }, [form.watch(), huntingPackages, accommodations, uploadedImageUrls]);

  // Authentication redirect
  useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation("/auth");
      } else if (!isProvider) {
        toast({
          title: "Access Denied",
          description: "You must be an approved provider to edit properties",
          variant: "destructive",
        });
        setLocation("/");
      }
    }
  }, [loading, user, isProvider, setLocation, toast]);
  
  // Handler functions
  const addHuntingPackage = () => {
    const newPackage = createNewHuntingPackage();
    setHuntingPackages(prev => [...prev, newPackage]);
  };
  
  const removeHuntingPackage = (index: number) => {
    if (huntingPackages.length > 1) {
      setHuntingPackages(prev => prev.filter((_, i) => i !== index));
    }
  };
  
  const updateHuntingPackage = (index: number, field: keyof HuntingPackage, value: any) => {
    setHuntingPackages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'accommodationStatus' && value === 'without') {
        updated[index].defaultAccommodation = '';
      }
      
      return updated;
    });
  };
  
  const addAccommodation = () => {
    const newAccommodation = createNewAccommodation();
    setAccommodations(prev => [...prev, newAccommodation]);
  };
  
  const removeAccommodation = (index: number) => {
    if (accommodations.length > 1) {
      setAccommodations(prev => prev.filter((_, i) => i !== index));
    }
  };
  
  const updateAccommodation = (index: number, field: keyof AccommodationOption, value: any) => {
    setAccommodations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addAcreageBreakdown = () => {
    const newBreakdown = createNewAcreageBreakdown();
    setAcreageBreakdown(prev => [...prev, newBreakdown]);
  };
  
  const removeAcreageBreakdown = (index: number) => {
    if (acreageBreakdown.length > 0) {
      setAcreageBreakdown(prev => prev.filter((_, i) => i !== index));
    }
  };
  
  const updateAcreageBreakdown = (index: number, field: keyof AcreageBreakdown, value: any) => {
    setAcreageBreakdown(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addWildlife = () => {
    const newWildlife = createNewWildlifeInfo();
    setWildlifeInfo(prev => [...prev, newWildlife]);
  };
  
  const removeWildlife = (index: number) => {
    if (wildlifeInfo.length > 0) {
      setWildlifeInfo(prev => prev.filter((_, i) => i !== index));
    }
  };
  
  const updateWildlife = (index: number, field: keyof WildlifeInfo, value: any) => {
    setWildlifeInfo(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Save as draft handler
  const handleSaveDraft = async () => {
    if (!user || !isProvider) {
      toast({
        title: "Authentication error",
        description: "You must be logged in as an approved provider",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const draftData = form.getValues();
      const updateData = {
        ...draftData,
        huntingPackages: huntingPackages,
        accommodations: accommodations,
        acreageBreakdown: acreageBreakdown,
        wildlifeInfo: wildlifeInfo,
      };
      
      const propertyData = transformFormDataForSubmission(updateData, uploadedImageUrls, profileImageIndex);
      
      // Add draft phase info
      const draftSubmissionData = {
        ...propertyData,
        draft_completed_phase: currentPhase,
      };
      
      const response = await apiRequest("PUT", `/api/v1/properties/${id}`, draftSubmissionData);
      
      if (!response.ok) {
        throw new Error("Failed to save draft");
      }
      
      toast({
        title: "Draft saved!",
        description: "Your property draft has been saved. You can continue editing later.",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/v1/properties/${id}`] });
      
    } catch (error) {
      toast({
        title: "Error saving draft",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete property handler (for drafts)
  const handleCompleteProperty = async (data: PropertyFormData) => {
    if (!user || !isProvider) {
      toast({
        title: "Authentication error",
        description: "You must be logged in as an approved provider",
        variant: "destructive",
      });
      return;
    }

    // Validation for phase 2
    if (!huntingPackages || huntingPackages.length === 0) {
      toast({
        title: "Missing information",
        description: "Please add at least one hunting package",
        variant: "destructive",
      });
      return;
    }

    if (!accommodations || accommodations.length === 0) {
      toast({
        title: "Missing information", 
        description: "Please add at least one accommodation option",
        variant: "destructive",
      });
      return;
    }

    const hasUnuploadedImages = selectedImages.length > uploadedImageUrls.length - existingImageUrls.length;
    if (hasUnuploadedImages) {
      toast({
        title: "Upload images first",
        description: "Please upload all new images before completing the property",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updateData = {
        ...data,
        huntingPackages: huntingPackages,
        accommodations: accommodations,
        acreageBreakdown: acreageBreakdown,
        wildlifeInfo: wildlifeInfo,
      };
      
      const propertyData = transformFormDataForSubmission(updateData, uploadedImageUrls, profileImageIndex);
      
      // Use the complete endpoint for drafts
      const endpoint = property?.status === "DRAFT" 
        ? `/api/v1/properties/${id}/complete`
        : `/api/v1/properties/${id}`;
      
      const response = await apiRequest("PUT", endpoint, propertyData);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to complete property");
      }
      
      toast({
        title: "Property completed! 🎉",
        description: "Your property has been submitted for approval.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/v1/properties/"] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/properties/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/properties/my-properties"] });
      
      setLocation("/provider/dashboard");
      
    } catch (error) {
      console.error('Complete error:', error);
      toast({
        title: "Error completing property",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update property handler (for non-drafts)
  const handleUpdateProperty = async (data: PropertyFormData) => {
    if (!user || !isProvider) {
      toast({
        title: "Authentication error",
        description: "You must be logged in as an approved provider",
        variant: "destructive",
      });
      return;
    }

    const hasUnuploadedImages = selectedImages.length > uploadedImageUrls.length - existingImageUrls.length;
    if (hasUnuploadedImages) {
      toast({
        title: "Upload images first",
        description: "Please upload all new images before saving",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updateData = {
        ...data,
        huntingPackages: huntingPackages,
        accommodations: accommodations,
        acreageBreakdown: acreageBreakdown,
        wildlifeInfo: wildlifeInfo,
      };
      
      const propertyData = transformFormDataForSubmission(updateData, uploadedImageUrls, profileImageIndex);
      
      const response = await apiRequest("PUT", `/api/v1/properties/${id}`, propertyData);
      
      if (!response.ok) {
        throw new Error("Failed to update property");
      }
      
      toast({
        title: "Property updated successfully!",
        description: "Your changes have been saved.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/v1/properties/"] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/properties/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/properties/my-properties"] });
      
      setLocation("/provider/dashboard");
      
    } catch (error) {
      toast({
        title: "Error updating property",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Main form submission handler
  const onSubmit = async (data: PropertyFormData) => {
    if (property?.status === "DRAFT") {
      await handleCompleteProperty(data);
    } else {
      await handleUpdateProperty(data);
    }
  };

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "text-green-600 bg-green-50 border-green-200";
      case "PENDING": return "text-amber-600 bg-amber-50 border-amber-200";
      case "REJECTED": return "text-red-600 bg-red-50 border-red-200";
      case "DRAFT": return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (loading || isLoadingProperty) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading property data...</p>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  if (!user || !isProvider || !property) {
    return null;
  }

  const hasUnuploadedImages = selectedImages.length > uploadedImageUrls.length - existingImageUrls.length;
  const canSubmit = !isSubmitting && !hasUnuploadedImages;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={() => setLocation("/provider/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        {/* FIXED: Made form wider by changing max-width */}
        <div className="max-w-6xl mx-auto">
          {/* Property Header Card */}
          <Card className="mb-6 border-t-4 border-t-primary">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    {isDraft ? (
                      <>
                        <FileText className="h-6 w-6 text-blue-600" />
                        Complete Your Property Draft
                      </>
                    ) : (
                      <>
                        <Home className="h-6 w-6 text-primary" />
                        Edit Property
                      </>
                    )}
                  </CardTitle>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {property.property_name} • {property.city}, {property.state}
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`px-3 py-1 ${getStatusColor(property.status)}`}
                >
                  {property.status}
                </Badge>
              </div>
              
              {isDraft && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Completion Progress</span>
                    <span className="text-sm text-muted-foreground">{draftProgress}%</span>
                  </div>
                  <Progress value={draftProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Complete all required information to submit for approval
                  </p>
                </div>
              )}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>
                {isDraft ? (
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Complete your property listing by adding hunting packages and accommodations.
                  </span>
                ) : property.status === "APPROVED" ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    Property name and location cannot be changed after approval.
                  </span>
                ) : (
                  "Update your property details, hunting packages, and accommodations."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Lock warning for approved properties */}
              {property.status === "APPROVED" && (
                <Alert className="mb-6 border-amber-200 bg-amber-50">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Limited Editing</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    This property is approved and {property.is_listed ? 'currently listed' : 'currently unlisted'}. 
                    Property name and location fields are locked and cannot be modified.
                    You can still update hunting packages, accommodations, and other details.
                  </AlertDescription>
                </Alert>
              )}

              {/* Admin feedback for rejected properties */}
              {property.status === "REJECTED" && property.admin_feedback && (
                <Alert className="mb-6 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Admin Feedback</AlertTitle>
                  <AlertDescription className="text-red-700">
                    {property.admin_feedback}
                  </AlertDescription>
                </Alert>
              )}

              {/* Listing status for approved properties */}
              {property.status === "APPROVED" && (
                <Alert className={`mb-6 ${property.is_listed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                {property.is_listed ? (
                  <>
                    <Eye className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      This property is <strong>listed</strong> and visible to hunters searching for properties.
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 text-gray-600" />
                    <AlertDescription className="text-gray-700">
                      This property is <strong>unlisted</strong> and hidden from search results.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}

            <Form {...form}>
              <form 
                className="space-y-8"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                {isDraft ? (
                  // Two-phase form for drafts
                  <Tabs value={`phase-${currentPhase}`} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger 
                        value="phase-1" 
                        onClick={() => setCurrentPhase(1)}
                      >
                        <div className="flex items-center gap-2">
                          Phase 1: Basic Info 
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="phase-2" 
                        onClick={() => setCurrentPhase(2)}
                        className={currentPhase === 2 ? "animate-pulse" : ""}
                      >
                        Phase 2: Packages & Details
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="phase-1" className="space-y-8 mt-6">
                      {/* Property Name - Only show for drafts */}
                      <div>
                        <h3 className="text-lg font-medium mb-4">Property Name</h3>
                        <FormField
                          control={form.control}
                          name="propertyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Property Name *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. Big Buck Ranch" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Separator />

                      <BasicInfoSection 
                        form={form}
                        acreageBreakdown={acreageBreakdown}
                        onUpdateAcreageBreakdown={updateAcreageBreakdown}
                        onAddAcreageBreakdown={addAcreageBreakdown}
                        onRemoveAcreageBreakdown={removeAcreageBreakdown}
                        wildlifeInfo={wildlifeInfo}
                        onUpdateWildlife={updateWildlife}
                        onAddWildlife={addWildlife}
                        onRemoveWildlife={removeWildlife}
                      />
                      
                      <Separator />
                      
                      <LocationSection 
                        form={form} 
                        isApproved={false} // Drafts are never approved
                      />
                      
                      <Separator />
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">Profile Image</h3>
                        <PropertyImagesSection
                          form={form}
                          selectedImages={selectedImages}
                          setSelectedImages={setSelectedImages}
                          profileImageIndex={profileImageIndex}
                          setProfileImageIndex={setProfileImageIndex}
                          isSubmitting={isSubmitting}
                          uploadedImageUrls={uploadedImageUrls}
                          setUploadedImageUrls={setUploadedImageUrls}
                          isEditMode={true}
                          existingImages={existingImageUrls}
                        />
                      </div>
                      
                      <div className="flex justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSaveDraft}
                          disabled={isSubmitting || hasUnuploadedImages}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Draft
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setCurrentPhase(2)}
                          disabled={hasUnuploadedImages}
                        >
                          Continue to Phase 2
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="phase-2" className="space-y-8 mt-6">
                      <Alert className="border-blue-200 bg-blue-50">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-700">
                          Complete the remaining information to submit your property for approval.
                        </AlertDescription>
                      </Alert>

                      <HuntingPackagesSection
                        huntingPackages={huntingPackages}
                        accommodations={accommodations}
                        onUpdatePackage={updateHuntingPackage}
                        onAddPackage={addHuntingPackage}
                        onRemovePackage={removeHuntingPackage}
                      />
                      
                      <Separator />
                      
                      <AccommodationsSection
                        accommodations={accommodations}
                        onUpdateAccommodation={updateAccommodation}
                        onAddAccommodation={addAccommodation}
                        onRemoveAccommodation={removeAccommodation}
                      />
                      
                      <Separator />
                      
                      <FacilitiesSection form={form} />
                      
                      <Separator />
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">Additional Property Images</h3>
                        <PropertyImagesSection
                          form={form}
                          selectedImages={selectedImages}
                          setSelectedImages={setSelectedImages}
                          profileImageIndex={profileImageIndex}
                          setProfileImageIndex={setProfileImageIndex}
                          isSubmitting={isSubmitting}
                          uploadedImageUrls={uploadedImageUrls}
                          setUploadedImageUrls={setUploadedImageUrls}
                          isEditMode={true}
                          existingImages={existingImageUrls}
                        />
                      </div>
                      
                      <Separator />
                      
                      <AdditionalInfoSection form={form} />
                    </TabsContent>
                  </Tabs>
                ) : (
                  // Regular edit form for non-drafts
                  <>
                    {/* Property Name - Show with lock status */}
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        Property Name
                        {property.status === "APPROVED" && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </h3>
                      <FormField
                        control={form.control}
                        name="propertyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                {...field} 
                                disabled={property.status === "APPROVED"}
                                className={property.status === "APPROVED" ? 'bg-gray-50' : ''}
                              />
                            </FormControl>
                            {property.status === "APPROVED" && (
                              <p className="text-xs text-gray-500 mt-1">
                                Property name cannot be changed after approval
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <BasicInfoSection 
                      form={form}
                      acreageBreakdown={acreageBreakdown}
                      onUpdateAcreageBreakdown={updateAcreageBreakdown}
                      onAddAcreageBreakdown={addAcreageBreakdown}
                      onRemoveAcreageBreakdown={removeAcreageBreakdown}
                      wildlifeInfo={wildlifeInfo}
                      onUpdateWildlife={updateWildlife}
                      onAddWildlife={addWildlife}
                      onRemoveWildlife={removeWildlife}
                    />
                    
                    <Separator />
                    
                    <LocationSection 
                      form={form} 
                      isApproved={property.status === "APPROVED"}
                    />
                    
                    <Separator />
                    
                    <HuntingPackagesSection
                      huntingPackages={huntingPackages}
                      accommodations={accommodations}
                      onUpdatePackage={updateHuntingPackage}
                      onAddPackage={addHuntingPackage}
                      onRemovePackage={removeHuntingPackage}
                    />
                    
                    <Separator />
                    
                    <AccommodationsSection
                      accommodations={accommodations}
                      onUpdateAccommodation={updateAccommodation}
                      onAddAccommodation={addAccommodation}
                      onRemoveAccommodation={removeAccommodation}
                    />
                    
                    <Separator />
                    
                    <FacilitiesSection form={form} />
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Property Images</h3>
                      {existingImageUrls.length > 0 && (
                        <Alert className="mb-4 border-green-200 bg-green-50">
                          <ImageIcon className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            <strong>{existingImageUrls.length} existing images</strong> are already uploaded. 
                            Adding new images is optional.
                          </AlertDescription>
                        </Alert>
                      )}
                      <PropertyImagesSection
                        form={form}
                        selectedImages={selectedImages}
                        setSelectedImages={setSelectedImages}
                        profileImageIndex={profileImageIndex}
                        setProfileImageIndex={setProfileImageIndex}
                        isSubmitting={isSubmitting}
                        uploadedImageUrls={uploadedImageUrls}
                        setUploadedImageUrls={setUploadedImageUrls}
                        isEditMode={true}
                        existingImages={existingImageUrls}
                      />
                    </div>
                    
                    <Separator />
                    
                    <AdditionalInfoSection form={form} />
                  </>
                )}
                
                <CardFooter className="flex flex-col space-y-4 px-0">
                  {/* Status alerts */}
                  {hasUnuploadedImages && (
                    <Alert className="w-full border-amber-200 bg-amber-50">
                      <Upload className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <strong>Upload Required:</strong> Please upload all new images before saving.
                      </AlertDescription>
                    </Alert>
                  )}

                  {property.status === "REJECTED" && property.admin_feedback && (
                    <Alert className="w-full border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Address Admin Feedback:</strong> {property.admin_feedback}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Draft completion helper */}
                  {isDraft && (
                    <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900 mb-1">Complete Your Draft</h4>
                          <p className="text-sm text-blue-700">
                            {currentPhase === 1 
                              ? "Complete Phase 1 and continue to add hunting packages and accommodations."
                              : "Add at least one hunting package and accommodation to submit for approval."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Submit buttons */}
                  <div className="w-full flex justify-between items-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/provider/dashboard")}
                    >
                      Cancel
                    </Button>
                    
                    <div className="flex gap-2">
                      {isDraft && currentPhase === 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSaveDraft}
                          disabled={isSubmitting || hasUnuploadedImages}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Draft
                        </Button>
                      )}
                      
                      <Button 
                        type="submit" 
                        disabled={!canSubmit || (isDraft && currentPhase === 1)} 
                        size="lg"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isDraft ? "Completing Property..." : "Updating Property..."}
                          </>
                        ) : isDraft ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Complete & Submit for Approval
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Update Property
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
    
    <Footer />
    <MobileNav />
  </div>
);
}