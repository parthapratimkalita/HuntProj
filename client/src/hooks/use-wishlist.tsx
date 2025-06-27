import { createContext, ReactNode, useContext, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Property, Wishlist } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type WishlistContextType = {
  wishlistItems: (Wishlist & { property: Property })[] | undefined;
  isLoading: boolean;
  error: Error | null;
  isInWishlist: (propertyId: number) => boolean;
  addToWishlist: (propertyId: number) => Promise<void>;
  removeFromWishlist: (propertyId: number) => Promise<void>;
  refetchWishlists: () => Promise<void>;
};

export const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch wishlists query
  const {
    data: wishlistItems,
    isLoading,
    error,
    refetch
  } = useQuery<(Wishlist & { property: Property })[], Error>({
    queryKey: ["/api/v1/user/wishlists/"],
    enabled: !!user, // Only run query if user is logged in
    queryFn: async ({ queryKey }) => {
      try {
        const res = await apiRequest("GET", queryKey[0] as string);
        const data = await res.json();
        return data;
      } catch (e) {
        console.error("Error fetching wishlist:", e);
        // Return empty array instead of throwing to avoid breaking the UI
        return [];
      }
    },
    retry: 1,
    staleTime: 1000, // 1 second
    initialData: [], // Start with an empty array to avoid undefined errors
  });

  // Helper function to refetch wishlists that can be exposed
  const refetchWishlists = useCallback(async () => {
    if (user) {
      await refetch();
    }
  }, [user, refetch]);

  // Refetch when user changes
  useEffect(() => {
    if (user) {
      refetchWishlists();
    }
  }, [user, refetchWishlists]);

  // Add to wishlist mutation
  const addToWishlistMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      await apiRequest("POST", "/api/v1/wishlists", { propertyId });
    },
    onMutate: async (propertyId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/v1/user/wishlists/"] });

      // Snapshot the previous value
      const previousWishlists = queryClient.getQueryData<(Wishlist & { property: Property })[]>(["/api/v1/user/wishlists/"]);

      // Check if it's already in wishlist
      const alreadyInWishlist = previousWishlists?.some(item => item.propertyId === propertyId);
      if (alreadyInWishlist) {
        return { previousWishlists };
      }

      // Find the property from all properties cache
      const properties = queryClient.getQueryData<Property[]>(["/api/v1/properties/"]);
      const property = properties?.find(p => p.id === propertyId);

      if (property && previousWishlists) {
        // Optimistically update the wishlist
        const optimisticWishlistItem: Wishlist & { property: Property } = {
          id: Date.now(), // Temporary ID
          userId: user?.id || 0,
          propertyId,
          createdAt: new Date(),
          property
        };

        queryClient.setQueryData(["/api/v1/user/wishlists/"], [
          ...previousWishlists,
          optimisticWishlistItem
        ]);
      }

      return { previousWishlists };
    },
    onSuccess: async (_, propertyId) => {
      // Explicitly refetch the wishlist data to ensure it's up to date
      await refetchWishlists();
      
      toast({
        title: "Added to wishlist",
        description: "Property has been added to your wishlist",
      });
    },
    onError: (err, propertyId, context) => {
      // Roll back on error
      if (context?.previousWishlists) {
        queryClient.setQueryData(["/api/v1/user/wishlists/"], context.previousWishlists);
      }
      
      toast({
        title: "Error",
        description: "There was an error adding to your wishlist",
        variant: "destructive",
      });
    },
    onSettled: async () => {
      // Always refetch to ensure we have the latest data
      await refetchWishlists();
    },
  });

  // Remove from wishlist mutation
  const removeFromWishlistMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      const wishlists = wishlistItems || [];
      const wishlistItem = wishlists.find(item => item.propertyId === propertyId);
      
      if (wishlistItem) {
        await apiRequest("DELETE", `/api/v1/wishlists/${wishlistItem.id}`, undefined);
      }
    },
    onMutate: async (propertyId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/v1/user/wishlists/"] });

      // Snapshot the previous value
      const previousWishlists = queryClient.getQueryData<(Wishlist & { property: Property })[]>(["/api/v1/user/wishlists/"]);

      if (previousWishlists) {
        // Optimistically update the wishlist by removing the item
        const newWishlists = previousWishlists.filter(item => item.propertyId !== propertyId);
        queryClient.setQueryData(["/api/v1/user/wishlists/"], newWishlists);
      }

      return { previousWishlists };
    },
    onSuccess: async (_, propertyId) => {
      // Explicitly refetch the wishlist data to ensure it's up to date
      await refetchWishlists();
      
      toast({
        title: "Removed from wishlist",
        description: "Property has been removed from your wishlist",
      });
    },
    onError: (err, propertyId, context) => {
      // Roll back on error
      if (context?.previousWishlists) {
        queryClient.setQueryData(["/api/v1/user/wishlists/"], context.previousWishlists);
      }
      
      toast({
        title: "Error",
        description: "There was an error removing from your wishlist",
        variant: "destructive",
      });
    },
    onSettled: async () => {
      // Always refetch to ensure we have the latest data
      await refetchWishlists();
    },
  });

  // Check if a property is in the wishlist
  const isInWishlist = useCallback((propertyId: number): boolean => {
    return (wishlistItems || []).some(item => item.propertyId === propertyId);
  }, [wishlistItems]);

  // Add to wishlist function
  const addToWishlist = async (propertyId: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save properties to your wishlist",
        variant: "default",
      });
      return;
    }
    
    // Check if already in wishlist to prevent double-adding
    if (isInWishlist(propertyId)) {
      toast({
        title: "Already in wishlist",
        description: "This property is already in your wishlist",
      });
      return;
    }
    
    await addToWishlistMutation.mutateAsync(propertyId);
  };

  // Remove from wishlist function
  const removeFromWishlist = async (propertyId: number) => {
    if (!user) return;
    
    await removeFromWishlistMutation.mutateAsync(propertyId);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        isLoading,
        error,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        refetchWishlists,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}