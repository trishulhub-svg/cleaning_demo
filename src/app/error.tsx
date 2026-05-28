"use client";

import { useEffect } from "react";
import { useErrorStore } from "@/lib/error-store";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

/**
 * Next.js error boundary — catches runtime errors within the route segment.
 * Shows the error in a dialog + a full-page fallback UI.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { showError } = useErrorStore();

  useEffect(() => {
    // Show the error in the global error dialog
    showError({
      title: "Application Error",
      message: error.message || "An unexpected error occurred.",
      details: error.stack,
      key: error.digest || undefined,
      severity: "error",
    });

    // Log to console for developer tools
    console.error("[ErrorBoundary]", error);
  }, [error, showError]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {error.message || "An unexpected error occurred. The error details have been captured — you can copy them from the error dialog."}
          </p>
        </div>
        <Button
          onClick={() => {
            // Dismiss the error dialog and retry
            useErrorStore.getState().dismissError();
            reset();
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
