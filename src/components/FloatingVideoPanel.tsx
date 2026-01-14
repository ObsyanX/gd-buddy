import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Maximize2, X, Camera, Move, Eye, Activity } from 'lucide-react';
import { useDraggable } from '@/hooks/useDraggable';
import { cn } from '@/lib/utils';

interface FloatingVideoPanelProps {
  sessionId?: string;
  isUserMicActive?: boolean;
  onMetricsUpdate?: (metrics: VideoMetrics) => void;
  className?: string;
}

// VideoMetrics interface - matches VideoMonitor export
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
  attentionPercent: number | null;
  headMovement: number | null;
  shoulderTilt: number | null;
  handActivity: number | null;
  handsDetected: number;
  frameConfidence: number;
}

type ViewMode = 'FULL_VIEW' | 'MINIMIZED_FLOATING';

// Persist panel state to session storage
const PANEL_STATE_KEY = 'floating-video-panel-state';

interface PanelState {
  viewMode: ViewMode;
  isVideoActive: boolean;
}

const loadPanelState = (): PanelState => {
  try {
    const saved = sessionStorage.getItem(PANEL_STATE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load panel state:', e);
  }
  return { viewMode: 'FULL_VIEW', isVideoActive: true };
};

const savePanelState = (state: PanelState) => {
  try {
    sessionStorage.setItem(PANEL_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save panel state:', e);
  }
};

const FloatingVideoPanel = ({
  sessionId,
  isUserMicActive = false,
  onMetricsUpdate,
  className,
}: FloatingVideoPanelProps) => {
  const initialState = loadPanelState();
  const [viewMode, setViewMode] = useState<ViewMode>(initialState.viewMode);
  const [isVideoActive, setIsVideoActive] = useState(initialState.isVideoActive);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<VideoMetrics | null>(null);
  const [hasBackendData, setHasBackendData] = useState(false);
  
  // Video refs for persistent stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Persist state changes
  useEffect(() => {
    savePanelState({ viewMode, isVideoActive });
  }, [viewMode, isVideoActive]);

  // Get panel sizes based on screen and view mode
  const getPanelSizes = useCallback(() => {
    if (viewMode === 'MINIMIZED_FLOATING') {
      // Smaller PiP sizes
      if (isMobile) return { width: 160, height: 120 };
      if (isTablet) return { width: 200, height: 150 };
      return { width: 240, height: 180 };
    }
    // Full view sizes
    if (isMobile) return { width: 240, height: 340 };
    if (isTablet) return { width: 300, height: 420 };
    return { width: 340, height: 480 };
  }, [isMobile, isTablet, viewMode]);

  const currentSize = getPanelSizes();

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 600);
      setIsTablet(width >= 600 && width < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Calculate snap zones based on screen size
  const snapZones = useMemo(() => {
    if (typeof window === 'undefined') return [];
    
    const padding = isMobile ? 8 : 16;
    const size = getPanelSizes();
    const maxX = window.innerWidth - size.width - padding;
    const maxY = window.innerHeight - size.height - padding - (isMobile ? 100 : 60);
    
    return [
      { id: 'top-right', x: maxX, y: padding + 60, threshold: 50 },
      { id: 'bottom-right', x: maxX, y: maxY, threshold: 50 },
      { id: 'bottom-left', x: padding, y: maxY, threshold: 50 },
      { id: 'top-left', x: padding, y: padding + 60, threshold: 50 },
    ];
  }, [isMobile, viewMode, getPanelSizes]);

  // Get initial position based on device
  const getInitialPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    
    const padding = isMobile ? 8 : 16;
    const size = getPanelSizes();
    
    // Default to bottom-right
    return {
      x: window.innerWidth - size.width - padding,
      y: window.innerHeight - size.height - padding - (isMobile ? 120 : 80),
    };
  }, [isMobile, getPanelSizes]);

  // Handle minimize via swipe down
  const handleSwipeDown = useCallback(() => {
    if (viewMode === 'FULL_VIEW') {
      setViewMode('MINIMIZED_FLOATING');
    }
  }, [viewMode]);

  // Handle expand via swipe up
  const handleSwipeUp = useCallback(() => {
    if (viewMode === 'MINIMIZED_FLOATING') {
      setViewMode('FULL_VIEW');
    }
  }, [viewMode]);

  const {
    position,
    isDragging,
    isSwiping,
    handlers,
    snapToCorner,
  } = useDraggable({
    initialPosition: getInitialPosition(),
    minSize: { width: 160, height: 120 },
    maxSize: { width: 400, height: 550 },
    snapZones,
    snapThreshold: 50,
    storageKey: 'floating-video-panel-position',
    enableSwipeGestures: true,
    swipeThreshold: 60,
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
  });

  // Handle minimize toggle (between FULL_VIEW and MINIMIZED_FLOATING)
  const handleMinimize = useCallback(() => {
    setViewMode(prev => prev === 'MINIMIZED_FLOATING' ? 'FULL_VIEW' : 'MINIMIZED_FLOATING');
  }, []);

  // Handle close (only stops video on explicit action)
  const handleClose = useCallback(() => {
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsVideoActive(false);
    setViewMode('MINIMIZED_FLOATING');
  }, []);

  // Handle restore video
  const handleRestoreVideo = useCallback(() => {
    setIsVideoActive(true);
    setViewMode('FULL_VIEW');
  }, []);

  // Handle metrics update from video
  const handleMetricsUpdate = useCallback((metrics: VideoMetrics) => {
    setCurrentMetrics(metrics);
    setHasBackendData(metrics.faceDetected && metrics.postureScore > 0);
    onMetricsUpdate?.(metrics);
  }, [onMetricsUpdate]);

  const isMinimized = viewMode === 'MINIMIZED_FLOATING';

  // PiP (Picture-in-Picture) minimized state - ONLY video + mini overlay
  if (isMinimized && isVideoActive) {
    return (
      <div
        className={cn(
          "fixed z-[9999] touch-none select-none group safe-bottom safe-right",
          isDragging && "cursor-grabbing",
          isSwiping && "transition-transform duration-300",
          className
        )}
        style={{
          left: position.x,
          top: position.y,
          width: currentSize.width,
          height: currentSize.height,
          transition: isDragging ? 'none' : 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        tabIndex={0}
        role="application"
        aria-label="Video monitor - minimized PiP mode. Tap to expand or swipe up."
        {...handlers}
      >
        <div className={cn(
          "relative w-full h-full rounded-xl overflow-hidden",
          "ring-2 ring-border/50 bg-card shadow-xl",
          isDragging && "ring-primary scale-[1.02]",
          "transition-all duration-100"
        )}>
          {/* Lazy-loaded mini video component - NO metric bars */}
          <div className="absolute inset-0 bg-muted/50">
            <MiniVideoView 
              isActive={isVideoActive}
              onMetricsUpdate={handleMetricsUpdate}
            />
          </div>
          
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/40 pointer-events-none" />
          
          {/* Mini status bar - top */}
          <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
            <Badge
              variant="default"
              className="text-[8px] px-1.5 py-0 h-4 bg-green-600/90 text-white shadow-sm"
            >
              LIVE
            </Badge>
            {currentMetrics?.faceDetected && (
              <Badge 
                variant="outline"
                className="text-[8px] px-1.5 py-0 h-4 bg-background/80 shadow-sm"
              >
                {currentMetrics.overallScore}%
              </Badge>
            )}
          </div>
          
          {/* Mini metrics bar - bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-1.5 flex items-center justify-between pointer-events-none">
            {hasBackendData && currentMetrics ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 text-[9px]">
                  <Eye className="w-2.5 h-2.5 text-muted-foreground/80" />
                  <span className={cn(
                    "font-mono font-medium",
                    currentMetrics.eyeContactScore >= 70 ? "text-green-400" : 
                    currentMetrics.eyeContactScore >= 50 ? "text-yellow-400" : "text-red-400"
                  )}>
                    {currentMetrics.eyeContactScore}%
                  </span>
                </div>
                <div className="flex items-center gap-0.5 text-[9px]">
                  <Activity className="w-2.5 h-2.5 text-muted-foreground/80" />
                  <span className={cn(
                    "font-mono font-medium",
                    currentMetrics.postureScore >= 70 ? "text-green-400" : 
                    currentMetrics.postureScore >= 50 ? "text-yellow-400" : "text-red-400"
                  )}>
                    {currentMetrics.postureScore}%
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-[9px] text-muted-foreground">Detecting...</span>
            )}
          </div>
          
          {/* Expand button overlay - appears on hover/tap */}
          <button
            className={cn(
              "absolute inset-0 flex items-center justify-center pointer-events-auto",
              "opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200",
              "bg-background/30 backdrop-blur-[2px]"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setViewMode('FULL_VIEW');
            }}
            aria-label="Expand video panel"
          >
            <div className="bg-background/90 rounded-full p-2 shadow-lg">
              <Maximize2 className="w-5 h-5 text-foreground" />
            </div>
          </button>
        </div>
        
        {/* Swipe hint on mobile */}
        {isMobile && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-background/80 px-2 py-0.5 rounded-full">
            ↑ Swipe to expand
          </div>
        )}
      </div>
    );
  }

  // Inactive state - floating camera button
  if (!isVideoActive) {
    return (
      <div
        className={cn(
          "fixed z-[9999] touch-none select-none group safe-bottom safe-right",
          isDragging && "cursor-grabbing",
          className
        )}
        style={{
          left: position.x,
          top: position.y,
          width: 56,
          height: 56,
          transition: isDragging ? 'none' : 'left 0.12s ease-out, top 0.12s ease-out',
        }}
        tabIndex={0}
        role="application"
        aria-label="Video monitor - inactive. Tap to enable camera."
        {...handlers}
      >
        <Button
          variant="default"
          size="icon"
          className={cn(
            "w-full h-full rounded-full shadow-lg border-2 border-border",
            "transition-transform hover:scale-105 active:scale-95",
            "bg-muted hover:bg-muted/80"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleRestoreVideo();
          }}
        >
          <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-border">
          Enable Video
        </div>
      </div>
    );
  }

  // Full panel view - with all metrics bars
  return (
    <div
      className={cn(
        "fixed z-[9999] touch-none select-none group safe-bottom safe-right",
        isDragging && "cursor-grabbing shadow-2xl",
        isSwiping && "transition-transform duration-300",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        width: currentSize.width,
        transition: isDragging ? 'none' : 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      tabIndex={0}
      role="application"
      aria-label="Video monitor panel - drag to move, swipe down to minimize"
      aria-grabbed={isDragging}
      {...handlers}
    >
      {/* Main container with shadow and border */}
      <div className={cn(
        "relative rounded-lg overflow-hidden shadow-xl",
        "ring-1 ring-border bg-card",
        isDragging && "ring-2 ring-primary scale-[1.01]",
        "transition-shadow transition-transform duration-100"
      )}>
        {/* Drag Handle Header */}
        <div 
          className={cn(
            "h-7 sm:h-8 flex items-center justify-between px-1.5 sm:px-2 border-b border-border",
            "bg-muted/50 cursor-grab active:cursor-grabbing",
            isDragging && "bg-primary/10"
          )}
        >
          <div className="flex items-center gap-1">
            <Move className="w-3 h-3 text-muted-foreground" />
            <Badge
              variant="default"
              className={cn(
                "text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 h-3.5 sm:h-4",
                "bg-green-600 text-white animate-pulse"
              )}
            >
              LIVE
            </Badge>
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center gap-0.5">
            {/* Minimize button (to PiP) */}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-sm hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                handleMinimize();
              }}
              title="Minimize to PiP"
              aria-label="Minimize to picture-in-picture mode"
            >
              <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </Button>
            
            {/* Close button (stops video) */}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-sm hover:bg-destructive/80 hover:text-destructive-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              title="Stop Video"
              aria-label="Stop video and camera"
            >
              <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </Button>
          </div>
        </div>

        {/* Video Monitor Content - Full metrics visible */}
        <div 
          className="w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <FullVideoView
            isActive={isVideoActive}
            sessionId={sessionId}
            isUserMicActive={isUserMicActive}
            onMetricsUpdate={handleMetricsUpdate}
          />
        </div>
      </div>

      {/* Drag indicator when dragging */}
      {isDragging && (
        <div className="absolute -inset-1 border-2 border-dashed border-primary/40 rounded-xl pointer-events-none animate-pulse" />
      )}

      {/* Swipe hint for mobile */}
      {isMobile && !isDragging && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-background/80 px-2 py-0.5 rounded-full">
          ↓ Swipe to minimize
        </div>
      )}

      {/* Quick snap buttons - shown on hover for desktop */}
      <div className={cn(
        "absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-0.5 sm:gap-1",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        "hidden sm:flex"
      )}>
        {(['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const).map((corner) => (
          <Button
            key={corner}
            variant="secondary"
            size="icon"
            className="h-5 w-5 rounded-full text-[8px] bg-background/90 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              snapToCorner(corner);
            }}
            title={`Snap to ${corner.replace('-', ' ')}`}
          >
            {corner === 'bottom-right' && '↘'}
            {corner === 'bottom-left' && '↙'}
            {corner === 'top-right' && '↗'}
            {corner === 'top-left' && '↖'}
          </Button>
        ))}
      </div>
    </div>
  );
};

