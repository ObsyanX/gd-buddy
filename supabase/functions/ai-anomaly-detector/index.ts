// AI Anomaly Detector — flags outliers in analytics_daily using z-score
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Row { day: string; [k: string]: unknown }

const METRICS = ['page_views_total', 'unique_visitors', 'signups', 'ad_revenue_cents', 'article_views', 'sessions_started'];

function zScoreAnomalies(rows: Row[], metric: string, threshold = 2.5) {
  const values = rows.map((r) => Number(r[metric] ?? 0));
  if (values.length < 7) return [];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) || 1;
  return rows
    .map((r, i) => ({ day: r.day, metric, value: values[i], z: (values[i] - mean) / sd }))
    .filter((r) => Math.abs(r.z) >= threshold)
    .map((r) => ({ ...r, direction: r.z > 0 ? 'spike' : 'drop', severity: Math.abs(r.z) >= 3.5 ? 'high' : 'medium' }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data, error } = await admin.from('analytics_daily').select('*').gte('day', since).order('day', { ascending: true });
    if (error) throw error;

    const rows = (data ?? []) as Row[];
    const anomalies = METRICS.flatMap((m) => (rows.some((r) => m in r) ? zScoreAnomalies(rows, m) : []))
      .sort((a, b) => (b.day < a.day ? -1 : 1));

    return new Response(JSON.stringify({ anomalies, window_days: 30, count: anomalies.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
