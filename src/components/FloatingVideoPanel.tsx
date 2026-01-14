import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Maximize2, X, Camera, Move, Eye, Activity, User } from 'lucide-react';
import VideoMonitor, { VideoMetrics } from '@/components/VideoMonitor';
import { useDraggable } from '@/hooks/useDraggable';
import { cn } from '@/lib/utils';

interface FloatingVideoPanelProps {
  sessionId?: string;
  isUserMicActive?: boolean;
  onMetricsUpdate?: (metrics: VideoMetrics) => void;
  className?: string;
}

type PanelSize = 'pip' | 'compact' | 'normal' | 'expanded';

// Persist panel state to session storage
const PANEL_STATE_KEY = 'floating-video-panel-state';

interface PanelState {
  size: PanelSize;
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
  return { size: 'normal', isVideoActive: true };
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
  const [panelSize, setPanelSize] = useState<PanelSize>(initialState.size);
  const [isVideoActive, setIsVideoActive] = useState(initialState.isVideoActive);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<VideoMetrics | null>(null);

  // Persist state changes
  useEffect(() => {
    savePanelState({ size: panelSize, isVideoActive });
  }, [panelSize, isVideoActive]);

  // Get panel sizes based on screen
  const getPanelSizes = useCallback(() => {
    if (isMobile) {
      return {
        pip: { width: 100, height: 80 },
        compact: { width: 140, height: 110 },
        normal: { width: 200, height: 240 },
        expanded: { width: 280, height: 340 },
      };
    }
    if (isTablet) {
      return {
        pip: { width: 120, height: 90 },
        compact: { width: 160, height: 130 },
        normal: { width: 240, height: 280 },
        expanded: { width: 340, height: 400 },
      };
    }
    return {
      pip: { width: 140, height: 100 },
      compact: { width: 180, height: 140 },
      normal: { width: 300, height: 360 },
      expanded: { width: 420, height: 500 },
    };
  }, [isMobile, isTablet]);

  const PANEL_SIZES = getPanelSizes();

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
    const currentSize = PANEL_SIZES[panelSize];
    const maxX = window.innerWidth - currentSize.width - padding;
    const maxY = window.innerHeight - currentSize.height - padding - (isMobile ? 100 : 60);
    
