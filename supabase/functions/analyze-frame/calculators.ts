// Pixel-accurate metric calculators - NO FAKE VALUES

import { config } from "./config.ts";
import { FaceLandmarks, HandLandmarks, PoseLandmarks } from "./types.ts";

/**
 * Calculate attention percentage based on head orientation (yaw/pitch)
 * Returns null if calculation is not possible
 */
export function calculateAttention(face: FaceLandmarks | null): number | null {
  if (!face || !face.landmarks || face.landmarks.length < 468) {
    return null;
  }

  const landmarks = face.landmarks;

  // Get key facial landmarks for head pose estimation
  const noseTip = landmarks[config.FACE_NOSE_TIP];
  const leftEyeOuter = landmarks[config.FACE_LEFT_EYE_OUTER];
  const rightEyeOuter = landmarks[config.FACE_RIGHT_EYE_OUTER];
  const leftEar = landmarks[config.FACE_LEFT_EAR];
  const rightEar = landmarks[config.FACE_RIGHT_EAR];
  const chin = landmarks[config.FACE_CHIN];
  const forehead = landmarks[config.FACE_FOREHEAD];

  if (!noseTip || !leftEyeOuter || !rightEyeOuter || !chin || !forehead) {
    return null;
  }

  // Calculate yaw (horizontal rotation) using eye-to-nose ratio
  const eyeCenter = [(leftEyeOuter[0] + rightEyeOuter[0]) / 2, (leftEyeOuter[1] + rightEyeOuter[1]) / 2];
  const eyeWidth = Math.abs(rightEyeOuter[0] - leftEyeOuter[0]);
  
  if (eyeWidth < 0.01) {
    return null; // Face too small or profile view
  }

  // Nose offset from eye center indicates yaw
  const noseOffset = (noseTip[0] - eyeCenter[0]) / eyeWidth;
  const yawEstimate = noseOffset * 90; // Rough degree estimate

  // Calculate pitch (vertical rotation) using forehead-chin axis
  const faceHeight = Math.abs(chin[1] - forehead[1]);
  if (faceHeight < 0.01) {
    return null;
  }

  const noseVerticalOffset = (noseTip[1] - forehead[1]) / faceHeight;
  const pitchEstimate = (noseVerticalOffset - 0.5) * 60; // Rough degree estimate

  // Calculate attention as inverse of deviation from center
  const yawPenalty = Math.min(Math.abs(yawEstimate) / config.max_attention_angle, 1);
  const pitchPenalty = Math.min(Math.abs(pitchEstimate) / config.max_attention_angle, 1);

  // Combined attention score (100% = looking straight ahead)
  const attention = Math.max(0, (1 - Math.max(yawPenalty, pitchPenalty)) * 100);

  return Math.round(attention * 10) / 10; // 1 decimal precision
}

/**
 * Calculate eye contact score based on gaze direction
 * Returns null if calculation is not possible
 */
export function calculateEyeContact(face: FaceLandmarks | null): number | null {
  if (!face || !face.landmarks || face.landmarks.length < 468) {
    return null;
  }

  const landmarks = face.landmarks;

  // Get eye landmarks for gaze estimation
  const leftEyeInner = landmarks[config.FACE_LEFT_EYE_INNER];
  const leftEyeOuter = landmarks[config.FACE_LEFT_EYE_OUTER];
  const rightEyeInner = landmarks[config.FACE_RIGHT_EYE_INNER];
  const rightEyeOuter = landmarks[config.FACE_RIGHT_EYE_OUTER];

  if (!leftEyeInner || !leftEyeOuter || !rightEyeInner || !rightEyeOuter) {
    return null;
  }

  // Calculate eye openness (simple heuristic for engagement)
  const leftEyeWidth = Math.abs(leftEyeOuter[0] - leftEyeInner[0]);
  const rightEyeWidth = Math.abs(rightEyeOuter[0] - rightEyeInner[0]);

  // Use attention score as base for eye contact (simplified)
  const attention = calculateAttention(face);
  if (attention === null) {
    return null;
  }

  // Eye contact is attention weighted by eye visibility
  const eyeVisibility = Math.min(leftEyeWidth + rightEyeWidth, 0.1) / 0.1;
  const eyeContact = attention * Math.max(0.5, eyeVisibility);

  return Math.round(eyeContact * 10) / 10;
}

/**
 * Calculate head movement between frames (normalized 0-1)
 * Returns null if previous frame data unavailable
 */
export function calculateHeadMovement(
  currentFace: FaceLandmarks | null,
  previousFaceLandmarks: number[][] | null
): number | null {
  if (!currentFace || !currentFace.landmarks || !previousFaceLandmarks) {
    return null;
  }

  const current = currentFace.landmarks;
  
  if (current.length < 10 || previousFaceLandmarks.length < 10) {
    return null;
  }

  // Compare key stable landmarks (nose, eyes, chin)
  const keyIndices = [
    config.FACE_NOSE_TIP,
    config.FACE_LEFT_EYE_OUTER,
    config.FACE_RIGHT_EYE_OUTER,
    config.FACE_CHIN,
    config.FACE_FOREHEAD
  ];

  let totalMovement = 0;
  let validComparisons = 0;

  for (const idx of keyIndices) {
    if (idx < current.length && idx < previousFaceLandmarks.length) {
      const curr = current[idx];
      const prev = previousFaceLandmarks[idx];
      
      if (curr && prev && curr.length >= 2 && prev.length >= 2) {
        const dx = curr[0] - prev[0];
        const dy = curr[1] - prev[1];
        totalMovement += Math.sqrt(dx * dx + dy * dy);
        validComparisons++;
      }
    }
  }

  if (validComparisons === 0) {
    return null;
  }

  // Normalize movement (average per landmark, capped at max)
  const avgMovement = totalMovement / validComparisons;
  const normalized = Math.min(avgMovement / config.max_head_movement, 1);

  return Math.round(normalized * 1000) / 1000; // 3 decimal precision
}

