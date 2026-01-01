// API client for video frame analysis
// Supports external backend (direct call) and Supabase edge function

import { supabase } from "@/integrations/supabase/client";
import { LandmarkData } from "./mediapipe-client";
import { getExternalVideoAnalyzer, ExternalVideoResponse } from "./external-video-analyzer";
import { captureFrameAsBase64 } from "./frame-capture";

// Use external backend by default
const USE_EXTERNAL_BACKEND = true;

export interface AnalysisMetrics {
  attention_percent: number | null;
  head_movement_normalized: number | null;
  shoulder_tilt_deg: number | null;
  hand_activity_normalized: number | null;
  hands_detected_count: number;
  posture_score: number | null;
  eye_contact_score: number | null;
  expression_score: number | null;
}

export interface PreviousState {
  face_landmarks: number[][] | null;
  hand_landmarks: number[][][] | null;
  pose_landmarks: number[][] | null;
  timestamp: number;
}

export interface FrameResponse {
  metrics: AnalysisMetrics | null;
  frame_confidence: number;
  explanations: Record<string, string>;
  warnings: string[];
  next_state: PreviousState;
  isWarmingUp?: boolean;
}

export interface AccumulatedMetrics {
  attention_sum: number;
  attention_count: number;
  head_movement_sum: number;
  head_movement_count: number;
  posture_sum: number;
  posture_count: number;
  eye_contact_sum: number;
  eye_contact_count: number;
  expression_sum: number;
  expression_count: number;
  hand_activity_sum: number;
  hand_activity_count: number;
  shoulder_tilt_sum: number;
  shoulder_tilt_count: number;
  hands_detected_max: number;
  total_frames: number;
  valid_frames: number;
  tips: Set<string>;
}

export class AnalyzeFrameClient {
  private previousState: PreviousState | null = null;
  private accumulatedMetrics: AccumulatedMetrics = this.createEmptyAccumulated();
  private lastAnalysisTime = 0;
  private minAnalysisInterval = 100; // 10 FPS max
  private confidenceStatus: 'PASS' | 'FAIL' | null = null;
  private lastValidMetrics: AnalysisMetrics | null = null; // Preserve last valid metrics
  private lastSuccessfulAnalysisTime = 0; // Track when we last got valid data
  private consecutiveFailures = 0; // Track consecutive failures for decay
  
  // Decay configuration
  private static readonly DECAY_RATE_PER_SECOND = 3; // 3% per second
  private static readonly ACCELERATED_DECAY_MULTIPLIER = 2; // 2x decay when face not detected
  private static readonly MAX_STALE_TIME_MS = 3000; // Hard cap metrics after 3s of no data
  private static readonly MIN_METRIC_VALUE = 0; // Floor for metrics

  /**
   * Analyze a frame using external backend (direct call, non-blocking)
   */
  async analyzeWithExternalBackend(video: HTMLVideoElement): Promise<FrameResponse> {
    const now = Date.now();
    
    // Capture frame as base64
    const frameBase64 = captureFrameAsBase64(video);
    if (!frameBase64) {
      this.consecutiveFailures++;
      return this.handleAnalysisFailure(now, 'Frame capture failed', true);
    }

    const externalAnalyzer = getExternalVideoAnalyzer();
    const analyzerState = externalAnalyzer.getState();
    
    // If backend is warming up, return cached metrics with warming indicator
    if (analyzerState.isWarmingUp && this.lastValidMetrics) {
      console.log('[AnalyzeFrameClient] Backend warming up, using cached metrics');
      return this.createWarmingResponse(now);
    }

    // Send to external backend via proxy
    const externalResponse = await externalAnalyzer.analyzeFrame(frameBase64);
    
    if (!externalResponse) {
      // Throttled or error - apply decay logic
      const state = externalAnalyzer.getState();
      const reason = state.lastError || 'throttled';
      
      // Don't decay on throttling (expected behavior)
      if (reason === 'throttled') {
        return this.createEmptyResponse(now, 'throttled');
      }
      
      this.consecutiveFailures++;
      return this.handleAnalysisFailure(now, reason, false);
    }

    // Convert external response to our FrameResponse format
    const response = this.convertExternalResponse(externalResponse, now);
    
    // Store confidence status
    this.confidenceStatus = externalResponse.confidence_status;
    
    // Check if this is a FAIL state (low confidence)
    const isFail = externalResponse.confidence_status === 'FAIL';
    
    if (isFail) {
      // FAIL state - apply decay to metrics
      this.consecutiveFailures++;
      console.log('[AnalyzeFrameClient] FAIL state detected, applying decay');
      return this.handleAnalysisFailure(now, 'low_confidence', false);
    }
    
    // SUCCESS - store valid metrics and reset failure counter
    if (response.metrics) {
      this.lastValidMetrics = response.metrics;
      this.lastSuccessfulAnalysisTime = now;
      this.consecutiveFailures = 0;
      this.accumulateMetrics(response.metrics, response.warnings);
    }

    return response;
  }

