// Shared TypeScript interfaces for analyze-frame edge function

export interface FaceLandmarks {
  landmarks: number[][];  // 468 face landmarks, each [x, y, z] normalized 0-1
  confidence: number;
}

export interface HandLandmarks {
  landmarks: number[][];  // 21 hand landmarks, each [x, y, z] normalized 0-1
  handedness: 'Left' | 'Right';
  confidence: number;
}

export interface PoseLandmarks {
  landmarks: number[][];  // 33 pose landmarks, each [x, y, z, visibility] normalized 0-1
  confidence: number;
}

export interface LandmarkData {
  face: FaceLandmarks | null;
  hands: HandLandmarks[] | null;
  pose: PoseLandmarks | null;
  frame_confidence: number;
  image_width: number;
  image_height: number;
}

export interface PreviousState {
  face_landmarks: number[][] | null;
  hand_landmarks: number[][][] | null;
  pose_landmarks: number[][] | null;
  timestamp: number;
}

export interface FrameRequest {
  landmarks: LandmarkData;
  timestamp: number;
  previous_state?: PreviousState;
}

export interface AnalysisMetrics {
  // Core metrics (always computed if landmarks available)
  attention_percent: number | null;
  head_movement_normalized: number | null;
  shoulder_tilt_deg: number | null;
  hand_activity_normalized: number | null;
  hands_detected_count: number;
  
  // Derived scores (compatible with existing VideoMonitor)
  posture_score: number | null;
  eye_contact_score: number | null;
  expression_score: number | null;
}

export interface FrameResponse {
  metrics: AnalysisMetrics | null;
  frame_confidence: number;
  explanations: Record<string, string>;
  warnings: string[];
  next_state: PreviousState;
}

export interface ValidationResult {
  valid: boolean;
  reason: string;
}
