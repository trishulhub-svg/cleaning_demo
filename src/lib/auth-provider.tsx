"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────

interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
  userType: "customer" | "admin" | "staff";
}

interface Session {
  user: SessionUser;
}

interface UseSessionReturn {
  data: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
  update: () => Promise<Session | null>;
}

// ── Context ────────────────────────────────────────────────────────

const AuthContext = createContext<UseSessionReturn>({
  data: null,
  status: "loading",
  update: async () => null,
});

// ── Provider ───────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [fetched, setFetched] = useState(false);
  const pathname = usePathname();

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setSession(null);
        setStatus("unauthenticated");
        return null;
      }
      const data = await res.json();
      if (data.user) {
        setSession(data);
        setStatus("authenticated");
        return data;
      } else {
        setSession(null);
        setStatus("unauthenticated");
        return null;
      }
    } catch {
      setSession(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  // Initial fetch + polling every 60s
  useEffect(() => {
    if (fetched) return;
    setFetched(true);

    fetchSession();

    // Set up periodic refresh — store ref so cleanup can clear it
    const interval = setInterval(fetchSession, 60_000);
    return () => clearInterval(interval);
  }, [fetchSession, fetched]);

  // Re-fetch session when pathname changes (to pick up cookie changes from server)
  useEffect(() => {
    fetchSession();
  }, [pathname, fetchSession]);

  // Watch for session expiry: if we were authenticated and now we're not,
  // redirect to login (but not from login/register pages themselves)
  useEffect(() => {
    if (status === "unauthenticated" && session === null && fetched) {
      const isAuthPage =
        pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/forgot-password";
      const isPublicPage = pathname === "/" || pathname.startsWith("/services") || pathname.startsWith("/about") || pathname.startsWith("/contact") || pathname.startsWith("/faq") || pathname === "/book";
      // Only redirect if user is on a protected page
      if (!isAuthPage && !isPublicPage && pathname !== "/") {
        // Don't auto-redirect on public pages — just update the UI
      }
    }
  }, [status, session, fetched, pathname]);

  const update = useCallback(async (): Promise<Session | null> => {
    return fetchSession();
  }, [fetchSession]);

  return (
    <AuthContext.Provider value={{ data: session, status, update }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────

export function useSession(): UseSessionReturn {
  return useContext(AuthContext);
}

// ── Sign Out (client-side) ────────────────────────────────────────

export function useSignOut() {
  return useCallback(
    async (options?: { callbackUrl?: string }) => {
      try {
        // Call server-side logout to clear cookies and log activity
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Even if the API call fails, clear cookies client-side
        document.cookie =
          "next-auth.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie =
          "__Secure-next-auth.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }

      // Hard navigation to ensure cookies are fully cleared before the next page loads
      const callbackUrl = options?.callbackUrl || "/login";
      window.location.href = callbackUrl;
    },
    []
  );
}
