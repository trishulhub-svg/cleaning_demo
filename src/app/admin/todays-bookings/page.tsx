"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  ArrowLeft,
  Eye,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY } from "@/lib/constants";
import { toast } from "sonner";

interface TodayBooking {
  id: number;
  bookingDate: string;
  bookingTime: string;
  address: string;
  accessNotes: string | null;
  totalPrice: number;
  bookingStatus: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string | null;
  urgency: "overdue" | "urgent" | "soon" | "ok" | "done";
  diffMinutes: number;
  isRescheduled: boolean;
  service: { name: string; price: number };
  user: { name: string; email: string; phone: string | null } | null;
  assignedStaff: { id: number; name: string; phone: string } | null;
  guestName: string | null;
  guestEmail: string | null;
  assignment: { id: number; status: string } | null;
}

const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cash_pending",
  "cancelled",
];

function getUrgencyBadge(urgency: string) {
  switch (urgency) {
    case "overdue":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Overdue
        </Badge>
      );
    case "urgent":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          &lt;1h
        </Badge>
      );
    case "soon":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          &lt;2h
        </Badge>
      );
    case "ok":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          On Time
        </Badge>
      );
    case "done":
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200 gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          Done
        </Badge>
      );
    default:
      return null;
  }
}

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

function formatTimeDiff(minutes: number) {
  if (minutes < 0) {
    const m = Math.abs(Math.round(minutes));
    return `${m}m overdue`;
  }
  if (minutes < 60) {
    return `in ${Math.round(minutes)}m`;
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
}

export default function TodaysBookingsPage() {
  const [bookings, setBookings] = useState<TodayBooking[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, date: "" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchBookings = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/admin/todays-bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch today's bookings", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBookings(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  const handleStatusChange = async (bookingId: number, newStatus: string) => {
    setUpdatingId(bookingId);
    try {
      const res = await fetch("/api/admin/todays-bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, bookingStatus: newStatus }),
      });
      if (res.ok) {
        toast.success(`Booking #${bookingId} status updated to ${newStatus.replace(/_/g, " ")}`);
        fetchBookings();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status", err);
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getCustomerName = (b: TodayBooking) =>
    b.user?.name || b.guestName || "Guest";
  const getCustomerEmail = (b: TodayBooking) =>
    b.user?.email || b.guestEmail || "-";
  const isGuest = (b: TodayBooking) => !b.user;

  // Sort by urgency
  const urgencyOrder = { overdue: 0, urgent: 1, soon: 2, ok: 3, done: 4 };
  const sortedBookings = [...bookings].sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <CalendarClock className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Today&apos;s Bookings</h1>
            <p className="mt-1 text-sm text-gray-500">
              {stats.date} &middot; {stats.total} active bookings
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/bookings">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              All Bookings
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchBookings(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="py-5">
            <CardContent className="px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Total Active
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <CalendarClock className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-5">
            <CardContent className="px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Today&apos;s Completed
                  </p>
                  <p className="mt-1 text-2xl font-bold text-green-600">
                    {stats.completed}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-5">
            <CardContent className="px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Pending / In Progress
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-600">
                    {stats.pending}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Auto-refresh notice */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <RefreshCw className="h-3 w-3" />
        Auto-refreshes every 5 minutes
      </div>

      {/* Bookings Table */}
      <Card className="py-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Service</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Staff</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sortedBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center">
                      <CalendarClock className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      <p className="text-gray-500">No bookings scheduled for today</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedBookings.map((booking) => (
                    <TableRow
                      key={booking.id}
                      className={
                        booking.urgency === "overdue"
                          ? "bg-red-50/50 hover:bg-red-50"
                          : booking.urgency === "urgent"
                            ? "bg-orange-50/30 hover:bg-orange-50/50"
                            : ""
                      }
                    >
                      <TableCell className="font-mono text-xs text-gray-500">
                        <div className="flex flex-col gap-0.5">
                          <span>#{booking.id}</span>
                          {booking.isRescheduled && (
                            <History className="h-3 w-3 text-amber-500" title="Rescheduled" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {getCustomerName(booking)}
                            {isGuest(booking) && (
                              <Badge variant="outline" className="ml-1.5 text-[10px] text-gray-400 border-gray-300">
                                Guest
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getCustomerEmail(booking)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <span className="text-sm">{booking.service.name}</span>
                          <p className="text-xs font-semibold text-gray-700">
                            {CURRENCY}{booking.totalPrice.toFixed(2)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-sm">
                            {booking.bookingTime?.slice(0, 5)}
                          </span>
                          <p className="text-xs text-gray-500">
                            {booking.urgency !== "done"
                              ? formatTimeDiff(booking.diffMinutes)
                              : "Completed"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getUrgencyBadge(booking.urgency)}</TableCell>
                      <TableCell>
                        {updatingId === booking.id ? (
                          <Skeleton className="h-7 w-[110px]" />
                        ) : (
                          <Select
                            value={booking.bookingStatus}
                            onValueChange={(v) =>
                              handleStatusChange(booking.id, v)
                            }
                          >
                            <SelectTrigger className="h-7 w-[120px] text-xs">
                              {getStatusBadge(booking.bookingStatus)}
                            </SelectTrigger>
                            <SelectContent>
                              {BOOKING_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {booking.assignedStaff ? (
                          <span className="text-sm">
                            {booking.assignedStaff.name}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-400">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/booking-details/${booking.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
