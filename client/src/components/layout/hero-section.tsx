import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Search } from "lucide-react";

export default function HeroSection() {
  const { user } = useAuth();
  
  return (
    <div className="relative w-full">
      {/* Hero Background */}
      <div className="absolute inset-0 bg-black/40 z-10"></div>
      <div 
        className="w-full h-[500px] bg-cover bg-center"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1604868365551-590c19e69168?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80')" 
        }}
      ></div>
      
      {/* Hero Content */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center container mx-auto px-6 md:px-10">
        <div className="max-w-lg">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Hunt together.<br />
            Stay connected.
          </h1>
          <p className="text-white text-lg mb-6">
            Book your next adventure and discover hunting grounds, lodges, hunting teams, dog handlers, and guides.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href={user ? "/properties" : "/auth"}>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                {user ? "Explore properties" : "Login or Sign up"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="relative mx-auto max-w-5xl px-4 -mt-16 z-30">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-500">Destination</div>
              <div className="flex items-center">
                <input 
                  type="text" 
                  placeholder="Where?" 
                  className="w-full outline-none text-sm" 
                />
              </div>
            </div>
            
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-500">Check-in</div>
              <div className="text-sm">Add date...</div>
            </div>
            
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-500">Check-out</div>
              <div className="text-sm">Add date...</div>
            </div>
            
            <div className="flex items-center">
              <div className="border rounded-lg p-3 flex-grow">
                <div className="text-xs text-gray-500">Guests</div>
                <div className="text-sm">Add guests...</div>
              </div>
              <button className="bg-amber-500 hover:bg-amber-600 text-white p-3 ml-2 rounded-lg">
                <Search size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}