// External Video Analyzer - Direct Backend Integration
// Calls Render backend directly (no Supabase proxy) to avoid timeout issues
// Backend has 60-90s cold start on free tier - handled gracefully

const BACKEND_URL = 'https://video-analyzer-gd-buddy.onrender.com';
const API_KEY = 'vb_analysis_jLqPYbhOWY84J3RHpYePLMONkVfoX9gk5w9nATPUkZA'; // Working API key

export interface ExternalVideoResponse {
  frame: number;
  frame_confidence: number;
  confidence_status: 'PASS' | 'FAIL';
  attention: number;
  head_movement: number;
  shoulder_tilt: number;
  hand_activity: number;
  hands_detected: number;
  timestamp: number;
  success: boolean;
  warnings: string[];
  backend_unreachable?: boolean;
}

export interface ExternalAnalyzerState {
  isAnalyzing: boolean;
  lastError: string | null;
  frameCount: number;
  isWarmingUp: boolean;
  backendReady: boolean;
  consecutiveFailures: number;
}

class ExternalVideoAnalyzer {
  private state: ExternalAnalyzerState = {
    isAnalyzing: false,
    lastError: null,
    frameCount: 0,
    isWarmingUp: true,
    backendReady: false,
    consecutiveFailures: 0
  };
  
  private lastRequestTime = 0;
  private minInterval = 500; // 500ms between requests (2 FPS)
  private lastValidResponse: ExternalVideoResponse | null = null;
  private wakeupSent = false;

  constructor() {
    // Fire-and-forget wake-up on instantiation
    this.wakeBackend();
  }

  /**
   * Wake up the Render backend (fire-and-forget)
   * Cold starts take 60-90 seconds on free tier
   */
  private async wakeBackend(): Promise<void> {
    if (this.wakeupSent) return;
    this.wakeupSent = true;
    
    console.log('[Analyzer] Sending wake-up ping to backend...');
    
    try {
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });
      
      if (response.ok) {
        console.log('[Analyzer] Backend is awake and ready');
        this.state.isWarmingUp = false;
        this.state.backendReady = true;
      }
    } catch (error) {
      console.log('[Analyzer] Backend warming up (cold start expected)...');
      // Will retry on next analysis attempt
    }
  }

  /**
   * Analyze a video frame - calls backend directly (non-blocking)
   * Returns null if throttled or on error (preserves last metrics)
   */
  async analyzeFrame(frameBase64: string): Promise<ExternalVideoResponse | null> {
    const now = Date.now();
    
    // Throttle requests
    if (now - this.lastRequestTime < this.minInterval) {
      return null; // Return null, caller should use cached metrics
    }
    this.lastRequestTime = now;
    
    this.state.isAnalyzing = true;
    this.state.frameCount++;
    
    // Clean base64 - remove data URL prefix if present
    let cleanBase64 = frameBase64;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    try {
      console.log(`[Analyzer] Frame #${this.state.frameCount} - calling backend directly`);
      
      // Build the EXACT payload the backend expects
      const payload = { image: cleanBase64 };
      
      // Log payload structure for debugging (not the full image)
      console.log('[Analyzer] Payload:', { 
        keys: Object.keys(payload), 
        imageLength: cleanBase64.length 
      });

      const response = await fetch(`${BACKEND_URL}/analyze/base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Analyzer] Backend error ${response.status}:`, errorText);
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json() as ExternalVideoResponse;
      
      // Success - update state
      this.state.consecutiveFailures = 0;
      this.state.isWarmingUp = false;
      this.state.backendReady = true;
      this.state.lastError = null;
      this.state.isAnalyzing = false;
      
      // Store last valid response for metric preservation
      this.lastValidResponse = { ...data, success: true };
      
      console.log('[Analyzer] Success:', {
        attention: data.attention,
        shoulder_tilt: data.shoulder_tilt,
        confidence: data.frame_confidence
      });
      
      return this.lastValidResponse;
      
    } catch (error) {
      this.state.isAnalyzing = false;
      this.state.consecutiveFailures++;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.state.lastError = errorMessage;
      
      // Check if this looks like a cold start timeout
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        this.state.isWarmingUp = true;
        this.state.backendReady = false;
        console.log('[Analyzer] Backend appears to be in cold start...');
        
        // Retry wake-up
        this.wakeupSent = false;
        this.wakeBackend();
      }
      
      console.error(`[Analyzer] Error (${this.state.consecutiveFailures}):`, errorMessage);
      
      // Return null - caller should preserve last metrics
      return null;
    }
  }

  /**
   * Get last valid response for metric preservation
   */
  getLastValidResponse(): ExternalVideoResponse | null {
    return this.lastValidResponse;
  }

  /**
   * Check if backend is warming up (cold start)
   */
  isBackendWarmingUp(): boolean {
    return this.state.isWarmingUp;
  }

  /**
   * Check if backend is ready
   */
  isBackendReady(): boolean {
    return this.state.backendReady;
  }

  /**
   * Set polling interval in milliseconds
   */
  setPollingInterval(ms: number): void {
    this.minInterval = Math.max(100, ms);
  }

  /**
   * Get current analyzer state
   */
  getState(): ExternalAnalyzerState {
    return { ...this.state };
  }

  /**
   * Reset analyzer state
   */
  reset(): void {
    this.state = {
      isAnalyzing: false,
      lastError: null,
      frameCount: 0,
      isWarmingUp: true,
      backendReady: false,
      consecutiveFailures: 0
    };
    this.lastRequestTime = 0;
    this.lastValidResponse = null;
    this.wakeupSent = false;
    this.wakeBackend();
  }
}

// Singleton instance
let analyzerInstance: ExternalVideoAnalyzer | null = null;

export function getExternalVideoAnalyzer(): ExternalVideoAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new ExternalVideoAnalyzer();
  }
  return analyzerInstance;
}

export function resetExternalVideoAnalyzer(): void {
  if (analyzerInstance) {
    analyzerInstance.reset();
  }
}

// Initialize on module load to start wake-up early
getExternalVideoAnalyzer();
