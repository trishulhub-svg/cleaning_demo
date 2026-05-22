'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Loader2, Eye, EyeOff, User, Lock, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface StaffData {
  id: number
  name: string
  email: string
  phone: string
  role: string
  createdAt: Date
}

interface FormState {
  success: boolean
  error: string
  message: string
}

export function ProfileClient({ staff }: { staff: StaffData }) {
  const router = useRouter()
  const [showCurrent, setShowCurrent] = React.useState(false)
  const [showNew, setShowNew] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const [profileState, profileAction, profilePending] = React.useActionState<FormState | null, FormData>(
    async (prev, formData) => {
      const { updateStaffProfile } = await import('./actions')
      return updateStaffProfile(prev, formData)
    },
    null
  )

  const [passwordState, passwordAction, passwordPending] = React.useActionState<FormState | null, FormData>(
    async (prev, formData) => {
      const { changeStaffPassword } = await import('./actions')
      return changeStaffPassword(prev, formData)
    },
    null
  )

  React.useEffect(() => {
    if (profileState?.success || passwordState?.success) {
      router.refresh()
    }
  }, [profileState, passwordState, router])

  const banner = (state: FormState | null) => {
    if (!state) return null
    if (state.error) {
      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )
    }
    if (state.message) {
      return (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {state.message}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information</p>
      </div>

      {/* Profile Info Card */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your name and phone number</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={profileAction} className="space-y-4">
            <input type="hidden" name="staffId" value={staff.id} />
            {banner(profileState)}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" defaultValue={staff.name} required disabled={profilePending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" defaultValue={staff.phone} required disabled={profilePending} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email (read-only)</Label>
                <Input id="email" defaultValue={staff.email} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex items-center h-9">
                  <Badge variant="outline" className="capitalize">{staff.role.replace('_', ' ')}</Badge>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={profilePending} className="bg-green-600 hover:bg-green-700 text-white">
              {profilePending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-green-600" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={passwordAction} className="space-y-4">
            <input type="hidden" name="staffId" value={staff.id} />
            {banner(passwordState)}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input id="currentPassword" name="currentPassword" type={showCurrent ? 'text' : 'password'} required disabled={passwordPending} className="pr-10" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input id="newPassword" name="newPassword" type={showNew ? 'text' : 'password'} placeholder="Min 8 characters" required minLength={8} disabled={passwordPending} className="pr-10" />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input id="confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'} placeholder="Re-enter new password" required minLength={8} disabled={passwordPending} className="pr-10" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={passwordPending} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
              {passwordPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
