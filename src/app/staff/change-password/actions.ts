'use server'

import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import { logAuthActivity } from '@/lib/activity-logger'

export async function setNewStaffPassword(
  _prevState: { success: boolean; error: string } | null,
  formData: FormData
): Promise<{ success: boolean; error: string; redirect?: string }> {
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!newPassword || !confirmPassword) {
    return { success: false, error: 'Please fill in both password fields.' }
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' }
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' }
  }

  // Staff ID will be passed via a hidden field from the server component
  const staffId = formData.get('staffId') as string
  if (!staffId) {
    return { success: false, error: 'Session expired. Please log in again.' }
  }

  try {
    const hashedPassword = await hashPassword(newPassword)

    await db.staff.update({
      where: { id: parseInt(staffId, 10) },
      data: {
        password: hashedPassword,
        tempPassword: null,
        mustChangePassword: false,
      },
    })
    logAuthActivity('password_changed_first_login', { userType: 'staff', id: parseInt(staffId, 10), name: '', email: '' }).catch(() => {})
    return { success: true, error: '', redirect: '/staff' }
  } catch (error) {
    console.error('[SetNewPassword] Error:', error)
    return { success: false, error: 'Failed to update password. Please try again.' }
  }
}
