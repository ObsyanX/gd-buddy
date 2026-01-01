// Video Analyzer Proxy Edge Function
// Proxies requests to external Python backend with API key authentication

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BACKEND_URL = 'https://video-analyzer-gd-buddy.onrender.com';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get API key from secrets
  const apiKey = Deno.env.get('VIDEO_ANALYZER_API_KEY');
  if (!apiKey) {
    console.error('[Proxy] VIDEO_ANALYZER_API_KEY not configured');
    return new Response(
      JSON.stringify({ success: false, error: 'API key not configured', backend_unreachable: true }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse incoming request
    const requestData = await req.json() as Record<string, unknown>;
    console.log('[Proxy] Received request with keys:', Object.keys(requestData));

    // Extract base64 image - check common field names
    let base64Image: string | null = null;
    const possibleFields = ['image', 'frame', 'base64', 'imageData', 'data'];
    
    for (const field of possibleFields) {
      const value = requestData[field];
      if (value && typeof value === 'string') {
        base64Image = value;
        console.log(`[Proxy] Found base64 in field: ${field}`);
        break;
      }
    }

    // Also check for base64-looking strings in any field
    if (!base64Image) {
      for (const [key, value] of Object.entries(requestData)) {
        if (typeof value === 'string' && value.length > 100) {
          base64Image = value;
          console.log(`[Proxy] Found long string in field: ${key}`);
          break;
        }
      }
    }

    if (!base64Image) {
      console.error('[Proxy] No base64 image found in request');
      return new Response(
        JSON.stringify({ success: false, error: 'No image data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove data URL prefix if present
    let cleanBase64 = base64Image;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
      console.log('[Proxy] Stripped data URL prefix');
    }

    // Build the EXACT payload the backend expects: { "image": base64 }
    const backendPayload = { image: cleanBase64 };

    console.log('[Proxy] Sending to backend /analyze/base64');
    console.log('[Proxy] Payload keys:', Object.keys(backendPayload));
    console.log('[Proxy] Image length:', cleanBase64.length);

    // Send to backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${BACKEND_URL}/analyze/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(backendPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log('[Proxy] Backend status:', response.status);

    if (!response.ok) {
      console.error('[Proxy] Backend error:', responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseText,
          backend_unreachable: response.status >= 500
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and return backend response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('[Proxy] Failed to parse backend response');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid backend response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Proxy] Success - frame:', data.frame, 'confidence:', data.frame_confidence);

    return new Response(
      JSON.stringify({ ...data, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Proxy] Error:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        backend_unreachable: true
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
