import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, CameraOff, Eye, User, AlertTriangle, CheckCircle, X } from 'lucide-react';
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
  const facePositionHistoryRef = useRef<{ x: number; y: number; width: number }[]>([]);
  const headMovementRef = useRef<number>(0);
  const eyeLookingAtCameraRef = useRef<number>(0);

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

  // Simplified face/posture analysis using canvas pixel analysis
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

    // Simple face detection using skin color detection
    let skinPixelCount = 0;
    let totalPixels = 0;
    let centerX = 0;
    let centerY = 0;
    let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;

    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Skin color detection (simplified)
        if (r > 95 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 15 &&
            r - g > 15 && r - b > 15) {
          skinPixelCount++;
          centerX += x;
          centerY += y;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
        totalPixels++;
      }
    }

    if (skinPixelCount > 100) {
      centerX /= skinPixelCount;
      centerY /= skinPixelCount;
      const faceWidth = maxX - minX;

      // Track face position history
      facePositionHistoryRef.current.push({ x: centerX, y: centerY, width: faceWidth });
      if (facePositionHistoryRef.current.length > 30) {
        facePositionHistoryRef.current.shift();
      }

      // Calculate metrics based on face position analysis
      const newMetrics = calculateMetrics(centerX, centerY, faceWidth, canvas.width, canvas.height);
      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);
    }

    animationRef.current = requestAnimationFrame(analyzeFrame);
  }, [isCameraOn, onMetricsUpdate]);

  const calculateMetrics = (
    faceX: number, 
    faceY: number, 
    faceWidth: number,
    canvasWidth: number, 
    canvasHeight: number
  ): VideoMetrics => {
    const history = facePositionHistoryRef.current;
    const tips: string[] = [];

    // Posture analysis - check if face is centered and at good height
    const centerXRatio = faceX / canvasWidth;
    const centerYRatio = faceY / canvasHeight;
    
    let postureScore = 100;
    let posture: 'good' | 'needs_improvement' | 'poor' = 'good';
    
    // Check horizontal centering
    if (Math.abs(centerXRatio - 0.5) > 0.25) {
      postureScore -= 30;
      tips.push('Center yourself in the frame');
    } else if (Math.abs(centerXRatio - 0.5) > 0.15) {
      postureScore -= 15;
    }
    
    // Check vertical position (face should be in upper-middle)
    if (centerYRatio < 0.2 || centerYRatio > 0.6) {
      postureScore -= 25;
      tips.push('Adjust your camera angle');
    } else if (centerYRatio < 0.25 || centerYRatio > 0.5) {
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
      }
    }

    postureScore = Math.max(0, Math.min(100, postureScore));
    posture = postureScore >= 70 ? 'good' : postureScore >= 50 ? 'needs_improvement' : 'poor';

    // Eye contact analysis - based on face being centered and stable
    let eyeContactScore = 100;
    let eyeContact: 'maintained' | 'occasional' | 'avoiding' = 'maintained';
    
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
    }

    eyeContactScore = Math.max(0, Math.min(100, eyeContactScore));
    eyeContact = eyeContactScore >= 70 ? 'maintained' : eyeContactScore >= 50 ? 'occasional' : 'avoiding';

    // Expression analysis - based on face size and stability (confident = stable, appropriate size)
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

  const getProgressColor = (score: number) => {
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