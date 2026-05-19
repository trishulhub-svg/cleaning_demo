import { signOut } from "next-auth"
import { redirect } from "next/navigation"

export default async function LogoutPage() {
  // Immediately sign out and redirect to home
  await signOut({ redirect: false })
  redirect("/")
}
