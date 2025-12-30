// ProductionConfig - Thresholds and bounds for visual behavior analysis

export class ProductionConfig {
  // Frame confidence thresholds
  readonly min_frame_confidence = 0.5;
  readonly min_face_confidence = 0.5;
  readonly min_hand_confidence = 0.5;
  readonly min_pose_confidence = 0.5;

  // Landmark validation
  readonly min_face_landmarks = 468;
  readonly min_hand_landmarks = 21;
  readonly min_pose_landmarks = 33;
  
  // Bounding box validation
  readonly min_bbox_area = 0.0001;  // Reject tiny detections
  readonly max_uniform_ratio = 0.1;  // Reject if >90% landmarks identical

  // Attention calculation
  readonly attention_yaw_threshold = 30;    // degrees - looking away
  readonly attention_pitch_threshold = 25;  // degrees - looking up/down
  readonly max_attention_angle = 45;        // degrees - complete look away

  // Head movement normalization
  readonly head_movement_smoothing = 0.1;
  readonly max_head_movement = 0.5;  // normalized

  // Shoulder tilt bounds
  readonly max_shoulder_tilt = 45;  // degrees

  // Hand activity normalization  
  readonly hand_activity_smoothing = 0.05;
  readonly max_hand_activity = 1.0;  // normalized

  // Posture scoring
  readonly ideal_shoulder_tilt = 0;
  readonly posture_penalty_per_degree = 2;

  // MediaPipe landmark indices for face
  readonly FACE_NOSE_TIP = 1;
  readonly FACE_LEFT_EYE_OUTER = 33;
  readonly FACE_LEFT_EYE_INNER = 133;
  readonly FACE_RIGHT_EYE_OUTER = 263;
  readonly FACE_RIGHT_EYE_INNER = 362;
  readonly FACE_LEFT_EAR = 234;
  readonly FACE_RIGHT_EAR = 454;
  readonly FACE_CHIN = 152;
  readonly FACE_FOREHEAD = 10;
  readonly FACE_LEFT_MOUTH = 61;
  readonly FACE_RIGHT_MOUTH = 291;
  readonly FACE_UPPER_LIP = 13;
  readonly FACE_LOWER_LIP = 14;

  // MediaPipe landmark indices for pose
  readonly POSE_LEFT_SHOULDER = 11;
  readonly POSE_RIGHT_SHOULDER = 12;
  readonly POSE_LEFT_EAR = 7;
  readonly POSE_RIGHT_EAR = 8;
  readonly POSE_NOSE = 0;

  // Expression detection thresholds
  readonly mouth_open_threshold = 0.05;  // normalized distance
  readonly smile_threshold = 0.03;       // normalized asymmetry
}

export const config = new ProductionConfig();
