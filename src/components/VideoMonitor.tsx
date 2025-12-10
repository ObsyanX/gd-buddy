import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, Eye, User, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
}

// Accumulated metrics for session report
export interface AccumulatedVideoMetrics {
  postureScores: number[];
  eyeContactScores: number[];
  expressionScores: number[];
  tips: Set<string>;
}

const VideoMonitor = ({ isActive, onMetricsUpdate }: VideoMonitorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [metrics, setMetrics] = useState<VideoMetrics>({
    posture: 'good',
    postureScore: 85,
    eyeContact: 'maintained',
    eyeContactScore: 80,
    facialExpression: 'confident',
    expressionScore: 75,
    overallScore: 80,
    tips: []
  });
  const [isMinimized, setIsMinimized] = useState(false);
  
  const { toast } = useToast();

  // Face detection tracking variables
  const facePositionHistoryRef = useRef<{ x: number; y: number; width: number; height: number }[]>([]);
  const headMovementRef = useRef<number>(0);

  // Accumulated metrics for session
  const accumulatedRef = useRef<AccumulatedVideoMetrics>({
    postureScores: [],
    eyeContactScores: [],
    expressionScores: [],
    tips: new Set()
  });

  const startCamera = async () => {
    try {
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
      }
      
      setIsCameraOn(true);
      setHasPermission(true);
      
      toast({
        title: "Camera enabled",
        description: "Video monitoring is now active",
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

  // Enhanced face/posture analysis using canvas pixel analysis
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraOn) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    // Draw video frame to canvas for analysis
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Enhanced face detection using skin color detection
    let skinPixelCount = 0;
    let centerX = 0;
    let centerY = 0;
    let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;

    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Improved skin color detection (works for various skin tones)
        const isSkin = (
          r > 95 && g > 40 && b > 20 &&
          r > g && r > b &&
          Math.abs(r - g) > 15 &&
          r - g > 15 && r - b > 15
        ) || (
          // Additional skin tone detection for darker skin
          r > 60 && g > 40 && b > 30 &&
          r > g && g > b &&
          r - b > 10
        );

        if (isSkin) {
          skinPixelCount++;
          centerX += x;
          centerY += y;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (skinPixelCount > 100) {
      centerX /= skinPixelCount;
      centerY /= skinPixelCount;
      const faceWidth = maxX - minX;
      const faceHeight = maxY - minY;

      // Track face position history
      facePositionHistoryRef.current.push({ 
        x: centerX, 
        y: centerY, 
        width: faceWidth,
        height: faceHeight 
      });
      if (facePositionHistoryRef.current.length > 30) {
        facePositionHistoryRef.current.shift();
      }

      // Calculate metrics based on face position analysis
      const newMetrics = calculateMetrics(centerX, centerY, faceWidth, faceHeight, canvas.width, canvas.height);
      
      // Accumulate metrics for session report
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
        postureScore: 30,
        eyeContact: 'avoiding',
        eyeContactScore: 20,
        facialExpression: 'nervous',
        expressionScore: 30,
        overallScore: 27,
        tips: ['Face not detected - ensure you are visible in frame']
      };
      setMetrics(noFaceMetrics);
      onMetricsUpdate?.(noFaceMetrics);
    }

    // Analyze at ~10 FPS for performance
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(analyzeFrame);
    }, 100);
  }, [isCameraOn, onMetricsUpdate]);

  const calculateMetrics = (
    faceX: number, 
    faceY: number, 
    faceWidth: number,
    faceHeight: number,
    canvasWidth: number, 
    canvasHeight: number
  ): VideoMetrics => {
    const history = facePositionHistoryRef.current;
    const tips: string[] = [];

    // ===== POSTURE ANALYSIS =====
    let postureScore = 100;
    
    // Check horizontal centering
    const centerXRatio = faceX / canvasWidth;
    if (Math.abs(centerXRatio - 0.5) > 0.25) {
      postureScore -= 30;
      tips.push('Center yourself in the frame');
    } else if (Math.abs(centerXRatio - 0.5) > 0.15) {
      postureScore -= 15;
    }
    
    // Check vertical position (face should be in upper-middle)
    const centerYRatio = faceY / canvasHeight;
    if (centerYRatio < 0.15 || centerYRatio > 0.6) {
      postureScore -= 25;
      tips.push('Adjust your camera angle');
    } else if (centerYRatio < 0.2 || centerYRatio > 0.5) {
      postureScore -= 10;
    }

    // Check for head movement (stability)
    if (history.length > 10) {
      const recentPositions = history.slice(-10);
      let movement = 0;
      for (let i = 1; i < recentPositions.length; i++) {
        movement += Math.abs(recentPositions[i].x - recentPositions[i-1].x);
        movement += Math.abs(recentPositions[i].y - recentPositions[i-1].y);
      }
      headMovementRef.current = movement / 10;
      
      if (headMovementRef.current > 20) {
        postureScore -= 20;
        tips.push('Try to keep your head steady');
      } else if (headMovementRef.current > 12) {
        postureScore -= 10;
      }
    }

    // Check face aspect ratio for head tilt
    if (faceWidth > 0 && faceHeight > 0) {
      const aspectRatio = faceWidth / faceHeight;
      if (aspectRatio > 1.5 || aspectRatio < 0.6) {
        postureScore -= 15;
        tips.push('Keep your head straight');
      }
    }

    postureScore = Math.max(0, Math.min(100, postureScore));
    const posture: 'good' | 'needs_improvement' | 'poor' = 
      postureScore >= 70 ? 'good' : postureScore >= 50 ? 'needs_improvement' : 'poor';

    // ===== EYE CONTACT ANALYSIS =====
    let eyeContactScore = 100;
    
    // Face centered = likely looking at camera
    const eyeCenterDeviation = Math.abs(centerXRatio - 0.5);
    if (eyeCenterDeviation > 0.2) {
      eyeContactScore -= 40;
      tips.push('Look directly at the camera');
    } else if (eyeCenterDeviation > 0.1) {
      eyeContactScore -= 20;
    }
    
    // Steady gaze = consistent position
    if (headMovementRef.current > 15) {
      eyeContactScore -= 20;
    } else if (headMovementRef.current > 10) {
      eyeContactScore -= 10;
    }

    // Check vertical gaze (looking up or down)
    const verticalDeviation = Math.abs(centerYRatio - 0.35);
    if (verticalDeviation > 0.2) {
      eyeContactScore -= 15;
    }

    eyeContactScore = Math.max(0, Math.min(100, eyeContactScore));
    const eyeContact: 'maintained' | 'occasional' | 'avoiding' = 
      eyeContactScore >= 70 ? 'maintained' : eyeContactScore >= 50 ? 'occasional' : 'avoiding';

    // ===== EXPRESSION ANALYSIS =====
    let expressionScore = 100;
    let facialExpression: 'confident' | 'neutral' | 'nervous' = 'confident';
    
    // Check face size (too small = too far, too big = too close)
    const faceSizeRatio = faceWidth / canvasWidth;
    if (faceSizeRatio < 0.15) {
      expressionScore -= 20;
      tips.push('Move closer to the camera');
    } else if (faceSizeRatio > 0.5) {
      expressionScore -= 15;
      tips.push('Move back a little');
    }
    
    // Nervous = lots of movement
    if (headMovementRef.current > 25) {
      expressionScore -= 30;
      facialExpression = 'nervous';
    } else if (headMovementRef.current > 15) {
      expressionScore -= 15;
      facialExpression = 'neutral';
    }

    // Check for consistent face size (nervousness indicator)
    if (history.length > 10) {
      const recentWidths = history.slice(-10).map(h => h.width);
      const avgWidth = recentWidths.reduce((a, b) => a + b, 0) / recentWidths.length;
      const widthVariance = recentWidths.reduce((acc, w) => acc + Math.pow(w - avgWidth, 2), 0) / recentWidths.length;
      if (Math.sqrt(widthVariance) > 20) {
        expressionScore -= 10;
        facialExpression = facialExpression === 'confident' ? 'neutral' : facialExpression;
      }
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
      tips: tips.slice(0, 3) // Limit to 3 tips
    };
  };

  const startAnalysis = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(analyzeFrame);
  };

  // Get accumulated session metrics
  const getSessionMetrics = useCallback(() => {
    const acc = accumulatedRef.current;
    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    
    return {
      avgPostureScore: avg(acc.postureScores),
      avgEyeContactScore: avg(acc.eyeContactScores),
      avgExpressionScore: avg(acc.expressionScores),
      tips: Array.from(acc.tips)
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
    if (isCameraOn) {
      startAnalysis();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isCameraOn, analyzeFrame]);

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

  if (!isActive) return null;

  return (
    <Card className={`border-4 border-border transition-all ${isMinimized ? 'p-2' : 'p-4'}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Camera className="w-4 h-4" />
          VIDEO MONITOR
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
                Enable camera to track posture, eye contact, and expressions in real-time.
              </p>
              <Button
                onClick={startCamera}
                className="w-full border-2"
                variant="outline"
              >
                <Camera className="w-4 h-4 mr-2" />
                Enable Camera
              </Button>
              {hasPermission === false && (
                <p className="text-xs text-destructive">
                  Camera access denied. Please check your browser permissions.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Video preview */}
              <div className="relative aspect-video bg-muted rounded overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Overall score overlay */}
                <div className="absolute top-2 right-2">
                  <Badge 
                    className={`${
                      metrics.overallScore >= 70 ? 'bg-green-500' : 
                      metrics.overallScore >= 50 ? 'bg-yellow-500' : 'bg-destructive'
                    } text-white`}
                  >
                    {metrics.overallScore}%
                  </Badge>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Posture
                  </span>
                  <span className={getScoreColor(metrics.postureScore)}>
                    {metrics.postureScore}%
                  </span>
                </div>
                <Progress 
                  value={metrics.postureScore} 
                  className="h-1.5"
                />

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Eye Contact
                  </span>
                  <span className={getScoreColor(metrics.eyeContactScore)}>
                    {metrics.eyeContactScore}%
                  </span>
                </div>
                <Progress 
                  value={metrics.eyeContactScore} 
                  className="h-1.5"
                />

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    {metrics.facialExpression === 'confident' ? 
                      <CheckCircle className="w-3 h-3" /> : 
                      <AlertTriangle className="w-3 h-3" />}
                    Expression
                  </span>
                  <span className={getScoreColor(metrics.expressionScore)}>
                    {metrics.facialExpression}
                  </span>
                </div>
                <Progress 
                  value={metrics.expressionScore} 
                  className="h-1.5"
                />
              </div>

              {/* Tips */}
              {metrics.tips.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-bold mb-1">Tips:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {metrics.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
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
