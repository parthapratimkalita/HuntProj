import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabaseClient";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  avatarUrl?: string;
  avatar_url?: string;
}

export const useImageUpload = (user: User | null) => {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const { toast } = useToast();
  const { refreshUserProfile } = useAuth();

  const validateFile = useCallback((file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return false;
    }

    return true;
  }, [toast]);

  const deleteOldImage = useCallback(async (avatarUrl: string) => {
    const fileName = avatarUrl.split('/').pop();
    if (fileName) {
      try {
        await supabase.storage.from('profile-images').remove([fileName]);
        console.log('Old image deleted successfully:', fileName);
      } catch (error) {
        console.warn('Failed to delete old image:', error);
        // Don't throw - continue with profile update even if file deletion fails
      }
    }
  }, []);

  const uploadImageToSupabase = useCallback(async (file: File): Promise<string> => {
    const fileName = `${user?.id}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file, { cacheControl: '3600' });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    return publicUrl;
  }, [user?.id]);

  const updateUserProfile = useCallback(async (updateData: any) => {
    const response = await apiRequest("PATCH", `/api/v1/users/me`, updateData);
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    const updatedUser = await response.json();
    console.log('Profile updated successfully:', updatedUser);
    return updatedUser;
  }, []);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !validateFile(file)) return;

    const previewUrl = URL.createObjectURL(file);
    setSelectedImage(file);
    setImagePreviewUrl(previewUrl);
    setShowImageCropper(true);

    // Reset file input
    event.target.value = '';
  }, [user, validateFile]);

  const handleCropSubmit = useCallback(async (croppedFile: File) => {
    if (!user) return;
    setIsUploadingImage(true);

    try {
      // Delete old image if exists
      const currentAvatarUrl = user.avatarUrl || user.avatar_url;
      if (currentAvatarUrl) {
        await deleteOldImage(currentAvatarUrl);
      }

      // Upload new cropped image
      const publicUrl = await uploadImageToSupabase(croppedFile);
      console.log('New image uploaded:', publicUrl);

      // Update user profile with the new image URL
      const updatedUser = await updateUserProfile({ avatar_url: publicUrl });

      // Cleanup cropper state
      setShowImageCropper(false);
      setSelectedImage(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl("");

      // Update the user context with the new data
      await refreshUserProfile();

      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully"
      });

    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploadingImage(false);
    }
  }, [user, deleteOldImage, uploadImageToSupabase, updateUserProfile, toast, imagePreviewUrl, refreshUserProfile]);

  const handleImageRemove = useCallback(async () => {
    if (!user || (!user.avatarUrl && !user.avatar_url)) return;
    setIsRemovingImage(true);

    try {
      const currentAvatarUrl = user.avatarUrl || user.avatar_url;
      if (currentAvatarUrl) {
        await deleteOldImage(currentAvatarUrl);
      }

      // Update user profile to remove avatar
      const updatedUser = await updateUserProfile({ avatar_url: null });

      // Update the user context with the new data
      await refreshUserProfile();

      toast({
        title: "Profile picture removed",
        description: "Your profile picture has been removed successfully"
      });

    } catch (error) {
      console.error('Image removal error:', error);
      toast({
        title: "Removal failed",
        description: error instanceof Error ? error.message : "Failed to remove profile picture",
        variant: "destructive"
      });
    } finally {
      setIsRemovingImage(false);
    }
  }, [user, deleteOldImage, updateUserProfile, toast, refreshUserProfile]);

  const handleCropperCancel = useCallback(() => {
    setShowImageCropper(false);
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl("");
    }
  }, [imagePreviewUrl]);

  return {
    isUploadingImage,
    isRemovingImage,
    showImageCropper,
    imagePreviewUrl,
    handleImageUpload,
    handleCropSubmit,
    handleImageRemove,
    handleCropperCancel,
  };
};