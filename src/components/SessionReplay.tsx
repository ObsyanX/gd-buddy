import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Clock, AlertTriangle, CheckCircle2, Bot, User, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReplayMessage {
  id: string;
  text: string;
  start_ts: string;
  intent: string | null;
  interruption: boolean | null;
  confidence_estimate: number | null;
  gd_participants: {
    persona_name: string;
    is_user: boolean;
    real_user_id: string | null;
  } | null;
}

interface SessionReplayProps {
  sessionId: string;
  sessionStartTime: string;
}

const SessionReplay = ({ sessionId, sessionStartTime }: SessionReplayProps) => {
  const [messages, setMessages] = useState<ReplayMessage[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [visibleMessages, setVisibleMessages] = useState<ReplayMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReplayData();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [sessionId]);

  const loadReplayData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    const [msgResult, fbResult] = await Promise.all([
      supabase
        .from('gd_messages')
        .select('id, text, start_ts, intent, interruption, confidence_estimate, gd_participants(persona_name, is_user, real_user_id)')
        .eq('session_id', sessionId)
        .order('start_ts'),
      supabase
        .from('gd_feedback')
        .select('*')
        .eq('session_id', sessionId),
    ]);

    if (msgResult.data) setMessages(msgResult.data as ReplayMessage[]);
    if (fbResult.data) setFeedback(fbResult.data);
  };

  const getTimeDelta = (ts: string) => {
    const delta = (new Date(ts).getTime() - new Date(sessionStartTime).getTime()) / 1000;
    const m = Math.floor(delta / 60);
    const s = Math.floor(delta % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getFeedbackForMessage = (msgId: string) => {
    return feedback.filter(f => f.message_id === msgId);
  };

  const playNext = (fromIndex: number) => {
    if (fromIndex >= messages.length) {
      setIsPlaying(false);
      return;
    }

    setCurrentIndex(fromIndex);
    setVisibleMessages(messages.slice(0, fromIndex + 1));

    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }

    if (fromIndex + 1 < messages.length) {
      const currentTs = new Date(messages[fromIndex].start_ts).getTime();
      const nextTs = new Date(messages[fromIndex + 1].start_ts).getTime();
      const delay = Math.min(Math.max(nextTs - currentTs, 500), 5000); // 0.5s - 5s between messages

      timerRef.current = setTimeout(() => {
        if (isPlaying) playNext(fromIndex + 1);
      }, delay);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    setIsPlaying(true);
    const startFrom = currentIndex < 0 ? 0 : currentIndex + 1;
    playNext(startFrom);
  };

  // When isPlaying changes externally, continue playback
  useEffect(() => {
    if (isPlaying && currentIndex >= 0 && currentIndex < messages.length - 1) {
      const currentTs = new Date(messages[currentIndex].start_ts).getTime();
      const nextTs = new Date(messages[currentIndex + 1].start_ts).getTime();
      const delay = Math.min(Math.max(nextTs - currentTs, 500), 5000);
      timerRef.current = setTimeout(() => playNext(currentIndex + 1), delay);
    }
  }, [isPlaying]);

  const handleReset = () => {
    setIsPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentIndex(-1);
    setVisibleMessages([]);
  };

  const handleSkipForward = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const next = Math.min(currentIndex + 1, messages.length - 1);
    setCurrentIndex(next);
    setVisibleMessages(messages.slice(0, next + 1));
  };

  const handleSliderChange = (value: number[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);
    const idx = value[0];
    setCurrentIndex(idx);
    setVisibleMessages(messages.slice(0, idx + 1));
  };

  if (messages.length === 0) {
    return (
      <Card className="p-6 border-2 border-border text-center">
        <p className="text-muted-foreground">No messages to replay.</p>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border overflow-hidden">
      {/* Playback Controls */}
      <div className="p-3 border-b border-border bg-muted/30 space-y-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="border-2 h-8 w-8 p-0">
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button variant={isPlaying ? "destructive" : "default"} size="sm" onClick={handlePlay} className="border-2 h-8 px-3">
            {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSkipForward} className="border-2 h-8 w-8 p-0" disabled={currentIndex >= messages.length - 1}>
            <SkipForward className="w-4 h-4" />
          </Button>
          <Badge variant="secondary" className="ml-auto text-xs">
            <MessageSquare className="w-3 h-3 mr-1" />
            {currentIndex + 1} / {messages.length}
          </Badge>
        </div>
        <Slider
          value={[Math.max(currentIndex, 0)]}
          min={0}
          max={messages.length - 1}
          step={1}
          onValueChange={handleSliderChange}
          className="w-full"
        />
      </div>

      {/* Messages Timeline */}
      <ScrollArea className="h-[400px] p-3">
        <div className="space-y-3">
          {visibleMessages.map((message, idx) => {
            const isUser = message.gd_participants?.is_user &&
              message.gd_participants?.real_user_id === currentUserId;
            const msgFeedback = getFeedbackForMessage(message.id);
            const isLatest = idx === visibleMessages.length - 1;

            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'} ${isLatest ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : ''}`}
              >
                {!isUser && (
                  <div className="w-6 h-6 rounded border border-border flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3 h-3" />
                  </div>
                )}
                <div className={`max-w-[80%] space-y-1 ${isUser ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {isUser ? 'You' : message.gd_participants?.persona_name}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60 font-mono">
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                      {getTimeDelta(message.start_ts)}
                    </span>
                  </div>
                  <div className={`p-2 border rounded text-xs leading-relaxed ${
                    isUser ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
                  }`}>
                    {message.text}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {message.intent && (
                      <Badge variant="outline" className="text-[8px] h-4">{message.intent}</Badge>
                    )}
                    {message.interruption && (
                      <Badge variant="destructive" className="text-[8px] h-4">
                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                        Interruption
                      </Badge>
                    )}
                    {message.confidence_estimate != null && message.confidence_estimate > 0.8 && (
                      <Badge variant="secondary" className="text-[8px] h-4">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                        High Confidence
                      </Badge>
                    )}
                  </div>
                  {/* Coaching annotations from feedback */}
                  {msgFeedback.map(fb => (
                    <div key={fb.id} className={`text-[10px] p-1.5 rounded border mt-1 ${
                      fb.severity === 'warning' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                      fb.severity === 'success' ? 'bg-accent/30 border-accent text-accent-foreground' :
                      'bg-muted/50 border-border text-muted-foreground'
                    }`}>
                      {fb.feedback_text}
                    </div>
                  ))}
                </div>
                {isUser && (
                  <div className="w-6 h-6 rounded border border-border flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </Card>
  );
};

export default SessionReplay;
