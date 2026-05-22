'use server'

import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth-helpers'

export async function updateCustomerProfile(_prevState: { success: boolean; error: string; message: string } | null, formData: FormData) {
  const userId = formData.get('userId') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const address = formData.get('address') as string

  if (!userId || !name) {
    return { success: false, error: 'Name is required.', message: '' }
  }

  try {
    await db.user.update({
      where: { id: parseInt(userId, 10) },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
      },
    })
    return { success: true, error: '', message: 'Profile updated successfully.' }
  } catch (err) {
    console.error('[CustomerProfile] Update error:', err)
    return { success: false, error: 'Failed to update profile.', message: '' }
  }
}

export async function changeCustomerPassword(_prevState: { success: boolean; error: string; message: string } | null, formData: FormData) {
  const userId = formData.get('userId') as string
  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!userId || !currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: 'All fields are required.', message: '' }
  }
  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters.', message: '' }
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: 'New passwords do not match.', message: '' }
  }

  try {
    const user = await db.user.findUnique({ where: { id: parseInt(userId, 10) } })
    if (!user) {
      return { success: false, error: 'Account not found.', message: '' }
    }

    const isValid = await verifyPassword(currentPassword, user.password)
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect.', message: '' }
    }

    const hashed = await hashPassword(newPassword)
    await db.user.update({
      where: { id: parseInt(userId, 10) },
      data: { password: hashed },
    })
    return { success: true, error: '', message: 'Password changed successfully.' }
  } catch (err) {
    console.error('[CustomerProfile] Password change error:', err)
    return { success: false, error: 'Failed to change password.', message: '' }
  }
}
