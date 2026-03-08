import { supabase } from "@/integrations/supabase/client";

/**
 * Get auth headers for edge function calls
 * This ensures all edge function calls include proper JWT authentication
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    return {
      Authorization: `Bearer ${session.access_token}`
    };
  }
  
  return {};
};

/**
 * Invoke an edge function with authentication
 * Wraps supabase.functions.invoke with automatic auth header injection
 */
export const invokeWithAuth = async <T = any>(
  functionName: string,
  options?: { body?: Record<string, any> }
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const headers = await getAuthHeaders();
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      headers,
      body: options?.body
    });
    
    if (error) {
      return { data: null, error };
    }
    
    // Handle structured payload errors, but allow text-to-speech fallback payloads
    if (data && typeof data === 'object' && 'error' in data && !('audioContent' in data)) {
      const isTtsFallback = functionName === 'text-to-speech' && ((data as any).fallback === true);
      if (!isTtsFallback) {
        return { data: null, error: new Error((data as any).error || 'Function error') };
      }
    }
    
    return { data: data as T, error: null };
  } catch (err: any) {
    // Silently handle all edge function errors - never let them propagate as unhandled
    const message = err?.message || err?.context?.body || 'Edge function error';
    return { 
      data: null, 
      error: new Error(typeof message === 'string' ? message : JSON.stringify(message))
    };
  }
};
