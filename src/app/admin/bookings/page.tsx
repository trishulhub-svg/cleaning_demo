"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import {
  Search,
  Filter,
  FileDown,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Copy,
  Check,
  Phone,
  Shield,
  AlertCircle,
  Loader2,
  UserMinus,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
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
import { Separator } from "@/components/ui/separator";
import { CURRENCY } from "@/lib/constants";

// ============ Types ============

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
  assignment: { id: number; status: string; qrCode?: string | null } | null;
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
    confirmed: { className: "bg-green-100 text-green-800 border-green-200" },
    completed: { className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    cancelled: { className: "bg-red-100 text-red-800 border-red-200" },
    cash_pending: { className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    in_progress: { className: "bg-blue-100 text-blue-800 border-blue-200" },
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

// ============ QR Code Result Dialog ============

function QrResultDialog({
  open,
  onClose,
  bookingId,
  staffName,
  qrCode,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: number;
  staffName: string;
  qrCode: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyQrCode = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      toast.success("QR code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy QR code.");
    }
  };

  const qrScanUrl = `/public/scan-qr?code=${encodeURIComponent(qrCode)}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-green-600" />
            Staff Assigned Successfully
          </DialogTitle>
          <DialogDescription>
            Booking #{bookingId} has been assigned to {staffName} with a QR completion code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* QR Code Display */}
          <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <QrCode className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium uppercase tracking-wider mb-1">
                QR Completion Code
              </p>
              <p className="text-lg font-mono font-bold text-green-800 break-all">
                {qrCode}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyQrCode}
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-100"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Code
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Info */}
          <div className="rounded-lg bg-gray-50 p-3 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-gray-600">
                The staff member has been notified by email with the QR code and booking details.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-gray-600">
                Customers scan this code on-site to verify and complete the service.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={copyQrCode}
            className="gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy QR Code"}
          </Button>
          <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Main Component ============

function BookingsPageInner() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState("pending");
  const [dateFilter, setDateFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Assign Modal
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    bookingId: number;
    isReassign: boolean;
    assignmentId?: number;
    currentStaff?: string;
  }>({ open: false, bookingId: 0, isReassign: false });
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // QR Result Dialog
  const [qrResult, setQrResult] = useState<{
    open: boolean;
    bookingId: number;
    staffName: string;
    qrCode: string;
  } | null>(null);

  // Unassign confirm dialog
  const [unassignDialog, setUnassignDialog] = useState<{
    open: boolean;
    bookingId: number;
    bookingLabel: string;
  } | null>(null);
  const [unassigning, setUnassigning] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  // ── Assign staff with QR code generation ──
  const handleAssign = async () => {
    if (!selectedStaffId) return;
    setActionLoading(true);
    setActionError("");

    try {
      const { bookingId, isReassign, assignmentId } = assignModal;

      let endpoint: string;
      let body: Record<string, unknown>;

      if (isReassign && assignmentId) {
        // Use dedicated reassign endpoint
        endpoint = "/api/admin/bookings/reassign";
        body = {
          assignmentId,
          newStaffId: parseInt(selectedStaffId),
          adminNotes: assignNotes || undefined,
        };
      } else {
        // Use dedicated assign endpoint (generates QR code)
        endpoint = "/api/admin/bookings/assign";
        body = {
          bookingId,
          staffId: parseInt(selectedStaffId),
          notes: assignNotes || undefined,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setActionError(data.error || "Failed to assign staff. Please try again.");
        return;
      }

      // Close assign modal
      setAssignModal({ open: false, bookingId: 0, isReassign: false });
      setSelectedStaffId("");
      setAssignNotes("");
      setActionError("");

      // Show QR code result
      if (data.assignment?.qrCode) {
        setQrResult({
          open: true,
          bookingId: data.bookingId || bookingId,
          staffName: data.staffName || "Staff",
          qrCode: data.assignment.qrCode,
        });
      }

      toast.success(
        isReassign
          ? "Staff reassigned successfully!"
          : "Staff assigned with QR code generated!"
      );

      // Refresh bookings list
      fetchBookings();
    } catch (err) {
      console.error("Failed to assign staff", err);
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const jsPDF = require("jspdf");
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      // Header
      doc.setFillColor(34, 197, 94);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("GreenLeaf Cleaning Services", margin, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Bookings Report", margin, 20);
      doc.setFontSize(8);
      doc.text(`Filter: ${statusFilter} | Date: ${dateFilter} | Assignment: ${assignmentFilter}`, margin, 25);
      doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, pageWidth - margin, 12, { align: "right" });
      doc.setTextColor(0, 0, 0);

      const tableBody = bookings.map((b) => [
        `#${b.id}`,
        b.user?.name || b.guestName || "Guest",
        b.user?.email || b.guestEmail || "-",
        b.service.name,
        b.bookingDate,
        b.bookingTime?.slice(0, 5) || "-",
        b.address.length > 40 ? b.address.slice(0, 37) + "..." : b.address,
        `${CURRENCY}${b.totalPrice.toFixed(2)}`,
        b.bookingStatus.replace(/_/g, " "),
        b.paymentStatus.replace(/_/g, " "),
        b.assignedStaff?.name || "Unassigned",
      ]);

      (doc as any).autoTable({
        startY: 35,
        head: [["Booking ID", "Customer", "Email", "Service", "Date", "Time", "Address", "Price", "Status", "Payment", "Staff"]],
        body: tableBody,
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [34, 197, 94], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 12 },
          2: { cellWidth: 22 },
          6: { cellWidth: 35 },
        },
      });

      // Page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      }

      doc.save(`GreenLeaf-Bookings-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Bookings PDF exported successfully!");
    } catch (err) {
      console.error("Failed to export PDF:", err);
      toast.error("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

  const handleUnassign = async (bookingId: number) => {
    setUnassigning(true);
    try {
      const res = await fetch("/api/admin/bookings/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to unassign");
        return;
      }
      toast.success("Staff unassigned successfully!");
      setUnassignDialog(null);
      fetchBookings();
    } catch (err) {
      toast.error("Failed to unassign staff.");
    } finally {
      setUnassigning(false);
    }
  };

  const getCustomerName = (b: Booking) =>
    b.user?.name || b.guestName || "Guest";
  const getCustomerEmail = (b: Booking) =>
    b.user?.email || b.guestEmail || "-";

  // Get selected staff details for the modal
  const selectedStaff = staff.find(
    (s) => s.id.toString() === selectedStaffId
  );

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
        <Button variant="outline" onClick={handleExportPdf} disabled={exporting} className="gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Export PDF
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
                placeholder="Search by name, email, booking #, or invoice #..."
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
                        <div className="flex items-center gap-1.5">
                          {booking.assignedStaff ? (
                            <>
                              <span className="text-sm">
                                {booking.assignedStaff.name}
                              </span>
                              {booking.assignment?.qrCode && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 text-green-700 bg-green-50 border-green-200 cursor-pointer"
                                  title={`QR: ${booking.assignment.qrCode}`}
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      booking.assignment!.qrCode!
                                    );
                                    toast.success("QR code copied!");
                                  }}
                                >
                                  <QrCode className="h-2.5 w-2.5 mr-0.5" />
                                  QR
                                </Badge>
                              )}
                            </>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs text-gray-400"
                            >
                              Unassigned
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {booking.assignedStaff && booking.bookingStatus !== 'completed' && booking.bookingStatus !== 'cancelled' ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setAssignModal({
                                    open: true,
                                    bookingId: booking.id,
                                    isReassign: true,
                                    assignmentId: booking.assignment?.id,
                                    currentStaff: booking.assignedStaff.name,
                                  })
                                }
                                className="h-7 text-xs"
                              >
                                Reassign
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setUnassignDialog({
                                    open: true,
                                    bookingId: booking.id,
                                    bookingLabel: `#${booking.id} (${booking.assignedStaff.name})`,
                                  })
                                }
                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <UserMinus className="h-3 w-3 mr-1" />
                                Unassign
                              </Button>
                            </>
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
        onOpenChange={(open) => {
          setAssignModal((prev) => ({ ...prev, open }));
          if (!open) {
            setActionError("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {assignModal.isReassign ? (
                <>
                  <UserPlus className="h-5 w-5 text-amber-600" />
                  Reassign Staff
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 text-green-600" />
                  Assign Staff
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {assignModal.isReassign
                ? `Currently assigned to ${assignModal.currentStaff}. Select a new staff member.`
                : "Select a staff member to assign this booking. A QR completion code will be generated automatically."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Staff Selector */}
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select
                value={selectedStaffId}
                onValueChange={setSelectedStaffId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-600"
                        >
                          {s.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Staff Details */}
            {selectedStaff && (
              <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-700">
                    {selectedStaff.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedStaff.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {selectedStaff.role}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span>{selectedStaff.phone}</span>
                  </div>
                  <div className="text-gray-500 truncate">
                    {selectedStaff.email}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder={
                  assignModal.isReassign
                    ? "Reason for reassignment..."
                    : "Any notes for the staff member..."
                }
                rows={3}
              />
            </div>

            {/* Info about QR code for new assignments */}
            {!assignModal.isReassign && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-start gap-2">
                <QrCode className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <p className="text-xs text-green-700">
                  A unique QR completion code will be generated and sent to the staff
                  member&apos;s email. The customer can scan this code on-site to complete
                  the service.
                </p>
              </div>
            )}

            {/* Error display */}
            {actionError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{actionError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignModal({
                  open: false,
                  bookingId: 0,
                  isReassign: false,
                });
                setSelectedStaffId("");
                setAssignNotes("");
                setActionError("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedStaffId || actionLoading}
              className={
                assignModal.isReassign
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {actionLoading ? (
                "Saving..."
              ) : assignModal.isReassign ? (
                "Reassign Staff"
              ) : (
                "Assign & Generate QR"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Result Dialog */}
      {qrResult && (
        <QrResultDialog
          open={qrResult.open}
          onClose={() => setQrResult(null)}
          bookingId={qrResult.bookingId}
          staffName={qrResult.staffName}
          qrCode={qrResult.qrCode}
        />
      )}

      {/* Unassign Confirmation Dialog */}
      <Dialog
        open={unassignDialog?.open || false}
        onOpenChange={(open) => !open && setUnassignDialog(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <UserMinus className="h-5 w-5" />
              Unassign Staff
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the staff assignment for booking{" "}
              <strong>{unassignDialog?.bookingLabel}</strong>? The booking will
              be set back to pending status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnassignDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => unassignDialog && handleUnassign(unassignDialog.bookingId)}
              disabled={unassigning}
            >
              {unassigning ? "Removing..." : "Unassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
      <BookingsPageInner />
    </Suspense>
  );
}
