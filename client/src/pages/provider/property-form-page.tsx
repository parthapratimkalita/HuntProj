import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Property, InsertProperty } from "@shared/schema";
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
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Upload } from "lucide-react";

// Extend the schema for UI validation with flexibility for UI field names
const propertyFormSchema = z.object({
  // Basic Information
  providerId: z.number().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  
  // Address Fields (support both direct fields and the location field from UI)
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().min(2, "Country is required").default("United States"),
  location: z.string().optional(), // UI field for full address
  
  // Coordinates (support both direct fields and lat/lng from UI)
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  lat: z.string().optional(), // UI field for latitude
  lng: z.string().optional(), // UI field for longitude
  
  // Property Details
  propertyType: z.string().min(1, "Property type is required"),
  category: z.string().min(1, "Hunting category is required"),
  
  // Size (support both size and acres from UI)
  size: z.coerce.number().optional(),
  acres: z.coerce.number().optional(), // UI field for size
  sizeUnit: z.string().default("acre").optional(),
  
  // Price (support both price and pricePerNight from UI)
  price: z.coerce.number().optional(),
  pricePerNight: z.coerce.number().optional(), // UI field for price
  priceUnit: z.string().default("day"),
  
  // Capacity (support both capacity and maxGuests from UI)
  capacity: z.coerce.number().optional(),
  maxGuests: z.coerce.number().optional(), // UI field for capacity
  
  // Room counts
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  
  // Features
  amenities: z.array(z.string()).min(1, "Select at least one amenity"),
  rules: z.string().optional(),
  safety: z.string().optional(),
  availability: z.string().optional(),
  
  // Media
  images: z.any().refine(
    (files) => 
      (files instanceof FileList && files.length > 0) || 
      (Array.isArray(files) && files.length > 0) || 
      (typeof files === 'string' && files.length > 0) ||
      (files instanceof File),
    "Please upload at least one image"
  ),
  huntingTypes: z.array(z.string()).min(1, "Select at least one hunting type"),
  videos: z.any().optional(),
  
  // Status
  status: z.string().optional(),
  adminFeedback: z.string().optional()
}).refine((data) => {
  // Ensure we have address information either from location or address fields
  return Boolean(data.location || data.address);
}, {
  message: "Address is required",
  path: ["address"]
}).refine((data) => {
  // Ensure we have latitude information either from lat or latitude
  return Boolean(data.lat || data.latitude);
}, {
  message: "Latitude is required",
  path: ["latitude"]
}).refine((data) => {
  // Ensure we have longitude information either from lng or longitude
  return Boolean(data.lng || data.longitude);
}, {
  message: "Longitude is required",
  path: ["longitude"]
}).refine((data) => {
  // Ensure we have price information either from pricePerNight or price
  return Boolean((data.pricePerNight && data.pricePerNight > 0) || (data.price && data.price > 0));
}, {
  message: "Price is required",
  path: ["price"]
}).refine((data) => {
  // Ensure we have size information either from acres or size
  return Boolean((data.acres && data.acres > 0) || (data.size && data.size > 0));
}, {
  message: "Acreage is required",
  path: ["size"]
}).refine((data) => {
  // Ensure we have capacity information either from maxGuests or capacity
  return Boolean((data.maxGuests && data.maxGuests > 0) || (data.capacity && data.capacity > 0));
}, {
  message: "Guest capacity is required",
  path: ["capacity"]
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

interface PropertyFormPageProps {
  id?: string;
}

export default function PropertyFormPage({ id }: PropertyFormPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [profileImageIndex, setProfileImageIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = !!id;
  
  // Fetch provider details
  const { data: provider, isLoading: isLoadingProvider } = useQuery({
    queryKey: [`/api/v1/provider/user/${user?.id}`],
    enabled: !!user && user.role === "provider",
  });
  
  // Fetch property details for edit mode
  const { data: property, isLoading: isLoadingProperty } = useQuery<Property>({
    queryKey: [`/api/v1/properties/${id}`],
    enabled: isEditMode,
  });
  
  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: "",
      description: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      latitude: "",
      longitude: "",
      price: 0,
      priceUnit: "day",
      propertyType: "",
      category: "",
      size: 0,
      sizeUnit: "acre",
      capacity: 2,
      amenities: [],
      rules: "",
      safety: "",
      availability: "",
      images: undefined,
      huntingTypes: [],
      videos: undefined,
      status: "pending",
    },
  });
  
  // Update form values when editing
  useEffect(() => {
    if (isEditMode && property && !isLoadingProperty) {
      console.log("Loading property data into form:", property);
      // Debug values
      if (Object.keys(form.formState.errors).length > 0) {
        console.log("Form errors:", form.formState.errors);
      }
      
      // Add a type assertion since the property from API might have additional fields
      const typeSafeProperty = property as any;
      
      // Set profile image index if available
      if (typeSafeProperty.profileImageIndex !== undefined) {
        setProfileImageIndex(typeSafeProperty.profileImageIndex);
      }
      
      // Set existing images for preview
      if (typeSafeProperty.images && Array.isArray(typeSafeProperty.images)) {
        // Ensure all image paths have the correct URL format
        const formattedImages = typeSafeProperty.images.map(img => {
          // If image doesn't start with http:// or https:// or /, prepend / to create absolute path
          if (!img.startsWith('http://') && !img.startsWith('https://') && !img.startsWith('/')) {
            return '/' + img;
          }
          return img;
        });
        setExistingImages(formattedImages);
        console.log("Formatted image paths:", formattedImages);
      }
      
      form.reset({
        title: typeSafeProperty.title,
        description: typeSafeProperty.description,
        address: typeSafeProperty.address,
        city: typeSafeProperty.city,
        state: typeSafeProperty.state,
        zipCode: typeSafeProperty.zipCode,
        country: typeSafeProperty.country || "United States",
        latitude: typeSafeProperty.latitude,
        longitude: typeSafeProperty.longitude,
        price: typeSafeProperty.price,
        priceUnit: typeSafeProperty.priceUnit || "day",
        propertyType: typeSafeProperty.propertyType,
        category: typeSafeProperty.category || "",
        size: typeSafeProperty.size || 0,
        sizeUnit: typeSafeProperty.sizeUnit || "acre",
        capacity: typeSafeProperty.capacity,
        amenities: Array.isArray(typeSafeProperty.amenities) ? typeSafeProperty.amenities : [],
        huntingTypes: Array.isArray(typeSafeProperty.huntingTypes) ? typeSafeProperty.huntingTypes : [],
        // For file inputs, we'll keep the existing values and handle updates separately
        images: typeSafeProperty.images,
        videos: typeSafeProperty.videos || [],
        status: typeSafeProperty.status || "pending"
      });
    }
  }, [isEditMode, property, isLoadingProperty, form]);
  
  // Property types
  const propertyTypes = [
    "Lodge", "Cabin", "Ranch", "Campsite", "Cottage", "Farmhouse"
  ];
  
  // Hunting categories
  const huntingCategories = [
    "Deer", "Elk", "Turkey", "Bird", "Waterfowl", "Bear", "Boar", "Moose", 
    "Rabbit", "Squirrel", "Duck", "Pheasant", "Quail", "Multi-game"
  ];
  
  // Amenities
  const amenitiesList = [
    { id: "wifi", label: "Wifi" },
    { id: "parking", label: "Free Parking" },
    { id: "pet_friendly", label: "Pet Friendly" },
    { id: "fireplace", label: "Indoor Fireplace" },
    { id: "freezer", label: "Freezer Storage" },
    { id: "shooting_range", label: "Shooting Range" },
    { id: "meals_included", label: "Meals Included" },
    { id: "hunting_grounds", label: "Private Hunting Grounds" },
    { id: "guide_services", label: "Guide Services" },
    { id: "lodge_experience", label: "Full Lodge Experience" },
    { id: "trophy_room", label: "Trophy Room" },
    { id: "game_cleaning", label: "Game Cleaning Station" },
    { id: "security", label: "24/7 Security" },
    { id: "satellite_tv", label: "Satellite TV" },
    { id: "hot_tub", label: "Hot Tub" }
  ];
  
  const onSubmit = async (data: PropertyFormData) => {
    console.log("onSubmit function called with data:", data);
    console.log("Form is submitting? ", isSubmitting);
    console.log("Form errors:", form.formState.errors);
    
    if (!user || user.role !== "provider") {
      toast({
        title: "Authentication error",
        description: "You must be logged in as a provider to add properties",
        variant: "destructive",
      });
      return;
    }
    
    if (!provider) {
      toast({
        title: "Provider data missing",
        description: "Could not retrieve your provider information. Please try refreshing the page.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure provider has an id
    if (!provider.id) {
      toast({
        title: "Provider ID missing",
        description: "Your provider ID could not be determined. Please try refreshing the page.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Debug values before submitting
    console.log("Submitting property with data:", data);
    console.log("User role:", user.role);
    console.log("Provider data:", provider);
    console.log("Provider ID:", provider.id);
    console.log("Authentication token:", localStorage.getItem('auth_token') ? "Present" : "Missing");
    
    try {
      // Create FormData object for file uploads
      const formData = new FormData();
      
      // Add detailed logging for debugging
      console.log("Images data:", data.images);
      if (data.images instanceof FileList) {
        console.log("FileList contents:", Array.from(data.images).map(f => f.name));
      } else if (Array.isArray(data.images)) {
        console.log("Array contents:", data.images);
      } else {
        console.log("Images is type:", typeof data.images);
      }
      
      // Map the form values from UI-specific fields to API expected fields
      const address = data.location || data.address || "";
      const latitude = data.lat || data.latitude || "";
      const longitude = data.lng || data.longitude || "";
      const size = data.acres || data.size || 0;
      const price = data.pricePerNight || data.price || 0;
      const capacity = data.maxGuests || data.capacity || 0;
      
      console.log("Mapping fields for submission:");
      console.log("- Address field mapping:", { 
        original: { address: data.address, location: data.location }, 
        final: address 
      });
      console.log("- Coordinates mapping:", { 
        original: { latitude: data.latitude, lat: data.lat, longitude: data.longitude, lng: data.lng }, 
        final: { latitude, longitude } 
      });
      console.log("- Size/price/capacity mapping:", { 
        original: { 
          size: data.size, 
          acres: data.acres, 
          price: data.price, 
          pricePerNight: data.pricePerNight,
          capacity: data.capacity,
          maxGuests: data.maxGuests
        }, 
        final: { size, price, capacity } 
      });
      
      // Extract address components - split the address string if it's available
      let extractedCity = data.city || "";
      let extractedState = data.state || "";
      let extractedZipCode = data.zipCode || "";
      
      if (address && (!extractedCity || !extractedState || !extractedZipCode)) {
        const addressParts = address.split(',').map(part => part.trim());
        if (addressParts.length >= 3) {
          // Try to extract from address string if individual fields aren't provided
          if (!extractedCity && addressParts[1]) extractedCity = addressParts[1];
          if (!extractedState && addressParts[2]) {
            const stateParts = addressParts[2].split(' ');
            if (stateParts.length >= 2) {
              extractedState = stateParts[0];
              if (!extractedZipCode && stateParts[1]) extractedZipCode = stateParts[1];
            } else {
              extractedState = addressParts[2];
            }
          }
        }
      }
      
      // Append basic text fields
      formData.append("providerId", provider.id.toString());
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("address", address);
      formData.append("city", extractedCity);
      formData.append("state", extractedState);
      formData.append("zipCode", extractedZipCode);
      formData.append("country", data.country);
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      formData.append("price", price.toString());
      formData.append("priceUnit", data.priceUnit);
      formData.append("propertyType", data.propertyType);
      formData.append("category", data.category);
      formData.append("size", size.toString());
      formData.append("sizeUnit", data.sizeUnit || "acre");
      formData.append("capacity", capacity.toString());
      formData.append("amenities", JSON.stringify(data.amenities));
      
      // Hunting types
      formData.append("huntingTypes", JSON.stringify(data.huntingTypes));
      
      // Optional fields
      if (data.rules) formData.append("rules", data.rules);
      if (data.safety) formData.append("safety", data.safety);
      if (data.availability) formData.append("availability", data.availability);
      
      // Include profile image index
      formData.append("profileImageIndex", profileImageIndex.toString());
      
      // Handle images
      console.log("Processing images for upload");
      
      // Handle existing images that weren't deleted
      if (existingImages.length > 0) {
        console.log("Adding existing image paths array as JSON");
        // Strip the leading '/' from image paths to match server-side expected format
        const normalizedPaths = existingImages.map(path => 
          path.startsWith('/') ? path.substring(1) : path
        );
        formData.append("existingImages", JSON.stringify(normalizedPaths));
      }
      
      // Handle new images
      if (data.images instanceof FileList) {
        // If new files were selected through file input
        console.log("Adding FileList images to FormData");
        for (let i = 0; i < data.images.length; i++) {
          console.log(`Adding file: ${data.images[i].name}, size: ${data.images[i].size} bytes, type: ${data.images[i].type}`);
          formData.append("images", data.images[i]);
        }
      } else if (data.images instanceof File) {
        // Single file object
        console.log(`Adding single File: ${data.images.name}, size: ${data.images.size} bytes, type: ${data.images.type}`);
        formData.append("images", data.images);
      } else if (Array.isArray(data.images) && !isEditMode) {
        // If we have an array of File objects (not in edit mode)
        console.log("Adding images array to FormData, array length:", data.images.length);
        
        // Check if array contains File objects
        const containsFileObjects = data.images.some(img => img instanceof File);
        
        if (containsFileObjects) {
          console.log("Array contains File objects");
          data.images.forEach((img, index) => {
            if (img instanceof File) {
              console.log(`Adding array File ${index}: ${img.name}`);
              formData.append("images", img);
            } else {
              console.log(`Skipping non-File item ${index}:`, img);
            }
          });
        }
      }
      
      // Handle videos (optional)
      if (data.videos instanceof FileList) {
        for (let i = 0; i < data.videos.length; i++) {
          formData.append("videos", data.videos[i]);
        }
      } else if (Array.isArray(data.videos)) {
        formData.append("existingVideos", JSON.stringify(data.videos));
      }
      
      let response;
      
      // Get auth token from localStorage
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }
      
      console.log("About to submit property form with token:", token ? "Present" : "Missing");
      
      if (isEditMode) {
        // Update existing property
        console.log(`Updating property ${id} with FormData`);
        
        // Log FormData entries for debugging before sending
        console.log("FormData entries for update:");
        Array.from(formData.entries()).forEach(pair => {
          if (pair[0] === 'images') {
            console.log(pair[0], "File:", (pair[1] as File).name);
          } else {
            console.log(pair[0], pair[1]);
          }
        });
        
        response = await fetch(`/api/v1/provider/properties/${id}`, {
          method: "PATCH",
          body: formData,
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } else {
        // Create new property
        console.log("Creating new property with FormData");
        
        // Log FormData entries for debugging before sending
        console.log("FormData entries for create:");
        Array.from(formData.entries()).forEach(pair => {
          if (pair[0] === 'images') {
            console.log(pair[0], "File:", (pair[1] as File).name);
          } else {
            console.log(pair[0], pair[1]);
          }
        });
        
        response = await fetch("/api/v1/provider/properties", {
          method: "POST",
          body: formData,
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save property");
      }
      
      // Handle success
      toast({
        title: isEditMode ? "Property updated" : "Property created",
        description: isEditMode
          ? "Your property has been updated successfully"
          : "Your property has been created and is pending approval",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/v1/provider/properties"] });
      
      // Redirect to provider dashboard
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
  
  if (isLoadingProvider || (isEditMode && isLoadingProperty)) {
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
  
  if ((user?.role !== "provider") || (!provider || provider.verificationStatus !== "approved")) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12 flex-grow">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">You must be an approved provider to manage properties.</p>
            <Button onClick={() => setLocation("/")}>
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
              <CardTitle>{isEditMode ? "Edit Property" : "Add New Property"}</CardTitle>
              <CardDescription>
                {isEditMode 
                  ? "Update the information for your property" 
                  : "Fill in the details for your new hunting property"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form 
                  className="space-y-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    console.log("Form native onSubmit triggered");
                    form.handleSubmit((data) => {
                      console.log("Form handleSubmit callback triggered with data", data);
                      onSubmit(data);
                    })();
                  }}
                >
                  <div>
                    <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Whitetail Lodge Retreat" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="propertyType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Type</FormLabel>
                            <FormControl>
                              <select 
                                className="w-full p-2 border border-gray-300 rounded-md"
                                {...field}
                              >
                                <option value="">Select property type</option>
                                {propertyTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Hunting Category</FormLabel>
                            <FormControl>
                              <select 
                                className="w-full p-2 border border-gray-300 rounded-md"
                                {...field}
                              >
                                <option value="">Select primary game</option>
                                {huntingCategories.map(category => (
                                  <option key={category} value={category}>{category}</option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your property, the hunting experience, and what makes it special" 
                              {...field} 
                              rows={5}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Location</h3>
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Elk Mountain, Wyoming" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <FormField
                        control={form.control}
                        name="lat"
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
                        name="lng"
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
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Property Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="acres"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Acreage</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="pricePerNight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price per Night ($)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="maxGuests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Guests</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bedrooms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bedrooms</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bathrooms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bathrooms</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" step="0.5" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Hunting Types</h3>
                    <FormField
                      control={form.control}
                      name="huntingTypes"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {huntingCategories.map((type) => (
                              <FormField
                                key={type}
                                control={form.control}
                                name="huntingTypes"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={type}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(type)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, type])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== type
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {type}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Amenities</h3>
                    <FormField
                      control={form.control}
                      name="amenities"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {amenitiesList.map((amenity) => (
                              <FormField
                                key={amenity.id}
                                control={form.control}
                                name="amenities"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={amenity.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(amenity.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, amenity.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== amenity.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {amenity.label}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Photos & Media</h3>
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="images"
                        render={({ field: { onChange, value, ...field } }) => (
                          <FormItem>
                            <FormLabel>Property Images (Required)</FormLabel>
                            <FormControl>
                              <div className="flex items-center justify-center w-full">
                                <label 
                                  htmlFor="images" 
                                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                                      <Upload className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <p className="mb-2 text-base font-medium text-gray-700">
                                      {isEditMode ? "Add more images" : "Upload property images"}
                                    </p>
                                    <p className="mb-1 text-sm text-gray-500">
                                      <span className="font-semibold text-blue-500">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      JPG, PNG or GIF (MAX. 10MB each)
                                    </p>
                                  </div>
                                  <input 
                                    id="images" 
                                    name="images"
                                    type="file" 
                                    multiple 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => {
                                      console.log("File input change event triggered");
                                      if (e.target.files) {
                                        console.log("Files selected:", e.target.files.length);
                                        for (let i = 0; i < e.target.files.length; i++) {
                                          console.log(`File ${i}:`, e.target.files[i].name);
                                        }
                                        if (e.target.files.length > 0) {
                                          onChange(e.target.files);
                                          // Create preview for selected files
                                          const preview = Array.from(e.target.files).map(file => URL.createObjectURL(file));
                                          setSelectedFiles(preview);
                                          
                                          // If no existing images and this is our first upload,
                                          // automatically set the first uploaded image as profile image
                                          if (existingImages.length === 0 && selectedFiles.length === 0) {
                                            setProfileImageIndex(0);
                                          }
                                        }
                                      } else {
                                        console.log("No files selected in the event");
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </FormControl>
                            {isEditMode && existingImages.length > 0 && (
                              <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Current property images:</p>
                                <div className="instagram-gallery grid grid-cols-3 gap-2 md:gap-3">
                                  {existingImages.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square group rounded-md overflow-hidden border border-gray-200">
                                      {/* Profile image indicator */}
                                      {profileImageIndex === idx && (
                                        <div className="absolute top-2 left-2 z-10 bg-primary text-white text-xs px-2 py-1 rounded-md">
                                          Profile Image
                                        </div>
                                      )}
                                      
                                      <img 
                                        src={img} 
                                        alt={`Property ${idx+1}`} 
                                        className="h-full w-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          className="bg-primary text-white text-xs px-3 py-1.5 rounded-md hover:bg-primary/90"
                                          onClick={() => {
                                            setProfileImageIndex(idx);
                                            toast({
                                              title: "Profile image set",
                                              description: "This image will be shown as the main image for your property",
                                            });
                                          }}
                                          disabled={profileImageIndex === idx}
                                        >
                                          {profileImageIndex === idx ? "Current Profile" : "Set as Profile"}
                                        </button>
                                        
                                        <button
                                          type="button"
                                          className="bg-white text-red-500 rounded-full w-8 h-8 flex items-center justify-center shadow-md mt-1"
                                          onClick={() => {
                                            const newImages = [...existingImages];
                                            newImages.splice(idx, 1);
                                            setExistingImages(newImages);
                                            // Also update form value to handle both existing and new images
                                            onChange(newImages.length > 0 ? newImages : undefined);
                                            
                                            // Reset profile image index if the current profile image is deleted
                                            if (profileImageIndex === idx) {
                                              setProfileImageIndex(0);
                                            } else if (profileImageIndex > idx) {
                                              // Adjust index if an image before the profile image is deleted
                                              setProfileImageIndex(profileImageIndex - 1);
                                            }
                                          }}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {selectedFiles && selectedFiles.length > 0 && (
                              <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">New images selected:</p>
                                <div className="instagram-gallery grid grid-cols-3 gap-2 md:gap-3">
                                  {selectedFiles.map((url, idx) => (
                                    <div key={`new-${idx}`} className="relative aspect-square group rounded-md overflow-hidden border border-gray-200">
                                      {/* Profile image indicator for new uploads */}
                                      {profileImageIndex === existingImages.length + idx && (
                                        <div className="absolute top-2 left-2 z-10 bg-primary text-white text-xs px-2 py-1 rounded-md">
                                          Profile Image
                                        </div>
                                      )}
                                      
                                      <img src={url} alt={`New upload ${idx+1}`} className="h-full w-full object-cover" />
                                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          className="bg-primary text-white text-xs px-3 py-1.5 rounded-md hover:bg-primary/90"
                                          onClick={() => {
                                            // Set profile image index to existing images length plus this image's index
                                            const newIndex = existingImages.length + idx;
                                            setProfileImageIndex(newIndex);
                                            toast({
                                              title: "Profile image set",
                                              description: "This image will be shown as the main image for your property",
                                            });
                                          }}
                                          disabled={profileImageIndex === existingImages.length + idx}
                                        >
                                          {profileImageIndex === existingImages.length + idx ? "Current Profile" : "Set as Profile"}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="videos"
                        render={({ field: { onChange, value, ...field } }) => (
                          <FormItem>
                            <FormLabel>Property Videos (Optional)</FormLabel>
                            <FormControl>
                              <div className="flex items-center justify-center w-full">
                                <label 
                                  htmlFor="videos" 
                                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                                >
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-10 h-10 mb-3 text-gray-400" />
                                    <p className="mb-1 text-sm text-gray-500">
                                      <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      MP4, MOV or AVI (MAX. 30MB each)
                                    </p>
                                  </div>
                                  <Input 
                                    id="videos" 
                                    type="file" 
                                    multiple 
                                    className="hidden" 
                                    accept="video/*" 
                                    onChange={(e) => onChange(e.target.files)}
                                    {...field}
                                  />
                                </label>
                              </div>
                            </FormControl>
                            {isEditMode && value && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-500">
                                  Current videos: {
                                    Array.isArray(value) ? value.length : 
                                    value instanceof FileList ? value.length : 
                                    typeof value === 'string' ? 1 : 0
                                  } video(s) uploaded
                                </p>
                              </div>
                            )}
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
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          console.log("Current form values:", form.getValues());
                          console.log("Form errors:", form.formState.errors);
                        }}
                      >
                        Debug Form
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="secondary"
                        onClick={() => {
                          form.handleSubmit((data) => {
                            console.log("Manual form submission with data:", data);
                            onSubmit(data);
                          })();
                        }}
                      >
                        Manual Submit
                      </Button>
                      
                      <Button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="ml-auto"
                        onClick={() => console.log("Submit button clicked")}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isEditMode ? "Updating..." : "Submitting..."}
                          </>
                        ) : (
                          isEditMode ? "Update Property" : "Create Property"
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
