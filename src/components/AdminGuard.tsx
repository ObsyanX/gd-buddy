import { Navigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

/**
 * Route guard: only renders children when the user is authenticated AND
 * confirmed as admin (email match + user_roles row). Non-admins are toasted
 * and redirected to /home.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  const toasted = useRef(false);

  useEffect(() => {
    if (!authLoading && !loading && user && !isAdmin && !toasted.current) {
      toasted.current = true;
      toast({
        title: "Admins only",
        description: "You don’t have access to that page.",
        variant: "destructive",
      });
    }
  }, [authLoading, loading, user, isAdmin]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">
        Verifying access…
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;

  return <>{children}</>;
}
