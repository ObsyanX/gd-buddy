import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoMetricsPayload {
  session_id: string;
  posture_score: number;
  eye_contact_score: number;
  expression_score: number;
  video_tips: string[];
  // Audio metrics
  voice_score?: number;
  words_per_min?: number;
  avg_pause_s?: number;
  filler_count?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify auth
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: VideoMetricsPayload = await req.json();
    console.log('Received video metrics for session:', payload.session_id);

    // Validate required fields
    if (!payload.session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to update metrics
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if metrics exist for this session
    const { data: existingMetrics } = await supabase
      .from('gd_metrics')
      .select('id')
      .eq('session_id', payload.session_id)
      .single();

    const metricsData = {
      session_id: payload.session_id,
      posture_score: payload.posture_score,
      eye_contact_score: payload.eye_contact_score,
      expression_score: payload.expression_score,
      video_tips: payload.video_tips,
      voice_score: payload.voice_score,
      words_per_min: payload.words_per_min,
      avg_pause_s: payload.avg_pause_s,
      filler_count: payload.filler_count,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingMetrics) {
      // Update existing metrics
      result = await supabase
        .from('gd_metrics')
        .update(metricsData)
        .eq('id', existingMetrics.id)
        .select()
        .single();
    } else {
      // Insert new metrics
      result = await supabase
        .from('gd_metrics')
        .insert(metricsData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Database error:', result.error);
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully saved video metrics:', result.data.id);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        metrics_id: result.data.id,
        message: existingMetrics ? 'Metrics updated' : 'Metrics created'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing video analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
