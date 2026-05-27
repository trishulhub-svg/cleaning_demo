import { requireAuth } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { SettingsPageClient } from "./settings-client"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const admin = await requireAuth(["admin"])

  if (admin.role !== "super_admin") {
    redirect("/admin")
  }

  return <SettingsPageClient />
}
