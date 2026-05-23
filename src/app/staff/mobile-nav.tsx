"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LayoutDashboard, UserCircle, LogOut, ScrollText } from "lucide-react";
import { useSignOut } from "@/lib/auth-provider";

interface StaffMobileNavProps {
  staffName: string;
  staffRole: string;
  initials: string;
}

export function StaffMobileNav({ staffName, staffRole, initials }: StaffMobileNavProps) {
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();

  const handleLogout = () => {
    setOpen(false);
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        {open ? (
          <X className="h-5 w-5 text-gray-700" />
        ) : (
          <Menu className="h-5 w-5 text-gray-700" />
        )}
      </button>

      {open && (
        <div className="absolute top-14 left-0 right-0 bg-white border-b shadow-lg z-50">
          <div className="px-4 py-3 space-y-1">
            {/* User info */}
            <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-gray-50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-green-700">{initials}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{staffName}</p>
                <p className="text-xs text-gray-500 capitalize">{staffRole}</p>
              </div>
            </div>

            {/* Nav links */}
            <Link
              href="/staff"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/staff/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            >
              <UserCircle className="h-4 w-4" />
              Profile
            </Link>
            <Link
              href="/staff/activity-logs"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            >
              <ScrollText className="h-4 w-4" />
              Activity Logs
            </Link>

            <div className="border-t my-2" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
