import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Volume2, CheckCircle2, AlertCircle, Play, Square, Loader2 } from "lucide-react";

interface AudioSoundcheckModalProps {
  isOpen: boolean;
  onReady: (audioEnabled: boolean) => void;
}

export const AudioSoundcheckModal: React.FC<AudioSoundcheckModalProps> = ({ isOpen, onReady }) => {
  const [micState, setMicState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRecordingSample, setIsRecordingSample] = useState(false);
  const [sampleAudioUrl, setSampleAudioUrl] = useState<string | null>(null);
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [sttTestWord, setSttTestWord] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicState('granted');

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      // Quick speech recognition check
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          const transcript = event.results[0]?.[0]?.transcript || '';
          if (transcript) setSttTestWord(transcript);
        };
        recognition.start();
      }
    } catch (err) {
      console.error("Mic access failed:", err);
      setMicState('denied');
    }
  };

  const recordSample = () => {
    if (!mediaStreamRef.current) return;
    setIsRecordingSample(true);
    setSampleAudioUrl(null);
    audioChunksRef.current = [];

    const recorder = new MediaRecorder(mediaStreamRef.current);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      setSampleAudioUrl(URL.createObjectURL(blob));
      setIsRecordingSample(false);
    };

    recorder.start();
    setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, 3000);
  };

  const cleanup = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  };

  const handleFinish = (enableAudio: boolean) => {
    cleanup();
    try { localStorage.setItem('gd-last-soundcheck', JSON.stringify({ audio: enableAudio, mic: micState, at: Date.now() })); } catch { /* ignore */ }
    onReady(enableAudio);
  };

  useEffect(() => {
    if (isOpen) startMicTest();
    return cleanup;
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={() => handleFinish(false)}>
      <DialogContent className="sm:max-w-md border-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mic className="w-5 h-5 text-primary" /> Audio & Mic Soundcheck
          </DialogTitle>
          <DialogDescription>
            Confirm your microphone and speakers before the discussion starts to avoid zero-speech dropouts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Level Meter */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span>Input Level</span>
              <span className={audioLevel > 15 ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
                {audioLevel > 15 ? "Voice Detected" : "Speak to test..."}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden p-0.5 border">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  audioLevel > 65 ? "bg-amber-500" : audioLevel > 15 ? "bg-emerald-500" : "bg-primary/40"
                }`}
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>

          {/* 3s Hear-Yourself Loop */}
          <div className="p-3 rounded-lg border bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Hear Yourself Test</p>
              <p className="text-xs text-muted-foreground">Record a 3s sample to check audio quality.</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isRecordingSample ? "destructive" : "outline"}
                onClick={recordSample}
                disabled={micState !== 'granted' || isRecordingSample}
              >
                {isRecordingSample ? <Square className="w-3.5 h-3.5 mr-1 animate-pulse" /> : <Mic className="w-3.5 h-3.5 mr-1" />}
                {isRecordingSample ? "Listening..." : "Test 3s"}
              </Button>
              {sampleAudioUrl && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const audio = new Audio(sampleAudioUrl);
                    setIsPlayingSample(true);
                    audio.onended = () => setIsPlayingSample(false);
                    audio.play();
                  }}
                  disabled={isPlayingSample}
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> Play
                </Button>
              )}
            </div>
          </div>

          {/* STT Status */}
          {sttTestWord && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Transcribed: <strong>&ldquo;{sttTestWord}&rdquo;</strong></span>
            </div>
          )}

          {micState === 'denied' && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Mic access blocked. Please check browser permissions or continue in text-only mode.</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleFinish(false)}>
            Text-Only Mode
          </Button>
          <Button
            size="sm"
            onClick={() => handleFinish(true)}
            disabled={micState === 'denied'}
            className="font-semibold"
          >
            Ready to Join
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
