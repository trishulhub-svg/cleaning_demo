"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ShieldCheck,
  Leaf,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

// ============ Reset Form Component (uses useSearchParams) ============

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [resetDone, setResetDone] = useState(false);

  // Step 1: Validate token on mount
  useEffect(() => {
    if (!token) {
      setValidationError("No reset token provided. Please check the link in your email.");
      setValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch("/api/staff/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, action: "validate" }),
        });
        const data = await res.json();

        if (!data.success) {
          setValidationError(data.message || "Token validation failed.");
          setValid(false);
        } else {
          setValid(true);
          setStaffName(data.data.staffName);
          setStaffEmail(data.data.staffEmail);
        }
      } catch {
        setValidationError("Network error. Please check your connection and try again.");
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Step 2: Reset password
  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!token) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/staff/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action: "reset",
            newPassword,
            confirmPassword,
          }),
        });
        const data = await res.json();

        if (!data.success) {
          toast.error(data.message || "Failed to reset password.");
          return;
        }

        setResetDone(true);
        toast.success("Password reset successfully! Redirecting to login...");

        // Auto-redirect to /login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } catch {
        toast.error("Network error. Please try again.");
      }
    });
  };

  // ============ Validating State ============
  if (validating) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Leaf className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">Verifying Reset Link</CardTitle>
            <CardDescription>
              Please wait while we verify your password reset link...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Loader2 className="h-6 w-6 text-green-600 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ Token Invalid ============
  if (!valid || validationError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Invalid Reset Link</CardTitle>
            <CardDescription>{validationError}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button
              variant="outline"
              onClick={() => router.push("/login")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ Reset Done ============
  if (resetDone) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <CardTitle className="text-xl">Password Reset Complete</CardTitle>
            <CardDescription>
              Your password has been successfully updated. You will be
              redirected to the login page in a few seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ Reset Form ============
  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="flex items-center justify-center min-h-[60vh] py-8">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Set New Password</CardTitle>
          <CardDescription>
            Welcome, <span className="font-medium text-gray-700">{staffName}</span>
            <br />
            <span className="text-xs text-gray-400">{staffEmail}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  autoFocus
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.level
                            ? passwordStrength.colorClass
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pr-10 ${
                    confirmPassword.length > 0 &&
                    newPassword !== confirmPassword
                      ? "border-red-300 focus-visible:ring-red-500"
                      : confirmPassword.length > 0 &&
                        newPassword === confirmPassword
                        ? "border-green-300 focus-visible:ring-green-500"
                        : ""
                  }`}
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 &&
                newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Passwords do not match
                  </p>
                )}
              {confirmPassword.length > 0 &&
                newPassword === confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
            </div>

            {/* Security Notice */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                Your new password should be unique and not used on other
                websites. Avoid using easily guessable information like your
                name or birthdate.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              disabled={isPending || newPassword.length < 6 || newPassword !== confirmPassword}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Password Strength Helper ============

function getPasswordStrength(password: string): {
  level: number;
  label: string;
  colorClass: string;
} {
  if (password.length < 6) {
    return { level: 0, label: "Too short", colorClass: "bg-gray-300" };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1)
    return {
      level: 1,
      label: "Weak",
      colorClass: "bg-red-500",
    };
  if (score === 2)
    return {
      level: 2,
      label: "Fair",
      colorClass: "bg-orange-500",
    };
  if (score === 3)
    return {
      level: 3,
      label: "Good",
      colorClass: "bg-yellow-500",
    };
  return {
    level: 4,
    label: "Strong",
    colorClass: "bg-green-500",
  };
}

// ============ Page Wrapper with Suspense ============

export default function StaffResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto mb-3" />
              <Skeleton className="h-6 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
