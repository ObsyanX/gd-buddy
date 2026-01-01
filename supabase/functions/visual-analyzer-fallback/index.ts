// Fallback Visual Analyzer Edge Function
// Accepts MediaPipe landmarks and computes safe geometric metrics only
// Used when primary Python backend is unreachable

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Vec2 {
  x: number;
  y: number;
}

interface FaceLandmark extends Vec2 {
  z?: number;
}

interface PoseLandmark extends Vec2 {
  z?: number;
  visibility?: number;
}

interface HandLandmark extends Vec2 {
  z?: number;
}

interface Payload {
  faceLandmarks?: FaceLandmark[] | number[][];
  poseLandmarks?: PoseLandmark[] | number[][];
  hands?: HandLandmark[][] | number[][][];
  frameWidth: number;
  frameHeight: number;
}

interface MetricsResult {
  attention_percent: number | null;
  head_movement_normalized: number | null;
  shoulder_tilt_deg: number | null;
  hand_activity_normalized: number | null;
  hands_detected_count: number;
  posture_score: number | null;
  eye_contact_score: number | null;
  expression_score: number | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: Payload = await req.json();
    console.log('[Fallback] Received landmarks request');

    const result = {
      success: true,
      metrics: {
        attention_percent: null,
        head_movement_normalized: null,
        shoulder_tilt_deg: null,
        hand_activity_normalized: null,
        hands_detected_count: 0,
        posture_score: null,
        eye_contact_score: null,
        expression_score: null,
      } as MetricsResult,
      explanations: {} as Record<string, string>,
      warnings: [] as string[],
      fallback: true,
      frame_confidence: 0.5, // Fallback confidence indicator
      timestamp: Date.now() / 1000,
    };

    const frameWidth = body.frameWidth || 640;
    const frameHeight = body.frameHeight || 480;

    /* -------------------------------
       SHOULDER TILT (SAFE)
       Using pose landmarks 11 (left shoulder) and 12 (right shoulder)
    --------------------------------*/
    const poseLandmarks = body.poseLandmarks;
    if (poseLandmarks && poseLandmarks.length >= 13) {
      // Handle both formats: array of objects or array of arrays
      let L: { x: number; y: number; visibility?: number } | undefined;
      let R: { x: number; y: number; visibility?: number } | undefined;

      if (Array.isArray(poseLandmarks[11]) && typeof poseLandmarks[11][0] === 'number') {
        // Array format: [[x, y, z, visibility], ...]
        const leftArr = poseLandmarks[11] as number[];
        const rightArr = poseLandmarks[12] as number[];
        L = { x: leftArr[0], y: leftArr[1], visibility: leftArr[3] };
        R = { x: rightArr[0], y: rightArr[1], visibility: rightArr[3] };
      } else {
        // Object format: [{ x, y, visibility }, ...]
        L = poseLandmarks[11] as PoseLandmark;
        R = poseLandmarks[12] as PoseLandmark;
      }

      const leftVis = L?.visibility ?? 1;
      const rightVis = R?.visibility ?? 1;

      if (L && R && leftVis > 0.5 && rightVis > 0.5) {
        const dx = (R.x - L.x) * frameWidth;
        const dy = (R.y - L.y) * frameHeight;

        if (Math.abs(dx) > 1e-3) {
          const angle = Math.abs((Math.atan(dy / dx) * 180) / Math.PI);
          if (angle >= 0 && angle <= 90) {
            result.metrics.shoulder_tilt_deg = Math.round(angle * 10) / 10;
            
            // Derive posture score from shoulder tilt
            if (angle < 3) result.metrics.posture_score = 95;
            else if (angle < 5) result.metrics.posture_score = 85;
            else if (angle < 10) result.metrics.posture_score = 70;
            else if (angle < 15) result.metrics.posture_score = 55;
            else result.metrics.posture_score = 40;

            console.log(`[Fallback] Shoulder tilt: ${result.metrics.shoulder_tilt_deg}°, Posture: ${result.metrics.posture_score}`);
          }
        }
      }
    }

