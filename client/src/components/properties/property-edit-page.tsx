import { useRef, useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { PropertyFormData } from "@/components/properties/property-form/property-form-schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabaseClient";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Loader2, Image as ImageIcon, CheckCircle, AlertTriangle } from "lucide-react";

interface PropertyImagesSectionProps {
  form: UseFormReturn<PropertyFormData>;
  selectedImages: File[];
  setSelectedImages: (images: File[]) => void;
  profileImageIndex: number;
  setProfileImageIndex: (index: number) => void;
  isSubmitting: boolean;
  // New props for uploaded URLs
  uploadedImageUrls: string[];
  setUploadedImageUrls: (urls: string[]) => void;
  // Optional prop to indicate edit mode
  isEditMode?: boolean;
  existingImages?: string[];
}

export default function PropertyImagesSection({
  form,
  selectedImages,
  setSelectedImages,
  profileImageIndex,
  setProfileImageIndex,
  isSubmitting,
  uploadedImageUrls,
  setUploadedImageUrls,
  isEditMode = false,
  existingImages = []
}: PropertyImagesSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileIndex, setUploadingFileIndex] = useState<number>(-1);

  // Maximum total images allowed
  const MAX_TOTAL_IMAGES = 20;

  // Create and manage preview URLs
  useEffect(() => {
    // Revoke old blob URLs to prevent memory leaks
    imagePreviewUrls.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    // Create preview URLs - mix uploaded URLs and local blob URLs
    const newUrls: string[] = [];
    
    // Add already uploaded images (including existing ones)
    uploadedImageUrls.forEach(url => newUrls.push(url));
    
    // Add local file previews for unuploaded files
    selectedImages.slice(Math.max(0, uploadedImageUrls.length - existingImages.length)).forEach(file => {
      newUrls.push(URL.createObjectURL(file));
    });
    
    setImagePreviewUrls(newUrls);
    
    // Update form value to indicate images exist (for validation)
    if (isEditMode && newUrls.length > 0) {
      form.setValue('propertyImages', newUrls as any);
    }
    
    // Cleanup function
    return () => {
      newUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [selectedImages, uploadedImageUrls, existingImages, isEditMode, form]);

  // Calculate counts
  const existingImageCount = existingImages.length;
  const newUploadedCount = uploadedImageUrls.length - existingImageCount;
  const pendingUploadCount = selectedImages.length - newUploadedCount;
  const totalImageCount = uploadedImageUrls.length + pendingUploadCount;

  // Upload single image to Supabase
  const uploadImageToSupabase = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `property_${userId}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    console.log(`Uploading image: ${file.name} as ${fileName}`);
    
    const { data, error } = await supabase.storage
      .from('property-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName);
    
    console.log(`Image uploaded successfully: ${publicUrl}`);
    return publicUrl;
  };

  // Upload all pending images to Supabase
  const uploadPendingImages = async () => {
    const pendingImages = selectedImages.slice(newUploadedCount);
    if (pendingImages.length === 0) return;

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload images",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const newUrls: string[] = [...uploadedImageUrls];
      
      for (let i = 0; i < pendingImages.length; i++) {
        const file = pendingImages[i];
        setUploadingFileIndex(uploadedImageUrls.length + i);
        
        const url = await uploadImageToSupabase(file, user.id.toString());
        newUrls.push(url);
        
        // Update progress
        const progress = Math.round(((i + 1) / pendingImages.length) * 100);
        setUploadProgress(progress);
        
        // Update uploaded URLs immediately so user sees progress
        setUploadedImageUrls([...newUrls]);
      }
      
      toast({
        title: "Images uploaded successfully!",
        description: `${pendingImages.length} image(s) uploaded to cloud storage`,
      });
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadingFileIndex(-1);
    }
  };

  // Handle image selection
  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    
    // Check total image count
    if (totalImageCount + newFiles.length > MAX_TOTAL_IMAGES) {
      toast({
        title: "Too many images",
        description: `Maximum ${MAX_TOTAL_IMAGES} images allowed. You currently have ${totalImageCount} images.`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = newFiles.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: `Only JPG, PNG, and WebP images are allowed: ${invalidFiles.map(f => f.name).join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate file sizes (max 5MB per file)
    const oversizedFiles = newFiles.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: `Images must be smaller than 5MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    // Add new files to existing selection
    const updatedFiles = [...selectedImages, ...newFiles];
    setSelectedImages(updatedFiles);
    
    // Update form value with file count (for validation)
    if (!isEditMode) {
      form.setValue('propertyImages', updatedFiles.length > 0 ? updatedFiles : undefined);
    }
    
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Remove selected image
  const removeImage = (index: number) => {
    // Determine if this is an existing image, newly uploaded, or pending
    if (index < existingImageCount) {
      // This is an existing image from the database
      toast({
        title: "Cannot remove existing images",
        description: "Existing property images cannot be removed in edit mode",
        variant: "destructive",
      });
      return;
    }
    
    // Calculate which type of image this is
    const adjustedIndex = index - existingImageCount;
    
    if (adjustedIndex < newUploadedCount) {
      // This is a newly uploaded image in this session
      const newUploadedUrls = [...uploadedImageUrls];
      newUploadedUrls.splice(index, 1);
      setUploadedImageUrls(newUploadedUrls);
    } else {
      // This is a pending file
      const fileIndex = adjustedIndex - newUploadedCount;
      const newSelectedFiles = [...selectedImages];
      newSelectedFiles.splice(fileIndex, 1);
      setSelectedImages(newSelectedFiles);
    }
    
    // Update form value
    const totalRemaining = totalImageCount - 1;
    if (!isEditMode) {
      form.setValue('propertyImages', totalRemaining > 0 ? selectedImages : undefined);
    }
    
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

  const hasUnuploadedImages = pendingUploadCount > 0;

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Property Images</h3>
      <FormField
        control={form.control}
        name="propertyImages"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {isEditMode ? 'Add more images (optional)' : 'Upload images of your hunting property'}
            </FormLabel>
            <FormControl>
              <div className="space-y-4">
                {/* Image count summary */}
                {isEditMode && (
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Current Images:</p>
                        <ul className="mt-1 space-y-1">
                          <li>• Existing images: {existingImageCount}</li>
                          {newUploadedCount > 0 && <li>• Newly uploaded: {newUploadedCount}</li>}
                          {pendingUploadCount > 0 && <li>• Pending upload: {pendingUploadCount}</li>}
                          <li className="font-medium">• Total: {totalImageCount} / {MAX_TOTAL_IMAGES}</li>
                        </ul>
                      </div>
                      <ImageIcon className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                )}

                {/* Upload button */}
                <div className="flex items-center justify-center w-full">
                  <label 
                    htmlFor="propertyImages" 
                    className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${
                      totalImageCount >= MAX_TOTAL_IMAGES ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                        <Upload className="w-8 h-8 text-blue-500" />
                      </div>
                      <p className="mb-2 text-base font-medium text-gray-700">
                        {totalImageCount >= MAX_TOTAL_IMAGES 
                          ? 'Maximum images reached' 
                          : totalImageCount > 0 
                            ? 'Add more images' 
                            : 'Upload property images'}
                      </p>
                      {totalImageCount < MAX_TOTAL_IMAGES && (
                        <>
                          <p className="mb-1 text-sm text-gray-500">
                            <span className="font-semibold text-blue-500">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">
                            JPG, PNG or WebP (MAX. 5MB each)
                          </p>
                        </>
                      )}
                    </div>
                    <Input 
                      ref={fileInputRef}
                      id="propertyImages" 
                      name="propertyImages"
                      type="file" 
                      multiple 
                      className="hidden" 
                      accept="image/jpeg,image/jpg,image/png,image/webp" 
                      onChange={handleImageSelection}
                      disabled={isSubmitting || isUploading || totalImageCount >= MAX_TOTAL_IMAGES}
                    />
                  </label>
                </div>
                
                {/* Upload to Cloud button */}
                {hasUnuploadedImages && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      onClick={uploadPendingImages}
                      disabled={isUploading || isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading to cloud... ({uploadProgress}%)
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload {pendingUploadCount} new images to cloud
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-blue-800">
                        Uploading images to secure cloud storage...
                      </span>
                      <span className="text-sm font-medium text-blue-800">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
                {/* Upload Status Summary */}
                {totalImageCount > 0 && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2">
                      {hasUnuploadedImages ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {totalImageCount} total images
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {existingImageCount > 0 && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          {existingImageCount} existing
                        </Badge>
                      )}
                      {newUploadedCount > 0 && (
                        <Badge className="bg-green-100 text-green-800">
                          {newUploadedCount} uploaded
                        </Badge>
                      )}
                      {hasUnuploadedImages && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          {pendingUploadCount} pending
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Image previews */}
                {totalImageCount > 0 && (
                  <div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imagePreviewUrls.map((url, index) => {
                        const isExisting = index < existingImageCount;
                        const isNewlyUploaded = !isExisting && index < existingImageCount + newUploadedCount;
                        const isPending = !isExisting && !isNewlyUploaded;
                        const isCurrentlyUploading = uploadingFileIndex === index;
                        
                        return (
                          <div key={`${index}-${url}`} className="relative group">
                            <div className={`aspect-square rounded-lg overflow-hidden border-2 ${
                              isExisting ? 'border-blue-200' :
                              isNewlyUploaded ? 'border-green-200' : 
                              'border-gray-200'
                            }`}>
                              <img 
                                src={url} 
                                alt={`Property ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              
                              {/* Upload status overlay */}
                              {isCurrentlyUploading && (
                                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                                  <div className="text-center text-white">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    <p className="text-xs">Uploading...</p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
                                {profileImageIndex !== index && !isCurrentlyUploading && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setAsProfileImage(index)}
                                    className="text-xs"
                                    disabled={isUploading}
                                  >
                                    Set as Profile
                                  </Button>
                                )}
                                {!isExisting && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeImage(index)}
                                    className="text-xs"
                                    disabled={isUploading || isCurrentlyUploading}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {/* Status badges */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                              {profileImageIndex === index && (
                                <Badge className="text-xs bg-primary text-white">
                                  Profile Image
                                </Badge>
                              )}
                              
                              {isExisting && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                  Existing
                                </Badge>
                              )}
                              
                              {isNewlyUploaded && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  New
                                </Badge>
                              )}
                              
                              {isPending && !isCurrentlyUploading && (
                                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                                  Pending
                                </Badge>
                              )}
                            </div>
                            
                            {/* Image number */}
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                              {index + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-3 space-y-1">
                      {isEditMode ? (
                        <p className="text-xs text-gray-500">
                          Existing images cannot be removed. You can only add new images or change the profile image.
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">
                          The profile image will be displayed as the main image for your property listing
                        </p>
                      )}
                      
                      {hasUnuploadedImages && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Please upload all new images to cloud storage before submitting
                        </p>
                      )}
                      
                      {!hasUnuploadedImages && uploadedImageUrls.length > 0 && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          All images ready! {isEditMode && existingImageCount > 0 ? 'You can submit without adding new images.' : 'Ready to submit property.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}