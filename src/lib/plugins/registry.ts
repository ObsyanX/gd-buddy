// Track 1 — Plugin registry. Typed contracts for optional intelligence modules.
// Core stays lightweight: plugins opt-in per org via `org_configs` and are
// resolved at runtime by the corresponding agent (moderator, analytics,
// scoring, fact-check, language, org-evaluation).

export interface PluginContext {
  session_id: string;
  org_id?: string | null;
  now: Date;
}

export interface ModeratorPlugin {
  kind: "moderator";
  id: string;
  onEvent?(evt: unknown, ctx: PluginContext): Promise<void> | void;
}

export interface AnalyticsPlugin {
  kind: "analytics";
  id: string;
  rollup(sessionIds: string[], ctx: PluginContext): Promise<Record<string, unknown>>;
}

export interface FactCheckPlugin {
  kind: "fact_check";
  id: string;
  verify(claim: string, ctx: PluginContext): Promise<{
    verdict: "supported" | "unsupported" | "contradicted" | "unknown";
    confidence: number;
    citations?: string[];
  }>;
}

export interface ScoringPlugin {
  kind: "scoring";
  id: string;
  score(input: unknown, ctx: PluginContext): Promise<Record<string, number>>;
}

export interface LanguagePlugin {
  kind: "language";
  id: string;
  detect(text: string): string; // BCP-47
  normalize?(text: string, lang: string): string;
}

export interface OrgEvaluationPlugin {
  kind: "org_evaluation";
  id: string;
  weights: Record<string, number>;
}

export type Plugin =
  | ModeratorPlugin
  | AnalyticsPlugin
  | FactCheckPlugin
  | ScoringPlugin
  | LanguagePlugin
  | OrgEvaluationPlugin;

class Registry {
  private plugins = new Map<string, Plugin>();
  register(p: Plugin) {
    this.plugins.set(`${p.kind}:${p.id}`, p);
  }
  get<T extends Plugin>(kind: T["kind"], id: string): T | undefined {
    return this.plugins.get(`${kind}:${id}`) as T | undefined;
  }
  byKind<T extends Plugin>(kind: T["kind"]): T[] {
    return [...this.plugins.values()].filter((p) => p.kind === kind) as T[];
  }
  clear() {
    this.plugins.clear();
  }
}

export const pluginRegistry = new Registry();