  /**
   * Handle analysis failure with time-based decay
   * Metrics degrade based on time since last valid data
   */
  private handleAnalysisFailure(now: number, reason: string, noFace: boolean): FrameResponse {
    // If we have no previous metrics, return empty
    if (!this.lastValidMetrics) {
      return this.createEmptyResponse(now, reason);
    }

    const timeSinceLastSuccess = now - this.lastSuccessfulAnalysisTime;
    const secondsElapsed = timeSinceLastSuccess / 1000;
    
    // Calculate decay amount
    const baseDecay = AnalyzeFrameClient.DECAY_RATE_PER_SECOND * secondsElapsed;
    const decayMultiplier = noFace ? AnalyzeFrameClient.ACCELERATED_DECAY_MULTIPLIER : 1;
    const totalDecay = baseDecay * decayMultiplier;
    
    // Hard cap: if no valid data for too long, force metrics to low values
    const hardCap = timeSinceLastSuccess > AnalyzeFrameClient.MAX_STALE_TIME_MS;
    const capValue = 30; // Hard cap at 30%
    
    // Apply decay to metrics
    const decayedMetrics: AnalysisMetrics = {
      attention_percent: this.applyDecay(this.lastValidMetrics.attention_percent, totalDecay, hardCap, capValue),
      head_movement_normalized: this.lastValidMetrics.head_movement_normalized,
      shoulder_tilt_deg: this.lastValidMetrics.shoulder_tilt_deg,
      hand_activity_normalized: this.lastValidMetrics.hand_activity_normalized,
      hands_detected_count: noFace ? 0 : this.lastValidMetrics.hands_detected_count,
      posture_score: this.applyDecay(this.lastValidMetrics.posture_score, totalDecay, hardCap, capValue),
      eye_contact_score: this.applyDecay(this.lastValidMetrics.eye_contact_score, totalDecay, hardCap, capValue),
      expression_score: this.applyDecay(this.lastValidMetrics.expression_score, totalDecay, hardCap, capValue)
    };
    
    console.log('[AnalyzeFrameClient] Applied decay:', {
      secondsElapsed: secondsElapsed.toFixed(1),
      totalDecay: totalDecay.toFixed(1),
      hardCap,
      noFace,
      posture: `${this.lastValidMetrics.posture_score} -> ${decayedMetrics.posture_score}`,
      eyeContact: `${this.lastValidMetrics.eye_contact_score} -> ${decayedMetrics.eye_contact_score}`
    });
    
    // Update last valid metrics with decayed values so subsequent failures continue to decay
    this.lastValidMetrics = decayedMetrics;
    
    // Accumulate the decayed values (so session average reflects reality)
    this.accumulateMetrics(decayedMetrics, [reason]);
    
    return {
      metrics: decayedMetrics,
      frame_confidence: hardCap ? 0.1 : 0.3,
      explanations: { reason, decay_applied: 'true' },
      warnings: hardCap ? ['No reliable detection for extended period'] : [],
      next_state: this.previousState || {
        face_landmarks: null,
        hand_landmarks: null,
        pose_landmarks: null,
        timestamp: now
      }
    };
  }

