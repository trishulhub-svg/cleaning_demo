"use client";

import { LogOut } from "lucide-react";
import { useSignOut } from "@/lib/auth-provider";

export function StaffLogoutButton() {
  const signOut = useSignOut();

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
      title="Logout"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden lg:inline">Logout</span>
    </button>
  );
}
