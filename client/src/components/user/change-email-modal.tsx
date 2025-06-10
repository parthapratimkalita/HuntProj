import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const emailChangeSchema = z.object({
  newEmail: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required to confirm this change"),
});

type EmailChangeFormData = z.infer<typeof emailChangeSchema>;

interface ChangeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChangeEmailModal({ open, onOpenChange }: ChangeEmailModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const form = useForm<EmailChangeFormData>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: {
      newEmail: user?.email || "",
      password: "",
    },
  });
  
  // Update form when user data changes
  useEffect(() => {
    if (user) {
      form.setValue("newEmail", user.email);
    }
  }, [user, form]);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      form.reset({
        newEmail: user?.email || "",
        password: "",
      });
    }
  }, [open, form, user]);
  
  const changeEmailMutation = useMutation({
    mutationFn: async (data: EmailChangeFormData) => {
      if (!user) throw new Error("You must be logged in");
      
      const res = await apiRequest("POST", "/api/v1/user/change-email", {
        newEmail: data.newEmail,
        password: data.password,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to change email");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email updated",
        description: "Your email has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/user"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update email",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: EmailChangeFormData) => {
    changeEmailMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Email</DialogTitle>
          <DialogDescription>
            Update your email address. You will need to confirm this change with your password.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="newEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Enter your new email" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter your password to confirm" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={changeEmailMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={changeEmailMutation.isPending}
              >
                {changeEmailMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Email
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}