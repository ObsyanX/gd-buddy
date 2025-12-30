// MediaPipe WASM Client for landmark extraction
// Uses @mediapipe/tasks-vision for face, hand, and pose detection

import {
  FaceLandmarker,
  HandLandmarker,
  PoseLandmarker,
  FilesetResolver,
  FaceLandmarkerResult,
  HandLandmarkerResult,
  PoseLandmarkerResult
} from "@mediapipe/tasks-vision";

export interface LandmarkData {
  face: {
    landmarks: number[][];
    confidence: number;
  } | null;
  hands: {
    landmarks: number[][];
    handedness: 'Left' | 'Right';
    confidence: number;
  }[] | null;
  pose: {
    landmarks: number[][];
    confidence: number;
  } | null;
  frame_confidence: number;
  image_width: number;
  image_height: number;
}

export class MediaPipeClient {
  private faceLandmarker: FaceLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private initialized = false;
  private initializing = false;

  /**
   * Initialize all MediaPipe models
   */
  async initialize(): Promise<void> {
    if (this.initialized || this.initializing) {
      return;
    }

    this.initializing = true;

    try {
      console.log('MediaPipeClient: Loading vision WASM...');
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      console.log('MediaPipeClient: Creating FaceLandmarker...');
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });

      console.log('MediaPipeClient: Creating HandLandmarker...');
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      console.log('MediaPipeClient: Creating PoseLandmarker...');
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.initialized = true;
      console.log('MediaPipeClient: All models initialized successfully');
    } catch (error) {
      console.error('MediaPipeClient: Failed to initialize:', error);
      this.initializing = false;
      throw error;
    }

    this.initializing = false;
  }

  /**
   * Process a video frame and extract all landmarks
   */
  async processFrame(video: HTMLVideoElement): Promise<LandmarkData> {
    if (!this.initialized) {
      throw new Error('MediaPipeClient not initialized. Call initialize() first.');
    }

    const timestamp = performance.now();
    const imageWidth = video.videoWidth;
    const imageHeight = video.videoHeight;

    let faceResult: FaceLandmarkerResult | null = null;
    let handResult: HandLandmarkerResult | null = null;
    let poseResult: PoseLandmarkerResult | null = null;

    // Run all detectors
    try {
      if (this.faceLandmarker) {
        faceResult = this.faceLandmarker.detectForVideo(video, timestamp);
      }
    } catch (error) {
      console.warn('MediaPipeClient: Face detection failed:', error);
    }

    try {
      if (this.handLandmarker) {
        handResult = this.handLandmarker.detectForVideo(video, timestamp);
      }
    } catch (error) {
      console.warn('MediaPipeClient: Hand detection failed:', error);
    }

    try {
      if (this.poseLandmarker) {
        poseResult = this.poseLandmarker.detectForVideo(video, timestamp);
      }
    } catch (error) {
      console.warn('MediaPipeClient: Pose detection failed:', error);
    }

    // Convert face landmarks
    let face: LandmarkData['face'] = null;
    if (faceResult && faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
      const landmarks = faceResult.faceLandmarks[0].map(lm => [lm.x, lm.y, lm.z || 0]);
      face = {
        landmarks,
        confidence: 0.9 // MediaPipe doesn't expose per-face confidence directly
      };
    }

    // Convert hand landmarks
    let hands: LandmarkData['hands'] = null;
    if (handResult && handResult.landmarks && handResult.landmarks.length > 0) {
      hands = handResult.landmarks.map((handLandmarks, idx) => ({
        landmarks: handLandmarks.map(lm => [lm.x, lm.y, lm.z || 0]),
        handedness: (handResult.handednesses?.[idx]?.[0]?.categoryName as 'Left' | 'Right') || 'Right',
        confidence: handResult.handednesses?.[idx]?.[0]?.score || 0.9
      }));
    }

    // Convert pose landmarks
    let pose: LandmarkData['pose'] = null;
    if (poseResult && poseResult.landmarks && poseResult.landmarks.length > 0) {
      const landmarks = poseResult.landmarks[0].map(lm => [
        lm.x,
        lm.y,
        lm.z || 0,
        lm.visibility ?? 1
      ]);
      pose = {
        landmarks,
        confidence: 0.9
      };
    }

    // Calculate overall frame confidence
    const faceConfidence = face ? face.confidence : 0;
    const poseConfidence = pose ? pose.confidence : 0;
    const frame_confidence = face ? Math.max(faceConfidence, poseConfidence * 0.5) : 0;

    return {
      face,
      hands,
      pose,
      frame_confidence,
      image_width: imageWidth,
      image_height: imageHeight
    };
  }

  /**
   * Check if the client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
    this.initialized = false;
    console.log('MediaPipeClient: Destroyed');
  }
}

// Singleton instance
let instance: MediaPipeClient | null = null;

export function getMediaPipeClient(): MediaPipeClient {
  if (!instance) {
    instance = new MediaPipeClient();
  }
  return instance;
}

export function destroyMediaPipeClient(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
