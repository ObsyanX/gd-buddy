import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMPANY_TRACKS } from '@/config/company-tracks';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Users, Calendar, Sparkles } from 'lucide-react';

interface CreateMockDriveModalProps {
  isOpen: boolean;
  cohortId: string;
  cohortName: string;
  onClose: () => void;
}

export const CreateMockDriveModal: React.FC<CreateMockDriveModalProps> = ({
  isOpen,
  cohortId,
  cohortName,
  onClose,
}) => {
  const [topic, setTopic] = useState('Should AI regulation be centralized globally or handled regionally?');
  const [track, setTrack] = useState('bschool');
  const [driveCode, setDriveCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleGenerateDrive = async () => {
    setIsSubmitting(true);
    const code = 'DRIVE-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Persist drive session with 6-candidate slot configuration
    const { error } = await supabase.from('gd_sessions').insert({
      topic,
      status: 'active',
      is_public: true,
      share_token: code,
      config: {
        is_mock_drive: true,
        cohort_id: cohortId,
        track,
        max_candidates: 6,
        auto_moderated: true,
        duration_minutes: 15,
      },
    } as any);

    setIsSubmitting(false);

    if (error) {
      toast({ title: 'Failed to create drive', description: error.message, variant: 'destructive' });
      return;
    }

    setDriveCode(code);
    toast({ title: 'Mock Drive Room Created!', description: `Code: ${code}` });
  };

  const copyLink = () => {
    if (!driveCode) return;
    const shareUrl = `${window.location.origin}/join?code=${driveCode}`;
    navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Drive link copied to clipboard' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-2 border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Automated 6-Student Mock Drive
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Schedule an unproctored 6-candidate placement GD for <strong>{cohortName}</strong>. AI moderator will conduct, time, and evaluate automatically.
          </DialogDescription>
        </DialogHeader>

        {!driveCode ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Discussion Topic</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter topic..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Company Placement Track</Label>
              <Select value={track} onValueChange={setTrack}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_TRACKS.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name} ({t.badge})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted/40 rounded border border-border/60 text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Round Rules:
              </p>
              <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                <li>Seats up to 6 candidates simultaneously.</li>
                <li>AI fills vacant spots if fewer than 6 students join.</li>
                <li>Automated 15-min round with warning bells and individual dossiers.</li>
              </ul>
            </div>

            <Button onClick={handleGenerateDrive} disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Configuring Room...' : 'Generate 6-Seat Drive Room'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2 text-center">
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-xs font-mono uppercase text-muted-foreground">Drive Join Code</p>
              <p className="text-3xl font-black font-mono tracking-wider text-primary my-1">
                {driveCode}
              </p>
              <p className="text-xs text-muted-foreground">
                Share this with your 6 candidates. When they enter the code, they will be seated together.
              </p>
            </div>

            <Button onClick={copyLink} variant="outline" className="w-full gap-2 text-xs">
              <Copy className="w-4 h-4" /> Copy Direct Invitation Link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
