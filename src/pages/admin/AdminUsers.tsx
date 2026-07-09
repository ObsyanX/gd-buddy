import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useUserRoles, type AppRole } from "@/hooks/useUserRoles";

interface Row {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: AppRole[];
}

const ASSIGNABLE: AppRole[] = ["editor", "analyst", "instructor"];

export default function AdminUsers() {
  const { isAdmin } = useUserRoles();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map<string, AppRole[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (roles ?? []).forEach((r: any) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role as AppRole); map.set(r.user_id, arr);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRows(((profiles as any[]) ?? []).map((p) => ({ ...p, roles: map.get(p.id) ?? ["user"] })));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function grant(userId: string, role: AppRole) {
    if (!isAdmin) return;
    setBusy(userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("user_roles") as any).insert({ user_id: userId, role });
    setBusy(null);
    if (error) return toast({ title: "Grant failed", description: error.message, variant: "destructive" });
    await supabase.from("audit_events").insert({ action: "role_grant", resource_type: "user", resource_id: userId, metadata: { role } as never });
    toast({ title: `Granted ${role}` });
    load();
  }

  async function revoke(userId: string, role: AppRole) {
    if (!isAdmin) return;
    if (role === "admin") return toast({ title: "Admin role cannot be revoked from here", variant: "destructive" });
    setBusy(userId);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    setBusy(null);
    if (error) return toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
    await supabase.from("audit_events").insert({ action: "role_revoke", resource_type: "user", resource_id: userId, metadata: { role } as never });
    toast({ title: `Revoked ${role}` });
    load();
  }

  const filtered = rows.filter((r) => !q || (r.display_name ?? "").toLowerCase().includes(q.toLowerCase()) || r.id.includes(q));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">{rows.length} profiles · {isAdmin ? "role management enabled" : "read-only (admin only can edit roles)"}</p>
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
                {isAdmin && <th className="text-left px-3 py-2">Grant</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/60 align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.display_name ?? "(no name)"}</div>
                    <div className="text-xs font-mono text-muted-foreground">{r.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-3 py-2 space-x-1 space-y-1">
                    {r.roles.map((role) => (
                      <span key={role} className="inline-flex items-center gap-1">
                        <Badge variant={role === "admin" ? "default" : "secondary"}>{role}</Badge>
                        {isAdmin && role !== "user" && role !== "admin" && (
                          <button onClick={() => revoke(r.id, role)} className="text-[10px] text-muted-foreground hover:text-destructive" title={`Revoke ${role}`}>×</button>
                        )}
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      <div className="flex gap-1 items-center">
                        <Select onValueChange={(v) => grant(r.id, v as AppRole)}>
                          <SelectTrigger className="h-8 w-32 text-xs" disabled={busy === r.id}><SelectValue placeholder="Add role…" /></SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE.filter((role) => !r.roles.includes(role)).map((role) => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={isAdmin ? 4 : 3} className="text-center py-8 text-muted-foreground">No users.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      {isAdmin && (
        <p className="text-xs text-muted-foreground">
          Admin role is restricted to the authorized administrator by a database trigger — it cannot be granted from this UI.
        </p>
      )}
    </div>
  );
}
