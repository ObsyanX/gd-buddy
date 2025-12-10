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

// Accumulated metrics for session report
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
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
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
  
  const { toast } = useToast();

  // Face tracking history
  const faceHistoryRef = useRef<{
    centerX: number;
    centerY: number;
    width: number;
    height: number;
    jawAngle: number;
    eyeOpenRatio: number;
  }[]>([]);

  // Accumulated metrics for session
  const accumulatedRef = useRef<AccumulatedVideoMetrics>({
    postureScores: [],
    eyeContactScores: [],
    expressionScores: [],
    tips: new Set(),
    totalFrames: 0,
    facesDetected: 0
  });

  // Load face-api.js models
  const loadModels = async () => {
    if (modelsLoaded) return true;
    
    setIsLoadingModels(true);
    try {
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
        description: "Could not load face detection models. Using fallback analysis.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoadingModels(false);
    }
  };

  const startCamera = async () => {
    try {
      // Load models first
      await loadModels();
      
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
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });
      }
      
      setIsCameraOn(true);
      setHasPermission(true);
      
      toast({
        title: "Camera enabled",
        description: "Face detection is now active",
      });
      
      // Start analysis loop
      startAnalysis();
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsCameraOn(false);
  };

  // Analyze frame with face-api.js
  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraOn) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(() => {
        setTimeout(analyzeFrame, 100);
      });
      return;
    }

    accumulatedRef.current.totalFrames++;

    try {
      // Detect face with landmarks and expressions
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5
        }))
        .withFaceLandmarks()
        .withFaceExpressions();

      // Set up canvas dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (detection && ctx) {
        accumulatedRef.current.facesDetected++;
        
        // Draw face detection overlay on canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw detection box (mirrored)
        const box = detection.detection.box;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - box.x - box.width, box.y, box.width, box.height);
        
        // Draw key landmarks
        const landmarks = detection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const nose = landmarks.getNose();
        const jaw = landmarks.getJawOutline();
        
        ctx.fillStyle = '#22c55e';
        [...leftEye, ...rightEye].forEach(point => {
          ctx.beginPath();
          ctx.arc(canvas.width - point.x, point.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });

        // Calculate metrics from face data
        const newMetrics = calculateMetricsFromFace(detection, canvas.width, canvas.height);
        
        // Accumulate metrics
        accumulatedRef.current.postureScores.push(newMetrics.postureScore);
        accumulatedRef.current.eyeContactScores.push(newMetrics.eyeContactScore);
        accumulatedRef.current.expressionScores.push(newMetrics.expressionScore);
        newMetrics.tips.forEach(tip => accumulatedRef.current.tips.add(tip));
        
        setMetrics(newMetrics);
        onMetricsUpdate?.(newMetrics);
      } else {
        // No face detected
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

    // Continue analysis at ~8 FPS for performance
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(analyzeFrame);
    }, 125);
  }, [isCameraOn, onMetricsUpdate]);

  const calculateMetricsFromFace = (
    detection: faceapi.WithFaceExpressions<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>>,
    canvasWidth: number,
    canvasHeight: number
  ): VideoMetrics => {
    const box = detection.detection.box;
    const landmarks = detection.landmarks;
    const expressions = detection.expressions;
    const tips: string[] = [];

    // Get face center
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;

    // Get eye landmarks for gaze estimation
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const jaw = landmarks.getJawOutline();

    // Calculate eye openness (vertical distance / horizontal distance)
    const leftEyeHeight = Math.abs(leftEye[1].y - leftEye[5].y);
    const leftEyeWidth = Math.abs(leftEye[0].x - leftEye[3].x);
    const rightEyeHeight = Math.abs(rightEye[1].y - rightEye[5].y);
    const rightEyeWidth = Math.abs(rightEye[0].x - rightEye[3].x);
    const eyeOpenRatio = ((leftEyeHeight / leftEyeWidth) + (rightEyeHeight / rightEyeWidth)) / 2;

    // Calculate head tilt using jaw landmarks
    const jawLeft = jaw[0];
    const jawRight = jaw[16];
    const jawAngle = Math.atan2(jawRight.y - jawLeft.y, jawRight.x - jawLeft.x) * (180 / Math.PI);

    // Track face position history
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

    // ===== POSTURE ANALYSIS =====
    let postureScore = 100;
    
    // Check horizontal centering
    const centerXRatio = faceCenterX / canvasWidth;
    if (Math.abs(centerXRatio - 0.5) > 0.25) {
      postureScore -= 30;
      tips.push('Center yourself in the frame');
    } else if (Math.abs(centerXRatio - 0.5) > 0.15) {
      postureScore -= 15;
    }
    
    // Check vertical position
    const centerYRatio = faceCenterY / canvasHeight;
    if (centerYRatio < 0.15 || centerYRatio > 0.65) {
      postureScore -= 25;
      tips.push('Adjust camera height for better framing');
    } else if (centerYRatio < 0.2 || centerYRatio > 0.55) {
      postureScore -= 10;
    }

    // Check head tilt
    if (Math.abs(jawAngle) > 15) {
      postureScore -= 20;
      tips.push('Keep your head straight');
    } else if (Math.abs(jawAngle) > 8) {
      postureScore -= 10;
    }

    // Check for head stability
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

    // ===== EYE CONTACT ANALYSIS =====
    let eyeContactScore = 100;
    
    // Eye openness check (closed eyes = not looking at camera)
    if (eyeOpenRatio < 0.15) {
      eyeContactScore -= 40;
      tips.push('Keep your eyes open and look at the camera');
    } else if (eyeOpenRatio < 0.2) {
      eyeContactScore -= 20;
    }

    // Face direction (centered = likely looking at camera)
    if (Math.abs(centerXRatio - 0.5) > 0.2) {
      eyeContactScore -= 30;
      tips.push('Look directly at the camera');
    } else if (Math.abs(centerXRatio - 0.5) > 0.1) {
      eyeContactScore -= 15;
    }

    // Check for consistent gaze
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

    // ===== EXPRESSION ANALYSIS =====
    let expressionScore = 100;
    let facialExpression: 'confident' | 'neutral' | 'nervous' = 'confident';
    
    // Get dominant expression
    const expressionEntries = Object.entries(expressions) as [string, number][];
    const sortedExpressions = expressionEntries.sort((a, b) => b[1] - a[1]);
    const dominantExpression = sortedExpressions[0];
    
    // Evaluate expression
    const neutralScore = expressions.neutral || 0;
    const happyScore = expressions.happy || 0;
    const sadScore = expressions.sad || 0;
    const angryScore = expressions.angry || 0;
    const fearfulScore = expressions.fearful || 0;
    const disgustedScore = expressions.disgusted || 0;
    const surprisedScore = expressions.surprised || 0;

    // Confidence indicators
    if (happyScore > 0.3 || (neutralScore > 0.5 && happyScore > 0.1)) {
      expressionScore = 90 + Math.round(happyScore * 10);
      facialExpression = 'confident';
    } else if (neutralScore > 0.6) {
      expressionScore = 75;
      facialExpression = 'neutral';
    } else if (fearfulScore > 0.2 || sadScore > 0.3 || angryScore > 0.2) {
      expressionScore = 50 - Math.round((fearfulScore + sadScore) * 20);
      facialExpression = 'nervous';
      tips.push('Try to relax and maintain a confident expression');
    } else {
      expressionScore = 70;
      facialExpression = 'neutral';
    }

    // Face size check
    const faceSizeRatio = box.width / canvasWidth;
    if (faceSizeRatio < 0.15) {
      expressionScore -= 15;
      tips.push('Move closer to the camera');
    } else if (faceSizeRatio > 0.5) {
      expressionScore -= 10;
      tips.push('Move back slightly from the camera');
    }

    expressionScore = Math.max(0, Math.min(100, expressionScore));

    // Overall score
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

  const startAnalysis = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    analyzeFrame();
  };

  // Get accumulated session metrics
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

  // Expose session metrics for parent component
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
    <Card className={`border-4 border-border transition-all ${isMinimized ? 'p-2' : 'p-4'}`}>
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
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-mono">
                Enable camera for real-time face detection and analysis.
              </p>
              <Button
                onClick={startCamera}
                className="w-full border-2"
                variant="outline"
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
              {/* Video preview with overlay */}
              <div className="relative aspect-video bg-muted rounded overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {/* Canvas overlay for face detection visualization */}
                <canvas 
                  ref={canvasRef} 
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {/* Overall score overlay */}
                <div className="absolute top-2 right-2">
                  <Badge 
                    className={`${getScoreBg(metrics.overallScore)} text-white`}
                  >
                    {metrics.faceDetected ? `${metrics.overallScore}%` : 'No Face'}
                  </Badge>
                </div>

                {/* Face detection indicator */}
                {!metrics.faceDetected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <div className="text-center p-4">
                      <User className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-bold">No face detected</p>
                      <p className="text-xs text-muted-foreground">Position yourself in frame</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Metrics */}
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

              {/* Tips */}
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
