import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CustomPersonaFormProps {
  onPersonaCreated: () => void;
}

const TONE_OPTIONS = [
  { value: 'analytical', label: 'Analytical', description: 'Data-driven, logical' },
  { value: 'diplomatic', label: 'Diplomatic', description: 'Consensus-seeking, tactful' },
  { value: 'assertive', label: 'Assertive', description: 'Direct, confident' },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic, passionate' },
  { value: 'critical', label: 'Critical', description: 'Questioning, challenging' },
  { value: 'technical', label: 'Technical', description: 'Detail-oriented, precise' },
  { value: 'strategic', label: 'Strategic', description: 'Big-picture thinking' },
  { value: 'supportive', label: 'Supportive', description: 'Encouraging, collaborative' },
  { value: 'skeptical', label: 'Skeptical', description: 'Evidence-based, cautious' },
  { value: 'pragmatic', label: 'Pragmatic', description: 'Practical, realistic' },
  { value: 'empathetic', label: 'Empathetic', description: 'Understanding, caring' },
  { value: 'formal', label: 'Formal', description: 'Professional, structured' },
  { value: 'persuasive', label: 'Persuasive', description: 'Convincing, influential' },
  { value: 'curious', label: 'Curious', description: 'Inquisitive, open-minded' },
];

const VOICE_OPTIONS = [
  { value: 'roger', label: 'Roger (Male)' },
  { value: 'george', label: 'George (Male)' },
  { value: 'brian', label: 'Brian (Male)' },
  { value: 'daniel', label: 'Daniel (Male)' },
  { value: 'callum', label: 'Callum (Male)' },
  { value: 'chris', label: 'Chris (Male)' },
  { value: 'eric', label: 'Eric (Male)' },
  { value: 'liam', label: 'Liam (Male)' },
  { value: 'bill', label: 'Bill (Male)' },
  { value: 'charlie', label: 'Charlie (Male)' },
  { value: 'michael', label: 'Michael (Male)' },
  { value: 'sarah', label: 'Sarah (Female)' },
  { value: 'aria', label: 'Aria (Female)' },
  { value: 'charlotte', label: 'Charlotte (Female)' },
  { value: 'jessica', label: 'Jessica (Female)' },
  { value: 'alice', label: 'Alice (Female)' },
  { value: 'matilda', label: 'Matilda (Female)' },
  { value: 'lily', label: 'Lily (Female)' },
  { value: 'freya', label: 'Freya (Female)' },
  { value: 'glinda', label: 'Glinda (Female)' },
];

const CustomPersonaForm = ({ onPersonaCreated }: CustomPersonaFormProps) => {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    core_perspective: '',
    tone: 'analytical',
    verbosity: 'moderate',
    vocab_level: 'intermediate',
    description: '',
    interrupt_level: 0.3,
    agreeability: 0,
    voice_name: 'roger',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to create custom AI participants",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim() || !formData.role.trim() || !formData.core_perspective.trim()) {
      toast({
        title: "Required fields missing",
        description: "Please fill in name, role, and core perspective",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('custom_personas')
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          role: formData.role.trim(),
          core_perspective: formData.core_perspective.trim(),
          tone: formData.tone,
          verbosity: formData.verbosity,
          vocab_level: formData.vocab_level,
          description: formData.description.trim() || null,
          interrupt_level: formData.interrupt_level,
          agreeability: formData.agreeability,
          voice_name: formData.voice_name,
        });

      if (error) throw error;

      toast({
        title: "Custom participant created",
        description: `${formData.name} has been added to your AI participants`,
      });

      // Reset form
      setFormData({
        name: '',
        role: '',
        core_perspective: '',
        tone: 'analytical',
        verbosity: 'moderate',
        vocab_level: 'intermediate',
        description: '',
        interrupt_level: 0.3,
        agreeability: 0,
        voice_name: 'roger',
      });

      setOpen(false);
      onPersonaCreated();
    } catch (error: any) {
      console.error('Error creating custom persona:', error);
      toast({
        title: "Failed to create participant",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-2 border-dashed border-primary/50 hover:border-primary">
          <UserPlus className="w-4 h-4 mr-2" />
          Create Custom AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            CREATE CUSTOM AI PARTICIPANT
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Rohan"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                maxLength={50}
                className="border-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="font-bold">Role *</Label>
              <Input
                id="role"
                placeholder="e.g., Business Lead"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                maxLength={100}
                className="border-2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="core_perspective" className="font-bold">Core Perspective *</Label>
            <Input
              id="core_perspective"
              placeholder="e.g., Decision-making, results"
              value={formData.core_perspective}
              onChange={(e) => setFormData(prev => ({ ...prev, core_perspective: e.target.value }))}
              maxLength={200}
              className="border-2"
            />
            <p className="text-xs text-muted-foreground">The main viewpoint this participant brings to discussions</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-bold">Description</Label>
            <Textarea
              id="description"
              placeholder="e.g., Direct and focused on outcomes"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              maxLength={500}
              className="border-2"
              rows={2}
            />
          </div>

          {/* Speaking Style */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">Tone</Label>
              <Select 
                value={formData.tone} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, tone: value }))}
              >
                <SelectTrigger className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Verbosity</Label>
              <Select 
                value={formData.verbosity} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, verbosity: value }))}
              >
                <SelectTrigger className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="elaborate">Elaborate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Vocabulary Level</Label>
              <Select 
                value={formData.vocab_level} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, vocab_level: value }))}
              >
                <SelectTrigger className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4 p-4 bg-secondary/30 rounded-lg border-2 border-border">
            <h4 className="font-bold text-sm">BEHAVIOR SETTINGS</h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Interrupt Level</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(formData.interrupt_level * 100)}%</span>
                </div>
                <Slider
                  value={[formData.interrupt_level]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, interrupt_level: value }))}
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">How often this participant will interrupt others</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Agreeability</Label>
                  <span className="text-xs text-muted-foreground">
                    {formData.agreeability > 0 ? '+' : ''}{Math.round(formData.agreeability * 100)}%
                  </span>
                </div>
                <Slider
                  value={[formData.agreeability]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, agreeability: value }))}
                  min={-1}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Negative = tends to disagree, Positive = tends to agree</p>
              </div>
            </div>
          </div>

          {/* Voice */}
          <div className="space-y-2">
            <Label className="font-bold">Voice</Label>
            <Select 
              value={formData.voice_name} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, voice_name: value }))}
            >
              <SelectTrigger className="border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="p-4 bg-secondary/50 rounded-lg border-2 border-border">
            <h4 className="font-bold text-sm mb-3">PREVIEW</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg">{formData.name || 'Name'}</span>
              <Badge variant="secondary" className="text-xs">custom</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{formData.role || 'Role'}</p>
            <p className="text-xs text-muted-foreground italic mt-1">{formData.core_perspective || 'Core perspective'}</p>
            <p className="text-sm mt-2">{formData.description || 'Description'}</p>
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge variant="outline" className="text-xs">{formData.tone}</Badge>
              <Badge variant="outline" className="text-xs">{formData.verbosity}</Badge>
              <Badge variant="outline" className="text-xs">{formData.vocab_level}</Badge>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-2">
              CANCEL
            </Button>
            <Button type="submit" disabled={isCreating} className="border-4 border-border">
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  CREATING...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  CREATE PARTICIPANT
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomPersonaForm;
