"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  CreditCard,
  FileText,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  Banknote,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  MessageSquare,
  Hash,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { CURRENCY } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

// ============ Types ============

interface BookingAssignment {
  id: number;
  bookingId: number;
  staffId: number;
  status: string;
  qrCode: string | null;
  notes: string | null;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  booking: {
    id: number;
    bookingDate: string;
    bookingTime: string;
    address: string;
    accessNotes: string | null;
    totalPrice: number;
    bookingStatus: string;
    paymentStatus: string;
    paymentMethod: string | null;
    service: {
      name: string;
      price: number;
      durationHours: number;
    };
    user: {
      name: string | null;
      email: string | null;
      phone: string | null;
    } | null;
    guestName: string | null;
    guestEmail: string | null;
    guestPhone: string | null;
  };
  admin: {
    name: string | null;
  } | null;
}

// ============ Status Config ============

const statusConfig: Record<
  string,
  { label: string; className: string; dotClass: string }
> = {
  assigned: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  cash_pending: {
    label: "Cash Pending",
    className: "bg-orange-50 text-orange-700 border-orange-200",
    dotClass: "bg-orange-500",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border-red-200",
    dotClass: "bg-red-500",
  },
};

// ============ Helpers ============

function formatTime(time: string): string {
  try {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  } catch {
    return time;
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return isoStr;
  }
}

