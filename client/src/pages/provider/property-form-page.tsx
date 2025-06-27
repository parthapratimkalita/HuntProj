import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

// Import modular components from components directory
import BasicInfoSection from "@/components/properties/property-form/basic-info-section";
import LocationSection from "@/components/properties/property-form/location-section";
import HuntingPackagesSection from "@/components/properties/property-form/hunting-packages-section";
import AccommodationsSection from "@/components/properties/property-form/accommodations-section";
import FacilitiesSection from "@/components/properties/property-form/facilities-section";
import PropertyImagesSection from "@/components/properties/property-form/property-images-section";
import AdditionalInfoSection from "@/components/properties/property-form/additional-info-section";

// Import schema and types from components directory
import {
  PropertyFormData,
  HuntingPackage,
  AccommodationOption,
  AcreageBreakdown,
  WildlifeInfo,
  propertyFormSchema,
  transformFormDataForSubmission,
  validatePropertyForm,
  createNewHuntingPackage,
  createNewAccommodation,
  createNewAcreageBreakdown,
  createNewWildlifeInfo,
  sanitizeHuntingPackage,
  validateSingleHuntingPackage
} from "@/components/properties/property-form/property-form-schema";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Upload, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PropertyFormPageProps {
  id?: string;
}

export default function PropertyFormPage({ id }: PropertyFormPageProps) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Image handling states for frontend upload
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [profileImageIndex, setProfileImageIndex] = useState<number>(0);

  // Dynamic form states with proper initialization
  const [huntingPackages, setHuntingPackages] = useState<HuntingPackage[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationOption[]>([]);
  const [acreageBreakdown, setAcreageBreakdown] = useState<AcreageBreakdown[]>([]);
  const [wildlifeInfo, setWildlifeInfo] = useState<WildlifeInfo[]>([]);
  
  const isEditMode = !!id;
  const isProvider = user?.role === "provider" && 
    (user?.hostApplicationStatus || user?.host_application_status)?.toLowerCase() === "approved";
  
  // Form initialization with proper resolver
  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
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

  // Initialize default data on mount
  useEffect(() => {
    console.log("🚀 Initializing form data...");
    
    // Initialize hunting packages with one default package
    if (huntingPackages.length === 0) {
      const defaultPackage = createNewHuntingPackage();
      setHuntingPackages([defaultPackage]);
      console.log("✅ Initialized default hunting package");
    }

    // Initialize accommodations with one default
    if (accommodations.length === 0) {
      const defaultAccommodation = createNewAccommodation();
      setAccommodations([defaultAccommodation]);
      console.log("✅ Initialized default accommodation");
    }

    // Initialize acreage breakdown
    if (acreageBreakdown.length === 0) {
      const defaultBreakdown = createNewAcreageBreakdown();
      setAcreageBreakdown([defaultBreakdown]);
      console.log("✅ Initialized default acreage breakdown");
    }

    // Initialize wildlife info (empty by default for new properties)
    if (wildlifeInfo.length === 0) {
      setWildlifeInfo([]);
      console.log("✅ Initialized empty wildlife info");
    }
  }, []); // Only run once on mount
  
  // Authentication and provider status redirect
  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log("No user found, redirecting to auth");
        setLocation("/auth");
      } else if (!isProvider) {
        console.log("User is not an approved provider, redirecting to home");
        toast({
          title: "Access Denied",
          description: "You must be an approved provider to create properties",
          variant: "destructive",
        });
        setLocation("/");
      }
    }
  }, [loading, user, isProvider, setLocation, toast]);

  // Sync arrays with form
  useEffect(() => {
    if (huntingPackages.length > 0) {
      const sanitizedPackages = huntingPackages.map(pkg => sanitizeHuntingPackage(pkg));
      form.setValue('huntingPackages', sanitizedPackages, {
        shouldValidate: false,
        shouldDirty: true,
      });
    }
  }, [huntingPackages.length]);

  useEffect(() => {
    if (accommodations.length > 0) {
      form.setValue('accommodations', accommodations);
    }
  }, [accommodations.length]);

  useEffect(() => {
    if (acreageBreakdown.length > 0) {
      form.setValue('acreageBreakdown', acreageBreakdown);
    }
  }, [acreageBreakdown.length]);

  useEffect(() => {
    form.setValue('wildlifeInfo', wildlifeInfo);
  }, [wildlifeInfo.length]);
  
  // ===============================
  // HUNTING PACKAGE HANDLERS
  // ===============================
  
  const addHuntingPackage = () => {
    console.log("➕ Adding new hunting package...");
    
    const newPackage = createNewHuntingPackage();
    const updated = [...huntingPackages, newPackage];
    
    setHuntingPackages(updated);
    
    toast({
      title: "Package added",
      description: `Hunting package ${updated.length} added successfully`,
    });
  };
  
  const removeHuntingPackage = (index: number) => {
    if (huntingPackages.length > 1) {
      console.log(`🗑️ Removing hunting package at index ${index}...`);
      
      const updated = huntingPackages.filter((_, i) => i !== index);
      setHuntingPackages(updated);
      
      toast({
        title: "Package removed",
        description: `Hunting package removed successfully`,
      });
    } else {
      toast({
        title: "Cannot remove",
        description: "At least one hunting package is required",
        variant: "destructive",
      });
    }
  };
  
  const updateHuntingPackage = (index: number, field: keyof HuntingPackage, value: any) => {
    console.log(`🔄 Updating package ${index}, field: ${field}, value:`, value);
    
    if (index < 0 || index >= huntingPackages.length) {
      console.error("❌ Invalid package index:", index);
      return;
    }
    
    const updated = huntingPackages.map((pkg, i) => {
      if (i === index) {
        const updatedPackage = { ...pkg };
        
        switch (field) {
          case 'accommodationStatus':
            updatedPackage.accommodationStatus = value;
            if (value === 'without') {
              updatedPackage.defaultAccommodation = '';
            }
            break;
          
          case 'includedItems':
            updatedPackage.includedItems = Array.isArray(value) ? value : [];
            break;
          
          case 'duration':
          case 'maxHunters':
            updatedPackage[field] = parseInt(value) || 0;
            break;
          
          case 'price':
            updatedPackage[field] = parseFloat(value) || 0;
            break;
          
          default:
            updatedPackage[field] = value;
        }
        
        return updatedPackage;
      }
      return pkg;
    });
    
    setHuntingPackages(updated);
  };
  
  // ===============================
  // ACCOMMODATION HANDLERS
  // ===============================
  
  const addAccommodation = () => {
    const newAccommodation = createNewAccommodation();
    const updated = [...accommodations, newAccommodation];
    setAccommodations(updated);
  };
  
  const removeAccommodation = (index: number) => {
    if (accommodations.length > 1) {
      const updated = accommodations.filter((_, i) => i !== index);
      setAccommodations(updated);
    }
  };
  
  const updateAccommodation = (index: number, field: keyof AccommodationOption, value: any) => {
    const updated = [...accommodations];
    updated[index] = { ...updated[index], [field]: value };
    setAccommodations(updated);
  };

  // ===============================
  // ACREAGE BREAKDOWN HANDLERS
  // ===============================
  
  const addAcreageBreakdown = () => {
    const newBreakdown = createNewAcreageBreakdown();
    const updated = [...acreageBreakdown, newBreakdown];
    setAcreageBreakdown(updated);
  };
  
  const removeAcreageBreakdown = (index: number) => {
    if (acreageBreakdown.length > 0) {
      const updated = acreageBreakdown.filter((_, i) => i !== index);
      setAcreageBreakdown(updated);
    }
  };
  
  const updateAcreageBreakdown = (index: number, field: keyof AcreageBreakdown, value: any) => {
    const updated = [...acreageBreakdown];
    updated[index] = { ...updated[index], [field]: value };
    setAcreageBreakdown(updated);
  };

  // ===============================
  // WILDLIFE HANDLERS
  // ===============================
  
  const addWildlife = () => {
    const newWildlife = createNewWildlifeInfo();
    const updated = [...wildlifeInfo, newWildlife];
    setWildlifeInfo(updated);
  };
  
  const removeWildlife = (index: number) => {
    if (wildlifeInfo.length > 0) {
      const updated = wildlifeInfo.filter((_, i) => i !== index);
      setWildlifeInfo(updated);
    }
  };
  
  const updateWildlife = (index: number, field: keyof WildlifeInfo, value: any) => {
    const updated = [...wildlifeInfo];
    updated[index] = { ...updated[index], [field]: value };
    setWildlifeInfo(updated);
  };

  // ===============================
  // FORM SUBMISSION
  // ===============================
  
  const onSubmit = async (data: PropertyFormData) => {
    console.log("🔥 FORM SUBMISSION STARTED");
    
    if (!user || !isProvider) {
      console.log("❌ Authentication failed");
      toast({
        title: "Authentication error",
        description: "You must be logged in as an approved provider to add properties",
        variant: "destructive",
      });
      return;
    }

    // Validate hunting packages
    const packageErrors: string[] = [];
    
    if (!huntingPackages || huntingPackages.length === 0) {
      packageErrors.push("At least one hunting package is required");
    } else {
      huntingPackages.forEach((pkg, index) => {
        const errors = validateSingleHuntingPackage(pkg);
        errors.forEach(error => {
          packageErrors.push(`Package ${index + 1}: ${error}`);
        });
      });
    }
    
    if (packageErrors.length > 0) {
      console.log("❌ Hunting package validation failed:", packageErrors);
      toast({
        title: "Hunting Package Errors",
        description: packageErrors.slice(0, 3).join("; ") + (packageErrors.length > 3 ? "..." : ""),
        variant: "destructive",
      });
      return;
    }

    // Check image upload status
    const hasUnuploadedImages = selectedImages.length > uploadedImageUrls.length;
    if (hasUnuploadedImages) {
      toast({
        title: "Upload images first",
        description: "Please upload all images to cloud storage before submitting the property",
        variant: "destructive",
      });
      return;
    }

    if (uploadedImageUrls.length === 0) {
      toast({
        title: "Images required",
        description: "Please upload at least one property image",
        variant: "destructive",
      });
      return;
    }

    // Use custom validation
    const validationResult = validatePropertyForm(data, uploadedImageUrls);
    if (!validationResult.valid) {
      console.log("❌ Custom validation failed:", validationResult.errors);
      toast({
        title: "Validation errors",
        description: validationResult.errors.slice(0, 3).join(", ") + (validationResult.errors.length > 3 ? "..." : ""),
        variant: "destructive",
      });
      return;
    }
    
    const isValid = await form.trigger();
    if (!isValid) {
      console.log("❌ Form validation failed:", form.formState.errors);
      toast({
        title: "Form validation failed",
        description: "Please fix the errors in the form before submitting",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const submissionData: PropertyFormData = {
        ...data,
        huntingPackages: huntingPackages.map(pkg => sanitizeHuntingPackage(pkg)),
        accommodations: accommodations,
        acreageBreakdown: acreageBreakdown,
        wildlifeInfo: wildlifeInfo,
      };
      
      const propertyData = transformFormDataForSubmission(submissionData, uploadedImageUrls, profileImageIndex);
      
      console.log("📤 Final property data to send:", propertyData);
      
      const response = await apiRequest("POST", "/api/v1/properties/", propertyData);
      
      console.log("📥 API Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log("❌ API Error Response:", errorText);
        
        let errorMessage = "Failed to save property";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log("✅ Property created successfully:", result);
      
      toast({
        title: "Property created successfully! 🎉",
        description: "Your hunting property has been created and is pending approval.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/v1/properties/"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/properties/my-properties"] });
      
      setLocation("/provider/dashboard");
      
    } catch (error) {
      console.log("💥 Submission error:", error);
      toast({
        title: "Error creating property",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===============================
  // LOADING AND AUTH STATES
  // ===============================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  if (!user || !isProvider) {
    return null;
  }

  // ===============================
  // RENDER STATUS CALCULATIONS
  // ===============================

  const hasUnuploadedImages = selectedImages.length > uploadedImageUrls.length;
  const canSubmit = !isSubmitting && !hasUnuploadedImages && uploadedImageUrls.length > 0;
  const formErrors = Object.keys(form.formState.errors);
  const hasFormErrors = formErrors.length > 0;

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
        
        <div className="max-w-6xl mx-auto"> {/* Changed from max-w-4xl to max-w-6xl for wider form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Add New Hunting Property</span>
                {isEditMode && <Badge variant="outline">Edit Mode</Badge>}
              </CardTitle>
              <CardDescription>
                Create detailed hunting packages with accommodation options, acreage breakdown, and wildlife information. 
                All fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form 
                  className="space-y-8"
                  onSubmit={form.handleSubmit(onSubmit)}
                >
                  {/* Basic Information */}
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
                    isPropertyNameLocked={false} // New properties can edit property name
                  />
                  
                  <Separator />
                  
                  {/* Location */}
                  <LocationSection form={form} isApproved={false} />
                  
                  <Separator />
                  
                  {/* Hunting Packages */}
                  <HuntingPackagesSection
                    huntingPackages={huntingPackages}
                    accommodations={accommodations}
                    onUpdatePackage={updateHuntingPackage}
                    onAddPackage={addHuntingPackage}
                    onRemovePackage={removeHuntingPackage}
                  />
                  
                  <Separator />
                  
                  {/* Accommodation Options */}
                  <AccommodationsSection
                    accommodations={accommodations}
                    onUpdateAccommodation={updateAccommodation}
                    onAddAccommodation={addAccommodation}
                    onRemoveAccommodation={removeAccommodation}
                  />
                  
                  <Separator />
                  
                  {/* Property Facilities */}
                  <FacilitiesSection form={form} />
                  
                  <Separator />
                  
                  {/* Property Images */}
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
                  
                  <Separator />
                  
                  {/* Additional Information */}
                  <AdditionalInfoSection form={form} />
                  
                  <CardFooter className="flex flex-col space-y-4 px-0">
                    {/* Status alerts */}
                    {hasUnuploadedImages && (
                      <Alert className="w-full border-amber-200 bg-amber-50">
                        <Upload className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          <strong>Upload Required:</strong> Please upload all selected images to cloud storage before submitting the property.
                          You have <strong>{selectedImages.length - uploadedImageUrls.length} images</strong> waiting to be uploaded.
                        </AlertDescription>
                      </Alert>
                    )}

                    {!hasUnuploadedImages && uploadedImageUrls.length > 0 && !hasFormErrors && (
                      <Alert className="w-full border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>Ready to Submit:</strong> All <strong>{uploadedImageUrls.length} images</strong> have been uploaded successfully. 
                          Your property listing is ready to be submitted for review.
                        </AlertDescription>
                      </Alert>
                    )}

                    {uploadedImageUrls.length === 0 && selectedImages.length === 0 && (
                      <Alert className="w-full border-blue-200 bg-blue-50">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          <strong>Images Required:</strong> Please add and upload at least one property image to continue.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Display form errors if any */}
                    {hasFormErrors && (
                      <Alert className="w-full border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <strong>Please fix the following errors:</strong>
                          <ul className="list-disc pl-5 mt-2 space-y-1">
                            {formErrors.slice(0, 5).map((field) => {
                              const error = form.formState.errors[field as keyof PropertyFormData];
                              return (
                                <li key={field}>
                                  <strong>{field}:</strong> {error?.message?.toString() || 'Invalid field'}
                                </li>
                              );
                            })}
                            {formErrors.length > 5 && (
                              <li className="text-gray-600">... and {formErrors.length - 5} more errors</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Submit button */}
                    <div className="w-full flex flex-wrap gap-2 justify-between items-center">
                      <div className="text-sm text-gray-600">
                        {uploadedImageUrls.length > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            {uploadedImageUrls.length} images uploaded
                          </span>
                        )}
                        {huntingPackages.length > 0 && (
                          <span className="flex items-center gap-1 mt-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            {huntingPackages.length} hunting packages configured
                          </span>
                        )}
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={!canSubmit || hasFormErrors} 
                        className="ml-auto"
                        size="lg"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Property...
                          </>
                        ) : hasFormErrors ? (
                          <>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Fix Errors First ({formErrors.length})
                          </>
                        ) : hasUnuploadedImages ? (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Images First
                          </>
                        ) : uploadedImageUrls.length === 0 ? (
                          "Add Images to Continue"
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Create Property
                          </>
                        )}
                      </Button>
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