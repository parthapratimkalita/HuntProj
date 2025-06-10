import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, X, FileText, Image as ImageIcon } from "lucide-react";

// Form schema with required bio and documents
const providerFormSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  bio: z.string().min(1, "Bio is required"), // Now required
  documents: z.any().refine(
    (files) => files instanceof FileList && files.length > 0,
    "Please upload at least one document for verification"
  ),
});

type ProviderFormData = z.infer<typeof providerFormSchema>;

interface ProviderApplicationFormProps {
  onSuccess?: () => void; // Add callback for successful submission
}

export default function ProviderApplicationForm({ onSuccess }: ProviderApplicationFormProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStep, setUploadStep] = useState<string>("");
  
  const form = useForm<ProviderFormData>({
    defaultValues: {
      phone: '',
      address: '',
      bio: '',
      documents: undefined,
    },
  });
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      
      // Validate file sizes (max 10MB per file)
      const invalidFiles = fileArray.filter(file => file.size > 10 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        toast({
          title: "File too large",
          description: `Files must be smaller than 10MB: ${invalidFiles.map(f => f.name).join(', ')}`,
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFiles(fileArray);
      form.setValue("documents", files, { shouldValidate: true });
    }
  };
  
  // Remove a selected file
  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    
    // Create a new FileList-like object
    const dataTransfer = new DataTransfer();
    newFiles.forEach(file => {
      dataTransfer.items.add(file);
    });
    
    form.setValue("documents", dataTransfer.files.length ? dataTransfer.files : undefined, { shouldValidate: true });
  };
  
  // Helper to get file icon based on type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-amber-500" />;
  };

  // Upload files to Supabase Storage
  const uploadFilesToSupabase = async (files: File[], userId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    setUploadStep("Uploading documents to secure storage...");
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      console.log(`Uploading file ${i + 1}/${files.length}: ${file.name} as ${fileName}`);
      
      const { data, error } = await supabase.storage
        .from('provider-documents')
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
        .from('provider-documents')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(publicUrl);
      console.log(`File uploaded successfully: ${publicUrl}`);
      
      // Update progress (80% of total progress for uploads)
      const progress = Math.round(((i + 1) / files.length) * 80);
      setUploadProgress(progress);
    }
    
    return uploadedUrls;
  };
  
  const onSubmit = async (data: ProviderFormData) => {
    if (!user) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to apply",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedFiles.length) {
      toast({
        title: "Missing documents",
        description: "Please upload at least one verification document",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadStep("");
    
    try {
      console.log("Starting provider application submission...");
      console.log("Form data:", { 
        phone: data.phone, 
        address: data.address, 
        bio: data.bio, 
        filesCount: selectedFiles.length 
      });
      
      // Step 1: Upload files to Supabase Storage
      const documentUrls = await uploadFilesToSupabase(selectedFiles, user.id.toString());
      console.log("Files uploaded successfully. URLs:", documentUrls);
      
      setUploadProgress(85);
      setUploadStep("Submitting application...");
      
      // Step 2: Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session found");
      }
      
      // Step 3: Submit application to backend (bio and document_urls are now required)
      const applicationData = {
        phone: data.phone,
        address: data.address,
        bio: data.bio, // Required field
        document_urls: documentUrls, // Required field
      };
      
      console.log("Sending application data to backend:", applicationData);
      
      const response = await fetch('/api/v1/users/apply-host', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });
      
      console.log("Backend response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
        console.error("Backend error:", errorData);
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Application submitted successfully:", result);
      
      setUploadProgress(100);
      setUploadStep("Application submitted successfully!");
      
      // Success!
      toast({
        title: "Application submitted successfully!",
        description: "We'll review your application and get back to you soon.",
      });
      
      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/v1/users/me"] });
      
      // Call the success callback to refresh parent component
      if (onSuccess) {
        onSuccess();
      }
      
      // Don't redirect immediately - let the parent component handle the state change
      
    } catch (error) {
      console.error("Application submission error:", error);
      
      toast({
        title: "Application failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      
      setUploadProgress(0);
      setUploadStep("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Become a HuntStay Host</CardTitle>
        <CardDescription>
          Apply to list your hunting property on our platform. We'll review your application and get back to you shortly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
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
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, City, State, Zip" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell us about yourself, your experience with hunting, and what makes your property special" 
                      {...field} 
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    Share your hunting experience and what makes your property unique
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="documents"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Upload Verification Documents</FormLabel>
                  <FormDescription>
                    Please upload your ID, proof of ownership, licenses, or other relevant documents (max 10MB per file)
                  </FormDescription>
                  <FormControl>
                    <div className="flex flex-col gap-4 w-full">
                      {/* File upload area */}
                      <label 
                        htmlFor="documents" 
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 mb-3 text-gray-400" />
                          <p className="mb-1 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">
                            PDF, JPG, JPEG, PNG (max 10MB per file)
                          </p>
                        </div>
                        <Input 
                          id="documents" 
                          type="file" 
                          multiple 
                          className="hidden" 
                          accept=".pdf,.jpg,.jpeg,.png" 
                          onChange={handleFileChange}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </label>
                      
                      {/* Selected files list */}
                      {selectedFiles.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <h4 className="text-sm font-medium mb-2">Selected files:</h4>
                          <div className="space-y-2">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div className="flex items-center gap-2">
                                  {getFileIcon(file)}
                                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {(file.size / 1024 / 1024).toFixed(1)} MB
                                  </Badge>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                  className="h-8 w-8 p-0"
                                  disabled={isSubmitting}
                                >
                                  <X className="h-4 w-4" />
                                  <span className="sr-only">Remove</span>
                                </Button>
                              </div>
                            ))}
                          </div>
                          
                          {/* Upload Progress Indicator */}
                          {isSubmitting && uploadProgress > 0 && (
                            <div className="mt-4">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">
                                  {uploadStep || 'Processing...'}
                                </span>
                                <span className="text-sm font-medium">{uploadProgress}%</span>
                              </div>
                              <Progress value={uploadProgress} className="h-2" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <CardFooter className="flex justify-end px-0">
              <Button type="submit" disabled={isSubmitting || selectedFiles.length === 0}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadProgress < 80 ? 'Uploading...' : 
                     uploadProgress < 100 ? 'Submitting...' : 
                     'Processing...'}
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}