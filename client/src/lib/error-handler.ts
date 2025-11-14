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

  return {
    message: error?.message || "Unknown error occurred",
    status: 500,
    statusText: "Internal Server Error",
  };
}

export function getErrorMessage(error: any): string {
  const apiError = handleApiError(error);
  
  switch (apiError.status) {
    case 401:
      return "No tienes autorización. Por favor inicia sesión.";
    case 403:
      return "No tienes permisos suficientes para realizar esta acción.";
    case 404:
      return "El recurso solicitado no fue encontrado.";
    case 500:
      return "Error del servidor. Por favor intenta de nuevo más tarde.";
    default:
      return apiError.message;
  }
}

export function is403Error(error: any): boolean {
  const apiError = handleApiError(error);
  return apiError.status === 403;
}
