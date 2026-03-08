import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";
import { type DrillType } from "@/config/drill-types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CreateDrillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDrillCreated: (drill: DrillType) => void;
}

const TIME_OPTIONS = [
  { value: "20", label: "20 seconds" },
  { value: "30", label: "30 seconds" },
  { value: "45", label: "45 seconds" },
  { value: "60", label: "60 seconds" },
  { value: "90", label: "90 seconds" },
  { value: "120", label: "120 seconds" },
];

const DIFFICULTY_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function CreateDrillModal({ open, onOpenChange, onDrillCreated }: CreateDrillModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [timeLimit, setTimeLimit] = useState("60");
  const [difficulty, setDifficulty] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !description.trim()) {
      toast({ title: "Missing fields", description: "Name and description are required.", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "Not authenticated", description: "Please log in to create drills.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('custom_drills')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim(),
          prompt: prompt.trim() || null,
          time_limit: parseInt(timeLimit),
          difficulty: difficulty || 'medium',
        })
        .select()
        .single();

      if (error) throw error;

      const drill: DrillType = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        prompt: data.prompt || undefined,
        timeLimit: data.time_limit,
        difficulty: data.difficulty || undefined,
        icon: Target,
        type: 'custom',
      };

      toast({ title: "Custom drill created!", description: `"${drill.name}" has been added to your drills.` });
      onDrillCreated(drill);
      setName("");
      setDescription("");
      setPrompt("");
      setTimeLimit("60");
      setDifficulty("");
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error creating drill", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-4 border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Your Custom Drill</DialogTitle>
          <DialogDescription>Design your own speaking drill with a custom topic and time limit.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="drill-name" className="font-bold text-xs uppercase">Drill Name</Label>
            <Input id="drill-name" placeholder="e.g. Persuasion Practice" value={name} onChange={e => setName(e.target.value)} className="border-2" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="drill-desc" className="font-bold text-xs uppercase">Description</Label>
            <Textarea id="drill-desc" placeholder="What does this drill focus on?" value={description} onChange={e => setDescription(e.target.value)} className="border-2 min-h-[72px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="drill-prompt" className="font-bold text-xs uppercase">Topic Prompt</Label>
            <Textarea id="drill-prompt" placeholder="Optional: specific topic or scenario to practice" value={prompt} onChange={e => setPrompt(e.target.value)} className="border-2 min-h-[72px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase">Time Limit</Label>
              <Select value={timeLimit} onValueChange={setTimeLimit}>
                <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="border-2"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full border-4 border-border shadow-md font-bold">
            {isSaving ? "SAVING..." : "SAVE DRILL"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
