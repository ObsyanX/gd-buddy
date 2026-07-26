import { useEffect, useRef, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  PWA_PREFS,
  isPWAInstallEnvironment,
  isSnoozed,
  markSnoozed,
} from "@/lib/pwa-install-prefs";

export default function PWAInstallBanner() {
  const { canInstall, installed, isIOS, install } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [installing, setInstalling] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(visible && !exiting);
  const installBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (installed) return;
    if (isSnoozed()) return;
    if (!isPWAInstallEnvironment()) return;
    if (!canInstall && !isIOS) return;
    const t = window.setTimeout(() => setVisible(true), PWA_PREFS.showAfterMs);
    return () => window.clearTimeout(t);
  }, [canInstall, isIOS, installed]);

  // Focus the primary action once the banner mounts.
  useEffect(() => {
    if (visible && !exiting) {
      const t = window.setTimeout(() => installBtnRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [visible, exiting]);

  if (!visible || installed) return null;

  const closeWith = (reason: "later" | "dismissed") => {
    markSnoozed(reason);
    setExiting(true);
    window.setTimeout(() => setVisible(false), 220);
  };

  const onInstall = async () => {
    setInstalling(true);
    try {
      const ok = await install();
      if (ok) {
        markSnoozed("installed");
        setExiting(true);
        window.setTimeout(() => setVisible(false), 220);
      }
    } finally {
      setInstalling(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeWith("later");
    }
  };

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
      onKeyDown={onKeyDown}
      className={[
        "fixed z-[60] left-1/2 -translate-x-1/2",
        "bottom-[max(1rem,env(safe-area-inset-bottom))]",
        "w-[min(calc(100vw-1.5rem),28rem)] pointer-events-auto",
        "transition-all duration-300 ease-out",
        exiting
          ? "opacity-0 translate-y-4"
          : "opacity-100 translate-y-0 animate-in fade-in slide-in-from-bottom-4",
      ].join(" ")}
    >
      <div className="relative rounded-2xl border border-border/60 bg-background/95 dark:bg-background/90 backdrop-blur-xl shadow-2xl shadow-black/20 dark:shadow-black/50 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => closeWith("dismissed")}
          aria-label="Dismiss install prompt"
          className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="shrink-0 h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Download className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p id="pwa-install-title" className="font-semibold text-sm sm:text-base leading-tight text-foreground">
              Install GD Buddy
            </p>
            <p id="pwa-install-desc" className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug">
              {isIOS && !canInstall
                ? "Tap Share, then “Add to Home Screen” for the full app experience."
                : "Add to your home screen for one-tap access, faster load, and full-screen practice."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {isIOS && !canInstall ? (
            <Button
              ref={installBtnRef}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => closeWith("dismissed")}
              aria-label="Got it, close install instructions"
            >
              <Share className="h-4 w-4" aria-hidden="true" /> Got it
            </Button>
          ) : (
            <Button
              ref={installBtnRef}
              size="sm"
              className="flex-1 gap-2"
              onClick={onInstall}
              disabled={installing || !canInstall}
              aria-label={installing ? "Installing GD Buddy" : "Install GD Buddy to your device"}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {installing ? "Installing…" : "Install"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="flex-1"
            onClick={() => closeWith("later")}
            aria-label="Remind me later"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
