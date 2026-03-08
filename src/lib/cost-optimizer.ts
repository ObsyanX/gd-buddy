import { supabase } from '@/integrations/supabase/client';

interface TrackTokensOptions {
  functionName: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cached?: boolean;
}

// Approximate cost per 1K tokens for supported models
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.00015, output: 0.0006 },
  'gemini-2.5-pro': { input: 0.00125, output: 0.005 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
};

/**
 * Track token usage for cost monitoring. Fire-and-forget.
 */
export async function trackTokenUsage(opts: TrackTokensOptions) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const costs = opts.model ? MODEL_COSTS[opts.model] : null;
    const costEstimate = costs
      ? ((opts.inputTokens || 0) / 1000) * costs.input + ((opts.outputTokens || 0) / 1000) * costs.output
      : 0;

    await supabase.from('token_usage').insert({
      user_id: user.id,
      function_name: opts.functionName,
      model: opts.model || null,
      input_tokens: opts.inputTokens || 0,
      output_tokens: opts.outputTokens || 0,
      cached: opts.cached || false,
      cost_estimate: costEstimate,
    } as any);
  } catch {
    // Silent fail — don't interrupt main flow
  }
}

/**
 * Check response cache before making an expensive AI call.
 */
export async function getCachedResponse(cacheKey: string): Promise<unknown | null> {
  try {
    const { data } = await supabase
      .from('response_cache')
      .select('response_data, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (data && new Date(data.expires_at) > new Date()) {
      return data.response_data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a deterministic cache key from function name and params.
 */
export function makeCacheKey(functionName: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}=${JSON.stringify(params[k])}`).join('&');
  return `${functionName}:${sorted}`;
}
