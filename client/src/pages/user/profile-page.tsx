import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

// Import modular components
import { ImageCropper } from "@/components/ProfilePage/ImageCropper";
import { ProfileSidebar } from "@/components/ProfilePage/ProfileSidebar";
import { ProfileForm } from "@/components/ProfilePage/ProfileForm";
import { SecuritySettings } from "@/components/ProfilePage/SecuritySettings";
import { PaymentMethods } from "@/components/ProfilePage/PaymentMethods";
import { NotificationPreferences } from "@/components/ProfilePage/NotificationPreferences";
import { useImageUpload } from "@/hooks/useImageUpload";

// Schemas
const profileFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  bio: z.string().optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function ProfilePage() {
  const [selectedTab, setSelectedTab] = useState("profile");
  const [isUpdating, setIsUpdating] = useState(false);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  // Image upload functionality
  const {
    isUploadingImage,
    isRemovingImage,
    showImageCropper,
    imagePreviewUrl,
    handleImageUpload,
    handleCropSubmit,
    handleImageRemove,
    handleCropperCancel,
  } = useImageUpload(user);

  // Forms
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "", email: "", phone: "", address: "", 
      city: "", state: "", zipCode: "", country: "", bio: "",
    },
  });
  
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // Load user data into form - only when user changes, not on every render
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        zipCode: user.zipCode || user.zip_code || "",
        country: user.country || "",
        bio: user.bio || "",
      });
    }
  }, [user, profileForm]);

  // Form handlers
  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsUpdating(true);
    
    try {
      const response = await apiRequest("PATCH", `/api/v1/users/me`, data);
      const updatedUser = await response.json();
      
      // Simple cache update without forced refresh
      queryClient.setQueryData(["/api/v1/users/me"], updatedUser);
      
      toast({ 
        title: "Profile updated", 
        description: "Your profile has been updated successfully" 
      });
      
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "An error occurred", 
        variant: "destructive" 
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!user) return;
    setIsUpdating(true);
    
    try {
      await apiRequest("POST", "/api/v1/user/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      
      toast({ 
        title: "Password updated", 
        description: "Your password has been changed successfully" 
      });
      passwordForm.reset();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "An error occurred", 
        variant: "destructive" 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Loading state
  if (isLoading) {
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
  
  // Redirect if not authenticated
  if (!user) {
    navigate("/auth");
    return null;
  }

  // Render tab content
  const renderTabContent = () => {
    switch (selectedTab) {
      case "profile":
        return (
          <ProfileForm
            user={user}
            form={profileForm}
            onSubmit={onProfileSubmit}
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            isUpdating={isUpdating}
            isUploading={isUploadingImage}
            isRemoving={isRemovingImage}
          />
        );
      case "security":
        return (
          <SecuritySettings
            form={passwordForm}
            onSubmit={onPasswordSubmit}
            isUpdating={isUpdating}
          />
        );
      case "payments":
        return <PaymentMethods />;
      case "notifications":
        return <NotificationPreferences />;
      default:
        return null;
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Image Cropper Modal */}
      <Dialog open={showImageCropper} onOpenChange={handleCropperCancel}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Crop your image</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCropperCancel}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {imagePreviewUrl && (
            <ImageCropper
              imageUrl={imagePreviewUrl}
              onSubmit={handleCropSubmit}
              onCancel={handleCropperCancel}
              isUploading={isUploadingImage}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="w-full md:w-1/4">
              <ProfileSidebar
                user={user}
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
                onNavigate={navigate}
                isUploading={isUploadingImage}
                isRemoving={isRemovingImage}
              />
            </div>
            
            {/* Main content */}
            <div className="w-full md:w-3/4">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}