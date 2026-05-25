"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Leaf, Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { loginAction, type LoginActionResult } from "./actions"

function LoginForm() {
  const searchParams = useSearchParams()

  const role = searchParams.get("role") as "admin" | "staff" | null
  const callbackUrl = searchParams.get("callbackUrl") as string | null
  const errorParam = searchParams.get("error") as string | null

  const [state, formAction, isPending] = React.useActionState<
    LoginActionResult | null,
    FormData
  >(loginAction, null)

  const [showPassword, setShowPassword] = React.useState(false)

  // Redirect on success — use full page navigation to ensure
  // the new session cookie is available for the target page
  React.useEffect(() => {
    if (state?.success && state.url) {
      window.location.href = state.url
    }
  }, [state])

  // Determine the display text based on role
  const isRoleView = role === "admin" || role === "staff"
  const roleLabel = role === "admin" ? "Admin" : role === "staff" ? "Staff" : null
  const subtitle = roleLabel
    ? `Sign in to your ${roleLabel} account`
    : "Sign in to your GreenLeaf account"

  // Error message from URL param or action state
  const errorMessage = errorParam === "OAuthAccountNotLinked"
    ? "This email is already associated with another account."
    : errorParam === "SessionRequired"
      ? "Please sign in to continue."
      : state?.error

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Leaf className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {roleLabel ? `${roleLabel} Login` : "Welcome Back"}
          </CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-4">
            {/* Error message */}
            {errorMessage && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            {/* Hidden callbackUrl field */}
            {callbackUrl && (
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
                disabled={isPending}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  disabled={isPending}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                name="remember"
                disabled={isPending}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal text-muted-foreground cursor-pointer"
              >
                Remember me
              </Label>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {!isRoleView && (
            <>
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary hover:underline"
                >
                  Register
                </Link>
              </p>
              <div className="flex gap-4 text-sm">
                <Link
                  href="/login?role=admin"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Admin Login
                </Link>
                <span className="text-muted-foreground/50">|</span>
                <Link
                  href="/login?role=staff"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Staff Login
                </Link>
              </div>
            </>
          )}
          {isRoleView && (
            <p className="text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                &larr; Back to customer login
              </Link>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Leaf className="h-6 w-6 text-muted-foreground" />
          </div>
          <Skeleton className="mx-auto h-7 w-40" />
          <Skeleton className="mx-auto h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
