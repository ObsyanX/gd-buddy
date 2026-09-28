import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, GripVertical, KeyRound, RefreshCw, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { invokeWithAuth } from '@/lib/supabase-auth';

type Category = 'text' | 'voice' | 'stt' | 'vision';
interface CatalogItem { id: string; label: string; category: Category; models: string[]; dashboardUrl: string; reportsQuota: boolean }
interface Credential {
  provider: string; category: Category; key_tail: string; model: string | null; enabled: boolean;
  validation_status: string | null; validation_message: string | null; last_validated_at: string | null;
  last_used_at: string | null; disabled_until: string | null; consecutive_failures: number;
}
interface ProviderEvent {
  id: string; provider: string; category?: string; kind?: string; error_kind?: string; message?: string | null;
  fallback_provider?: string | null; fallback_model?: string | null; model?: string | null;
  occurrences?: number; updated_at: string; created_at?: string;
}
interface Prefs {
  preferred_text?: string | null; preferred_voice?: string | null; preferred_stt?: string | null; preferred_vision?: string | null;
  platform_fallback?: boolean; priority_order?: Record<string, string[]>;
}
interface ListResponse {
  catalog: CatalogItem[]; credentials: Credential[]; preferences: Prefs; events: ProviderEvent[];
  usage: Record<string, { requests: number; errors: number; tokens: number; last: string | null }>; synced_at: string;
}

const CATEGORY_LABEL: Record<Category, string> = { text: 'Text AI', voice: 'Voice', stt: 'Speech-to-text', vision: 'Image analysis' };
const STATUS_LABEL: Record<string, string> = {
  not_configured: 'Not configured', validating: 'Validating', connected: 'Connected', invalid_key: 'Invalid key',
  rate_limited: 'Rate limited', quota_exhausted: 'Quota exhausted', server_error: 'Unavailable', timeout: 'Unavailable',
  network: 'Unavailable', unsupported_model: 'Unsupported model', bad_request: 'Request rejected', permission_denied: 'Permission denied',
  missing_credentials: 'Not configured', bad_audio: 'Audio rejected', safety_refusal: 'Refused by provider', disabled: 'Disabled',
  fallback_active: 'Fallback active',
};

const fmt = (t: string | null | undefined) => (t ? new Date(t).toLocaleString() : 'Never');

function statusOf(c: Credential | undefined, validating: boolean): string {
  if (validating) return 'validating';
  if (!c) return 'not_configured';
  if (!c.enabled) return 'disabled';
  if (c.disabled_until && new Date(c.disabled_until) > new Date()) return 'fallback_active';
  return c.validation_status || 'not_configured';
}
function badgeVariant(s: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'connected') return 'default';
  if (s === 'not_configured' || s === 'disabled' || s === 'validating') return 'secondary';
  if (s === 'rate_limited' || s === 'fallback_active') return 'outline';
  return 'destructive';
}

