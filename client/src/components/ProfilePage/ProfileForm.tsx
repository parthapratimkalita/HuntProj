import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";

interface User {
  avatarUrl?: string;
  avatar_url?: string;
  fullName?: string;
  username?: string;
}

interface ProfileFormValues {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  bio?: string;
}

interface ProfileFormProps {
  user: User;
  form: UseFormReturn<ProfileFormValues>;
  onSubmit: (data: ProfileFormValues) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  isUpdating: boolean;
  isUploading: boolean;
  isRemoving: boolean;
}

const basicFields = [
  { name: "fullName", label: "Full Name", placeholder: "John Doe" },
  { name: "email", label: "Email", placeholder: "john@example.com" },
  { 
    name: "phone", 
    label: "Phone Number", 
    placeholder: "+1 (555) 123-4567", 
    description: "This will be used for booking notifications",
    fullWidth: true 
  },
] as const;

const addressFields = [
  { name: "city", label: "City", placeholder: "New York" },
  { name: "state", label: "State/Province", placeholder: "NY" },
  { name: "zipCode", label: "ZIP/Postal Code", placeholder: "10001" },
  { name: "country", label: "Country", placeholder: "United States" },
] as const;

export const ProfileForm = ({
  user,
  form,
  onSubmit,
  onImageUpload,
  onImageRemove,
  isUpdating,
  isUploading,
  isRemoving
}: ProfileFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Update your personal details and public profile information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex justify-center mb-6">
              <ProfileAvatar
                user={user}
                size="md"
                onImageUpload={onImageUpload}
                onImageRemove={onImageRemove}
                isUploading={isUploading}
                isRemoving={isRemoving}
              />
            </div>
            
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {basicFields.map(({ name, label, placeholder, description, fullWidth }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className={fullWidth ? "md:col-span-2" : ""}>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input placeholder={placeholder} {...field} />
                      </FormControl>
                      {description && <FormDescription>{description}</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            
            {/* Address Information */}
            <div className="mt-6">
              <h3 className="text-base font-medium mb-4">Address Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addressFields.map(({ name, label, placeholder }) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input placeholder={placeholder} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};