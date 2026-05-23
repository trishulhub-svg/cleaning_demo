import { requireAuth } from "@/lib/auth-helpers";
import ActivityLogsClient from "./activity-logs-client";

export const dynamic = 'force-dynamic';

export default async function CustomerActivityLogsPage() {
  const customer = await requireAuth(["customer"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your recent activity and account history, {customer.name}
        </p>
      </div>
      <ActivityLogsClient />
    </div>
  );
}
