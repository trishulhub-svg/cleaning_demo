"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Leaf,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  ArrowLeft,
  KeyRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp"
import { useEffect } from "react"

const OTP_LENGTH = 6

type Step = "send" | "verify" | "reset"

export default function ChangePasswordPage() {
  const router = useRouter()
  const [step, setStep] = React.useState<Step>("send")
  const [email, setEmail] = React.useState("")
  const [otp, setOtp] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = React.useState(0)
  const [userEmail, setUserEmail] = React.useState("")

  // Fetch current user's email on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session")
        if (res.ok) {
          const data = await res.json()
          if (data.user?.email) {
            setEmail(data.user.email)
            setUserEmail(data.user.email)
          }
        }
      } catch {
        // If session fetch fails, redirect to login
      }
    }
    fetchSession()
  }, [])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError("No email found. Please log in and try again.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), purpose: "password_reset" }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setError(data.error || "Please wait before requesting another code.")
        return
      }

      if (!data.success) {
        setError(data.error || "Failed to send verification code.")
        return
      }

      setStep("verify")
      setResendCooldown(60)
      setSuccess("Verification code sent to " + email)
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (otp.length !== OTP_LENGTH) {
      setError("Please enter the full 6-digit code.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp, purpose: "password_reset" }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || "Verification failed. Please try again.")
        return
      }

      setStep("reset")
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError("Password must contain at least one uppercase letter.")
      return
    }
    if (!/[a-z]/.test(newPassword)) {
      setError("Password must contain at least one lowercase letter.")
      return
    }
    if (!/[0-9]/.test(newPassword)) {
      setError("Password must contain at least one number.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          newPassword,
          purpose: "password_reset",
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || "Failed to change password.")
        return
      }

      // Redirect back
      const fromUrl = document.referrer
      if (fromUrl.includes("/admin")) {
        router.push("/admin?password_changed=true")
      } else if (fromUrl.includes("/staff")) {
        router.push("/staff?password_changed=true")
      } else {
        router.push("/login?password_changed=true")
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), purpose: "password_reset" }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setError(data.error || "Please wait before requesting another code.")
        return
      }

      if (!data.success) {
        setError(data.error || "Failed to resend code.")
        return
      }

      setResendCooldown(60)
    } catch {
      setError("Failed to resend code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const stepLabels = [
    { key: "send", label: "Send" },
    { key: "verify", label: "Verify" },
    { key: "reset", label: "Reset" },
  ]
  const stepOrder: Step[] = ["send", "verify", "reset"]
  const currentStepIndex = stepOrder.indexOf(step)

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Change Password</CardTitle>
          <CardDescription>
            {step === "send" && "We'll send a verification code to your email"}
            {step === "verify" && "Enter the verification code sent to your email"}
            {step === "reset" && "Create your new password"}
          </CardDescription>
        </CardHeader>

        {/* Progress indicator */}
        <div className="px-6">
          <div className="flex items-center justify-center gap-1">
            {stepLabels.map((s, i) => (
              <React.Fragment key={s.key}>
                <div className="flex items-center gap-1.5">
                  {i < currentStepIndex ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : i === currentStepIndex ? (
                    <Circle className="h-4 w-4 text-primary fill-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      i <= currentStepIndex
                        ? "text-primary"
                        : "text-muted-foreground/60"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div
                    className={`mx-1 h-px w-6 ${
                      i < currentStepIndex
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <CardContent className="pt-4">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && step === "verify" && (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
              {success}
            </div>
          )}

          {/* Step 1: Send OTP */}
          {step === "send" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  value={email}
                  readOnly
                  disabled={isLoading}
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  A verification code will be sent to this email address.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to
                </p>
                <p className="text-sm font-medium">{email}</p>
              </div>

              <div className="flex justify-center py-2">
                <InputOTP
                  maxLength={OTP_LENGTH}
                  value={otp}
                  onChange={setOtp}
                  disabled={isLoading}
                  autoComplete="one-time-code"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Didn&apos;t receive the code?{" "}
                  {resendCooldown > 0 ? (
                    <span className="text-muted-foreground/70">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-medium text-primary hover:underline disabled:opacity-50"
                      disabled={isLoading || resendCooldown > 0}
                    >
                      Resend code
                    </button>
                  )}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || otp.length !== OTP_LENGTH}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("send")
                  setOtp("")
                  setError(null)
                }}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </form>
          )}

          {/* Step 3: New password */}
          {step === "reset" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cp-new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="cp-new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  At least 8 characters with uppercase, lowercase, and a number.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cp-confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="cp-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Changing password...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("verify")
                  setNewPassword("")
                  setConfirmPassword("")
                  setError(null)
                }}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Cancel?{" "}
            <button
              onClick={() => router.back()}
              className="font-medium text-primary hover:underline"
            >
              Go Back
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
