// Track 9 · Slice 6 — Enterprise Integration Plugin Framework.
// Optional adapters resolved at runtime via `org_configs`. Every adapter
// implements the same contract, so Moderator/Reasoning agents can dispatch
// notifications, roster syncs, LMS grade posts, etc. through a single API.
import { pluginRegistry, type Plugin } from "@/lib/plugins/registry";

export type IntegrationKind =
  | "conferencing" // Teams / Meet / Zoom
  | "chat" // Slack
  | "lms" // Moodle / Canvas
  | "hr"; // Workday / Greenhouse

export interface IntegrationPlugin extends Plugin {
  kind: "moderator"; // reused slot for typed registry
  id: string;
  integration: IntegrationKind;
  displayName: string;
  /** Sync roster into gd_participants (optional). */
  syncRoster?(sessionId: string): Promise<{ imported: number }>;
  /** Post a session summary / grade back to the source system. */
  postSummary?(sessionId: string, payload: {
    scoreOutOf100?: number;
    reportUrl?: string;
    transcriptUrl?: string;
  }): Promise<{ ok: boolean; externalId?: string }>;
  /** Send a moderator notification (mic granted, phase change). */
  notify?(channel: string, message: string): Promise<void>;
}

const stubAdapter = (
  id: string,
  integration: IntegrationKind,
  displayName: string,
): IntegrationPlugin => ({
  kind: "moderator",
  id,
  integration,
  displayName,
  async syncRoster() {
    return { imported: 0 };
  },
  async postSummary() {
    return { ok: true };
  },
  async notify() {
    /* no-op stub — org must configure webhook/token */
  },
});

export const INTEGRATIONS: IntegrationPlugin[] = [
  stubAdapter("teams", "conferencing", "Microsoft Teams"),
  stubAdapter("meet", "conferencing", "Google Meet"),
  stubAdapter("zoom", "conferencing", "Zoom"),
  stubAdapter("slack", "chat", "Slack"),
  stubAdapter("moodle", "lms", "Moodle"),
  stubAdapter("canvas", "lms", "Canvas"),
  stubAdapter("workday", "hr", "Workday"),
  stubAdapter("greenhouse", "hr", "Greenhouse"),
];

export function registerIntegrations() {
  for (const p of INTEGRATIONS) pluginRegistry.register(p);
}

export function listIntegrations(): IntegrationPlugin[] {
  return INTEGRATIONS;
}

export function getIntegration(id: string): IntegrationPlugin | undefined {
  return INTEGRATIONS.find((p) => p.id === id);
}
