import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { invokeWithAuth } from '@/lib/supabase-auth';
import { PRICES, estimateCost, estimateSession, fmtUsd, type UsageRow } from '@/lib/ai-pricing';

interface ListData {
  catalog: { id: string; label: string; category: string }[];
  credentials: { provider: string; enabled: boolean }[];
  usage: Record<string, UsageRow & { last: string | null }>;
}

const CAT: Record<string, string> = { text: 'AI replies', voice: 'Voices', stt: 'Speech-to-text', vision: 'Camera analysis' };

/** Cost estimate for the user's own keys, based on their last 30 days of usage and published prices. */
export function AiCostEstimate({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<ListData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invokeWithAuth<ListData>('ai-keys', { body: { action: 'list' } }).then(({ data, error }) => {
      if (error) setError(error.message); else setData(data);
    });
  }, []);

  const label = (id: string) => data?.catalog.find((c) => c.id === id)?.label ?? id;
  const saved = new Set((data?.credentials ?? []).filter((c) => c.enabled).map((c) => c.provider));
  const used = Object.entries(data?.usage ?? {}).filter(([p]) => PRICES[p]);
  const total = used.reduce((s, [p, u]) => s + (estimateCost(p, u) ?? 0), 0);

  const byCat: Record<string, string[]> = {};
  for (const id of Object.keys(PRICES)) (byCat[PRICES[id].category] ??= []).push(id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimated cost of your own AI keys</CardTitle>
        <CardDescription>
          Based on your last 30 days of use and each provider's published prices. This is an estimate — your provider's bill is the exact figure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">Could not load your usage: {error}</p>}
        {!data && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data && (
          <>
            <div>
              <p className="text-3xl font-bold">{fmtUsd(total)}</p>
              <p className="text-xs text-muted-foreground">
                {used.length ? `last 30 days across ${used.length} provider${used.length > 1 ? 's' : ''}` : 'No requests through your own keys in the last 30 days.'}
              </p>
            </div>
            {used.length > 0 && (
              <ul className="text-sm divide-y divide-border">
                {used.map(([p, u]) => (
                  <li key={p} className="flex justify-between py-2">
                    <span>{label(p)} <span className="text-muted-foreground">· {u.requests} requests{u.tokens ? ` · ${u.tokens.toLocaleString()} tokens` : ''}</span></span>
                    <span className="font-medium">{fmtUsd(estimateCost(p, u) ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
            {!compact && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Estimated cost of one 15-minute practice session</p>
                {Object.entries(byCat).map(([cat, ids]) => (
                  <div key={cat}>
                    <p className="text-xs uppercase text-muted-foreground mb-1">{CAT[cat]}</p>
                    <ul className="grid sm:grid-cols-2 gap-x-6 text-sm">
                      {ids.sort((a, b) => (estimateSession(a) ?? 0) - (estimateSession(b) ?? 0)).map((id) => (
                        <li key={id} className="flex justify-between py-1">
                          <span>{label(id)}{saved.has(id) && <span className="text-primary"> · saved</span>}</span>
                          <span>{fmtUsd(estimateSession(id) ?? 0)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Assumes about 40 AI replies, 30 spoken AI turns, 15 of your answers and one camera frame every 8 seconds.</p>
              </div>
            )}
            {compact && (
              <Button asChild variant="outline" size="sm"><Link to="/home/settings/ai-providers">Compare providers</Link></Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
