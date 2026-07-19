import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminTags() {
  const [rows, setRows] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("article_tags")
      .select("id, name, slug")
      .order("name");
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setEditingId(null);
    setName("");
    setSlug("");
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = { name: name.trim(), slug: (slug || slugify(name)).trim() };
    const { error } = editingId
      ? await supabase.from("article_tags").update(payload).eq("id", editingId)
      : await supabase.from("article_tags").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Tag updated" : "Tag created");
    reset();
    load();
  };

  const edit = (t: Tag) => {
    setEditingId(t.id);
    setName(t.name);
    setSlug(t.slug);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this tag?")) return;
    const { error } = await supabase.from("article_tags").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tag deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit tag" : "New tag"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!editingId) setSlug(slugify(e.target.value));
            }}
          />
          <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <div className="md:col-span-2 flex gap-2">
            <Button onClick={save} disabled={saving}>
              <Plus className="h-4 w-4 mr-1" />
              {editingId ? "Save changes" : "Add tag"}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={reset}>Cancel</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All tags ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-muted-foreground text-center">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-muted-foreground text-center">No tags yet.</TableCell></TableRow>
              ) : (
                rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.slug}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => edit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
