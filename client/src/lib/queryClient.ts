import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';

// Helper function to get current Supabase token
async function getSupabaseToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting Supabase token:', error);
    return null;
  }
}

// Helper function to clear localStorage when there's a database change
export function clearStoredAuthToken() {
  // Clear Supabase session instead of localStorage
  supabase.auth.signOut();
  console.log('Supabase session cleared due to auth error');
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // If authentication fails, clear the Supabase session
    if (res.status === 401) {
      clearStoredAuthToken();
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get JWT token from Supabase instead of localStorage
  const token = await getSupabaseToken();
  
  // Create headers object with Authorization if token exists
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  console.log('API Request DEBUG:', {
    method,
    url,
    hasToken: !!token,
    tokenLength: token?.length
  });

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get JWT token from Supabase instead of localStorage
    const token = await getSupabaseToken();
    
    // Create headers object with Authorization if token exists
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Extract URL from queryKey[0]
    const url = queryKey[0] as string;
    
    // Check if there are query parameters in queryKey[1]
    let finalUrl = url;
    if (queryKey.length > 1 && typeof queryKey[1] === 'object') {
      // Convert query parameters to URL search params
      const params = new URLSearchParams();
      const queryParams = queryKey[1] as Record<string, any>;
      
      // Build query string
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      
      // Append query string to URL
      const queryString = params.toString();
      if (queryString) {
        finalUrl = `${url}?${queryString}`;
      }
    }

    console.log("Query Function DEBUG:", {
      url: finalUrl,
      hasToken: !!token,
      tokenLength: token?.length
    });

    const res = await fetch(finalUrl, {
      headers,
    });

    if (res.status === 401) {
      // Clear Supabase session if auth fails
      clearStoredAuthToken();
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
      retry: 2, // Increase retries for better reliability
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnMount: false, // Don't refetch if data is still fresh
    },
    mutations: {
      retry: 2, // Increase retries for mutations
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});