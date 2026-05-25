"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function LogoutPage() {
  useEffect(() => {
    // Call the logout API to clear cookies and log activity,
    // then do a hard navigation to /login
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    })
      .catch(() => {
        // Fallback: clear cookies client-side if API fails
        document.cookie =
          "next-auth.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie =
          "__Secure-next-auth.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      })
      .finally(() => {
        window.location.href = "/login";
      });
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Signing out...</p>
      </div>
    </div>
  );
}
