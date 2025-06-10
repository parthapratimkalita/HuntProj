import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: "user" | "provider" | "admin";
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  // Check role if required
  if (requiredRole && user.role !== requiredRole) {
    return (
      <Route path={path}>
        {user.role === "provider" ? (
          <Redirect to="/provider/dashboard" />
        ) : user.role === "admin" ? (
          <Redirect to="/admin/dashboard" />
        ) : (
          <Redirect to="/" />
        )}
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
