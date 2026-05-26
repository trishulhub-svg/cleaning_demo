import { create } from "zustand";

// ============ Types ============

export interface AppError {
  /** Short, human-readable error title */
  title: string;
  /** Detailed error message */
  message: string;
  /** Optional stack trace or raw error data for debugging */
  details?: string;
  /** Severity level — controls dialog styling */
  severity?: "error" | "warning";
  /** Auto-dismiss after N ms (0 = manual dismiss only) */
  autoClose?: number;
  /** Unique key to prevent duplicate errors */
  key?: string;
  /** Timestamp of when the error was raised */
  timestamp: number;
}

interface ErrorStore {
  /** Currently displayed error (null = dialog closed) */
  currentError: AppError | null;
  /** History of all errors in this session (for debugging) */
  errorHistory: AppError[];

  /** Show an error dialog */
  showError: (error: Omit<AppError, "timestamp">) => void;
  /** Dismiss the current error dialog */
  dismissError: () => void;
  /** Clear all error history */
  clearHistory: () => void;
}

// ============ Store ============

export const useErrorStore = create<ErrorStore>((set) => ({
  currentError: null,
  errorHistory: [],

  showError: (error) => {
    const fullError: AppError = {
      ...error,
      timestamp: Date.now(),
    };

    set((state) => {
      // If same key, update existing error instead of adding duplicate
      if (error.key && state.currentError?.key === error.key) {
        return {
          currentError: fullError,
        };
      }
      return {
        currentError: fullError,
        errorHistory: [fullError, ...state.errorHistory].slice(0, 50), // Keep last 50
      };
    });

    // Auto-dismiss if configured
    if (error.autoClose && error.autoClose > 0) {
      setTimeout(() => {
        set((state) => {
          if (
            state.currentError?.timestamp === fullError.timestamp
          ) {
            return { currentError: null };
          }
          return {};
        });
      }, error.autoClose);
    }
  },

  dismissError: () => {
    set({ currentError: null });
  },

  clearHistory: () => {
    set({ errorHistory: [] });
  },
}));

// ============ Convenience Helpers ============

/**
 * Show a standard API error in the dialog.
 * Extracts useful information from fetch responses and Error objects.
 */
export function showApiError(options: {
  title?: string;
  error: unknown;
  context?: string;
}) {
  const { title = "Something went wrong", error, context } = options;

  let message = "An unexpected error occurred. Please try again.";
  let details: string | undefined;

  if (error instanceof Error) {
    message = error.message || message;
    details = error.stack;
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object") {
    // Handle API response shapes: { error: string }, { message: string }, etc.
    const obj = error as Record<string, unknown>;
    message =
      (obj.error as string) ||
      (obj.message as string) ||
      (obj.detail as string) ||
      message;
    // Include full response for debugging
    try {
      details = JSON.stringify(obj, null, 2);
    } catch {
      details = String(obj);
    }
  }

  if (context) {
    details = details
      ? `Context: ${context}\n\n${details}`
      : `Context: ${context}`;
  }

  useErrorStore.getState().showError({
    title,
    message,
    details,
    severity: "error",
  });
}

/**
 * Show a warning in the dialog.
 */
export function showWarning(options: {
  title?: string;
  message: string;
  details?: string;
  autoClose?: number;
}) {
  useErrorStore.getState().showError({
    title: options.title || "Warning",
    message: options.message,
    details: options.details,
    severity: "warning",
    autoClose: options.autoClose,
  });
}
