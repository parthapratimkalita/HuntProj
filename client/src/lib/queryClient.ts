import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { apiUrl } from "@/lib/api";

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

// ✅ FIXED: Updated apiRequest function to handle FormData properly
export async function apiRequest(
  method: string,
  path: string, // <-- rename 'url' to 'path'
  data?: unknown | undefined,
): Promise<Response> {
  // Get JWT token from Supabase instead of localStorage
  const token = await getSupabaseToken();
  
  // Create headers object with Authorization if token exists
  const headers: Record<string, string> = {};
  
  // ✅ CRITICAL FIX: Only set Content-Type for JSON data, NOT for FormData
  // FormData needs the browser to set Content-Type with proper boundary
  if (data && !(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  console.log('API Request DEBUG:', {
    method,
    path,
    hasToken: !!token,
    tokenLength: token?.length,
    isFormData: data instanceof FormData,
    contentType: headers["Content-Type"] || "auto (FormData boundary)",
    dataType: data?.constructor?.name
  });

  // ✅ FIXED: Handle body properly for both FormData and JSON
  let body: string | FormData | undefined;
  if (data instanceof FormData) {
    body = data; // Send FormData directly
  } else if (data) {
    body = JSON.stringify(data); // Stringify non-FormData
  } else {
    body = undefined; // No body for GET requests
  }

  const fullUrl = apiUrl(path);

  const res = await fetch(fullUrl, {
    method,
    headers,
    body
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

    // Extract path from queryKey[0] - this should be just the path, not full URL
    const path = queryKey[0] as string;
    
    // ✅ CRITICAL FIX: Use apiUrl() to construct the full URL
    let finalUrl = apiUrl(path);
    
    // Check if there are query parameters in queryKey[1]
    if (queryKey.length > 1 && typeof queryKey[1] === 'object') {
      // Convert query parameters to URL search params
      const params = new URLSearchParams();
      const queryParams = queryKey[1] as Record<string, any>;
      
      // Build query string
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      
      // Append query string to URL
      const queryString = params.toString();
      if (queryString) {
        finalUrl = `${finalUrl}?${queryString}`;
      }
    }

    console.log("Query Function DEBUG:", {
      path,
      finalUrl,
      hasToken: !!token,
      tokenLength: token?.length,
      baseUrl: import.meta.env.VITE_API_BASE_URL
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