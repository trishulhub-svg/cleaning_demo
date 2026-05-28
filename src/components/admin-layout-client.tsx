"use client";

import { ErrorDialog } from "@/components/error-dialog";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ErrorDialog />
    </>
  );
}
