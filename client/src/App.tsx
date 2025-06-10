import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./hooks/use-auth";
import { WishlistProvider } from "./hooks/use-wishlist";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import OAuthCallbackPage from "@/pages/oauth-callback-page";
import PropertyDetailPage from "@/pages/property-detail-page";
import BookingsPage from "@/pages/user/bookings-page";
import ProfilePage from "@/pages/user/profile-page";
import AccountSettingsPage from "@/pages/user/account-settings-page";
import WishlistsPage from "@/pages/user/wishlists-page";
import ProviderDashboardPage from "@/pages/provider/dashboard-page";
import ProviderApplyPage from "@/pages/provider/apply-page";
import PropertyFormPage from "@/pages/provider/property-form-page";
import AdminDashboardPage from "@/pages/admin/dashboard-page";
import TestAuthPage from "@/pages/test-auth";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/oauth-callback" component={OAuthCallbackPage} />
      <Route path="/test-auth" component={TestAuthPage} />
      <Route path="/properties/:id">
        {params => <PropertyDetailPage id={parseInt(params.id)} />}
      </Route>
      
      {/* User routes */}
      <ProtectedRoute path="/bookings" component={() => <BookingsPage />} />
      <ProtectedRoute path="/profile" component={() => <ProfilePage />} />
      <ProtectedRoute path="/account-settings" component={() => <AccountSettingsPage />} />
      <ProtectedRoute path="/wishlists" component={() => <WishlistsPage />} />
      
      {/* Provider routes */}
      <Route path="/provider/apply" component={ProviderApplyPage} />
      <ProtectedRoute 
        path="/provider/dashboard" 
        component={() => <ProviderDashboardPage />} 
        requiredRole="provider"
      />
      <ProtectedRoute 
        path="/provider/properties/new" 
        component={() => <PropertyFormPage />}
        requiredRole="provider"
      />
      <Route path="/provider/properties/:id/edit">
        {params => (
          <ProtectedRoute 
            path={`/provider/properties/${params.id}/edit`}
            component={() => <PropertyFormPage id={params.id} />}
            requiredRole="provider"
          />
        )}
      </Route>
      
      {/* Admin routes */}
      <ProtectedRoute 
        path="/admin/dashboard" 
        component={() => <AdminDashboardPage />} 
        requiredRole="admin"
      />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <WishlistProvider>
            <Router />
          </WishlistProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
