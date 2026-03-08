import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, User } from "lucide-react";
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
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const calculateLiveFluencyScore = (metrics: VoiceSessionMetrics): number => {
  if (metrics.totalWords < 8 || metrics.estimatedWpm <= 0) return 0;

  const pacePenalty = clamp(Math.abs(metrics.estimatedWpm - 150) * 0.9, 0, 60);
  const fillerPenalty = clamp(metrics.fillerRate * 100 * 10, 0, 40);

  return clamp(Math.round(100 - pacePenalty - fillerPenalty), 0, 100);
};

const FeedbackGrid = ({ feedback, liveVoiceMetrics }: { feedback: any; liveVoiceMetrics: VoiceSessionMetrics | null }) => {
  const hasLiveVoiceData = !!liveVoiceMetrics && liveVoiceMetrics.totalWords >= 3;

  const resolvedFeedback = hasLiveVoiceData
    ? {
        fluency_score: calculateLiveFluencyScore(liveVoiceMetrics),
        wpm: liveVoiceMetrics.estimatedWpm,
        filler_count: liveVoiceMetrics.fillerCount,
        live_hint: feedback?.live_hint,
      }
    : feedback;

  if (resolvedFeedback) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fluency</p>
            <p className="font-bold text-lg tabular-nums">{resolvedFeedback.fluency_score || 0}<span className="text-xs text-muted-foreground">/100</span></p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">WPM</p>
            <p className="font-bold text-lg tabular-nums">{Math.round(resolvedFeedback.wpm || 0)}</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fillers</p>
            <p className="font-bold text-lg tabular-nums">{resolvedFeedback.filler_count || 0}</p>
          </div>
        </div>
        {resolvedFeedback.live_hint && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">{resolvedFeedback.live_hint}</p>
          </div>
        )}
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
  onVideoMetricsUpdate, onPlayHistory, onDeleteHistory,
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
        onMetricsUpdate={() => {}}
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
