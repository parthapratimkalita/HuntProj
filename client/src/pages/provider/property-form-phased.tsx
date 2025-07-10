import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Property } from "@/types/property";
import { z } from "zod";

// Import modular components
import BasicInfoSection from "@/components/properties/property-form/basic-info-section";
import LocationSection from "@/components/properties/property-form/location-section";
import HuntingPackagesSection from "@/components/properties/property-form/hunting-packages-section";
import AccommodationsSection from "@/components/properties/property-form/accommodations-section";
import FacilitiesSection from "@/components/properties/property-form/facilities-section";
import PropertyImagesSection from "@/components/properties/property-form/property-images-section";
import AdditionalInfoSection from "@/components/properties/property-form/additional-info-section";

import {
  PropertyFormData,
  propertyFormSchema,
  propertyDraftSchema,
  transformFormDataForSubmission,
  createNewHuntingPackage,
  createNewAccommodation,
  createNewAcreageBreakdown,
  createNewWildlifeInfo,
  sanitizeHuntingPackage,
  sanitizeAccommodation,        // ADD THIS
  sanitizeAcreageBreakdown,     // ADD THIS
  sanitizeWildlifeInfo,         // ADD THIS
  HuntingPackage,
  AccommodationOption,
  AcreageBreakdown,
  WildlifeInfo,
} from "@/components/properties/property-form/property-form-schema";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  ArrowLeft, 
  Save, 
  ArrowRight, 
  CheckCircle, 
  Info, 
  FileText,
  AlertTriangle,
  Lock 
} from "lucide-react";

interface PropertyFormPhasedProps {
  property?: Property;
}

