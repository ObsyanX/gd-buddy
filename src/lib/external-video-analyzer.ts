// External Video Analyzer API Client
// Routes through Supabase edge function proxy for secure API key handling
// Falls back to local Supabase fallback function when backend is unreachable

import { supabase } from "@/integrations/supabase/client";

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

export interface FallbackResponse {
  success: boolean;
  fallback: boolean;
  frame_confidence: number;
  metrics: {
    attention_percent: number | null;
    head_movement_normalized: number | null;
    shoulder_tilt_deg: number | null;
    hand_activity_normalized: number | null;
    hands_detected_count: number;
    posture_score: number | null;
    eye_contact_score: number | null;
    expression_score: number | null;
  };
  explanations: Record<string, string>;
  warnings: string[];
}

export interface ExternalAnalyzerState {
  isAnalyzing: boolean;
  lastError: string | null;
  frameCount: number;
  isFallbackMode: boolean;
  consecutiveFailures: number;
}

class ExternalVideoAnalyzer {
  private state: ExternalAnalyzerState = {
    isAnalyzing: false,
    lastError: null,
    frameCount: 0,
    isFallbackMode: false,
    consecutiveFailures: 0
  };
  
  private lastRequestTime = 0;
  private minInterval = 500; // 500ms between requests (2 FPS)
  private lastValidResponse: ExternalVideoResponse | null = null;
  private fallbackRecoveryTime = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly RECOVERY_INTERVAL = 30000; // 30 seconds

  /**
   * Analyze a video frame using the proxy edge function (secure API key handling)
   */
  async analyzeFrame(frameBase64: string): Promise<ExternalVideoResponse | null> {
    const now = Date.now();
    
    // Throttle requests
    if (now - this.lastRequestTime < this.minInterval) {
      if (this.state.frameCount % 10 === 0) {
        console.log('[Analyzer] Frame throttled');
      }
      return null;
    }
    this.lastRequestTime = now;
    
    // Check if we should try to recover from fallback mode
    if (this.state.isFallbackMode && now > this.fallbackRecoveryTime) {
      console.log('[Analyzer] Attempting recovery from fallback mode...');
      this.state.isFallbackMode = false;
      this.state.consecutiveFailures = 0;
    }
    
    this.state.isAnalyzing = true;
    this.state.frameCount++;
    console.log(`[Analyzer] Frame #${this.state.frameCount}${this.state.isFallbackMode ? ' (fallback)' : ''}`);

    try {
      // Use Supabase edge function proxy instead of direct call
      console.log('[Analyzer] Calling video-analyzer-proxy...');
      
      const { data, error } = await supabase.functions.invoke('video-analyzer-proxy', {
        body: {
          frame: frameBase64,
          frame_number: this.state.frameCount,
          timestamp: now / 1000
        }
      });

      if (error) {
        throw new Error(error.message || 'Proxy error');
      }

      if (!data || !data.success) {
        if (data?.backend_unreachable) {
          throw new Error('Backend unreachable');
        }
        throw new Error(data?.error || 'Analysis failed');
      }

      // Success - reset failure counter
      this.state.consecutiveFailures = 0;
      this.state.isFallbackMode = false;
      this.state.lastError = null;
      this.state.isAnalyzing = false;
      
      // Store last valid response for fallback
      this.lastValidResponse = data as ExternalVideoResponse;
      
      console.log('[Analyzer] Success:', {
        attention: data.attention,
        shoulder_tilt: data.shoulder_tilt,
        confidence: data.frame_confidence
      });
      
      return data as ExternalVideoResponse;
    } catch (error) {
      this.state.isAnalyzing = false;
      this.state.consecutiveFailures++;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.state.lastError = errorMessage;
      
      console.error(`[Analyzer] Error (${this.state.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES}):`, errorMessage);
      
      // Switch to fallback mode after consecutive failures
      if (this.state.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES && !this.state.isFallbackMode) {
        console.log('[Analyzer] Switching to fallback mode');
        this.state.isFallbackMode = true;
        this.fallbackRecoveryTime = Date.now() + this.RECOVERY_INTERVAL;
      }
      
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
   * Check if in fallback mode
   */
  isFallbackActive(): boolean {
    return this.state.isFallbackMode;
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
      isFallbackMode: false,
      consecutiveFailures: 0
    };
    this.lastRequestTime = 0;
    this.lastValidResponse = null;
    this.fallbackRecoveryTime = 0;
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
