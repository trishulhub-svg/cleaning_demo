"use client";

import * as React from "react";
import { useErrorStore, type AppError } from "@/lib/error-store";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Terminal,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============ Error Dialog Component ============

export function ErrorDialog() {
  const { currentError, dismissError, errorHistory } = useErrorStore();
  const [showDetails, setShowDetails] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Reset detail expansion when error changes
  React.useEffect(() => {
    setShowDetails(false);
    setCopied(false);
  }, [currentError?.timestamp]);

  const handleCopy = async () => {
    if (!currentError) return;

    const text = buildErrorText(currentError);

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Error details copied to clipboard");
      // Reset copied state after 2s
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers or non-secure contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        toast.success("Error details copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Failed to copy to clipboard");
      }
      document.body.removeChild(textarea);
    }
  };

  const handleDismiss = () => {
    dismissError();
  };

  if (!currentError) return null;

  const isError = currentError.severity !== "warning";
  const Icon = isError ? AlertCircle : AlertTriangle;
  const hasDetails = !!(
    currentError.details ||
    currentError.key ||
    errorHistory.length > 0
  );

  return (
    <Dialog
      open={!!currentError}
      onOpenChange={(open) => {
        if (!open) handleDismiss();
      }}
    >
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header with colored accent */}
        <div
          className={`px-6 pt-6 pb-4 ${
            isError
              ? "border-b border-red-100"
              : "border-b border-amber-100"
          }`}
        >
          <DialogHeader className="space-y-3">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isError ? "bg-red-100" : "bg-amber-100"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isError ? "text-red-600" : "text-amber-600"
                  }`}
                />
              </div>
              <div className="flex-1 space-y-1">
                <DialogTitle className="text-lg">
                  {currentError.title}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {currentError.message}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Expandable details section */}
        {hasDetails && (
          <div className="border-b border-border">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between gap-2 px-6 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5" />
                <span>
                  Technical Details
                  {errorHistory.length > 1 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {errorHistory.length} errors
                    </Badge>
                  )}
                </span>
              </div>
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showDetails && (
              <div className="px-6 pb-4">
                <ScrollArea className="max-h-64 rounded-lg border bg-muted/50">
                  <div className="p-4 space-y-3">
                    {/* Error metadata */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {new Date(currentError.timestamp).toLocaleString()}
                      </span>
                      {currentError.key && (
                        <>
                          <span className="text-muted-400">·</span>
                          <Badge
                            variant="outline"
                            className="text-xs font-mono px-1.5 py-0"
                          >
                            {currentError.key}
                          </Badge>
                        </>
                      )}
                    </div>

                    {/* Main error details */}
                    {currentError.details && (
                      <pre className="whitespace-pre-wrap break-words text-xs font-mono text-muted-foreground leading-relaxed bg-background rounded-md p-3 border">
                        {currentError.details}
                      </pre>
                    )}

                    {/* Error history (if multiple) */}
                    {errorHistory.length > 1 && (
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground">
                          Recent errors ({errorHistory.length}):
                        </p>
                        <div className="space-y-1.5">
                          {errorHistory.slice(0, 5).map((err, i) => (
                            <div
                              key={err.timestamp + "-" + i}
                              className="text-xs font-mono text-muted-foreground bg-background rounded p-2 border"
                            >
                              <span className="text-muted-400">
                                {new Date(err.timestamp).toLocaleTimeString()}
                              </span>{" "}
                              — {err.title}: {err.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <DialogFooter className="px-6 py-4 gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Details
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleDismiss}
            className={isError ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Helpers ============

/**
 * Build a plain-text representation of the error for clipboard.
 */
function buildErrorText(error: AppError): string {
  const lines: string[] = [];

  lines.push(`=== ${error.title} ===`);
  lines.push(`Message: ${error.message}`);
  lines.push(`Severity: ${error.severity || "error"}`);
  lines.push(`Time: ${new Date(error.timestamp).toLocaleString()}`);

  if (error.key) {
    lines.push(`Key: ${error.key}`);
  }

  if (error.details) {
    lines.push(``);
    lines.push(`--- Details ---`);
    lines.push(error.details);
  }

  // Append browser/URL info for debugging
  if (typeof window !== "undefined") {
    lines.push(``);
    lines.push(`--- Environment ---`);
    lines.push(`URL: ${window.location.href}`);
    lines.push(`User Agent: ${navigator.userAgent}`);
  }

  return lines.join("\n");
}
