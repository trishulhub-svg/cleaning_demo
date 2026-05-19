import { requireAuth, getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CURRENCY } from "@/lib/constants";
import { format } from "date-fns";
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  User,
  PlayCircle,
  Banknote,
  Briefcase,
  Timer,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ============ Page Component ============

export default async function StaffDashboardPage() {
  const staff = await requireAuth(["staff"]);
  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch staff assignments with booking details
  const assignments = await db.bookingAssignment.findMany({
    where: { staffId: staff.id },
    include: {
      booking: {
        include: {
          service: { select: { name: true, durationHours: true } },
          user: { select: { name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
    take: 50,
  });

  // Filter today's assignments
  const todayAssignments = assignments.filter(
    (a) => a.booking.bookingDate === today
  );

  // Calculate stats
  const todayStats = {
    total: todayAssignments.length,
    assigned: todayAssignments.filter((a) => a.status === "assigned").length,
    inProgress: todayAssignments.filter(
      (a) => a.status === "in_progress"
    ).length,
    completed: todayAssignments.filter(
      (a) => a.status === "completed"
    ).length,
    cashPending: todayAssignments.filter(
      (a) => a.status === "cash_pending"
    ).length,
  };

  // Status config
  const statusConfig: Record<
    string,
    { label: string; className: string; dotClass: string }
  > = {
    assigned: {
      label: "Pending",
      className:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
      dotClass: "bg-amber-500",
    },
    in_progress: {
      label: "In Progress",
      className:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
      dotClass: "bg-blue-500",
    },
    completed: {
      label: "Completed",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
    },
    cash_pending: {
      label: "Cash Pending",
      className:
        "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
      dotClass: "bg-orange-500",
    },
    cancelled: {
      label: "Cancelled",
      className:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
      dotClass: "bg-red-500",
    },
  };

  const formatTime = (time: string) => {
    try {
      return format(new Date(`2000-01-01T${time}`), "h:mm a");
    } catch {
      return time;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {staff.name.split(" ")[0]}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          <CalendarCheck className="h-3 w-3 mr-1" />
          {todayAssignments.length} job{todayAssignments.length !== 1 ? "s" : ""} today
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {todayStats.total}
                </p>
                <p className="text-xs text-gray-500">Today&apos;s Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {todayStats.assigned}
                </p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Timer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {todayStats.inProgress}
                </p>
                <p className="text-xs text-gray-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {todayStats.completed}
                </p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-green-600" />
            Today&apos;s Schedule
          </CardTitle>
          {todayAssignments.length === 0 && (
            <CardDescription>
              No assignments scheduled for today
            </CardDescription>
          )}
        </CardHeader>
        {todayAssignments.length > 0 && (
          <CardContent>
            <div className="space-y-3">
              {todayAssignments.map((assignment) => {
                const status =
                  statusConfig[assignment.status] || statusConfig.assigned;
                return (
                  <div
                    key={assignment.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-colors hover:bg-gray-50"
                  >
                    {/* Time */}
                    <div className="flex items-center gap-2 sm:w-24 shrink-0">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700">
                        {formatTime(assignment.booking.bookingTime)}
                      </span>
                    </div>

                    {/* Service & Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {assignment.booking.service.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-500 truncate">
                          {assignment.booking.address}
                        </span>
                      </div>
                    </div>

                    {/* Customer */}
                    <div className="flex items-center gap-2 sm:w-36 shrink-0">
                      <User className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-600 truncate">
                        {assignment.booking.user?.name ||
                          assignment.booking.guestName ||
                          "Guest"}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      <Badge
                        variant="outline"
                        className={status.className}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${status.dotClass} mr-1.5`}
                        />
                        {status.label}
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {assignment.status === "assigned" && (
                        <form action={async () => {
                          "use server";
                          const { startAssignment } = await import("./actions");
                          await startAssignment(assignment.id);
                        }}>
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                          >
                            <PlayCircle className="h-3.5 w-3.5 mr-1" />
                            Start
                          </Button>
                        </form>
                      )}
                      {assignment.status === "in_progress" && (
                        <form action={async () => {
                          "use server";
                          const { completeAssignment } = await import("./actions");
                          await completeAssignment(assignment.id);
                        }}>
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Complete
                          </Button>
                        </form>
                      )}
                      {assignment.status === "cash_pending" && (
                        <form action={async () => {
                          "use server";
                          const { confirmCashPayment } = await import("./actions");
                          await confirmCashPayment(assignment.bookingId);
                        }}>
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="border-orange-300 text-orange-700 hover:bg-orange-50 h-8 px-3"
                          >
                            <Banknote className="h-3.5 w-3.5 mr-1" />
                            Confirm Cash
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* All Assignments Table */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All My Assignments</CardTitle>
          <CardDescription>
            Your recent booking assignments — {assignments.length} total
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                No assignments yet. They will appear here once assigned by an
                admin.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Booking ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Service
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                      Time
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                      Address
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assignments.map((assignment) => {
                    const status =
                      statusConfig[assignment.status] || statusConfig.assigned;
                    return (
                      <tr
                        key={assignment.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-medium text-gray-600">
                            GL-{String(assignment.bookingId).padStart(5, "0")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900 text-sm">
                            {assignment.booking.service.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className="text-gray-600 text-sm">
                            {assignment.booking.bookingDate}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <span className="text-gray-600 text-sm">
                            {formatTime(assignment.booking.bookingTime)}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <span className="text-gray-600 text-sm max-w-[200px] block truncate">
                            {assignment.booking.address}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <span className="text-gray-600 text-sm">
                            {assignment.booking.user?.name ||
                              assignment.booking.guestName ||
                              "Guest"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`${status.className} text-xs`}
                          >
                            {status.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {assignment.status === "assigned" && (
                            <form action={async () => {
                              "use server";
                              const { startAssignment } = await import("./actions");
                              await startAssignment(assignment.id);
                            }}>
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50"
                              >
                                <PlayCircle className="h-3 w-3 mr-1" />
                                Start
                              </Button>
                            </form>
                          )}
                          {assignment.status === "in_progress" && (
                            <form action={async () => {
                              "use server";
                              const { completeAssignment } = await import("./actions");
                              await completeAssignment(assignment.id);
                            }}>
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            </form>
                          )}
                          {assignment.status === "cash_pending" && (
                            <form action={async () => {
                              "use server";
                              const { confirmCashPayment } = await import("./actions");
                              await confirmCashPayment(assignment.bookingId);
                            }}>
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                              >
                                <Banknote className="h-3 w-3 mr-1" />
                                Cash Paid
                              </Button>
                            </form>
                          )}
                          {(assignment.status === "completed" ||
                            assignment.status === "cancelled") && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
