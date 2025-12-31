// External Video Analyzer API Client
// Connects to https://video-analyzer-gd-buddy.onrender.com

const EXTERNAL_BACKEND_URL = 'https://video-analyzer-gd-buddy.onrender.com';
const REQUEST_TIMEOUT = 5000; // 5 seconds

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
}

export interface ExternalAnalyzerState {
  isAnalyzing: boolean;
  lastError: string | null;
  frameCount: number;
}

class ExternalVideoAnalyzer {
  private state: ExternalAnalyzerState = {
    isAnalyzing: false,
    lastError: null,
    frameCount: 0
  };
  
  private lastRequestTime = 0;
  private minInterval = 500; // 500ms between requests (2 FPS)

  /**
   * Analyze a video frame using the external backend
   */
  async analyzeFrame(frameBase64: string): Promise<ExternalVideoResponse | null> {
    const now = Date.now();
    
    // Throttle requests
    if (now - this.lastRequestTime < this.minInterval) {
      return null;
    }
    this.lastRequestTime = now;
    
    this.state.isAnalyzing = true;
    this.state.frameCount++;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(`${EXTERNAL_BACKEND_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frame: frameBase64,
          frame_number: this.state.frameCount,
          timestamp: now / 1000 // Convert to seconds
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data: ExternalVideoResponse = await response.json();
      this.state.lastError = null;
      this.state.isAnalyzing = false;
      
      return data;
    } catch (error) {
      this.state.isAnalyzing = false;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          this.state.lastError = 'Request timeout';
        } else {
          this.state.lastError = error.message;
        }
      } else {
        this.state.lastError = 'Unknown error';
      }
      
      console.error('External video analyzer error:', this.state.lastError);
      return null;
    }
  }

  /**
   * Set polling interval in milliseconds
   */
  setPollingInterval(ms: number): void {
    this.minInterval = Math.max(100, ms); // Minimum 100ms
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
      frameCount: 0
    };
    this.lastRequestTime = 0;
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
