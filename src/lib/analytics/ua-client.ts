import { UAParser } from "ua-parser-js";

export function detectClientEnv() {
  try {
    const p = new UAParser();
    const d = p.getDevice();
    return {
      device: d.type || "desktop",
      browser: p.getBrowser().name || "unknown",
      os: p.getOS().name || "unknown",
    };
  } catch {
    return { device: "desktop", browser: "unknown", os: "unknown" };
  }
}
