// Track 9 · Slice 6 — ADR viewer. Admin-only.
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listIntegrations } from "@/lib/integrations";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";

interface ADR {
  id: string;
  title: string;
  status: string;
  problem: string | null;
  decision: string | null;
  alternatives: string | null;
  tradeoffs: string | null;
  consequences: string | null;
  md_body: string | null;
}

const FALLBACK_ADRS: Partial<ADR>[] = [
  { id: "ADR-001", title: "Multi-Agent AI", status: "accepted", decision: "Split moderation, reasoning, fact-check, memory, scoring across specialized edge functions." },
  { id: "ADR-002", title: "Deterministic Policy Engine", status: "accepted", decision: "Rules-first engine as authoritative decision layer; LLM reasoning is advisory." },
  { id: "ADR-003", title: "Explicit Reasoning Layer", status: "accepted", decision: "reasoning-agent emits structured hypotheses fed into policy engine." },
  { id: "ADR-004", title: "pgvector Memory", status: "accepted", decision: "Postgres pgvector with 768-dim embeddings for duplicate/novelty detection." },
  { id: "ADR-005", title: "Supabase Realtime", status: "accepted", decision: "Realtime channels for messages/presence; RLS enforced." },
  { id: "ADR-006", title: "Event Sourcing", status: "accepted", decision: "Append-only event_log for replay, audit, benchmarking." },
];

export default function ADRs() {
  const { isAdmin, loading } = useIsAdmin();
  const [adrs, setAdrs] = useState<Partial<ADR>[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("adr_docs").select("*").order("id");
      if (data && data.length) setAdrs(data as ADR[]);
      else setAdrs(FALLBACK_ADRS);
    })();
  }, []);

  const runExport = async () => {
    setExporting(true);
    const { data, error } = await supabase.functions.invoke("research-exporter", {
      body: { scope: "session", session_id: prompt("Session ID to export:") },
    });
    setExporting(false);
    if (error) return toast({ title: "Export failed", description: error.message, variant: "destructive" });
    toast({ title: "Export ready", description: `ID: ${data?.export_id ?? "n/a"}` });
  };

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/home" replace />;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <SEOHead title="ADRs & Enterprise" description="Architecture decision records and enterprise integrations" />
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Enterprise & ADRs</h1>

      <Tabs defaultValue="adrs">
        <TabsList>
          <TabsTrigger value="adrs">ADRs</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="research">Research Export</TabsTrigger>
        </TabsList>

        <TabsContent value="adrs" className="space-y-4 mt-4">
          {adrs.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{a.id} · {a.title}</CardTitle>
                <Badge variant="outline">{a.status}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                {a.problem && <p><strong>Problem:</strong> {a.problem}</p>}
                <p><strong>Decision:</strong> {a.decision}</p>
                {a.consequences && <p><strong>Consequences:</strong> {a.consequences}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {listIntegrations().map((i) => (
              <Card key={i.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{i.displayName}</CardTitle>
                  <Badge>{i.integration}</Badge>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Adapter stub registered. Configure webhook & token via org settings to activate.
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="research" className="mt-4 space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Anonymized Research Export</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Exports transcript, scores, knowledge graph, and timeline for a session. PII redacted, user_ids hashed. Signed URL expires in 24h.</p>
              <Button onClick={runExport} disabled={exporting}>{exporting ? "Exporting…" : "Run Export"}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
