import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, LayoutDashboard, Dumbbell, User,
  Settings as SettingsIcon, LogOut, GraduationCap, Shield, Home as HomeIcon, Download, Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import gdLogo from "@/assets/gd-buddy-logo-v2.png.asset.json";
import SEOFooter from "@/components/SEOFooter";
import NotificationBell from "@/components/NotificationBell";
import BottomNav from "@/components/BottomNav";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "@/hooks/use-toast";
import { SkipLink, Announcer } from "@/components/a11y";

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
  const { canInstall, installed, isIOS, install } = usePWAInstall();
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleInstall = async () => {
    if (isIOS) {
      toast({
        title: "Install on iOS",
        description: "Tap the Share icon, then choose “Add to Home Screen”.",
      });
      return;
    }
    const ok = await install();
    if (ok) toast({ title: "GD Buddy installed", description: "Launch it from your home screen." });
  };

  const isActive = (path: string) => {
    if (path === "/home") return location.pathname === "/home";
    return location.pathname.startsWith(path);
  };

  const showInstall = !installed && (canInstall || isIOS);

  return (
    <div className="min-h-dvh flex flex-col relative">
      <SkipLink />
      <Announcer />
      {/* Ambient orbs shared across the app */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        <div className="ambient-orb w-[60vw] h-[60vw] -top-[20%] -left-[15%]" style={{ background: "hsl(29 60% 45% / 0.4)" }} />
        <div className="ambient-orb w-[40vw] h-[40vw] top-[20%] -right-[10%]" style={{ background: "hsl(12 55% 40% / 0.35)", animationDelay: "4s" }} />
      </div>

      {/* Glass header */}
      <header className="sticky top-0 z-40 pt-safe py-3 md:py-4 px-1.5 sm:px-3 md:px-6" role="banner">
        <div className="w-full container-app">

          <div className="glass rounded-full px-2 sm:px-3 md:px-5 py-2.5 flex items-center justify-between">
            <Link to="/home" className="flex items-center gap-2.5 md:gap-3 group min-w-0 tap focus-ring rounded-full" aria-label="GD Buddy Home">
              <div className="relative shrink-0 gpu">
                {/* Pulsing copper halo */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-2xl bg-gradient-copper opacity-40 blur-md animate-pulse-soft gpu"
                />
                <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-2xl overflow-hidden shadow-copper ring-1 ring-primary/40 group-hover:ring-primary-glow/70 transition-all duration-slow ease-editorial group-hover:-rotate-6 group-hover:scale-105 gpu">
                  <img
                    src={gdLogo.url}
                    srcSet={`${gdLogo.url}?w=80 80w, ${gdLogo.url}?w=160 160w, ${gdLogo.url}?w=240 240w`}
                    sizes="(min-width: 768px) 44px, 40px"
                    width={44}
                    height={44}
                    decoding="async"
                    fetchPriority="high"
                    alt="GD Buddy logo"
                    className="w-full h-full object-contain transition-transform duration-slow ease-editorial group-hover:scale-110 gpu"
                  />
                  {/* Sheen sweep on hover */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 group-hover:translate-x-full transition-transform duration-1000 ease-editorial gpu"
                  />
                </div>
              </div>
              <div className="min-w-0 overflow-hidden">
                <span className="font-display text-lg md:text-xl tracking-tight text-foreground truncate block">
                  GD
                </span>
              </div>
            </Link>



            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {NAV_ITEMS.slice(1).map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  aria-label={`Go to ${item.label}`}
                  aria-current={isActive(item.path) ? "page" : undefined}
                  className={cn(
                    "relative px-4 py-2 rounded-full text-sm transition-all duration-normal tap focus-ring gpu",
                    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
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
                  aria-current={isActive("/home/admin") ? "page" : undefined}
                  className={cn(
                    "relative px-4 py-2 rounded-full text-sm transition-all tap focus-ring gpu",
                    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
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

            <div className="flex items-center gap-1.5">

              {showInstall && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleInstall}
                  className="hidden md:inline-flex gap-1.5"
                  aria-label={isIOS ? "Add to Home Screen" : "Install GD Buddy"}
                >
                  {isIOS ? <Share2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  <span className="hidden xl:inline">{isIOS ? "Add to Home" : "Install"}</span>
                </Button>
              )}
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="hidden lg:inline-flex"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

        </div>
      </header>


      <main id="main-content" tabIndex={-1} className="flex-1 relative z-10 focus:outline-none" role="main">
        <Outlet />
      </main>

      <SEOFooter />

      {/* Mobile-first bottom navigation with expand tray + install */}
      <BottomNav />

      {/* ⌘K command palette */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
};

export default AppLayout;
