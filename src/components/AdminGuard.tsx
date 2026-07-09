import RoleGuard from "./RoleGuard";

/**
 * Admin area guard: admits admin, editor, and analyst roles.
 * Per-page components use `useUserRoles()` to restrict write actions further.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={["admin", "editor", "analyst"]}>{children}</RoleGuard>;
}