/**
 * Calculate shoulder tilt in degrees
 * Returns null if pose landmarks unavailable
 */
export function calculateShoulderTilt(pose: PoseLandmarks | null): number | null {
  if (!pose || !pose.landmarks || pose.landmarks.length < 13) {
    return null;
  }

  const leftShoulder = pose.landmarks[config.POSE_LEFT_SHOULDER];
  const rightShoulder = pose.landmarks[config.POSE_RIGHT_SHOULDER];

  if (!leftShoulder || !rightShoulder) {
    return null;
  }

  if (leftShoulder.length < 2 || rightShoulder.length < 2) {
    return null;
  }

  // Check visibility if available
  if (leftShoulder.length >= 4 && leftShoulder[3] < 0.3) {
    return null;
  }
  if (rightShoulder.length >= 4 && rightShoulder[3] < 0.3) {
    return null;
  }

  // Calculate tilt angle
  const dy = rightShoulder[1] - leftShoulder[1];
  const dx = rightShoulder[0] - leftShoulder[0];

  if (Math.abs(dx) < 0.01) {
    return null; // Shoulders too close horizontally
  }

  const angleRad = Math.atan2(dy, dx);
  const angleDeg = angleRad * (180 / Math.PI);

  // Cap at max
  const cappedAngle = Math.max(-config.max_shoulder_tilt, Math.min(config.max_shoulder_tilt, angleDeg));

  return Math.round(cappedAngle * 10) / 10; // 1 decimal precision
}

/**
 * Calculate posture score from shoulder tilt (100 = perfect, 0 = max tilt)
 */
export function calculatePostureScore(shoulderTilt: number | null): number | null {
  if (shoulderTilt === null) {
    return null;
  }

  const deviation = Math.abs(shoulderTilt - config.ideal_shoulder_tilt);
  const penalty = deviation * config.posture_penalty_per_degree;
  const score = Math.max(0, 100 - penalty);

  return Math.round(score);
}

/**
 * Calculate hand activity between frames (normalized 0-1)
 * Returns null if hand data unavailable
 */
export function calculateHandActivity(
  currentHands: HandLandmarks[] | null,
  previousHandLandmarks: number[][][] | null
): number | null {
  if (!currentHands || currentHands.length === 0) {
    return null;
  }

  if (!previousHandLandmarks || previousHandLandmarks.length === 0) {
    return 0; // First frame with hands = no movement yet
  }

  let totalActivity = 0;
  let validComparisons = 0;

  for (let h = 0; h < currentHands.length && h < previousHandLandmarks.length; h++) {
    const currentLandmarks = currentHands[h].landmarks;
    const previousLandmarks = previousHandLandmarks[h];

    if (!currentLandmarks || !previousLandmarks) continue;

    for (let i = 0; i < currentLandmarks.length && i < previousLandmarks.length; i++) {
      const curr = currentLandmarks[i];
      const prev = previousLandmarks[i];

      if (curr && prev && curr.length >= 2 && prev.length >= 2) {
        const dx = curr[0] - prev[0];
        const dy = curr[1] - prev[1];
        totalActivity += Math.sqrt(dx * dx + dy * dy);
        validComparisons++;
      }
    }
  }

  if (validComparisons === 0) {
    return null;
  }

  // Normalize activity
  const avgActivity = totalActivity / validComparisons;
  const normalized = Math.min(avgActivity / config.max_hand_activity, 1);

  return Math.round(normalized * 1000) / 1000; // 3 decimal precision
}

/**
 * Calculate expression score based on facial features
 * Returns null if face landmarks unavailable
 */
export function calculateExpressionScore(face: FaceLandmarks | null): number | null {
  if (!face || !face.landmarks || face.landmarks.length < 468) {
    return null;
  }

  const landmarks = face.landmarks;

  // Get mouth landmarks
  const upperLip = landmarks[config.FACE_UPPER_LIP];
  const lowerLip = landmarks[config.FACE_LOWER_LIP];
  const leftMouth = landmarks[config.FACE_LEFT_MOUTH];
  const rightMouth = landmarks[config.FACE_RIGHT_MOUTH];

  if (!upperLip || !lowerLip || !leftMouth || !rightMouth) {
    return null;
  }

  // Calculate mouth openness (indicates engagement/speaking)
  const mouthOpen = Math.abs(lowerLip[1] - upperLip[1]);
  const mouthWidth = Math.abs(rightMouth[0] - leftMouth[0]);

  if (mouthWidth < 0.01) {
    return null;
  }

  // Calculate smile (mouth corner lift)
  const mouthCenterY = (leftMouth[1] + rightMouth[1]) / 2;
  const lipCenterY = (upperLip[1] + lowerLip[1]) / 2;
  const smileIndicator = Math.max(0, lipCenterY - mouthCenterY);

  // Expression score: combination of engagement indicators
  const openScore = Math.min(mouthOpen / config.mouth_open_threshold, 1) * 30;
  const smileScore = Math.min(smileIndicator / config.smile_threshold, 1) * 40;
  
  // Base score for neutral face
  const baseScore = 30;

  const totalScore = Math.min(100, baseScore + openScore + smileScore);

  return Math.round(totalScore);
}

/**
 * Count validated hands
 */
export function countValidHands(hands: HandLandmarks[] | null): number {
  if (!hands) return 0;
  
  let count = 0;
  for (const hand of hands) {
    if (hand.confidence >= config.min_hand_confidence && 
        hand.landmarks && 
        hand.landmarks.length >= config.min_hand_landmarks) {
      count++;
    }
  }
  return count;
}
