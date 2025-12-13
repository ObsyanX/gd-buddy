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
    
    return { data: data as T, error: null };
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error') 
    };
  }
};
