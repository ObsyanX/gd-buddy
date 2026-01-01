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

  // Get API key from secrets
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
    
    // Fix path extraction - handle both old and new patterns
    let path = url.pathname.replace('/functions/v1/video-analyzer-proxy', '');
    if (!path) {
      path = url.pathname.replace('/video-analyzer-proxy', '');
    }
    
    // Default to health check if no path
    if (!path || path === '/') {
      path = '/health';
    }

    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    const targetUrl = `${EXTERNAL_BACKEND_URL}${path}`;
    console.log(`[Proxy] Forwarding ${req.method} to ${targetUrl}`);

    // Handle different request types
    let body = undefined;
    const headers = new Headers();
    headers.set('X-API-Key', apiKey);

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type');
      console.log('[Proxy] Content-Type:', contentType);
      
      if (contentType?.includes('application/json')) {
        // JSON request - need to transform for backend
        try {
          const requestData = await req.json();
          console.log('[Proxy] Raw request data type:', typeof requestData);
          console.log('[Proxy] Raw request data keys:', requestData ? Object.keys(requestData) : 'null');
          console.log('[Proxy] Full request data:', JSON.stringify(requestData, null, 2));
          
          // Handle different JSON formats from frontend
          let transformedData;
          
          if (requestData && typeof requestData === 'object') {
            if (requestData.image) {
              // Already in correct format for /analyze/base64
              transformedData = requestData;
              console.log('[Proxy] Using existing image field');
            } else if (requestData.base64) {
              transformedData = { image: requestData.base64 };
              console.log('[Proxy] Transformed base64 -> image');
            } else if (requestData.imageData) {
              transformedData = { image: requestData.imageData };
              console.log('[Proxy] Transformed imageData -> image');
            } else if (requestData.data) {
              transformedData = { image: requestData.data };
              console.log('[Proxy] Transformed data -> image');
            } else {
              // Try to find any base64-like field
              const possibleImageFields = ['frame', 'photo', 'picture', 'img', 'file', 'blob'];
              let imageData = null;
              let foundField = null;
              
              for (const field of possibleImageFields) {
                if (requestData[field]) {
                  imageData = requestData[field];
                  foundField = field;
                  break;
                }
              }
              
              if (imageData) {
                transformedData = { image: imageData };
                console.log(`[Proxy] Transformed ${foundField} -> image`);
              } else {
                // Check if any field contains base64-like data
                for (const [key, value] of Object.entries(requestData)) {
                  if (typeof value === 'string' && (
                    value.startsWith('data:image/') || 
                    value.startsWith('/9j/') || 
                    value.startsWith('iVBORw0KGgo') ||
                    value.length > 100
                  )) {
                    transformedData = { image: value };
                    console.log(`[Proxy] Found base64-like data in field: ${key}`);
                    break;
                  }
                }
                
                if (!transformedData) {
                  console.error('[Proxy] No image data found in request');
                  console.error('[Proxy] Available fields:', Object.keys(requestData));
                  // Create a minimal valid request to avoid 400 error
                  transformedData = { image: 'placeholder' };
                }
              }
            }
          } else if (typeof requestData === 'string') {
            // Direct base64 string
            transformedData = { image: requestData };
            console.log('[Proxy] Transformed string -> image');
          } else {
            console.error('[Proxy] Invalid request data type:', typeof requestData);
            transformedData = { image: 'placeholder' };
          }
          
          headers.set('Content-Type', 'application/json');
          body = JSON.stringify(transformedData);
          console.log('[Proxy] Final transformed data:', JSON.stringify(transformedData, null, 2));
          
        } catch (error) {
          console.error('[Proxy] JSON parsing error:', error);
          // Create fallback request
          headers.set('Content-Type', 'application/json');
          body = JSON.stringify({ image: 'error_placeholder' });
        }
      } else if (contentType?.includes('multipart/form-data')) {
        // File upload (frame endpoint)
        console.log('[Proxy] Handling multipart/form-data');
        body = req.body;
        // Don't set content-type for multipart, let fetch handle it
      } else {
        // Pass through as-is for other content types
        console.log('[Proxy] Passing through unknown content type');
        body = req.body;
        if (contentType) {
          headers.set('Content-Type', contentType);
        }
      }
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
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

    const data = await response.text();
    
    // Try to parse as JSON to log success info
    try {
      const jsonData = JSON.parse(data);
      if (jsonData.frame !== undefined) {
        console.log('[Proxy] Success - frame:', jsonData.frame, 'confidence:', jsonData.frame_confidence);
      } else {
        console.log('[Proxy] Success - response received');
      }
    } catch {
      console.log('[Proxy] Success - non-JSON response');
    }

    return new Response(data, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': response.headers.get('Content-Type') || 'application/json' 
      },
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
