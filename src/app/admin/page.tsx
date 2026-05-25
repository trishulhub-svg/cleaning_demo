"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  Sparkles,
  BarChart3,
  RotateCcw,
  Clock,
  PoundSterling,
  UserCircle,
  ClipboardList,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCY } from "@/lib/constants";

interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingBookings: number;
  pendingRefunds: number;
  totalCustomers: number;
  totalStaff: number;
  todayAssignments: number;
}

interface RecentBooking {
  id: number;
  bookingDate: string;
  bookingTime: string;
  totalPrice: number;
  bookingStatus: string;
  paymentStatus: string;
  service: { name: string };
  user: { name: string; email: string } | null;
  assignedStaff: { name: string } | null;
  guestName: string | null;
  guestEmail: string | null;
}

interface TodayAssignment {
  id: number;
  status: string;
  notes: string | null;
  assignedAt: string;
  booking: {
    id: number;
    bookingDate: string;
    bookingTime: string;
    address: string;
    totalPrice: number;
    bookingStatus: string;
    service: { name: string };
    user: { name: string; email: string } | null;
  };
  staff: { name: string; phone: string };
}

const statCards = [
  { key: "totalBookings" as const, label: "Total Bookings", icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
  { key: "totalRevenue" as const, label: "Total Revenue", icon: PoundSterling, color: "text-green-600 bg-green-50", format: true },
  { key: "monthlyRevenue" as const, label: "Monthly Revenue", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50", format: true },
  { key: "pendingBookings" as const, label: "Pending Bookings", icon: Clock, color: "text-amber-600 bg-amber-50" },
  { key: "pendingRefunds" as const, label: "Pending Refunds", icon: RotateCcw, color: "text-red-600 bg-red-50" },
  { key: "totalCustomers" as const, label: "Total Customers", icon: UserCircle, color: "text-purple-600 bg-purple-50" },
  { key: "totalStaff" as const, label: "Total Staff", icon: Users, color: "text-teal-600 bg-teal-50" },
  { key: "todayAssignments" as const, label: "Today's Assignments", icon: CalendarDays, color: "text-orange-600 bg-orange-50" },
];

const quickActions = [
  { label: "Manage Bookings", href: "/admin/bookings", icon: CalendarDays },
  { label: "Manage Services", href: "/admin/services", icon: Sparkles },
  { label: "Manage Staff", href: "/admin/staff", icon: Users },
  { label: "Financial Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "View Customers", href: "/admin/customers", icon: UserCircle },
  { label: "Manage Refunds", href: "/admin/refunds", icon: RotateCcw },
];

function getStatusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    pending: { variant: "secondary", className: "bg-amber-100 text-amber-800 border-amber-200" },
    confirmed: { variant: "default", className: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { variant: "default", className: "bg-green-100 text-green-800 border-green-200" },
    cancelled: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200" },
    cash_pending: { variant: "secondary", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  };
  const config = map[status] || { variant: "outline" as const };
  return (
    <Badge variant={config.variant} className={config.className}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [pendingAttention, setPendingAttention] = useState<RecentBooking[]>([]);
  const [todayAssignments, setTodayAssignments] = useState<TodayAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecentBookings(data.recentBookings);
          setPendingAttention(data.pendingAttention);
          setTodayAssignments(data.todayAssignments);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (val: number) => `${CURRENCY}${val.toFixed(2)}`;
  const getCustomerName = (b: RecentBooking) => b.user?.name || b.guestName || "Guest";
  const getCustomerEmail = (b: RecentBooking) => b.user?.email || b.guestEmail || "-";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your cleaning business operations
        </p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            const value = stats?.[card.key] ?? 0;
            return (
              <Card key={card.key} className="py-5">
                <CardContent className="px-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {card.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {card.format ? formatCurrency(value) : value.toLocaleString()}
                      </p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="py-5">
        <CardHeader className="pb-0 px-5">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pt-4">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card className="py-0">
          <CardHeader className="px-5 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Bookings</CardTitle>
              <Link href="/admin/bookings">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentBookings.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No bookings yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {getCustomerName(booking)}
                        </p>
                        {getStatusBadge(booking.bookingStatus)}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {booking.service.name} &middot; {booking.bookingDate}{" "}
                        {booking.bookingTime?.slice(0, 5)}
                      </p>
                    </div>
                    <p className="ml-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(booking.totalPrice)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Attention */}
        <Card className="py-0">
          <CardHeader className="px-5 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Needs Attention
              </CardTitle>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                {pendingAttention.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : pendingAttention.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">All caught up! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pendingAttention.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3 transition-colors hover:bg-amber-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {getCustomerName(booking)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {booking.service.name} &middot;{" "}
                        {getCustomerEmail(booking)}
                      </p>
                    </div>
                    <Link href="/admin/bookings">
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Assignments */}
      <Card className="py-0">
        <CardHeader className="px-5 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Today&apos;s Staff Assignments
            </CardTitle>
            <Badge variant="secondary">
              {todayAssignments.length} assignment{todayAssignments.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : todayAssignments.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No assignments for today
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="hidden md:table-cell">Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Address</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.staff.name}
                    </TableCell>
                    <TableCell>
                      {assignment.booking.service.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {assignment.booking.user?.name || "Guest"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                      {assignment.booking.address}
                    </TableCell>
                    <TableCell>
                      {assignment.booking.bookingTime?.slice(0, 5)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          assignment.status === "in_progress"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          assignment.status === "in_progress"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-gray-100 text-gray-800 border-gray-200"
                        }
                      >
                        {assignment.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
