"use client";

import { AuthProvider } from "@/lib/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorDialog } from "@/components/error-dialog";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" richColors />
      <ErrorDialog />
    </AuthProvider>
  );
}
