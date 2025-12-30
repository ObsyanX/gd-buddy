// API client for analyze-frame edge function
// Handles communication with backend and state management

import { supabase } from "@/integrations/supabase/client";
import { LandmarkData } from "./mediapipe-client";

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

  /**
   * Analyze a frame by sending landmarks to the edge function
   */
  async analyze(landmarks: LandmarkData): Promise<FrameResponse> {
    // Throttle requests
    const now = Date.now();
    if (now - this.lastAnalysisTime < this.minAnalysisInterval) {
      // Return cached response structure if throttled
      return {
        metrics: null,
        frame_confidence: 0,
        explanations: { throttled: "too_soon" },
        warnings: [],
        next_state: this.previousState || {
          face_landmarks: null,
          hand_landmarks: null,
          pose_landmarks: null,
          timestamp: now
        }
      };
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
        return {
          metrics: null,
          frame_confidence: 0,
          explanations: { error: error.message },
          warnings: ["Edge function error"],
          next_state: this.previousState || {
            face_landmarks: null,
            hand_landmarks: null,
            pose_landmarks: null,
            timestamp: now
          }
        };
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
      return {
        metrics: null,
        frame_confidence: 0,
        explanations: { error: error instanceof Error ? error.message : 'Unknown error' },
        warnings: ["Request failed"],
        next_state: this.previousState || {
          face_landmarks: null,
          hand_landmarks: null,
          pose_landmarks: null,
          timestamp: now
        }
      };
    }
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
    console.log('AnalyzeFrameClient: Reset');
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
