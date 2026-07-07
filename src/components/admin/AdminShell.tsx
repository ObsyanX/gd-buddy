import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, Tags, Layers,
  Megaphone, Rocket, BarChart3, MessageSquare, Mail, FileBarChart, Settings,
} from "lucide-react";

const nav = [
  { to: "/home/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/home/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/home/admin/users", label: "Users", icon: Users },
  { to: "/home/admin/articles", label: "Articles", icon: FileText },
  { to: "/home/admin/categories", label: "Categories", icon: Layers },
  { to: "/home/admin/tags", label: "Tags", icon: Tags },
  { to: "/home/admin/ads", label: "Advertisements", icon: Megaphone },
  { to: "/home/admin/campaigns", label: "Campaigns", icon: Rocket },
  { to: "/home/admin/comments", label: "Comments", icon: MessageSquare },
  { to: "/home/admin/newsletter", label: "Newsletter", icon: Mail },
  { to: "/home/admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/home/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminShell() {
  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 md:p-6">
      <aside className="md:w-56 shrink-0">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3 px-2">
          Admin
        </div>
        <nav className="grid grid-cols-2 md:grid-cols-1 gap-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
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
