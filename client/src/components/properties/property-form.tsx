import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Property, insertPropertySchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X } from "lucide-react";

// Extend the insert schema with more detailed validation
const propertyFormSchema = insertPropertySchema.extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1 person"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  zipCode: z.string().min(5, "Zip code must be at least 5 characters"),
  country: z.string().min(2, "Country must be at least 2 characters"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  amenities: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

interface PropertyFormProps {
  providerId: number;
  existingProperty?: Property | null;
  onSuccess?: () => void;
}

export default function PropertyForm({ providerId, existingProperty, onSuccess }: PropertyFormProps) {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [profileImageIndex, setProfileImageIndex] = useState<number>(existingProperty?.profileImageIndex || 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize the form with existing property values or defaults
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: existingProperty
      ? {
          ...existingProperty,
          // Convert string amenities to array if needed
          amenities: Array.isArray(existingProperty.amenities) 
            ? existingProperty.amenities.join(", ") 
            : existingProperty.amenities || "",
          // Ensure numeric fields are properly typed
          price: existingProperty.price,
          capacity: existingProperty.capacity,
          profileImageIndex: existingProperty.profileImageIndex || 0,
        }
      : {
          providerId,
          title: "",
          description: "",
          price: 100,
          priceUnit: "night",
          capacity: 2,
          propertyType: "cabin",
          category: "hunting",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          country: "USA",
          latitude: "",
          longitude: "",
          amenities: "",
          huntingTypes: "",
          status: "pending", // Default status for new properties
          profileImageIndex: 0,
        },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input change event triggered");
    
    if (e.target.files && e.target.files.length > 0) {
      console.log(`File input change detected with ${e.target.files.length} files`);
      
      // Convert FileList to array of Files
      const newFiles = Array.from(e.target.files);
      
      // Log file details for debugging
      newFiles.forEach((file, index) => {
        console.log(`Selected file ${index}: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
        
        // Additional validation and debugging
        if (!file.type && file.name) {
          // Try to infer type from extension if missing
          const ext = file.name.split('.').pop()?.toLowerCase();
          console.log(`File missing type, inferred from extension: ${ext}`);
        }
      });
      
      // Create a copy to ensure we're working with valid File objects
      const validFiles = newFiles.filter(file => {
        // Basic validation 
        if (!(file instanceof File)) {
          console.error(`Invalid file object detected, not an instance of File:`, file);
          return false;
        }
        
        // Size validation
        if (file.size === 0) {
          console.error(`Empty file detected: ${file.name}`);
          return false;
        }
        
        return true;
      });
      
      console.log(`${validFiles.length} valid files from ${newFiles.length} total files`);
      
      setSelectedFiles(prevFiles => {
        const updatedFiles = [...prevFiles, ...validFiles];
        console.log(`Total selected files after addition: ${updatedFiles.length}`);
        return updatedFiles;
      });
    } else {
      console.log('File input change event triggered but no files were selected');
    }
  };

  // Remove a selected file
  const removeFile = (index: number) => {
    console.log(`Removing file at index ${index}`);
    setSelectedFiles(files => {
      const updatedFiles = files.filter((_, i) => i !== index);
      console.log(`Files after removal: ${updatedFiles.length}`);
      return updatedFiles;
    });
  };

  // Create or update property including image upload
  const propertyMutation = useMutation({
    mutationFn: async (values: PropertyFormValues) => {
      setIsUploading(true);
      
      // Create FormData to handle both property data and images
      const formData = new FormData();
      
      // Add property data to FormData
      console.log("Form values being submitted:", values);
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Special handling for array values (hunting types, amenities)
          if (Array.isArray(value)) {
            console.log(`Converting array ${key} to JSON string`);
            formData.append(key, JSON.stringify(value));
          } else {
            console.log(`Adding form field: ${key} = ${value}`);
            formData.append(key, String(value));
          }
        }
      });
      
      // Add image files to FormData
      if (selectedFiles.length > 0) {
        console.log(`Preparing to append ${selectedFiles.length} files to form data`);
        selectedFiles.forEach((file, index) => {
          console.log(`Appending file ${index} (${file.name}, ${file.type}, ${file.size} bytes) to FormData as "images"`);
          formData.append("images", file);
        });
      } else {
        console.log("No files to append to FormData");
      }
      
      try {
        // Instead of using a direct XMLHttpRequest, use the fetch API wrapped in a promise
        // to track upload progress with better authentication handling
        const url = existingProperty 
          ? `/api/v1/provider/properties/${existingProperty.id}` 
          : "/api/v1/provider/properties";
        
        // Method - PATCH for update, POST for create
        const method = existingProperty ? "PATCH" : "POST";

        // Get the token from localStorage
        const token = localStorage.getItem("auth_token");
        console.log("Auth token for property submission:", token ? "Token found" : "No token");
        
        if (!token) {
          console.error("No authentication token found in localStorage");
          throw new Error("You must be logged in to submit a property");
        }
        
        // Use XMLHttpRequest to track upload progress
        const xhr = new XMLHttpRequest();
        
        // Setup progress tracking
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            console.log(`Upload progress: ${progress}%`);
            setUploadProgress(progress);
          }
        });
        
        // Log when upload starts
        xhr.upload.addEventListener("loadstart", () => {
          console.log("Upload started");
        });
        
        // Log when upload ends
        xhr.upload.addEventListener("load", () => {
          console.log("Upload completed successfully");
        });
        
        // Log upload errors
        xhr.upload.addEventListener("error", () => {
          console.error("Error during upload");
        });
        
        // Create a promise to handle the XHR request
        const response = await new Promise<any>((resolve, reject) => {
          xhr.open(method, url);
          
          // IMPORTANT: Set the Authorization header with the Bearer token
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          console.log("Authorization header set with Bearer token");
          
          xhr.onload = () => {
            console.log(`Request completed with status: ${xhr.status}`);
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const responseData = JSON.parse(xhr.responseText);
                console.log("Response data:", responseData);
                resolve(responseData);
              } catch (e) {
                console.log("Response could not be parsed as JSON:", xhr.responseText);
                resolve(xhr.responseText);
              }
            } else {
              console.error(`Request failed with status ${xhr.status}:`, xhr.responseText);
              reject(new Error(`Request failed with status ${xhr.status}: ${xhr.responseText}`));
            }
          };
          
          xhr.onerror = () => {
            console.error("Network error during request");
            reject(new Error("Network error during request"));
          };
          
          console.log("Sending form data...");
          xhr.send(formData);
        });
        
        return response;
      } catch (error) {
        console.error("Property submission error:", error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: async (data) => {
      toast({
        title: existingProperty ? "Property updated" : "Property created",
        description: existingProperty
          ? "Your property has been updated successfully"
          : "Your property has been created successfully and is pending approval",
      });
      
      // Reset form state
      form.reset();
      setSelectedFiles([]);
      setUploadProgress(0);
      
      // Call onSuccess callback
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save property",
        variant: "destructive",
      });
    },
  });

  // Create a more reliable submit handler that uses the form's actual values
  const onSubmit = async () => {
    console.log("Form submission triggered");
    
    try {
      // Get the actual form values rather than relying on the parameter
      const values = form.getValues();
      
      // Ensure the profileImageIndex is set correctly
      values.profileImageIndex = profileImageIndex;
      
      console.log("Form values:", values);
      console.log("Form validation state:", form.formState);
      console.log("Form errors:", form.formState.errors);
      console.log("Profile image index:", profileImageIndex);
      
      if (existingProperty) {
        console.log("Updating existing property:", existingProperty.id);
      } else {
        console.log("Creating new property");
      }
      
      // Manually validate the form to be sure
      const isValid = await form.trigger();
      if (!isValid) {
        console.error("Form validation failed", form.formState.errors);
        return;
      }
      
      // Submit only if validation passes
      propertyMutation.mutate(values as PropertyFormValues);
    } catch (error) {
      console.error("Error during form submission:", error);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Title*</FormLabel>
              <FormControl>
                <Input placeholder="Enter property title" {...field} />
              </FormControl>
              <FormDescription>
                A catchy title for your hunting property
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="propertyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Type*</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cabin">Cabin</SelectItem>
                    <SelectItem value="lodge">Lodge</SelectItem>
                    <SelectItem value="camp">Camp</SelectItem>
                    <SelectItem value="ranch">Ranch</SelectItem>
                    <SelectItem value="blinds">Hunting Blinds</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price ($)*</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity (people)*</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address*</FormLabel>
                <FormControl>
                  <Input placeholder="Street address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City*</FormLabel>
                <FormControl>
                  <Input placeholder="City" {...field} />
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
                <FormLabel>State*</FormLabel>
                <FormControl>
                  <Input placeholder="State" {...field} />
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
                <FormLabel>Zip Code*</FormLabel>
                <FormControl>
                  <Input placeholder="Zip Code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 40.7128" {...field} />
                </FormControl>
                <FormDescription>
                  Decimal coordinates for mapping
                </FormDescription>
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
                  <Input placeholder="e.g. -74.0060" {...field} />
                </FormControl>
                <FormDescription>
                  Decimal coordinates for mapping
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description*</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your property, including hunting features, species available, and amenities" 
                  className="min-h-[120px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="amenities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amenities</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="List available amenities (e.g., Wifi, Kitchen, Hunting Gear, Guide Services)" 
                  className="min-h-[80px]" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Comma-separated list of amenities available at the property
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-4">
          <div>
            <FormLabel htmlFor="property-images">Property Images</FormLabel>
            <div className="flex items-center gap-2 mt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex items-center gap-2" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                Choose Images
              </Button>
              {selectedFiles.length > 0 && (
                <span className="text-sm text-gray-500">
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                </span>
              )}
            </div>
            <Input
              ref={fileInputRef}
              id="property-images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <FormDescription>
              Upload high-quality images of your property (JPG, PNG, or GIF, 5MB max each)
            </FormDescription>
          </div>
          
          {/* Existing Property Images (when editing) */}
          {existingProperty && existingProperty.images && Array.isArray(existingProperty.images) && existingProperty.images.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Images:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {(existingProperty.images as string[]).map((imageUrl, index) => (
                  <div 
                    key={`existing-${index}`} 
                    className="relative group aspect-square border rounded-md overflow-hidden"
                  >
                    <img 
                      src={imageUrl} 
                      alt={`Property ${index + 1}`} 
                      className="object-cover w-full h-full"
                    />
                    {/* Profile image indicator */}
                    {existingProperty.profileImageIndex === index && (
                      <div className="absolute top-1 left-1 bg-primary text-white text-xs px-2 py-1 rounded-md">
                        Profile Image
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2">
                      <Button 
                        type="button"
                        variant="secondary" 
                        size="sm"
                        className="h-8 w-auto text-xs" 
                        onClick={() => {
                          setProfileImageIndex(index);
                          form.setValue('profileImageIndex', index);
                        }}
                        disabled={existingProperty.profileImageIndex === index}
                      >
                        Set as Profile
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Selected new images preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">New Images to Upload:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {selectedFiles.map((file, index) => (
                  <div 
                    key={`new-${index}`} 
                    className="relative group aspect-square border rounded-md overflow-hidden"
                  >
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={`Preview ${index + 1}`} 
                      className="object-cover w-full h-full"
                    />
                    {existingProperty && index === profileImageIndex && profileImageIndex >= (existingProperty.images as string[]).length && (
                      <div className="absolute top-1 left-1 bg-primary text-white text-xs px-2 py-1 rounded-md">
                        New Profile Image
                      </div>
                    )}
                    {!existingProperty && index === profileImageIndex && (
                      <div className="absolute top-1 left-1 bg-primary text-white text-xs px-2 py-1 rounded-md">
                        Profile Image
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2">
                      {!existingProperty && (
                        <Button 
                          type="button"
                          variant="secondary" 
                          size="sm"
                          className="h-8 w-auto text-xs" 
                          onClick={() => {
                            setProfileImageIndex(index);
                            form.setValue('profileImageIndex', index);
                          }}
                          disabled={index === profileImageIndex}
                        >
                          Set as Profile
                        </Button>
                      )}
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon"
                        className="h-8 w-8" 
                        onClick={() => removeFile(index)}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Upload progress bar */}
          {isUploading && uploadProgress > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Uploading...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                <p className="text-xs text-gray-500 mt-1">{uploadProgress}% complete</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={onSubmit}
            disabled={propertyMutation.isPending}
          >
            {propertyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {existingProperty ? "Update Property" : "Create Property"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}