import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Clock, Gauge, Trash2 } from "lucide-react";

export interface PracticeRecording {
  id: string;
  audioUrl: string;
  timestamp: Date;
  duration: number;
  wpm: number | null;
  transcription: string | null;
}

interface PracticeHistoryProps {
  recordings: PracticeRecording[];
  onPlay: (recording: PracticeRecording) => void;
  onDelete: (id: string) => void;
  currentlyPlaying: string | null;
}

export const PracticeHistory = ({ 
  recordings, 
  onPlay, 
  onDelete,
  currentlyPlaying 
}: PracticeHistoryProps) => {
  if (recordings.length === 0) {
    return (
      <Card className="p-4 border-4 border-border">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          PRACTICE HISTORY
        </h3>
        <div className="text-center py-4 px-2 bg-muted/20 rounded-lg border border-dashed border-border">
          <p className="text-xs text-muted-foreground font-mono leading-relaxed">
            No recordings yet. Use Practice Mode to record and review your responses.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-4 border-border">
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        PRACTICE HISTORY
        <Badge variant="secondary" className="ml-auto text-xs">
          {recordings.length}
        </Badge>
      </h3>
      <ScrollArea className="h-[180px]">
        <div className="space-y-2 pr-2">
          {recordings.map((recording, index) => (
            <div
              key={recording.id}
              className={`p-3 border-2 rounded space-y-2 ${
                currentlyPlaying === recording.id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    #{recordings.length - index}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {recording.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onPlay(recording)}
                    className="h-7 w-7 p-0"
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(recording.id)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {Math.round(recording.duration)}s
                </span>
                {recording.wpm && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Gauge className="w-3 h-3" />
                    {Math.round(recording.wpm)} WPM
                  </span>
                )}
              </div>

              {recording.transcription && (
                <p className="text-xs font-mono text-muted-foreground line-clamp-2">
                  "{recording.transcription}"
                </p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
