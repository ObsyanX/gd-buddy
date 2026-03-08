import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, User } from "lucide-react";
import VideoMonitor, { VideoMetrics } from "@/components/VideoMonitor";
import ParticipantPresence from "@/components/ParticipantPresence";
import { ParticipantPresence as PresenceType } from "@/hooks/useMultiplayerPresence";
import VoiceMetricsPanel from "@/components/VoiceMetricsPanel";
import { PracticeHistory, PracticeRecording } from "@/components/PracticeHistory";

interface SessionSidebarProps {
  session: any;
  participants: any[];
  feedback: any;
  isListening: boolean;
  isSpeaking: boolean;
  userInput: string;
  presenceState: any;
  typingParticipants: string[];
  practiceHistory: any[];
  currentPlayingId: string | null;
  onVideoMetricsUpdate: (metrics: VideoMetrics) => void;
  onPlayHistory: (id: string) => void;
  onDeleteHistory: (id: string) => void;
}

const FeedbackGrid = ({ feedback }: { feedback: any }) => {
  if (feedback) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fluency</p>
            <p className="font-bold text-lg tabular-nums">{feedback.fluency_score || 0}<span className="text-xs text-muted-foreground">/100</span></p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">WPM</p>
            <p className="font-bold text-lg tabular-nums">{Math.round(feedback.wpm || 0)}</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fillers</p>
            <p className="font-bold text-lg tabular-nums">{feedback.filler_count || 0}</p>
          </div>
        </div>
        {feedback.live_hint && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">{feedback.live_hint}</p>
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
  session, participants, feedback, isListening, isSpeaking, userInput,
  presenceState, typingParticipants, practiceHistory, currentPlayingId,
  onVideoMetricsUpdate, onPlayHistory, onDeleteHistory,
}: SessionSidebarProps) => {
  return (
    <div className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-3 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
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
        <FeedbackGrid feedback={feedback} />
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
