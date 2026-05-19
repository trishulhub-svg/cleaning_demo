"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Filter,
  Download,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCY } from "@/lib/constants";

interface Booking {
  id: number;
  bookingDate: string;
  bookingTime: string;
  address: string;
  accessNotes: string | null;
  totalPrice: number;
  bookingStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  assignedStaffId: number | null;
  createdAt: string;
  service: { name: string };
  user: { name: string; email: string; phone: string | null } | null;
  assignedStaff: { id: number; name: string; phone: string } | null;
  guestName: string | null;
  guestEmail: string | null;
  assignment: { id: number; status: string } | null;
}

interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
}

const BOOKING_STATUSES = ["all", "pending", "confirmed", "completed", "cancelled"];
const PAYMENT_STATUSES = ["paid", "pending", "cash_on_service"];

function getStatusBadge(status: string) {
  const map: Record<string, { className: string }> = {
    pending: { className: "bg-amber-100 text-amber-800 border-amber-200" },
    confirmed: { className: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { className: "bg-green-100 text-green-800 border-green-200" },
    cancelled: { className: "bg-red-100 text-red-800 border-red-200" },
    cash_pending: { className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  };
  const config = map[status] || { className: "bg-gray-100 text-gray-800" };
  return (
    <Badge variant="outline" className={config.className}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function getPaymentBadge(status: string) {
  const map: Record<string, { className: string }> = {
    paid: { className: "bg-green-100 text-green-800 border-green-200" },
    pending: { className: "bg-amber-100 text-amber-800 border-amber-200" },
    cash_on_service: { className: "bg-sky-100 text-sky-800 border-sky-200" },
  };
  const config = map[status] || { className: "bg-gray-100 text-gray-800" };
  return (
    <Badge variant="outline" className={config.className}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    bookingId: number;
    isReassign: boolean;
    currentStaff?: string;
  }>({ open: false, bookingId: 0, isReassign: false });
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        date: dateFilter,
        assignment: assignmentFilter,
        search: searchQuery,
        page: page.toString(),
        limit: "20",
      });
      const res = await fetch(`/api/admin/bookings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
        setStatusCounts(data.statusCounts);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch bookings", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, assignmentFilter, searchQuery, page]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/staff/active");
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff);
      }
    } catch (err) {
      console.error("Failed to fetch staff", err);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFilter, assignmentFilter, searchQuery]);

  const handleStatusChange = async (bookingId: number, newStatus: string) => {
    try {
      await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          action: "updateStatus",
          status: newStatus,
        }),
      });
      fetchBookings();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handlePaymentStatusChange = async (
    bookingId: number,
    newStatus: string
  ) => {
    try {
      await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          action: "updatePaymentStatus",
          paymentStatus: newStatus,
        }),
      });
      fetchBookings();
    } catch (err) {
      console.error("Failed to update payment status", err);
    }
  };

  const handleAssign = async () => {
    if (!selectedStaffId) return;
    setActionLoading(true);
    try {
      const { bookingId, isReassign } = assignModal;
      await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          action: isReassign ? "reassign" : "assign",
          staffId: parseInt(selectedStaffId),
          notes: assignNotes,
        }),
      });
      setAssignModal({ open: false, bookingId: 0, isReassign: false });
      setSelectedStaffId("");
      setAssignNotes("");
      fetchBookings();
    } catch (err) {
      console.error("Failed to assign staff", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    const csvRows = [
      [
        "ID",
        "Customer",
        "Email",
        "Service",
        "Date",
        "Time",
        "Address",
        "Price",
        "Status",
        "Payment",
        "Staff",
      ].join(","),
      ...bookings.map((b) =>
        [
          b.id,
          `"${b.user?.name || b.guestName || "Guest"}"`,
          `"${b.user?.email || b.guestEmail || ""}"`,
          `"${b.service.name}"`,
          b.bookingDate,
          b.bookingTime?.slice(0, 5),
          `"${b.address}"`,
          b.totalPrice,
          b.bookingStatus,
          b.paymentStatus,
          `"${b.assignedStaff?.name || "Unassigned"}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCustomerName = (b: Booking) =>
    b.user?.name || b.guestName || "Guest";
  const getCustomerEmail = (b: Booking) =>
    b.user?.email || b.guestEmail || "-";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all cleaning bookings ({total} total)
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {BOOKING_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === status
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {status === "all" ? "All" : status.replace(/_/g, " ")}
            {statusCounts[status] !== undefined && (
              <span className="ml-1.5 text-xs opacity-75">
                {statusCounts[status]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="py-0">
        <CardContent className="px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name, email, or booking ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="mr-1 h-3.5 w-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
              {statusFilter === "pending" && (
                <Select
                  value={assignmentFilter}
                  onValueChange={setAssignmentFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Time</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Payment</TableHead>
                  <TableHead className="hidden lg:table-cell">Staff</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center">
                      <p className="text-gray-500">No bookings found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-xs text-gray-500">
                        #{booking.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {getCustomerName(booking)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getCustomerEmail(booking)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">{booking.service.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{booking.bookingDate}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">
                          {booking.bookingTime?.slice(0, 5)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold">
                          {CURRENCY}
                          {booking.totalPrice.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={booking.bookingStatus}
                          onValueChange={(v) =>
                            handleStatusChange(booking.id, v)
                          }
                        >
                          <SelectTrigger className="h-7 w-[110px] text-xs">
                            {getStatusBadge(booking.bookingStatus)}
                          </SelectTrigger>
                          <SelectContent>
                            {BOOKING_STATUSES.filter((s) => s !== "all").map(
                              (s) => (
                                <SelectItem key={s} value={s}>
                                  {s.replace(/_/g, " ")}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Select
                          value={booking.paymentStatus}
                          onValueChange={(v) =>
                            handlePaymentStatusChange(booking.id, v)
                          }
                        >
                          <SelectTrigger className="h-7 w-[110px] text-xs">
                            {getPaymentBadge(booking.paymentStatus)}
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s.replace(/_/g, " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <div className="flex items-center justify-end gap-1">
                          {booking.assignedStaff ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setAssignModal({
                                  open: true,
                                  bookingId: booking.id,
                                  isReassign: true,
                                  currentStaff: booking.assignedStaff.name,
                                })
                              }
                              className="h-7 text-xs"
                            >
                              Reassign
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setAssignModal({
                                  open: true,
                                  bookingId: booking.id,
                                  isReassign: false,
                                })
                              }
                              className="h-7 gap-1 text-xs"
                            >
                              <UserPlus className="h-3 w-3" />
                              Assign
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign / Reassign Modal */}
      <Dialog
        open={assignModal.open}
        onOpenChange={(open) =>
          setAssignModal((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assignModal.isReassign ? "Reassign Staff" : "Assign Staff"}
            </DialogTitle>
            <DialogDescription>
              {assignModal.isReassign
                ? `Currently assigned to ${assignModal.currentStaff}. Select a new staff member.`
                : "Select a staff member to assign this booking."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select
                value={selectedStaffId}
                onValueChange={setSelectedStaffId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select staff..." />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Any notes for the staff member..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setAssignModal({ open: false, bookingId: 0, isReassign: false })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedStaffId || actionLoading}
            >
              {actionLoading
                ? "Saving..."
                : assignModal.isReassign
                  ? "Reassign"
                  : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