export default function AiProviders() {
  const { toast } = useToast();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState<string | null>(null);

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data: d, error } = await invokeWithAuth('ai-keys', { body });
    if (error) throw error;
    return d;
  }, []);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setData(await call({ action: 'list' }) as ListResponse);
    } catch (e) {
      setLoadError((e as Error).message || 'Could not load your providers');
    } finally { setLoading(false); }
  }, [call]);

  useEffect(() => { load(); }, [load]);

  const creds = useMemo(() => Object.fromEntries((data?.credentials ?? []).map((c) => [c.provider, c])), [data]);
  const prefs = data?.preferences ?? { platform_fallback: true };

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      const r = await fn() as { status?: string; message?: string } | null;
      if (r?.status && r.status !== 'connected') {
        toast({ title: STATUS_LABEL[r.status] ?? r.status, description: r.message ?? undefined, variant: 'destructive' });
      } else if (ok) toast({ title: ok });
      await load();
    } catch (e) {
      toast({ title: 'Something went wrong', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy((b) => ({ ...b, [key]: false })); }
  };

  const orderFor = (cat: Category): string[] => {
    const all = (data?.catalog ?? []).filter((c) => c.category === cat).map((c) => c.id);
    const saved = (prefs.priority_order?.[cat] ?? []).filter((id) => all.includes(id));
    return [...saved, ...all.filter((id) => !saved.includes(id))];
  };

  const savePrefs = (patch: Partial<Prefs>) =>
    run('prefs', () => call({ action: 'preferences', ...prefs, ...patch }), 'Preferences saved');

  const moveTo = (cat: Category, id: string, targetIndex: number) => {
    const order = orderFor(cat).filter((x) => x !== id);
    order.splice(Math.max(0, Math.min(targetIndex, order.length)), 0, id);
    savePrefs({ priority_order: { ...(prefs.priority_order ?? {}), [cat]: order } });
  };

  if (loading) return <div className="container mx-auto p-8 text-center text-muted-foreground">Loading your AI providers…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border p-4">
        <div className="container mx-auto flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to settings"><Link to="/home/settings"><ArrowLeft /></Link></Button>
          <h1 className="text-2xl md:text-4xl font-bold">AI PROVIDERS &amp; API KEYS</h1>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {loadError && (
            <Card className="p-4 border-2 border-destructive space-y-2">
              <p className="font-semibold">Could not load your providers</p>
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Button size="sm" onClick={() => { setLoading(true); load(); }}>Retry</Button>
            </Card>
          )}

          <Card className="p-6 border-4 border-border space-y-4">
            <p className="text-sm text-muted-foreground">
              Add your own keys to use your own AI accounts. Keys are encrypted, never shown again after saving (only the last 4 characters), and only you can see or change them.
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="pf" className="font-semibold">Use GD Buddy's built-in AI if my keys fail</Label>
                <p className="text-xs text-muted-foreground">When off, you'll see a clear error instead of a silent switch.</p>
              </div>
              <Switch id="pf" checked={prefs.platform_fallback !== false} disabled={busy.prefs}
                onCheckedChange={(v) => savePrefs({ platform_fallback: v })} />
            </div>
            {data && <p className="text-xs text-muted-foreground">Last synced {fmt(data.synced_at)}</p>}
          </Card>

          {(Object.keys(CATEGORY_LABEL) as Category[]).map((cat) => {
            const order = orderFor(cat);
            const prefKey = `preferred_${cat}` as keyof Prefs;
            const configured = order.filter((id) => creds[id]);
            return (
              <section key={cat} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">{CATEGORY_LABEL[cat]}</h2>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Preferred</Label>
                    <Select value={(prefs[prefKey] as string) || 'none'}
                      onValueChange={(v) => savePrefs({ [prefKey]: v === 'none' ? null : v } as Partial<Prefs>)}>
                      <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Follow order</SelectItem>
                        {configured.map((id) => (
                          <SelectItem key={id} value={id}>{data!.catalog.find((c) => c.id === id)?.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {order.map((id, idx) => {
                  const item = data!.catalog.find((c) => c.id === id)!;
                  const c = creds[id];
                  const st = statusOf(c, !!busy[`v-${id}`] || !!busy[`s-${id}`]);
                  const usage = data!.usage[id];
                  const events = data!.events.filter((e) => e.provider === id);
                  return (
                    <Card key={id} draggable
                      onDragStart={() => setDragging(id)} onDragEnd={() => setDragging(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragging && dragging !== id) moveTo(cat, dragging, idx); setDragging(null); }}
                      className={`p-4 border-2 border-border space-y-3 ${dragging === id ? 'opacity-50' : ''}`}>
                      <div className="flex items-start gap-3">
                        <GripVertical className="w-5 h-5 mt-1 text-muted-foreground cursor-grab shrink-0" aria-hidden />
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center font-bold shrink-0" aria-hidden>
                          {item.label.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{item.label}</span>
                            <Badge variant="outline">{CATEGORY_LABEL[cat]}</Badge>
                            <Badge variant={badgeVariant(st)}>{STATUS_LABEL[st] ?? st}</Badge>
                          </div>
                          {c && <p className="text-xs text-muted-foreground mt-1">Saved key ••••{c.key_tail} · Last tested {fmt(c.last_validated_at)} · Last used {fmt(c.last_used_at)}</p>}
                          {c?.validation_message && st !== 'connected' && <p className="text-xs text-destructive mt-1">{c.validation_message}</p>}
                        </div>
                        <div className="flex flex-col">
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Move up" disabled={idx === 0 || busy.prefs} onClick={() => moveTo(cat, id, idx - 1)}><ArrowUp className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Move down" disabled={idx === order.length - 1 || busy.prefs} onClick={() => moveTo(cat, id, idx + 1)}><ArrowDown className="w-4 h-4" /></Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input id={`key-${id}`} type={show[id] ? 'text' : 'password'} autoComplete="off"
                            placeholder={c ? `Replace key ending ${c.key_tail}` : 'Paste API key'}
                            value={drafts[id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))} className="pr-10" />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" aria-label={show[id] ? 'Hide key' : 'Show key'}
                            onClick={() => setShow((s) => ({ ...s, [id]: !s[id] }))}>{show[id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
                        </div>
                        <Button disabled={(drafts[id]?.trim().length ?? 0) < 8 || busy[`s-${id}`]}
                          onClick={() => run(`s-${id}`, async () => {
                            const r = await call({ action: 'save', provider: id, apiKey: drafts[id].trim(), model: c?.model ?? undefined });
                            setDrafts((d) => ({ ...d, [id]: '' }));
                            return r;
                          }, 'Key saved and connected')}>Save</Button>
                      </div>

                      {c && (
                        <div className="flex flex-wrap items-center gap-3">
                          <Select value={c.model || 'default'} onValueChange={(v) => run(`m-${id}`, () => call({ action: 'update', provider: id, model: v === 'default' ? null : v }), 'Model updated')}>
                            <SelectTrigger className="w-56 h-9" aria-label={cat === 'voice' ? 'Voice or model' : 'Model'}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default ({item.models[0]})</SelectItem>
                              {item.models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" disabled={busy[`v-${id}`]} onClick={() => run(`v-${id}`, () => call({ action: 'validate', provider: id }), 'Key works')}>
                            <RefreshCw className="w-4 h-4 mr-1" />Test key
                          </Button>
                          <div className="flex items-center gap-2">
                            <Switch id={`en-${id}`} checked={c.enabled} onCheckedChange={(v) => run(`e-${id}`, () => call({ action: 'update', provider: id, enabled: v }))} />
                            <Label htmlFor={`en-${id}`} className="text-sm">Enabled</Label>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4 mr-1" />Remove</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove your {item.label} key?</AlertDialogTitle>
                                <AlertDialogDescription>The saved key is deleted permanently. You can add it again later.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => run(`d-${id}`, () => call({ action: 'delete', provider: id }), 'Key removed')}>Remove</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}

                      {c && (
                        <div className="text-xs text-muted-foreground border-t border-border pt-2">
                          {item.reportsQuota ? 'Usage from this app (last 30 days). ' : 'Quota information unavailable from this provider. '}
                          {usage ? `${usage.requests} requests, ${usage.errors} errors${usage.tokens ? `, ${usage.tokens.toLocaleString()} tokens` : ''}.` : 'No requests yet.'}{' '}
                          <a href={item.dashboardUrl} target="_blank" rel="noreferrer" className="underline">Open {item.label} dashboard</a>
                        </div>
                      )}

                      {events.length > 0 && (
                        <div className="space-y-2" role="status">
                          {events.map((ev) => {
                            const kind = ev.error_kind ?? ev.kind ?? 'server_error';
                            return (
                              <div key={ev.id} className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-semibold">{STATUS_LABEL[kind] ?? kind}{(ev.occurrences ?? 1) > 1 ? ` ×${ev.occurrences}` : ''}</p>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Dismiss" onClick={() => run(`x-${ev.id}`, () => call({ action: 'dismiss_event', id: ev.id }))}><X className="w-4 h-4" /></Button>
                                </div>
                                <p className="text-xs text-muted-foreground">{item.label} · {CATEGORY_LABEL[cat]} · {fmt(ev.updated_at)}</p>
                                {ev.message && <p className="text-xs">{ev.message}</p>}
                                <p className="text-xs">
                                  {ev.fallback_provider ? `Served instead by ${ev.fallback_provider}${ev.fallback_model ? ` (${ev.fallback_model})` : ''}.` : 'No fallback was used for this request.'}
                                </p>
                                <div className="flex gap-2 pt-1">
                                  <Button size="sm" variant="outline" onClick={() => run(`v-${id}`, () => call({ action: 'validate', provider: id }), 'Key works')}>Retry</Button>
                                  <Button size="sm" variant="outline" onClick={() => document.getElementById(`key-${id}`)?.focus()}><KeyRound className="w-4 h-4 mr-1" />Fix API key</Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
