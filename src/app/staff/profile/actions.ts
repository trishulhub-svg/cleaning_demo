'use server'

import { db } from '@/lib/db'
import { hashPassword, verifyPassword, requireAuth } from '@/lib/auth-helpers'
import { logAuthActivity } from '@/lib/activity-logger'

export async function updateStaffProfile(_prevState: { success: boolean; error: string; message: string } | null, formData: FormData) {
  // IDOR protection: verify the authenticated staff member
  let authUser
  try {
    authUser = await requireAuth(['staff'])
  } catch {
    return { success: false, error: 'Authentication required.', message: '' }
  }

  const staffId = formData.get('staffId') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string

  if (!staffId || !name || !phone) {
    return { success: false, error: 'All fields are required.', message: '' }
  }

  // IDOR check: the submitted staffId must match the authenticated user
  if (parseInt(staffId, 10) !== authUser.id) {
    return { success: false, error: 'You can only update your own profile.', message: '' }
  }

  try {
    await db.staff.update({
      where: { id: parseInt(staffId, 10) },
      data: { name: name.trim(), phone: phone.trim() },
    })
    logAuthActivity('profile_updated', { userType: 'staff', id: parseInt(staffId, 10), name: name.trim(), email: '' }).catch(() => {})
    return { success: true, error: '', message: 'Profile updated successfully.' }
  } catch (err) {
    console.error('[StaffProfile] Update error:', err)
    return { success: false, error: 'Failed to update profile.', message: '' }
  }
}

export async function changeStaffPassword(_prevState: { success: boolean; error: string; message: string } | null, formData: FormData) {
  // IDOR protection: verify the authenticated staff member
  let authUser
  try {
    authUser = await requireAuth(['staff'])
  } catch {
    return { success: false, error: 'Authentication required.', message: '' }
  }

  const staffId = formData.get('staffId') as string
  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!staffId || !currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: 'All fields are required.', message: '' }
  }
  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters.', message: '' }
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: 'New passwords do not match.', message: '' }
  }

  // IDOR check: the submitted staffId must match the authenticated user
  if (parseInt(staffId, 10) !== authUser.id) {
    return { success: false, error: 'You can only change your own password.', message: '' }
  }

  try {
    const staff = await db.staff.findUnique({ where: { id: parseInt(staffId, 10) } })
    if (!staff) {
      return { success: false, error: 'Staff account not found.', message: '' }
    }

    const isValid = await verifyPassword(currentPassword, staff.password)
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect.', message: '' }
    }

    const hashed = await hashPassword(newPassword)
    await db.staff.update({
      where: { id: parseInt(staffId, 10) },
      data: { password: hashed, mustChangePassword: false },
    })
    logAuthActivity('password_changed', { userType: 'staff', id: parseInt(staffId, 10), name: staff.name, email: staff.email || '' }).catch(() => {})
    return { success: true, error: '', message: 'Password changed successfully.' }
  } catch (err) {
    console.error('[StaffProfile] Password change error:', err)
    return { success: false, error: 'Failed to change password.', message: '' }
  }
}
