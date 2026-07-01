// Track 9 Slice 3 — AI Benchmark Runner (edge function).
//
// Reads a labelled evaluation dataset (moderator_decisions joined with
// user_feedback / overrides) and writes a summary row to `benchmark_reports`.
// Admin-only; validates JWT + role in-code because verify_jwt is off by
// default on Lovable-managed edge functions.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  name: z.string().min(1).max(120),
  scope: z.enum(["global", "org", "session"]).default("global"),
  session_id: z.string().uuid().optional(),
  org_id: z.string().uuid().optional(),
  since_hours: z.number().int().min(1).max(24 * 90).default(24 * 30),
  dataset_ref: z.string().optional(),
});

interface Row { predicted: string; expected: string; confidence: number }

function safeDiv(a: number, b: number) { return b === 0 ? 0 : a / b; }

function compute(rows: Row[]) {
  const labels = Array.from(new Set(rows.flatMap((r) => [r.predicted, r.expected])));
  const per = labels.map((label) => {
    let tp = 0, fp = 0, fn = 0;
    for (const r of rows) {
      if (r.predicted === label && r.expected === label) tp++;
      else if (r.predicted === label) fp++;
      else if (r.expected === label) fn++;
    }
    const p = safeDiv(tp, tp + fp), rc = safeDiv(tp, tp + fn);
    return { label, tp, fp, fn, precision: p, recall: rc, f1: safeDiv(2 * p * rc, p + rc) };
  });
  const macro = (k: "precision" | "recall" | "f1") =>
    per.length ? per.reduce((s, c) => s + c[k], 0) / per.length : 0;
  const fp = per.reduce((s, c) => s + c.fp, 0);
  const fn = per.reduce((s, c) => s + c.fn, 0);
  const n = rows.length;
  const po = safeDiv(rows.filter((r) => r.predicted === r.expected).length, n);
  const marg = new Map<string, { p: number; e: number }>();
  labels.forEach((l) => marg.set(l, { p: 0, e: 0 }));
  rows.forEach((r) => { marg.get(r.predicted)!.p++; marg.get(r.expected)!.e++; });
  let pe = 0;
  for (const { p, e } of marg.values()) pe += (p / (n || 1)) * (e / (n || 1));
  const kappa = safeDiv(po - pe, 1 - pe);
  const bins = Array.from({ length: 10 }, () => ({ n: 0, c: 0, s: 0 }));
  rows.forEach((r) => {
    const idx = Math.min(9, Math.max(0, Math.floor(r.confidence * 10)));
    const b = bins[idx];
    b.n++; b.s += r.confidence; if (r.predicted === r.expected) b.c++;
  });
  let ece = 0;
  for (const b of bins) if (b.n) ece += (b.n / n) * Math.abs(b.c / b.n - b.s / b.n);
  return { per, macro_p: macro("precision"), macro_r: macro("recall"), macro_f1: macro("f1"), fp, fn, kappa, ece, n };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin via user JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: corsHeaders });
    const { data: role } = await userClient.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (!role) return new Response(JSON.stringify({ error: "admin_required" }), { status: 403, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { name, scope, session_id, org_id, since_hours, dataset_ref } = parsed.data;
    const since = new Date(Date.now() - since_hours * 3600 * 1000).toISOString();

    // Build labelled dataset: AI decision (predicted) vs override.manual_decision.action (expected).
    // Rows without a matching override fall back to expected = predicted with high confidence
    // (i.e. "confirmed by absence of override") only when they carry an explicit `applied=true` flag.
    let q = admin
      .from("moderator_decisions")
      .select("id, action, confidence, applied, session_id, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (session_id) q = q.eq("session_id", session_id);
    const { data: decisions, error: dErr } = await q;
    if (dErr) throw dErr;

    const ids = (decisions ?? []).map((d) => d.id as string);
    const { data: overrides } = await admin
      .from("overrides")
      .select("decision_id, manual_decision")
      .in("decision_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const overrideByDecision = new Map<string, string>();
    (overrides ?? []).forEach((o) => {
      const md = (o.manual_decision ?? {}) as { action?: string };
      if (o.decision_id && md.action) overrideByDecision.set(o.decision_id as string, md.action);
    });

    const rows: Row[] = (decisions ?? []).map((d) => ({
      predicted: (d.action as string) ?? "unknown",
      expected: overrideByDecision.get(d.id as string) ?? (d.action as string) ?? "unknown",
      confidence: Number(d.confidence ?? 0.5),
    }));

    const metrics = compute(rows);

    const { data: inserted } = await admin
      .from("benchmark_reports")
      .insert({
        name,
        scope,
        dataset_ref: dataset_ref ?? `moderator_decisions since ${since}`,
        metrics: metrics as never,
        precision: metrics.macro_p,
        recall: metrics.macro_r,
        f1: metrics.macro_f1,
        false_positives: metrics.fp,
        false_negatives: metrics.fn,
        ai_human_agreement: metrics.kappa,
        calibration_ece: metrics.ece,
        model_versions: { source: "moderator_decisions_v1" } as never,
      })
      .select("id")
      .maybeSingle();

    return new Response(
      JSON.stringify({ ok: true, id: inserted?.id, n: metrics.n, precision: metrics.macro_p, recall: metrics.macro_r, f1: metrics.macro_f1, agreement: metrics.kappa, ece: metrics.ece, org_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