  /**
   * Apply decay to a single metric value
   */
  private applyDecay(value: number | null, decayAmount: number, hardCap: boolean, capValue: number): number {
    if (value === null) return 0;
    
    if (hardCap) {
      return Math.min(value, capValue);
    }
    
    const decayed = Math.max(AnalyzeFrameClient.MIN_METRIC_VALUE, value - decayAmount);
    return Math.round(decayed);
  }

  /**
   * Create a response when backend is warming up (preserves last metrics)
   */
  private createWarmingResponse(timestamp: number): FrameResponse {
    return {
      metrics: this.lastValidMetrics,
      frame_confidence: 0.5,
      explanations: { mode: 'warming_up' },
      warnings: ['Backend warming up (Render cold start)'],
      next_state: this.previousState || {
        face_landmarks: null,
        hand_landmarks: null,
        pose_landmarks: null,
        timestamp
      },
      isWarmingUp: true
    };
  }

  /**
   * Convert external backend response to our internal format
   */
  private convertExternalResponse(external: ExternalVideoResponse, timestamp: number): FrameResponse {
    // Map external fields to our metrics structure
    const metrics: AnalysisMetrics = {
      attention_percent: external.attention,
      head_movement_normalized: external.head_movement,
      shoulder_tilt_deg: external.shoulder_tilt,
      hand_activity_normalized: external.hand_activity,
      hands_detected_count: external.hands_detected,
      // Derive scores from external metrics
      posture_score: this.derivePostureScore(external.shoulder_tilt),
      eye_contact_score: this.deriveEyeContactScore(external.attention),
      expression_score: external.frame_confidence > 0.3 ? 70 : 50 // Base expression score
    };

    return {
      metrics: external.success ? metrics : null,
      frame_confidence: external.frame_confidence,
      explanations: external.success ? {} : { error: 'Analysis failed' },
      warnings: external.warnings || [],
      next_state: {
        face_landmarks: null,
        hand_landmarks: null,
        pose_landmarks: null,
        timestamp
      }
    };
  }

  /**
   * Derive posture score from shoulder tilt
   */
  private derivePostureScore(shoulderTilt: number): number {
    // Lower tilt = better posture
    const tiltDeg = Math.abs(shoulderTilt);
    if (tiltDeg < 3) return 95;
    if (tiltDeg < 5) return 85;
    if (tiltDeg < 10) return 70;
    if (tiltDeg < 15) return 55;
    return 40;
  }

  /**
   * Derive eye contact score from attention
   */
  private deriveEyeContactScore(attention: number): number {
    // Attention percentage maps directly to eye contact score
    return Math.round(attention);
  }

  /**
   * Create an empty response for error/throttled cases
   * Preserves last valid metrics when reason is 'throttled'
   */
  private createEmptyResponse(timestamp: number, reason: string): FrameResponse {
    return {
      metrics: null,
      frame_confidence: 0,
      explanations: { reason },
      warnings: reason !== 'throttled' ? [reason] : [],
      next_state: this.previousState || {
        face_landmarks: null,
        hand_landmarks: null,
        pose_landmarks: null,
        timestamp
      }
    };
  }

