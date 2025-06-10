import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Search, Heart, User } from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const isActive = (path: string) => {
    return location === path ? "text-primary" : "text-gray-500";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 md:hidden z-50">
      <div className="flex justify-around items-center">
        <Link href="/">
          <button className={`mobile-button flex flex-col items-center ${isActive("/")}`}>
            <Search className="text-lg" />
            <span className="text-xs mt-1">Explore</span>
          </button>
        </Link>
        
        <Link href={user ? "/wishlists" : "/auth"}>
          <button className={`mobile-button flex flex-col items-center ${isActive("/wishlists")}`}>
            <Heart className="text-lg" />
            <span className="text-xs mt-1">Wishlist</span>
          </button>
        </Link>
        
        <Link href={user ? "/profile" : "/auth"}>
          <button className={`mobile-button flex flex-col items-center ${isActive("/profile")}`}>
            <User className="text-lg" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
