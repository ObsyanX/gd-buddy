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

    const canAutoSend = Boolean(userInput.trim()) && !isProcessing && !isPracticing && !isCorrecting;

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
  }, [userInput, isProcessing, isPracticing, isCorrecting]);

  // Auto-skip after 12s when there is still no spoken/typed input
  useEffect(() => {
    if (autoSkipTimer.current) clearTimeout(autoSkipTimer.current);
    if (skipCountdownRef.current) clearInterval(skipCountdownRef.current);

    const canAutoSkip = !userInput.trim() && !isProcessing && !isPracticing && !isCorrecting;

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
  }, [userInput, isProcessing, isPracticing, isCorrecting]);
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
          <div className="flex flex-col items-center">
            <Button
              onClick={onSendWithVoice}
              disabled={isProcessing || (!userInput.trim() && !isListening) || isPracticing || isCorrecting}
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
              disabled={isProcessing || isPracticing}
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
      <p className="text-[10px] sm:text-xs text-muted-foreground font-mono text-center hidden sm:block mt-1">
        TIP: Ctrl+M for practice • Ctrl+Enter to send • Esc to stop audio
      </p>
    </div>
  );
};

export default MessageInput;
