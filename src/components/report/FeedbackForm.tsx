import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Star, MessageSquareHeart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const StarRow = ({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) => (
  <div className="space-y-1">
    <Label className="text-sm">{label}</Label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${label} ${n} stars`}
          onClick={() => onChange(n)}
          className="p-1 hover:scale-110 transition"
        >
          <Star className={`w-6 h-6 ${n <= value ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
        </button>
      ))}
    </div>
  </div>
);

const FeedbackForm = ({ sessionId }: { sessionId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [existing, setExisting] = useState<any>(null);
  const [stars, setStars] = useState(0);
  const [quality, setQuality] = useState(0);
  const [aiAcc, setAiAcc] = useState(0);
  const [ui, setUi] = useState(0);
  const [nps, setNps] = useState<number[]>([8]);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_feedback')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .maybeSingle();
      if (data) {
        setExisting(data);
        setStars(data.stars || 0);
        setQuality(data.quality_rating || 0);
        setAiAcc(data.ai_accuracy_rating || 0);
        setUi(data.ui_rating || 0);
        setNps([data.nps ?? 8]);
        setComments(data.comments || '');
      }
    })();
  }, [user, sessionId]);

  const canEdit = !existing || Date.now() - new Date(existing.created_at).getTime() < 24 * 3600 * 1000;

  const submit = async () => {
    if (!user || stars < 1) {
      toast({ title: 'Please rate the session', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const payload = {
      user_id: user.id,
      session_id: sessionId,
      stars,
      quality_rating: quality || null,
      ai_accuracy_rating: aiAcc || null,
      ui_rating: ui || null,
      nps: nps[0],
      comments: comments.trim() || null,
    };
    const { error } = existing
      ? await supabase.from('user_feedback').update(payload).eq('id', existing.id)
      : await supabase.from('user_feedback').insert(payload);

    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not save feedback', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: existing ? 'Feedback updated' : 'Thanks for your feedback!' });
    const { data } = await supabase
      .from('user_feedback').select('*').eq('user_id', user.id).eq('session_id', sessionId).maybeSingle();
    setExisting(data);
  };

  return (
    <Card className="p-6 border-4 border-border space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquareHeart className="w-6 h-6" />
        <h3 className="text-xl font-bold">SHARE YOUR FEEDBACK</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Help us improve. {existing ? (canEdit ? 'You can edit within 24h of submission.' : 'Editing window closed.') : ''}
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <StarRow value={stars} onChange={setStars} label="Overall session ★" />
        <StarRow value={quality} onChange={setQuality} label="Discussion quality" />
        <StarRow value={aiAcc} onChange={setAiAcc} label="AI feedback accuracy" />
        <StarRow value={ui} onChange={setUi} label="UI / ease of use" />
      </div>

      <div className="space-y-2">
        <Label>How likely are you to recommend GD Buddy? (NPS: {nps[0]}/10)</Label>
        <Slider min={0} max={10} step={1} value={nps} onValueChange={setNps} disabled={!canEdit} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comments">Comments (optional)</Label>
        <Textarea
          id="comments"
          value={comments}
          onChange={(e) => setComments(e.target.value.slice(0, 1000))}
          placeholder="What worked well? What could be better?"
          className="border-2 min-h-24"
          disabled={!canEdit}
        />
        <p className="text-xs text-muted-foreground text-right">{comments.length}/1000</p>
      </div>

      <Button onClick={submit} disabled={!canEdit || submitting} className="w-full border-4 border-border" size="lg">
        {submitting ? 'SAVING...' : existing ? 'UPDATE FEEDBACK' : 'SUBMIT FEEDBACK'}
      </Button>
    </Card>
  );
};

export default FeedbackForm;
