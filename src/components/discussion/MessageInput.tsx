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

const MessageInput = ({
  userInput, isListening, isProcessing, isPracticing, isCorrecting,
  onInputChange, onSendMessage, onSendWithVoice, onVoiceInput,
  onStartPractice, onSkipTurn, onOpenMobileMetrics,
}: MessageInputProps) => {
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
            <Mic className="w-4 h-4" />
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
          <Button
            onClick={onSendWithVoice}
            disabled={isProcessing || (!userInput.trim() && !isListening) || isPracticing || isCorrecting}
            className="border-2 h-10 w-10 p-0 sm:w-auto sm:px-3"
            title={isListening ? "Stop & Send" : "Send (Ctrl+Enter)"}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
          <Button
            onClick={onSkipTurn}
            disabled={isProcessing || isPracticing}
            variant="outline"
            className="border-2 h-10 w-10 p-0 sm:w-auto sm:px-3 hidden sm:flex"
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
