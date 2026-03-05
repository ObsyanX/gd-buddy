import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  MessageSquare, LayoutDashboard, Dumbbell, Users, User,
  Settings as SettingsIcon, LogOut, Menu, Play,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "HOME", icon: MessageSquare, path: "/home" },
  { label: "DASHBOARD", icon: LayoutDashboard, path: "/home/dashboard" },
  { label: "PROFILE", icon: User, path: "/home/profile" },
  { label: "DRILLS", icon: Dumbbell, path: "/home/drills" },
  { label: "SETTINGS", icon: SettingsIcon, path: "/home/settings" },
];

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top navbar */}
      <header className="border-b-4 border-border p-3 md:p-4" role="banner">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2 md:gap-3" aria-label="GD Buddy Home">
            <MessageSquare className="w-7 h-7 md:w-8 md:h-8" aria-hidden="true" />
            <div>
              <span className="text-xl md:text-2xl font-bold tracking-tight">GD BUDDY</span>
              <p className="text-xs font-mono text-muted-foreground hidden sm:block">AI-POWERED GD PRACTICE</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex gap-1" aria-label="Main navigation">
            {NAV_ITEMS.slice(1, 5).map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "outline"}
                size="sm"
                onClick={() => navigate(item.path)}
                className="border-2"
                aria-label={`Go to ${item.label}`}
              >
                <item.icon className="w-4 h-4 mr-1.5" aria-hidden="true" />
                {item.label}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={handleSignOut} className="border-2" aria-label="Sign out">
              <LogOut className="w-4 h-4 mr-1.5" aria-hidden="true" />
              SIGN OUT
            </Button>
          </nav>

          {/* Mobile menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="outline" size="icon" className="border-2" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-l-4 border-border">
              <nav className="flex flex-col gap-2 mt-8" aria-label="Mobile navigation">
                {NAV_ITEMS.map((item) => (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? "default" : "outline"}
                    onClick={() => handleNav(item.path)}
                    className={cn("border-2 justify-start w-full")}
                  >
                    <item.icon className="w-4 h-4 mr-2" aria-hidden="true" />
                    {item.label}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                  className="border-2 justify-start w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                  SIGN OUT
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1" role="main">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
