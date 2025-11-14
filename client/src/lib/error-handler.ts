/**
 * HTTP Error Handler
 * Provides centralized error handling for API requests
 */

export interface ApiError {
  message: string;
  status: number;
  statusText: string;
}

export function handleApiError(error: any): ApiError {
  if (error instanceof Response) {
    return {
      message: error.statusText || "Request failed",
      status: error.status,
      statusText: error.statusText,
    };
  }
  
  if (error?.response) {
    return {
      message: error.response.statusText || "Request failed",
      status: error.response.status,
      statusText: error.response.statusText,
    };
  }

  // Check if error has HTTP status attached by throwIfResNotOk
  if (error?.status && typeof error.status === 'number') {
    // Use error.message which already contains the user-friendly message
    // Keep statusText as a generic label so effectiveMessage calculation works
    return {
      message: error.message || "Request failed",
      status: error.status,
      statusText: `HTTP ${error.status}`,
    };
  }

  return {
    message: error?.message || "Unknown error occurred",
    status: 500,
    statusText: "Internal Server Error",
  };
}

export function getErrorMessage(error: any, backendMessage?: string): string {
  const apiError = handleApiError(error);
  
  // Use provided backendMessage parameter or fall back to message from apiError
  const effectiveMessage = backendMessage || (apiError.message !== apiError.statusText ? apiError.message : undefined);
  
  // If backend provided a specific message, use it for certain errors
  if (effectiveMessage && effectiveMessage !== apiError.statusText) {
    // For 4xx errors (client errors), prefer backend message as it's usually validation/business logic
    if (apiError.status >= 400 && apiError.status < 500 && apiError.status !== 401 && apiError.status !== 403 && apiError.status !== 404) {
      return effectiveMessage;
    }
  }
  
  switch (apiError.status) {
    case 401:
      return effectiveMessage || "No tienes autorización. Por favor inicia sesión.";
    case 403:
      return effectiveMessage || "No tienes permisos suficientes para realizar esta acción.";
    case 404:
      return effectiveMessage || "El recurso solicitado no fue encontrado.";
    case 500:
      return "Error del servidor. Por favor intenta de nuevo más tarde.";
    default:
      return effectiveMessage || apiError.message;
  }
}

export function is403Error(error: any): boolean {
  const apiError = handleApiError(error);
  return apiError.status === 403;
}
