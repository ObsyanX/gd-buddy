import { useState, useRef, useCallback, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface SnapZone {
  id: string;
  x: number;
  y: number;
  threshold: number;
}

interface SwipeState {
  startY: number;
  startTime: number;
  direction: 'up' | 'down' | null;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  minSize?: Size;
  maxSize?: Size;
  snapZones?: SnapZone[];
  snapThreshold?: number;
  storageKey?: string;
  enableSwipeGestures?: boolean;
  swipeThreshold?: number;
  onPositionChange?: (position: Position) => void;
  onDragStart?: () => void;
  onDragEnd?: (position: Position) => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export const useDraggable = (options: UseDraggableOptions = {}) => {
  const {
    initialPosition = { x: 0, y: 0 },
    minSize = { width: 180, height: 120 },
    maxSize = { width: 480, height: 360 },
    snapZones = [],
    snapThreshold = 40,
    storageKey = 'floating-video-position',
    enableSwipeGestures = true,
    swipeThreshold = 50,
    onPositionChange,
    onDragStart,
    onDragEnd,
    onSwipeUp,
    onSwipeDown,
  } = options;

  // Load saved position from localStorage
  const getSavedPosition = useCallback((): Position => {
    if (typeof window === 'undefined') return initialPosition;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate saved position is within bounds
        const maxX = window.innerWidth - minSize.width;
        const maxY = window.innerHeight - minSize.height;
        return {
          x: Math.min(Math.max(0, parsed.x), maxX),
          y: Math.min(Math.max(0, parsed.y), maxY),
        };
      }
    } catch (e) {
      console.warn('Failed to load saved position:', e);
    }
    return initialPosition;
  }, [initialPosition, storageKey, minSize]);

  const [position, setPosition] = useState<Position>(getSavedPosition);
  const [size, setSize] = useState<Size>(minSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  
  const elementRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });
  const positionStartRef = useRef<Position>({ x: 0, y: 0 });
  const resizeStartRef = useRef<Size>({ width: 0, height: 0 });
  const swipeRef = useRef<SwipeState>({ startY: 0, startTime: 0, direction: null });
  const dragDistanceRef = useRef<number>(0);

  // Calculate bounds based on window size
  const getBounds = useCallback((): Bounds => {
    if (typeof window === 'undefined') {
      return { minX: 0, maxX: 1000, minY: 0, maxY: 800 };
    }
    // Account for safe areas
    const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top')) || 0;
    const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom')) || 0;
    
    return {
      minX: 0,
      maxX: window.innerWidth - size.width,
      minY: safeTop,
      maxY: window.innerHeight - size.height - safeBottom,
    };
  }, [size]);

  // Clamp position within bounds
  const clampPosition = useCallback((pos: Position): Position => {
    const bounds = getBounds();
    return {
      x: Math.min(Math.max(bounds.minX, pos.x), bounds.maxX),
      y: Math.min(Math.max(bounds.minY, pos.y), bounds.maxY),
    };
  }, [getBounds]);

  // Find nearest snap zone
  const findSnapZone = useCallback((pos: Position): Position => {
    let closestZone: SnapZone | null = null;
    let closestDistance = Infinity;

    for (const zone of snapZones) {
      const distance = Math.sqrt(
        Math.pow(pos.x - zone.x, 2) + Math.pow(pos.y - zone.y, 2)
      );
      if (distance < snapThreshold && distance < closestDistance) {
        closestDistance = distance;
        closestZone = zone;
      }
    }

    if (closestZone) {
      return { x: closestZone.x, y: closestZone.y };
    }
    return pos;
  }, [snapZones, snapThreshold]);

  // Save position to localStorage
  const savePosition = useCallback((pos: Position) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch (e) {
      console.warn('Failed to save position:', e);
    }
  }, [storageKey]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (isResizing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
    dragDistanceRef.current = 0;
    
    // Initialize swipe tracking
    if (enableSwipeGestures) {
      swipeRef.current = {
        startY: e.clientY,
        startTime: Date.now(),
        direction: null,
      };
    }
    
    onDragStart?.();
  }, [position, isResizing, enableSwipeGestures, onDragStart]);

  // Handle drag move
  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    // Track total drag distance
    dragDistanceRef.current = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Detect swipe direction
    if (enableSwipeGestures && Math.abs(deltaY) > 10) {
      swipeRef.current.direction = deltaY > 0 ? 'down' : 'up';
    }
    
    const newPosition = clampPosition({
      x: positionStartRef.current.x + deltaX,
      y: positionStartRef.current.y + deltaY,
    });
    
    setPosition(newPosition);
    onPositionChange?.(newPosition);
  }, [isDragging, clampPosition, enableSwipeGestures, onPositionChange]);

  // Handle drag end
  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    
    // Check for swipe gesture
    if (enableSwipeGestures) {
      const deltaY = e.clientY - swipeRef.current.startY;
      const deltaTime = Date.now() - swipeRef.current.startTime;
      const velocity = Math.abs(deltaY) / deltaTime;
      
      // Fast swipe detection (velocity > 0.5 px/ms or distance > threshold)
      if (velocity > 0.5 || Math.abs(deltaY) > swipeThreshold) {
        if (deltaY > swipeThreshold) {
          onSwipeDown?.();
          setIsSwiping(true);
          setTimeout(() => setIsSwiping(false), 300);
        } else if (deltaY < -swipeThreshold) {
          onSwipeUp?.();
          setIsSwiping(true);
          setTimeout(() => setIsSwiping(false), 300);
        }
      }
    }
    
    // Apply snap zones
    const snappedPosition = findSnapZone(position);
    const finalPosition = clampPosition(snappedPosition);
    
    setPosition(finalPosition);
    setIsDragging(false);
    savePosition(finalPosition);
    onDragEnd?.(finalPosition);
  }, [isDragging, position, findSnapZone, clampPosition, savePosition, onDragEnd, enableSwipeGestures, swipeThreshold, onSwipeUp, onSwipeDown]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    setIsResizing(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    resizeStartRef.current = { ...size };
  }, [size]);

  // Handle resize move
  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    const newWidth = Math.min(
      Math.max(minSize.width, resizeStartRef.current.width + deltaX),
      maxSize.width
    );
    const newHeight = Math.min(
      Math.max(minSize.height, resizeStartRef.current.height + deltaY),
      maxSize.height
    );
    
    setSize({ width: newWidth, height: newHeight });
  }, [isResizing, minSize, maxSize]);

  // Handle resize end
  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    if (!isResizing) return;
    
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    
    setIsResizing(false);
  }, [isResizing]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 20 : 5;
    let newPosition = { ...position };
    
    switch (e.key) {
      case 'ArrowUp':
        newPosition.y -= step;
        break;
      case 'ArrowDown':
        newPosition.y += step;
        break;
      case 'ArrowLeft':
        newPosition.x -= step;
        break;
      case 'ArrowRight':
        newPosition.x += step;
        break;
      default:
        return;
    }
    
    e.preventDefault();
    const clamped = clampPosition(newPosition);
    setPosition(clamped);
    savePosition(clamped);
  }, [position, clampPosition, savePosition]);

  // Update position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => clampPosition(prev));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  // Handle orientation change
  useEffect(() => {
    const handleOrientationChange = () => {
      // Wait for orientation to settle
      setTimeout(() => {
        setPosition(prev => clampPosition(prev));
      }, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, [clampPosition]);

  // Snap to corner helper
  const snapToCorner = useCallback((corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    const bounds = getBounds();
    const padding = 16;
    let newPosition: Position;
    
    switch (corner) {
      case 'top-left':
        newPosition = { x: padding, y: bounds.minY + padding };
        break;
      case 'top-right':
        newPosition = { x: bounds.maxX - padding, y: bounds.minY + padding };
        break;
      case 'bottom-left':
        newPosition = { x: padding, y: bounds.maxY - padding };
        break;
      case 'bottom-right':
      default:
        newPosition = { x: bounds.maxX - padding, y: bounds.maxY - padding };
        break;
    }
    
    setPosition(newPosition);
    savePosition(newPosition);
  }, [getBounds, savePosition]);

  return {
    position,
    size,
    isDragging,
    isResizing,
    isSwiping,
    elementRef,
    handlers: {
      onPointerDown: handleDragStart,
      onPointerMove: handleDragMove,
      onPointerUp: handleDragEnd,
      onPointerCancel: handleDragEnd,
      onKeyDown: handleKeyDown,
    },
    resizeHandlers: {
      onPointerDown: handleResizeStart,
      onPointerMove: handleResizeMove,
      onPointerUp: handleResizeEnd,
      onPointerCancel: handleResizeEnd,
    },
    snapToCorner,
    setPosition: (pos: Position) => {
      const clamped = clampPosition(pos);
      setPosition(clamped);
      savePosition(clamped);
    },
    setSize,
    dragDistance: dragDistanceRef.current,
  };
};
