import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-helpers'
import { logAuthActivity } from '@/lib/activity-logger'

export async function POST() {
  try {
    // Log who logged out (fire-and-forget)
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

    const cookieStore = await cookies()

    // Delete both cookie variants
    cookieStore.delete('next-auth.session-token')
    cookieStore.delete('__Secure-next-auth.session-token')

    return NextResponse.json({ success: true })
  } catch {
    // Even if something goes wrong, try to delete cookies
    try {
      const cookieStore = await cookies()
      cookieStore.delete('next-auth.session-token')
      cookieStore.delete('__Secure-next-auth.session-token')
    } catch {}

    return NextResponse.json({ success: true })
  }
}
