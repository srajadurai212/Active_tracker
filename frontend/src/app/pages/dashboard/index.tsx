import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import dayjs from "dayjs";
import clsx from "clsx";

import { Page } from "@/components/shared/Page";
import { Avatar, Badge, Card, Skeleton } from "@/components/ui";
import { dashboardService } from "@/services/dashboardService";
import { AdminDashboardStats, ResourceCompletionItem } from "@/@types/dashboard";
import { ActivityStatus } from "@/@types/activity";
import { useAuthContext } from "@/app/contexts/auth/context";
import UserDashboard from "./UserDashboard";

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ActivityStatus, { color: string; label: string }> = {
  Open: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Open" },
  "In Progress": { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "In Progress" },
  Closed: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Closed" },
  "On-Hold": { color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300", label: "On-Hold" },
  Completed: { color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400", label: "Completed" },
};

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent: string;
  bg: string;
  loading: boolean;
  to?: string;
}

function StatCard({ label, value, sub, accent, bg, loading, to }: StatCardProps) {
  const inner = (
    <Card className={clsx("flex flex-col gap-2 p-5 transition", to && "cursor-pointer hover:shadow-md hover:-translate-y-0.5")}>
      <div className={clsx("inline-flex w-fit rounded-lg px-3 py-1.5", bg)}>
        <span className={clsx("text-2xl font-bold leading-none", accent)}>
          {loading ? "—" : value}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-dark-100">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-dark-400">{sub}</p>}
    </Card>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}

// ─── Horizontal bar ──────────────────────────────────────────────────────────

function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-dark-600">
      <div
        className={clsx("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Resource stacked bar chart ──────────────────────────────────────────────

const SEGMENTS = [
  { key: "open" as const,        label: "Open",        color: "bg-blue-400",    hex: "#60a5fa" },
  { key: "in_progress" as const, label: "In Progress", color: "bg-amber-400",   hex: "#fbbf24" },
  { key: "completed" as const,   label: "Completed",   color: "bg-teal-400",    hex: "#2dd4bf" },
  { key: "closed" as const,      label: "Closed",      color: "bg-emerald-500", hex: "#10b981" },
];

const CHART_H = 200;
const GRID_LINES = 5;

function ResourceStackedBarChart({ data }: { data: ResourceCompletionItem[] }) {
  const [tooltip, setTooltip] = useState<{ r: ResourceCompletionItem; x: number; y: number } | null>(null);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(
    () => new Set(SEGMENTS.map((s) => s.key))
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleKey = (key: string) => {
    setActiveKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // keep at least one active
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const visibleSegments = SEGMENTS.filter((s) => activeKeys.has(s.key));

  const maxVisible = Math.max(
    ...data.map((r) => visibleSegments.reduce((sum, s) => sum + r[s.key], 0)),
    1
  );
  const step = Math.ceil(maxVisible / GRID_LINES);
  const gridLines = Array.from({ length: GRID_LINES + 1 }, (_, i) => i * step);

  return (
    <div className="relative">
      {/* Legend — clickable */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {SEGMENTS.map((s) => {
          const active = activeKeys.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleKey(s.key)}
              className={clsx(
                "flex items-center gap-1.5 text-xs transition-opacity select-none cursor-pointer",
                active ? "opacity-100" : "opacity-35"
              )}
            >
              <span className={clsx(
                "inline-block size-2.5 rounded-sm shrink-0 transition-colors",
                active ? s.color : "bg-gray-300 dark:bg-dark-500"
              )} />
              <span className={active ? "text-gray-600 dark:text-dark-300" : "text-gray-400 dark:text-dark-500 line-through"}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chart area */}
      <div ref={containerRef} className="overflow-x-auto custom-scrollbar pb-1">
        <div style={{ minWidth: Math.max(data.length * 52, 300) }}>
          {/* Y-axis + bars */}
          <div className="relative flex" style={{ height: CHART_H + 8 }}>
            {/* Y-axis labels */}
            <div className="flex flex-col-reverse justify-between pr-2 text-right" style={{ height: CHART_H }}>
              {gridLines.map((v) => (
                <span key={v} className="text-[10px] leading-none text-gray-400 dark:text-dark-500">{v}</span>
              ))}
            </div>

            {/* Grid + bars */}
            <div className="relative flex-1">
              {/* Horizontal gridlines */}
              <div className="absolute inset-0 flex flex-col-reverse justify-between pointer-events-none" style={{ height: CHART_H }}>
                {gridLines.map((v) => (
                  <div key={v} className="w-full border-t border-gray-100 dark:border-dark-600" />
                ))}
              </div>

              {/* Bars */}
              <div className="relative flex items-end gap-1 px-2" style={{ height: CHART_H }}>
                {data.map((r) => {
                  const visibleTotal = visibleSegments.reduce((sum, s) => sum + r[s.key], 0);
                  const barH = Math.max(Math.round((visibleTotal / maxVisible) * CHART_H), visibleTotal > 0 ? 4 : 0);
                  return (
                    <div
                      key={r.id}
                      className="relative flex flex-1 flex-col-reverse cursor-pointer group"
                      style={{ height: barH, minWidth: 28, maxWidth: 56 }}
                      onMouseMove={(e) => setTooltip({ r, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {visibleSegments.map((s) => {
                        const segH = visibleTotal > 0 ? Math.round((r[s.key] / visibleTotal) * barH) : 0;
                        return segH > 0 ? (
                          <div
                            key={s.key}
                            className={clsx("w-full transition-all group-hover:opacity-80", s.color)}
                            style={{ height: segH }}
                          />
                        ) : null;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex items-start gap-1 pl-[calc(1.5rem+0.5rem)] px-2 mt-1">
            {data.map((r) => (
              <div key={r.id} className="flex flex-1 justify-center" style={{ minWidth: 28, maxWidth: 56 }}>
                <span
                  className="block truncate text-center text-[10px] text-gray-500 dark:text-dark-400"
                  title={r.name}
                >
                  {r.name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-[9999] min-w-[150px] rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg dark:border-dark-600 dark:bg-dark-800"
          style={{ top: tooltip.y + 14, left: tooltip.x + 14 }}
        >
          <p className="mb-1.5 text-xs font-semibold text-gray-800 dark:text-dark-100">{tooltip.r.name}</p>
          <div className="space-y-0.5">
            {SEGMENTS.map((s) => {
              const active = activeKeys.has(s.key);
              return (
                <div key={s.key} className={clsx("flex items-center justify-between gap-3 text-xs", !active && "opacity-35")}>
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-dark-400">
                    <span className={clsx("inline-block size-2 rounded-sm", active ? s.color : "bg-gray-300 dark:bg-dark-500")} />
                    {s.label}
                  </span>
                  <span className="font-medium text-gray-700 dark:text-dark-200">{tooltip.r[s.key]}</span>
                </div>
              );
            })}
            <div className="mt-1 border-t border-gray-100 pt-1 dark:border-dark-600 flex justify-between text-xs">
              <span className="text-gray-400 dark:text-dark-400">Visible total</span>
              <span className="font-semibold text-gray-700 dark:text-dark-200">
                {visibleSegments.reduce((sum, s) => sum + tooltip.r[s.key], 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuthContext();

  if (user?.role !== "admin") {
    return <UserDashboard />;
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardService
      .getAdminStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const TYPE_COLORS: Record<string, string> = {
    Call: "bg-sky-500",
    Meeting: "bg-violet-500",
    Email: "bg-indigo-500",
    Demo: "bg-emerald-500",
    Proposal: "bg-orange-500",
    "Follow-up": "bg-pink-500",
    Other: "bg-gray-400",
  };

  return (
    <Page title="Dashboard">
      <div className="transition-content px-(--margin-x) pb-8 pt-5 space-y-6">

        {/* Page title */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Dashboard
          </h1>
          <span className="text-sm text-gray-400 dark:text-dark-400">
            {dayjs().format("dddd, DD MMM YYYY")}
          </span>
        </div>

        {/* ── Row 1: Stat cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          <StatCard label="Total" value={stats?.total ?? 0} accent="text-primary-600 dark:text-primary-400" bg="bg-primary-50 dark:bg-primary-900/20" loading={loading} to="/activities" />
          <StatCard label="Open" value={stats?.open ?? 0} accent="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" loading={loading} to="/activities?status=Open" />
          <StatCard label="In Progress" value={stats?.in_progress ?? 0} accent="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-900/20" loading={loading} to="/activities?status=In Progress" />
          <StatCard label="Completed" value={stats?.completed ?? 0} accent="text-teal-600 dark:text-teal-400" bg="bg-teal-50 dark:bg-teal-900/20" loading={loading} to="/activities?status=Completed" />
          <StatCard label="Closed" value={stats?.closed ?? 0} accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-900/20" loading={loading} to="/activities?status=Closed" />
          <StatCard label="On-Hold" value={stats?.on_hold ?? 0} accent="text-gray-600 dark:text-gray-300" bg="bg-gray-100 dark:bg-gray-700/40" loading={loading} to="/activities?status=On-Hold" />
          <StatCard label="Overdue" value={stats?.overdue ?? 0} sub="Past target date" accent="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/20" loading={loading} to="/activities?filter=overdue" />
        </div>

        {/* ── Row 2: Overdue by resource + Pending by resource ───────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Missed target dates by resource */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-dark-100">Missed Target Dates</h2>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-dark-400">Resources with most overdue activities</p>
              </div>
              <Badge color="error" variant="soft">{stats?.overdue ?? 0} total</Badge>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-9 rounded-lg" />
                ))}
              </div>
            ) : (stats?.top_overdue_by_user ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400 dark:text-dark-400">No overdue activities 🎉</p>
            ) : (
              <div className="space-y-3">
                {(stats?.top_overdue_by_user ?? []).map((item, i) => {
                  const href = item.id !== "__unassigned__"
                    ? `/activities?filter=overdue&assigned_to=${item.id}`
                    : "/activities?filter=overdue";
                  return (
                    <Link key={item.name} to={href} className="flex items-center gap-3 rounded-lg p-1 -mx-1 transition hover:bg-gray-50 dark:hover:bg-dark-600 cursor-pointer">
                      <span className="w-5 text-center text-xs font-medium text-gray-400 dark:text-dark-400">{i + 1}</span>
                      <Avatar size={7} name={item.name} initialColor="auto" classNames={{ display: "text-xs shrink-0" }} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="truncate text-sm font-medium text-gray-700 dark:text-dark-200">{item.name}</span>
                          <span className="ml-2 shrink-0 text-xs font-semibold text-red-600 dark:text-red-400">{item.count}</span>
                        </div>
                        <HBar value={item.count} max={stats?.top_overdue_by_user[0]?.count ?? 1} color="bg-red-500" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Pending items by resource */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-dark-100">Pending Items by Resource</h2>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-dark-400">Open + In Progress activities per person</p>
              </div>
              <Badge color="warning" variant="soft">{(stats?.open ?? 0) + (stats?.in_progress ?? 0)} total</Badge>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-9 rounded-lg" />
                ))}
              </div>
            ) : (stats?.top_pending_by_user ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400 dark:text-dark-400">No pending activities</p>
            ) : (
              <div className="space-y-3">
                {(stats?.top_pending_by_user ?? []).map((item, i) => {
                  const href = item.id !== "__unassigned__"
                    ? `/activities?assigned_to=${item.id}`
                    : "/activities";
                  return (
                    <Link key={item.name} to={href} className="flex items-center gap-3 rounded-lg p-1 -mx-1 transition hover:bg-gray-50 dark:hover:bg-dark-600 cursor-pointer">
                      <span className="w-5 text-center text-xs font-medium text-gray-400 dark:text-dark-400">{i + 1}</span>
                      <Avatar size={7} name={item.name} initialColor="auto" classNames={{ display: "text-xs shrink-0" }} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="truncate text-sm font-medium text-gray-700 dark:text-dark-200">{item.name}</span>
                          <span className="ml-2 shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400">{item.count}</span>
                        </div>
                        <HBar value={item.count} max={stats?.top_pending_by_user[0]?.count ?? 1} color="bg-amber-500" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ── Row 3: Activities by resource (stacked bar chart) ───────────── */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-dark-100">Activities by Resource</h2>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-dark-400">Open, In Progress, Completed, Closed per person</p>
            </div>
            <Badge color="success" variant="soft">{(stats?.closed ?? 0) + (stats?.completed ?? 0)} done</Badge>
          </div>
          {loading ? (
            <div className="flex items-end gap-3 h-48 px-2">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${40 + Math.random() * 60}%` }} />
              ))}
            </div>
          ) : (stats?.resource_completion ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400 dark:text-dark-400">No data available</p>
          ) : (
            <ResourceStackedBarChart data={stats!.resource_completion} />
          )}
        </Card>

        {/* ── Row 5: Most overdue activities ─────────────────────────────── */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-dark-600">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-dark-100">Most Overdue Activities</h2>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-dark-400">Not closed, sorted by days past target</p>
            </div>
            <Link to="/activities" className="text-sm text-primary-600 hover:underline dark:text-primary-400">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-dark-600 dark:bg-dark-800">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Action Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Target Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={`sk-${i}`}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                ) : (stats?.overdue_list ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">No overdue activities 🎉</td>
                  </tr>
                ) : (
                  (stats?.overdue_list ?? []).map((a) => {
                    const dest = a.assigned_to_id
                      ? `/activities?filter=overdue&assigned_to=${a.assigned_to_id}`
                      : "/activities?filter=overdue";
                    return (
                      <tr
                        key={a.id}
                        className="cursor-pointer border-b border-gray-50 hover:bg-gray-50 dark:border-dark-700 dark:hover:bg-dark-700/50"
                        onClick={() => navigate(dest)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-dark-100">{a.client_name}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-gray-600 dark:text-dark-300">{a.action_item}</td>
                        <td className="px-4 py-3">
                          {a.assigned_to_name ? (
                            <div className="flex items-center gap-2">
                              <Avatar size={6} name={a.assigned_to_name} initialColor="auto" classNames={{ display: "text-xs" }} />
                              <span className="text-gray-600 dark:text-dark-300">{a.assigned_to_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_BADGE[a.status as ActivityStatus]?.color ?? STATUS_BADGE["Open"].color)}>
                            {a.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-dark-400">
                          {dayjs(a.target_closure_date).format("DD MMM YYYY")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx(
                            "rounded-full px-2.5 py-0.5 text-xs font-bold",
                            a.days_overdue > 30 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : a.days_overdue > 14 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          )}>
                            {a.days_overdue}d
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

        {/* ── Row 6: Recent activities ─────────────────────────────────────── */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-dark-600">
            <h2 className="font-semibold text-gray-800 dark:text-dark-100">Recently Added</h2>
            <Link to="/activities" className="text-sm text-primary-600 hover:underline dark:text-primary-400">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-dark-600 dark:bg-dark-800">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Action Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-dark-400">Target Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={`sk-${i}`}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                ) : (
                  (stats?.recent ?? []).map((a) => (
                    <tr
                      key={a.id}
                      className="cursor-pointer border-b border-gray-50 hover:bg-gray-50 dark:border-dark-700 dark:hover:bg-dark-700/50"
                      onClick={() => navigate(`/history/${a.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-dark-100">{a.client_name}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-gray-600 dark:text-dark-300">{a.action_item}</td>
                      <td className="px-4 py-3">
                        {a.assigned_to_name ? (
                          <div className="flex items-center gap-2">
                            <Avatar size={6} name={a.assigned_to_name} initialColor="auto" classNames={{ display: "text-xs" }} />
                            <span className="text-gray-600 dark:text-dark-300">{a.assigned_to_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_BADGE[a.status as ActivityStatus]?.color ?? STATUS_BADGE["Open"].color)}>
                          {a.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-dark-400">
                        {a.target_closure_date ? dayjs(a.target_closure_date).format("DD MMM YYYY") : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Last Row: Activity type + Domain breakdown ───────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* By activity type */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-dark-100">Activity by Type</h2>
              <span className="text-xs text-gray-400 dark:text-dark-400">{stats?.type_breakdown.length ?? 0} types</span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-7 rounded" />
                ))}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto pr-1 space-y-2.5">
                {(stats?.type_breakdown ?? []).map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs text-gray-500 dark:text-dark-400" title={item.label}>{item.label}</span>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="relative h-5 flex-1 overflow-hidden rounded bg-gray-100 dark:bg-dark-600">
                        <div
                          className={clsx("h-full rounded transition-all duration-500", TYPE_COLORS[item.label] ?? "bg-primary-500")}
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

          {/* By domain */}
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-gray-800 dark:text-dark-100">Activity by Domain</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-7 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {(stats?.domain_breakdown ?? []).map((item, i) => {
                  const DOMAIN_COLORS = [
                    "bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-orange-500",
                    "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-rose-500",
                  ];
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-xs text-gray-500 dark:text-dark-400">{item.label}</span>
                      <div className="flex flex-1 items-center gap-2">
                        <div className="relative h-5 flex-1 overflow-hidden rounded bg-gray-100 dark:bg-dark-600">
                          <div
                            className={clsx("h-full rounded transition-all duration-500", DOMAIN_COLORS[i % DOMAIN_COLORS.length])}
                            style={{ width: `${Math.round((item.count / (stats?.domain_breakdown[0]?.count ?? 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="w-7 text-right text-xs font-semibold text-gray-600 dark:text-dark-300">{item.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

      </div>
    </Page>
  );
}
