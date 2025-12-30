import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { analyzeFrame } from "./analyzer.ts";
import { FrameRequest, FrameResponse } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json() as FrameRequest;

    // Validate request structure
    if (!body.landmarks) {
      console.log('analyze-frame: Missing landmarks in request');
      return new Response(
        JSON.stringify({
          metrics: null,
          frame_confidence: 0,
          explanations: { error: "missing_landmarks" },
          warnings: ["No landmark data provided"],
          next_state: {
            face_landmarks: null,
            hand_landmarks: null,
            pose_landmarks: null,
            timestamp: body.timestamp || Date.now()
          }
        } satisfies FrameResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('analyze-frame: Processing frame', {
      timestamp: body.timestamp,
      has_face: !!body.landmarks.face,
      has_hands: !!body.landmarks.hands?.length,
      has_pose: !!body.landmarks.pose,
      frame_confidence: body.landmarks.frame_confidence
    });

    // Run analysis
    const result = analyzeFrame(body);

    console.log('analyze-frame: Analysis complete', {
      has_metrics: !!result.metrics,
      frame_confidence: result.frame_confidence,
      explanations: Object.keys(result.explanations),
      warnings_count: result.warnings.length
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('analyze-frame: Error processing request:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        metrics: null,
        frame_confidence: 0,
        explanations: { error: errorMessage },
        warnings: ["Processing error occurred"],
        next_state: {
          face_landmarks: null,
          hand_landmarks: null,
          pose_landmarks: null,
          timestamp: Date.now()
        }
      } satisfies FrameResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
