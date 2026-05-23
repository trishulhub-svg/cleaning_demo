import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth-helpers'
import { logAuthActivity } from '@/lib/activity-logger'

export default async function LogoutPage() {
  const cookieStore = await cookies()

  // Try to log who logged out (fire-and-forget)
  try {
    const session = await getAuthSession()
    if (session?.user) {
      logAuthActivity('user_logout', {
        userType: session.user.userType,
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      } as any).catch(() => {})
    }
  } catch {
    // Don't let logging errors block logout
  }

  cookieStore.delete('next-auth.session-token')
  cookieStore.delete('__Secure-next-auth.session-token')
  redirect('/login')
}
