import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function LogoutPage() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('next-auth.session-token')
    cookieStore.delete('__Secure-next-auth.session-token')
  } catch {
    // Cookies might already be cleared
  }

  redirect('/login')
}