// ============ Component ============

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<BookingAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "start" | "complete" | "cash_confirm" | null
  >(null);

  // Fetch assignment data
  const fetchAssignment = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/assignments/${assignmentId}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to load assignment.");
        return;
      }
      setAssignment(data.data);
    } catch {
      setError("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchAssignment();
  }, [fetchAssignment]);

  // Handle status transition
  const handleStatusUpdate = async (newStatus: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/staff/assignments/${assignmentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await res.json();

        if (!data.success) {
          toast.error(data.message || "Failed to update status.");
          return;
        }

        toast.success(data.message);
        await fetchAssignment(); // Refresh data
      } catch {
        toast.error("Network error. Please try again.");
      }
    });
  };

  const handleConfirmAction = () => {
    setConfirmDialogOpen(false);
    if (!pendingAction) return;

    switch (pendingAction) {
      case "start":
        handleStatusUpdate("in_progress");
        break;
      case "complete":
        handleStatusUpdate("completed");
        break;
      case "cash_confirm":
        handleStatusUpdate("completed");
        break;
    }
    setPendingAction(null);
  };

  // ============ Loading State ============
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ============ Error State ============
  if (error || !assignment) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Access Denied
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-md mb-6">
          {error ||
            "This assignment could not be found or is not assigned to you."}
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/staff")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const status = statusConfig[assignment.status] || statusConfig.assigned;
  const booking = assignment.booking;
  const customerName =
    booking.user?.name || booking.guestName || "Guest";
  const customerEmail =
    booking.user?.email || booking.guestEmail || "N/A";
  const customerPhone =
    booking.user?.phone || booking.guestPhone || "N/A";
  const isCompleted = assignment.status === "completed";
  const isCancelled = assignment.status === "cancelled";

  return (
    <div className="space-y-6">
      {/* Back Button + Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/staff")}
            className="gap-1.5 text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Booking Details
            </h2>
            <p className="text-sm text-gray-500">
              GL-{String(booking.id).padStart(5, "0")} &middot; Assignment #
              {assignment.id}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-sm px-3 py-1 ${status.className}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${status.dotClass} mr-2`}
          />
          {status.label}
        </Badge>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Service & Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Details */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-green-600" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Service
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {booking.service.name}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Price
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {CURRENCY}
                    {booking.service.price.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Total
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    {CURRENCY}
                    {booking.totalPrice.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Duration
                  </p>
                  <p className="text-sm font-medium text-gray-700">
                    {booking.service.durationHours} hour
                    {booking.service.durationHours !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Payment Method
                  </p>
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                    {booking.paymentMethod
                      ? booking.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                      : "Not set"}
                  </p>
                </div>
                {assignment.notes && (
                  <div className="sm:col-span-2 space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      Assignment Notes
                    </p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                      {assignment.notes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Name
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {customerName}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Email
                  </p>
                  <p className="text-sm text-gray-700 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{customerEmail}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Phone
                  </p>
                  <p className="text-sm text-gray-700 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    {customerPhone}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address & Access */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                Location & Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                  Address
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {booking.address}
                </p>
              </div>
              {booking.accessNotes && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Access Notes
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      {booking.accessNotes}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Schedule, Timeline, Actions, QR */}
        <div className="space-y-6">
          {/* Date & Time */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-green-600" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(booking.bookingDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatTime(booking.bookingTime)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-5 w-5 text-green-600" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-gray-500">Assigned</p>
                    <p className="text-gray-700 font-medium">
                      {formatDateTime(assignment.assignedAt)}
                    </p>
                    {assignment.admin?.name && (
                      <p className="text-xs text-gray-400">
                        by {assignment.admin.name}
                      </p>
                    )}
                  </div>
                </div>
                {assignment.startedAt && (
                  <div className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-gray-500">Started</p>
                      <p className="text-gray-700 font-medium">
                        {formatDateTime(assignment.startedAt)}
                      </p>
                    </div>
                  </div>
                )}
                {assignment.completedAt && (
                  <div className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-gray-500">Completed</p>
                      <p className="text-gray-700 font-medium">
                        {formatDateTime(assignment.completedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* QR Code Display (shown when in_progress or completed) */}
          {(assignment.status === "in_progress" ||
            assignment.status === "completed" ||
            assignment.status === "cash_pending") &&
            assignment.qrCode && (
              <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-green-600" />
                    Completion Code
                  </CardTitle>
                  <CardDescription>
                    {assignment.status === "completed"
                      ? "This code was used to verify completion."
                      : "Show this code to the customer upon completion."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 rounded-xl p-4 text-center">
                    <p className="font-mono text-xl sm:text-2xl font-bold text-green-400 tracking-widest break-all">
                      {assignment.qrCode}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 flex items-start gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                    This code uniquely identifies this job. The customer can
                    verify completion using this code on our website.
                  </p>
                </CardContent>
              </Card>
            )}

          {/* Action Buttons */}
          {!isCompleted && !isCancelled && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assignment.status === "assigned" && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                    disabled={isPending}
                    onClick={() => {
                      setPendingAction("start");
                      setConfirmDialogOpen(true);
                    }}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}
                    Start Cleaning
                  </Button>
                )}

                {assignment.status === "in_progress" && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    disabled={isPending}
                    onClick={() => {
                      setPendingAction("complete");
                      setConfirmDialogOpen(true);
                    }}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Mark as Completed
                  </Button>
                )}

                {assignment.status === "cash_pending" && (
                  <Button
                    className="w-full gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={isPending}
                    onClick={() => {
                      setPendingAction("cash_confirm");
                      setConfirmDialogOpen(true);
                    }}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Banknote className="h-4 w-4" />
                    )}
                    Confirm Cash Payment
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Completed badge */}
          {isCompleted && (
            <Card className="border-0 shadow-sm bg-emerald-50">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <p className="font-semibold text-emerald-800">
                  Job Completed
                </p>
                <p className="text-sm text-emerald-600 mt-1">
                  {assignment.completedAt
                    ? `on ${formatDateTime(assignment.completedAt)}`
                    : ""}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "start" && "Start Cleaning?"}
              {pendingAction === "complete" && "Mark as Completed?"}
              {pendingAction === "cash_confirm" &&
                `Confirm Cash Payment of ${CURRENCY}${booking.totalPrice.toFixed(2)}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "start" && (
                <>
                  <span className="text-amber-600 font-medium">
                    Starting cleaning is irreversible.
                  </span>{" "}
                  You will not be able to un-start this job. A unique
                  completion code will be generated that the customer can use
                  to verify the service.
                </>
              )}
              {pendingAction === "complete" && (
                <>
                  This will mark the job as completed.{" "}
                  {booking.paymentMethod === "cash_on_service" ||
                  booking.paymentMethod === "cash" ? (
                    <span className="text-orange-600 font-medium">
                      Since this is a cash-on-service booking, you will need to
                      confirm the cash payment from the customer before
                      finalizing.
                    </span>
                  ) : (
                    "An invoice and payment record will be created automatically."
                  )}
                </>
              )}
              {pendingAction === "cash_confirm" && (
                <>
                  Please confirm you have received{" "}
                  <span className="font-bold">
                    {CURRENCY}
                    {booking.totalPrice.toFixed(2)}
                  </span>{" "}
                  in cash from the customer. An invoice and payment record will
                  be generated.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isPending}
              className={
                pendingAction === "start"
                  ? "bg-green-600 hover:bg-green-700"
                  : pendingAction === "cash_confirm"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
              }
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {pendingAction === "start" && "Yes, Start Cleaning"}
                  {pendingAction === "complete" && "Yes, Mark Completed"}
                  {pendingAction === "cash_confirm" &&
                    "Yes, Cash Received"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
