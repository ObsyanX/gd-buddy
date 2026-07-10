import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Sparkles, TrendingUp, TrendingDown, Loader2, Wand2, LineChart, BookOpen } from "lucide-react";

interface Anomaly {
  day: string;
  metric: string;
  value: number;
  z: number;
  direction: "spike" | "drop";
  severity: "medium" | "high";
}

interface AdVariant {
  headline?: string;
  description?: string;
  cta?: string;
}

interface RecItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  view_count: number | null;
  like_count: number | null;
}

export default function AdminIntelligence() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loadingAnom, setLoadingAnom] = useState(true);

  const [product, setProduct] = useState("AI-powered GD practice");
  const [audience, setAudience] = useState("Job seekers preparing for placements");
  const [tone, setTone] = useState("confident, benefit-driven");
  const [variants, setVariants] = useState<AdVariant[]>([]);
  const [loadingCopy, setLoadingCopy] = useState(false);

  const [ctrInput, setCtrInput] = useState({ headline: "", description: "", cta: "Try free", media_type: "image" });
  const [ctr, setCtr] = useState<{ predicted_ctr: number; quality_score: number; rationale: string } | null>(null);
  const [loadingCtr, setLoadingCtr] = useState(false);

  const [recs, setRecs] = useState<RecItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingAnom(true);
      const { data, error } = await supabase.functions.invoke("ai-anomaly-detector", { body: {} });
      if (error) toast({ title: "Anomaly scan failed", description: error.message, variant: "destructive" });
      setAnomalies(((data as { anomalies?: Anomaly[] })?.anomalies ?? []).slice(0, 20));
      setLoadingAnom(false);
    })();
    (async () => {
      setLoadingRecs(true);
      const { data } = await supabase.functions.invoke("ai-recommend-articles", { body: { limit: 6 } });
      setRecs(((data as { items?: RecItem[] })?.items ?? []));
      setLoadingRecs(false);
    })();
  }, []);

  const generateCopy = async () => {
    setLoadingCopy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-ad-copy", {
        body: { product, audience, tone, n: 5 },
      });
      if (error) throw error;
      setVariants((data as { variants?: AdVariant[] })?.variants ?? []);
    } catch (e) {
      toast({ title: "Copy generation failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoadingCopy(false);
    }
  };

  const predictCtr = async () => {
    setLoadingCtr(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-ctr-predictor", { body: ctrInput });
      if (error) throw error;
      setCtr(data as typeof ctr);
    } catch (e) {
      toast({ title: "CTR prediction failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoadingCtr(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Intelligence
        </h1>
        <p className="text-sm text-muted-foreground">Anomaly detection, ad copy generation, CTR prediction, and content recommendations.</p>
      </div>

      {/* Anomalies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><LineChart className="h-4 w-4" /> Anomaly feed (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAnom ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Scanning analytics…</div>
          ) : anomalies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No significant anomalies detected in the last 30 days.</p>
          ) : (
            <div className="space-y-2">
              {anomalies.map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <div className="flex items-center gap-3">
                    {a.direction === "spike" ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                    <span className="font-mono text-xs">{a.day}</span>
                    <span className="font-medium">{a.metric.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">value {a.value.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.severity === "high" ? "destructive" : "secondary"}>{a.severity}</Badge>
                    <span className="text-xs text-muted-foreground">z={a.z.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ad Copy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Wand2 className="h-4 w-4" /> Ad Copy Generator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Product</Label><Input value={product} onChange={(e) => setProduct(e.target.value)} /></div>
            <div><Label>Audience</Label><Input value={audience} onChange={(e) => setAudience(e.target.value)} /></div>
            <div><Label>Tone</Label><Input value={tone} onChange={(e) => setTone(e.target.value)} /></div>
            <Button onClick={generateCopy} disabled={loadingCopy} size="sm">
              {loadingCopy ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Generating…</> : "Generate 5 variants"}
            </Button>
            {variants.length > 0 && (
              <div className="space-y-2 pt-2">
                {variants.map((v, i) => (
                  <div key={i} className="rounded-md border border-border p-3 text-sm">
                    <div className="font-medium">{v.headline}</div>
                    <div className="text-muted-foreground">{v.description}</div>
                    {v.cta && <Badge variant="outline" className="mt-1">{v.cta}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTR Predictor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Predictive CTR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Headline</Label><Input value={ctrInput.headline} onChange={(e) => setCtrInput({ ...ctrInput, headline: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={ctrInput.description} onChange={(e) => setCtrInput({ ...ctrInput, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>CTA</Label><Input value={ctrInput.cta} onChange={(e) => setCtrInput({ ...ctrInput, cta: e.target.value })} /></div>
              <div><Label>Media</Label><Input value={ctrInput.media_type} onChange={(e) => setCtrInput({ ...ctrInput, media_type: e.target.value })} /></div>
            </div>
            <Button onClick={predictCtr} disabled={loadingCtr || !ctrInput.headline} size="sm">
              {loadingCtr ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Scoring…</> : "Predict CTR"}
            </Button>
            {ctr && (
              <div className="rounded-md border border-border p-3 text-sm space-y-1">
                <div>Predicted CTR: <span className="font-mono font-medium">{(ctr.predicted_ctr * 100).toFixed(2)}%</span></div>
                <div>Quality score: <span className="font-mono">{ctr.quality_score.toFixed(2)}</span></div>
                <div className="text-xs text-muted-foreground">{ctr.rationale}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Recommendation Engine preview</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : recs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Publish articles to see recommendations here.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recs.map((r) => (
                <div key={r.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="font-medium truncate">{r.title}</div>
                  {r.excerpt && <div className="text-muted-foreground line-clamp-2 text-xs mt-1">{r.excerpt}</div>}
                  <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                    <span>{r.view_count ?? 0} views</span>
                    <span>{r.like_count ?? 0} likes</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
