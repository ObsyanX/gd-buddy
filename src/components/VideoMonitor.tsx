import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, Eye, User, X, Loader2, Mic, Volume2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAudioAnalysis, AudioMetrics } from '@/hooks/useAudioAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { getMediaPipeClient, destroyMediaPipeClient, LandmarkData } from '@/lib/mediapipe-client';
import { getAnalyzeFrameClient, resetAnalyzeFrameClient, FrameResponse, AnalysisMetrics } from '@/lib/analyze-frame-client';
import { resetExternalVideoAnalyzer } from '@/lib/external-video-analyzer';

interface VideoMonitorProps {
  isActive: boolean;
  sessionId?: string;
  isUserMicActive?: boolean;
  onMetricsUpdate?: (metrics: VideoMetrics) => void;
  onAudioMetricsUpdate?: (metrics: AudioMetrics) => void;
}

export interface VideoMetrics {
  posture: 'good' | 'needs_improvement' | 'poor';
  postureScore: number;
  eyeContact: 'maintained' | 'occasional' | 'avoiding';
  eyeContactScore: number;
  facialExpression: 'confident' | 'neutral' | 'nervous';
  expressionScore: number;
  overallScore: number;
  tips: string[];
  faceDetected: boolean;
  // New metrics from backend
  attentionPercent: number | null;
  headMovement: number | null;
  shoulderTilt: number | null;
  handActivity: number | null;
  handsDetected: number;
  frameConfidence: number;
}

export interface AccumulatedVideoMetrics {
  postureScores: number[];
  eyeContactScores: number[];
  expressionScores: number[];
  tips: Set<string>;
  totalFrames: number;
  facesDetected: number;
}

