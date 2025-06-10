import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  User, Home, LogOut, MapPin, Heart, 
  Search, Menu, PlusCircle, BarChart3,
  Settings
} from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const { user, logout, logoutMutation } = useAuth(); // Added logout import
  const [searchLocation, setSearchLocation] = useState("");
  const [_, navigate] = useLocation();
  
  const handleLogout = async () => {
    console.log('HEADER: Logout button clicked');
    
    try {
      // Call logout directly from useAuth hook
      await logout();
      
      console.log('HEADER: Logout successful, navigating to auth page');
      navigate("/auth");
      
    } catch (error) {
      console.error('HEADER: Logout failed:', error);
      alert("Logout failed: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };
  
  const isActive = (path: string) => {
    return location === path ? "text-primary" : "text-gray-700";
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.0006 5.44L12.0005 5.44003C11.3827 4.51838 10.5775 4 9.75 4C8.09204 4 7 5.45273 7 7.72727C7 9.70281 8.09523 12.0814 9.75 14.2727C10.4167 15.1262 11.1667 15.9524 12 16.7273C12.8333 15.9524 13.5833 15.1262 14.25 14.2727C15.9048 12.0814 17 9.70281 17 7.72727C17 5.45273 15.908 4 14.25 4C13.4225 4 12.6175 4.51838 11.9997 5.44003L12.0006 5.44Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="ml-2 text-xl font-bold text-primary">HuntStay</span>
          </Link>
        </div>
        
        {/* Navigation Buttons */}
        <div className="hidden md:flex items-center justify-center flex-1 max-w-2xl mx-6">
          <div className="flex items-center w-full justify-center">
            <div className="flex space-x-8">
              <Link href="/properties" className="group">
                <div className="flex flex-col items-center space-y-1">
                  <div className="p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-800 group-hover:text-amber-600 transition-colors duration-200">Properties</span>
                  <div className="h-0.5 w-6 bg-amber-600 scale-0 group-hover:scale-100 transition-transform duration-200"></div>
                </div>
              </Link>
              
              <Link href="/services" className="group">
                <div className="flex flex-col items-center space-y-1">
                  <div className="p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-800 group-hover:text-amber-600 transition-colors duration-200">Services</span>
                  <div className="h-0.5 w-6 bg-amber-600 scale-0 group-hover:scale-100 transition-transform duration-200"></div>
                </div>
              </Link>
              
              <Link href="/groups" className="group">
                <div className="flex flex-col items-center space-y-1">
                  <div className="p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="5" r="2.5" />
                      <path d="M7.5 5h3" />
                      <circle cx="9" cy="5" r="4" stroke="currentColor" />
                      
                      <circle cx="17" cy="5" r="2.5" />
                      <path d="M15.5 5h3" />
                      <circle cx="17" cy="5" r="4" stroke="currentColor" />
                      
                      <circle cx="8" cy="14" r="2" />
                      <path d="M5 18.5C5 17.12 6.12 16 7.5 16h1c1.38 0 2.5 1.12 2.5 2.5" />
                      
                      <circle cx="16" cy="14" r="2" />
                      <path d="M13 18.5c0-1.38 1.12-2.5 2.5-2.5h1c1.38 0 2.5 1.12 2.5 2.5" />
                      
                      <circle cx="12" cy="16" r="2" />
                      <path d="M9 20.5c0-1.38 1.12-2.5 2.5-2.5h1c1.38 0 2.5 1.12 2.5 2.5" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-800 group-hover:text-amber-600 transition-colors duration-200">Groups</span>
                  <div className="h-0.5 w-6 bg-amber-600 scale-0 group-hover:scale-100 transition-transform duration-200"></div>
                </div>
              </Link>
              
              <Link href="/friends" className="group">
                <div className="flex flex-col items-center space-y-1">
                  <div className="p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-800 group-hover:text-amber-600 transition-colors duration-200">Find Friends</span>
                  <div className="h-0.5 w-6 bg-amber-600 scale-0 group-hover:scale-100 transition-transform duration-200"></div>
                </div>
              </Link>
            </div>
          </div>
        </div>
        
        {/* User Menu */}
        <div className="flex items-center">
          {user?.role === "provider" ? (
            <Link href="/provider/dashboard">
              <Button variant="ghost" className="hidden md:flex">
                Switch to hosting
              </Button>
            </Link>
          ) : user?.role !== "admin" && (
            <Link href="/provider/apply">
              <Button variant="ghost" className="hidden md:flex">
                Become a host
              </Button>
            </Link>
          )}
          
          <div className="ml-4 relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center focus:outline-none border border-gray-300 rounded-full p-1 hover:shadow-md transition-shadow">
                  <Menu className="mx-2 h-5 w-5 text-gray-600" />
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuItem className="text-sm">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold">{user.fullName || user.username}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      
                      <Link href="/profile">
                        <DropdownMenuItem className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </DropdownMenuItem>
                      </Link>
                      
                      <Link href="/bookings">
                        <DropdownMenuItem className="cursor-pointer">
                          <MapPin className="mr-2 h-4 w-4" />
                          <span>Trips</span>
                        </DropdownMenuItem>
                      </Link>
                      
                      <Link href="/wishlists">
                        <DropdownMenuItem className="cursor-pointer">
                          <Heart className="mr-2 h-4 w-4" />
                          <span>Wishlists</span>
                        </DropdownMenuItem>
                      </Link>
                      
                      <DropdownMenuSeparator />
                      
                      {user.role === "admin" && (
                        <Link href="/admin/dashboard">
                          <DropdownMenuItem className="cursor-pointer">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span>Admin Dashboard</span>
                          </DropdownMenuItem>
                        </Link>
                      )}
                      
                      {user.role === "provider" && (
                        <>
                          <Link href="/provider/dashboard">
                            <DropdownMenuItem className="cursor-pointer">
                              <Home className="mr-2 h-4 w-4" />
                              <span>Hosting Dashboard</span>
                            </DropdownMenuItem>
                          </Link>
                          <Link href="/provider/properties/new">
                            <DropdownMenuItem className="cursor-pointer">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              <span>Add Property</span>
                            </DropdownMenuItem>
                          </Link>
                        </>
                      )}
                      
                      {user.role === "user" && (
                        <Link href="/provider/apply">
                          <DropdownMenuItem className="cursor-pointer">
                            <Home className="mr-2 h-4 w-4" />
                            <span>Become a Host</span>
                          </DropdownMenuItem>
                        </Link>
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      <Link href="/account-settings">
                        <DropdownMenuItem className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Account Settings</span>
                        </DropdownMenuItem>
                      </Link>
                      
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                ) : (
                  <>
                    <Link href="/auth">
                      <DropdownMenuItem className="cursor-pointer font-medium">
                        <span>Sign up</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/auth">
                      <DropdownMenuItem className="cursor-pointer">
                        <span>Log in</span>
                      </DropdownMenuItem>
                    </Link>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}