// MiniVideoView - Lightweight component for PiP mode (no metric bars)
const MiniVideoView = ({ 
  isActive, 
  onMetricsUpdate 
}: { 
  isActive: boolean; 
  onMetricsUpdate?: (metrics: VideoMetrics) => void;
}) => {
  // This is a lazy wrapper that imports VideoMonitor but only renders video
  // For now, we use the full VideoMonitor but could optimize later
  const VideoMonitor = React.lazy(() => import('@/components/VideoMonitor'));
  
  return (
    <React.Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
      <div className="[&_.space-y-1\.5]:hidden [&_.space-y-2]:hidden [&_[class*='pt-1.5']]:hidden [&_[class*='border-t']]:hidden">
        <VideoMonitor 
          isActive={isActive} 
          onMetricsUpdate={onMetricsUpdate}
        />
      </div>
    </React.Suspense>
  );
};

// FullVideoView - Complete VideoMonitor with all metrics
const FullVideoView = ({ 
  isActive, 
  sessionId,
  isUserMicActive,
  onMetricsUpdate 
}: { 
  isActive: boolean;
  sessionId?: string;
  isUserMicActive?: boolean;
  onMetricsUpdate?: (metrics: VideoMetrics) => void;
}) => {
  const VideoMonitor = React.lazy(() => import('@/components/VideoMonitor'));
  
  return (
    <React.Suspense fallback={<div className="w-full h-full min-h-[200px] bg-muted animate-pulse" />}>
      <VideoMonitor 
        isActive={isActive}
        sessionId={sessionId}
        isUserMicActive={isUserMicActive}
        onMetricsUpdate={onMetricsUpdate}
      />
    </React.Suspense>
  );
};

// Need to import React for lazy/Suspense
import React from 'react';

export default FloatingVideoPanel;
