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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera, User, Shield, CreditCard, Bell, Key, Home } from "lucide-react";

// Profile update form schema
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

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Password change form schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function ProfilePage() {
  const [selectedTab, setSelectedTab] = useState("profile");
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      bio: "",
    },
  });
  
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Load user data into the form
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
  
  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    
    setIsUpdating(true);
    
    try {
      // Use PATCH /api/v1/users/me instead of PATCH /api/v1/user/${user.id}
      const response = await apiRequest("PATCH", `/api/v1/users/me`, data);
      const updatedUser = await response.json();
      
      // Update user in cache
      queryClient.setQueryData(["/api/v1/users/me"], updatedUser);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
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
        description: "Your password has been changed successfully",
      });
      
      passwordForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
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
  
  if (!user) {
    navigate("/auth");
    return null;
  }
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="w-full md:w-1/4">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex justify-center">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="text-xl">
                        {getInitials(user.fullName || user.username)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="text-center mt-4">
                    <CardTitle className="text-xl">{user.fullName || user.username}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                    <div className="mt-2 text-sm">
                      Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <nav className="flex flex-col space-y-1">
                    <button
                      className={`flex items-center px-3 py-2 rounded-md text-sm ${selectedTab === "profile" ? "bg-primary/10 text-primary font-medium" : "text-gray-700 hover:bg-gray-100"}`}
                      onClick={() => setSelectedTab("profile")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </button>
                    <button
                      className={`flex items-center px-3 py-2 rounded-md text-sm ${selectedTab === "security" ? "bg-primary/10 text-primary font-medium" : "text-gray-700 hover:bg-gray-100"}`}
                      onClick={() => setSelectedTab("security")}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Security
                    </button>
                    <button
                      className={`flex items-center px-3 py-2 rounded-md text-sm ${selectedTab === "payments" ? "bg-primary/10 text-primary font-medium" : "text-gray-700 hover:bg-gray-100"}`}
                      onClick={() => setSelectedTab("payments")}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Payment Methods
                    </button>
                    <button
                      className={`flex items-center px-3 py-2 rounded-md text-sm ${selectedTab === "notifications" ? "bg-primary/10 text-primary font-medium" : "text-gray-700 hover:bg-gray-100"}`}
                      onClick={() => setSelectedTab("notifications")}
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </button>
                    {user.role === "user" && (
                      <button
                        className={`flex items-center px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100`}
                        onClick={() => navigate("/provider/apply")}
                      >
                        <Home className="mr-2 h-4 w-4" />
                        Become a Host
                      </button>
                    )}
                  </nav>
                </CardContent>
              </Card>
            </div>
            
            {/* Main content */}
            <div className="w-full md:w-3/4">
              {selectedTab === "profile" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Update your personal details and public profile information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                        <div className="flex justify-center mb-6">
                          <div className="relative">
                            <Avatar className="h-24 w-24">
                              <AvatarImage src={user.avatarUrl || undefined} />
                              <AvatarFallback className="text-xl">
                                {getInitials(user.fullName || user.username)}
                              </AvatarFallback>
                            </Avatar>
                            <Button size="sm" variant="outline" className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0">
                              <Camera className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input placeholder="john@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="+1 (555) 123-4567" {...field} />
                                </FormControl>
                                <FormDescription>
                                  This will be used for booking notifications
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="mt-6">
                          <h3 className="text-base font-medium mb-4">Address Information</h3>
                          <div className="grid grid-cols-1 gap-4">
                            <FormField
                              control={profileForm.control}
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
                              <FormField
                                control={profileForm.control}
                                name="city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                      <Input placeholder="New York" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={profileForm.control}
                                name="state"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>State/Province</FormLabel>
                                    <FormControl>
                                      <Input placeholder="NY" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={profileForm.control}
                                name="zipCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>ZIP/Postal Code</FormLabel>
                                    <FormControl>
                                      <Input placeholder="10001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={profileForm.control}
                                name="country"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                      <Input placeholder="United States" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                        
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
              )}
              
              {selectedTab === "security" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Manage your password and account security
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormDescription>
                                Password must be at least 8 characters
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end mt-6">
                          <Button type="submit" disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                          </Button>
                        </div>
                      </form>
                    </Form>
                    
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
              )}
              
              {selectedTab === "payments" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>
                      Manage your payment information and transaction history
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium">No payment methods yet</h3>
                      <p className="text-gray-600 mt-2 mb-6">
                        Add a payment method to make booking hunting properties quicker and easier
                      </p>
                      <Button>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Add Payment Method
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {selectedTab === "notifications" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Control how and when you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Booking Confirmations</h3>
                          <p className="text-gray-600 text-sm">Receive notifications when your booking is confirmed</p>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-4">
                            <label className="text-sm mr-2">Email</label>
                            <input type="checkbox" defaultChecked />
                          </div>
                          <div>
                            <label className="text-sm mr-2">SMS</label>
                            <input type="checkbox" defaultChecked />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Booking Reminders</h3>
                          <p className="text-gray-600 text-sm">Get reminders about upcoming trips</p>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-4">
                            <label className="text-sm mr-2">Email</label>
                            <input type="checkbox" defaultChecked />
                          </div>
                          <div>
                            <label className="text-sm mr-2">SMS</label>
                            <input type="checkbox" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Promotions and Deals</h3>
                          <p className="text-gray-600 text-sm">Stay updated with special offers and discounts</p>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-4">
                            <label className="text-sm mr-2">Email</label>
                            <input type="checkbox" defaultChecked />
                          </div>
                          <div>
                            <label className="text-sm mr-2">SMS</label>
                            <input type="checkbox" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Account Updates</h3>
                          <p className="text-gray-600 text-sm">Important information about your account</p>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-4">
                            <label className="text-sm mr-2">Email</label>
                            <input type="checkbox" defaultChecked />
                          </div>
                          <div>
                            <label className="text-sm mr-2">SMS</label>
                            <input type="checkbox" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-8">
                      <Button>Save Preferences</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}