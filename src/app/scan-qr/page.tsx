'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  QrCode,
  Search,
  CheckCircle2,
  Loader2,
  CalendarDays,
  MapPin,
  Clock,
  CreditCard,
  ArrowLeft,
  Banknote,
  ShieldCheck,
  AlertTriangle,
  Camera,
  Keyboard,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CURRENCY } from '@/lib/constants'
import { showApiError } from '@/lib/error-store'

// ============ Types ============

type ScanResult = {
  success: boolean
  autoCompleted?: boolean
  bookingId?: number
  requiresPayment?: boolean
  booking?: {
    id: number
    service: string
    date: string
    time: string
    address: string
    totalPrice: number
    paymentStatus: string
    customerName: string
  }
  error?: string
  code?: string
  needsLogin?: boolean
}

type PaymentChoice = {
  success: boolean
  method?: 'cash' | 'online'
  message?: string
  redirectUrl?: string
  error?: string
}

// ============ Component ============

export default function ScanQrPage() {
  const router = useRouter()
  const [mode, setMode] = React.useState<'menu' | 'camera' | 'manual' | 'result'>('menu')
  const [qrInput, setQrInput] = React.useState('')
  const [isScanning, setIsScanning] = React.useState(false)
  const [scanResult, setScanResult] = React.useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [paymentChoice, setPaymentChoice] = React.useState<PaymentChoice | null>(null)
  const [manualCode, setManualCode] = React.useState('')
  const scannerRef = React.useRef<HTMLDivElement>(null)
  const html5QrRef = React.useRef<any>(null)
  const scanHandledRef = React.useRef(false) // Guard against multiple scan callbacks

  // Cleanup scanner on unmount
  React.useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        try {
          html5QrRef.current.stop().then(() => {
            html5QrRef.current?.clear()
          }).catch(() => {})
        } catch {}
      }
    }
  }, [])

  // ============ Camera Scanner ============

  const stopCamera = React.useCallback(async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop()
      } catch {}
      try {
        html5QrRef.current.clear()
      } catch {}
      html5QrRef.current = null
    }
    setIsScanning(false)
  }, [])

  const startCameraScanner = async () => {
    setMode('camera')
    setIsScanning(true)
    setScanResult(null)
    setPaymentChoice(null)
    scanHandledRef.current = false // Reset guard for new scan session

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scannerId = 'qr-reader'

      // Clear previous instance
      if (html5QrRef.current) {
        try {
          await html5QrRef.current.stop()
          html5QrRef.current.clear()
        } catch {}
      }

      html5QrRef.current = new Html5Qrcode(scannerId)

      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          // Guard: only process the first detection per scan session
          if (scanHandledRef.current) return
          scanHandledRef.current = true

          // Stop camera fully before processing
          try {
            await html5QrRef.current?.stop()
          } catch {}
          html5QrRef.current = null
          setIsScanning(false)
          setMode('result')
          handleScanResult(decodedText)
        },
        () => {} // Ignore errors during scanning
      )
    } catch (err) {
      console.error('Camera error:', err)
      toast.error('Could not access camera. Please use manual entry instead.')
      setMode('manual')
      setIsScanning(false)
    }
  }

  const handleStopCamera = () => {
    stopCamera()
    setMode('menu')
  }

  // ============ Scan Processing ============

  const handleScanResult = async (code: string) => {
    setIsProcessing(true)
    setScanResult(null)
    setPaymentChoice(null)

    try {
      const res = await fetch('/api/public/qr-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data: ScanResult = await res.json()
      setScanResult(data)

      if (!res.ok || !data.success) {
        // Show the actual backend error in the error dialog
        showApiError({
          title: data.code === 'ALREADY_COMPLETED' ? 'Already Completed'
            : data.code === 'WRONG_CUSTOMER' ? 'Not Your Booking'
            : data.code === 'BOOKING_CANCELLED' ? 'Booking Cancelled'
            : data.code === 'NOT_ACTIVE' ? 'Not Active'
            : data.code === 'NEEDS_LOGIN' ? 'Login Required'
            : 'QR Code Error',
          error: data,
          context: `QR Scan: ${code}`,
        })

        if (data.needsLogin) {
          setTimeout(() => {
            window.location.href = '/login?callbackUrl=/scan-qr'
          }, 1500)
        }
        return
      }

      if (data.autoCompleted) {
        toast.success('Service completed successfully!')
      }
    } catch (err) {
      // Network error or parsing error — show in error dialog
      showApiError({
        title: 'QR Scan Failed',
        error: err,
        context: `QR Scan: ${code}`,
      })
      setScanResult({
        success: false,
        error: 'Failed to process QR code. Please try again.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // ============ Manual Entry ============

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) {
      toast.error('Please enter a QR code.')
      return
    }
    setMode('result')
    await handleScanResult(manualCode.trim())
  }

  // ============ Payment Choice ============

  const handlePaymentChoice = async (method: 'cash' | 'online') => {
    if (!scanResult?.booking?.id) return

    setIsProcessing(true)
    try {
      const res = await fetch('/api/public/qr-scan/choose-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: scanResult.booking.id, method }),
      })
      const data: PaymentChoice = await res.json()
      setPaymentChoice(data)

      if (!res.ok || !data.success) {
        showApiError({
          title: 'Payment Error',
          error: data,
          context: `Payment choice: ${method}, Booking #${scanResult.booking.id}`,
        })
        return
      }

      if (data.method === 'online' && data.redirectUrl) {
        toast.success('Redirecting to payment...')
        setTimeout(() => {
          window.location.href = data.redirectUrl!
        }, 1000)
      }
    } catch (err) {
      showApiError({
        title: 'Payment Error',
        error: err,
        context: `Payment choice: ${method}, Booking #${scanResult?.booking?.id}`,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // ============ Reset ============

  const resetScan = async () => {
    await stopCamera()
    setScanResult(null)
    setPaymentChoice(null)
    setMode('menu')
    setManualCode('')
    scanHandledRef.current = false
  }

  // ============ Render ============

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <QrCode className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Scan QR Code</h1>
          <p className="text-muted-foreground mt-2">
            Scan the QR code shown by your cleaner to verify service completion.
          </p>
        </div>

        {/* ===== MENU: Choose scan method ===== */}
        {mode === 'menu' && !scanResult && (
          <div className="space-y-4">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={startCameraScanner}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Scan with Camera</p>
                  <p className="text-sm text-muted-foreground">Use your device camera to scan the QR code</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setMode('manual')}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Keyboard className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Enter Code Manually</p>
                  <p className="text-sm text-muted-foreground">Type the QR code text (e.g., QR-20250115-A3F7B2C9D1)</p>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button variant="ghost" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* ===== CAMERA SCANNER ===== */}
        {mode === 'camera' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Scanning...</CardTitle>
              <Button variant="ghost" size="icon" onClick={handleStopCamera}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div
                id="qr-reader"
                ref={scannerRef}
                className="w-full rounded-lg overflow-hidden"
                style={{ minHeight: '300px' }}
              />
              <p className="text-xs text-center text-muted-foreground mt-3">
                Point your camera at the QR code shown by the cleaner.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center gap-2">
              <Button variant="outline" onClick={handleStopCamera}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => { stopCamera(); setMode('manual') }}>
                <Keyboard className="h-4 w-4 mr-1" />
                Enter Manually
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* ===== MANUAL ENTRY ===== */}
        {mode === 'manual' && !scanResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enter QR Code</CardTitle>
              <CardDescription>
                Type the completion code shown on the cleaner&apos;s device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit}>
                <div className="flex gap-2">
                  <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="QR-20250115-A3F7B2C9D1"
                    className="font-mono"
                    disabled={isProcessing}
                    autoFocus
                  />
                  <Button type="submit" disabled={isProcessing || !manualCode.trim()}>
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Verify
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="ghost" onClick={() => setMode('menu')}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* ===== PROCESSING ===== */}
        {isProcessing && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Verifying QR code...</p>
            </CardContent>
          </Card>
        )}

        {/* ===== RESULT CARDS (only show in 'result' mode) ===== */}
        {mode === 'result' && !isProcessing && (
          <>
            {/* ERROR RESULT */}
            {scanResult && !scanResult.success && (
              <Card className="border-red-200">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {scanResult.code === 'ALREADY_COMPLETED' ? 'Already Completed' :
                       scanResult.code === 'WRONG_CUSTOMER' ? 'Not Your Booking' :
                       scanResult.code === 'BOOKING_CANCELLED' ? 'Booking Cancelled' :
                       scanResult.code === 'NOT_ACTIVE' ? 'Not Active' :
                       'QR Code Error'}
                    </h3>
                    <p className="text-sm text-gray-500 max-w-md mb-6">
                      {scanResult.error}
                    </p>
                    <p className="text-xs text-muted-foreground mb-6">
                      Full error details are available in the error dialog above.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={resetScan}>
                        Try Again
                      </Button>
                      <Button variant="ghost" asChild>
                        <Link href="/dashboard">
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          Dashboard
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SUCCESS: Auto-completed (paid booking) */}
            {scanResult?.success && scanResult.autoCompleted && (
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-emerald-800 mb-2">
                      Service Completed!
                    </h3>
                    <p className="text-sm text-emerald-600 max-w-md mb-6">
                      Your cleaning service has been verified and marked as completed. Thank you for choosing GreenLeaf Cleaning Services!
                    </p>
                    <Button asChild>
                      <Link href="/dashboard">
                        Back to Dashboard
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SUCCESS: Requires payment choice */}
            {scanResult?.success && scanResult.requiresPayment && !paymentChoice && scanResult.booking && (
              <div className="space-y-4">
                {/* Booking Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      QR Code Verified
                    </CardTitle>
                    <CardDescription>
                      Please choose how you would like to pay for this service.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2 text-sm">
                        <div className="flex items-start gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-muted-foreground">Service</p>
                            <p className="font-medium">{scanResult.booking.service}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-muted-foreground">Date & Time</p>
                            <p className="font-medium">{scanResult.booking.date} at {scanResult.booking.time}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 sm:col-span-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-muted-foreground">Address</p>
                            <p className="font-medium">{scanResult.booking.address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-muted-foreground">Total Amount</p>
                            <p className="text-lg font-bold text-green-700">
                              {CURRENCY}{scanResult.booking.totalPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Choose Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full justify-start h-auto py-4 px-4 gap-4"
                      variant="outline"
                      onClick={() => handlePaymentChoice('cash')}
                      disabled={isProcessing}
                    >
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <Banknote className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Hand Over Cash to Cleaner</p>
                        <p className="text-xs text-muted-foreground">
                          Pay {CURRENCY}{scanResult.booking.totalPrice.toFixed(2)} in cash directly to the cleaning staff.
                          They will confirm receipt to complete the booking.
                        </p>
                      </div>
                    </Button>

                    <Separator />

                    <Button
                      className="w-full justify-start h-auto py-4 px-4 gap-4"
                      variant="outline"
                      onClick={() => handlePaymentChoice('online')}
                      disabled={isProcessing}
                    >
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Pay by Card Online</p>
                        <p className="text-xs text-muted-foreground">
                          Pay securely online via card. The booking will be completed after payment.
                        </p>
                      </div>
                    </Button>
                  </CardContent>
                </Card>

                <div className="flex justify-center">
                  <Button variant="ghost" onClick={resetScan} disabled={isProcessing}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* PAYMENT CHOICE RESULT: Cash */}
            {paymentChoice?.success && paymentChoice.method === 'cash' && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                      <Banknote className="h-8 w-8 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Cash Payment Selected
                    </h3>
                    <p className="text-sm text-gray-600 max-w-md mb-4">
                      {paymentChoice.message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      The cleaner will confirm receipt from their portal to finalize the booking.
                    </div>
                    <Button asChild>
                      <Link href="/dashboard">
                        Back to Dashboard
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PAYMENT CHOICE RESULT: Online (redirecting) */}
            {paymentChoice?.success && paymentChoice.method === 'online' && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Redirecting to secure payment...</p>
                </CardContent>
              </Card>
            )}

            {/* PAYMENT CHOICE ERROR */}
            {paymentChoice && !paymentChoice.success && (
              <Card className="border-red-200">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Error</h3>
                    <p className="text-sm text-gray-500 max-w-md mb-6">
                      {paymentChoice.error}
                    </p>
                    <p className="text-xs text-muted-foreground mb-6">
                      Full error details are available in the error dialog above.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setPaymentChoice(null)}>
                        Try Again
                      </Button>
                      <Button variant="ghost" asChild>
                        <Link href="/dashboard">
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          Dashboard
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
