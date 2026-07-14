import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";

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
import { startRUM } from "./lib/rum";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Fire-and-forget real-user monitoring (LCP/INP/CLS w/ AdSense state)
if (typeof window !== "undefined") {
  const kick = () => startRUM();
  if ("requestIdleCallback" in window) (window as { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback(kick, { timeout: 3000 });
  else setTimeout(kick, 1500);
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
