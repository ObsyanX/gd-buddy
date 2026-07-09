import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles, type AppRole } from "@/hooks/useUserRoles";
import { toast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

interface Props {
  allow: AppRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Renders children only if the current user has ANY of the allowed roles.
 * Otherwise toasts and redirects (default: /home).
 */
export default function RoleGuard({ allow, children, redirectTo = "/home" }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading } = useUserRoles();
  const toasted = useRef(false);
  const permitted = roles.some((r) => allow.includes(r));

  useEffect(() => {
    if (!authLoading && !loading && user && !permitted && !toasted.current) {
      toasted.current = true;
      toast({
        title: "Not authorized",
        description: "You don't have access to that page.",
        variant: "destructive",
      });
    }
  }, [authLoading, loading, user, permitted]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">
        Verifying access…
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!permitted) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
