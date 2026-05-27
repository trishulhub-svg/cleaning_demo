import { requireAuth } from "@/lib/auth-helpers";
import { AdminSidebar } from "@/components/admin-sidebar";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let admin;
  try {
    admin = await requireAuth(["admin"]);
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar adminName={admin.name} adminRole={admin.role} />
      <main className="lg:pl-64">
        <div className="pt-14 lg:pt-0">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