    return [
      { id: 'top-right', x: maxX, y: padding + 60, threshold: 50 },
      { id: 'bottom-right', x: maxX, y: maxY, threshold: 50 },
      { id: 'bottom-left', x: padding, y: maxY, threshold: 50 },
      { id: 'top-left', x: padding, y: padding + 60, threshold: 50 },
    ];
  }, [panelSize, isMobile, PANEL_SIZES]);

  // Get initial position based on device
  const getInitialPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    
    const padding = isMobile ? 8 : 16;
    const currentSize = PANEL_SIZES[panelSize];
    
    // Default to bottom-right
    return {
      x: window.innerWidth - currentSize.width - padding,
      y: window.innerHeight - currentSize.height - padding - (isMobile ? 120 : 80),
    };
  }, [panelSize, isMobile, PANEL_SIZES]);

  // Handle minimize via swipe down
  const handleSwipeDown = useCallback(() => {
    if (panelSize !== 'pip') {
      setPanelSize('pip');
    }
  }, [panelSize]);

  // Handle expand via swipe up
  const handleSwipeUp = useCallback(() => {
    if (panelSize === 'pip') {
      setPanelSize('normal');
    } else if (panelSize === 'compact') {
      setPanelSize('normal');
    } else if (panelSize === 'normal') {
      setPanelSize('expanded');
    }
  }, [panelSize]);

  const {
    position,
    isDragging,
    isSwiping,
    handlers,
    snapToCorner,
  } = useDraggable({
    initialPosition: getInitialPosition(),
    minSize: PANEL_SIZES.pip,
    maxSize: PANEL_SIZES.expanded,
    snapZones,
    snapThreshold: 50,
    storageKey: 'floating-video-panel-position',
    enableSwipeGestures: true,
    swipeThreshold: 60,
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
  });

  // Handle size toggle
  const toggleSize = useCallback(() => {
    setPanelSize(prev => {
      if (prev === 'pip') return 'normal';
      if (prev === 'compact') return 'normal';
      if (prev === 'normal') return 'expanded';
      return 'normal';
    });
  }, []);

  // Handle minimize (to PiP mode)
  const handleMinimize = useCallback(() => {
    setPanelSize(prev => prev === 'pip' ? 'normal' : 'pip');
  }, []);

  // Handle close (only stops video, doesn't hide panel)
  const handleClose = useCallback(() => {
    setIsVideoActive(false);
    setPanelSize('pip');
  }, []);

  // Handle restore video
  const handleRestoreVideo = useCallback(() => {
    setIsVideoActive(true);
    setPanelSize('normal');
  }, []);

  // Handle metrics update
  const handleMetricsUpdate = useCallback((metrics: VideoMetrics) => {
    setCurrentMetrics(metrics);
    onMetricsUpdate?.(metrics);
  }, [onMetricsUpdate]);

  const currentSize = PANEL_SIZES[panelSize];
  const isPiP = panelSize === 'pip';

  // PiP (Picture-in-Picture) minimized state
  if (isPiP && isVideoActive) {
    return (
      <div
        className={cn(
          "fixed z-50 touch-none select-none group safe-bottom safe-right",
          isDragging && "cursor-grabbing",
          isSwiping && "transition-transform duration-300",
          className
        )}
        style={{
          left: position.x,
          top: position.y,
          width: currentSize.width,
          height: currentSize.height,
          transition: isDragging ? 'none' : 'left 0.12s ease-out, top 0.12s ease-out, transform 0.12s ease-out',
        }}
        tabIndex={0}
        role="application"
        aria-label="Video monitor - minimized PiP mode. Tap to expand or swipe up."
        {...handlers}
      >
        <div className={cn(
          "relative w-full h-full rounded-lg overflow-hidden",
          "ring-2 ring-border bg-card shadow-lg",
          isDragging && "ring-primary scale-[1.02]",
          "transition-all duration-100"
        )}>
          {/* Mini video preview */}
          <div className="absolute inset-0 bg-muted/50">
            <VideoMonitor
              isActive={isVideoActive}
              sessionId={sessionId}
              isUserMicActive={isUserMicActive}
              onMetricsUpdate={handleMetricsUpdate}
            />
          </div>
          
          {/* PiP overlay with mini metrics */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
          
          {/* Mini metrics bar */}
          <div className="absolute bottom-0 left-0 right-0 p-1 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              {currentMetrics && (
                <>
                  <div className="flex items-center gap-0.5 text-micro">
                    <Eye className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className={cn(
                      "font-mono",
                      currentMetrics.eyeContactScore >= 70 ? "text-green-500" : 
                      currentMetrics.eyeContactScore >= 50 ? "text-yellow-500" : "text-red-500"
                    )}>
                      {currentMetrics.eyeContactScore}%
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 text-micro">
                    <Activity className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className={cn(
                      "font-mono",
                      currentMetrics.postureScore >= 70 ? "text-green-500" : 
                      currentMetrics.postureScore >= 50 ? "text-yellow-500" : "text-red-500"
                    )}>
                      {currentMetrics.postureScore}%
                    </span>
                  </div>
                </>
              )}
            </div>
            <Badge
              variant="default"
              className="text-[6px] px-1 py-0 h-3 bg-green-600 text-white"
            >
              LIVE
            </Badge>
          </div>
          
          {/* Expand button overlay */}
          <button
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "bg-background/30 backdrop-blur-[1px]"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setPanelSize('normal');
            }}
            aria-label="Expand video panel"
          >
            <Maximize2 className="w-5 h-5 text-foreground" />
          </button>
        </div>
        
        {/* Swipe hint on mobile */}
        {isMobile && (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-micro text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
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
          "fixed z-50 touch-none select-none group safe-bottom safe-right",
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
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-micro rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-border">
          Enable Video
        </div>
      </div>
    );
  }

  // Full panel view
  return (
    <div
      className={cn(
        "fixed z-50 touch-none select-none group safe-bottom safe-right",
        isDragging && "cursor-grabbing shadow-2xl",
        isSwiping && "transition-transform duration-300",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        width: currentSize.width,
        transition: isDragging ? 'none' : 'left 0.12s ease-out, top 0.12s ease-out, width 0.2s ease-out',
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
            {/* Expand/Shrink button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-sm hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                toggleSize();
              }}
              title={panelSize === 'expanded' ? 'Shrink' : 'Expand'}
              aria-label={panelSize === 'expanded' ? 'Shrink panel' : 'Expand panel'}
            >
              <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </Button>
            
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

        {/* Video Monitor Content */}
        <div 
          className="w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <VideoMonitor
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
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-micro text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          ↓ Swipe to minimize
        </div>
      )}

      {/* Quick snap buttons - shown on hover for desktop */}
      <div className={cn(
        "absolute -bottom-7 left-1/2 -translate-x-1/2 flex gap-0.5 sm:gap-1",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        "hidden sm:flex" // Hide on mobile
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

export default FloatingVideoPanel;
