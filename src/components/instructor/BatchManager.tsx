import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

type Cohort = { id: string; name: string; invite_code: string | null; is_active: boolean; archived_at: string | null };
type Member = { user_id: string; name: string };
type Result = {
  user_id: string; session_id: string; created_at: string; status: string; topic: string; is_multiplayer: boolean;
  fluency_score: number | null; content_score: number | null; structure_score: number | null; voice_score: number | null;
  leadership_score: number | null; teamwork_score: number | null;
};
type Drive = { id: string; title: string; topic: string; track: string | null; scheduled_at: string | null; status: string; group_size: number | null; room_codes: string[] | null };

const SKILLS = ["fluency_score", "content_score", "structure_score", "voice_score", "leadership_score", "teamwork_score"] as const;
const SKILL_LABEL: Record<string, string> = { fluency_score: "Fluency", content_score: "Content", structure_score: "Structure", voice_score: "Voice", leadership_score: "Leadership", teamwork_score: "Teamwork" };
const TRACKS = ["general", "consulting", "it_services", "bschool", "tech_startup"];
const code = () => "DRIVE-" + Math.random().toString(36).slice(2, 8).toUpperCase();

/** TPO batch tools that work from saved data only — no live session needed. */
export default function BatchManager() {
  const { toast } = useToast();
  const [uid, setUid] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [email, setEmail] = useState("");
  const [rename, setRename] = useState("");
  const [student, setStudent] = useState<string | null>(null);
  const [drive, setDrive] = useState({ title: "", topic: "", track: "general", when: "", size: 6 });
  const [busy, setBusy] = useState(false);

  const loadCohorts = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const id = u.user?.id ?? null; setUid(id);
    if (!id) return;
    const { data } = await supabase.from("cohorts").select("id,name,invite_code,is_active,archived_at").eq("instructor_id", id).order("created_at", { ascending: false });
    setCohorts((data ?? []) as Cohort[]);
  }, []);
  useEffect(() => { loadCohorts(); }, [loadCohorts]);

  const loadBatch = useCallback(async (id: string) => {
    const [{ data: m }, { data: r }, { data: d }] = await Promise.all([
      supabase.from("cohort_members").select("user_id").eq("cohort_id", id),
      supabase.rpc("instructor_cohort_results", { _cohort_id: id }),
      supabase.from("mock_drives").select("id,title,topic,track,scheduled_at,status,group_size,room_codes").eq("cohort_id", id).order("scheduled_at", { ascending: false }),
    ]);
    const ids = (m ?? []).map((x: any) => x.user_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id,display_name").in("id", ids) : { data: [] as any[] };
    const names = new Map((profs ?? []).map((p: any) => [p.id, p.display_name || "Student"]));
    setMembers(ids.map((u) => ({ user_id: u, name: names.get(u) ?? "Student " + u.slice(0, 4) })));
    setResults((r ?? []) as Result[]);
    setDrives((d ?? []) as Drive[]);
  }, []);
  useEffect(() => { if (sel) { loadBatch(sel); setRename(cohorts.find((c) => c.id === sel)?.name ?? ""); setStudent(null); } }, [sel, loadBatch, cohorts]);

  const batch = cohorts.find((c) => c.id === sel);
  const nameOf = (u: string) => members.find((m) => m.user_id === u)?.name ?? "Student";

  const doRename = async () => {
    if (!sel || !rename.trim()) return;
    const { error } = await supabase.from("cohorts").update({ name: rename.trim() }).eq("id", sel);
    toast({ title: error ? "Rename failed" : "Batch renamed", description: error?.message, variant: error ? "destructive" : undefined });
    loadCohorts();
  };
  const toggleArchive = async () => {
    if (!batch) return;
    const archived = !batch.archived_at;
    const { error } = await supabase.from("cohorts").update({ archived_at: archived ? new Date().toISOString() : null, is_active: !archived }).eq("id", batch.id);
    toast({ title: error ? "Could not update batch" : archived ? "Batch archived" : "Batch restored", description: error?.message, variant: error ? "destructive" : undefined });
    loadCohorts();
  };
  const addByEmail = async () => {
    if (!sel || !email.trim()) return;
    const { data, error } = await supabase.rpc("instructor_add_member_by_email", { _cohort_id: sel, _email: email.trim() });
    const s = (data as any)?.status;
    const msg = error ? error.message : s === "added" ? "Student added" : s === "already_member" ? "Already in this batch" : s === "not_found" ? "No account with that email — share the invite code instead" : "Not allowed";
    toast({ title: msg, variant: s === "added" ? undefined : "destructive" });
    setEmail(""); loadBatch(sel);
  };
  const removeStudent = async (u: string) => {
    if (!sel || !window.confirm(`Remove ${nameOf(u)} from this batch?`)) return;
    const { error } = await supabase.from("cohort_members").delete().eq("cohort_id", sel).eq("user_id", u);
    toast({ title: error ? "Remove failed" : "Student removed", description: error?.message, variant: error ? "destructive" : undefined });
    loadBatch(sel);
  };

  const scheduleDrive = async () => {
    if (!sel || !uid || !drive.topic.trim()) { toast({ title: "Add a topic first", variant: "destructive" }); return; }
    if (!members.length) { toast({ title: "This batch has no students yet", variant: "destructive" }); return; }
    const size = Math.min(6, Math.max(2, drive.size));
    const groups = Math.ceil(members.length / size);
    setBusy(true);
    try {
      const codes: string[] = [];
      for (let g = 0; g < groups; g++) {
        const c = code();
        const { data: room, error } = await supabase.from("gd_sessions").insert({
          user_id: uid, host_user_id: uid, topic: drive.topic.trim(), topic_category: "Mock Drive", topic_difficulty: "medium",
          is_multiplayer: true, room_code: c, status: "setup",
        } as any).select("id").single();
        if (error) throw error;
        const { error: pe } = await supabase.from("gd_participants").insert({
          session_id: room.id, is_user: true, real_user_id: uid, order_index: 0, persona_name: "Instructor (Host)",
          persona_tone: "neutral", persona_verbosity: "moderate", persona_vocab_level: "intermediate",
        } as any);
        if (pe) throw pe;
        codes.push(c);
      }
      const { error } = await supabase.from("mock_drives").insert({
        cohort_id: sel, instructor_id: uid, title: drive.title.trim() || drive.topic.trim(), topic: drive.topic.trim(), track: drive.track,
        scheduled_at: drive.when ? new Date(drive.when).toISOString() : null, status: "scheduled", group_size: size, room_codes: codes, max_participants: size,
      } as any);
      if (error) throw error;
      toast({ title: `Drive scheduled in ${groups} group${groups > 1 ? "s" : ""}`, description: codes.join(", ") });
      setDrive({ title: "", topic: "", track: "general", when: "", size: 6 });
      loadBatch(sel);
    } catch (e: any) {
      toast({ title: "Could not schedule drive", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };
  const setDriveStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("mock_drives").update({ status } as any).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    if (sel) loadBatch(sel);
  };

  // Group-of-N assignment shown to the TPO (alphabetical, stable).
  const groupsFor = (d: Drive) => {
    const size = d.group_size ?? 6; const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name));
    return (d.room_codes ?? []).map((c, i) => ({ code: c, students: sorted.slice(i * size, i * size + size) }));
  };

  const scored = useMemo(() => results.filter((r) => r.fluency_score != null), [results]);
  const weakest = useMemo(() => SKILLS.map((k) => {
    const v = scored.map((r) => r[k]).filter((x): x is number => x != null);
    return { k, avg: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null };
  }).filter((x) => x.avg != null).sort((a, b) => (a.avg! - b.avg!)), [scored]);

  const attendance = useMemo(() => drives.map((d) => {
    const after = d.scheduled_at ? new Date(d.scheduled_at).getTime() - 3600_000 : 0;
    const attended = new Set(results.filter((r) => r.is_multiplayer && new Date(r.created_at).getTime() >= after && r.topic === d.topic).map((r) => r.user_id));
    return { d, attended: members.filter((m) => attended.has(m.user_id)).length };
  }), [drives, results, members]);

  const history = student ? results.filter((r) => r.user_id === student) : [];

  const exportCsv = () => {
    const head = ["student", "date", "topic", "group", "status", ...SKILLS.map((k) => SKILL_LABEL[k])];
    const rows = results.map((r) => [nameOf(r.user_id), r.created_at, r.topic, r.is_multiplayer ? "yes" : "no", r.status, ...SKILLS.map((k) => r[k] ?? "")]);
    const csv = [head, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${batch?.name ?? "batch"}-report.csv`; a.click();
  };
  const exportPdf = () => {
    const doc = new jsPDF(); let y = 16;
    doc.setFontSize(16); doc.text(`Batch report: ${batch?.name ?? ""}`, 14, y); y += 8;
    doc.setFontSize(10); doc.text(`Students: ${members.length}   Sessions: ${results.length}   Scored: ${scored.length}   Drives: ${drives.length}`, 14, y); y += 8;
    doc.setFontSize(12); doc.text("Weakest skills (batch average)", 14, y); y += 6; doc.setFontSize(10);
    weakest.forEach((w) => { doc.text(`${SKILL_LABEL[w.k]}: ${w.avg}`, 18, y); y += 5; });
    if (!weakest.length) { doc.text("No scored sessions yet.", 18, y); y += 5; }
    y += 4; doc.setFontSize(12); doc.text("Students", 14, y); y += 6; doc.setFontSize(10);
    members.forEach((m) => {
      const mine = scored.filter((r) => r.user_id === m.user_id);
      const avg = mine.length ? Math.round(mine.reduce((a, r) => a + SKILLS.reduce((s, k) => s + (r[k] ?? 0), 0) / SKILLS.length, 0) / mine.length) : null;
      if (y > 280) { doc.addPage(); y = 16; }
      doc.text(`${m.name} — ${results.filter((r) => r.user_id === m.user_id).length} sessions, avg ${avg ?? "n/a"}`, 18, y); y += 5;
    });
    y += 4; if (y > 270) { doc.addPage(); y = 16; }
    doc.setFontSize(12); doc.text("Drive attendance", 14, y); y += 6; doc.setFontSize(10);
    attendance.forEach(({ d, attended }) => { if (y > 280) { doc.addPage(); y = 16; } doc.text(`${d.title} (${d.status}) — ${attended}/${members.length}`, 18, y); y += 5; });
    doc.save(`${batch?.name ?? "batch"}-report.pdf`);
  };

  const list = cohorts.filter((c) => showArchived || !c.archived_at);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Batch management</h2>
        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived</label>
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <Button key={c.id} size="sm" variant={sel === c.id ? "default" : "outline"} onClick={() => setSel(c.id)}>
            {c.name}{c.archived_at && <Badge variant="secondary" className="ml-2">Archived</Badge>}
          </Button>
        ))}
        {!list.length && <p className="text-sm text-muted-foreground">Create a batch above to get started.</p>}
      </div>

      {batch && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 items-center">
            <Input className="max-w-xs" value={rename} onChange={(e) => setRename(e.target.value)} aria-label="Batch name" />
            <Button size="sm" onClick={doRename}>Rename</Button>
            <Button size="sm" variant="outline" onClick={toggleArchive}>{batch.archived_at ? "Restore" : "Archive"}</Button>
            {batch.invite_code && <Badge variant="outline">Invite code: {batch.invite_code}</Badge>}
            <Button size="sm" variant="outline" onClick={exportCsv}>Download CSV</Button>
            <Button size="sm" variant="outline" onClick={exportPdf}>Download PDF</Button>
          </div>

          <section className="space-y-2">
            <h3 className="font-medium">Students ({members.length})</h3>
            <div className="flex gap-2"><Input className="max-w-xs" type="email" placeholder="student@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /><Button size="sm" onClick={addByEmail}>Add by email</Button></div>
            <ul className="divide-y divide-border text-sm">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between py-2 gap-2">
                  <button className="text-left hover:underline" onClick={() => setStudent(m.user_id)}>{m.name} <span className="text-muted-foreground">· {results.filter((r) => r.user_id === m.user_id).length} sessions</span></button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeStudent(m.user_id)}>Remove</Button>
                </li>
              ))}
            </ul>
          </section>

          {student && (
            <section className="space-y-2">
              <div className="flex justify-between"><h3 className="font-medium">History: {nameOf(student)}</h3><Button size="sm" variant="ghost" onClick={() => setStudent(null)}>Close</Button></div>
              {!history.length ? <p className="text-sm text-muted-foreground">No saved sessions yet.</p> : (
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-1">Date</th><th>Topic</th><th>Type</th>{SKILLS.map((k) => <th key={k}>{SKILL_LABEL[k]}</th>)}</tr></thead>
                  <tbody>{history.map((r) => (<tr key={r.session_id} className="border-t border-border"><td className="py-1">{new Date(r.created_at).toLocaleDateString()}</td><td className="max-w-[16rem] truncate">{r.topic}</td><td>{r.is_multiplayer ? "Group" : "Solo"}</td>{SKILLS.map((k) => <td key={k}>{r[k] ?? "–"}</td>)}</tr>))}</tbody></table></div>
              )}
            </section>
          )}

          <section className="space-y-2">
            <h3 className="font-medium">Weakest skills</h3>
            {weakest.length ? <div className="flex flex-wrap gap-2">{weakest.map((w, i) => <Badge key={w.k} variant={i < 2 ? "destructive" : "secondary"}>{SKILL_LABEL[w.k]} {w.avg}</Badge>)}</div>
              : <p className="text-sm text-muted-foreground">No scored sessions yet.</p>}
          </section>

          <section className="space-y-2">
            <h3 className="font-medium">Schedule a drive</h3>
            <div className="grid gap-2 md:grid-cols-5">
              <Input placeholder="Title" value={drive.title} onChange={(e) => setDrive({ ...drive, title: e.target.value })} />
              <Input placeholder="Topic" value={drive.topic} onChange={(e) => setDrive({ ...drive, topic: e.target.value })} className="md:col-span-2" />
              <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={drive.track} onChange={(e) => setDrive({ ...drive, track: e.target.value })}>{TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
              <Input type="datetime-local" value={drive.when} onChange={(e) => setDrive({ ...drive, when: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              Group size <Input type="number" min={2} max={6} className="w-20" value={drive.size} onChange={(e) => setDrive({ ...drive, size: Number(e.target.value) })} />
              <span className="text-muted-foreground">{members.length} students → {Math.ceil(members.length / Math.min(6, Math.max(2, drive.size || 6))) || 0} groups</span>
              <Button size="sm" disabled={busy} onClick={scheduleDrive}>{busy ? "Creating…" : "Schedule drive"}</Button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-medium">Drives & attendance</h3>
            {!drives.length && <p className="text-sm text-muted-foreground">No drives yet.</p>}
            {attendance.map(({ d, attended }) => (
              <Card key={d.id} className="p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div><span className="font-medium">{d.title}</span> <span className="text-sm text-muted-foreground">{d.scheduled_at ? new Date(d.scheduled_at).toLocaleString() : "unscheduled"}</span></div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Attended {attended}/{members.length}</Badge>
                    <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={d.status} onChange={(e) => setDriveStatus(d.id, e.target.value)}>
                      {["scheduled", "live", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s === "cancelled" ? "no-show / cancelled" : s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3 text-xs">
                  {groupsFor(d).map((g) => (
                    <div key={g.code} className="rounded-md border border-border p-2"><div className="font-mono font-medium">{g.code}</div><div className="text-muted-foreground">{g.students.map((s) => s.name).join(", ") || "—"}</div></div>
                  ))}
                </div>
              </Card>
            ))}
          </section>
        </div>
      )}
    </Card>
  );
}
