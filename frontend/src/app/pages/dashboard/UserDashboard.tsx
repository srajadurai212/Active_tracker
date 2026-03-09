import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import dayjs from "dayjs";
import clsx from "clsx";

import { Page } from "@/components/shared/Page";
import { Badge, Card, Skeleton } from "@/components/ui";
import { dashboardService } from "@/services/dashboardService";
import { UserDashboardStats } from "@/@types/dashboard";
import { ActivityStatus, ACTIVITY_STATUSES } from "@/@types/activity";
import { useAuthContext } from "@/app/contexts/auth/context";

// ── helpers ────────────────────────────────────────────────────────────────

const today = dayjs().startOf("day");

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label, value, accent, bg, loading, to,
}: {
  label: string; value: number; accent: string; bg: string;
  loading: boolean; to?: string;
}) {
  const inner = (
    <Card
      className={clsx(
        "flex flex-col gap-2 p-5 transition",
        to && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
      )}
    >
      <div className={clsx("inline-flex w-fit rounded-lg px-3 py-1.5", bg)}>
        <span className={clsx("text-2xl font-bold leading-none", accent)}>
          {loading ? "—" : value}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-dark-100">{label}</p>
    </Card>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}

// SVG ring showing completion %
function RingProgress({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct / 100)) * circ;
  const cx = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        className="text-gray-100 dark:text-dark-600"
      />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        className={pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-red-400"}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text
        x={cx} y={cx - 6}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="22" fontWeight="700"
        fill={pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#f87171"}
      >
        {pct}%
      </text>
      <text
        x={cx} y={cx + 14}
        textAnchor="middle"
        fontSize="10" fill="#9ca3af"
      >
        done
      </text>
    </svg>
  );
}

const STATUS_COLORS: Record<ActivityStatus, string> = {
  Open: "bg-blue-500",
  "In Progress": "bg-amber-500",
  Completed: "bg-teal-500",
  Closed: "bg-emerald-500",
  "On-Hold": "bg-gray-400",
};

const STATUS_TEXT: Record<ActivityStatus, string> = {
  Open: "text-blue-600 dark:text-blue-400",
  "In Progress": "text-amber-600 dark:text-amber-400",
  Completed: "text-teal-600 dark:text-teal-400",
  Closed: "text-emerald-600 dark:text-emerald-400",
  "On-Hold": "text-gray-500 dark:text-gray-400",
};

// ── Main component ──────────────────────────────────────────────────────────

export default function UserDashboard() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .getUserStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const TYPE_COLORS = [
    "bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500",
    "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-rose-500",
    "bg-amber-500", "bg-cyan-500",
  ];

  const total = stats?.total ?? 0;
  const done = stats?.done ?? 0;

  return (
    <Page title="My Dashboard">
      <div className="transition-content px-(--margin-x) pb-8 pt-5 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
              My Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-gray-400 dark:text-dark-400">
              {user?.full_name} · {dayjs().format("dddd, DD MMM YYYY")}
            </p>
          </div>
          <Link
            to="/activities"
            className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-600 transition hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
          >
            View All My Activities
          </Link>
        </div>

        {/* ── Row 1: Stat cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Assigned"  value={stats?.total ?? 0}              accent="text-primary-600 dark:text-primary-400" bg="bg-primary-50 dark:bg-primary-900/20"   loading={loading} />
          <StatCard label="Pending"         value={stats?.pending ?? 0}            accent="text-amber-600 dark:text-amber-400"     bg="bg-amber-50 dark:bg-amber-900/20"       loading={loading} />
          <StatCard label="Completed"       value={stats?.by_status["Completed"] ?? 0} accent="text-teal-600 dark:text-teal-400"  bg="bg-teal-50 dark:bg-teal-900/20"         loading={loading} />
          <StatCard label="Closed"          value={stats?.by_status["Closed"] ?? 0}    accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-900/20" loading={loading} />
          <StatCard label="On-Hold"         value={stats?.by_status["On-Hold"] ?? 0}   accent="text-gray-600 dark:text-gray-300"    bg="bg-gray-100 dark:bg-gray-700/40"        loading={loading} />
          <StatCard label="Overdue"         value={stats?.overdue ?? 0}            accent="text-red-600 dark:text-red-400"         bg="bg-red-50 dark:bg-red-900/20"           loading={loading} />
        </div>

        {/* ── Row 2: Progress ring + Status breakdown + By type ─────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Progress + Status breakdown */}
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-gray-800 dark:text-dark-100">My Progress</h2>
            {loading ? (
              <div className="flex gap-6">
                <Skeleton className="size-28 rounded-full shrink-0" />
                <div className="flex-1 space-y-3 pt-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7 rounded" />)}
                </div>
              </div>
            ) : total === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No activities assigned yet.</p>
            ) : (
              <div className="flex items-start gap-6">
                {/* Ring */}
                <div className="shrink-0">
                  <RingProgress pct={stats?.completion_pct ?? 0} />
                  <p className="mt-1 text-center text-xs text-gray-400 dark:text-dark-400">
                    {done} / {total} done
                  </p>
                </div>

                {/* Status bars */}
                <div className="flex-1 space-y-2.5 pt-1">
                  {(ACTIVITY_STATUSES as ActivityStatus[]).map((s) => {
                    const count = stats?.by_status[s] ?? 0;
                    return (
                      <div key={s} className="flex items-center gap-3">
                        <span className={clsx("w-20 shrink-0 text-xs font-medium", STATUS_TEXT[s])}>{s}</span>
                        <div className="flex flex-1 items-center gap-2">
                          <div className="relative h-4 flex-1 overflow-hidden rounded bg-gray-100 dark:bg-dark-600">
                            <div
                              className={clsx("h-full rounded transition-all duration-500", STATUS_COLORS[s])}
                              style={{ width: `${total > 0 ? Math.round((count / total) * 100) : 0}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-xs font-semibold text-gray-600 dark:text-dark-300">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Activity by type */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-dark-100">My Activity by Type</h2>
              {(stats?.type_breakdown.length ?? 0) > 0 && (
                <span className="text-xs text-gray-400 dark:text-dark-400">{stats?.type_breakdown.length} types</span>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7 rounded" />)}
              </div>
            ) : (stats?.type_breakdown.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No activities yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto pr-1 space-y-2.5">
                {(stats?.type_breakdown ?? []).map((item, i) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs text-gray-500 dark:text-dark-400" title={item.label}>{item.label}</span>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="relative h-5 flex-1 overflow-hidden rounded bg-gray-100 dark:bg-dark-600">
                        <div
                          className={clsx("h-full rounded transition-all duration-500", TYPE_COLORS[i % TYPE_COLORS.length])}
                          style={{ width: `${Math.round((item.count / (stats?.type_breakdown[0]?.count ?? 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="w-7 text-right text-xs font-semibold text-gray-600 dark:text-dark-300">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Row 3: Upcoming deadlines ────────────────────────────── */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-dark-600">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-dark-100">Due in Next 14 Days</h2>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-dark-400">Open activities approaching their target date</p>
            </div>
            {!loading && (stats?.upcoming.length ?? 0) > 0 && (
              <Badge color="warning" variant="soft">{stats?.upcoming.length} items</Badge>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-dark-600 dark:bg-dark-800">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Action Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Target Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={`sk-${i}`}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                ) : (stats?.upcoming.length ?? 0) === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No upcoming deadlines in the next 14 days 🎉</td></tr>
                ) : (
                  (stats?.upcoming ?? []).map((a) => {
                    const dl = dayjs(a.target_closure_date).diff(today, "day");
                    return (
                      <tr
                        key={a.id}
                        className="cursor-pointer border-b border-gray-50 hover:bg-gray-50 dark:border-dark-700 dark:hover:bg-dark-700/50"
                        onClick={() => navigate(`/history/${a.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-dark-100">{a.client_name}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-gray-600 dark:text-dark-300">{a.action_item}</td>
                        <td className="px-4 py-3">
                          <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TEXT[a.status as ActivityStatus])}>
                            {a.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-dark-400">
                          {dayjs(a.target_closure_date).format("DD MMM YYYY")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx(
                            "rounded-full px-2.5 py-0.5 text-xs font-bold",
                            dl === 0
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : dl <= 3
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          )}>
                            {dl === 0 ? "Today" : `${dl}d`}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Row 4: Overdue items ─────────────────────────────────── */}
        {(loading || (stats?.overdue_list.length ?? 0) > 0) && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-dark-600">
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-dark-100">My Overdue Activities</h2>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-dark-400">Past target date — action needed</p>
              </div>
              {!loading && <Badge color="error" variant="soft">{stats?.overdue_list.length} overdue</Badge>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-dark-600 dark:bg-dark-800">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Action Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Target Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(4)].map((_, i) => (
                      <tr key={`sk-${i}`}>
                        {[...Array(5)].map((_, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 rounded w-3/4" /></td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    (stats?.overdue_list ?? []).map((a) => (
                      <tr
                        key={a.id}
                        className="cursor-pointer border-b border-gray-50 hover:bg-gray-50 dark:border-dark-700 dark:hover:bg-dark-700/50"
                        onClick={() => navigate(`/history/${a.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-dark-100">{a.client_name}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-gray-600 dark:text-dark-300">{a.action_item}</td>
                        <td className="px-4 py-3">
                          <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TEXT[a.status as ActivityStatus])}>
                            {a.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-dark-400">
                          {dayjs(a.target_closure_date).format("DD MMM YYYY")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx(
                            "rounded-full px-2.5 py-0.5 text-xs font-bold",
                            a.days_overdue > 30
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : a.days_overdue > 14
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          )}>
                            {a.days_overdue}d
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      </div>
    </Page>
  );
}
