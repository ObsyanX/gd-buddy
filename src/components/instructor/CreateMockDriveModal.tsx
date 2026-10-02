import React, { useEffect, useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { COMPANY_TRACKS } from '@/config/company-tracks';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import {
  Calendar,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Info,
  Link2,
  Loader2,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

interface CreateMockDriveModalProps {
  isOpen: boolean;
  cohortId: string;
  cohortName: string;
  onClose: () => void;
}

type TrackId =
  | 'consulting'
  | 'it_services'
  | 'bschool'
  | 'tech_startup'
  | 'general';

interface DriveConfig {
  is_mock_drive: boolean;
  cohort_id: string;
  track: TrackId;
  max_candidates: number;
  auto_moderated: boolean;
  duration_minutes: number;
  scheduled_at: string | null;
  instructor_instructions: string;
  ai_fill_vacancies: boolean;
}

const DEFAULT_TOPIC =
  'Should AI regulation be centralized globally or handled regionally?';

const DEFAULT_INSTRUCTIONS =
  'Participate as you would in a real placement group discussion. Support your arguments with reasoning, examples, and practical perspectives.';

const DEFAULT_DURATION = 15;

const generateDriveCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  let randomPart = '';

  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `DRIVE-${randomPart}`;
};

export const CreateMockDriveModal: React.FC<CreateMockDriveModalProps> = ({
  isOpen,
  cohortId,
  cohortName,
  onClose,
}) => {
  const { toast } = useToast();

  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [track, setTrack] = useState<TrackId>('bschool');
  const [durationMinutes, setDurationMinutes] =
    useState<number>(DEFAULT_DURATION);

  const [scheduledAt, setScheduledAt] = useState('');
  const [instructions, setInstructions] =
    useState(DEFAULT_INSTRUCTIONS);

  const [aiFillVacancies, setAiFillVacancies] = useState(true);

  const [driveCode, setDriveCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const selectedTrack = useMemo(() => {
    return COMPANY_TRACKS[track];
  }, [track]);

  /*
   * Reset the generated state whenever the modal is reopened.
   * This allows the same modal instance to create another drive.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDriveCode(null);
    setCreatedAt(null);
  }, [isOpen]);

  const resetForm = () => {
    setTopic(DEFAULT_TOPIC);
    setTrack('bschool');
    setDurationMinutes(DEFAULT_DURATION);
    setScheduledAt('');
    setInstructions(DEFAULT_INSTRUCTIONS);
    setAiFillVacancies(true);
    setDriveCode(null);
    setCreatedAt(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;

    resetForm();
    onClose();
  };

  const validateForm = () => {
    if (!topic.trim()) {
      toast({
        title: 'Topic required',
        description: 'Please enter a discussion topic.',
        variant: 'destructive',
      });

      return false;
    }

    if (topic.trim().length < 10) {
      toast({
        title: 'Topic is too short',
        description: 'Please provide a meaningful GD topic.',
        variant: 'destructive',
      });

      return false;
    }

    if (!cohortId) {
      toast({
        title: 'Cohort missing',
        description: 'This drive is not associated with a valid cohort.',
        variant: 'destructive',
      });

      return false;
    }

    if (![10, 15, 20].includes(durationMinutes)) {
      toast({
        title: 'Invalid duration',
        description: 'Choose a 10, 15, or 20 minute session.',
        variant: 'destructive',
      });

      return false;
    }

    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);

      if (Number.isNaN(scheduledDate.getTime())) {
        toast({
          title: 'Invalid schedule',
          description: 'Please select a valid date and time.',
          variant: 'destructive',
        });

        return false;
      }

      if (scheduledDate.getTime() < Date.now()) {
        toast({
          title: 'Invalid schedule',
          description: 'The scheduled time cannot be in the past.',
          variant: 'destructive',
        });

        return false;
      }
    }

    return true;
  };

  const handleGenerateDrive = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let code = generateDriveCode();

      /*
       * Avoid a collision with an existing share token.
       * Extremely unlikely, but cheap to protect against.
       */
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: existingDrive, error: lookupError } = await supabase
          .from('gd_sessions')
          .select('id')
          .eq('share_token', code)
          .maybeSingle();

        if (lookupError) {
          console.warn(
            'Could not verify drive-code uniqueness:',
            lookupError
          );

          break;
        }

        if (!existingDrive) {
          break;
        }

        code = generateDriveCode();
      }

      const config: DriveConfig = {
        is_mock_drive: true,
        cohort_id: cohortId,
        track,
        max_candidates: 6,
        auto_moderated: true,
        duration_minutes: durationMinutes,
        scheduled_at: scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
        instructor_instructions: instructions.trim(),
        ai_fill_vacancies: aiFillVacancies,
      };

      /*
       * IMPORTANT:
       * We intentionally continue using gd_sessions here because
       * this is the actual live GD room architecture currently used
       * by GD Buddy.
       *
       * mock_drives can later be used as an instructor scheduling/
       * management layer without replacing this live-room creation.
       */
      const { error } = await supabase.from('gd_sessions').insert({
        topic: topic.trim(),
        status: 'active',
        is_public: true,
        share_token: code,
        config,
      } as any);

      if (error) {
        throw error;
      }

      setDriveCode(code);
      setCreatedAt(new Date().toISOString());

      toast({
        title: 'Mock Drive Room Created',
        description: `${code} is ready for ${cohortName}.`,
      });
    } catch (error: any) {
      console.error('Failed to create mock drive:', error);

      toast({
        title: 'Failed to create drive',
        description:
          error?.message ||
          'Something went wrong while creating the mock drive.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShareUrl = () => {
    if (!driveCode) return '';

    return `${window.location.origin}/join?code=${encodeURIComponent(
      driveCode
    )}`;
  };

  const copyText = async (
    text: string,
    successTitle: string,
    successDescription?: string
  ) => {
    try {
      await navigator.clipboard.writeText(text);

      toast({
        title: successTitle,
        description: successDescription,
      });
    } catch (error) {
      console.error('Clipboard error:', error);

      toast({
        title: 'Copy failed',
        description: 'Please copy the value manually.',
        variant: 'destructive',
      });
    }
  };

  const copyCode = () => {
    if (!driveCode) return;

    copyText(
      driveCode,
      'Drive code copied',
      'Candidates can use this code to join the mock drive.'
    );
  };

  const copyLink = () => {
    const shareUrl = getShareUrl();

    if (!shareUrl) return;

    copyText(
      shareUrl,
      'Drive link copied',
      'The invitation link is ready to share with candidates.'
    );
  };

  const openDrive = () => {
    const shareUrl = getShareUrl();

    if (!shareUrl) return;

    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const formattedCreatedAt = createdAt
    ? new Date(createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl border-2 border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {driveCode
              ? 'Mock Drive Ready'
              : 'Create Automated Mock Drive'}
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground">
            {driveCode ? (
              <>
                Your 6-candidate automated placement GD is ready for{' '}
                <strong>{cohortName}</strong>.
              </>
            ) : (
              <>
                Configure an AI-moderated placement GD for{' '}
                <strong>{cohortName}</strong>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!driveCode ? (
          <div className="space-y-5 py-2">
            {/* Topic */}
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">
                Discussion Topic
              </Label>

              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter the group discussion topic..."
                className="text-sm"
                maxLength={300}
                disabled={isSubmitting}
              />

              <div className="text-[10px] text-muted-foreground text-right">
                {topic.length}/300
              </div>
            </div>

            {/* Track */}
            <div className="space-y-2">
              <Label className="text-xs font-mono">
                Company Placement Track
              </Label>

              <Select
                value={track}
                onValueChange={(value) =>
                  setTrack(value as TrackId)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select placement track" />
                </SelectTrigger>

                <SelectContent>
                  {Object.values(COMPANY_TRACKS).map((t) => (
                    <SelectItem
                      key={t.id}
                      value={t.id}
                      className="text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span>{t.name}</span>
                        <span className="text-muted-foreground">
                          ({t.badge})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTrack && (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                    >
                      {selectedTrack.badge}
                    </Badge>

                    <span className="text-xs font-semibold">
                      {selectedTrack.name}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedTrack.description}
                  </p>

                  {selectedTrack.evaluationFocus?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedTrack.evaluationFocus
                        .slice(0, 4)
                        .map((focus) => (
                          <Badge
                            key={focus}
                            variant="secondary"
                            className="text-[9px]"
                          >
                            {focus}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Duration + Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono flex items-center gap-1.5">
                  <Clock3 className="w-3.5 h-3.5" />
                  Duration
                </Label>

                <Select
                  value={String(durationMinutes)}
                  onValueChange={(value) =>
                    setDurationMinutes(Number(value))
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="10" className="text-xs">
                      10 minutes
                    </SelectItem>

                    <SelectItem value="15" className="text-xs">
                      15 minutes
                    </SelectItem>

                    <SelectItem value="20" className="text-xs">
                      20 minutes
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Schedule
                </Label>

                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) =>
                    setScheduledAt(e.target.value)
                  }
                  className="text-xs"
                  disabled={isSubmitting}
                />

                <p className="text-[10px] text-muted-foreground">
                  Optional. Leave empty to make the room available
                  immediately.
                </p>
              </div>
            </div>

            {/* Instructor instructions */}
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">
                Instructor Instructions
              </Label>

              <Textarea
                value={instructions}
                onChange={(e) =>
                  setInstructions(e.target.value)
                }
                placeholder="Add instructions for candidates..."
                className="text-xs min-h-[90px] resize-none"
                maxLength={1000}
                disabled={isSubmitting}
              />

              <div className="text-[10px] text-muted-foreground text-right">
                {instructions.length}/1000
              </div>
            </div>

            {/* AI vacancy behaviour */}
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>

                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs font-semibold">
                      AI Candidate Filling
                    </p>

                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      If fewer than six candidates join, AI
                      participants can fill the vacant seats so the
                      discussion still behaves like a competitive
                      group discussion.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAiFillVacancies((current) => !current)
                    }
                    disabled={isSubmitting}
                    className={`w-full text-left rounded-md border px-3 py-2 text-xs transition-colors ${
                      aiFillVacancies
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {aiFillVacancies
                          ? 'Enabled — AI fills vacant seats'
                          : 'Disabled — candidates only'}
                      </span>

                      <Badge
                        variant={
                          aiFillVacancies
                            ? 'default'
                            : 'outline'
                        }
                        className="text-[9px]"
                      >
                        {aiFillVacancies ? 'ON' : 'OFF'}
                      </Badge>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Round rules */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                <Info className="w-3.5 h-3.5 text-primary" />
                Automated Round Configuration
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Up to 6 candidates
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  AI moderation
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Individual evaluation
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Track-specific scoring
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Floor management
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Placement dossier
                </div>
              </div>
            </div>

            {/* Generate */}
            <Button
              onClick={handleGenerateDrive}
              disabled={isSubmitting}
              className="w-full gap-2"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Configuring Room...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate 6-Seat Drive Room
                </>
              )}
            </Button>
          </div>
        ) : (
          /* =========================
             SUCCESS STATE
             ========================= */
          <div className="space-y-5 py-2">
            {/* Success banner */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>

              <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                Mock Drive Created
              </p>

              <p className="mt-1 text-sm font-semibold">
                {cohortName}
              </p>

              {formattedCreatedAt && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Created {formattedCreatedAt}
                </p>
              )}
            </div>

            {/* Drive code */}
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-5 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Drive Join Code
              </p>

              <p className="text-3xl sm:text-4xl font-black font-mono tracking-[0.12em] text-primary my-2">
                {driveCode}
              </p>

              <p className="text-[11px] text-muted-foreground">
                Share this code with your candidates.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                <Button
                  onClick={copyCode}
                  variant="outline"
                  className="gap-2 text-xs"
                >
                  <Copy className="w-4 h-4" />
                  Copy Code
                </Button>

                <Button
                  onClick={openDrive}
                  variant="outline"
                  className="gap-2 text-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Room
                </Button>
              </div>
            </div>

            {/* Direct invitation */}
            <div className="space-y-2">
              <Label className="text-xs font-mono flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Direct Invitation Link
              </Label>

              <div className="flex gap-2">
                <Input
                  value={getShareUrl()}
                  readOnly
                  className="text-[11px] font-mono"
                />

                <Button
                  onClick={copyLink}
                  variant="outline"
                  size="icon"
                  title="Copy invitation link"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Drive summary */}
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground font-mono">
                    Track
                  </p>
                  <p className="text-xs font-semibold mt-1">
                    {selectedTrack?.name || track}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] uppercase text-muted-foreground font-mono">
                    Capacity
                  </p>
                  <p className="text-xs font-semibold mt-1">
                    6 candidates
                  </p>
                </div>

                <div>
                  <p className="text-[9px] uppercase text-muted-foreground font-mono">
                    Duration
                  </p>
                  <p className="text-xs font-semibold mt-1">
                    {durationMinutes} min
                  </p>
                </div>

                <div>
                  <p className="text-[9px] uppercase text-muted-foreground font-mono">
                    AI Fill
                  </p>
                  <p className="text-xs font-semibold mt-1">
                    {aiFillVacancies ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>

            {/* Important note */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">
                  Next step:
                </strong>{' '}
                Share the invitation link or join code with the
                cohort. Candidates will be seated into the same
                discussion room and the AI moderator will manage the
                round automatically.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 gap-2 text-xs"
              >
                <X className="w-4 h-4" />
                Close
              </Button>

              <Button
                onClick={resetForm}
                className="flex-1 gap-2 text-xs"
              >
                <Sparkles className="w-4 h-4" />
                Create Another
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateMockDriveModal;
