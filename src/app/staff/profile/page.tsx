import { requireAuth } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'
import { ProfileClient } from './profile-client'

export const dynamic = 'force-dynamic'

export default async function StaffProfilePage() {
  const staff = await requireAuth(['staff'])

  const staffRecord = await db.staff.findUnique({
    where: { id: staff.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  if (!staffRecord) redirect('/staff')

  return (
    <ProfileClient
      staff={{
        id: staffRecord.id,
        name: staffRecord.name,
        email: staffRecord.email,
        phone: staffRecord.phone,
        role: staffRecord.role,
        createdAt: staffRecord.createdAt,
      }}
    />
  )
}