  /**
   * Analyze a frame using MediaPipe landmarks (Supabase edge function)
   */
  async analyzeWithLandmarks(landmarks: LandmarkData): Promise<FrameResponse> {
    // Throttle requests
    const now = Date.now();
    if (now - this.lastAnalysisTime < this.minAnalysisInterval) {
      return this.createEmptyResponse(now, 'throttled');
    }
    this.lastAnalysisTime = now;

    try {
      const { data, error } = await supabase.functions.invoke('analyze-frame', {
        body: {
          landmarks,
          timestamp: now,
          previous_state: this.previousState
        }
      });

      if (error) {
        console.error('AnalyzeFrameClient: Edge function error:', error);
        return this.createEmptyResponse(now, error.message);
      }

      const response = data as FrameResponse;

      // Update previous state for motion tracking
      this.previousState = response.next_state;

      // Accumulate metrics
      if (response.metrics) {
        this.accumulateMetrics(response.metrics, response.warnings);
      }

      return response;
    } catch (error) {
      console.error('AnalyzeFrameClient: Request failed:', error);
      return this.createEmptyResponse(now, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Main analyze method - routes to appropriate backend
   */
  async analyze(landmarks: LandmarkData, video?: HTMLVideoElement): Promise<FrameResponse> {
    if (USE_EXTERNAL_BACKEND && video) {
      return this.analyzeWithExternalBackend(video);
    }
    return this.analyzeWithLandmarks(landmarks);
  }

  /**
   * Get confidence status from last external analysis
   */
  getConfidenceStatus(): 'PASS' | 'FAIL' | null {
    return this.confidenceStatus;
  }

  /**
   * Accumulate metrics for session averaging
   */
  private accumulateMetrics(metrics: AnalysisMetrics, warnings: string[]): void {
    this.accumulatedMetrics.total_frames++;

    if (metrics.attention_percent !== null) {
      this.accumulatedMetrics.attention_sum += metrics.attention_percent;
      this.accumulatedMetrics.attention_count++;
      this.accumulatedMetrics.valid_frames++;
    }

    if (metrics.head_movement_normalized !== null) {
      this.accumulatedMetrics.head_movement_sum += metrics.head_movement_normalized;
      this.accumulatedMetrics.head_movement_count++;
    }

    if (metrics.posture_score !== null) {
      this.accumulatedMetrics.posture_sum += metrics.posture_score;
      this.accumulatedMetrics.posture_count++;
    }

    if (metrics.eye_contact_score !== null) {
      this.accumulatedMetrics.eye_contact_sum += metrics.eye_contact_score;
      this.accumulatedMetrics.eye_contact_count++;
    }

    if (metrics.expression_score !== null) {
      this.accumulatedMetrics.expression_sum += metrics.expression_score;
      this.accumulatedMetrics.expression_count++;
    }

    if (metrics.hand_activity_normalized !== null) {
      this.accumulatedMetrics.hand_activity_sum += metrics.hand_activity_normalized;
      this.accumulatedMetrics.hand_activity_count++;
    }

    if (metrics.shoulder_tilt_deg !== null) {
      this.accumulatedMetrics.shoulder_tilt_sum += Math.abs(metrics.shoulder_tilt_deg);
      this.accumulatedMetrics.shoulder_tilt_count++;
    }

    if (metrics.hands_detected_count > this.accumulatedMetrics.hands_detected_max) {
      this.accumulatedMetrics.hands_detected_max = metrics.hands_detected_count;
    }

    // Generate tips based on metrics
    this.generateTips(metrics);
  }

  /**
   * Generate improvement tips based on current metrics
   */
  private generateTips(metrics: AnalysisMetrics): void {
    if (metrics.attention_percent !== null && metrics.attention_percent < 50) {
      this.accumulatedMetrics.tips.add("Try to maintain eye contact with the camera");
    }

    if (metrics.posture_score !== null && metrics.posture_score < 70) {
      this.accumulatedMetrics.tips.add("Keep your shoulders level for better posture");
    }

    if (metrics.shoulder_tilt_deg !== null && Math.abs(metrics.shoulder_tilt_deg) > 10) {
      this.accumulatedMetrics.tips.add("Straighten your posture - shoulders appear tilted");
    }

    if (metrics.expression_score !== null && metrics.expression_score < 40) {
      this.accumulatedMetrics.tips.add("Try to show more engagement through facial expressions");
    }

    if (metrics.eye_contact_score !== null && metrics.eye_contact_score < 50) {
      this.accumulatedMetrics.tips.add("Look directly at the camera for better eye contact");
    }
  }

  /**
   * Get session-averaged metrics
   */
  getSessionMetrics(): {
    posture_score: number | null;
    eye_contact_score: number | null;
    expression_score: number | null;
    attention_percent: number | null;
    head_movement_avg: number | null;
    hand_activity_avg: number | null;
    shoulder_tilt_avg: number | null;
    tips: string[];
    total_frames: number;
    valid_frames: number;
    frame_capture_rate: number;
  } {
    const acc = this.accumulatedMetrics;

    return {
      posture_score: acc.posture_count > 0 ? Math.round(acc.posture_sum / acc.posture_count) : null,
      eye_contact_score: acc.eye_contact_count > 0 ? Math.round(acc.eye_contact_sum / acc.eye_contact_count) : null,
      expression_score: acc.expression_count > 0 ? Math.round(acc.expression_sum / acc.expression_count) : null,
      attention_percent: acc.attention_count > 0 ? Math.round(acc.attention_sum / acc.attention_count * 10) / 10 : null,
      head_movement_avg: acc.head_movement_count > 0 ? Math.round(acc.head_movement_sum / acc.head_movement_count * 1000) / 1000 : null,
      hand_activity_avg: acc.hand_activity_count > 0 ? Math.round(acc.hand_activity_sum / acc.hand_activity_count * 1000) / 1000 : null,
      shoulder_tilt_avg: acc.shoulder_tilt_count > 0 ? Math.round(acc.shoulder_tilt_sum / acc.shoulder_tilt_count * 10) / 10 : null,
      tips: Array.from(acc.tips).slice(0, 5), // Max 5 tips
      total_frames: acc.total_frames,
      valid_frames: acc.valid_frames,
      frame_capture_rate: acc.total_frames > 0 ? Math.round(acc.valid_frames / acc.total_frames * 100) : 0
    };
  }

  /**
   * Reset state for new session
   */
  reset(): void {
    this.previousState = null;
    this.accumulatedMetrics = this.createEmptyAccumulated();
    this.lastAnalysisTime = 0;
    this.confidenceStatus = null;
    this.lastValidMetrics = null;
    this.lastSuccessfulAnalysisTime = 0;
    this.consecutiveFailures = 0;
    console.log('AnalyzeFrameClient: Reset');
  }

  /**
   * Check if backend is warming up
   */
  isBackendWarmingUp(): boolean {
    return getExternalVideoAnalyzer().isBackendWarmingUp();
  }

  /**
   * Get last valid metrics for preservation
   */
  getLastValidMetrics(): AnalysisMetrics | null {
    return this.lastValidMetrics;
  }

  /**
   * Set analysis throttle rate (FPS)
   */
  setAnalysisRate(fps: number): void {
    this.minAnalysisInterval = Math.max(50, 1000 / fps); // Min 50ms (20 FPS max)
  }

  private createEmptyAccumulated(): AccumulatedMetrics {
    return {
      attention_sum: 0,
      attention_count: 0,
      head_movement_sum: 0,
      head_movement_count: 0,
      posture_sum: 0,
      posture_count: 0,
      eye_contact_sum: 0,
      eye_contact_count: 0,
      expression_sum: 0,
      expression_count: 0,
      hand_activity_sum: 0,
      hand_activity_count: 0,
      shoulder_tilt_sum: 0,
      shoulder_tilt_count: 0,
      hands_detected_max: 0,
      total_frames: 0,
      valid_frames: 0,
      tips: new Set()
    };
  }
}

// Singleton instance
let clientInstance: AnalyzeFrameClient | null = null;

export function getAnalyzeFrameClient(): AnalyzeFrameClient {
  if (!clientInstance) {
    clientInstance = new AnalyzeFrameClient();
  }
  return clientInstance;
}

export function resetAnalyzeFrameClient(): void {
  if (clientInstance) {
    clientInstance.reset();
  }
}
