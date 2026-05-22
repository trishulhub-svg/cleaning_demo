import { requireAuth } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ProfileClient } from './profile-client'

export const dynamic = 'force-dynamic'

export default async function CustomerProfilePage() {
  const user = await requireAuth(['customer'])

  const userRecord = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      createdAt: true,
    },
  })

  if (!userRecord) redirect('/dashboard')

  return (
    <ProfileClient
      user={{
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        phone: userRecord.phone ?? '',
        address: userRecord.address ?? '',
        createdAt: userRecord.createdAt,
      }}
    />
  )
}