const VideoMonitor = ({ isActive, sessionId, isUserMicActive = false, onMetricsUpdate, onAudioMetricsUpdate }: VideoMonitorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveMetricsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCameraOnRef = useRef(false);
  const lastValidMetricsRef = useRef<VideoMetrics | null>(null); // Store last valid backend metrics
  const hasReceivedBackendDataRef = useRef(false); // Track if backend ever returned valid data
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [showFaceMesh, setShowFaceMesh] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [confidenceStatus, setConfidenceStatus] = useState<'PASS' | 'FAIL' | null>(null);
  const [isWarmingUp, setIsWarmingUp] = useState(false); // Grace period for face detection
  const [isFallbackMode, setIsFallbackMode] = useState(false); // Track fallback mode
  const [hasBackendData, setHasBackendData] = useState(false); // UI flag for backend data availability
  const [metrics, setMetrics] = useState<VideoMetrics>({
    posture: 'good',
    postureScore: 0,
    eyeContact: 'maintained',
    eyeContactScore: 0,
    facialExpression: 'neutral',
    expressionScore: 0,
    overallScore: 0,
    tips: [],
    faceDetected: false,
    attentionPercent: null,
    headMovement: null,
    shoulderTilt: null,
    handActivity: null,
    handsDetected: 0,
    frameConfidence: 0
  });
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Audio analysis
  const { 
    isActive: isAudioActive, 
    metrics: audioMetrics, 
    startAnalysis: startAudioAnalysis, 
    stopAnalysis: stopAudioAnalysis,
    getSessionMetrics: getAudioSessionMetrics 
  } = useAudioAnalysis({
    onSpeakingChange: (speaking) => console.log('Speaking:', speaking),
    onMetricsUpdate: onAudioMetricsUpdate,
  });
  
  useEffect(() => {
    isCameraOnRef.current = isCameraOn;
  }, [isCameraOn]);

  // Ensure stream is attached when video element mounts (fixes video not displaying)
  useEffect(() => {
    if (isCameraOn && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        console.log('Re-attaching stream to video element');
        video.srcObject = streamRef.current;
        video.play().then(() => {
          console.log('Video playing after re-attach');
          setIsVideoReady(true);
        }).catch(err => console.warn('Play failed:', err));
      }
    }
  }, [isCameraOn]);

  const { toast } = useToast();

  const accumulatedRef = useRef<AccumulatedVideoMetrics>({
    postureScores: [],
    eyeContactScores: [],
    expressionScores: [],
    tips: new Set(),
    totalFrames: 0,
    facesDetected: 0
  });

  const loadModels = async () => {
    if (modelsLoaded) return true;
    
    setIsLoadingModels(true);
    try {
      console.log('Initializing MediaPipe models...');
      const mediapipe = getMediaPipeClient();
      await mediapipe.initialize();
      setModelsLoaded(true);
      console.log('MediaPipe models loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading MediaPipe models:', error);
      toast({
        title: "Model loading failed",
        description: "Could not load face detection models. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoadingModels(false);
    }
  };

  const startCamera = async () => {
    setIsInitializingCamera(true);
    setIsVideoReady(false);
    setBackendError(null);
    
    // Reset both analyzers for new session
    resetAnalyzeFrameClient();
    resetExternalVideoAnalyzer();
    
    try {
      const modelsReady = await loadModels();
      if (!modelsReady) {
        setIsInitializingCamera(false);
        return;
      }
      
      console.log('Requesting camera and mic access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = null;
        video.srcObject = stream;
        
        await new Promise<void>((resolve, reject) => {
          const handleCanPlay = () => {
            console.log('Video can play, dimensions:', video.videoWidth, video.videoHeight);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            resolve();
          };
          
          const handleError = (e: Event) => {
            console.error('Video error:', e);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            reject(new Error('Video failed to load'));
          };
          
          video.addEventListener('canplay', handleCanPlay);
          video.addEventListener('error', handleError);
          
          video.play().catch(err => {
            console.log('Initial play attempt failed, waiting for canplay event:', err);
          });
          
          setTimeout(() => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            if (video.srcObject) {
              console.log('Timeout reached, forcing resolution');
              resolve();
            }
          }, 3000);
        });
        
        if (video.paused) {
          await video.play();
        }
        
        console.log('Video playing, final dimensions:', video.videoWidth, video.videoHeight);
        setIsVideoReady(true);
      }
      
      startAudioAnalysis(stream);
      
      isCameraOnRef.current = true;
      setIsCameraOn(true);
      setHasPermission(true);
      setIsInitializingCamera(false);
      
      toast({
        title: "Camera & Mic enabled",
        description: "Face detection and audio analysis active",
      });
      
      setTimeout(startAnalysis, 300);
    } catch (error: any) {
      console.error('Camera access error:', error);
      setHasPermission(false);
      setIsInitializingCamera(false);
      setIsVideoReady(false);
      toast({
        title: "Camera access denied",
        description: "Please enable camera and microphone permissions",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    isCameraOnRef.current = false;
    stopAudioAnalysis();
    
    if (sessionId) {
      saveMetricsToDatabase();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    
    // Cleanup MediaPipe
    destroyMediaPipeClient();
    setModelsLoaded(false);
    
    // Reset backend data tracking
    lastValidMetricsRef.current = null;
    hasReceivedBackendDataRef.current = false;
    setHasBackendData(false);
    
    setIsCameraOn(false);
    setIsVideoReady(false);
  };

  const drawLandmarks = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: LandmarkData,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    if (!showFaceMesh) return;
    
    // Draw face landmarks
    if (landmarks.face && landmarks.face.landmarks.length > 0) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
      ctx.lineWidth = 1;
      
      // Draw key landmarks only (not all 468 for performance)
      const keyIndices = [
        1, 33, 133, 263, 362, // Eyes and nose
        61, 291, 13, 14, // Mouth
        234, 454, 152, 10 // Face outline
      ];
      
      for (const idx of keyIndices) {
        if (idx < landmarks.face.landmarks.length) {
          const point = landmarks.face.landmarks[idx];
          const x = canvasWidth - (point[0] * canvasWidth); // Mirror
          const y = point[1] * canvasHeight;
          
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Draw face bounding box estimate
      const xs = landmarks.face.landmarks.map(p => p[0]);
      const ys = landmarks.face.landmarks.map(p => p[1]);
      const minX = Math.min(...xs) * canvasWidth;
      const maxX = Math.max(...xs) * canvasWidth;
      const minY = Math.min(...ys) * canvasHeight;
      const maxY = Math.max(...ys) * canvasHeight;
      
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        canvasWidth - maxX,
        minY,
        maxX - minX,
        maxY - minY
      );
    }
    
    // Draw hand landmarks
    if (landmarks.hands && landmarks.hands.length > 0) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
      
      for (const hand of landmarks.hands) {
        for (const point of hand.landmarks) {
          const x = canvasWidth - (point[0] * canvasWidth);
          const y = point[1] * canvasHeight;
          
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [showFaceMesh]);

  const convertBackendMetrics = (response: FrameResponse): VideoMetrics => {
    const backendMetrics = response.metrics;
    
    if (!backendMetrics) {
      return {
        posture: 'poor',
        postureScore: 0,
        eyeContact: 'avoiding',
        eyeContactScore: 0,
        facialExpression: 'nervous',
        expressionScore: 0,
        overallScore: 0,
        tips: ['Face not detected - ensure you are visible in frame'],
        faceDetected: false,
        attentionPercent: null,
        headMovement: null,
        shoulderTilt: null,
        handActivity: null,
        handsDetected: 0,
        frameConfidence: response.frame_confidence
      };
    }
    
    const postureScore = backendMetrics.posture_score ?? 0;
    const eyeContactScore = backendMetrics.eye_contact_score ?? 0;
    const expressionScore = backendMetrics.expression_score ?? 0;
    
    // Derive categorical values from scores
    const posture: 'good' | 'needs_improvement' | 'poor' = 
      postureScore >= 70 ? 'good' : postureScore >= 50 ? 'needs_improvement' : 'poor';
    const eyeContact: 'maintained' | 'occasional' | 'avoiding' = 
      eyeContactScore >= 70 ? 'maintained' : eyeContactScore >= 50 ? 'occasional' : 'avoiding';
    const facialExpression: 'confident' | 'neutral' | 'nervous' = 
      expressionScore >= 70 ? 'confident' : expressionScore >= 50 ? 'neutral' : 'nervous';
    
    // Generate tips from warnings
    const tips: string[] = [];
    if (response.warnings.length > 0) {
      tips.push(...response.warnings.slice(0, 3));
    }
    
    // Add tips based on low scores
    if (postureScore > 0 && postureScore < 70) {
      tips.push('Adjust your posture - keep shoulders level');
    }
    if (eyeContactScore > 0 && eyeContactScore < 70) {
      tips.push('Look directly at the camera');
    }
    if (expressionScore > 0 && expressionScore < 50) {
      tips.push('Try to maintain a confident expression');
    }
    
    const overallScore = postureScore > 0 && eyeContactScore > 0 && expressionScore > 0
      ? Math.round((postureScore + eyeContactScore + expressionScore) / 3)
      : 0;
    
    return {
      posture,
      postureScore,
      eyeContact,
      eyeContactScore,
      facialExpression,
      expressionScore,
      overallScore,
      tips: tips.slice(0, 3),
      faceDetected: postureScore > 0 || eyeContactScore > 0,
      attentionPercent: backendMetrics.attention_percent,
      headMovement: backendMetrics.head_movement_normalized,
      shoulderTilt: backendMetrics.shoulder_tilt_deg,
      handActivity: backendMetrics.hand_activity_normalized,
      handsDetected: backendMetrics.hands_detected_count,
      frameConfidence: response.frame_confidence
    };
  };

  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraOnRef.current) {
      console.log('Analysis stopped - camera off or refs missing');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video not ready, waiting...');
      analysisTimeoutRef.current = setTimeout(analyzeFrame, 200);
      return;
    }

    accumulatedRef.current.totalFrames++;
    setIsAnalyzing(true);

    try {
      // Get landmarks from MediaPipe (still used for visualization)
      const mediapipe = getMediaPipeClient();
      if (!mediapipe.isInitialized()) {
        console.warn('MediaPipe not initialized, waiting...');
        analysisTimeoutRef.current = setTimeout(analyzeFrame, 500);
        return;
      }
      
      const landmarks = await mediapipe.processFrame(video);
      
      // Check if MediaPipe detected a face locally (used as fallback)
      const hasFaceLocally = landmarks.face && landmarks.face.landmarks && landmarks.face.landmarks.length > 0;
      
      // Update canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        drawLandmarks(ctx, landmarks, canvas.width, canvas.height);
      }
      
      // Send to backend for analysis (now uses external backend with video element)
      const analyzeClient = getAnalyzeFrameClient();
      const response = await analyzeClient.analyze(landmarks, video);
      
      // Log backend response for debugging
      if (response.metrics) {
        console.log('Backend metrics received:', {
          attention: response.metrics.attention_percent,
          posture: response.metrics.posture_score,
          eyeContact: response.metrics.eye_contact_score,
          expression: response.metrics.expression_score,
          frameConfidence: response.frame_confidence
        });
      } else if (response.explanations.reason !== 'throttled') {
        console.log('Backend response (no metrics):', response.explanations);
      }
      
      // Update confidence status from external backend
      const newConfidenceStatus = analyzeClient.getConfidenceStatus();
      setConfidenceStatus(newConfidenceStatus);
      
      // Update fallback mode status
      setIsFallbackMode(analyzeClient.isFallbackActive());
      
      if (response.explanations.error) {
        setBackendError(response.explanations.error);
      } else if (response.explanations.reason && response.explanations.reason !== 'throttled') {
        setBackendError(response.explanations.reason);
      } else {
        setBackendError(null);
      }
      
      // Convert and update metrics - preserve existing scores if backend throttled/failed
      const newMetrics = convertBackendMetrics(response);
      
      // Use MediaPipe's local face detection as fallback if backend didn't respond properly
      if (hasFaceLocally && !newMetrics.faceDetected) {
        newMetrics.faceDetected = true;
        // Clear the "no face" tip if we detected one locally
        newMetrics.tips = newMetrics.tips.filter(tip => !tip.toLowerCase().includes('face not detected'));
      }
      
      // Check if backend returned valid metrics
      const hasValidBackendMetrics = response.metrics !== null && response.metrics.attention_percent !== null;
      
      if (hasValidBackendMetrics) {
        // Backend returned valid data - store it and update UI
        lastValidMetricsRef.current = newMetrics;
        hasReceivedBackendDataRef.current = true;
        setHasBackendData(true);
        
        console.log('✓ Valid backend metrics received:', {
          posture: newMetrics.postureScore,
          eyeContact: newMetrics.eyeContactScore,
          expression: newMetrics.expressionScore,
          attention: newMetrics.attentionPercent
        });
        
        // Update accumulated metrics
        if (newMetrics.faceDetected) {
          accumulatedRef.current.facesDetected++;
          accumulatedRef.current.postureScores.push(newMetrics.postureScore);
          accumulatedRef.current.eyeContactScores.push(newMetrics.eyeContactScore);
          accumulatedRef.current.expressionScores.push(newMetrics.expressionScore);
          newMetrics.tips.forEach(tip => accumulatedRef.current.tips.add(tip));
        }
        
        setMetrics(newMetrics);
        onMetricsUpdate?.(newMetrics);
      } else {
        // Backend failed or throttled - preserve last valid metrics if available
        if (lastValidMetricsRef.current) {
          // Keep last valid metrics but update faceDetected based on local detection
          setMetrics(prev => ({
            ...prev,
            ...lastValidMetricsRef.current!,
            faceDetected: hasFaceLocally || prev.faceDetected
          }));
        } else {
          // No valid backend data yet - just update faceDetected from local detection
          setMetrics(prev => ({
            ...prev,
            faceDetected: hasFaceLocally || prev.faceDetected
          }));
        }
      }
      
    } catch (error) {
      console.error('Frame analysis error:', error);
      setBackendError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }

    // Continue analysis at ~2 FPS (matches external backend interval)
    analysisTimeoutRef.current = setTimeout(analyzeFrame, 500);
  }, [onMetricsUpdate, drawLandmarks]);

  const startAnalysis = useCallback(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    console.log('Starting frame analysis with MediaPipe + backend...');
    
    // Start warm-up period (3 seconds) - don't show "No Face" during this time
    setIsWarmingUp(true);
    setTimeout(() => {
      setIsWarmingUp(false);
      console.log('Warm-up period ended');
    }, 3000);
    
    analyzeFrame();
  }, [analyzeFrame]);

  const getSessionMetrics = useCallback(() => {
    const acc = accumulatedRef.current;
    const audioSession = getAudioSessionMetrics();
    const analyzeClient = getAnalyzeFrameClient();
    const backendSession = analyzeClient.getSessionMetrics();
    
    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    
    return {
      avgPostureScore: backendSession.posture_score ?? avg(acc.postureScores),
      avgEyeContactScore: backendSession.eye_contact_score ?? avg(acc.eyeContactScores),
      avgExpressionScore: backendSession.expression_score ?? avg(acc.expressionScores),
      attentionPercent: backendSession.attention_percent,
      tips: backendSession.tips.length > 0 ? backendSession.tips : Array.from(acc.tips),
      faceDetectionRate: acc.totalFrames > 0 ? Math.round((acc.facesDetected / acc.totalFrames) * 100) : 0,
      frameCaptureRate: backendSession.frame_capture_rate,
      audio: audioSession,
    };
  }, [getAudioSessionMetrics]);

  const saveMetricsToDatabase = useCallback(async () => {
    if (!sessionId) return;
    
    const videoMetrics = getSessionMetrics();
    const audioSession = getAudioSessionMetrics();
    
    try {
      const { error } = await supabase.functions.invoke('video-analysis', {
        body: {
          session_id: sessionId,
          posture_score: videoMetrics.avgPostureScore || null,
          eye_contact_score: videoMetrics.avgEyeContactScore || null,
          expression_score: videoMetrics.avgExpressionScore || null,
          video_tips: videoMetrics.tips,
          voice_score: audioSession.speakingRatio > 0 ? Math.round(audioSession.speakingRatio * 100) : null,
          avg_pause_s: audioSession.avgPauseLength > 0 ? audioSession.avgPauseLength : null,
        },
      });
      
      if (error) {
        console.error('Failed to save video metrics:', error);
      } else {
        console.log('Video metrics saved successfully');
      }
    } catch (err) {
      console.error('Error saving video metrics:', err);
    }
  }, [sessionId, getSessionMetrics, getAudioSessionMetrics]);

  // Auto-save metrics every 30 seconds
  useEffect(() => {
    if (isCameraOn && sessionId) {
      saveMetricsTimeoutRef.current = setInterval(saveMetricsToDatabase, 30000);
    }
    return () => {
      if (saveMetricsTimeoutRef.current) {
        clearInterval(saveMetricsTimeoutRef.current);
        saveMetricsTimeoutRef.current = null;
      }
    };
  }, [isCameraOn, sessionId, saveMetricsToDatabase]);

  useEffect(() => {
    (window as any).__getVideoSessionMetrics = getSessionMetrics;
    (window as any).__saveVideoMetrics = saveMetricsToDatabase;
    return () => {
      delete (window as any).__getVideoSessionMetrics;
      delete (window as any).__saveVideoMetrics;
    };
  }, [getSessionMetrics, saveMetricsToDatabase]);

  useEffect(() => {
    return () => {
      stopCamera();
      stopAudioAnalysis();
    };
  }, [stopAudioAnalysis]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  if (!isActive) return null;

  // Re-attach stream when minimize state changes
  useEffect(() => {
    if (!isMinimized && isCameraOn && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        console.log('Re-attaching stream after restore from minimize');
        video.srcObject = streamRef.current;
        video.play().then(() => {
          console.log('Video resumed after restore');
          setIsVideoReady(true);
        }).catch(err => console.warn('Resume play failed:', err));
      }
    }
  }, [isMinimized, isCameraOn]);

  return (
    <Card className={`border-4 border-border transition-all ${isMinimized ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Camera className="w-4 h-4" />
          VIDEO MONITOR
          {isCameraOn && metrics.faceDetected && (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500">
              LIVE
            </Badge>
          )}
          {backendError && !isFallbackMode && (
            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500">
              <AlertCircle className="w-3 h-3 mr-1" />
              Backend
            </Badge>
          )}
          {isFallbackMode && (
            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-500 border-orange-500">
              Fallback
            </Badge>
          )}
        </h3>
        <div className="flex gap-1">
          {isCameraOn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFaceMesh(!showFaceMesh)}
              className="h-6 px-2 text-xs"
              title={showFaceMesh ? "Hide mesh" : "Show mesh"}
            >
              {showFaceMesh ? '◉' : '○'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0"
          >
            {isMinimized ? '+' : '-'}
          </Button>
          {isCameraOn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={stopCamera}
              className="h-6 w-6 p-0 text-destructive"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Camera off state - only show when minimized is false AND camera is off */}
      {!isMinimized && !isCameraOn && (
        <div className="text-center py-4 px-2 bg-muted/20 rounded-lg border border-dashed border-border">
          <p className="text-xs text-muted-foreground font-mono leading-relaxed mb-3">
            Enable camera for real-time face detection and posture analysis.
          </p>
          <Button
            onClick={startCamera}
            className="w-full border-2"
            variant="outline"
            size="sm"
            disabled={isLoadingModels}
          >
            {isLoadingModels ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading AI Models...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Enable Camera
              </>
            )}
          </Button>
          {hasPermission === false && (
            <p className="text-xs text-destructive mt-2">
              Camera access denied. Please check your browser permissions.
            </p>
          )}
        </div>
      )}

      {/* Video and metrics - Always render when camera is on, use visibility for minimize */}
      {isCameraOn && (
        <div className={isMinimized ? 'hidden' : 'space-y-3'}>
          {/* Video container - ALWAYS render video element when camera is on */}
          <div className="relative aspect-video bg-black rounded overflow-hidden min-h-[100px] sm:min-h-[120px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              width={640}
              height={480}
              className="w-full h-full object-cover block"
              style={{ transform: 'scaleX(-1)', backgroundColor: 'black' }}
            />
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Loading overlay - shown during initialization OR when video not ready */}
            {(isInitializingCamera || !isVideoReady) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {isInitializingCamera ? 'Initializing Camera...' : 'Starting video...'}
                  </p>
                  {isInitializingCamera && (
                    <p className="text-[10px] text-muted-foreground mt-1">Loading MediaPipe models</p>
                  )}
                </div>
              </div>
            )}
            
            {isVideoReady && (
              <>
                <div className="absolute top-1 sm:top-2 left-1 sm:left-2 flex gap-1">
                  {/* Only show "No Face" after warm-up period and when not analyzing */}
                  {!metrics.faceDetected && !isWarmingUp && !isAnalyzing && (
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-background/80 border-destructive/50 text-destructive px-1.5 py-0.5">
                      <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      No Face
                    </Badge>
                  )}
                  {(isAnalyzing || isWarmingUp) && (
                    <Badge variant="outline" className="text-[9px] bg-background/80 border-primary/50 text-primary px-1.5 py-0.5">
                      <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                      {isWarmingUp ? 'Starting...' : 'Analyzing...'}
                    </Badge>
                  )}
                </div>
                
                <div className="absolute top-1 sm:top-2 right-1 sm:right-2 flex gap-1">
                  {/* Confidence Status Badge */}
                  {confidenceStatus && (
                    <Badge 
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0.5 ${
                        confidenceStatus === 'PASS' 
                          ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                          : 'bg-destructive/20 border-destructive/50 text-destructive'
                      }`}
                    >
                      {confidenceStatus === 'PASS' ? (
                        <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                      ) : (
                        <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                      )}
                      {confidenceStatus}
                    </Badge>
                  )}
                  {metrics.frameConfidence > 0 && (
                    <Badge 
                      variant="outline"
                      className="text-[9px] bg-background/80 px-1.5 py-0.5"
                    >
                      {Math.round(metrics.frameConfidence * 100)}%
                    </Badge>
                  )}
                  <Badge 
                    className={`${getScoreBg(metrics.overallScore)} text-white text-[9px] sm:text-xs px-1.5 py-0.5`}
                  >
                    {metrics.faceDetected ? `${metrics.overallScore}%` : '--'}
                  </Badge>
                </div>

                {!metrics.faceDetected && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-1.5 sm:p-2">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center">
                      Position your face in frame • Ensure good lighting
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {metrics.faceDetected && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Posture
                </span>
                <span className={`font-bold ${getScoreColor(metrics.postureScore)}`}>
                  {hasBackendData 
                    ? `${metrics.postureScore}%` 
                    : (isAnalyzing || isWarmingUp ? '...' : 'N/A')}
                </span>
              </div>
              <Progress value={hasBackendData ? metrics.postureScore : 0} className="h-1.5" />
              
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Eye Contact
                </span>
                <span className={`font-bold ${getScoreColor(metrics.eyeContactScore)}`}>
                  {hasBackendData 
                    ? `${metrics.eyeContactScore}%` 
                    : (isAnalyzing || isWarmingUp ? '...' : 'N/A')}
                </span>
              </div>
              <Progress value={hasBackendData ? metrics.eyeContactScore : 0} className="h-1.5" />
              
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  😊 Expression
                </span>
                <span className={`font-bold ${getScoreColor(metrics.expressionScore)}`}>
                  {hasBackendData 
                    ? `${metrics.expressionScore}%` 
                    : (isAnalyzing || isWarmingUp ? '...' : 'N/A')}
                </span>
              </div>
              <Progress value={hasBackendData ? metrics.expressionScore : 0} className="h-1.5" />
              
              {/* Additional metrics from backend */}
              {hasBackendData && metrics.attentionPercent !== null && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>Attention</span>
                  <span>{Math.round(metrics.attentionPercent)}%</span>
                </div>
              )}
              {metrics.handsDetected > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Hands Visible</span>
                  <span>{metrics.handsDetected}</span>
                </div>
              )}
            </div>
          )}

          {isAudioActive && isUserMicActive && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <Mic className={`w-3 h-3 ${audioMetrics.isSpeaking ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                  Your Voice
                </span>
                <Badge variant={audioMetrics.isSpeaking ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                  {audioMetrics.isSpeaking ? 'Speaking' : 'Silent'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-3 h-3 text-muted-foreground" />
                <Progress value={audioMetrics.volume * 100} className="h-1.5 flex-1" />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Pauses: {audioMetrics.pauseCount}</span>
                <span>Speaking: {Math.round(audioMetrics.totalSpeakingTime)}s</span>
              </div>
            </div>
          )}

          {metrics.tips.length > 0 && (
            <div className="text-xs space-y-1 pt-2 border-t border-border">
              {metrics.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-1 text-muted-foreground">
                  <span>•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default VideoMonitor;
