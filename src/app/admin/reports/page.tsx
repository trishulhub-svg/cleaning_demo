"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PoundSterling,
  Calendar,
  TrendingUp,
  CreditCard,
  Banknote,
  RotateCcw,
  BarChart3,
  Clock,
  FileDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { showApiError } from "@/lib/error-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { format } from "date-fns";

interface RevenueData {
  total: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
}

interface PaymentMethodData {
  method: string;
  revenue: number;
  count: number;
}

interface StatusBreakdownData {
  status: string;
  count: number;
  revenue: number;
}

interface TopServiceData {
  serviceId: number;
  serviceName: string;
  revenue: number;
  bookings: number;
}

interface RefundData {
  totalProcessed: number;
  pendingAmount: number;
  pendingCount: number;
}

interface DailyRevenueData {
  bookingDate: string;
  _sum: { totalPrice: number };
  _count: { id: number };
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    cash_pending: "bg-yellow-100 text-yellow-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
}

export default function ReportsPage() {
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdownData[]>([]);
  const [topServices, setTopServices] = useState<TopServiceData[]>([]);
  const [refunds, setRefunds] = useState<RefundData | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/admin/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRevenue(data.revenue);
        setPaymentMethods(data.paymentMethods);
        setStatusBreakdown(data.statusBreakdown);
        setTopServices(data.topServices);
        setRefunds(data.refunds);
        setDailyRevenue(data.dailyRevenue);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const totalBookings = statusBreakdown.reduce((a, b) => a + b.count, 0);

  // ── PDF Export ──
  const handleExportPdf = async () => {
    if (loading) return;
    setExporting(true);
    try {
      // jspdf v4+ is ESM-only — must use dynamic import
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // ── Header ──
      doc.setFillColor(34, 197, 94);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("GreenLeaf Cleaning Services", margin, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Financial Report", margin, 20);
      const dateRangeStr = dateFrom || dateTo
        ? `Date Range: ${dateFrom || "All"} to ${dateTo || "All"}`
        : "All Time";
      doc.setFontSize(8);
      doc.text(dateRangeStr, margin, 25);
      doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, pageWidth - margin, 12, { align: "right" });
      doc.setTextColor(0, 0, 0);

      let y = 35;

      // Helper to add section heading
      const addHeading = (title: string) => {
        if (y + 15 > pageHeight - 15) {
          doc.addPage();
          y = 15;
        }
        doc.setFillColor(240, 253, 244);
        doc.rect(margin, y - 4, pageWidth - margin * 2, 8, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 101, 52);
        doc.text(title, margin, y + 1);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        y += 10;
      };

      // Helper to ensure page space
      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - 15) {
          doc.addPage();
          y = 15;
        }
      };

      // ── Summary Cards Table ──
      addHeading("Revenue Summary");
      ensureSpace(30);
      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: [
          ["Total Revenue", `${CURRENCY}${(revenue?.total ?? 0).toFixed(2)}`],
          ["This Month", `${CURRENCY}${(revenue?.thisMonth ?? 0).toFixed(2)}`],
          ["This Week", `${CURRENCY}${(revenue?.thisWeek ?? 0).toFixed(2)}`],
          ["Today", `${CURRENCY}${(revenue?.today ?? 0).toFixed(2)}`],
        ],
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: "bold" } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ── Booking Status Breakdown ──
      addHeading("Booking Status Breakdown");
      ensureSpace(20);
      autoTable(doc, {
        startY: y,
        head: [["Status", "Count", "Revenue", "%"]],
        body: statusBreakdown.map((s) => [
          s.status.replace(/_/g, " "),
          String(s.count),
          `${CURRENCY}${s.revenue.toFixed(2)}`,
          totalBookings > 0 ? `${((s.count / totalBookings) * 100).toFixed(1)}%` : "0%",
        ]),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ── Payment Method Breakdown ──
      addHeading("Revenue by Payment Method");
      ensureSpace(20);
      const totalRev = paymentMethods.reduce((a, b) => a + b.revenue, 0);
      autoTable(doc, {
        startY: y,
        head: [["Method", "Revenue", "Transactions", "%"]],
        body: paymentMethods.map((pm) => [
          pm.method === "stripe" ? "Card (Stripe)" : pm.method === "cash" ? "Cash" : pm.method,
          `${CURRENCY}${pm.revenue.toFixed(2)}`,
          String(pm.count),
          totalRev > 0 ? `${((pm.revenue / totalRev) * 100).toFixed(1)}%` : "0%",
        ]),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ── Top Services Table ──
      addHeading("Top Services by Revenue");
      ensureSpace(20);
      autoTable(doc, {
        startY: y,
        head: [["#", "Service", "Revenue", "Bookings"]],
        body: topServices.map((s, idx) => [
          String(idx + 1),
          s.serviceName,
          `${CURRENCY}${s.revenue.toFixed(2)}`,
          String(s.bookings),
        ]),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ── Refund Summary ──
      addHeading("Refund Summary");
      ensureSpace(20);
      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: [
          ["Total Processed Refunds", `${CURRENCY}${(refunds?.totalProcessed ?? 0).toFixed(2)}`],
          ["Pending Amount", `${CURRENCY}${(refunds?.pendingAmount ?? 0).toFixed(2)}`],
          ["Pending Count", String(refunds?.pendingCount ?? 0)],
          ["Net Revenue", `${CURRENCY}${((revenue?.total ?? 0) - (refunds?.totalProcessed ?? 0)).toFixed(2)}`],
        ],
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: "bold" } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ── Daily Revenue Chart (capture via html2canvas) ──
      if (dailyRevenue.length > 0) {
        try {
          const html2canvas = (await import("html2canvas")).default;
          const el = document.getElementById("revenue-chart-capture");
          if (el) {
            ensureSpace(80);
            addHeading("Daily Revenue (Last 30 Days)");
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", logging: false });
            const imgData = canvas.toDataURL("image/png");
            const imgWidth = pageWidth - margin * 2;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            if (y + imgHeight > pageHeight - 15) {
              doc.addPage();
              y = 15;
            }
            doc.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight);
            y += imgHeight + 8;
          }
        } catch (chartErr) {
          console.error("Failed to capture chart for PDF:", chartErr);
        }
      }

      // ── Page Numbers ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      }

      const filename = `GreenLeaf-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(filename);
      toast.success("Report PDF exported successfully!");
    } catch (err) {
      showApiError({ title: "PDF Export Failed", error: err, context: "Exporting reports to PDF" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Revenue analytics and business insights
          </p>
        </div>
        <Button variant="outline" onClick={handleExportPdf} disabled={loading || exporting} className="gap-2">
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Export PDF
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="py-5">
        <CardContent className="px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="from" className="text-xs text-gray-500">
                From Date
              </Label>
              <Input
                id="from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="to" className="text-xs text-gray-500">
                To Date
              </Label>
              <Input
                id="to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo(""); }}>
              Clear Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="py-5">
            <CardContent className="px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Total Revenue
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {CURRENCY}{(revenue?.total ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <PoundSterling className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-5">
            <CardContent className="px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    This Month
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {CURRENCY}{(revenue?.thisMonth ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-5">
            <CardContent className="px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    This Week
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {CURRENCY}{(revenue?.thisWeek ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-5">
            <CardContent className="px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Today
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {CURRENCY}{(revenue?.today ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue by Payment Method */}
        <Card className="py-0">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Revenue by Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : paymentMethods.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No payment data available
              </p>
            ) : (
              <div className="space-y-4">
                {paymentMethods.map((pm) => {
                  const totalRev = paymentMethods.reduce(
                    (a, b) => a + b.revenue,
                    0
                  );
                  const percentage =
                    totalRev > 0
                      ? ((pm.revenue / totalRev) * 100).toFixed(1)
                      : "0";
                  return (
                    <div key={pm.method}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {pm.method === "stripe" ? (
                            <CreditCard className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Banknote className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-sm font-medium capitalize">
                            {pm.method === "stripe"
                              ? "Card (Stripe)"
                              : pm.method === "cash"
                                ? "Cash"
                                : pm.method}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold">
                            {CURRENCY}{pm.revenue.toFixed(2)}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pm.method === "stripe"
                              ? "bg-green-500"
                              : "bg-amber-500"
                          }`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {pm.count} transaction{pm.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Status Breakdown */}
        <Card className="py-0">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Booking Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : statusBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No booking data available
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusBreakdown.map((s) => (
                    <TableRow key={s.status}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(s.status)}
                        >
                          {s.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {s.count}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {CURRENCY}{s.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-500">
                        {totalBookings > 0
                          ? ((s.count / totalBookings) * 100).toFixed(1)
                          : 0}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Services by Revenue */}
        <Card className="py-0">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Services by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topServices.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No service revenue data available
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {topServices.map((service, idx) => (
                  <div
                    key={service.serviceId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {service.serviceName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {service.bookings} booking
                          {service.bookings !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {CURRENCY}{service.revenue.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refund Summary */}
        <Card className="py-0">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Refund Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Total Processed Refunds
                  </p>
                  <p className="mt-1 text-xl font-bold text-red-600">
                    {CURRENCY}
                    {(refunds?.totalProcessed ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Pending Amount
                    </p>
                    <p className="mt-1 text-lg font-bold text-amber-700">
                      {CURRENCY}
                      {(refunds?.pendingAmount ?? 0).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      {refunds?.pendingCount ?? 0} pending
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Net Revenue
                    </p>
                    <p className="mt-1 text-lg font-bold text-green-700">
                      {CURRENCY}
                      {(
                        (revenue?.total ?? 0) -
                        (refunds?.totalProcessed ?? 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Revenue (last 30 days) */}
      <Card className="py-0">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base">Daily Revenue (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="h-48 w-full">
              <Skeleton className="h-full w-full rounded" />
            </div>
          ) : dailyRevenue.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No daily revenue data available
            </p>
          ) : (
            <div id="revenue-chart-capture" className="flex items-end gap-[2px] h-48 overflow-x-auto pb-2 bg-white p-2 rounded">
              {dailyRevenue.map((d) => {
                const maxRev = Math.max(
                  ...dailyRevenue.map((x) => x._sum.totalPrice),
                  1
                );
                const height = (d._sum.totalPrice / maxRev) * 100;
                return (
                  <div
                    key={d.bookingDate}
                    className="flex flex-col items-center gap-1 min-w-[12px]"
                    title={`${d.bookingDate}: ${CURRENCY}${d._sum.totalPrice.toFixed(2)} (${d._count.id} bookings)`}
                  >
                    <div
                      className="w-full min-w-[8px] rounded-t bg-green-400 transition-all hover:bg-green-600"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <span className="text-[9px] text-gray-400 rotate-0">
                      {d.bookingDate.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
