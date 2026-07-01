import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  LayoutDashboard,
  User,
  Settings as SettingsIcon,
  ChevronUp,
  ChevronDown,
  Dumbbell,
  GraduationCap,
  Shield,
  LogOut,
  LogIn,
  Download,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "@/hooks/use-toast";

const PRIMARY = [
  { label: "Home", icon: HomeIcon, path: "/home" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/home/dashboard" },
  { label: "Profile", icon: User, path: "/home/profile" },
  { label: "Settings", icon: SettingsIcon, path: "/home/settings" },
];

/**
 * Mobile-first floating bottom navigation.
 * Center action toggles an expandable panel with secondary items
 * (Drills, Instructor, Admin, Sign in/out, Install PWA).
 */
const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { canInstall, installed, isIOS, install } = usePWAInstall();
  const [open, setOpen] = useState(false);

  // Close panel on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/home") return location.pathname === "/home";
    return location.pathname.startsWith(path);
  };

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
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

  const showInstall = !installed && (canInstall || isIOS);

  const secondary = [
    { label: "Drills", icon: Dumbbell, onClick: () => go("/home/drills") },
    { label: "Instructor", icon: GraduationCap, onClick: () => go("/home/instructor") },
    ...(isAdmin ? [{ label: "Admin", icon: Shield, onClick: () => go("/home/admin") }] : []),
    ...(showInstall
      ? [{ label: isIOS ? "Add to Home" : "Install App", icon: isIOS ? Share2 : Download, onClick: handleInstall }]
      : []),
    user
      ? {
          label: "Sign out",
          icon: LogOut,
          onClick: async () => {
            setOpen(false);
            await signOut();
            navigate("/auth");
          },
          destructive: true as const,
        }
      : { label: "Sign in", icon: LogIn, onClick: () => go("/auth") },
  ];

  return (
    <>
      {/* Backdrop when expanded */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-background/40 backdrop-blur-sm animate-fade-in"
        />
      )}

      {/* Expandable secondary tray */}
      <div
        className={cn(
          "lg:hidden fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-normal ease-editorial",
          "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]",
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none",
        )}
        role="menu"
        aria-hidden={!open}
      >
        <div className="glass-strong rounded-3xl p-2 shadow-premium flex flex-col gap-1 min-w-[15rem]">
          {secondary.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              role="menuitem"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-colors text-left",
                "destructive" in item && item.destructive
                  ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  : "text-foreground/90 hover:text-primary-glow hover:bg-primary/10",
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary bottom bar */}
      <nav
        className="lg:hidden fixed left-1/2 -translate-x-1/2 z-50 bottom-3 w-[calc(100%-1rem)] max-w-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <div className="glass-strong rounded-full h-16 px-2 flex items-center justify-between shadow-premium relative">
          {PRIMARY.slice(0, 2).map((item) => (
            <NavBtn key={item.path} item={item} active={isActive(item.path)} onClick={() => go(item.path)} />
          ))}

          {/* Center expand */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close more menu" : "Open more menu"}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full",
              "bg-gradient-copper shadow-copper flex items-center justify-center",
              "text-primary-foreground transition-transform duration-normal ease-editorial",
              "hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-glow",
              open && "rotate-180",
            )}
          >
            {open ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
          </button>
          {/* Spacer for the FAB */}
          <div className="w-14 shrink-0" aria-hidden="true" />

          {PRIMARY.slice(2).map((item) => (
            <NavBtn key={item.path} item={item} active={isActive(item.path)} onClick={() => go(item.path)} />
          ))}
        </div>
      </nav>

      {/* Content spacer so page bottom isn't hidden under the bar */}
      <div className="lg:hidden h-24" aria-hidden="true" />
    </>
  );
};

const NavBtn = ({
  item,
  active,
  onClick,
}: {
  item: { label: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    aria-label={item.label}
    aria-current={active ? "page" : undefined}
    className={cn(
      "flex-1 min-w-0 h-12 flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors",
      active ? "text-primary-glow" : "text-muted-foreground hover:text-foreground",
    )}
  >
    <item.icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_8px_hsl(var(--primary-glow)/0.6)]")} aria-hidden="true" />
    <span className="text-[10px] font-medium tracking-wide leading-none">{item.label}</span>
  </button>
);

export default BottomNav;
