import { useState } from "react";
import dayjs from "dayjs";

import { Page } from "@/components/shared/Page";
import { Button, Card, Skeleton } from "@/components/ui";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { AuditAction } from "@/@types/audit";

const ACTION_COLORS: Record<AuditAction, string> = {
  CREATE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  UPDATE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// Format a single field diff: "old → new" for UPDATE, just the value for CREATE/DELETE
function formatDiff(
  action: AuditAction,
  old_values: Record<string, unknown> | null,
  new_values: Record<string, unknown> | null,
): React.ReactNode {
  if (action === "UPDATE" && old_values && new_values) {
    const keys = Object.keys(new_values);
    return (
      <div className="space-y-0.5">
        {keys.map((key) => {
          const oldVal = String(old_values[key] ?? "—");
          const newVal = String(new_values[key] ?? "—");
          return (
            <div key={key} className="flex flex-wrap items-center gap-1 text-xs">
              <span className="font-medium text-gray-600 dark:text-dark-300">
                {key.replace(/_/g, " ")}:
              </span>
              <span className="text-red-500 line-through">{oldVal}</span>
              <span className="text-gray-400">→</span>
              <span className="text-green-600 dark:text-green-400">{newVal}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (action === "CREATE" && new_values) {
    const keys = Object.keys(new_values).filter(
      (k) => new_values[k] !== null && new_values[k] !== undefined && new_values[k] !== "",
    );
    return (
      <span className="text-xs text-gray-500 dark:text-dark-400">
        {keys.length} field{keys.length !== 1 ? "s" : ""} set
      </span>
    );
  }

  if (action === "DELETE" && old_values) {
    return (
      <span className="text-xs text-gray-500 dark:text-dark-400">Record removed</span>
    );
  }

  return <span className="text-gray-400">—</span>;
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("");

  const { data, isLoading, error } = useAuditLogs({
    page,
    page_size: 50,
    action: (actionFilter as AuditAction) || undefined,
  });

  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  return (
    <Page title="Audit Log">
      <div className="transition-content px-(--margin-x) pb-5 pt-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-100">Audit Log</h1>
          <p className="text-sm text-gray-500 dark:text-dark-400">
            {data ? `${data.total} total entries` : isLoading ? "Loading..." : ""}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-4 p-4">
          <div className="flex gap-3">
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
            {actionFilter && (
              <Button variant="outlined" onClick={() => { setActionFilter(""); setPage(1); }}>
                Clear
              </Button>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-dark-600 dark:bg-dark-700">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-dark-300">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-dark-300">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-dark-300">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-dark-300">Entity</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-dark-300">Changes</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-dark-300">IP</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={`sk-${i}`}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-red-400">{error}</td>
                  </tr>
                ) : !data || data.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">No audit logs found.</td>
                  </tr>
                ) : (
                  data.items.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-700/50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-dark-400">
                        {dayjs(log.changed_at).format("DD MMM YYYY HH:mm")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-700 dark:text-dark-200">
                        {log.changed_by?.full_name ?? "System"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action]}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 capitalize text-gray-600 dark:text-dark-300">
                        {log.table_name.replace(/_/g, " ")}
                      </td>
                      <td className="max-w-sm px-4 py-3">
                        {formatDiff(log.action, log.old_values, log.new_values)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-400 dark:text-dark-500">
                        {log.ip_address ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-dark-600">
              <span className="text-sm text-gray-500 dark:text-dark-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outlined" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outlined" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
