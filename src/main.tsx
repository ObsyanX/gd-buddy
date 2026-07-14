import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import RootDiagnosticsBoundary from "./components/RootDiagnosticsBoundary";
import { runReactHealthcheck, attemptViteCacheReset } from "./lib/react-healthcheck";

// Premium editorial typography — only weights actually used at render time.
// Each @fontsource CSS declares `font-display: swap` and pulls its own woff2,
// so trimming unused weights = fewer bytes + fewer requests on first paint.
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/karla/400.css";
import "@fontsource/karla/500.css";
import "@fontsource/karla/700.css";
import "@fontsource/jetbrains-mono/400.css";

import "./index.css";

// --- Startup healthcheck ---------------------------------------------------
// Detect duplicate React copies / null dispatcher before rendering. If broken,
// auto-clear browser caches and hard-reload with a bust param (dev only).
const health = runReactHealthcheck();
if (!health.ok) {
  console.error(
    `[healthcheck] ${health.reason}: ${health.detail}\n` +
      `Remediation: restart the dev server so Vite rebuilds node_modules/.vite, ` +
      `or click "Clear cache & reload" if the diagnostics panel appears.`,
  );
  if (import.meta.env.DEV) {
    void attemptViteCacheReset();
  }
} else {
  console.info(`[healthcheck] React ${health.reactVersion} OK`);
}

const diagnostics = `React ${health.reactVersion} · env ${import.meta.env.MODE}` +
  (health.ok ? "" : `\n${health.reason}: ${health.detail}`);

createRoot(document.getElementById("root")!).render(
  <RootDiagnosticsBoundary diagnostics={diagnostics}>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </RootDiagnosticsBoundary>,
);

// --- Deferred RUM ---------------------------------------------------------
// Only boot after the app root has mounted (load event) AND the healthcheck
// passed, so provider/hook crashes never trickle out of a background task.
if (typeof window !== "undefined" && health.ok) {
  const boot = () => {
    // dynamic import so a failure to resolve web-vitals never blocks the app
    import("./lib/rum")
      .then((m) => m.startRUM())
      .catch((err) => console.warn("[rum] disabled:", err));
  };
  const schedule = () => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
    if (w.requestIdleCallback) w.requestIdleCallback(boot, { timeout: 3000 });
    else setTimeout(boot, 1500);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}

// Service worker strategy:
// - Production: register SW
// - Development/preview: aggressively unregister SW + clear caches to prevent stale Vite chunks
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });

    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
  }
}
