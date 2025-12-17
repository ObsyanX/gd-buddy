import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, Eye, User, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as faceapi from 'face-api.js';

interface VideoMonitorProps {
  isActive: boolean;
  onMetricsUpdate?: (metrics: VideoMetrics) => void;
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
}

export interface AccumulatedVideoMetrics {
  postureScores: number[];
  eyeContactScores: number[];
  expressionScores: number[];
  tips: Set<string>;
  totalFrames: number;
  facesDetected: number;
}

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

const VideoMonitor = ({ isActive, onMetricsUpdate }: VideoMonitorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCameraOnRef = useRef(false); // Ref for immediate access in async callbacks
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showFaceMesh, setShowFaceMesh] = useState(true);
  const [metrics, setMetrics] = useState<VideoMetrics>({
    posture: 'good',
    postureScore: 0,
    eyeContact: 'maintained',
    eyeContactScore: 0,
    facialExpression: 'neutral',
    expressionScore: 0,
    overallScore: 0,
    tips: [],
    faceDetected: false
  });
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Keep ref in sync with state
  useEffect(() => {
    isCameraOnRef.current = isCameraOn;
  }, [isCameraOn]);
  
  const { toast } = useToast();

  const faceHistoryRef = useRef<{
    centerX: number;
    centerY: number;
    width: number;
    height: number;
    jawAngle: number;
    eyeOpenRatio: number;
  }[]>([]);

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
      console.log('Loading face-api models from:', MODEL_URL);
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
      console.log('Face-api models loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading face-api models:', error);
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
    try {
      const modelsReady = await loadModels();
      if (!modelsReady) return;
      
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          video.onloadedmetadata = () => {
            console.log('Video metadata loaded:', video.videoWidth, video.videoHeight);
            video.play().then(() => {
              console.log('Video playing');
              resolve();
            }).catch(reject);
          };
          video.onerror = () => reject(new Error('Video failed to load'));
        });
        
        // Wait for video to actually have frames (with timeout)
        await new Promise<void>((resolve) => {
          let attempts = 0;
          const maxAttempts = 50; // 5 seconds max wait
          const checkReady = () => {
            attempts++;
            const video = videoRef.current;
            if (video && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
              console.log('Video ready with dimensions:', video.videoWidth, video.videoHeight);
              resolve();
            } else if (attempts >= maxAttempts) {
              console.log('Video ready check timed out, proceeding anyway');
              resolve(); // Continue even if not fully ready
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });
      }
      
      // Set ref immediately (before state) to avoid race condition with analyzeFrame
      isCameraOnRef.current = true;
      setIsCameraOn(true);
      setHasPermission(true);
      
      toast({
        title: "Camera enabled",
        description: "Face detection is now active",
      });
      
      // Start analysis after a short delay
      setTimeout(startAnalysis, 500);
    } catch (error: any) {
      console.error('Camera access error:', error);
      setHasPermission(false);
      toast({
        title: "Camera access denied",
        description: "Please enable camera permissions to use video monitoring",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    // Set ref immediately to stop any running analysis loops
    isCameraOnRef.current = false;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    setIsCameraOn(false);
  };

  const drawFaceMesh = useCallback((
    ctx: CanvasRenderingContext2D,
    detection: faceapi.WithFaceExpressions<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>>,
    canvasWidth: number
  ) => {
    const landmarks = detection.landmarks;
    const positions = landmarks.positions;
    
    // Draw all 68 facial landmarks with mesh lines
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.lineWidth = 1;

    // Draw face outline (jawline)
    const jawline = landmarks.getJawOutline();
    ctx.beginPath();
    jawline.forEach((point, i) => {
      const x = canvasWidth - point.x;
      if (i === 0) ctx.moveTo(x, point.y);
      else ctx.lineTo(x, point.y);
    });
    ctx.stroke();

    // Draw nose
    const nose = landmarks.getNose();
    ctx.beginPath();
    nose.forEach((point, i) => {
      const x = canvasWidth - point.x;
      if (i === 0) ctx.moveTo(x, point.y);
      else ctx.lineTo(x, point.y);
    });
    ctx.stroke();

    // Draw left eye outline
    const leftEye = landmarks.getLeftEye();
    ctx.beginPath();
    leftEye.forEach((point, i) => {
      const x = canvasWidth - point.x;
      if (i === 0) ctx.moveTo(x, point.y);
      else ctx.lineTo(x, point.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw right eye outline  
    const rightEye = landmarks.getRightEye();
    ctx.beginPath();
    rightEye.forEach((point, i) => {
      const x = canvasWidth - point.x;
      if (i === 0) ctx.moveTo(x, point.y);
      else ctx.lineTo(x, point.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw left eyebrow
    const leftBrow = landmarks.getLeftEyeBrow();
    ctx.beginPath();
    leftBrow.forEach((point, i) => {
      const x = canvasWidth - point.x;
      if (i === 0) ctx.moveTo(x, point.y);
      else ctx.lineTo(x, point.y);
    });
    ctx.stroke();

    // Draw right eyebrow
    const rightBrow = landmarks.getRightEyeBrow();
    ctx.beginPath();
    rightBrow.forEach((point, i) => {
      const x = canvasWidth - point.x;
      if (i === 0) ctx.moveTo(x, point.y);
      else ctx.lineTo(x, point.y);
    });
    ctx.stroke();

    // Draw mouth outline
    const mouth = landmarks.getMouth();
    ctx.beginPath();
    mouth.forEach((point, i) => {
      const x = canvasWidth - point.x;
      if (i === 0) ctx.moveTo(x, point.y);
      else ctx.lineTo(x, point.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw all landmark points
    positions.forEach(point => {
      const x = canvasWidth - point.x;
      ctx.beginPath();
      ctx.arc(x, point.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw bounding box
    const box = detection.detection.box;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasWidth - box.x - box.width, box.y, box.width, box.height);
  }, []);

  const analyzeFrame = useCallback(async () => {
    // Use ref for immediate value check (avoids stale closure issues)
    if (!videoRef.current || !canvasRef.current || !isCameraOnRef.current) {
      console.log('Analysis stopped - camera off or refs missing, isCameraOn:', isCameraOnRef.current);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video not ready, waiting...', video.readyState, video.videoWidth, video.videoHeight);
      analysisTimeoutRef.current = setTimeout(analyzeFrame, 200);
      return;
    }

    accumulatedRef.current.totalFrames++;

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.2
        }))
        .withFaceLandmarks()
        .withFaceExpressions();

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      if (detection && ctx) {
        accumulatedRef.current.facesDetected++;
        console.log('Face detected with score:', detection.detection.score);
        
        // Draw face mesh overlay
        if (showFaceMesh) {
          drawFaceMesh(ctx, detection, canvas.width);
        }

        const newMetrics = calculateMetricsFromFace(detection, canvas.width, canvas.height);
        
        accumulatedRef.current.postureScores.push(newMetrics.postureScore);
        accumulatedRef.current.eyeContactScores.push(newMetrics.eyeContactScore);
        accumulatedRef.current.expressionScores.push(newMetrics.expressionScore);
        newMetrics.tips.forEach(tip => accumulatedRef.current.tips.add(tip));
        
        setMetrics(newMetrics);
        onMetricsUpdate?.(newMetrics);
      } else {
        console.log('No face detected in frame');
        const noFaceMetrics: VideoMetrics = {
          posture: 'poor',
          postureScore: 0,
          eyeContact: 'avoiding',
          eyeContactScore: 0,
          facialExpression: 'nervous',
          expressionScore: 0,
          overallScore: 0,
          tips: ['Face not detected - ensure you are visible in frame', 'Check lighting and camera angle'],
          faceDetected: false
        };
        setMetrics(noFaceMetrics);
        onMetricsUpdate?.(noFaceMetrics);
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }

    // Continue analysis at ~5 FPS
    analysisTimeoutRef.current = setTimeout(analyzeFrame, 200);
  }, [isCameraOn, onMetricsUpdate, showFaceMesh, drawFaceMesh]);

  const calculateMetricsFromFace = (
    detection: faceapi.WithFaceExpressions<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>>,
    canvasWidth: number,
    canvasHeight: number
  ): VideoMetrics => {
    const box = detection.detection.box;
    const landmarks = detection.landmarks;
    const expressions = detection.expressions;
    const tips: string[] = [];

    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;

    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const jaw = landmarks.getJawOutline();

    const leftEyeHeight = Math.abs(leftEye[1].y - leftEye[5].y);
    const leftEyeWidth = Math.abs(leftEye[0].x - leftEye[3].x);
    const rightEyeHeight = Math.abs(rightEye[1].y - rightEye[5].y);
    const rightEyeWidth = Math.abs(rightEye[0].x - rightEye[3].x);
    const eyeOpenRatio = ((leftEyeHeight / leftEyeWidth) + (rightEyeHeight / rightEyeWidth)) / 2;

    const jawLeft = jaw[0];
    const jawRight = jaw[16];
    const jawAngle = Math.atan2(jawRight.y - jawLeft.y, jawRight.x - jawLeft.x) * (180 / Math.PI);

    faceHistoryRef.current.push({
      centerX: faceCenterX,
      centerY: faceCenterY,
      width: box.width,
      height: box.height,
      jawAngle,
      eyeOpenRatio
    });
    if (faceHistoryRef.current.length > 30) {
      faceHistoryRef.current.shift();
    }

    // POSTURE ANALYSIS
    let postureScore = 100;
    
    const centerXRatio = faceCenterX / canvasWidth;
    if (Math.abs(centerXRatio - 0.5) > 0.25) {
      postureScore -= 30;
      tips.push('Center yourself in the frame');
    } else if (Math.abs(centerXRatio - 0.5) > 0.15) {
      postureScore -= 15;
    }
    
    const centerYRatio = faceCenterY / canvasHeight;
    if (centerYRatio < 0.15 || centerYRatio > 0.65) {
      postureScore -= 25;
      tips.push('Adjust camera height for better framing');
    } else if (centerYRatio < 0.2 || centerYRatio > 0.55) {
      postureScore -= 10;
    }

    if (Math.abs(jawAngle) > 15) {
      postureScore -= 20;
      tips.push('Keep your head straight');
    } else if (Math.abs(jawAngle) > 8) {
      postureScore -= 10;
    }

    if (faceHistoryRef.current.length > 10) {
      const recent = faceHistoryRef.current.slice(-10);
      let movement = 0;
      for (let i = 1; i < recent.length; i++) {
        movement += Math.abs(recent[i].centerX - recent[i-1].centerX);
        movement += Math.abs(recent[i].centerY - recent[i-1].centerY);
      }
      const avgMovement = movement / 10;
      
      if (avgMovement > 15) {
        postureScore -= 20;
        tips.push('Try to keep your head steady');
      } else if (avgMovement > 8) {
        postureScore -= 10;
      }
    }

    postureScore = Math.max(0, Math.min(100, postureScore));
    const posture: 'good' | 'needs_improvement' | 'poor' = 
      postureScore >= 70 ? 'good' : postureScore >= 50 ? 'needs_improvement' : 'poor';

    // EYE CONTACT ANALYSIS
    let eyeContactScore = 100;
    
    if (eyeOpenRatio < 0.15) {
      eyeContactScore -= 40;
      tips.push('Keep your eyes open and look at the camera');
    } else if (eyeOpenRatio < 0.2) {
      eyeContactScore -= 20;
    }

    if (Math.abs(centerXRatio - 0.5) > 0.2) {
      eyeContactScore -= 30;
      tips.push('Look directly at the camera');
    } else if (Math.abs(centerXRatio - 0.5) > 0.1) {
      eyeContactScore -= 15;
    }

    if (faceHistoryRef.current.length > 10) {
      const recentAngles = faceHistoryRef.current.slice(-10).map(f => f.jawAngle);
      const angleVariance = recentAngles.reduce((acc, a) => {
        const avg = recentAngles.reduce((s, v) => s + v, 0) / recentAngles.length;
        return acc + Math.pow(a - avg, 2);
      }, 0) / recentAngles.length;
      
      if (angleVariance > 50) {
        eyeContactScore -= 15;
      }
    }

    eyeContactScore = Math.max(0, Math.min(100, eyeContactScore));
    const eyeContact: 'maintained' | 'occasional' | 'avoiding' = 
      eyeContactScore >= 70 ? 'maintained' : eyeContactScore >= 50 ? 'occasional' : 'avoiding';

    // EXPRESSION ANALYSIS
    let expressionScore = 100;
    let facialExpression: 'confident' | 'neutral' | 'nervous' = 'confident';
    
    const neutralScore = expressions.neutral || 0;
    const happyScore = expressions.happy || 0;
    const sadScore = expressions.sad || 0;
    const fearfulScore = expressions.fearful || 0;

    if (happyScore > 0.3 || (neutralScore > 0.5 && happyScore > 0.1)) {
      expressionScore = 90 + Math.round(happyScore * 10);
      facialExpression = 'confident';
    } else if (neutralScore > 0.6) {
      expressionScore = 75;
      facialExpression = 'neutral';
    } else if (fearfulScore > 0.2 || sadScore > 0.3) {
      expressionScore = 50 - Math.round((fearfulScore + sadScore) * 20);
      facialExpression = 'nervous';
      tips.push('Try to relax and maintain a confident expression');
    } else {
      expressionScore = 70;
      facialExpression = 'neutral';
    }

    const faceSizeRatio = box.width / canvasWidth;
    if (faceSizeRatio < 0.15) {
      expressionScore -= 15;
      tips.push('Move closer to the camera');
    } else if (faceSizeRatio > 0.5) {
      expressionScore -= 10;
      tips.push('Move back slightly from the camera');
    }

    expressionScore = Math.max(0, Math.min(100, expressionScore));
    const overallScore = Math.round((postureScore + eyeContactScore + expressionScore) / 3);

    return {
      posture,
      postureScore: Math.round(postureScore),
      eyeContact,
      eyeContactScore: Math.round(eyeContactScore),
      facialExpression,
      expressionScore: Math.round(expressionScore),
      overallScore,
      tips: tips.slice(0, 3),
      faceDetected: true
    };
  };

  const startAnalysis = useCallback(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    console.log('Starting face analysis...');
    analyzeFrame();
  }, [analyzeFrame]);

  const getSessionMetrics = useCallback(() => {
    const acc = accumulatedRef.current;
    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    
    return {
      avgPostureScore: avg(acc.postureScores),
      avgEyeContactScore: avg(acc.eyeContactScores),
      avgExpressionScore: avg(acc.expressionScores),
      tips: Array.from(acc.tips),
      faceDetectionRate: acc.totalFrames > 0 ? Math.round((acc.facesDetected / acc.totalFrames) * 100) : 0
    };
  }, []);

  useEffect(() => {
    (window as any).__getVideoSessionMetrics = getSessionMetrics;
    return () => {
      delete (window as any).__getVideoSessionMetrics;
    };
  }, [getSessionMetrics]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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

      {!isMinimized && (
        <>
          {!isCameraOn ? (
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
                <p className="text-xs text-destructive">
                  Camera access denied. Please check your browser permissions.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative aspect-video bg-black rounded overflow-hidden min-h-[120px]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {/* Status badges - top corners */}
                <div className="absolute top-2 left-2">
                  {!metrics.faceDetected && (
                    <Badge variant="outline" className="text-[10px] bg-background/80 border-destructive/50 text-destructive">
                      <User className="w-3 h-3 mr-1" />
                      No Face
                    </Badge>
                  )}
                </div>
                
                <div className="absolute top-2 right-2">
                  <Badge 
                    className={`${getScoreBg(metrics.overallScore)} text-white text-xs`}
                  >
                    {metrics.faceDetected ? `${metrics.overallScore}%` : '--'}
                  </Badge>
                </div>

                {/* Subtle hint at bottom when no face - doesn't block video */}
                {!metrics.faceDetected && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-2">
                    <p className="text-[10px] text-muted-foreground text-center">
                      Position your face in frame • Ensure good lighting
                    </p>
                  </div>
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
                      {metrics.postureScore}%
                    </span>
                  </div>
                  <Progress value={metrics.postureScore} className="h-1.5" />
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Eye Contact
                    </span>
                    <span className={`font-bold ${getScoreColor(metrics.eyeContactScore)}`}>
                      {metrics.eyeContactScore}%
                    </span>
                  </div>
                  <Progress value={metrics.eyeContactScore} className="h-1.5" />
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      😊 Expression
                    </span>
                    <span className={`font-bold ${getScoreColor(metrics.expressionScore)}`}>
                      {metrics.expressionScore}%
                    </span>
                  </div>
                  <Progress value={metrics.expressionScore} className="h-1.5" />
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
        </>
      )}
    </Card>
  );
};

export default VideoMonitor;
