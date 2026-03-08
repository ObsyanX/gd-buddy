import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, User, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import VideoMonitor, { VideoMetrics } from "@/components/VideoMonitor";
import ParticipantPresence from "@/components/ParticipantPresence";
import { ParticipantPresence as PresenceType } from "@/hooks/useMultiplayerPresence";
import VoiceMetricsPanel, { VoiceSessionMetrics } from "@/components/VoiceMetricsPanel";
import { PracticeHistory, PracticeRecording } from "@/components/PracticeHistory";

interface SessionSidebarProps {
  session: any;
  participants: any[];
  feedback: any;
  isListening: boolean;
  isSpeaking: boolean;
  userInput: string;
  presenceState: Record<string, PresenceType>;
  typingParticipants: PresenceType[];
  practiceHistory: PracticeRecording[];
  currentPlayingId: string | null;
  onVideoMetricsUpdate: (metrics: VideoMetrics) => void;
  onPlayHistory: (recording: PracticeRecording) => void;
  onDeleteHistory: (id: string) => void;
  liveVoiceMetrics: VoiceSessionMetrics | null;
  onVoiceMetricsUpdate: (metrics: VoiceSessionMetrics) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const calculateLiveFluencyScore = (metrics: VoiceSessionMetrics): number => {
  if (metrics.totalWords < 8 || metrics.estimatedWpm <= 0) return 0;

  const pacePenalty = clamp(Math.abs(metrics.estimatedWpm - 150) * 0.9, 0, 60);
  const fillerPenalty = clamp(metrics.fillerRate * 100 * 10, 0, 40);

  return clamp(Math.round(100 - pacePenalty - fillerPenalty), 0, 100);
};

const ConfidenceIndicator = ({ metrics }: { metrics: VoiceSessionMetrics }) => {
  const words = metrics.totalWords;
  const speakTime = metrics.speakingTimeSeconds;

  if (words < 8 || speakTime < 5) {
    return (
      <div className="flex items-center gap-1.5 pt-2 border-t border-border">
        <Loader2 className="w-3 h-3 text-muted-foreground animate-spin shrink-0" />
        <p className="text-[10px] text-muted-foreground">Warming up — keep speaking for stable scores</p>
      </div>
    );
  }
  if (words < 30) {
    return (
      <div className="flex items-center gap-1.5 pt-2 border-t border-border">
        <AlertCircle className="w-3 h-3 shrink-0 text-warning" />
        <p className="text-[10px] text-warning">Low confidence — speak more for accurate metrics</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 pt-2 border-t border-border">
      <CheckCircle2 className="w-3 h-3 shrink-0 text-green-500" />
      <p className="text-[10px] text-green-600 dark:text-green-400">Stable — metrics are reliable</p>
    </div>
  );
};

const FeedbackGrid = ({ feedback, liveVoiceMetrics }: { feedback: any; liveVoiceMetrics: VoiceSessionMetrics | null }) => {
  const hasLiveVoiceData = !!liveVoiceMetrics && liveVoiceMetrics.totalWords >= 3;

  // Always prefer live transcript-derived metrics when available
  const displayWpm = hasLiveVoiceData ? liveVoiceMetrics.estimatedWpm : (feedback?.wpm || 0);
  const displayFillers = hasLiveVoiceData ? liveVoiceMetrics.fillerCount : (feedback?.filler_count || 0);
  const displayFluency = hasLiveVoiceData
    ? calculateLiveFluencyScore(liveVoiceMetrics)
    : (feedback?.fluency_score || 0);

  const hasAnyData = hasLiveVoiceData || feedback;

  if (hasAnyData) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fluency</p>
            <p className="font-bold text-lg tabular-nums">{displayFluency}<span className="text-xs text-muted-foreground">/100</span></p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">WPM</p>
            <p className="font-bold text-lg tabular-nums">{Math.round(displayWpm)}</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fillers</p>
            <p className="font-bold text-lg tabular-nums">{displayFillers}</p>
          </div>
        </div>
        {feedback?.live_hint && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">{feedback.live_hint}</p>
          </div>
        )}
        {hasLiveVoiceData && <ConfidenceIndicator metrics={liveVoiceMetrics} />}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {['Fluency', 'WPM', 'Fillers'].map(label => (
        <div key={label} className="text-center p-2 bg-muted/20 rounded-lg border border-dashed border-border">
          <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
          <p className="font-bold text-lg text-muted-foreground">--</p>
        </div>
      ))}
    </div>
  );
};

const SessionSidebar = ({
  session, participants, feedback, liveVoiceMetrics, isListening, isSpeaking, userInput,
  presenceState, typingParticipants, practiceHistory, currentPlayingId,
  onVideoMetricsUpdate, onPlayHistory, onDeleteHistory, onVoiceMetricsUpdate,
}: SessionSidebarProps) => {
  return (
    <div className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-3 overflow-y-auto max-h-[calc(100vh-180px)] pr-1 pb-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
      <VideoMonitor
        isActive={true}
        sessionId={session?.id}
        isUserMicActive={isListening && !isSpeaking}
        onMetricsUpdate={onVideoMetricsUpdate}
      />
      <Card className="p-4 border-4 border-border">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" />
          LIVE FEEDBACK
        </h3>
        <FeedbackGrid feedback={feedback} liveVoiceMetrics={liveVoiceMetrics} />
      </Card>

      <Card className="p-4 border-4 border-border">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <User className="w-4 h-4" />
          PARTICIPANTS
          <Badge variant="secondary" className="ml-auto text-xs">
            {participants.length}
          </Badge>
        </h3>
        <ParticipantPresence
          participants={participants}
          presenceState={presenceState}
          typingParticipants={typingParticipants}
          isMultiplayer={session?.is_multiplayer ?? false}
        />
      </Card>

      <VoiceMetricsPanel
        isUserSpeaking={isListening && !isSpeaking}
        currentTranscript={userInput}
        sessionStartTime={session?.start_time ? new Date(session.start_time).getTime() : undefined}
        onMetricsUpdate={onVoiceMetricsUpdate}
      />

      <PracticeHistory
        recordings={practiceHistory}
        onPlay={onPlayHistory}
        onDelete={onDeleteHistory}
        currentlyPlaying={currentPlayingId}
      />
    </div>
  );
};

export { FeedbackGrid };
export default SessionSidebar;