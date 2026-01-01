// Video Analyzer Proxy Edge Function
// Proxies requests to external Python backend with API key authentication
// This keeps the API key secure on the server side

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTERNAL_BACKEND_URL = 'https://video-analyzer-gd-buddy.onrender.com';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('VIDEO_ANALYZER_API_KEY');
  if (!apiKey) {
    console.error('[Proxy] VIDEO_ANALYZER_API_KEY not configured');
    return new Response(
      JSON.stringify({ success: false, error: 'API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/video-analyzer-proxy', '') || '/analyze/base64';
    
    console.log(`[Proxy] Forwarding to ${EXTERNAL_BACKEND_URL}${path}`);

    const body = await req.json();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(`${EXTERNAL_BACKEND_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Backend error ${response.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Backend returned ${response.status}`,
          details: errorText 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('[Proxy] Success - frame:', data.frame, 'confidence:', data.frame_confidence);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Proxy] Error:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        backend_unreachable: true
      }),
      { 
        status: 503, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
