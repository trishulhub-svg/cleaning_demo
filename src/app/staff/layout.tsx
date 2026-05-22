import { requireAuth } from "@/lib/auth-helpers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf, LogOut, UserCircle } from "lucide-react";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let staff;
  try {
    staff = await requireAuth(["staff"]);
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Green accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-green-600 via-emerald-500 to-green-600" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
                <Leaf className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">
                  Staff Portal
                </h1>
                <p className="text-[11px] text-gray-500 leading-tight hidden sm:block">
                  GreenLeaf Cleaning Services
                </p>
              </div>
            </div>

            {/* Right: User info & Logout */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-green-700">
                    {staff.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 leading-tight">
                    {staff.name}
                  </span>
                  <span className="text-[11px] text-gray-500 leading-tight capitalize">
                    {staff.role}
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-gray-200" />

              <Link
                href="/staff/profile"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100"
                title="My Profile"
              >
                <UserCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>

              <Link
                href="/logout"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
