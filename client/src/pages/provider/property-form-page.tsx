import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Upload, Plus, Trash2, Info } from "lucide-react";

// Schema for accommodation options
const accommodationSchema = z.object({
  type: z.string().min(1, "Accommodation type is required"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  bedrooms: z.coerce.number().min(0),
  bathrooms: z.coerce.number().min(0),
  capacity: z.coerce.number().min(1, "Must accommodate at least 1 guest"),
  pricePerNight: z.coerce.number().min(0), // 0 means included in package
  amenities: z.array(z.string()).optional(),
});

// Schema for hunting packages
const huntingPackageSchema = z.object({
  name: z.string().min(3, "Package name is required"),
  huntingType: z.string().min(1, "Hunting type is required"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day"),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  maxHunters: z.coerce.number().min(1, "Must allow at least 1 hunter"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  includedItems: z.array(z.string()).optional(),
  accommodationIncluded: z.boolean(),
  defaultAccommodation: z.string().optional(), // Which accommodation is included
});

// Main property schema
const propertyFormSchema = z.object({
  // Basic Information
  providerId: z.number().optional(),
  propertyName: z.string().min(3, "Property name must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  
  // Location
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  country: z.string().min(2, "Country is required").default("United States"),
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  
  // Property Details
  totalAcres: z.coerce.number().min(1, "Total acreage is required"),
  terrain: z.string().optional(),
  
  // Hunting Packages (main focus)
  huntingPackages: z.array(huntingPackageSchema).min(1, "Add at least one hunting package"),
  
  // Accommodation Options
  accommodations: z.array(accommodationSchema).min(1, "Add at least one accommodation option"),
  
  // Facilities & Amenities
  facilities: z.array(z.string()).optional(),
  
  // Rules & Safety
  rules: z.string().optional(),
  safety: z.string().optional(),
  licenses: z.string().optional(),
  seasonInfo: z.string().optional(),
  
  // Media
  propertyImages: z.any().refine(
    (files) => {
      if (!files) return false;
      if (Array.isArray(files) && files.length > 0) return true;
      if (files instanceof FileList && files.length > 0) return true;
      if (files instanceof File) return true;
      return false;
    },
    "Please upload at least one property image"
  ),
  
  // Status
  status: z.string().optional(),
  adminFeedback: z.string().optional()
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;
type HuntingPackage = z.infer<typeof huntingPackageSchema>;
type AccommodationOption = z.infer<typeof accommodationSchema>;

// Hunting types
const huntingTypes = [
  { id: "whitetail_deer", name: "Whitetail Deer" },
  { id: "mule_deer", name: "Mule Deer" },
  { id: "elk", name: "Elk" },
  { id: "moose", name: "Moose" },
  { id: "bear", name: "Bear" },
  { id: "wild_boar", name: "Wild Boar" },
  { id: "turkey", name: "Turkey" },
  { id: "waterfowl", name: "Waterfowl" },
  { id: "upland_birds", name: "Upland Birds" },
  { id: "small_game", name: "Small Game" },
  { id: "predator", name: "Predator/Varmint" },
  { id: "exotic", name: "Exotic Game" },
];

// Package inclusions
const packageInclusions = [
  { id: "guide", label: "Professional Guide" },
  { id: "meals", label: "All Meals" },
  { id: "transportation", label: "Field Transportation" },
  { id: "game_processing", label: "Game Processing" },
  { id: "trophy_prep", label: "Trophy Preparation" },
  { id: "licenses", label: "Hunting License" },
  { id: "tags", label: "Tags/Permits" },
  { id: "equipment", label: "Basic Equipment" },
  { id: "insurance", label: "Hunt Insurance" },
];

// Accommodation types
const accommodationTypes = [
  "Main Lodge", "Guest Cabin", "Bunkhouse", "RV Hookup", "Tent Site", "Ranch House"
];

// Accommodation amenities
const accommodationAmenities = [
  { id: "wifi", label: "WiFi" },
  { id: "heating", label: "Heating" },
  { id: "air_conditioning", label: "Air Conditioning" },
  { id: "kitchen", label: "Kitchen" },
  { id: "private_bathroom", label: "Private Bathroom" },
  { id: "hot_water", label: "Hot Water" },
  { id: "electricity", label: "Electricity" },
  { id: "linens", label: "Linens Provided" },
  { id: "meals_area", label: "Dining Area" },
];

// Property facilities
const propertyFacilities = [
  { id: "shooting_range", label: "Shooting Range" },
  { id: "game_cleaning", label: "Game Cleaning Station" },
  { id: "walk_in_cooler", label: "Walk-in Cooler" },
  { id: "freezer", label: "Freezer Storage" },
  { id: "skinning_shed", label: "Skinning Shed" },
  { id: "equipment_rental", label: "Equipment Rental" },
  { id: "atv_available", label: "ATV Available" },
  { id: "boat_access", label: "Boat Access" },
  { id: "check_in_office", label: "Check-in Office" },
];

interface PropertyFormPageProps {
  id?: string;
}

export default function PropertyFormPage({ id }: PropertyFormPageProps) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [profileImageIndex, setProfileImageIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [huntingPackages, setHuntingPackages] = useState<HuntingPackage[]>([{
    name: "",
    huntingType: "",
    duration: 3,
    price: 0,
    maxHunters: 4,
    description: "",
    includedItems: [],
    accommodationIncluded: true,
    defaultAccommodation: "",
  }]);
  const [accommodations, setAccommodations] = useState<AccommodationOption[]>([{
    type: "",
    name: "",
    description: "",
    bedrooms: 2,
    bathrooms: 1,
    capacity: 4,
    pricePerNight: 0, // 0 = included in package
    amenities: [],
  }]);
  
  const isEditMode = !!id;
  const isProvider = user?.role === "provider" && 
    (user?.hostApplicationStatus || user?.host_application_status)?.toLowerCase() === "approved";
  
  // Authentication and provider status redirect
  useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation("/auth");
      } else if (!isProvider) {
        setLocation("/");
      }
    }
  }, [loading, user, isProvider, setLocation]);
  
  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
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
      huntingPackages: huntingPackages,
      accommodations: accommodations,
      facilities: [],
      rules: "",
      safety: "",
      licenses: "",
      seasonInfo: "",
      propertyImages: undefined,
      status: "pending",
    },
  });
  
  const onSubmit = async (data: PropertyFormData) => {
    if (!user || !isProvider) {
      toast({
        title: "Authentication error",
        description: "You must be logged in as an approved provider to add properties",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      // Append basic fields
      formData.append("providerId", user.id.toString());
      formData.append("propertyName", data.propertyName);
      formData.append("description", data.description);
      formData.append("address", data.address);
      formData.append("city", data.city);
      formData.append("state", data.state);
      formData.append("zipCode", data.zipCode);
      formData.append("country", data.country);
      formData.append("latitude", data.latitude);
      formData.append("longitude", data.longitude);
      formData.append("totalAcres", data.totalAcres.toString());
      formData.append("terrain", data.terrain || "");
      formData.append("huntingPackages", JSON.stringify(huntingPackages));
      formData.append("accommodations", JSON.stringify(accommodations));
      formData.append("facilities", JSON.stringify(data.facilities));
      
      // Optional fields
      if (data.rules) formData.append("rules", data.rules);
      if (data.safety) formData.append("safety", data.safety);
      if (data.licenses) formData.append("licenses", data.licenses);
      if (data.seasonInfo) formData.append("seasonInfo", data.seasonInfo);
      
      // Handle property images
      if (selectedImages.length > 0) {
        selectedImages.forEach((image, index) => {
          formData.append("propertyImages", image);
          if (index === profileImageIndex) {
            formData.append("profileImageIndex", index.toString());
          }
        });
      }
      
      const response = await apiRequest("POST", "/api/v1/provider/properties", formData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save property");
      }
      
      toast({
        title: "Property created",
        description: "Your hunting property has been created and is pending approval",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/v1/provider/properties"] });
      setLocation("/provider/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Add new hunting package
  const addHuntingPackage = () => {
    setHuntingPackages([...huntingPackages, {
      name: "",
      huntingType: "",
      duration: 3,
      price: 0,
      maxHunters: 4,
      description: "",
      includedItems: [],
      accommodationIncluded: true,
      defaultAccommodation: "",
    }]);
  };
  
  // Remove hunting package
  const removeHuntingPackage = (index: number) => {
    if (huntingPackages.length > 1) {
      setHuntingPackages(huntingPackages.filter((_, i) => i !== index));
    }
  };
  
  // Update hunting package
  const updateHuntingPackage = (index: number, field: keyof HuntingPackage, value: any) => {
    const updated = [...huntingPackages];
    updated[index] = { ...updated[index], [field]: value };
    setHuntingPackages(updated);
  };
  
  // Add new accommodation
  const addAccommodation = () => {
    setAccommodations([...accommodations, {
      type: "",
      name: "",
      description: "",
      bedrooms: 2,
      bathrooms: 1,
      capacity: 4,
      pricePerNight: 0,
      amenities: [],
    }]);
  };
  
  // Remove accommodation
  const removeAccommodation = (index: number) => {
    if (accommodations.length > 1) {
      setAccommodations(accommodations.filter((_, i) => i !== index));
    }
  };
  
  // Update accommodation
  const updateAccommodation = (index: number, field: keyof AccommodationOption, value: any) => {
    const updated = [...accommodations];
    updated[index] = { ...updated[index], [field]: value };
    setAccommodations(updated);
  };
  
  // Handle image selection
  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    const newImages = [...selectedImages, ...newFiles];
    setSelectedImages(newImages);
    
    // Create preview URLs
    const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
    setImagePreviewUrls([...imagePreviewUrls, ...newPreviewUrls]);
    
    // Update form value
    form.setValue('propertyImages', newImages);
    
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Remove selected image
  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviewUrls = imagePreviewUrls.filter((_, i) => i !== index);
    
    // Revoke the URL to free up memory
    URL.revokeObjectURL(imagePreviewUrls[index]);
    
    setSelectedImages(newImages);
    setImagePreviewUrls(newPreviewUrls);
    form.setValue('propertyImages', newImages);
    
    // Adjust profile image index if necessary
    if (profileImageIndex === index) {
      setProfileImageIndex(0);
    } else if (profileImageIndex > index) {
      setProfileImageIndex(profileImageIndex - 1);
    }
  };
  
  // Set profile image
  const setAsProfileImage = (index: number) => {
    setProfileImageIndex(index);
    toast({
      title: "Profile image set",
      description: "This image will be displayed as the main property image",
    });
  };
  
  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);
  
  if (loading) {
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
        
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Add New Hunting Property</CardTitle>
              <CardDescription>
                Create hunting packages with accommodation options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form 
                  className="space-y-8"
                  onSubmit={form.handleSubmit(onSubmit)}
                >
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Property Information</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="propertyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Big Buck Ranch" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe your property, terrain, wildlife, and what makes it special" 
                                {...field} 
                                rows={4}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="totalAcres"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Acreage</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="terrain"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Terrain Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Wooded, Plains, Mixed" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Location */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zip Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 42.1234" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. -106.5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Hunting Packages - MAIN FOCUS */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-medium">Hunting Packages</h3>
                        <p className="text-sm text-gray-600">Define your hunting packages with pricing and inclusions</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addHuntingPackage}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Package
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {huntingPackages.map((pkg, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">
                                Hunting Package {index + 1}
                              </CardTitle>
                              {huntingPackages.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeHuntingPackage(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Package Name</label>
                                <Input 
                                  placeholder="e.g. 3-Day Whitetail Hunt"
                                  value={pkg.name}
                                  onChange={(e) => updateHuntingPackage(index, 'name', e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Hunting Type</label>
                                <select 
                                  className="w-full p-2 border border-gray-300 rounded-md"
                                  value={pkg.huntingType}
                                  onChange={(e) => updateHuntingPackage(index, 'huntingType', e.target.value)}
                                >
                                  <option value="">Select hunting type</option>
                                  {huntingTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                  ))}
                                </select>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Duration (days)</label>
                                <Input 
                                  type="number"
                                  min="1"
                                  value={pkg.duration}
                                  onChange={(e) => updateHuntingPackage(index, 'duration', parseInt(e.target.value))}
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Package Price ($)</label>
                                <Input 
                                  type="number"
                                  min="1"
                                  value={pkg.price}
                                  onChange={(e) => updateHuntingPackage(index, 'price', parseFloat(e.target.value))}
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Max Hunters</label>
                                <Input 
                                  type="number"
                                  min="1"
                                  value={pkg.maxHunters}
                                  onChange={(e) => updateHuntingPackage(index, 'maxHunters', parseInt(e.target.value))}
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Accommodation</label>
                                <RadioGroup 
                                  value={pkg.accommodationIncluded ? "included" : "extra"}
                                  onValueChange={(value) => updateHuntingPackage(index, 'accommodationIncluded', value === "included")}
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="included" id={`included-${index}`} />
                                    <label htmlFor={`included-${index}`} className="text-sm">Included in package</label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="extra" id={`extra-${index}`} />
                                    <label htmlFor={`extra-${index}`} className="text-sm">Available as add-on</label>
                                  </div>
                                </RadioGroup>
                              </div>
                            </div>
                            
                            {pkg.accommodationIncluded && accommodations.length > 0 && (
                              <div>
                                <label className="text-sm font-medium">Default Accommodation (included)</label>
                                <select 
                                  className="w-full p-2 border border-gray-300 rounded-md"
                                  value={pkg.defaultAccommodation}
                                  onChange={(e) => updateHuntingPackage(index, 'defaultAccommodation', e.target.value)}
                                >
                                  <option value="">Select accommodation</option>
                                  {accommodations.map((acc, idx) => (
                                    <option key={idx} value={acc.name}>
                                      {acc.name} ({acc.type})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            
                            <div>
                              <label className="text-sm font-medium">Package Description</label>
                              <Textarea 
                                placeholder="Describe what's special about this hunt package"
                                value={pkg.description}
                                onChange={(e) => updateHuntingPackage(index, 'description', e.target.value)}
                                rows={3}
                              />
                            </div>
                            
                            {/* Package Inclusions */}
                            <div>
                              <label className="text-sm font-medium block mb-2">Package Includes:</label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {packageInclusions.map((item) => (
                                  <div key={item.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={pkg.includedItems?.includes(item.id) || false}
                                      onCheckedChange={(checked) => {
                                        const currentItems = pkg.includedItems || [];
                                        const newItems = checked
                                          ? [...currentItems, item.id]
                                          : currentItems.filter(i => i !== item.id);
                                        updateHuntingPackage(index, 'includedItems', newItems);
                                      }}
                                    />
                                    <label className="text-sm">{item.label}</label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Accommodation Options */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-medium">Accommodation Options</h3>
                        <p className="text-sm text-gray-600">Available lodging for hunters (included or as add-on)</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addAccommodation}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {accommodations.map((acc, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">
                                Accommodation Option {index + 1}
                              </CardTitle>
                              {accommodations.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAccommodation(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Type</label>
                                <select 
                                  className="w-full p-2 border border-gray-300 rounded-md"
                                  value={acc.type}
                                  onChange={(e) => updateAccommodation(index, 'type', e.target.value)}
                                >
                                  <option value="">Select type</option>
                                  {accommodationTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Name</label>
                                <Input 
                                  placeholder="e.g. Deluxe Lodge Room"
                                  value={acc.name}
                                  onChange={(e) => updateAccommodation(index, 'name', e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Bedrooms</label>
                                <Input 
                                  type="number"
                                  min="0"
                                  value={acc.bedrooms}
                                  onChange={(e) => updateAccommodation(index, 'bedrooms', parseInt(e.target.value))}
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Bathrooms</label>
                                <Input 
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={acc.bathrooms}
                                  onChange={(e) => updateAccommodation(index, 'bathrooms', parseFloat(e.target.value))}
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Max Capacity</label>
                                <Input 
                                  type="number"
                                  min="1"
                                  value={acc.capacity}
                                  onChange={(e) => updateAccommodation(index, 'capacity', parseInt(e.target.value))}
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Additional Cost per Night ($)</label>
                                <Input 
                                  type="number"
                                  min="0"
                                  value={acc.pricePerNight}
                                  onChange={(e) => updateAccommodation(index, 'pricePerNight', parseFloat(e.target.value))}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Set to 0 if included in package
                                </p>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Description (optional)</label>
                              <Textarea 
                                placeholder="Brief description of this accommodation"
                                value={acc.description}
                                onChange={(e) => updateAccommodation(index, 'description', e.target.value)}
                                rows={2}
                              />
                            </div>
                            
                            {/* Accommodation Amenities */}
                            <div>
                              <label className="text-sm font-medium block mb-2">Amenities:</label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {accommodationAmenities.map((amenity) => (
                                  <div key={amenity.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={acc.amenities?.includes(amenity.id) || false}
                                      onCheckedChange={(checked) => {
                                        const currentAmenities = acc.amenities || [];
                                        const newAmenities = checked
                                          ? [...currentAmenities, amenity.id]
                                          : currentAmenities.filter(a => a !== amenity.id);
                                        updateAccommodation(index, 'amenities', newAmenities);
                                      }}
                                    />
                                    <label className="text-sm">{amenity.label}</label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Accommodation Pricing:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>If accommodation is included in a hunting package, set the price to $0</li>
                            <li>If accommodation is an add-on, set the nightly rate hunters will pay extra</li>
                            <li>Hunters can choose their accommodation when booking a package</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Property Facilities */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Property Facilities</h3>
                    <FormField
                      control={form.control}
                      name="facilities"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {propertyFacilities.map((facility) => (
                              <FormField
                                key={facility.id}
                                control={form.control}
                                name="facilities"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={facility.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(facility.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, facility.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== facility.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal text-sm">
                                        {facility.label}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  {/* Property Images */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Property Images</h3>
                    <FormField
                      control={form.control}
                      name="propertyImages"
                      render={({ field: { onChange, value, ...field } }) => (
                        <FormItem>
                          <FormLabel>Upload images of your hunting property</FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              {/* Upload button */}
                              <div className="flex items-center justify-center w-full">
                                <label 
                                  htmlFor="propertyImages" 
                                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                                      <Upload className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <p className="mb-2 text-base font-medium text-gray-700">
                                      {selectedImages.length > 0 ? 'Add more images' : 'Upload property images'}
                                    </p>
                                    <p className="mb-1 text-sm text-gray-500">
                                      <span className="font-semibold text-blue-500">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      JPG, PNG or GIF (MAX. 10MB each)
                                    </p>
                                  </div>
                                  <input 
                                    ref={fileInputRef}
                                    id="propertyImages" 
                                    name="propertyImages"
                                    type="file" 
                                    multiple 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleImageSelection}
                                    disabled={isSubmitting}
                                    {...field}
                                  />
                                </label>
                              </div>
                              
                              {/* Image previews */}
                              {selectedImages.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-3">
                                    Selected images ({selectedImages.length})
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {imagePreviewUrls.map((url, index) => (
                                      <div key={index} className="relative group">
                                        <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                                          <img 
                                            src={url} 
                                            alt={`Property ${index + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                          
                                          {/* Overlay on hover */}
                                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
                                            {profileImageIndex !== index && (
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => setAsProfileImage(index)}
                                                className="text-xs"
                                              >
                                                Set as Profile
                                              </Button>
                                            )}
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="destructive"
                                              onClick={() => removeImage(index)}
                                              className="text-xs"
                                            >
                                              Remove
                                            </Button>
                                          </div>
                                        </div>
                                        
                                        {/* Profile image badge */}
                                        {profileImageIndex === index && (
                                          <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-md shadow-md">
                                            Profile Image
                                          </div>
                                        )}
                                        
                                        {/* Image number */}
                                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                          {index + 1}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <p className="text-xs text-gray-500 mt-3">
                                    The profile image will be displayed as the main image for your property listing
                                  </p>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  {/* Rules & Additional Info */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Additional Information</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="rules"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Rules</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="e.g. Check-in time, quiet hours, hunting zones, safety requirements"
                                {...field} 
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="safety"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Safety Information</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="e.g. Required safety gear, emergency procedures, first aid locations"
                                {...field} 
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="licenses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>License Requirements</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="e.g. Required licenses, where to obtain them, any restrictions"
                                {...field} 
                                rows={2}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="seasonInfo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Season Information</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="e.g. Best hunting seasons, weather conditions, what to expect"
                                {...field} 
                                rows={2}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <CardFooter className="flex flex-col space-y-4 px-0">
                    {/* Display form errors if any */}
                    {Object.keys(form.formState.errors).length > 0 && (
                      <div className="w-full p-4 mb-4 bg-red-50 border border-red-200 rounded-md">
                        <h4 className="text-red-800 font-medium mb-2">Please fix the following errors:</h4>
                        <ul className="list-disc pl-5 text-red-700">
                          {Object.entries(form.formState.errors).map(([field, error]) => (
                            <li key={field}>
                              {field}: {error?.message?.toString() || 'Invalid field'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="w-full flex flex-wrap gap-2">
                      <Button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="ml-auto"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Create Property"
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