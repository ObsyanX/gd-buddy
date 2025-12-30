// ProductionBehaviorAnalyzer - Stateless frame analysis with strict validation

import { config } from "./config.ts";
import { validator } from "./validators.ts";
import {
  calculateAttention,
  calculateEyeContact,
  calculateHeadMovement,
  calculateShoulderTilt,
  calculatePostureScore,
  calculateHandActivity,
  calculateExpressionScore,
  countValidHands
} from "./calculators.ts";
import { FrameRequest, FrameResponse, AnalysisMetrics, PreviousState } from "./types.ts";

/**
 * Analyze a single video frame with strict validation
 * Returns null metrics if data is invalid or missing - NEVER fakes values
 */
export function analyzeFrame(input: FrameRequest): FrameResponse {
  const explanations: Record<string, string> = {};
  const warnings: string[] = [];

  const { landmarks, timestamp, previous_state } = input;

  // Validate frame confidence first
  const frameValidation = validator.validateFrame(landmarks.frame_confidence);
  if (!frameValidation.valid) {
    return {
      metrics: null,
      frame_confidence: landmarks.frame_confidence,
      explanations: { frame: frameValidation.reason },
      warnings: ["Frame confidence below threshold"],
      next_state: {
        face_landmarks: null,
        hand_landmarks: null,
        pose_landmarks: null,
        timestamp
      }
    };
  }

  // Initialize metrics with null (will only set if calculated successfully)
  const metrics: AnalysisMetrics = {
    attention_percent: null,
    head_movement_normalized: null,
    shoulder_tilt_deg: null,
    hand_activity_normalized: null,
    hands_detected_count: 0,
    posture_score: null,
    eye_contact_score: null,
    expression_score: null
  };

  // --- FACE ANALYSIS ---
  const faceValidation = validator.validateFace(landmarks.face);
  if (faceValidation.valid && landmarks.face) {
    // Calculate attention
    const attention = calculateAttention(landmarks.face);
    if (attention !== null) {
      metrics.attention_percent = attention;
      explanations.attention = "success";
    } else {
      explanations.attention = "calculation_failed";
    }

    // Calculate eye contact
    const eyeContact = calculateEyeContact(landmarks.face);
    if (eyeContact !== null) {
      metrics.eye_contact_score = Math.round(eyeContact);
      explanations.eye_contact = "success";
    } else {
      explanations.eye_contact = "calculation_failed";
    }

    // Calculate expression
    const expression = calculateExpressionScore(landmarks.face);
    if (expression !== null) {
      metrics.expression_score = expression;
      explanations.expression = "success";
    } else {
      explanations.expression = "calculation_failed";
    }

    // Calculate head movement (requires previous frame)
    if (previous_state?.face_landmarks) {
      const headMovement = calculateHeadMovement(landmarks.face, previous_state.face_landmarks);
      if (headMovement !== null) {
        metrics.head_movement_normalized = headMovement;
        explanations.head_movement = "success";
      } else {
        explanations.head_movement = "calculation_failed";
      }
    } else {
      metrics.head_movement_normalized = 0; // First frame = no movement
      explanations.head_movement = "first_frame";
    }
  } else {
    explanations.face = faceValidation.reason;
    warnings.push(`Face validation failed: ${faceValidation.reason}`);
  }

  // --- POSE ANALYSIS ---
  const poseValidation = validator.validatePose(landmarks.pose);
  if (poseValidation.valid && landmarks.pose) {
    // Calculate shoulder tilt
    const shoulderTilt = calculateShoulderTilt(landmarks.pose);
    if (shoulderTilt !== null) {
      metrics.shoulder_tilt_deg = shoulderTilt;
      explanations.shoulder_tilt = "success";

      // Calculate posture score from shoulder tilt
      const postureScore = calculatePostureScore(shoulderTilt);
      if (postureScore !== null) {
        metrics.posture_score = postureScore;
        explanations.posture = "success";
      }
    } else {
      explanations.shoulder_tilt = "calculation_failed";
      explanations.posture = "no_shoulder_data";
    }
  } else {
    explanations.pose = poseValidation.reason;
    // Use face-based posture estimate if pose unavailable
    if (landmarks.face && faceValidation.valid) {
      // Estimate posture from face alignment
      const faceLandmarks = landmarks.face.landmarks;
      if (faceLandmarks && faceLandmarks.length >= 468) {
        const leftEar = faceLandmarks[config.FACE_LEFT_EAR];
        const rightEar = faceLandmarks[config.FACE_RIGHT_EAR];
        if (leftEar && rightEar) {
          const dy = rightEar[1] - leftEar[1];
          const dx = rightEar[0] - leftEar[0];
          if (Math.abs(dx) > 0.01) {
            const tiltRad = Math.atan2(dy, dx);
            const tiltDeg = tiltRad * (180 / Math.PI);
            metrics.shoulder_tilt_deg = Math.round(tiltDeg * 10) / 10;
            metrics.posture_score = calculatePostureScore(metrics.shoulder_tilt_deg);
            explanations.posture = "estimated_from_face";
            warnings.push("Posture estimated from face landmarks (pose not available)");
          }
        }
      }
    }
  }

  // --- HAND ANALYSIS ---
  if (landmarks.hands && landmarks.hands.length > 0) {
    // Count valid hands
    let validHandCount = 0;
    for (const hand of landmarks.hands) {
      const handValidation = validator.validateHand(hand);
      if (handValidation.valid) {
        validHandCount++;
      }
    }
    metrics.hands_detected_count = validHandCount;

    if (validHandCount > 0) {
      explanations.hands = "success";

      // Calculate hand activity
      if (previous_state?.hand_landmarks) {
        const handActivity = calculateHandActivity(landmarks.hands, previous_state.hand_landmarks);
        if (handActivity !== null) {
          metrics.hand_activity_normalized = handActivity;
          explanations.hand_activity = "success";
        } else {
          explanations.hand_activity = "calculation_failed";
        }
      } else {
        metrics.hand_activity_normalized = 0; // First frame with hands
        explanations.hand_activity = "first_frame";
      }
    }
  } else {
    explanations.hands = "no_hands_detected";
    metrics.hands_detected_count = 0;
  }

  // Prepare next state for motion tracking
  const nextState: PreviousState = {
    face_landmarks: landmarks.face?.landmarks ?? null,
    hand_landmarks: landmarks.hands?.map(h => h.landmarks) ?? null,
    pose_landmarks: landmarks.pose?.landmarks ?? null,
    timestamp
  };

  return {
    metrics,
    frame_confidence: landmarks.frame_confidence,
    explanations,
    warnings,
    next_state: nextState
  };
}
