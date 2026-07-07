import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AD_PLACEMENTS } from "@/components/ads/AdSlot";
import { toast } from "@/hooks/use-toast";

const AD_TYPES = ["banner", "sidebar", "native", "card", "inline", "sticky_footer", "popup", "video"];
const ROTATIONS = ["weighted", "random", "sequential", "priority"];
const OSES = ["Windows", "macOS", "iOS", "Android", "Linux"];
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge", "Opera"];
const DEVICES = ["desktop", "mobile", "tablet"];

interface Campaign { id: string; name: string }

function csvToArr(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

export default function AdminAdEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const [f, setF] = useState({
    title: "", advertiser: "", description: "",
    image_url: "", image_url_dark: "", destination_url: "", cta_text: "Learn more",
    ad_type: "banner", rotation: "weighted",
    placements: [] as string[], countries: "" , operating_systems: [] as string[],
    browsers: [] as string[], devices: [] as string[],
    start_date: "", end_date: "", priority: 0, weight: 1,
    max_views: "", max_clicks: "", frequency_cap_per_day: "",
    utm_source: "", utm_medium: "", utm_campaign: "",
    status: "active", tracking_enabled: true, campaign_id: "",
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("ad_campaigns").select("id,name").order("name").then(({ data }) => setCampaigns(data ?? []));
    if (!isNew && id) {
      supabase.from("advertisements").select("*").eq("id", id).maybeSingle().then(({ data }) => {
        if (!data) return;
        setF({
          title: data.title, advertiser: data.advertiser ?? "", description: data.description ?? "",
          image_url: data.image_url ?? "", image_url_dark: data.image_url_dark ?? "",
          destination_url: data.destination_url ?? "", cta_text: data.cta_text ?? "Learn more",
          ad_type: data.ad_type, rotation: data.rotation,
          placements: data.placements ?? [], countries: (data.countries ?? []).join(", "),
          operating_systems: data.operating_systems ?? [],
          browsers: data.browsers ?? [], devices: data.devices ?? [],
          start_date: data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : "",
          end_date: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : "",
          priority: data.priority ?? 0, weight: data.weight ?? 1,
          max_views: data.max_views == null ? "" : String(data.max_views),
          max_clicks: data.max_clicks == null ? "" : String(data.max_clicks),
          frequency_cap_per_day: data.frequency_cap_per_day == null ? "" : String(data.frequency_cap_per_day),
          utm_source: data.utm_source ?? "", utm_medium: data.utm_medium ?? "", utm_campaign: data.utm_campaign ?? "",
          status: data.status, tracking_enabled: data.tracking_enabled,
          campaign_id: data.campaign_id ?? "",
        });
      });
    }
  }, [id, isNew]);

  function toggle(field: "placements" | "operating_systems" | "browsers" | "devices", v: string) {
    setF((s) => ({ ...s, [field]: s[field].includes(v) ? s[field].filter((x) => x !== v) : [...s[field], v] }));
  }

  async function save() {
    if (!f.title.trim() || !f.destination_url.trim()) return toast({ title: "Title and destination URL required", variant: "destructive" });
    if (f.placements.length === 0) return toast({ title: "Pick at least one placement", variant: "destructive" });

    setSaving(true);
    const payload = {
      title: f.title, advertiser: f.advertiser || null, description: f.description || null,
      image_url: f.image_url || null, image_url_dark: f.image_url_dark || null,
      destination_url: f.destination_url, cta_text: f.cta_text || "Learn more",
      ad_type: f.ad_type, rotation: f.rotation,
      placements: f.placements, countries: csvToArr(f.countries),
      operating_systems: f.operating_systems, browsers: f.browsers, devices: f.devices,
      start_date: f.start_date ? new Date(f.start_date).toISOString() : null,
      end_date: f.end_date ? new Date(f.end_date).toISOString() : null,
      priority: Number(f.priority) || 0, weight: Number(f.weight) || 1,
      max_views: f.max_views === "" ? null : Number(f.max_views),
      max_clicks: f.max_clicks === "" ? null : Number(f.max_clicks),
      frequency_cap_per_day: f.frequency_cap_per_day === "" ? null : Number(f.frequency_cap_per_day),
      utm_source: f.utm_source || null, utm_medium: f.utm_medium || null, utm_campaign: f.utm_campaign || null,
      status: f.status, tracking_enabled: f.tracking_enabled,
      campaign_id: f.campaign_id || null,
    };
    const res = isNew
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? await supabase.from("advertisements").insert(payload as any).select("id").single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : await supabase.from("advertisements").update(payload as any).eq("id", id!).select("id").single();
    setSaving(false);
    if (res.error) return toast({ title: "Save failed", description: res.error.message, variant: "destructive" });
    toast({ title: "Saved" });
    if (isNew && res.data?.id) nav(`/home/admin/ads/${res.data.id}/edit`, { replace: true });
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{isNew ? "New ad" : "Edit ad"}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => nav(-1)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">Creative</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><Label>Advertiser</Label><Input value={f.advertiser} onChange={(e) => setF({ ...f, advertiser: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div><Label>Image URL</Label><Input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="https://…" /></div>
            <div><Label>Dark-mode image URL</Label><Input value={f.image_url_dark} onChange={(e) => setF({ ...f, image_url_dark: e.target.value })} placeholder="https://…" /></div>
            <div><Label>Destination URL</Label><Input value={f.destination_url} onChange={(e) => setF({ ...f, destination_url: e.target.value })} placeholder="https://…" /></div>
            <div><Label>CTA text</Label><Input value={f.cta_text} onChange={(e) => setF({ ...f, cta_text: e.target.value })} /></div>
            <div><Label>Ad type</Label>
              <Select value={f.ad_type} onValueChange={(v) => setF({ ...f, ad_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-base">Schedule & Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Start</Label><Input type="datetime-local" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
              <div><Label>End</Label><Input type="datetime-local" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Priority</Label><Input type="number" value={f.priority} onChange={(e) => setF({ ...f, priority: Number(e.target.value) })} /></div>
              <div><Label>Weight</Label><Input type="number" value={f.weight} onChange={(e) => setF({ ...f, weight: Number(e.target.value) })} /></div>
              <div><Label>Rotation</Label>
                <Select value={f.rotation} onValueChange={(v) => setF({ ...f, rotation: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROTATIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Max views</Label><Input type="number" value={f.max_views} onChange={(e) => setF({ ...f, max_views: e.target.value })} /></div>
              <div><Label>Max clicks</Label><Input type="number" value={f.max_clicks} onChange={(e) => setF({ ...f, max_clicks: e.target.value })} /></div>
              <div><Label>Freq / day</Label><Input type="number" value={f.frequency_cap_per_day} onChange={(e) => setF({ ...f, frequency_cap_per_day: e.target.value })} /></div>
            </div>
            <div><Label>Campaign</Label>
              <Select value={f.campaign_id} onValueChange={(v) => setF({ ...f, campaign_id: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Placements</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AD_PLACEMENTS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={f.placements.includes(p)} onCheckedChange={() => toggle("placements", p)} />
                  <span className="font-mono text-xs">{p}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-base">Targeting</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Countries (ISO codes, comma-separated — blank = all)</Label>
              <Input value={f.countries} onChange={(e) => setF({ ...f, countries: e.target.value })} placeholder="US, IN, GB" />
            </div>
            <div>
              <Label>Operating systems</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {OSES.map((o) => (
                  <label key={o} className="flex items-center gap-1 text-sm border border-border rounded px-2 py-1">
                    <Checkbox checked={f.operating_systems.includes(o)} onCheckedChange={() => toggle("operating_systems", o)} /> {o}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Browsers</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {BROWSERS.map((o) => (
                  <label key={o} className="flex items-center gap-1 text-sm border border-border rounded px-2 py-1">
                    <Checkbox checked={f.browsers.includes(o)} onCheckedChange={() => toggle("browsers", o)} /> {o}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Devices</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {DEVICES.map((o) => (
                  <label key={o} className="flex items-center gap-1 text-sm border border-border rounded px-2 py-1">
                    <Checkbox checked={f.devices.includes(o)} onCheckedChange={() => toggle("devices", o)} /> {o}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-base">Tracking</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={f.tracking_enabled} onCheckedChange={(v) => setF({ ...f, tracking_enabled: Boolean(v) })} />
              Enable impression & click tracking
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>UTM source</Label><Input value={f.utm_source} onChange={(e) => setF({ ...f, utm_source: e.target.value })} /></div>
              <div><Label>UTM medium</Label><Input value={f.utm_medium} onChange={(e) => setF({ ...f, utm_medium: e.target.value })} /></div>
              <div><Label>UTM campaign</Label><Input value={f.utm_campaign} onChange={(e) => setF({ ...f, utm_campaign: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
