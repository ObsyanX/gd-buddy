// StrictValidator - Validates landmarks with zero tolerance for fake data

import { config } from "./config.ts";
import { FaceLandmarks, HandLandmarks, PoseLandmarks, ValidationResult } from "./types.ts";

export class StrictValidator {
  
  /**
   * Validate face landmarks - reject fake/malformed data
   */
  validateFace(face: FaceLandmarks | null): ValidationResult {
    if (!face) {
      return { valid: false, reason: "no_face_detected" };
    }

    if (face.confidence < config.min_face_confidence) {
      return { valid: false, reason: "low_confidence" };
    }

    const landmarks = face.landmarks;
    
    if (!landmarks || landmarks.length < config.min_face_landmarks) {
      return { valid: false, reason: "insufficient_landmarks" };
    }

    // Check for out-of-bounds coordinates
    for (const point of landmarks) {
      if (point.length < 2) {
        return { valid: false, reason: "invalid_landmark_format" };
      }
      if (point[0] < 0 || point[0] > 1 || point[1] < 0 || point[1] > 1) {
        return { valid: false, reason: "coordinates_out_of_bounds" };
      }
    }

    // Check for uniform/fake values (all landmarks at same position)
    const uniqueX = new Set(landmarks.map(p => Math.round(p[0] * 1000)));
    const uniqueY = new Set(landmarks.map(p => Math.round(p[1] * 1000)));
    
    if (uniqueX.size < landmarks.length * config.max_uniform_ratio ||
        uniqueY.size < landmarks.length * config.max_uniform_ratio) {
      return { valid: false, reason: "suspected_fake_uniform_values" };
    }

    // Check bounding box area
    const xs = landmarks.map(p => p[0]);
    const ys = landmarks.map(p => p[1]);
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    
    if (area < config.min_bbox_area) {
      return { valid: false, reason: "bbox_too_small" };
    }

    return { valid: true, reason: "success" };
  }

  /**
   * Validate hand landmarks
   */
  validateHand(hand: HandLandmarks | null): ValidationResult {
    if (!hand) {
      return { valid: false, reason: "no_hand_detected" };
    }

    if (hand.confidence < config.min_hand_confidence) {
      return { valid: false, reason: "low_confidence" };
    }

    const landmarks = hand.landmarks;
    
    if (!landmarks || landmarks.length < config.min_hand_landmarks) {
      return { valid: false, reason: "insufficient_landmarks" };
    }

    // Check for out-of-bounds coordinates
    for (const point of landmarks) {
      if (point.length < 2) {
        return { valid: false, reason: "invalid_landmark_format" };
      }
      if (point[0] < 0 || point[0] > 1 || point[1] < 0 || point[1] > 1) {
        return { valid: false, reason: "coordinates_out_of_bounds" };
      }
    }

    // Check bounding box area
    const xs = landmarks.map(p => p[0]);
    const ys = landmarks.map(p => p[1]);
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    
    if (area < config.min_bbox_area) {
      return { valid: false, reason: "bbox_too_small" };
    }

    return { valid: true, reason: "success" };
  }

  /**
   * Validate pose landmarks
   */
  validatePose(pose: PoseLandmarks | null): ValidationResult {
    if (!pose) {
      return { valid: false, reason: "no_pose_detected" };
    }

    if (pose.confidence < config.min_pose_confidence) {
      return { valid: false, reason: "low_confidence" };
    }

    const landmarks = pose.landmarks;
    
    if (!landmarks || landmarks.length < config.min_pose_landmarks) {
      return { valid: false, reason: "insufficient_landmarks" };
    }

    // Check shoulder landmarks specifically (required for posture)
    const leftShoulder = landmarks[config.POSE_LEFT_SHOULDER];
    const rightShoulder = landmarks[config.POSE_RIGHT_SHOULDER];
    
    if (!leftShoulder || !rightShoulder) {
      return { valid: false, reason: "missing_shoulder_landmarks" };
    }

    // Check visibility if available (4th element)
    if (leftShoulder.length >= 4 && leftShoulder[3] < 0.5) {
      return { valid: false, reason: "left_shoulder_not_visible" };
    }
    if (rightShoulder.length >= 4 && rightShoulder[3] < 0.5) {
      return { valid: false, reason: "right_shoulder_not_visible" };
    }

    return { valid: true, reason: "success" };
  }

  /**
   * Validate overall frame
   */
  validateFrame(frameConfidence: number): ValidationResult {
    if (frameConfidence < config.min_frame_confidence) {
      return { valid: false, reason: "frame_confidence_too_low" };
    }
    return { valid: true, reason: "success" };
  }
}

export const validator = new StrictValidator();
