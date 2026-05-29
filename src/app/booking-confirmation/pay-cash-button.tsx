'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PayCashButtonProps {
  bookingId: number
}

export function PayCashButton({ bookingId }: PayCashButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bookings/pay-after-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (data.success) {
        router.refresh()
      } else {
        alert(data.error || 'Something went wrong')
      }
    } catch {
      alert('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <CreditCard className="h-4 w-4 mr-1" />
      )}
      Pay Cash on Service
    </Button>
  )
}
