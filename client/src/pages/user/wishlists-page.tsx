import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Property, Wishlist } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import PropertyCard from "@/components/properties/property-card";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function WishlistsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch user's wishlist with property details
  const { data: wishlistItems, isLoading, error } = useQuery<(Wishlist & { property: Property })[]>({
    queryKey: ["/api/v1/user/wishlists/"],
    enabled: !!user, // Only run this query if user is logged in
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });
        if (res.status === 401) return []; // Return empty array if unauthorized
        if (!res.ok) throw new Error("Failed to fetch wishlist");
        return await res.json();
      } catch (e) {
        console.error("Error fetching wishlist:", e);
        return []; // Return empty array on error
      }
    }
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-6 flex-grow">
        <h1 className="text-2xl font-semibold mb-6">My Wishlists</h1>
        
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All properties</TabsTrigger>
            <TabsTrigger value="cabins">Cabins</TabsTrigger>
            <TabsTrigger value="lodges">Lodges</TabsTrigger>
            <TabsTrigger value="ranches">Ranches</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <p className="text-red-500">Failed to load wishlist. Please try again later.</p>
              </div>
            ) : wishlistItems && wishlistItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {wishlistItems.map((item) => (
                  <div key={item.id}>
                    {item.property && (
                      <PropertyCard
                        id={item.property.id}
                        title={item.property.title}
                        location={`${item.property.city}, ${item.property.state}`}
                        price={item.property.price}
                        images={item.property.images as string[]}
                        inWishlist={true}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <h3 className="text-lg font-medium mb-2">No saved properties yet</h3>
                <p className="text-gray-500 mb-6">Click the heart icon on properties to save them to your wishlist</p>
                <Link href="/">
                  <Button>Browse properties</Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}