    /* -------------------------------
       HAND ACTIVITY (SAFE)
       Just count hands and compute centroid position
    --------------------------------*/
    const hands = body.hands;
    if (hands && hands.length > 0) {
      result.metrics.hands_detected_count = hands.length;

      const hand = hands[0] as unknown[];
      if (hand && hand.length >= 5) {
        // Handle both formats
        let points: { x: number; y: number }[] = [];
        
        if (Array.isArray(hand[0]) && typeof (hand[0] as number[])[0] === 'number') {
          // Array format: [[x, y, z], ...]
          points = (hand as number[][]).map((p) => ({ x: p[0], y: p[1] }));
        } else {
          // Object format: [{ x, y }, ...]
          points = hand as { x: number; y: number }[];
        }

        const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
        const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

        const norm = Math.sqrt(cx * cx + cy * cy) / Math.sqrt(1 + 1); // Normalized 0-1 range

        if (!Number.isNaN(norm)) {
          result.metrics.hand_activity_normalized = Math.round(norm * 1000) / 1000;
          console.log(`[Fallback] Hand activity: ${result.metrics.hand_activity_normalized}`);
        }
      }
    }

    /* -------------------------------
       HEAD MOVEMENT (SAFE)
       Simple relative position of nose to eye center
    --------------------------------*/
    const faceLandmarks = body.faceLandmarks;
    if (faceLandmarks && faceLandmarks.length >= 264) {
      // Key indices: 1 (nose tip), 33 (left eye), 263 (right eye)
      let nose: { x: number; y: number } | undefined;
      let leftEye: { x: number; y: number } | undefined;
      let rightEye: { x: number; y: number } | undefined;

      if (Array.isArray(faceLandmarks[1]) && typeof faceLandmarks[1][0] === 'number') {
        // Array format: [[x, y, z], ...]
        const noseArr = faceLandmarks[1] as number[];
        const leftArr = faceLandmarks[33] as number[];
        const rightArr = faceLandmarks[263] as number[];
        nose = { x: noseArr[0], y: noseArr[1] };
        leftEye = { x: leftArr[0], y: leftArr[1] };
        rightEye = { x: rightArr[0], y: rightArr[1] };
      } else {
        // Object format: [{ x, y }, ...]
        nose = faceLandmarks[1] as FaceLandmark;
        leftEye = faceLandmarks[33] as FaceLandmark;
        rightEye = faceLandmarks[263] as FaceLandmark;
      }

      if (nose && leftEye && rightEye) {
        const cx = (leftEye.x + rightEye.x) / 2;
        const cy = (leftEye.y + rightEye.y) / 2;

        const dx = (nose.x - cx) * frameWidth;
        const dy = (nose.y - cy) * frameHeight;

        const movement = Math.sqrt(dx * dx + dy * dy) / Math.sqrt(frameWidth ** 2 + frameHeight ** 2);

        if (!Number.isNaN(movement)) {
          result.metrics.head_movement_normalized = Math.round(movement * 1000) / 1000;
          console.log(`[Fallback] Head movement: ${result.metrics.head_movement_normalized}`);
        }
      }
    }

    /* -------------------------------
       ATTENTION (STRICT RULE)
       ❌ NO GAZE / NO SOLVEPNP
       ❌ DO NOT FABRICATE
    --------------------------------*/
    result.metrics.attention_percent = null;
    result.metrics.eye_contact_score = null;
    result.metrics.expression_score = null;
    result.explanations.attention = "not_available_in_fallback";
    result.explanations.eye_contact = "requires_gaze_model";
    result.explanations.expression = "requires_expression_model";
    result.warnings.push("Fallback mode: gaze and expression unavailable");

    console.log('[Fallback] Response:', {
      posture: result.metrics.posture_score,
      shoulderTilt: result.metrics.shoulder_tilt_deg,
      hands: result.metrics.hands_detected_count,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[Fallback] Error:', e);
    return new Response(
      JSON.stringify({ success: false, error: String(e), fallback: true }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
