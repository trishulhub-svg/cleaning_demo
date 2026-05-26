import { showApiError } from "@/lib/error-store";

// ============ Types ============

interface FetchOptions extends RequestInit {
  /** Skip the automatic error dialog for this request */
  skipErrorDialog?: boolean;
  /** Override the default error title shown in the dialog */
  errorTitle?: string;
  /** Additional context for debugging (e.g., "Creating booking") */
  context?: string;
  /** Expect a JSON response with { success, error? } shape */
  expectJsonSuccess?: boolean;
}

interface ApiResponse<T = unknown> {
  data: T | null;
  ok: boolean;
  status: number;
  error?: string;
}

// ============ Enhanced Fetch Client ============

/**
 * Enhanced fetch wrapper that:
 * - Automatically shows an error dialog for failed requests
 * - Parses JSON responses
 * - Supports the { success, error } response shape used across the API
 *
 * Usage:
 *   const { data, ok } = await apiFetch<{ success: boolean }>('/api/bookings', {
 *     method: 'POST',
 *     body: JSON.stringify({ ... }),
 *     expectJsonSuccess: true,
 *     context: 'Creating booking',
 *   });
 *
 *   if (!ok) return; // Error dialog already shown to user
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    skipErrorDialog = false,
    errorTitle,
    context,
    expectJsonSuccess = false,
    headers: customHeaders,
    ...fetchOptions
  } = options;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...customHeaders,
      },
    });

    // Try to parse the response body
    let body: unknown = null;
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        body = await response.json();
      } catch {
        // Body is not valid JSON — continue with null
      }
    }

    // Handle HTTP-level errors (4xx, 5xx)
    if (!response.ok) {
      const apiMessage = extractErrorMessage(body);
      const message = apiMessage || `Request failed with status ${response.status}`;

      if (!skipErrorDialog) {
        showApiError({
          title: errorTitle || getErrorTitle(response.status),
          error: body ?? { status: response.status, url },
          context: context || `Request to ${url}`,
        });
      }

      return {
        data: null,
        ok: false,
        status: response.status,
        error: message,
      };
    }

    // If expectJsonSuccess, check the { success } field in the response
    if (expectJsonSuccess && body && typeof body === "object") {
      const obj = body as Record<string, unknown>;

      if (obj.success === false) {
        const message =
          (obj.error as string) || (obj.message as string) || "Request failed";

        if (!skipErrorDialog) {
          showApiError({
            title: errorTitle || "Request Failed",
            error: body,
            context: context || `Request to ${url}`,
          });
        }

        return {
          data: body as T,
          ok: false,
          status: response.status,
          error: message,
        };
      }
    }

    return {
      data: body as T,
      ok: true,
      status: response.status,
    };
  } catch (error) {
    // Network errors, CORS issues, aborted requests, etc.
    if (!skipErrorDialog) {
      const isAbort =
        error instanceof DOMException && error.name === "AbortError";

      if (isAbort) {
        // Don't show dialog for intentionally aborted requests
        return { data: null, ok: false, status: 0, error: "Request aborted" };
      }

      showApiError({
        title: errorTitle || "Network Error",
        error,
        context: context || `Request to ${url}`,
      });
    }

    return {
      data: null,
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ============ Helpers ============

/**
 * Extract a human-readable error message from various response shapes.
 */
function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const obj = body as Record<string, unknown>;

  // Common API response shapes
  const message =
    (obj.error as string) ||
    (obj.message as string) ||
    (obj.detail as string) ||
    (obj.error_message as string) ||
    (obj.msg as string) ||
    null;

  return message;
}

/**
 * Map HTTP status codes to user-friendly titles.
 */
function getErrorTitle(status: number): string {
  switch (status) {
    case 400:
      return "Invalid Request";
    case 401:
      return "Session Expired";
    case 403:
      return "Access Denied";
    case 404:
      return "Not Found";
    case 409:
      return "Conflict";
    case 422:
      return "Validation Error";
    case 429:
      return "Too Many Requests";
    case 500:
      return "Server Error";
    case 502:
      return "Server Unavailable";
    case 503:
      return "Service Unavailable";
    default:
      return status >= 500
        ? "Server Error"
        : "Request Failed";
  }
}
