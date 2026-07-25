import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "pwa-install-dismissed-at";
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export default function PWAInstallBanner() {
  const { canInstall, installed, isIOS, install } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (installed) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < SNOOZE_MS) return;
    if (!canInstall && !isIOS) return;
    const t = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(t);
  }, [canInstall, isIOS, installed]);

  if (!visible || installed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const onInstall = async () => {
    setInstalling(true);
    try {
      const ok = await install();
      if (ok) setVisible(false);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Install GD Buddy app"
      className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))] w-[min(calc(100vw-1.5rem),28rem)] pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="relative rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/40 p-4 sm:p-5">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="shrink-0 h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm sm:text-base leading-tight">
              Install GD Buddy
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug">
              {isIOS && !canInstall
                ? "Tap Share, then “Add to Home Screen” for the full app experience."
                : "Add to your home screen for one-tap access, faster load, and full-screen practice."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {isIOS && !canInstall ? (
            <Button
              size="sm"
              className="flex-1 gap-2"
              onClick={dismiss}
            >
              <Share className="h-4 w-4" /> Got it
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 gap-2"
              onClick={onInstall}
              disabled={installing || !canInstall}
            >
              <Download className="h-4 w-4" />
              {installing ? "Installing…" : "Install"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="flex-1"
            onClick={dismiss}
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
