import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
}

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map<string, string[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (roles ?? []).forEach((r: any) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role); map.set(r.user_id, arr);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRows(((profiles as any[]) ?? []).map((p) => ({ ...p, roles: map.get(p.id) ?? ["user"] })));
  }

  const filtered = rows.filter((r) => !q || (r.display_name ?? "").toLowerCase().includes(q.toLowerCase()) || r.id.includes(q));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">{rows.length} profiles</p>
        </div>
        <Input placeholder="Search name or id…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Roles</th>
                <th className="text-left px-3 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.display_name ?? "(no name)"}</div>
                    <div className="text-xs font-mono text-muted-foreground">{r.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-3 py-2 space-x-1">{r.roles.map((role) => <Badge key={role} variant={role === "admin" ? "default" : "secondary"}>{role}</Badge>)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">No users.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}
