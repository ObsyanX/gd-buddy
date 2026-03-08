import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicVocal, Square, Loader2, SkipForward, BarChart3, SendHorizonal, Timer } from "lucide-react";

interface MessageInputProps {
  userInput: string;
  isListening: boolean;
  isProcessing: boolean;
  isPracticing: boolean;
  isCorrecting: boolean;
  isPaused: boolean;
  isBusy?: boolean;
  autoSendEnabled: boolean;
  autoSkipEnabled: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onSendWithVoice: () => void;
  onVoiceInput: () => void;
  onStartPractice: () => void;
  onSkipTurn: () => void;
  onOpenMobileMetrics: () => void;
  onToggleAutoSend: () => void;
  onToggleAutoSkip: () => void;
}

const AUTO_SEND_DELAY = 7;
const AUTO_SKIP_DELAY = 12;

const MessageInput = ({
  userInput, isListening, isProcessing, isPracticing, isCorrecting, isPaused,
  isBusy = false,
  autoSendEnabled, autoSkipEnabled,
  onInputChange, onSendMessage, onSendWithVoice, onVoiceInput,
  onStartPractice, onSkipTurn, onOpenMobileMetrics,
  onToggleAutoSend, onToggleAutoSkip,
}: MessageInputProps) => {
  const autoSendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSkipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onSendMessageRef = useRef(onSendMessage);
  const onSkipTurnRef = useRef(onSkipTurn);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [skipCountdown, setSkipCountdown] = useState<number | null>(null);

  useEffect(() => {
    onSendMessageRef.current = onSendMessage;
  }, [onSendMessage]);

  useEffect(() => {
    onSkipTurnRef.current = onSkipTurn;
  }, [onSkipTurn]);

  // Auto-send after 7s of idle when there's unsent text
  useEffect(() => {
    if (autoSendTimer.current) clearTimeout(autoSendTimer.current);
    if (sendCountdownRef.current) clearInterval(sendCountdownRef.current);

    const canAutoSend = autoSendEnabled && !isPaused && Boolean(userInput.trim()) && !isProcessing && !isPracticing && !isCorrecting;

    if (!canAutoSend) {
      setCountdown(null);
      return;
    }

    let remaining = AUTO_SEND_DELAY;
    setCountdown(remaining);

    sendCountdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining > 0 ? remaining : null);
    }, 1000);

    autoSendTimer.current = setTimeout(() => {
      if (sendCountdownRef.current) clearInterval(sendCountdownRef.current);
      setCountdown(null);
      onSendMessageRef.current();
    }, AUTO_SEND_DELAY * 1000);

    return () => {
      if (autoSendTimer.current) clearTimeout(autoSendTimer.current);
      if (sendCountdownRef.current) clearInterval(sendCountdownRef.current);
    };
  }, [userInput, isProcessing, isPracticing, isCorrecting, autoSendEnabled, isPaused]);

  // Auto-skip after 12s when there is still no spoken/typed input
  useEffect(() => {
    if (autoSkipTimer.current) clearTimeout(autoSkipTimer.current);
    if (skipCountdownRef.current) clearInterval(skipCountdownRef.current);

    const canAutoSkip = autoSkipEnabled && !isPaused && !isBusy && !userInput.trim() && !isProcessing && !isPracticing && !isCorrecting;

    if (!canAutoSkip) {
      setSkipCountdown(null);
      return;
    }

    let remaining = AUTO_SKIP_DELAY;
    setSkipCountdown(remaining);

    skipCountdownRef.current = setInterval(() => {
      remaining -= 1;
      setSkipCountdown(remaining > 0 ? remaining : null);
    }, 1000);

    autoSkipTimer.current = setTimeout(() => {
      if (skipCountdownRef.current) clearInterval(skipCountdownRef.current);
      setSkipCountdown(null);
      onSkipTurnRef.current();
    }, AUTO_SKIP_DELAY * 1000);

    return () => {
      if (autoSkipTimer.current) clearTimeout(autoSkipTimer.current);
      if (skipCountdownRef.current) clearInterval(skipCountdownRef.current);
    };
  }, [userInput, isProcessing, isPracticing, isCorrecting, autoSkipEnabled, isPaused, isBusy]);

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {isCorrecting && (
        <div className="flex items-center justify-center gap-2 py-1.5 sm:py-2 text-xs sm:text-sm text-muted-foreground">
          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
          <span className="font-mono text-[10px] sm:text-sm">Applying AI correction...</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
        <Input
          placeholder={isPaused ? "Discussion paused..." : isListening ? "Speaking..." : "Type or use voice..."}
          value={userInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !isListening) {
              onSendMessage();
            }
          }}
          className={`border-2 text-sm sm:text-base lg:text-lg flex-1 h-10 sm:h-11 ${isListening ? 'border-destructive bg-destructive/5' : ''}`}
          disabled={isProcessing || isPracticing || isPaused}
          readOnly={isListening}
        />
        <div className="flex gap-1 sm:gap-1.5 lg:gap-2 justify-between sm:justify-end">
          {/* Mobile metrics toggle */}
          <Button
            variant="outline"
            className="border-2 h-10 w-10 p-0 lg:hidden"
            title="View Metrics"
            onClick={onOpenMobileMetrics}
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button
            onClick={onStartPractice}
            disabled={isProcessing || isListening || isPracticing || isPaused}
            variant="outline"
            className="border-2 h-10 w-10 p-0 sm:w-auto sm:px-3"
            title="Practice Mode (Ctrl+M)"
          >
            <MicVocal className="w-4 h-4" />
          </Button>
          <Button
            onClick={onVoiceInput}
            disabled={isProcessing || isPracticing || isCorrecting || isPaused}
            variant={isListening ? "destructive" : "outline"}
            className={`border-2 h-10 w-10 p-0 sm:w-auto sm:px-3 ${isListening ? 'animate-pulse' : ''}`}
            title="Voice Input - Real-time (Click to toggle)"
          >
            {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <div className="flex flex-col items-center">
            <Button
              onClick={onSendWithVoice}
              disabled={isProcessing || (!userInput.trim() && !isListening) || isPracticing || isCorrecting || isPaused}
              className="border-2 h-10 w-10 p-0 sm:w-auto sm:px-3"
              title={isListening ? "Stop & Send" : "Send (Ctrl+Enter)"}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
            {countdown !== null && (
              <span className="text-[10px] font-mono text-destructive font-bold mt-0.5">{countdown}s</span>
            )}
          </div>
          <div className="flex flex-col items-center">
            <Button
              onClick={onSkipTurn}
              disabled={isProcessing || isPracticing || isPaused}
              variant="outline"
              className="border-2 h-10 w-10 p-0 sm:w-auto sm:px-3"
              title="Skip your turn"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            {skipCountdown !== null && (
              <span className="text-[10px] font-mono text-muted-foreground font-bold mt-0.5">{skipCountdown}s</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 sm:gap-3 mt-1">
        <button
          onClick={onToggleAutoSend}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono border transition-colors ${
            autoSendEnabled
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-muted/30 border-border text-muted-foreground'
          }`}
          title={autoSendEnabled ? "Auto-send ON: sends after 7s idle" : "Auto-send OFF"}
        >
          <SendHorizonal className="w-3 h-3" />
          Auto-send {autoSendEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={onToggleAutoSkip}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono border transition-colors ${
            autoSkipEnabled
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-muted/30 border-border text-muted-foreground'
          }`}
          title={autoSkipEnabled ? "Auto-skip ON: skips turn after 12s" : "Auto-skip OFF"}
        >
          <Timer className="w-3 h-3" />
          Auto-skip {autoSkipEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;