export default function PropertyFormPhased({ property : initialProperty }: PropertyFormPhasedProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const [property, setProperty] = useState<Property | undefined>(initialProperty);
  
  // Phase management
  const [currentPhase, setCurrentPhase] = useState(() => {
    if (!property) return 1;
    if (property.status !== "DRAFT") return 2; // Non-drafts can access both phases
    return (property as any).draft_completed_phase || 1;
  });
  
  
  
  const [isDraft, setIsDraft] = useState(property?.status === "DRAFT" || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Image handling
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [profileImageIndex, setProfileImageIndex] = useState<number>(0);
  
  // Dynamic form arrays - Initialize with proper data structures
  const [huntingPackages, setHuntingPackages] = useState<HuntingPackage[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationOption[]>([]);
  const [acreageBreakdown, setAcreageBreakdown] = useState<AcreageBreakdown[]>([]);
  const [wildlifeInfo, setWildlifeInfo] = useState<WildlifeInfo[]>([]);
  
  const isProvider = user?.role === "provider" && 
    user?.host_application_status?.toLowerCase() === "approved";
  
  // Determine which schema to use based on phase
  const currentSchema = currentPhase === 1 ? propertyDraftSchema : propertyFormSchema;
  
  const form = useForm<PropertyFormData>({
    resolver: zodResolver(currentSchema),
    mode: "onChange",
    defaultValues: {
      propertyName: property?.property_name || "",
      description: property?.description || "",
      address: property?.address || "",
      city: property?.city || "",
      state: property?.state || "",
      zipCode: property?.zip_code || "",
      country: property?.country || "United States",
      latitude: property?.latitude?.toString() || "",
      longitude: property?.longitude?.toString() || "",
      totalAcres: property?.total_acres || 0,
      //terrain: property?.primary_terrain || "",
      acreageBreakdown: [],
      wildlifeInfo: [],
      huntingPackages: [],
      accommodations: [],
      facilities: property?.facilities || [],
      rules: property?.rules || "",
      safety: property?.safety_info || "",
      licenses: property?.license_requirements || "",
      seasonInfo: property?.season_info || "",
      propertyImages: undefined,
      status: property?.status || "DRAFT",
    },
  });

  // Load existing property data and properly parse JSON fields
  useEffect(() => {
    if (property) {
      console.log('Loading property data:', property);
      
      setIsDraft(property.status === "DRAFT");
      
      // Handle phase determination more safely
      const draftPhase = (property as any).draft_completed_phase;
      if (property.status === "DRAFT") {
        setCurrentPhase(draftPhase || 1);
      } else {
        setCurrentPhase(2); // Non-drafts default to phase 2
      }
      
      // Update all form values immediately when property data loads
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
      //form.setValue('terrain', property.primary_terrain || '');
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
          console.log('Loaded hunting packages:', packages);
        } catch (error) {
          console.error('Error parsing hunting packages:', error);
          setHuntingPackages([createNewHuntingPackage()]);
        }
      } else {
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
      
      // Parse wildlife info - FIXED: Preserve species values properly
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
        const urls = property.property_images.map((img: any) => 
          typeof img === 'string' ? img : img.url
        );
        setUploadedImageUrls(urls);
      }
      setProfileImageIndex(property.profile_image_index || 0);
    } else {
      // Initialize new property with defaults
      setHuntingPackages([createNewHuntingPackage()]);
      setAccommodations([createNewAccommodation()]);
      setAcreageBreakdown([createNewAcreageBreakdown()]);
      setWildlifeInfo([createNewWildlifeInfo()]);
    }
  }, [property, form]);

  // Sync arrays with form - only sync when arrays actually change
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

  // Handlers for dynamic arrays
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
      
      // Handle accommodation status changes
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

  // Save draft handler with proper JSON serialization
  const handleSaveDraft = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive",
      });
      return;
    }

    if (uploadedImageUrls.length === 0) {
      toast({
        title: "Profile Image Required",
        description: "Please upload at least one image for the property profile",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formData = form.getValues();
      
      // Prepare data with current state arrays (more reliable than form data)
      const draftData = {
        ...formData,
        // Use state arrays instead of form arrays
        huntingPackages: huntingPackages.map(pkg => sanitizeHuntingPackage(pkg)),
        accommodations: accommodations,
        acreageBreakdown: acreageBreakdown,
        wildlifeInfo: wildlifeInfo,
      };
      
      const transformedData = transformFormDataForSubmission(
        draftData, 
        uploadedImageUrls, 
        profileImageIndex
      );

      // Add draft-specific fields
      const draftSubmissionData = {
        ...transformedData,
        draft_completed_phase: currentPhase,
        is_listed: false,
      };

      console.log('Saving draft with data:', draftSubmissionData);

      let response;
      if (property?.id) {
        // Update existing draft
        response = await apiRequest("PUT", `/api/v1/properties/${property.id}`, draftSubmissionData);
      } else {
        // Create new draft
        response = await apiRequest("POST", "/api/v1/properties/draft", draftSubmissionData);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Draft save error:', errorText);
        throw new Error("Failed to save draft");
      }

      const result = await response.json();
      console.log('Draft saved successfully:', result);
      
      toast({
        title: "Draft Saved!",
        description: "Your property draft has been saved. You can continue editing later.",
      });

      // Redirect to dashboard
      setLocation("/provider/dashboard");
      
    } catch (error) {
      console.error('Draft save error:', error);
      toast({
        title: "Error saving draft",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Continue to phase 2
  const handleContinueToPhase2 = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Please complete all required fields",
        description: "Fix the errors before continuing to phase 2",
        variant: "destructive",
      });
      return;
    }

    if (uploadedImageUrls.length === 0) {
      toast({
        title: "Profile Image Required",
        description: "Please upload at least one image before continuing",
        variant: "destructive",
      });
      return;
    }

    // Save draft with phase 1 completion if this is a new property
    if (!property?.id) {
      setIsSubmitting(true);
      try {
        const formData = form.getValues();
        
        const draftData = {
          ...formData,
          huntingPackages: huntingPackages.map(pkg => sanitizeHuntingPackage(pkg)),
          accommodations: accommodations,
          acreageBreakdown: acreageBreakdown,
          wildlifeInfo: wildlifeInfo,
        };
        
        const transformedData = transformFormDataForSubmission(
          draftData, 
          uploadedImageUrls, 
          profileImageIndex
        );

        const draftSubmissionData = {
          ...transformedData,
          draft_completed_phase: 1,
          is_listed: false,
        };

        const response = await apiRequest("POST", "/api/v1/properties/draft", draftSubmissionData);
        
        if (!response.ok) {
          throw new Error("Failed to save phase 1");
        }
        
        const createdDraft = await response.json();
        
        // ✅ Update local property state with created draft
        setProperty(createdDraft);
        setIsDraft(true);

        toast({
          title: "Phase 1 completed!",
          description: "Moving to phase 2 to add hunting packages and accommodations.",
        });
      } catch (error) {
        toast({
          title: "Error saving phase 1",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      } finally {
        setIsSubmitting(false);
      }
    }
    
    setCurrentPhase(2);
  };

  // Complete property submission with proper JSON handling
  const handleCompleteProperty = async (data: PropertyFormData) => {
    if (!huntingPackages.length || !accommodations.length) {
      toast({
        title: "Missing Information",
        description: "Please add at least one hunting package and accommodation",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Use state arrays instead of form data for more reliability
      const completeData = {
        ...data,
        huntingPackages: huntingPackages.map(pkg => sanitizeHuntingPackage(pkg)),
        accommodations: accommodations,
        acreageBreakdown: acreageBreakdown,
        wildlifeInfo: wildlifeInfo,
        facilities: data.facilities || [],
      };
      
      const transformedData = transformFormDataForSubmission(
        completeData, 
        uploadedImageUrls, 
        profileImageIndex
      );

      // Add completion fields
      const completionData = {
        ...transformedData,
        draft_completed_phase: 2,
        status: 'PENDING', // Submit for approval
      };

      console.log('Completing property with data:', completionData);

      let response;
      if (property?.id && isDraft) {
        // Complete existing draft
        response = await apiRequest("PUT", `/api/v1/properties/${property.id}/complete`, completionData);
      } else {
        // Create new complete property
        response = await apiRequest("POST", "/api/v1/properties/", completionData);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Property completion error:', errorText);
        throw new Error("Failed to complete property");
      }

      const result = await response.json();
      console.log('Property completed successfully:', result);

      toast({
        title: "Property Submitted! 🎉",
        description: "Your property has been submitted for approval.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/v1/properties/"] });
      setLocation("/provider/dashboard");
      
    } catch (error) {
      console.error('Property completion error:', error);
      toast({
        title: "Error submitting property",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isProvider) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must be an approved provider to create properties.
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  const hasUnuploadedImages = selectedImages.length > uploadedImageUrls.length;

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
        
        {/* FIXED: Made form wider by changing max-width from max-w-4xl to max-w-6xl */}
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                {property ? "Edit Property" : "Add New Hunting Ground"}
              </CardTitle>
              <CardDescription>
              Create a personal landing page to present your hunting ground to other hunters.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCompleteProperty)}>
                  <Tabs value={`phase-${currentPhase}`} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger 
                        value="phase-1" 
                        onClick={() => currentPhase > 1 && setCurrentPhase(1)}
                      >
                        <div className="flex items-center gap-2">
                          <span>Phase 1: Basic Info</span>
                          {((property as any)?.draft_completed_phase >= 1 || currentPhase > 1) && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="phase-2" 
                        onClick={() => currentPhase < 2 && property?.id && setCurrentPhase(2)}
                        disabled={!property?.id && currentPhase === 1}
                      >
                        Phase 2: Packages & Details
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="phase-1" className="space-y-8 mt-6">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Complete basic information about your property. You can save as draft and continue later.
                        </AlertDescription>
                      </Alert>

                      {/* Property Name Field - Only show for new properties */}
                      {!property && (
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
                      )}

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
                      
                      <LocationSection 
                        form={form} 
                        isApproved={property?.status === "APPROVED"}
                      />
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">Profile Image</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Upload at least one image to be used as the profile image for your property
                        </p>
                        <PropertyImagesSection
                          form={form}
                          selectedImages={selectedImages}
                          setSelectedImages={setSelectedImages}
                          profileImageIndex={profileImageIndex}
                          setProfileImageIndex={setProfileImageIndex}
                          isSubmitting={isSubmitting}
                          uploadedImageUrls={uploadedImageUrls}
                          setUploadedImageUrls={setUploadedImageUrls}
                        />
                      </div>
                      
                      <div className="flex justify-between gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSaveDraft}
                          disabled={isSubmitting || hasUnuploadedImages}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save as Draft
                        </Button>
                        
                        <Button
                          type="button"
                          onClick={handleContinueToPhase2}
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
                          Complete hunting packages and accommodation details to submit your property for approval.
                        </AlertDescription>
                      </Alert>

                      <HuntingPackagesSection
                        huntingPackages={huntingPackages}
                        accommodations={accommodations}
                        onUpdatePackage={updateHuntingPackage}
                        onAddPackage={addHuntingPackage}
                        onRemovePackage={removeHuntingPackage}
                      />
                      
                      <AccommodationsSection
                        accommodations={accommodations}
                        onUpdateAccommodation={updateAccommodation}
                        onAddAccommodation={addAccommodation}
                        onRemoveAccommodation={removeAccommodation}
                      />
                      
                      <FacilitiesSection form={form} />
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">Additional Property Images</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Add more images to showcase your property (optional)
                        </p>
                        <PropertyImagesSection
                          form={form}
                          selectedImages={selectedImages}
                          setSelectedImages={setSelectedImages}
                          profileImageIndex={profileImageIndex}
                          setProfileImageIndex={setProfileImageIndex}
                          isSubmitting={isSubmitting}
                          uploadedImageUrls={uploadedImageUrls}
                          setUploadedImageUrls={setUploadedImageUrls}
                        />
                      </div>
                      
                      <AdditionalInfoSection form={form} />
                      
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={isSubmitting || hasUnuploadedImages}
                          size="lg"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Complete & Submit for Approval
                            </>
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
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