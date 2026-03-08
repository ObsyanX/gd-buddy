import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicVocal, Square, Loader2, SkipForward, BarChart3 } from "lucide-react";

interface MessageInputProps {
  userInput: string;
  isListening: boolean;
  isProcessing: boolean;
  isPracticing: boolean;
  isCorrecting: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onSendWithVoice: () => void;
  onVoiceInput: () => void;
  onStartPractice: () => void;
  onSkipTurn: () => void;
  onOpenMobileMetrics: () => void;
}

const AUTO_SEND_DELAY = 7;
const AUTO_SKIP_DELAY = 12;

const MessageInput = ({
  userInput, isListening, isProcessing, isPracticing, isCorrecting,
  onInputChange, onSendMessage, onSendWithVoice, onVoiceInput,
  onStartPractice, onSkipTurn, onOpenMobileMetrics,
}: MessageInputProps) => {
  const autoSendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSkipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [skipCountdown, setSkipCountdown] = useState<number | null>(null);

  // Auto-send after 7s of idle when there's unsent text
  useEffect(() => {
    if (autoSendTimer.current) { clearTimeout(autoSendTimer.current); autoSendTimer.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);

    const shouldAutoSend = userInput.trim() && !isProcessing && !isPracticing && !isCorrecting && !isListening;

    if (shouldAutoSend) {
      let remaining = AUTO_SEND_DELAY;
      setCountdown(remaining);
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          setCountdown(null);
        } else {
          setCountdown(remaining);
        }
      }, 1000);

      autoSendTimer.current = setTimeout(() => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setCountdown(null);
        onSendMessage();
      }, AUTO_SEND_DELAY * 1000);
    }

    return () => {
      if (autoSendTimer.current) clearTimeout(autoSendTimer.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [userInput, isListening, isProcessing, isPracticing, isCorrecting, onSendMessage]);

  // Auto-skip after 12s if no input at all
  useEffect(() => {
    if (autoSkipTimer.current) { clearTimeout(autoSkipTimer.current); autoSkipTimer.current = null; }
    setSkipCountdown(null);

    const shouldAutoSkip = !userInput.trim() && !isProcessing && !isPracticing && !isCorrecting && !isListening;

    if (shouldAutoSkip) {
      let rem = AUTO_SKIP_DELAY;
      setSkipCountdown(rem);
      const iv = setInterval(() => {
        rem -= 1;
        if (rem <= 0) { setSkipCountdown(null); clearInterval(iv); }
        else setSkipCountdown(rem);
      }, 1000);

      autoSkipTimer.current = setTimeout(() => {
        clearInterval(iv);
        setSkipCountdown(null);
        onSkipTurn();
      }, AUTO_SKIP_DELAY * 1000);

      return () => { clearTimeout(autoSkipTimer.current!); clearInterval(iv); };
    }
  }, [userInput, isListening, isProcessing, isPracticing, isCorrecting, onSkipTurn]);
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
          placeholder={isListening ? "Speaking..." : "Type or use voice..."}
          value={userInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !isListening) {
              onSendMessage();
            }
          }}
          className={`border-2 text-sm sm:text-base lg:text-lg flex-1 h-10 sm:h-11 ${isListening ? 'border-destructive bg-destructive/5' : ''}`}
          disabled={isProcessing || isPracticing}
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
            disabled={isProcessing || isListening || isPracticing}
            variant="outline"
            className="border-2 h-10 w-10 p-0 sm:w-auto sm:px-3"
            title="Practice Mode (Ctrl+M)"
          >
            <MicVocal className="w-4 h-4" />
          </Button>
          <Button
            onClick={onVoiceInput}
            disabled={isProcessing || isPracticing || isCorrecting}
            variant={isListening ? "destructive" : "outline"}
            className={`border-2 h-10 w-10 p-0 sm:w-auto sm:px-3 ${isListening ? 'animate-pulse' : ''}`}
            title="Voice Input - Real-time (Click to toggle)"
          >
            {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <div className="relative flex flex-col items-center">
            <Button
              onClick={onSendWithVoice}
              disabled={isProcessing || (!userInput.trim() && !isListening) || isPracticing || isCorrecting}
              className="border-2 h-10 w-10 p-0 sm:w-auto sm:px-3"
              title={isListening ? "Stop & Send" : "Send (Ctrl+Enter)"}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
            {countdown !== null && (
              <span className="absolute -bottom-4 text-[9px] font-mono text-muted-foreground">{countdown}s</span>
            )}
          </div>
          <Button
            onClick={onSkipTurn}
            disabled={isProcessing || isPracticing}
            variant="outline"
            className="border-2 h-10 w-10 p-0 sm:w-auto sm:px-3"
            title="Skip your turn"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <p className="text-[10px] sm:text-xs text-muted-foreground font-mono text-center hidden sm:block">
        TIP: Ctrl+M for practice • Ctrl+Enter to send • Esc to stop audio
      </p>
    </div>
  );
};

export default MessageInput;
