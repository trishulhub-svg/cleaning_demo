import { requireAuth } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ChangePasswordForm } from './change-password-form'

export const dynamic = 'force-dynamic'

export default async function StaffChangePasswordPage() {
  const staff = await requireAuth(['staff'])

  // Double-check mustChangePassword in DB
  const staffRecord = await db.staff.findUnique({
    where: { id: staff.id },
    select: { mustChangePassword: true },
  })

  if (!staffRecord?.mustChangePassword) {
    redirect('/staff')
  }

  return <ChangePasswordForm staffId={staff.id} />
}
