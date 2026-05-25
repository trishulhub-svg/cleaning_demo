"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ScrollText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ActivityLog {
  id: number;
  actorType: string;
  actorId: number;
  actorName: string;
  actorEmail: string | null;
  action: string;
  category: string;
  severity: string;
  targetType: string | null;
  targetId: number | null;
  targetName: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestUri: string | null;
  createdAt: string;
}

const CATEGORIES = [
  "auth",
  "booking",
  "payment",
  "system",
  "security",
];

const SEVERITIES = ["low", "medium", "high", "critical"];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-violet-100 text-violet-800 border-violet-200",
  booking: "bg-blue-100 text-blue-800 border-blue-200",
  payment: "bg-green-100 text-green-800 border-green-200",
  system: "bg-gray-100 text-gray-800 border-gray-200",
  security: "bg-red-100 text-red-800 border-red-200",
};

function formatTimestamp(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseDetails(details: string | null): Record<string, unknown> | null {
  if (!details) return null;
  try {
    return JSON.parse(details);
  } catch {
    return null;
  }
}

function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`text-sm font-medium ${className || ""}`} {...props}>
      {children}
    </label>
  );
}

export default function ActivityLogsClient() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: categoryFilter,
        severity: severityFilter,
        search: searchQuery,
        page: page.toString(),
        limit: "25",
      });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/customer/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, severityFilter, searchQuery, startDate, endDate, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, severityFilter, searchQuery, startDate, endDate]);

  const toggleExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setCategoryFilter("all");
    setSeverityFilter("all");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };

  const hasFilters =
    categoryFilter !== "all" ||
    severityFilter !== "all" ||
    searchQuery !== "" ||
    startDate !== "" ||
    endDate !== "";

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="py-0">
        <CardContent className="px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by action, target, details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="mr-1 h-3.5 w-3.5" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {formatCategory(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    {SEVERITIES.map((sev) => (
                      <SelectItem key={sev} value={sev}>
                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap text-sm text-gray-500">From:</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap text-sm text-gray-500">To:</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="py-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden sm:table-cell">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="hidden md:table-cell">Target</TableHead>
                  <TableHead className="hidden lg:table-cell">Details</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <ScrollText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      <p className="text-gray-500">No activity logs found</p>
                      {hasFilters && (
                        <Button
                          variant="outline"
                          className="mt-3"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const isExpanded = expandedRows.has(log.id);
                    const details = parseDetails(log.details);
                    return (
                      <Fragment key={log.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleExpand(log.id)}
                        >
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTimestamp(log.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{log.action}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={CATEGORY_COLORS[log.category] || "bg-gray-100 text-gray-600"}
                            >
                              {formatCategory(log.category)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.low}
                            >
                              {log.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div>
                              {log.targetName ? (
                                <span className="text-sm">{log.targetName}</span>
                              ) : log.targetId ? (
                                <span className="text-sm text-gray-500">#{log.targetId}</span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                              {log.targetType && (
                                <p className="text-xs text-gray-400">
                                  {log.targetType}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-xs text-gray-500 max-w-[200px] truncate block">
                              {log.details || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${log.id}-detail`}>
                            <TableCell colSpan={7} className="bg-gray-50 px-6 py-3">
                              <div className="space-y-2">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  <div>
                                    <span className="text-xs font-medium text-gray-500">Timestamp:</span>
                                    <span className="ml-2 text-sm text-gray-700">
                                      {formatTimestamp(log.createdAt)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-500">Category:</span>
                                    <span className="ml-2 text-sm">
                                      <Badge
                                        variant="outline"
                                        className={CATEGORY_COLORS[log.category] || "bg-gray-100 text-gray-600"}
                                      >
                                        {formatCategory(log.category)}
                                      </Badge>
                                    </span>
                                  </div>
                                  {log.requestUri && (
                                    <div>
                                      <span className="text-xs font-medium text-gray-500">Request URI:</span>
                                      <span className="ml-2 text-sm font-mono text-gray-700">{log.requestUri}</span>
                                    </div>
                                  )}
                                </div>
                                {details && (
                                  <Alert>
                                    <AlertDescription>
                                      <pre className="max-h-40 overflow-auto text-xs text-gray-700 whitespace-pre-wrap">
                                        {JSON.stringify(details, null, 2)}
                                      </pre>
                                    </AlertDescription>
                                  </Alert>
                                )}
                                {log.details && !details && (
                                  <Alert>
                                    <AlertDescription>
                                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {log.details}
                                      </p>
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} entries)
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
    </div>
  );
}
