import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function OAuthCallbackPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Parse token from URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      // Store the token in localStorage
      localStorage.setItem("auth_token", token);
      
      // Invalidate the user query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["/api/v1/user"] });
      
      toast({
        title: "Login successful",
        description: "You have been logged in via social media",
      });
      
      // Redirect to home page
      navigate("/");
    } else {
      toast({
        title: "Authentication failed",
        description: "Could not log in with social media",
        variant: "destructive",
      });
      
      // Redirect to login page
      navigate("/auth");
    }
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-bold mb-2">Processing authentication</h1>
        <p className="text-gray-600">Please wait while we log you in...</p>
      </div>
    </div>
  );
}