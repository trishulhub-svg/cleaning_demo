"use client";

import { useEffect } from "react";

/**
 * Next.js global error boundary — catches errors in the root layout.
 * Falls back to a minimal HTML page since the root layout itself may be broken.
 *
 * Note: This file must be a minimal client component because the root layout
 * is broken when this boundary triggers — Tailwind, fonts, and context providers
 * may not be available.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error — can't use the error store since providers aren't mounted
    console.error("[GlobalErrorBoundary]", error);
  }, [error]);

  const errorText = [
    `=== Application Error ===`,
    `Message: ${error.message}`,
    `Digest: ${error.digest || "N/A"}`,
    ``,
    `Stack Trace:`,
    error.stack || "No stack trace available",
    ``,
    `--- Environment ---`,
    `URL: ${typeof window !== "undefined" ? window.location.href : "N/A"}`,
    `Time: ${new Date().toISOString()}`,
    `User Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`,
  ].join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorText);
      const btn = document.getElementById("copy-btn");
      if (btn) {
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = "Copy Error Details";
        }, 2000);
      }
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = errorText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#f9fafb",
          color: "#111827",
        }}
      >
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              textAlign: "center",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "2.5rem",
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "#fef2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "28px",
                  lineHeight: 1,
                }}
              >
                ⚠️
              </span>
            </div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                margin: "0 0 0.75rem",
                color: "#111827",
              }}
            >
              Application Error
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                lineHeight: 1.6,
                margin: "0 0 1.5rem",
              }}
            >
              {error.message || "An unexpected error occurred."}
            </p>

            {error.stack && (
              <details
                style={{
                  textAlign: "left",
                  marginBottom: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    padding: "0.75rem 1rem",
                    backgroundColor: "#f9fafb",
                    cursor: "pointer",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "#374151",
                    userSelect: "none",
                  }}
                >
                  Stack Trace
                </summary>
                <pre
                  style={{
                    margin: 0,
                    padding: "1rem",
                    fontSize: "0.75rem",
                    lineHeight: 1.5,
                    fontFamily: "monospace",
                    color: "#6b7280",
                    backgroundColor: "#f9fafb",
                    overflow: "auto",
                    maxHeight: "200px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {error.stack}
                </pre>
              </details>
            )}

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                id="copy-btn"
                onClick={handleCopy}
                style={{
                  padding: "0.625rem 1.25rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Copy Error Details
              </button>
              <button
                onClick={() => reset()}
                style={{
                  padding: "0.625rem 1.25rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
