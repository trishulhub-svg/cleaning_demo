"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Sparkles,
  BarChart3,
  RotateCcw,
  UserCircle,
  LogOut,
  Menu,
  X,
  Leaf,
  CircleHelp,
  ScrollText,
  CalendarClock,
  Settings,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSignOut } from "@/lib/auth-provider";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
  { label: "Today's Bookings", href: "/admin/todays-bookings", icon: CalendarClock },
  { label: "Staff", href: "/admin/staff", icon: Users },
  { label: "Services", href: "/admin/services", icon: Sparkles },
  { label: "FAQs", href: "/admin/faqs", icon: CircleHelp },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Refunds", href: "/admin/refunds", icon: RotateCcw },
  { label: "Customers", href: "/admin/customers", icon: UserCircle },
  { label: "Activity Logs", href: "/admin/logs", icon: ScrollText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const superAdminOnlyItems = new Set(["/admin/settings"]);

export function AdminSidebar({ adminName, adminRole }: { adminName: string; adminRole: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const signOut = useSignOut();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">GreenLeaf</p>
          <p className="text-xs text-gray-400">Admin Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems
          .filter((item) => !superAdminOnlyItems.has(item.href) || adminRole === "super_admin")
          .map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-green-600/20 text-green-400"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-green-400")} />
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-3">
        <div className="mb-3 px-3 py-2">
          <p className="text-xs text-gray-400">Logged in as</p>
          <p className="truncate text-sm font-medium text-white">{adminName}</p>
        </div>
        <Link
          href="/change-password"
          onClick={() => setMobileOpen(false)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <KeyRound className="h-4 w-4" />
          Change Password
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-red-900/30 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b border-gray-200 bg-gray-900 px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-green-600">
            <Leaf className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-bold text-white">GreenLeaf Admin</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-gray-900 transition-transform duration-200 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:bg-gray-900">
        {sidebarContent}
      </aside>
    </>
  );
}
