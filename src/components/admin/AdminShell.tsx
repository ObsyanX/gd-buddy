import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, Tags, Layers,
  Megaphone, Rocket, BarChart3, MessageSquare, Mail, FileBarChart, Settings, ShieldCheck, DollarSign, Sparkles, Activity,
} from "lucide-react";
import { useUserRoles, type AppRole } from "@/hooks/useUserRoles";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  allow: AppRole[]; // roles that can see this item
}

const NAV: NavItem[] = [
  { to: "/home/admin",            label: "Overview",       icon: LayoutDashboard, end: true, allow: ["admin", "editor", "analyst"] },
  { to: "/home/admin/analytics",  label: "Analytics",      icon: BarChart3,       allow: ["admin", "analyst"] },
  { to: "/home/admin/users",      label: "Users",          icon: Users,           allow: ["admin"] },
  { to: "/home/admin/sessions",   label: "Sessions",       icon: Activity,        allow: ["admin", "analyst"] },
  { to: "/home/admin/articles",   label: "Articles",       icon: FileText,        allow: ["admin", "editor", "analyst"] },
  { to: "/home/admin/categories", label: "Categories",     icon: Layers,          allow: ["admin", "editor"] },
  { to: "/home/admin/tags",       label: "Tags",           icon: Tags,            allow: ["admin", "editor"] },
  { to: "/home/admin/ads",        label: "Advertisements", icon: Megaphone,       allow: ["admin", "analyst"] },
  { to: "/home/admin/campaigns",  label: "Campaigns",      icon: Rocket,          allow: ["admin", "analyst"] },
  { to: "/home/admin/revenue",    label: "Revenue",        icon: DollarSign,      allow: ["admin", "analyst"] },
  { to: "/home/admin/comments",   label: "Comments",       icon: MessageSquare,   allow: ["admin", "editor"] },
  { to: "/home/admin/newsletter", label: "Newsletter",     icon: Mail,            allow: ["admin"] },
  { to: "/home/admin/reports",    label: "Reports",        icon: FileBarChart,    allow: ["admin", "analyst"] },
  { to: "/home/admin/intelligence", label: "AI Intelligence", icon: Sparkles,      allow: ["admin", "analyst"] },
  { to: "/home/admin/audit",      label: "Audit log",      icon: ShieldCheck,     allow: ["admin"] },
  { to: "/home/admin/settings",   label: "Settings",       icon: Settings,        allow: ["admin"] },
];

export default function AdminShell() {
  const { roles } = useUserRoles();
  const visible = NAV.filter((n) => n.allow.some((r) => roles.includes(r)));

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 md:p-6">
      <aside className="md:w-56 shrink-0">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3 px-2">
          Admin
        </div>
        <nav className="grid grid-cols-2 md:grid-cols-1 gap-1">
          {visible.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
