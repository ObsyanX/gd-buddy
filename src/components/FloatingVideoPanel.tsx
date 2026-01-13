import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minimize2, Maximize2, X, Camera, Move } from 'lucide-react';
import VideoMonitor, { VideoMetrics } from '@/components/VideoMonitor';
import { useDraggable } from '@/hooks/useDraggable';
import { cn } from '@/lib/utils';

interface FloatingVideoPanelProps {
  sessionId?: string;
  isUserMicActive?: boolean;
  onMetricsUpdate?: (metrics: VideoMetrics) => void;
  className?: string;
}

type PanelSize = 'minimized' | 'compact' | 'normal' | 'expanded';

const FloatingVideoPanel = ({
  sessionId,
  isUserMicActive = false,
  onMetricsUpdate,
  className,
}: FloatingVideoPanelProps) => {
  const [panelSize, setPanelSize] = useState<PanelSize>('normal');
  const [isVideoActive, setIsVideoActive] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Get panel sizes based on screen
  const getPanelSizes = useCallback(() => {
    if (isMobile) {
      return {
        minimized: { width: 50, height: 50 },
        compact: { width: 140, height: 110 },
        normal: { width: 200, height: 240 },
        expanded: { width: 280, height: 340 },
      };
    }
    if (isTablet) {
      return {
        minimized: { width: 56, height: 56 },
        compact: { width: 160, height: 130 },
        normal: { width: 240, height: 280 },
        expanded: { width: 340, height: 400 },
      };
    }
    return {
      minimized: { width: 60, height: 60 },
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

  const {
    position,
    isDragging,
    handlers,
    snapToCorner,
  } = useDraggable({
    initialPosition: getInitialPosition(),
    minSize: PANEL_SIZES.compact,
    maxSize: PANEL_SIZES.expanded,
    snapZones,
    snapThreshold: 50,
    storageKey: 'floating-video-panel-position',
  });

  // Handle size toggle
  const toggleSize = useCallback(() => {
    setPanelSize(prev => {
      if (prev === 'minimized') return 'normal';
      if (prev === 'compact') return 'normal';
      if (prev === 'normal') return 'expanded';
      return 'normal';
    });
  }, []);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    setPanelSize(prev => prev === 'minimized' ? 'normal' : 'minimized');
  }, []);

  // Handle close (only stops video, doesn't hide panel)
  const handleClose = useCallback(() => {
    setIsVideoActive(false);
    setPanelSize('minimized');
  }, []);

  // Handle restore video
  const handleRestoreVideo = useCallback(() => {
    setIsVideoActive(true);
    setPanelSize('normal');
  }, []);

  const currentSize = PANEL_SIZES[panelSize];
  const isMinimized = panelSize === 'minimized';

  // Minimized state - floating camera button
  if (isMinimized || !isVideoActive) {
    return (
      <div
        className={cn(
          "fixed z-50 touch-none select-none group",
          isDragging && "cursor-grabbing",
          className
        )}
        style={{
          left: position.x,
          top: position.y,
          width: PANEL_SIZES.minimized.width,
          height: PANEL_SIZES.minimized.height,
          transition: isDragging ? 'none' : 'left 0.12s ease-out, top 0.12s ease-out',
        }}
        tabIndex={0}
        role="application"
        aria-label="Video monitor panel - minimized. Tap to expand."
        {...handlers}
      >
        <Button
          variant="default"
          size="icon"
          className={cn(
            "w-full h-full rounded-full shadow-lg border-2 border-border",
            "transition-transform hover:scale-105",
            isVideoActive ? "bg-primary" : "bg-muted"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleRestoreVideo();
          }}
        >
          <Camera className={cn("w-5 h-5 sm:w-6 sm:h-6", isVideoActive && "text-primary-foreground")} />
        </Button>
        {isVideoActive && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse border-2 border-background" />
        )}
        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {isVideoActive ? 'Expand Video' : 'Enable Video'}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 touch-none select-none group",
        isDragging && "cursor-grabbing shadow-2xl",
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
      aria-label="Video monitor panel - drag to move"
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
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-sm hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                toggleSize();
              }}
              title={panelSize === 'expanded' ? 'Shrink' : 'Expand'}
            >
              {panelSize === 'expanded' ? (
                <Minimize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              ) : (
                <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-sm hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                handleMinimize();
              }}
              title="Minimize"
            >
              <span className="text-xs font-bold leading-none">−</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-sm hover:bg-destructive/80 hover:text-destructive-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              title="Stop Video"
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
            onMetricsUpdate={onMetricsUpdate}
          />
        </div>
      </div>

      {/* Drag indicator when dragging */}
      {isDragging && (
        <div className="absolute -inset-1 border-2 border-dashed border-primary/40 rounded-xl pointer-events-none animate-pulse" />
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
