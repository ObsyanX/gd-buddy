import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  MessageSquare, LayoutDashboard, Dumbbell, User,
  Settings as SettingsIcon, LogOut, Menu, GraduationCap, Shield, Home as HomeIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import SEOFooter from "@/components/SEOFooter";
import NotificationBell from "@/components/NotificationBell";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const NAV_ITEMS = [
  { label: "Home", icon: HomeIcon, path: "/home" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/home/dashboard" },
  { label: "Profile", icon: User, path: "/home/profile" },
  { label: "Drills", icon: Dumbbell, path: "/home/drills" },
  { label: "Instructor", icon: GraduationCap, path: "/home/instructor" },
  { label: "Settings", icon: SettingsIcon, path: "/home/settings" },
];

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const isActive = (path: string) => {
    if (path === "/home") return location.pathname === "/home";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Ambient orbs shared across the app */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        <div className="ambient-orb w-[60vw] h-[60vw] -top-[20%] -left-[15%]" style={{ background: "hsl(29 60% 45% / 0.4)" }} />
        <div className="ambient-orb w-[40vw] h-[40vw] top-[20%] -right-[10%]" style={{ background: "hsl(12 55% 40% / 0.35)", animationDelay: "4s" }} />
      </div>

      {/* Glass header */}
      <header className="sticky top-0 z-40 py-3 md:py-4 px-3 md:px-6" role="banner">
        <div className="container mx-auto">
          <div className="glass rounded-full px-3 md:px-5 py-2.5 flex items-center justify-between">
            <Link to="/home" className="flex items-center gap-3 group min-w-0" aria-label="GD Buddy Home">
              <div className="w-9 h-9 rounded-xl bg-gradient-copper flex items-center justify-center shadow-copper group-hover:rotate-6 transition-transform duration-slow ease-editorial shrink-0">
                <MessageSquare className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="font-display text-lg md:text-xl tracking-tight text-foreground truncate block">GD Buddy</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {NAV_ITEMS.slice(1).map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  aria-label={`Go to ${item.label}`}
                  className={cn(
                    "relative px-4 py-2 rounded-full text-sm transition-all duration-normal",
                    isActive(item.path)
                      ? "text-primary-glow bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-primary/5",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <item.icon className="w-4 h-4" aria-hidden="true" />
                    {item.label}
                  </span>
                </button>
              ))}
              {isAdmin && (
                <button
                  onClick={() => navigate("/home/admin")}
                  aria-label="Admin"
                  className={cn(
                    "relative px-4 py-2 rounded-full text-sm transition-all",
                    isActive("/home/admin")
                      ? "text-primary-glow bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-primary/5",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Admin
                  </span>
                </button>
              )}
            </nav>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="hidden lg:inline-flex" aria-label="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>

              {/* Mobile menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="glass" size="icon" aria-label="Open menu">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 glass-strong border-l border-border">
                  <nav className="flex flex-col gap-2 mt-8" aria-label="Mobile navigation">
                    {NAV_ITEMS.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => handleNav(item.path)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all",
                          isActive(item.path)
                            ? "bg-primary/15 text-primary-glow"
                            : "text-muted-foreground hover:text-foreground hover:bg-primary/5",
                        )}
                      >
                        <item.icon className="w-4 h-4" aria-hidden="true" />
                        {item.label}
                      </button>
                    ))}
                    {isAdmin && (
                      <button
                        onClick={() => handleNav("/home/admin")}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5"
                      >
                        <Shield className="w-4 h-4" /> Admin
                      </button>
                    )}
                    <button
                      onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-4"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10" role="main">
        <Outlet />
      </main>

      <SEOFooter />
    </div>
  );
};

export default AppLayout;
