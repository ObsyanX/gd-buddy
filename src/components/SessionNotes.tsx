import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Save, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SessionNotesProps {
  sessionId: string;
}

interface Note {
  id: string;
  note_text: string;
  created_at: string;
  updated_at: string;
}

const SessionNotes = ({ sessionId }: SessionNotesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [sessionId]);

  const loadNotes = async () => {
    const { data } = await supabase
      .from('session_notes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setNotes(data as Note[]);
  };

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('session_notes').insert({
      session_id: sessionId,
      user_id: user!.id,
      note_text: newNote.trim(),
    });
    if (error) {
      toast({ title: "Error saving note", description: error.message, variant: "destructive" });
    } else {
      setNewNote("");
      loadNotes();
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editText.trim()) return;
    await supabase.from('session_notes').update({ note_text: editText.trim(), updated_at: new Date().toISOString() }).eq('id', id);
    setEditingId(null);
    loadNotes();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('session_notes').delete().eq('id', id);
    loadNotes();
  };

  return (
    <Card className="border-2 border-border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <StickyNote className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-bold text-sm">SESSION NOTES</h3>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Add a personal reflection or note about this session..."
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          className="border-2 text-sm min-h-[60px]"
        />
        <Button size="sm" onClick={handleAdd} disabled={saving || !newNote.trim()} className="border-2">
          <Save className="w-3.5 h-3.5 mr-1" />
          Save Note
        </Button>
      </div>

      {notes.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          {notes.map(note => (
            <div key={note.id} className="p-3 border border-border rounded text-sm space-y-2">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="border text-sm min-h-[40px]" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => handleUpdate(note.id)} className="text-xs h-7">Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="text-xs h-7">Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-foreground leading-relaxed">{note.note_text}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingId(note.id); setEditText(note.note_text); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(note.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default SessionNotes;
