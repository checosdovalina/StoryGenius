import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getErrorMessage } from "./error-handler";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let backendMessage: string | undefined;
    const contentType = res.headers.get("content-type");
    
    try {
      if (contentType?.includes("application/json")) {
        const json = await res.json();
        // Try common error message keys
        const rawMessage = json.message || json.error || json.detail || json.errors;
        
        // Normalize to string (handle objects/arrays)
        if (typeof rawMessage === 'string') {
          backendMessage = rawMessage;
        } else if (rawMessage && typeof rawMessage === 'object') {
          // Convert error objects to readable strings
          if (Array.isArray(rawMessage)) {
            backendMessage = rawMessage.join(', ');
          } else {
            backendMessage = Object.values(rawMessage).flat().join(', ');
          }
        }
      } else {
        // Fallback to text for non-JSON responses
        const text = await res.text();
        if (text && text !== res.statusText) {
          backendMessage = text;
        }
      }
    } catch {
      // Parsing failed, backendMessage remains undefined
    }
    
    // Create error with user-friendly message (prioritizes backend message when available)
    const error = new Error(getErrorMessage(res, backendMessage));
    // Store original details for debugging
    (error as any).status = res.status;
    (error as any).backendMessage = backendMessage;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
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
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
