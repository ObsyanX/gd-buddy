import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Download, ShieldAlert, Trash2 } from "lucide-react";

/**
 * GDPR self-service panel — download or permanently delete personal data.
 * Wraps existing `export_user_data` / `delete_user_data` RPCs (SECURITY DEFINER).
 */
export default function PrivacyPanel() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);

  async function handleExport() {
    if (!user) return;
    setBusy("export");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("export_user_data", { _user_id: user.id });
    setBusy(null);
    if (error) return toast({ title: "Export failed", description: error.message, variant: "destructive" });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gdbuddy-user-data-${user.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Download started" });
  }

  async function handleDelete() {
    if (!user) return;
    if (!confirm("Delete your account and all associated data? This is permanent and cannot be undone.")) return;
    if (!confirm("Really delete everything? Type OK on the next prompt if you're sure.")) return;
    setBusy("delete");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)("delete_user_data", { _user_id: user.id });
    setBusy(null);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Personal data deleted" });
    await signOut();
    window.location.href = "/";
  }

  return (
    <Card className="p-6 border-4 border-border space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-6 h-6" />
        <h2 className="text-2xl font-bold">PRIVACY & DATA</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Download a machine-readable copy of your personal data, or permanently delete it. Deletion removes your profile, sessions, messages, and feedback and cannot be undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleExport} disabled={busy !== null} className="border-2">
          <Download className="w-4 h-4 mr-2" />{busy === "export" ? "PREPARING…" : "DOWNLOAD MY DATA"}
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={busy !== null}>
          <Trash2 className="w-4 h-4 mr-2" />{busy === "delete" ? "DELETING…" : "DELETE MY ACCOUNT"}
        </Button>
      </div>
    </Card>
  );
}
