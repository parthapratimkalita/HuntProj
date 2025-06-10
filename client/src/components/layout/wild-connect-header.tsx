import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Globe, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function WildConnectHeader() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="container mx-auto py-4 px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              className="w-6 h-6 text-white"
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </div>
          <div className="ml-2 flex flex-col">
            <span className="text-white text-lg font-bold">Wild</span>
            <span className="text-amber-500 text-lg font-bold -mt-1">Connect</span>
          </div>
        </Link>

        {/* Right Side Menu */}
        <div className="flex items-center">
          <button className="flex items-center mr-4 text-white bg-transparent border border-white/30 rounded-full py-1 px-3">
            <Globe className="w-4 h-4 mr-2" />
            <span className="text-sm">EN</span>
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center focus:outline-none bg-white rounded-full p-1 hover:shadow-md transition-shadow">
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
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center mr-2">
                          <User className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                          <div className="font-semibold">{user.fullName || user.username}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    
                    <Link href="/profile">
                      <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                    </Link>
                    
                    <Link href="/bookings">
                      <DropdownMenuItem className="cursor-pointer">Trips</DropdownMenuItem>
                    </Link>
                    
                    <Link href="/wishlists">
                      <DropdownMenuItem className="cursor-pointer">Wishlists</DropdownMenuItem>
                    </Link>
                    
                    {user.role === "provider" && (
                      <Link href="/provider/dashboard">
                        <DropdownMenuItem className="cursor-pointer">Hosting Dashboard</DropdownMenuItem>
                      </Link>
                    )}
                    
                    {user.role === "admin" && (
                      <Link href="/admin/dashboard">
                        <DropdownMenuItem className="cursor-pointer">Admin Dashboard</DropdownMenuItem>
                      </Link>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">Log out</DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              ) : (
                <>
                  <Link href="/auth">
                    <DropdownMenuItem className="cursor-pointer font-medium">Sign up</DropdownMenuItem>
                  </Link>
                  <Link href="/auth">
                    <DropdownMenuItem className="cursor-pointer">Log in</DropdownMenuItem>
                  </Link>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}