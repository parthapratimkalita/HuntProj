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
import { Loader2, Shield } from "lucide-react";

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface SecuritySettingsProps {
  form: UseFormReturn<PasswordFormValues>;
  onSubmit: (data: PasswordFormValues) => void;
  isUpdating: boolean;
}

const passwordFields = [
  { 
    name: "currentPassword" as const, 
    label: "Current Password", 
    description: null 
  },
  { 
    name: "newPassword" as const, 
    label: "New Password", 
    description: "Password must be at least 8 characters" 
  },
  { 
    name: "confirmPassword" as const, 
    label: "Confirm New Password", 
    description: null 
  },
];

export const SecuritySettings = ({ 
  form, 
  onSubmit, 
  isUpdating 
}: SecuritySettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>
          Manage your password and account security
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {passwordFields.map(({ name, label, description }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    {description && <FormDescription>{description}</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            
            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </div>
          </form>
        </Form>
        
        {/* Two-Factor Authentication Section */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-base font-medium mb-4">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-600 mb-4">
            Add an extra layer of security to your account by enabling two-factor authentication.
          </p>
          <Button variant="outline">
            <Shield className="mr-2 h-4 w-4" />
            Enable 2FA
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};