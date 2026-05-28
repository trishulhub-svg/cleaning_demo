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
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { showApiError } from "@/lib/error-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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

const PIE_COLORS: Record<string, string> = {
  stripe: "#22c55e",
  cash: "#f59e0b",
};

const PIE_DEFAULT_COLOR = "#6366f1";

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

  // ── Data for Recharts ──
  const dailyRevenueChartData = dailyRevenue.map((d) => ({
    day: d.bookingDate.slice(8),
    revenue: d._sum.totalPrice,
    bookings: d._count.id,
  }));

  const totalPaymentRev = paymentMethods.reduce((a, b) => a + b.revenue, 0);
  const paymentMethodsChartData = paymentMethods.map((pm) => ({
    name: pm.method === "stripe" ? "Card (Stripe)" : pm.method === "cash" ? "Cash" : pm.method,
    value: pm.revenue,
    color: PIE_COLORS[pm.method] || PIE_DEFAULT_COLOR,
    count: pm.count,
    pct: totalPaymentRev > 0 ? ((pm.revenue / totalPaymentRev) * 100).toFixed(1) : "0",
  }));

  const topServicesChartData = (topServices.length > 10 ? topServices.slice(0, 10) : topServices)
    .slice()
    .reverse()
    .map((s) => ({
      name: s.serviceName,
      revenue: s.revenue,
      bookings: s.bookings,
    }));

  // ── Tabular PDF Export (renamed from handleExportPdf) ──
  const handleExportTabularPdf = async () => {
    if (loading) return;
    setExporting(true);
    try {
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
          const el = document.getElementById("chart-daily-revenue");
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
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      }

      const filename = `GreenLeaf-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(filename);
      toast.success("Tabular report PDF exported successfully!");
    } catch (err) {
      showApiError({ title: "PDF Export Failed", error: err, context: "Exporting tabular report to PDF" });
    } finally {
      setExporting(false);
    }
  };

  // ── Visual PDF Export (native jsPDF charts — no html2canvas) ──
  const handleExportVisualPdf = async () => {
    if (loading) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const usableWidth = pageWidth - margin * 2;

      // ── Header ──
      doc.setFillColor(34, 197, 94);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("GreenLeaf Cleaning Services", margin, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Visual Financial Report", margin, 20);
      const dateRangeStr = dateFrom || dateTo
        ? `Date Range: ${dateFrom || "All"} to ${dateTo || "All"}`
        : "All Time";
      doc.setFontSize(8);
      doc.text(dateRangeStr, margin, 25);
      doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, pageWidth - margin, 12, { align: "right" });
      doc.setTextColor(0, 0, 0);

      let y = 35;

      const addHeading = (title: string) => {
        if (y + 15 > pageHeight - 15) { doc.addPage(); y = 15; }
        doc.setFillColor(240, 253, 244);
        doc.rect(margin, y - 4, usableWidth, 8, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 101, 52);
        doc.text(title, margin, y + 1);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        y += 10;
      };

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - 15) { doc.addPage(); y = 15; }
      };

      // ══════════════════════════════════════════
      // 1. Revenue Summary — 4 colored stat boxes
      // ══════════════════════════════════════════
      addHeading("Revenue Summary");
      ensureSpace(30);

      const statBoxes = [
        { label: "Total Revenue", value: `${CURRENCY}${(revenue?.total ?? 0).toFixed(2)}`, fill: [34, 197, 94] },
        { label: "This Month", value: `${CURRENCY}${(revenue?.thisMonth ?? 0).toFixed(2)}`, fill: [59, 130, 246] },
        { label: "This Week", value: `${CURRENCY}${(revenue?.thisWeek ?? 0).toFixed(2)}`, fill: [139, 92, 246] },
        { label: "Today", value: `${CURRENCY}${(revenue?.today ?? 0).toFixed(2)}`, fill: [249, 115, 22] },
      ];
      const boxWidth = (usableWidth - 9) / 4;
      const boxHeight = 22;
      statBoxes.forEach((box, i) => {
        const boxX = margin + i * (boxWidth + 3);
        doc.setFillColor(box.fill[0], box.fill[1], box.fill[2]);
        doc.roundedRect(boxX, y, boxWidth, boxHeight, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7); doc.setFont("helvetica", "normal");
        doc.text(box.label, boxX + 3, y + 7);
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.text(box.value, boxX + 3, y + 16);
      });
      doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
      y += boxHeight + 10;

      // ══════════════════════════════════════════
      // 2. Daily Revenue — native Bar Chart
      // ══════════════════════════════════════════
      if (dailyRevenue.length > 0) {
        ensureSpace(75);
        addHeading("Daily Revenue (Last 30 Days)");

        const chartH = 55;
        const chartLeft = margin + 18;
        const chartW = usableWidth - 18;
        const maxRev = Math.max(...dailyRevenue.map((d) => d._sum.totalPrice), 1);

        // Y-axis grid lines & labels
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        for (let i = 0; i <= 4; i++) {
          const gy = y + chartH - (chartH / 4) * i;
          doc.line(chartLeft, gy, chartLeft + chartW, gy);
          doc.setFontSize(6); doc.setTextColor(160, 160, 160);
          doc.text(`${CURRENCY}${((maxRev / 4) * i).toFixed(0)}`, chartLeft - 2, gy + 2, { align: "right" });
        }

        // Bars
        const barSpace = chartW / dailyRevenue.length;
        const barW = Math.max(barSpace * 0.6, 1.5);
        dailyRevenue.forEach((d, i) => {
          const barH = Math.max((d._sum.totalPrice / maxRev) * chartH, 0.5);
          const bx = chartLeft + i * barSpace + (barSpace - barW) / 2;
          const by = y + chartH - barH;
          doc.setFillColor(34, 197, 94);
          doc.rect(bx, by, barW, barH, "F");
          // X label every ~5 days
          if (i % 5 === 0 || i === dailyRevenue.length - 1) {
            doc.setFontSize(6); doc.setTextColor(150, 150, 150);
            doc.text(d.bookingDate.slice(8), bx + barW / 2, y + chartH + 4, { align: "center" });
          }
        });

        // Axis lines
        doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
        doc.line(chartLeft, y, chartLeft, y + chartH);
        doc.line(chartLeft, y + chartH, chartLeft + chartW, y + chartH);

        y += chartH + 12;
      }

      // ══════════════════════════════════════════
      // 3. Payment Methods — native Donut Chart
      // ══════════════════════════════════════════
      if (paymentMethods.length > 0) {
        ensureSpace(70);
        addHeading("Revenue by Payment Method");

        const totalPayRev = paymentMethods.reduce((a, b) => a + b.revenue, 0);
        const donutCX = margin + 25;
        const donutCY = y + 25;
        const donutR = 22;
        const innerR = 11;
        const pieColors: Record<string, [number, number, number]> = {
          stripe: [34, 197, 94],
          cash: [245, 158, 11],
        };
        const steps = 60;
        let startAngle = -Math.PI / 2;

        paymentMethods.forEach((pm) => {
          if (pm.revenue <= 0) return;
          const sliceAngle = (pm.revenue / totalPayRev) * Math.PI * 2;
          const col = pieColors[pm.method] || [99, 102, 241];

          // Draw slice as thin triangles (donut: skip inner circle)
          for (let s = 0; s < steps; s++) {
            const a1 = startAngle + (sliceAngle * s / steps);
            const a2 = startAngle + (sliceAngle * (s + 1) / steps);
            const ox1 = donutCX + donutR * Math.cos(a1);
            const oy1 = donutCY + donutR * Math.sin(a1);
            const ox2 = donutCX + donutR * Math.cos(a2);
            const oy2 = donutCY + donutR * Math.sin(a2);
            const ix1 = donutCX + innerR * Math.cos(a1);
            const iy1 = donutCY + innerR * Math.sin(a1);
            const ix2 = donutCX + innerR * Math.cos(a2);
            const iy2 = donutCY + innerR * Math.sin(a2);

            doc.setFillColor(col[0], col[1], col[2]);
            // Outer quad as 2 triangles
            doc.triangle(ox1, oy1, ox2, oy2, ix2, iy2, "F");
            doc.triangle(ox1, oy1, ix2, iy2, ix1, iy1, "F");
          }
          startAngle += sliceAngle;
        });

        // Center label
        doc.setFillColor(255, 255, 255);
        doc.circle(donutCX, donutCY, innerR - 0.5, "F");
        doc.setFontSize(7); doc.setTextColor(100, 100, 100);
        doc.text("Total", donutCX, donutCY - 1, { align: "center" });
        doc.setFontSize(9); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
        doc.text(`${CURRENCY}${totalPayRev.toFixed(0)}`, donutCX, donutCY + 5, { align: "center" });
        doc.setFont("helvetica", "normal");

        // Legend — right side
        const legendX = margin + 55;
        let legendY = y + 8;
        paymentMethods.forEach((pm) => {
          const col = pieColors[pm.method] || [99, 102, 241];
          const pct = totalPayRev > 0 ? ((pm.revenue / totalPayRev) * 100).toFixed(1) : "0";
          const label = pm.method === "stripe" ? "Card (Stripe)" : pm.method === "cash" ? "Cash" : pm.method;

          doc.setFillColor(col[0], col[1], col[2]);
          doc.roundedRect(legendX, legendY, 5, 5, 1, 1, "F");
          doc.setFontSize(8); doc.setTextColor(50, 50, 50);
          doc.text(`${label}`, legendX + 8, legendY + 4);
          doc.setFontSize(7); doc.setTextColor(130, 130, 130);
          doc.text(`${CURRENCY}${pm.revenue.toFixed(2)}  (${pct}%)  ${pm.count} txns`, legendX + 8, legendY + 9);
          legendY += 15;
        });

        y += 55;
      }

      // ══════════════════════════════════════════
      // 4. Booking Status — horizontal bar summary
      // ══════════════════════════════════════════
      if (statusBreakdown.length > 0) {
        addHeading("Booking Status Breakdown");
        ensureSpace(15);
        const maxCount = Math.max(...statusBreakdown.map((s) => s.count), 1);

        statusBreakdown.forEach((s) => {
          ensureSpace(12);
          const pct = totalBookings > 0 ? ((s.count / totalBookings) * 100).toFixed(1) : "0";
          const statusLabel = s.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

          // Background bar
          doc.setFillColor(245, 245, 245);
          doc.roundedRect(margin, y, usableWidth, 9, 1.5, 1.5, "F");

          // Colored progress bar
          const barW = Math.max((s.count / maxCount) * (usableWidth * 0.3), 2);
          const statusColors: Record<string, [number, number, number]> = {
            pending: [245, 158, 11], confirmed: [59, 130, 246], completed: [34, 197, 94],
            cancelled: [239, 68, 68], cash_pending: [234, 179, 8], in_progress: [99, 102, 241],
          };
          const col = statusColors[s.status] || [156, 163, 175];
          doc.setFillColor(col[0], col[1], col[2]);
          doc.roundedRect(margin, y, barW, 9, 1.5, 1.5, "F");

          // Text
          doc.setFontSize(8); doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "bold");
          doc.text(`${statusLabel}`, margin + 3, y + 6);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80, 80, 80);
          doc.text(`${s.count} (${pct}%)  |  ${CURRENCY}${s.revenue.toFixed(2)}`, margin + barW + 4, y + 6);
          y += 11;
        });
        y += 5;
      }

      // ══════════════════════════════════════════
      // 5. Top Services — horizontal bar chart
      // ══════════════════════════════════════════
      const topSvcs = topServices.slice(0, 10);
      if (topSvcs.length > 0) {
        ensureSpace(20 + topSvcs.length * 10);
        addHeading("Top Services by Revenue");

        const maxSvcRev = Math.max(...topSvcs.map((s) => s.revenue), 1);
        const labelColW = 45;
        const barAreaW = usableWidth - labelColW - 35;

        topSvcs.forEach((svc, idx) => {
          ensureSpace(10);
          const barW = Math.max((svc.revenue / maxSvcRev) * barAreaW, 2);

          // Rank number
          doc.setFontSize(7); doc.setTextColor(130, 130, 130);
          doc.text(`${idx + 1}.`, margin, y + 5);

          // Service name
          doc.setFontSize(8); doc.setTextColor(50, 50, 50);
          const truncName = svc.serviceName.length > 22 ? svc.serviceName.slice(0, 19) + "..." : svc.serviceName;
          doc.text(truncName, margin + 6, y + 5);

          // Background bar
          doc.setFillColor(240, 240, 240);
          doc.roundedRect(margin + labelColW, y + 0.5, barAreaW, 6, 1, 1, "F");

          // Filled bar
          doc.setFillColor(34, 197, 94);
          doc.roundedRect(margin + labelColW, y + 0.5, barW, 6, 1, 1, "F");

          // Revenue value
          doc.setFontSize(7); doc.setTextColor(60, 60, 60);
          doc.text(`${CURRENCY}${svc.revenue.toFixed(0)}`, margin + labelColW + barAreaW + 3, y + 5);

          y += 9;
        });
        y += 5;
      }

      // ══════════════════════════════════════════
      // 6. Refund Summary Table
      // ══════════════════════════════════════════
      addHeading("Refund Summary");
      ensureSpace(30);
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

      // ── Page Numbers ──
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      }

      const filename = `GreenLeaf-Visual-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(filename);
      toast.success("Visual report PDF exported successfully!");
    } catch (err) {
      showApiError({ title: "Visual PDF Export Failed", error: err, context: "Exporting visual report to PDF" });
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={loading || exporting} className="gap-2">
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Export PDF
              {!exporting && <ChevronDown className="h-3 w-3 opacity-50" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportTabularPdf} disabled={loading || exporting}>
              <FileDown className="h-4 w-4" />
              Tabular Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportVisualPdf} disabled={loading || exporting}>
              <BarChart3 className="h-4 w-4" />
              Visual Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        {/* Revenue by Payment Method — PieChart */}
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
              <div id="chart-payment-methods" className="w-full" style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, pct }) => `${name} ${pct}%`}
                      labelLine
                    >
                      {paymentMethodsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${CURRENCY}${value.toFixed(2)}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
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
        {/* Top Services by Revenue — Horizontal BarChart */}
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
              <div id="chart-top-services" className="w-full" style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topServicesChartData} layout="vertical" margin={{ left: 10, right: 16, top: 4, bottom: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={120}
                    />
                    <Tooltip
                      formatter={(value: number) => `${CURRENCY}${value.toFixed(2)}`}
                    />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
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

      {/* Daily Revenue (last 30 days) — Recharts BarChart */}
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
            <div id="chart-daily-revenue" className="w-full" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenueChartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    interval={4}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(label) => `Day ${label}`}
                    formatter={(value: number) => [
                      `${CURRENCY}${value.toFixed(2)}`,
                      "Revenue",
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
