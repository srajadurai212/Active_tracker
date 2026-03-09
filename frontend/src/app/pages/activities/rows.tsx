import { CellContext } from "@tanstack/react-table";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import { Activity, ActivityStatus, TargetDateHistory } from "@/@types/activity";
import { Badge, Avatar } from "@/components/ui";
import { activityService } from "@/services/activityService";

// ── status colours ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ActivityStatus, "primary" | "warning" | "success" | "neutral"> = {
  Open: "primary",
  "In Progress": "warning",
  Closed: "success",
  "On-Hold": "neutral",
  Completed: "success",
};

// ── Client ─────────────────────────────────────────────────────────────────────
export function ClientCell({ row }: CellContext<Activity, unknown>) {
  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <Avatar
        size={8}
        name={row.original.client_name}
        initialColor="auto"
        classNames={{ display: "text-xs" }}
      />
      <span className="font-medium text-gray-800 dark:text-dark-100 truncate max-w-[160px]">
        {row.original.client_name}
      </span>
    </div>
  );
}

// ── Action Item ────────────────────────────────────────────────────────────────
export function ActionItemCell({ getValue }: CellContext<Activity, unknown>) {
  const text = getValue() as string;
  return (
    <p
      title={text}
      className="max-w-[280px] truncate text-gray-600 dark:text-dark-300 text-sm"
    >
      {text}
    </p>
  );
}

// ── Assigned To ────────────────────────────────────────────────────────────────
export function AssignedToCell({ row }: CellContext<Activity, unknown>) {
  const name = row.original.assigned_to?.full_name;
  if (!name) return <span className="text-gray-400 dark:text-dark-500 text-sm">—</span>;
  return (
    <div className="flex items-center gap-2">
      <Avatar
        size={7}
        name={name}
        initialColor="auto"
        classNames={{ display: "text-tiny" }}
      />
      <span className="text-sm text-gray-700 dark:text-dark-200 whitespace-nowrap">{name}</span>
    </div>
  );
}

// ── Domain ─────────────────────────────────────────────────────────────────────
export function DomainCell({ getValue }: CellContext<Activity, unknown>) {
  const val = getValue() as string | null;
  if (!val) return <span className="text-gray-400 dark:text-dark-500 text-sm">—</span>;
  return (
    <span className="inline-block rounded bg-gray-100 dark:bg-dark-600 px-2 py-0.5 text-xs text-gray-700 dark:text-dark-200 whitespace-nowrap max-w-[130px] truncate">
      {val}
    </span>
  );
}

// ── Type ───────────────────────────────────────────────────────────────────────
export function TypeCell({ getValue }: CellContext<Activity, unknown>) {
  const val = getValue() as string | null;
  if (!val) return <span className="text-gray-400 dark:text-dark-500 text-sm">—</span>;
  return <span className="text-sm text-gray-600 dark:text-dark-300">{val}</span>;
}

// ── Status Badge ───────────────────────────────────────────────────────────────
export function StatusBadgeCell({ getValue }: CellContext<Activity, unknown>) {
  const status = getValue() as ActivityStatus;
  return (
    <Badge color={STATUS_COLOR[status] ?? "neutral"} className="whitespace-nowrap">
      {status}
    </Badge>
  );
}

// ── Target Date History Popover ─────────────────────────────────────────────────
function TargetDateHistoryPanel({
  activityId,
  anchorRect,
  onClose,
}: {
  activityId: string;
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<TargetDateHistory[] | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activityService.getTargetDateHistory(activityId).then(setHistory).catch(console.error);
  }, [activityId]);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  const top = anchorRect.bottom + window.scrollY + 6;
  const left = Math.min(anchorRect.left + window.scrollX, window.innerWidth - 320 - 8);

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: "absolute", top, left, zIndex: 9999, width: 300 }}
      className="rounded-lg border border-gray-200 bg-white shadow-lg dark:border-dark-600 dark:bg-dark-800"
    >
      <div className="border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 dark:border-dark-600 dark:text-dark-300">
        Target Date Revisions
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {history === null ? (
          <p className="p-2 text-xs text-gray-400">Loading…</p>
        ) : history.length === 0 ? (
          <p className="p-2 text-xs text-gray-400">No revisions recorded.</p>
        ) : (
          <ol className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="rounded bg-yellow-50 p-2 text-xs dark:bg-yellow-900/20">
                <div className="flex items-center gap-1 font-medium text-gray-700 dark:text-dark-200">
                  {h.old_date ? (
                    <>
                      <span className="line-through text-red-500">{dayjs(h.old_date).format("DD MMM YYYY")}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-600 dark:text-green-400">{h.new_date ? dayjs(h.new_date).format("DD MMM YYYY") : "—"}</span>
                    </>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">
                      Set: {h.new_date ? dayjs(h.new_date).format("DD MMM YYYY") : "—"}
                    </span>
                  )}
                </div>
                {h.remarks && <p className="mt-0.5 text-gray-500 dark:text-dark-400">{h.remarks}</p>}
                <p className="mt-0.5 text-gray-400 dark:text-dark-500">
                  by {h.changed_by?.full_name ?? "System"} · {dayjs(h.changed_at).format("DD MMM YYYY HH:mm")}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ── Target Date ────────────────────────────────────────────────────────────────
export function TargetDateCell({ row }: CellContext<Activity, unknown>) {
  const target = row.original.target_closure_date;
  const initial = row.original.initial_target_closure_date;
  const [panelOpen, setPanelOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleInfoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!panelOpen && btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
    setPanelOpen((v) => !v);
  }, [panelOpen]);

  if (!target)
    return <span className="text-gray-400 dark:text-dark-500 text-sm">—</span>;

  const wasRevised = initial && initial !== target;

  return (
    <div className="flex items-center gap-1 text-sm">
      <div>
        {wasRevised && (
          <span className="line-through text-red-400 dark:text-red-400 mr-1">
            {dayjs(initial).format("DD MMM YYYY")}
          </span>
        )}
        <span className="text-gray-700 dark:text-dark-200">
          {wasRevised && <span className="text-gray-400 mr-1">→</span>}
          {dayjs(target).format("DD MMM YYYY")}
        </span>
      </div>
      <button
        ref={btnRef}
        onClick={handleInfoClick}
        className="ml-0.5 rounded p-0.5 text-gray-400 hover:text-primary-500 focus:outline-none"
        title="View date revision history"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={14} height={14}>
          <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
        </svg>
      </button>
      {panelOpen && anchorRect && (
        <TargetDateHistoryPanel
          activityId={row.original.id}
          anchorRect={anchorRect}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}

// ── Actual Date ────────────────────────────────────────────────────────────────
export function ActualDateCell({ row }: CellContext<Activity, unknown>) {
  const actual = row.original.actual_closure_date;
  if (!actual)
    return <span className="text-gray-400 dark:text-dark-500 text-sm">—</span>;
  return (
    <p className="text-xs text-success-600 dark:text-success-400">
      ✓ {dayjs(actual).format("DD MMM YYYY")}
    </p>
  );
}
