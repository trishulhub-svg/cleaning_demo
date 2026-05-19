'use server'

import { signIn } from 'next-auth'
import { USER_TYPES } from '@/lib/constants'

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
      // NextAuth passes the error from authorize() through
      const errorMessages: Record<string, string> = {
        CredentialsSignin: 'Invalid email or password.',
        default: 'Invalid email or password.',
      }

      // Pass through specific error messages from the authorize function
      if (
        result.error.includes('deactivated') ||
        result.error.includes('No account found')
      ) {
        return { success: false, error: result.error }
      }

      return {
        success: false,
        error: errorMessages[result.error] || 'Invalid email or password.',
      }
    }

    // After successful sign in, we need to determine where to redirect.
    // Since we used redirect: false, we need to fetch the session to get userType.
    // However, we can use the callbackUrl or redirect based on the original intent.
    // For now, redirect to dashboard by default — the session middleware will handle role-based routing.
    const callbackUrl = formData.get('callbackUrl') as string
    if (callbackUrl) {
      return { success: true, url: callbackUrl }
    }

    return { success: true, url: '/dashboard' }
  } catch (error) {
    console.error('[Login] Error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}
