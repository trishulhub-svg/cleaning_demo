'use server'

import { signIn, getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface LoginActionResult {
  success: boolean
  error?: string
  url?: string
}

export async function loginAction(
  _prevState: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' }
  }

  try {
    const result = await signIn('credentials', {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
    })

    if (result?.error) {
      // Pass through specific error messages from the authorize function
      if (
        result.error.includes('deactivated') ||
        result.error.includes('No account found')
      ) {
        return { success: false, error: result.error }
      }

      const errorMessages: Record<string, string> = {
        CredentialsSignin: 'Invalid email or password.',
        default: 'Invalid email or password.',
      }

      return {
        success: false,
        error: errorMessages[result.error] || 'Invalid email or password.',
      }
    }

    // After successful sign in, fetch the session to determine userType
    // and redirect to the appropriate dashboard
    const session = await getServerSession(authOptions)
    const callbackUrl = formData.get('callbackUrl') as string

    if (callbackUrl) {
      return { success: true, url: callbackUrl }
    }

    // Route based on user type
    const userType = session?.user?.userType
    switch (userType) {
      case 'admin':
        return { success: true, url: '/admin' }
      case 'staff':
        return { success: true, url: '/staff' }
      case 'customer':
      default:
        return { success: true, url: '/dashboard' }
    }
  } catch (error) {
    console.error('[Login] Error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}
