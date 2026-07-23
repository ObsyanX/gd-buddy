// AdSense consent-aware loader, event bus, and diagnostics recorder.
//
// - Consent state is persisted in localStorage ("ads_consent"). Defaults to
//   "granted" to preserve current behaviour (site is not in a GDPR-required
//   region by policy). Users can toggle to "denied" via the diagnostics panel
//   or a future consent banner.
// - The AdSense script is only injected once consent is granted. Ad slots
//   registered while denied stay dormant and initialise on the next grant.
// - Every meaningful event (script load/error, slot push, slot fill/unfill,
//   console error containing "adsbygoogle") is pushed onto an event bus that
//   the diagnostics panel subscribes to.

export const ADSENSE_CLIENT = "ca-pub-7535496448152688";
const SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
const CONSENT_KEY = "ads_consent";

export type ConsentState = "granted" | "denied";

export type AdEvent =
  | { type: "consent"; state: ConsentState; at: number }
  | { type: "script-load"; at: number }
  | { type: "script-error"; message: string; at: number }
  | { type: "slot-register"; slotId: string; adSlot: string; at: number }
  | { type: "slot-push"; slotId: string; at: number }
  | { type: "slot-fill"; slotId: string; at: number }
  | { type: "slot-unfilled"; slotId: string; at: number }
  | { type: "console-error"; message: string; at: number };

type Listener = (event: AdEvent) => void;

const listeners = new Set<Listener>();
const history: AdEvent[] = [];
const MAX_HISTORY = 200;

function emit(event: AdEvent) {
  history.push(event);
  if (history.length > MAX_HISTORY) history.shift();
  listeners.forEach((l) => {
    try { l(event); } catch { /* isolate listener errors */ }
  });
}

export function subscribeAdEvents(listener: Listener): () => void {
  listeners.add(listener);
  // Replay recent history so late subscribers see prior events.
  history.forEach((e) => listener(e));
  return () => listeners.delete(listener);
}

export function getAdEventHistory(): AdEvent[] {
  return history.slice();
}

// ---------- consent ----------

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return "granted";
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    if (v === "denied") return "denied";
    return "granted"; // default granted
  } catch {
    return "granted";
  }
}

export function setConsent(state: ConsentState) {
  try { window.localStorage.setItem(CONSENT_KEY, state); } catch { /* ignore */ }
  emit({ type: "consent", state, at: Date.now() });
  if (state === "granted") {
    void loadAdSenseScript();
    drainPendingSlots();
  }
}

// ---------- script loader ----------

let scriptPromise: Promise<void> | null = null;

export function loadAdSenseScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (getConsent() !== "granted") return Promise.reject(new Error("consent-denied"));
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`,
    );
    if (existing) {
      // Assume already loading or loaded.
      if ((window as any).adsbygoogle) {
        emit({ type: "script-load", at: Date.now() });
        resolve();
      } else {
        existing.addEventListener("load", () => {
          emit({ type: "script-load", at: Date.now() });
          resolve();
        }, { once: true });
        existing.addEventListener("error", (ev) => {
          const msg = (ev as ErrorEvent).message || "adsense script failed";
          emit({ type: "script-error", message: msg, at: Date.now() });
          reject(new Error(msg));
        }, { once: true });
      }
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = () => {
      emit({ type: "script-load", at: Date.now() });
      resolve();
    };
    s.onerror = () => {
      const msg = "adsense script failed to load";
      emit({ type: "script-error", message: msg, at: Date.now() });
      reject(new Error(msg));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// ---------- slot registration + push ----------

interface PendingSlot { slotId: string; push: () => void }
const pending: PendingSlot[] = [];

export function registerSlot(slotId: string, adSlot: string, pushFn: () => void) {
  emit({ type: "slot-register", slotId, adSlot, at: Date.now() });
  if (getConsent() !== "granted") {
    pending.push({ slotId, push: pushFn });
    return;
  }
  loadAdSenseScript()
    .then(() => {
      try {
        pushFn();
        emit({ type: "slot-push", slotId, at: Date.now() });
      } catch (err) {
        emit({ type: "console-error", message: `push failed: ${(err as Error).message}`, at: Date.now() });
      }
    })
    .catch((err) => {
      emit({ type: "console-error", message: (err as Error).message, at: Date.now() });
    });
}

function drainPendingSlots() {
  const items = pending.splice(0);
  loadAdSenseScript()
    .then(() => {
      items.forEach(({ slotId, push }) => {
        try {
          push();
          emit({ type: "slot-push", slotId, at: Date.now() });
        } catch (err) {
          emit({ type: "console-error", message: `push failed: ${(err as Error).message}`, at: Date.now() });
        }
      });
    })
    .catch((err) => {
      emit({ type: "console-error", message: (err as Error).message, at: Date.now() });
    });
}

// ---------- global console.error tap for adsbygoogle diagnostics ----------

let consoleTapInstalled = false;
export function installAdSenseConsoleTap() {
  if (consoleTapInstalled || typeof window === "undefined") return;
  consoleTapInstalled = true;
  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const text = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      if (/adsbygoogle|adsense|googlesyndication/i.test(text)) {
        emit({ type: "console-error", message: text.slice(0, 400), at: Date.now() });
      }
    } catch { /* ignore */ }
    originalError(...(args as []));
  };
}

export function reportSlotFillState(slotId: string, filled: boolean) {
  emit({ type: filled ? "slot-fill" : "slot-unfilled", slotId, at: Date.now() });
}
