import { useState } from "react";
import { Download, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useToast } from "@/hooks/use-toast";

interface PWAInstallButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
}

/**
 * Inline "Install App" button. Shows only when installable (or on iOS with a
 * how-to sheet). Hidden entirely once the app is already installed / running
 * standalone, so it never clutters the profile after install.
 */
export function PWAInstallButton({
  variant = "outline",
  size = "sm",
  className,
  fullWidth,
}: PWAInstallButtonProps) {
  const { canInstall, installed, isIOS, install } = usePWAInstall();
  const { toast } = useToast();
  const [iosOpen, setIosOpen] = useState(false);

  if (installed) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size}
        disabled
        className={`${fullWidth ? "w-full " : ""}border-2 ${className ?? ""}`}
      >
        <Check className="w-4 h-4 mr-2" />
        App Installed
      </Button>
    );
  }

  if (!canInstall && !isIOS) return null;

  const handleClick = async () => {
    if (canInstall) {
      const accepted = await install();
      if (accepted) toast({ title: "Installing app…" });
      return;
    }
    if (isIOS) setIosOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        className={`${fullWidth ? "w-full " : ""}border-2 ${className ?? ""}`}
      >
        <Download className="w-4 h-4 mr-2" />
        Install App
      </Button>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" /> Install on iPhone / iPad
            </DialogTitle>
            <DialogDescription>
              Safari doesn't expose an install prompt. To add GD Buddy to your Home Screen:
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>Tap the <strong>Share</strong> icon in Safari's toolbar.</li>
            <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong> in the top-right.</li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PWAInstallButton;
