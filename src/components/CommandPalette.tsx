import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Home as HomeIcon,
  LayoutDashboard,
  User,
  Dumbbell,
  GraduationCap,
  Settings as SettingsIcon,
  Shield,
  LogOut,
  Download,
  Share2,
  Sparkles,
  BookOpen,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "@/hooks/use-toast";

type CmdItem = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  perform: () => void | Promise<void>;
  keywords?: string;
  shortcut?: string;
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { canInstall, installed, isIOS, install } = usePWAInstall();

  const go = useCallback(
    (path: string) => {
      onOpenChange(false);
      navigate(path);
    },
    [navigate, onOpenChange],
  );

  const handleInstall = useCallback(async () => {
    onOpenChange(false);
    if (isIOS) {
      toast({
        title: "Install on iOS",
        description: "Tap Share, then Add to Home Screen.",
      });
      return;
    }
    const ok = await install();
    if (ok) toast({ title: "GD Buddy installed", description: "Launch from your home screen." });
  }, [install, isIOS, onOpenChange]);

  const handleSignOut = useCallback(async () => {
    onOpenChange(false);
    await signOut();
    navigate("/auth");
  }, [signOut, navigate, onOpenChange]);

  const navItems: CmdItem[] = [
    { id: "nav-home", label: "Home", icon: HomeIcon, perform: () => go("/home"), keywords: "start landing" },
    { id: "nav-dashboard", label: "Dashboard", icon: LayoutDashboard, perform: () => go("/home/dashboard"), keywords: "overview stats" },
    { id: "nav-profile", label: "Profile", icon: User, perform: () => go("/home/profile"), keywords: "me account" },
    { id: "nav-drills", label: "Drills", icon: Dumbbell, perform: () => go("/home/drills"), keywords: "practice exercises" },
    { id: "nav-instructor", label: "Instructor", icon: GraduationCap, perform: () => go("/home/instructor"), keywords: "coach teacher" },
    { id: "nav-settings", label: "Settings", icon: SettingsIcon, perform: () => go("/home/settings"), keywords: "preferences" },
  ];

  const actionItems: CmdItem[] = [
    { id: "act-new-session", label: "Start new GD session", icon: Sparkles, perform: () => go("/home"), keywords: "create discussion begin" },
    { id: "act-guides", label: "Read guides", icon: BookOpen, perform: () => go("/blog"), keywords: "docs learn articles" },
    { id: "act-analytics", label: "View analytics", icon: BarChart3, perform: () => go("/home/dashboard"), keywords: "insights metrics reports" },
  ];

  const systemItems: CmdItem[] = [
    ...(isAdmin
      ? [{ id: "sys-admin", label: "Admin dashboard", icon: Shield, perform: () => go("/home/admin"), keywords: "moderator ops" } as CmdItem]
      : []),
    ...(!installed && (canInstall || isIOS)
      ? [
          {
            id: "sys-install",
            label: isIOS ? "Add to Home Screen" : "Install GD Buddy",
            icon: isIOS ? Share2 : Download,
            perform: handleInstall,
            keywords: "pwa install app",
          } as CmdItem,
        ]
      : []),
    { id: "sys-signout", label: "Sign out", icon: LogOut, perform: handleSignOut, keywords: "logout exit" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search or run a command…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {navItems.map((item) => (
            <CommandItem key={item.id} value={`${item.label} ${item.keywords ?? ""}`} onSelect={() => item.perform()}>
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionItems.map((item) => (
            <CommandItem key={item.id} value={`${item.label} ${item.keywords ?? ""}`} onSelect={() => item.perform()}>
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="System">
          {systemItems.map((item) => (
            <CommandItem key={item.id} value={`${item.label} ${item.keywords ?? ""}`} onSelect={() => item.perform()}>
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
              {item.id === "sys-signout" && <CommandShortcut>⇧⌘Q</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export const useCommandPalette = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
};

export default CommandPalette;
