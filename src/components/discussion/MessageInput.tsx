import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Mic,
  MicVocal,
  Square,
  Loader2,
  SkipForward,
  BarChart3,
  SendHorizonal,
  Timer,
  Lock,
} from "lucide-react";
import { useClientVAD } from "@/hooks/useClientVAD";
import { logRoomEvent } from "@/lib/room-log";

export type TurnState =
  | "floor_locked"
  | "floor_open"
  | "requesting_mic"
  | "speaking";

interface MessageInputProps {
  userInput: string;
  isListening: boolean;
  isProcessing: boolean;
  isPracticing: boolean;
  isCorrecting: boolean;
  isPaused: boolean;
  isBusy?: boolean;

  floorLocked: boolean;
  isMicInitializing: boolean;
  activeSpeakerName?: string;

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

  onInterject?: (phrase: string) => void;
}

const AUTO_SEND_DELAY = 7;
const AUTO_SKIP_DELAY = 12;

const MessageInput = ({
  userInput,
  isListening,
  isProcessing,
  isPracticing,
  isCorrecting,
  isPaused,
  isBusy = false,

  floorLocked,
  isMicInitializing,
  activeSpeakerName,

  autoSendEnabled,
  autoSkipEnabled,

  onInputChange,
  onSendMessage,
  onSendWithVoice,
  onVoiceInput,
  onStartPractice,
  onSkipTurn,
  onOpenMobileMetrics,
  onToggleAutoSend,
  onToggleAutoSkip,

  onInterject,
}: MessageInputProps) => {
  const turnState: TurnState = floorLocked
    ? "floor_locked"
    : isListening
    ? "speaking"
    : isMicInitializing
    ? "requesting_mic"
    : "floor_open";

  // ------------------------------------------------------------
  // TIMER REFS
  // ------------------------------------------------------------

  const autoSendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSkipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendCountdownRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const skipCountdownRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep latest callbacks available to timers.
  const onSendMessageRef = useRef(onSendWithVoice);
  const onSkipTurnRef = useRef(onSkipTurn);

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------

  const [countdown, setCountdown] = useState<number | null>(null);
  const [skipCountdown, setSkipCountdown] = useState<number | null>(null);

  // ------------------------------------------------------------
  // CLIENT VAD
  // ------------------------------------------------------------

  const vadStreamRef = useRef<MediaStream | null>(null);
  const [vadStream, setVadStream] = useState<MediaStream | null>(null);

  /**
   * Prevents VAD + another automatic mechanism from submitting
   * the same turn twice within a very short period.
   */
  const vadSendLockRef = useRef(false);

  // ------------------------------------------------------------
  // KEEP CALLBACK REFS FRESH
  // ------------------------------------------------------------

  useEffect(() => {
    onSendMessageRef.current = onSendWithVoice;
  }, [onSendWithVoice]);

  useEffect(() => {
    onSkipTurnRef.current = onSkipTurn;
  }, [onSkipTurn]);

  // ------------------------------------------------------------
  // CREATE VAD MICROPHONE STREAM
  // ------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const startVADStream = async () => {
      // No active speech recognition -> no VAD stream needed.
      if (!isListening) {
        if (vadStreamRef.current) {
          vadStreamRef.current
            .getTracks()
            .forEach((track) => track.stop());

          vadStreamRef.current = null;
        }

        setVadStream(null);
        return;
      }

      // Avoid creating another stream if one already exists.
      if (vadStreamRef.current) {
        return;
      }

      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        console.warn(
          "Client VAD skipped: getUserMedia is not available."
        );
        return;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

        // Component stopped listening while permission was being requested.
        if (cancelled || !isListening) {
          stream
            .getTracks()
            .forEach((track) => track.stop());

          return;
        }

        vadStreamRef.current = stream;
        setVadStream(stream);
      } catch (error) {
        console.warn(
          "Client VAD microphone initialization failed:",
          error
        );
      }
    };

    void startVADStream();

    return () => {
      cancelled = true;
    };
  }, [isListening]);

  // ------------------------------------------------------------
  // STOP VAD STREAM WHEN COMPONENT UNMOUNTS
  // ------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (vadStreamRef.current) {
        vadStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        vadStreamRef.current = null;
      }
    };
  }, []);

  // ------------------------------------------------------------
  // SPEECH START
  // ------------------------------------------------------------

  const handleSpeechStart = useCallback(() => {
    /*
     * Candidate has started speaking.
     *
     * We cancel the automatic timers because the candidate
     * is actively using the floor.
     */

    if (autoSendTimer.current) {
      clearTimeout(autoSendTimer.current);
      autoSendTimer.current = null;
    }

    if (sendCountdownRef.current) {
      clearInterval(sendCountdownRef.current);
      sendCountdownRef.current = null;
    }

    if (autoSkipTimer.current) {
      clearTimeout(autoSkipTimer.current);
      autoSkipTimer.current = null;
    }

    if (skipCountdownRef.current) {
      clearInterval(skipCountdownRef.current);
      skipCountdownRef.current = null;
    }

    setCountdown(null);
    setSkipCountdown(null);
  }, []);

  // ------------------------------------------------------------
  // SPEECH END
  // ------------------------------------------------------------

  const handleSpeechEnd = useCallback(() => {
    /*
     * IMPORTANT:
     *
     * Do not manually construct/send the text here.
     *
     * onSendWithVoice is the existing voice-aware path and should
     * be responsible for stopping the microphone and allowing the
     * transcription pipeline to finish.
     *
     * This avoids duplicating the existing send architecture.
     */

    if (
      !isListening ||
      isProcessing ||
      isCorrecting ||
      isPaused ||
      isBusy ||
      isPracticing ||
      floorLocked
    ) {
      return;
    }

    if (vadSendLockRef.current) {
      return;
    }

    vadSendLockRef.current = true;

    try {
      onSendMessageRef.current();
    } catch (error) {
      console.warn(
        "Automatic VAD send failed:",
        error
      );
    }

    /*
     * Give the existing voice-send lifecycle time to settle
     * before allowing another VAD submission.
     */
    window.setTimeout(() => {
      vadSendLockRef.current = false;
    }, 1500);
  }, [
    isListening,
    isProcessing,
    isCorrecting,
    isPaused,
    isBusy,
    isPracticing,
    floorLocked,
  ]);

  // ------------------------------------------------------------
  // CLIENT VAD
  //
  // IMPORTANT:
  // This must be declared BEFORE the effects below that use
  // isVADSpeaking.
  // ------------------------------------------------------------

  const { isSpeaking: isVADSpeaking } = useClientVAD({
    stream: vadStream,
    volumeThreshold: 0.02,
    silenceHangoverMs: 1400,
    onSpeechStart: () => { logRoomEvent('vad_start'); handleSpeechStart(); },
    onSpeechEnd: () => { logRoomEvent('vad_release', true, { hangover_ms: 1400 }); handleSpeechEnd(); },
  });

  // ------------------------------------------------------------
  // AUTO SEND
  // ------------------------------------------------------------

  useEffect(() => {
    if (autoSendTimer.current) {
      clearTimeout(autoSendTimer.current);
      autoSendTimer.current = null;
    }

    if (sendCountdownRef.current) {
      clearInterval(sendCountdownRef.current);
      sendCountdownRef.current = null;
    }

    /*
     * Auto-send is disabled while:
     * - discussion is paused
     * - another operation is busy
     * - AI has the floor
     * - candidate is actively speaking
     * - microphone is initializing
     * - no input exists
     * - processing/correction/practice is active
     */

    const canAutoSend =
      autoSendEnabled &&
      !isPaused &&
      !isBusy &&
      !floorLocked &&
      !isVADSpeaking &&
      !isMicInitializing &&
      Boolean(userInput.trim()) &&
      !isProcessing &&
      !isPracticing &&
      !isCorrecting;

    if (!canAutoSend) {
      setCountdown(null);
      return;
    }

    let remaining = AUTO_SEND_DELAY;

    setCountdown(remaining);
    logRoomEvent('autosend_start', true, { seconds: AUTO_SEND_DELAY });

    sendCountdownRef.current = setInterval(() => {
      remaining -= 1;

      setCountdown(
        remaining > 0 ? remaining : null
      );
    }, 1000);

    autoSendTimer.current = setTimeout(() => {
      logRoomEvent('autosend_fire');
      if (sendCountdownRef.current) {
        clearInterval(sendCountdownRef.current);
        sendCountdownRef.current = null;
      }

      setCountdown(null);

      if (
        !isProcessing &&
        !isCorrecting &&
        !isPaused &&
        !isBusy &&
        !floorLocked &&
        !isVADSpeaking
      ) {
        onSendMessageRef.current();
      }
    }, AUTO_SEND_DELAY * 1000);

    return () => {
      if (autoSendTimer.current) {
        clearTimeout(autoSendTimer.current);
        autoSendTimer.current = null;
      }

      if (sendCountdownRef.current) {
        clearInterval(sendCountdownRef.current);
        sendCountdownRef.current = null;
      }
    };
  }, [
    userInput,
    isProcessing,
    isPracticing,
    isCorrecting,
    autoSendEnabled,
    floorLocked,
    isMicInitializing,
    isPaused,
    isBusy,
    isVADSpeaking,
  ]);

  // ------------------------------------------------------------
  // AUTO SKIP
  // ------------------------------------------------------------

  useEffect(() => {
    if (autoSkipTimer.current) {
      clearTimeout(autoSkipTimer.current);
      autoSkipTimer.current = null;
    }

    if (skipCountdownRef.current) {
      clearInterval(skipCountdownRef.current);
      skipCountdownRef.current = null;
    }

    const canAutoSkip =
      autoSkipEnabled &&
      !isPaused &&
      !isBusy &&
      !floorLocked &&
      !isMicInitializing &&
      !isVADSpeaking &&
      !userInput.trim() &&
      !isProcessing &&
      !isPracticing &&
      !isCorrecting;

    if (!canAutoSkip) {
      setSkipCountdown(null);
      return;
    }

    let remaining = AUTO_SKIP_DELAY;

    setSkipCountdown(remaining);

    skipCountdownRef.current = setInterval(() => {
      remaining -= 1;

      setSkipCountdown(
        remaining > 0 ? remaining : null
      );
    }, 1000);

    autoSkipTimer.current = setTimeout(() => {
      if (skipCountdownRef.current) {
        clearInterval(skipCountdownRef.current);
        skipCountdownRef.current = null;
      }

      setSkipCountdown(null);

      if (
        !isProcessing &&
        !isPracticing &&
        !isCorrecting &&
        !isPaused &&
        !isBusy &&
        !floorLocked &&
        !isVADSpeaking &&
        !userInput.trim()
      ) {
        onSkipTurnRef.current();
      }
    }, AUTO_SKIP_DELAY * 1000);

    return () => {
      if (autoSkipTimer.current) {
        clearTimeout(autoSkipTimer.current);
        autoSkipTimer.current = null;
      }

      if (skipCountdownRef.current) {
        clearInterval(skipCountdownRef.current);
        skipCountdownRef.current = null;
      }
    };
  }, [
    userInput,
    isProcessing,
    isPracticing,
    isCorrecting,
    autoSkipEnabled,
    floorLocked,
    isMicInitializing,
    isPaused,
    isBusy,
    isVADSpeaking,
  ]);

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <div className="space-y-1.5 sm:space-y-2">

      {/* AI Correction Status */}
      {isCorrecting && (
        <div className="flex items-center justify-center gap-2 py-1.5 sm:py-2 text-xs sm:text-sm text-muted-foreground">
          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />

          <span className="font-mono text-[10px] sm:text-sm">
            Applying AI correction...
          </span>
        </div>
      )}

      {/* =========================================================
          TURN READINESS BAR
          ========================================================= */}

      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-medium mb-1 transition-all">

        {/* FLOOR LOCKED — INTERACTIVE FLOOR STEALING */}

        {turnState === "floor_locked" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2 py-0.5">

            <div className="flex items-center gap-2 text-muted-foreground text-xs min-w-0">
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />

              <span className="truncate">
                <strong className="text-foreground">
                  {activeSpeakerName || "AI participant"}
                </strong>{" "}
                is speaking...
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">

              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:inline">
                Interject:
              </span>

              {[
                "Pardon the interruption, but...",
                `Adding to ${activeSpeakerName || "that"} point...`,
                "Respectfully disagreeing here...",
              ].map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onInterject?.(phrase)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 whitespace-nowrap transition-colors"
                >
                  {phrase}
                </button>
              ))}

              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px] border-amber-500 text-amber-600 hover:bg-amber-500/15"
                onClick={() =>
                  onInterject?.(
                    "Excuse me, if I could interject..."
                  )
                }
              >
                Steal Floor
              </Button>

            </div>
          </div>
        )}

        {/* FLOOR OPEN */}

        {turnState === "floor_open" && (
          <div className="flex items-center justify-between w-full">

            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">

              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />

                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>

              <span className="font-semibold">
                Floor Open — Ready for your input
              </span>

            </div>

            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
              onClick={onVoiceInput}
              disabled={
                isProcessing ||
                isPracticing ||
                isCorrecting ||
                isPaused ||
                isBusy ||
                isMicInitializing
              }
            >
              <Mic className="w-3.5 h-3.5 mr-1" />
              Tap to Speak
            </Button>

          </div>
        )}

        {/* REQUESTING MICROPHONE */}

        {turnState === "requesting_mic" && (
          <div className="flex items-center gap-2 text-amber-500">

            <Loader2 className="w-3.5 h-3.5 animate-spin" />

            <span>
              Acquiring microphone &amp; priming STT...
            </span>

          </div>
        )}

        {/* SPEAKING */}

        {turnState === "speaking" && (
          <div className="flex items-center justify-between w-full text-destructive">

            <div className="flex items-center gap-2">

              <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />

              <span className="font-bold">
                Speaking (Active) — Recording your answer
              </span>

              {isVADSpeaking && (
                <span className="text-[10px] font-medium text-muted-foreground">
                  Voice detected
                </span>
              )}

            </div>

            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={onSendWithVoice}
              disabled={
                isProcessing ||
                isCorrecting
              }
            >
              <Square className="w-3 h-3 mr-1" />
              Done Speaking (Send)
            </Button>

          </div>
        )}

      </div>

      {/* =========================================================
          INPUT + CONTROLS
          ========================================================= */}

      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">

        {/* TEXT INPUT */}

        <Input
          placeholder={
            isPaused
              ? "Discussion paused..."
              : isListening
              ? "Speaking..."
              : "Type or use voice..."
          }
          value={userInput}
          onChange={(e) =>
            onInputChange(e.target.value)
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.ctrlKey &&
              !isListening &&
              !floorLocked &&
              !isMicInitializing
            ) {
              onSendMessage();
            }
          }}
          className={`border-2 text-sm sm:text-base lg:text-lg flex-1 h-10 sm:h-11 ${
            isListening
              ? "border-destructive bg-destructive/5"
              : ""
          }`}
          disabled={
            isProcessing ||
            isPracticing ||
            isPaused ||
            floorLocked ||
            isMicInitializing
          }
          readOnly={isListening}
        />

        {/* =====================================================
            ACTION BUTTONS
            ===================================================== */}

        <div className="flex gap-1 sm:gap-1.5 lg:gap-2 justify-between sm:justify-end">

          {/* Mobile Metrics */}

          <Button
            variant="outline"
            className="border-2 h-10 w-10 p-0 sm:hidden"
            title="View Metrics"
            onClick={onOpenMobileMetrics}
          >
            <BarChart3 className="w-4 h-4" />
          </Button>

          {/* Practice Mode */}

          <Button
            onClick={onStartPractice}
            disabled={
              isProcessing ||
              isListening ||
              isPracticing ||
              isPaused ||
              floorLocked ||
              isMicInitializing
            }
            variant="outline"
            className="border-2 h-10 w-10 p-0 sm:w-auto sm:px-3"
            title="Practice Mode (Ctrl+M)"
          >
            <MicVocal className="w-4 h-4" />
          </Button>

          {/* Send */}

          <div className="flex flex-col items-center">

            <Button
              onClick={onSendWithVoice}
              disabled={
                isProcessing ||
                (!userInput.trim() && !isListening) ||
                isPracticing ||
                isCorrecting ||
                isPaused ||
                floorLocked ||
                isMicInitializing
              }
              className="border-2 h-10 w-10 p-0 sm:w-auto sm:px-3"
              title={
                isListening
                  ? "Stop & Send"
                  : "Send (Ctrl+Enter)"
              }
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>

            {countdown !== null && (
              <span className="text-[10px] font-mono text-destructive font-bold mt-0.5">
                {countdown}s
              </span>
            )}

          </div>

          {/* Skip Turn */}

          <div className="flex flex-col items-center">

            <Button
              onClick={onSkipTurn}
              disabled={
                isProcessing ||
                isPracticing ||
                isPaused ||
                floorLocked ||
                isMicInitializing
              }
              variant="outline"
              className="border-2 h-10 w-10 p-0 sm:w-auto sm:px-3"
              title="Skip your turn"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            {skipCountdown !== null && (
              <span className="text-[10px] font-mono text-muted-foreground font-bold mt-0.5">
                {skipCountdown}s
              </span>
            )}

          </div>

        </div>
      </div>

      {/* =========================================================
          AUTO SEND / AUTO SKIP
          ========================================================= */}

      <div className="flex items-center justify-center gap-2 sm:gap-3 mt-1">

        {/* Auto Send */}

        <button
          onClick={onToggleAutoSend}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono border transition-colors ${
            autoSendEnabled
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/30 border-border text-muted-foreground"
          }`}
          title={
            autoSendEnabled
              ? "Auto-send ON: sends after 7s idle"
              : "Auto-send OFF"
          }
        >
          <SendHorizonal className="w-3 h-3" />

          Auto-send {autoSendEnabled ? "ON" : "OFF"}
        </button>

        {/* Auto Skip */}

        <button
          onClick={onToggleAutoSkip}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono border transition-colors ${
            autoSkipEnabled
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/30 border-border text-muted-foreground"
          }`}
          title={
            autoSkipEnabled
              ? "Auto-skip ON: skips turn after 12s"
              : "Auto-skip OFF"
          }
        >
          <Timer className="w-3 h-3" />

          Auto-skip {autoSkipEnabled ? "ON" : "OFF"}
        </button>

      </div>
    </div>
  );
};

export default MessageInput;

