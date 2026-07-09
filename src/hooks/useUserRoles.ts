import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "editor" | "analyst" | "instructor" | "user";

export interface UserRolesState {
  roles: AppRole[];
  isAdmin: boolean;
  isEditor: boolean;
  isAnalyst: boolean;
  isAdminArea: boolean;
  loading: boolean;
}

const ADMIN_EMAIL = "duttasayan947595@gdbuddy.com";

/**
 * Loads the current user's `user_roles` rows and returns role-based booleans.
 * Editor / analyst are Phase 3 additions; admin is still allowlist-restricted.
 */
export function useUserRoles(): UserRolesState {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!user) { setRoles([]); setLoading(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancel) return;
      const list = ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
      // Enforce admin allowlist client-side (server enforces via trigger too).
      const filtered = list.filter((r) => r !== "admin" || user.email === ADMIN_EMAIL);
      setRoles(filtered);
      setLoading(false);
    }
    load();
    return () => { cancel = true; };
  }, [user]);

  const isAdmin = roles.includes("admin");
  const isEditor = roles.includes("editor");
  const isAnalyst = roles.includes("analyst");
  return {
    roles,
    isAdmin,
    isEditor,
    isAnalyst,
    isAdminArea: isAdmin || isEditor || isAnalyst,
    loading,
  };
}
