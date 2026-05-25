"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, Search } from "lucide-react";
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

interface Refund {
  id: number;
  amount: number;
  refundType: string;
  status: string;
  reason: string | null;
  adminNotes: string | null;
  requestedAt: string;
  processedAt: string | null;
  booking: {
    id: number;
    bookingDate: string;
    address: string;
    service: { name: string };
    user: { name: string; email: string } | null;
    guestName: string | null;
    guestEmail: string | null;
  };
}

const REFUND_STATUSES = ["all", "pending", "approved", "processing", "completed", "rejected"];

function getRefundStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-blue-100 text-blue-800 border-blue-200",
    processing: "bg-purple-100 text-purple-800 border-purple-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <Badge variant="outline" className={map[status] || "bg-gray-100 text-gray-800"}>
      {status}
    </Badge>
  );
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Action modal
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    refundId: number;
    action: "approve" | "reject" | "complete";
    refundAmount: number;
    customerName: string;
  }>({ open: false, refundId: 0, action: "approve", refundAmount: 0, customerName: "" });
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/refunds?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRefunds(data.refunds);
        setStatusCounts(data.statusCounts);
      }
    } catch (err) {
      console.error("Failed to fetch refunds", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleAction = async () => {
    setActionLoading(true);
    try {
      const { refundId, action } = actionModal;
      await fetch("/api/admin/refunds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundId,
          action,
          adminNotes,
        }),
      });
      setActionModal({ open: false, refundId: 0, action: "approve", refundAmount: 0, customerName: "" });
      setAdminNotes("");
      fetchRefunds();
    } catch (err) {
      console.error("Failed to process refund action", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getCustomerName = (r: Refund) =>
    r.booking.user?.name || r.booking.guestName || "Guest";

  const filteredRefunds = refunds.filter(
    (r) =>
      getCustomerName(r).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.booking.user?.email || r.booking.guestEmail || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.booking.id.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Refund Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and process refund requests
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {REFUND_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === status
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            {statusCounts[status] !== undefined && (
              <span className="ml-1.5 text-xs opacity-75">
                {statusCounts[status]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by customer, email, or booking ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Refunds Table */}
      <Card className="py-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Booking</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredRefunds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center">
                      <p className="text-gray-500">No refunds found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRefunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="font-mono text-xs text-gray-500">
                        #{refund.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {getCustomerName(refund)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {refund.booking.user?.email || refund.booking.guestEmail || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <p className="text-sm">
                            #{refund.booking.id} - {refund.booking.service.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {refund.booking.bookingDate}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-red-600">
                          {CURRENCY}{refund.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {refund.refundType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[150px] truncate text-xs text-gray-500">
                          {refund.reason || "No reason provided"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {getRefundStatusBadge(refund.status)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-gray-500">
                          {new Date(refund.requestedAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {refund.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setActionModal({
                                    open: true,
                                    refundId: refund.id,
                                    action: "approve",
                                    refundAmount: refund.amount,
                                    customerName: getCustomerName(refund),
                                  })
                                }
                                className="h-7 gap-1 text-xs text-green-600 hover:text-green-700"
                              >
                                <Check className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setActionModal({
                                    open: true,
                                    refundId: refund.id,
                                    action: "reject",
                                    refundAmount: refund.amount,
                                    customerName: getCustomerName(refund),
                                  })
                                }
                                className="h-7 gap-1 text-xs text-red-600 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                                Reject
                              </Button>
                            </>
                          )}
                          {refund.status === "approved" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setActionModal({
                                  open: true,
                                  refundId: refund.id,
                                  action: "complete",
                                  refundAmount: refund.amount,
                                  customerName: getCustomerName(refund),
                                })
                              }
                              className="h-7 gap-1 text-xs"
                            >
                              Mark Complete
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
        </CardContent>
      </Card>

      {/* Action Modal */}
      <Dialog
        open={actionModal.open}
        onOpenChange={(open) =>
          setActionModal((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal.action === "approve" && "Approve Refund"}
              {actionModal.action === "reject" && "Reject Refund"}
              {actionModal.action === "complete" && "Complete Refund"}
            </DialogTitle>
            <DialogDescription>
              {actionModal.action === "approve" &&
                `You are about to approve a refund of ${CURRENCY}${actionModal.refundAmount.toFixed(2)} for ${actionModal.customerName}.`}
              {actionModal.action === "reject" &&
                `You are about to reject the refund request of ${CURRENCY}${actionModal.refundAmount.toFixed(2)} from ${actionModal.customerName}.`}
              {actionModal.action === "complete" &&
                `Mark this refund of ${CURRENCY}${actionModal.refundAmount.toFixed(2)} as completed.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Refund Amount</span>
                <span className="font-semibold text-red-600">
                  {CURRENCY}{actionModal.refundAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{actionModal.customerName}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Admin Notes (optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this decision..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionModal({ open: false, refundId: 0, action: "approve", refundAmount: 0, customerName: "" })
              }
            >
              Cancel
            </Button>
            <Button
              variant={
                actionModal.action === "reject" ? "destructive" : "default"
              }
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading
                ? "Processing..."
                : actionModal.action === "approve"
                  ? "Approve Refund"
                  : actionModal.action === "reject"
                    ? "Reject Refund"
                    : "Mark Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
