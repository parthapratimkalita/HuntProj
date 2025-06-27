import { useRef, useState, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Camera, Upload, Trash2, Loader2 } from "lucide-react";
import { useAvatar } from "@/hooks/useAvatar";

interface User {
  avatarUrl?: string;
  avatar_url?: string;
  fullName?: string;
  username?: string;
}

interface ProfileAvatarProps {
  user: User;
  size?: "sm" | "md" | "lg";
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  isUploading: boolean;
  isRemoving: boolean;
  showDropdown?: boolean;
}

export const ProfileAvatar = ({
  user,
  size = "md",
  onImageUpload,
  onImageRemove,
  isUploading,
  isRemoving,
  showDropdown = true
}: ProfileAvatarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use the avatar caching hook
  const avatarUrl = useMemo(() => 
    user?.avatarUrl || user?.avatar_url, 
    [user?.avatarUrl, user?.avatar_url]
  );
  const { blobUrl, error: imageError } = useAvatar(avatarUrl);

  const getInitials = (name: string) =>
    name.split(" ").map(part => part[0]).join("").toUpperCase().substring(0, 2);

  const hasProfilePicture = Boolean(blobUrl && !imageError);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32"
  };

  const buttonSizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-10 w-10"
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageUpload}
        style={{ display: 'none' }}
      />

      <div className="relative avatar-container">
        <Avatar className={`${sizeClasses[size]} border-4 border-white shadow-md`}>
          {blobUrl && !imageError ? (
            <AvatarImage 
              src={blobUrl}
              className="avatar-image-quality object-cover"
              alt="Profile picture"
            />
          ) : null}
          <AvatarFallback className={size === "sm" ? "text-sm" : size === "md" ? "text-xl" : "text-2xl"}>
            {getInitials(user.fullName || user.username || "U")}
          </AvatarFallback>
        </Avatar>
        
        {showDropdown && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                className={`absolute bottom-0 right-0 rounded-full ${buttonSizeClasses[size]} p-0 bg-white shadow-md hover:bg-gray-50`}
                disabled={isUploading || isRemoving}
              >
                {isUploading || isRemoving ? (
                  <Loader2 className={`${iconSizeClasses[size]} animate-spin`} />
                ) : (
                  <Camera className={iconSizeClasses[size]} />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => fileInputRef.current?.click()} 
                className="cursor-pointer"
                disabled={isUploading || isRemoving}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload new picture
              </DropdownMenuItem>
              {hasProfilePicture && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={onImageRemove} 
                    className="cursor-pointer text-red-600" 
                    disabled={isRemoving || isUploading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isRemoving ? "Removing..." : "Remove picture"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </>
  );
};