"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  FileText,
  User,
  Users,
  Shield,
  Phone,
  Mail,
  AlertTriangle,
  History,
  Hash,
  UserCircle,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CURRENCY } from "@/lib/constants";
import { toast } from "sonner";

interface BookingDetail {
  id: number;
  bookingDate: string;
  bookingTime: string;
  address: string;
  accessNotes: string | null;
  totalPrice: number;
  bookingStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  createdAt: string;
  updatedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancellationType: string | null;
  refundStatus: string;
  qrCompletionCode: string | null;
  qrScannedAt: string | null;
  completedBy: string | null;
  completedAt: string | null;
  service: { id: number; name: string; price: number; description: string; packageType: string };
  user: { id: number; name: string; email: string; phone: string | null } | null;
  assignedStaff: { id: number; name: string; phone: string; role: string } | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  assignment: { id: number; status: string; notes: string | null; assignedAt: string; staff: { name: string } } | null;
}

const BOOKING_STATUSES = ["pending", "confirmed", "in_progress", "completed", "cash_pending", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "cash_on_service"];

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    confirmed: "bg-blue-100 text-blue-800 border-blue-200",
    in_progress: "bg-purple-100 text-purple-800 border-purple-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cash_pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <Badge variant="outline" className={map[status] || "bg-gray-100 text-gray-800"}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function getPaymentBadge(status: string) {
  const map: Record<string, string> = {
    paid: "bg-green-100 text-green-800 border-green-200",
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    cash_on_service: "bg-sky-100 text-sky-800 border-sky-200",
  };
  return (
    <Badge variant="outline" className={map[status] || "bg-gray-100 text-gray-800"}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/admin/bookings?search=${id}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          const found = data.bookings?.find((b: { id: number }) => b.id === parseInt(id));
          if (found) {
            setBooking(found);
          }
        }
      } catch (err) {
        console.error("Failed to fetch booking", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return;
    setSavingStatus(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          action: "updateStatus",
          status: newStatus,
        }),
      });
      if (res.ok) {
        toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
        setBooking({ ...booking, bookingStatus: newStatus });
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  const handlePaymentStatusChange = async (newStatus: string) => {
    if (!booking) return;
    setSavingPayment(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          action: "updatePaymentStatus",
          paymentStatus: newStatus,
        }),
      });
      if (res.ok) {
        toast.success(`Payment status updated to ${newStatus.replace(/_/g, " ")}`);
        setBooking({ ...booking, paymentStatus: newStatus });
      } else {
        toast.error("Failed to update payment status");
      }
    } catch {
      toast.error("Failed to update payment status");
    } finally {
      setSavingPayment(false);
    }
  };

  const isGuest = !booking?.user;
  const isRescheduled =
    booking?.updatedAt &&
    new Date(booking.updatedAt).getTime() > new Date(booking.createdAt).getTime();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-60 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="py-20 text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-900">Booking Not Found</h2>
        <p className="mt-1 text-sm text-gray-500">
          Booking #{id} could not be found.
        </p>
        <Link href="/admin/bookings">
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bookings
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/bookings">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Booking #{booking.id}
              </h1>
              {isRescheduled && (
                <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50">
                  <History className="h-3 w-3" />
                  Rescheduled
                </Badge>
              )}
              {isGuest && (
                <Badge variant="outline" className="text-gray-500 border-gray-300 bg-gray-50">
                  Guest Booking
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Created {formatDate(booking.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(booking.bookingStatus)}
          {getPaymentBadge(booking.paymentStatus)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-green-600" />
                Booking Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Service</p>
                  <p className="text-sm font-medium text-gray-900">{booking.service.name}</p>
                  <p className="text-xs text-gray-500">{booking.service.packageType} package</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date & Time</p>
                  <p className="text-sm font-medium text-gray-900">{booking.bookingDate}</p>
                  <p className="text-sm text-gray-600">{booking.bookingTime?.slice(0, 5)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</p>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-gray-400 shrink-0" />
                    <p className="text-sm text-gray-700">{booking.address}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Access Notes</p>
                  <div className="flex items-start gap-1.5">
                    <FileText className="h-3.5 w-3.5 mt-0.5 text-gray-400 shrink-0" />
                    <p className="text-sm text-gray-700">{booking.accessNotes || "No access notes provided"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Price</p>
                  <p className="text-lg font-bold text-green-600">{CURRENCY}{booking.totalPrice.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Method</p>
                  <p className="text-sm text-gray-700">{booking.paymentMethod?.replace(/_/g, " ") || "Not specified"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Info */}
          {booking.bookingStatus === "cancelled" && (
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  Cancellation Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Cancelled At</p>
                    <p className="text-sm text-gray-900">
                      {booking.cancelledAt ? formatDate(booking.cancelledAt) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Cancelled By</p>
                    <p className="text-sm text-gray-900">
                      {booking.cancellationType?.replace(/_/g, " ") || "Unknown"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-gray-500">Reason</p>
                    <p className="text-sm text-gray-900">
                      {booking.cancellationReason || "No reason provided"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Updates */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                Update Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Booking Status</p>
                  <Select
                    value={booking.bookingStatus}
                    onValueChange={handleStatusChange}
                    disabled={savingStatus}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKING_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {savingStatus && (
                  <Skeleton className="h-9 w-24" />
                )}
              </div>
              <Separator />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Payment Status</p>
                  <Select
                    value={booking.paymentStatus}
                    onValueChange={handlePaymentStatusChange}
                    disabled={savingPayment}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {savingPayment && (
                  <Skeleton className="h-9 w-24" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                {isGuest ? (
                  <User className="h-4 w-4 text-gray-500" />
                ) : (
                  <UserCircle className="h-4 w-4 text-green-600" />
                )}
                {isGuest ? "Guest Customer" : "Registered Customer"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm font-medium text-gray-900">
                  {booking.user?.name || booking.guestName || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-gray-400" />
                  <p className="text-sm text-gray-700">
                    {booking.user?.email || booking.guestEmail || "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-gray-400" />
                  <p className="text-sm text-gray-700">
                    {booking.user?.phone || booking.guestPhone || "N/A"}
                  </p>
                </div>
              </div>
              {isGuest && (
                <div className="mt-2 rounded-lg bg-gray-50 p-2">
                  <p className="text-xs text-gray-500">
                    This is a guest booking. The customer does not have a registered account.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned Staff */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                Assigned Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking.assignedStaff ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Staff Member</p>
                    <p className="text-sm font-medium text-gray-900">
                      {booking.assignedStaff.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {booking.assignedStaff.role} &middot; {booking.assignedStaff.phone}
                    </p>
                  </div>
                  {booking.assignment && (
                    <div className="rounded-lg bg-green-50 p-2">
                      <p className="text-xs text-green-700">
                        Assigned on {formatDate(booking.assignment.assignedAt)}
                      </p>
                      {booking.assignment.notes && (
                        <p className="mt-1 text-xs text-gray-600">
                          Notes: {booking.assignment.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-sm text-amber-700">No staff assigned</p>
                  <Link href="/admin/bookings">
                    <Button variant="outline" size="sm" className="mt-2 text-xs">
                      Assign Staff
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code Info */}
          {booking.qrCompletionCode && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hash className="h-4 w-4 text-green-600" />
                  QR Completion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Completion Code</p>
                  <p className="font-mono text-sm text-gray-900">{booking.qrCompletionCode}</p>
                </div>
                {booking.qrScannedAt && (
                  <div>
                    <p className="text-xs text-gray-500">Scanned At</p>
                    <p className="text-sm text-gray-700">{formatDate(booking.qrScannedAt)}</p>
                  </div>
                )}
                {booking.completedBy && (
                  <div>
                    <p className="text-xs text-gray-500">Completed By</p>
                    <p className="text-sm text-gray-700">{booking.completedBy}</p>
                  </div>
                )}
                {booking.completedAt && (
                  <div>
                    <p className="text-xs text-gray-500">Completed At</p>
                    <p className="text-sm text-gray-700">{formatDate(booking.completedAt)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Refund Status */}
          {booking.refundStatus && booking.refundStatus !== "none" && (
            <Card className="border-amber-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                  <CreditCard className="h-4 w-4" />
                  Refund Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant="outline"
                  className={
                    booking.refundStatus === "completed"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : booking.refundStatus === "rejected"
                        ? "bg-red-100 text-red-800 border-red-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                  }
                >
                  {booking.refundStatus.replace(/_/g, " ")}
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
