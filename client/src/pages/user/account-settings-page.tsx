import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import ChangePasswordModal from "@/components/user/change-password-modal";
import ChangeEmailModal from "@/components/user/change-email-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Shield, 
  Bell, 
  UserCheck, 
  Languages, 
  Smartphone, 
  Download, 
  X,
  Clock
} from "lucide-react";

export default function AccountSettingsPage() {
  const { user, isLoading, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  
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
  
  const handleDeactivateAccount = () => {
    setIsDeactivating(true);
    
    // This would be implemented with a real API call
    setTimeout(() => {
      toast({
        title: "Account deactivated",
        description: "Your account has been successfully deactivated. We're sorry to see you go!",
      });
      
      logoutMutation.mutate();
      navigate("/");
      setIsDeactivating(false);
    }, 1500);
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
          
          <Tabs defaultValue="privacy">
            <TabsList className="mb-6">
              <TabsTrigger value="privacy">
                <Shield className="mr-2 h-4 w-4" />
                Privacy & Sharing
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="login">
                <UserCheck className="mr-2 h-4 w-4" />
                Login & Security
              </TabsTrigger>
              <TabsTrigger value="global">
                <Languages className="mr-2 h-4 w-4" />
                Global Preferences
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Manage how your information is used and shared
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Share my profile with hosts</h3>
                      <p className="text-sm text-gray-600">
                        Allow hosts to see your public profile information
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Use precise location</h3>
                      <p className="text-sm text-gray-600">
                        Allow us to use your precise location for better property recommendations
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Show properties I've visited</h3>
                      <p className="text-sm text-gray-600">
                        Allow other users to see properties you've visited
                      </p>
                    </div>
                    <Switch />
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-2">Data Privacy</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Manage your personal data and information
                    </p>
                    
                    <div className="flex space-x-4">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download Your Data
                      </Button>
                      <Button variant="outline" size="sm">
                        <X className="mr-2 h-4 w-4" />
                        Delete All Data
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Control when and how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Push Notifications</h3>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium">Booking updates</h4>
                        <p className="text-xs text-gray-600">
                          Receive updates about your bookings and trips
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium">Promotions and offers</h4>
                        <p className="text-xs text-gray-600">
                          Get notified about deals and special offers
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium">New property alerts</h4>
                        <p className="text-xs text-gray-600">
                          Be informed when new properties match your interests
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Email Notifications</h3>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium">Booking confirmations</h4>
                        <p className="text-xs text-gray-600">
                          Receive email confirmations for your bookings
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium">Account updates</h4>
                        <p className="text-xs text-gray-600">
                          Important updates about your account
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium">Marketing emails</h4>
                        <p className="text-xs text-gray-600">
                          News, inspiration, promotions, and deals
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">SMS Notifications</h3>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium">Text message updates</h4>
                        <p className="text-xs text-gray-600">
                          Receive important booking information via SMS
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="ml-auto">Save Changes</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login & Security</CardTitle>
                  <CardDescription>
                    Manage your account security and login preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Email</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setEmailModalOpen(true)}
                      >
                        Change
                      </Button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Password</h3>
                        <p className="text-sm text-gray-600">Last updated 3 months ago</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPasswordModalOpen(true)}
                      >
                        Update
                      </Button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Two-factor authentication</h3>
                        <p className="text-sm text-gray-600">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Enable</Button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Connected devices</h3>
                        <p className="text-sm text-gray-600">
                          Manage devices that are logged into your account
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Social accounts</h3>
                        <p className="text-sm text-gray-600">
                          Connect your social media accounts for easier login
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Connect</Button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Account activity</h3>
                        <p className="text-sm text-gray-600">
                          View your recent account activity and login history
                        </p>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium text-red-600 mb-2">Danger Zone</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      These actions are permanent and cannot be undone
                    </p>
                    
                    <Button variant="destructive" onClick={handleDeactivateAccount} disabled={isDeactivating}>
                      {isDeactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Deactivate Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="global">
              <Card>
                <CardHeader>
                  <CardTitle>Global Preferences</CardTitle>
                  <CardDescription>
                    Manage your global app settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Language</h3>
                      <p className="text-sm text-gray-600">
                        Choose your preferred language for the application
                      </p>
                    </div>
                    <select className="p-2 border rounded-md">
                      <option>English (US)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                      <option>Chinese (Simplified)</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Currency</h3>
                      <p className="text-sm text-gray-600">
                        Set your preferred currency for prices and payments
                      </p>
                    </div>
                    <select className="p-2 border rounded-md">
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                      <option>CAD ($)</option>
                      <option>AUD ($)</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Time Zone</h3>
                      <p className="text-sm text-gray-600">
                        Set your preferred time zone for bookings and notifications
                      </p>
                    </div>
                    <select className="p-2 border rounded-md">
                      <option>Eastern Time (ET)</option>
                      <option>Central Time (CT)</option>
                      <option>Mountain Time (MT)</option>
                      <option>Pacific Time (PT)</option>
                      <option>UTC</option>
                    </select>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Distance units</h3>
                      <p className="text-sm text-gray-600">
                        Choose your preferred unit for distances
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input type="radio" id="miles" name="distance" defaultChecked className="mr-2" />
                        <label htmlFor="miles" className="text-sm">Miles</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" id="kilometers" name="distance" className="mr-2" />
                        <label htmlFor="kilometers" className="text-sm">Kilometers</label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Date format</h3>
                      <p className="text-sm text-gray-600">
                        Choose how dates are displayed
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input type="radio" id="mdy" name="dateFormat" defaultChecked className="mr-2" />
                        <label htmlFor="mdy" className="text-sm">MM/DD/YYYY</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" id="dmy" name="dateFormat" className="mr-2" />
                        <label htmlFor="dmy" className="text-sm">DD/MM/YYYY</label>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Theme</h3>
                      <p className="text-sm text-gray-600">
                        Choose between light and dark mode
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input type="radio" id="light" name="theme" defaultChecked className="mr-2" />
                        <label htmlFor="light" className="text-sm">Light</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" id="dark" name="theme" className="mr-2" />
                        <label htmlFor="dark" className="text-sm">Dark</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" id="system" name="theme" className="mr-2" />
                        <label htmlFor="system" className="text-sm">System</label>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="ml-auto">Save Preferences</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
      
      {/* Modals */}
      <ChangePasswordModal 
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
      />
      
      <ChangeEmailModal 
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
      />
    </div>
  );
}