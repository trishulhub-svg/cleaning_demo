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

const OTP_LENGTH = 6

type Step = "details" | "verify"

interface RegisterData {
  name: string
  email: string
  phone: string
  password: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = React.useState<Step>("details")
  const [registerData, setRegisterData] = React.useState<RegisterData>({
    name: "",
    email: "",
    phone: "",
    password: "",
  })
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [otp, setOtp] = React.useState("")
  const [resendCooldown, setResendCooldown] = React.useState(0)

  // Resend cooldown timer
  React.useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  async function handleStep1Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (registerData.password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (registerData.password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    if (!/[A-Z]/.test(registerData.password)) {
      setError("Password must contain at least one uppercase letter.")
      return
    }

    if (!/[a-z]/.test(registerData.password)) {
      setError("Password must contain at least one lowercase letter.")
      return
    }

    if (!/[0-9]/.test(registerData.password)) {
      setError("Password must contain at least one number.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          phone: registerData.phone,
          password: registerData.password,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || "Registration failed. Please try again.")
        return
      }

      // Move to OTP verification step
      setStep("verify")
      setResendCooldown(60)
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleOtpSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        body: JSON.stringify({
          email: registerData.email,
          otp,
          purpose: "registration",
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || "Verification failed. Please try again.")
        return
      }

      // Success — redirect to login with success message
      router.push("/login?registered=true")
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
        body: JSON.stringify({
          email: registerData.email,
          purpose: "registration",
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || "Failed to resend code. Please try again.")
        return
      }

      setResendCooldown(60)
    } catch {
      setError("Failed to resend code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Leaf className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            {step === "details"
              ? "Join GreenLeaf Cleaning today"
              : "Verify your email address"}
          </CardDescription>
        </CardHeader>

        {/* Progress indicator */}
        <div className="px-6">
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              {step === "verify" ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-primary fill-primary" />
              )}
              <span className="text-sm font-medium text-primary">
                Details
              </span>
            </div>
            <div
              className={`h-px w-8 ${
                step === "verify" ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
            <div className="flex items-center gap-2">
              {step === "verify" ? (
                <Circle className="h-5 w-5 text-primary fill-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/40" />
              )}
              <span
                className={`text-sm font-medium ${
                  step === "verify"
                    ? "text-primary"
                    : "text-muted-foreground/60"
                }`}
              >
                Verify
              </span>
            </div>
          </div>
        </div>

        <CardContent className="pt-4">
          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step 1: Registration form */}
          {step === "details" && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  autoComplete="name"
                  disabled={isLoading}
                  value={registerData.name}
                  onChange={(e) =>
                    setRegisterData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  value={registerData.email}
                  onChange={(e) =>
                    setRegisterData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="07700 000 000"
                  autoComplete="tel"
                  disabled={isLoading}
                  value={registerData.phone}
                  onChange={(e) =>
                    setRegisterData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="pr-10"
                    value={registerData.password}
                    onChange={(e) =>
                      setRegisterData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  At least 8 characters with uppercase, lowercase, and a number.
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          )}

          {/* Step 2: OTP verification */}
          {step === "verify" && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  We&apos;ve sent a 6-digit verification code to
                </p>
                <p className="text-sm font-medium">{registerData.email}</p>
              </div>

              {/* OTP Input */}
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

              {/* Resend OTP */}
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

              {/* Submit button */}
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
                  "Verify Email"
                )}
              </Button>

              {/* Back button */}
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("details")
                  setOtp("")
                  setError(null)
                }}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to details
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
