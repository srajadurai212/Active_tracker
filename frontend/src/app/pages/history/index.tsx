import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router";
import dayjs from "dayjs";
import {
  ChatBubbleLeftEllipsisIcon,
  CalendarDaysIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  InformationCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

import { Page } from "@/components/shared/Page";
import { Timeline, TimelineItem, Skeleton } from "@/components/ui";
import { activityService } from "@/services/activityService";
import { Activity, TargetDateHistory } from "@/@types/activity";
import { AuditLog, AuditAction } from "@/@types/audit";

// ── Remarks parser ────────────────────────────────────────────────────────────
//
// Excel remarks are multi-line strings, newest entry first, in formats like:
//   "13-Feb-26:- Some text"
//   "10-Sep-25 to 08-Sep-25 - Some text"
//   "24,25,26-Feb-26 - Some text"
//   "27-Jan- 26  - Some text"
//   " 02-Jun-25 - Some text"

interface RemarkEntry {
  dateLabel: string | null;
  text: string;
}

// Detects lines that begin with a date prefix (loose match).
const DATE_START_RE =
  /^\s*\d[\d,\s]*[-\/]\s*[A-Za-z]{2,}\.?[-\/\s]+\s*\d{2,4}/i;

// Captures the date label and the remainder text.
const DATE_CAPTURE_RE =
  /^\s*(\d[\d,\s]*[-\/]\s*[A-Za-z]{2,}\.?[-\/\s]+\s*\d{2,4}(?:\s+to\s+\d+[-\/][A-Za-z]{2,}\.?[-\/]\d{2,4})?)\s*[:*\-]+\s*([\s\S]*)/i;

function parseRemarks(remarks: string | null | undefined): RemarkEntry[] {
  if (!remarks?.trim()) return [];

  const lines = remarks.split("\n");
  const entries: RemarkEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (DATE_START_RE.test(line)) {
      const m = line.match(DATE_CAPTURE_RE);
      if (m) {
        entries.push({ dateLabel: m[1].replace(/\s+/g, " ").trim(), text: m[2].trim() });
      } else {
        entries.push({ dateLabel: null, text: line });
      }
    } else if (entries.length > 0) {
      // Continuation line — append to previous entry
      entries[entries.length - 1].text += " " + line;
    } else {
      entries.push({ dateLabel: null, text: line });
    }
  }

  // Excel stores newest first → reverse to chronological order
  return entries.reverse();
}

// ── Audit diff view ───────────────────────────────────────────────────────────

function DiffView({
  oldVals,
  newVals,
}: {
  oldVals: Record<string, unknown> | null;
  newVals: Record<string, unknown> | null;
}) {
  const keys = new Set([
    ...Object.keys(oldVals ?? {}),
    ...Object.keys(newVals ?? {}),
  ]);
  if (keys.size === 0) return null;

  return (
    <div className="mt-3 space-y-1 text-xs">
      {[...keys].map((key) => {
        const oldVal = oldVals?.[key];
        const newVal = newVals?.[key];
        const changed = oldVal !== newVal;
        return (
          <div
            key={key}
            className={`flex items-start gap-2 rounded px-2 py-1 ${changed ? "bg-white/60 dark:bg-dark-700/60" : ""}`}
          >
            <span className="w-32 shrink-0 font-medium text-gray-500 dark:text-dark-300">
              {key}:
            </span>
            {oldVal !== undefined && (
              <span className="text-red-500 line-through dark:text-red-400">
                {String(oldVal ?? "—")}
              </span>
            )}
            {oldVal !== undefined && newVal !== undefined && (
              <span className="text-gray-400">→</span>
            )}
            {newVal !== undefined && (
              <span className="text-green-600 dark:text-green-400">
                {String(newVal ?? "—")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Accordion section ────────────────────────────────────────────────────────

function AccordionSection({
  icon: Icon,
  title,
  count,
  iconClass,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  iconClass: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-dark-700"
      >
        <Icon className={`size-5 shrink-0 ${iconClass}`} />
        <h2 className="flex-1 text-base font-semibold text-gray-700 dark:text-dark-200">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-dark-600 dark:text-dark-300">
            {count}
          </span>
        )}
        <ChevronDownIcon
          className={`size-4 shrink-0 text-gray-400 transition-transform duration-200 dark:text-dark-400 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 dark:border-dark-600">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Audit icon map ────────────────────────────────────────────────────────────

const AUDIT_ICON: Record<AuditAction, React.ElementType> = {
  CREATE: PlusCircleIcon,
  UPDATE: PencilSquareIcon,
  DELETE: TrashIcon,
};

const AUDIT_POINT_COLOR: Record<AuditAction, string> = {
  CREATE: "this:success",
  UPDATE: "this:warning",
  DELETE: "this:error",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { activityId } = useParams<{ activityId: string }>();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [dateHistory, setDateHistory] = useState<TargetDateHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activityId) return;
    setIsLoading(true);
    Promise.all([
      activityService.getById(activityId),
      activityService.getHistory(activityId),
      activityService.getTargetDateHistory(activityId),
    ])
      .then(([act, hist, dateHist]) => {
        setActivity(act);
        setLogs(hist);
        setDateHistory(dateHist);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [activityId]);

  const remarkEntries = useMemo(
    () => parseRemarks(activity?.remarks),
    [activity?.remarks],
  );

  return (
    <Page title="Activity History">
      <div className="transition-content px-(--margin-x) pb-8 pt-5">

        {/* Header */}
        <div className="mb-8">
          <Link
            to="/activities"
            className="mb-3 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            ← Back to Activities
          </Link>
          {activity ? (
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-dark-600 dark:bg-dark-800">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                  <ClipboardDocumentListIcon className="size-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-gray-800 dark:text-dark-100">
                    {activity.client_name}
                  </h1>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-400 line-clamp-2">
                    {activity.action_item}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400 dark:text-dark-400">
                    <span>Status: <span className="font-medium text-gray-600 dark:text-dark-200">{activity.status}</span></span>
                    {activity.target_closure_date && (
                      <span>Target: <span className="font-medium text-gray-600 dark:text-dark-200">{dayjs(activity.target_closure_date).format("DD MMM YYYY")}</span></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : !isLoading ? (
            <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-100">Activity History</h1>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── Progress Updates (from remarks) ───────────────────────── */}
            <AccordionSection
              icon={ChatBubbleLeftEllipsisIcon}
              title="Progress Updates"
              count={remarkEntries.length}
              iconClass="text-sky-500"
            >
              {remarkEntries.length === 0 ? (
                <p className="text-center text-sm text-gray-400 dark:text-dark-400">
                  No progress updates recorded for this activity.
                </p>
              ) : (
                <Timeline pointSize="1.75rem" lineSpace="0.5rem">
                  {[...remarkEntries].reverse().map((entry, i) => (
                    <TimelineItem
                      key={i}
                      title={entry.dateLabel ?? "Note"}
                      point={
                        <div className="timeline-item-point this:info relative flex shrink-0 items-center justify-center rounded-full border border-current text-this dark:text-this-light">
                          <ChatBubbleLeftEllipsisIcon className="size-3" />
                        </div>
                      }
                    >
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-dark-300 whitespace-pre-line">
                        {entry.text}
                      </p>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </AccordionSection>

            {/* ── Target Date Revisions ──────────────────────────────────── */}
            <AccordionSection
              icon={CalendarDaysIcon}
              title="Target Date Revisions"
              count={dateHistory.length}
              iconClass="text-amber-500"
            >
              {dateHistory.length === 0 ? (
                <p className="text-center text-sm text-gray-400 dark:text-dark-400">
                  No target date revisions recorded.
                </p>
              ) : (
                <Timeline pointSize="1.75rem" lineSpace="0.5rem">
                  {dateHistory.map((h) => (
                    <TimelineItem
                      key={h.id}
                      title={h.old_date ? "Date Revised" : "Initial Date Set"}
                      time={dayjs(h.changed_at).valueOf()}
                      point={
                        <div className="timeline-item-point this:warning relative flex shrink-0 items-center justify-center rounded-full border border-current text-this dark:text-this-light">
                          <CalendarDaysIcon className="size-3" />
                        </div>
                      }
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        {h.old_date ? (
                          <>
                            <span className="line-through text-red-500 dark:text-red-400">
                              {dayjs(h.old_date).format("DD MMM YYYY")}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {h.new_date ? dayjs(h.new_date).format("DD MMM YYYY") : "—"}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {h.new_date ? dayjs(h.new_date).format("DD MMM YYYY") : "—"}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-dark-400">
                          by {h.changed_by?.full_name ?? "System"}
                        </span>
                      </div>
                      {h.remarks && h.remarks !== "Initial target date" && h.remarks !== "Target date revised" && (
                        <p className="mt-1.5 flex items-start gap-1 text-xs text-gray-500 dark:text-dark-400">
                          <InformationCircleIcon className="mt-px size-3.5 shrink-0" />
                          {h.remarks}
                        </p>
                      )}
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </AccordionSection>

            {/* ── Audit Log ─────────────────────────────────────────────── */}
            <AccordionSection
              icon={ClipboardDocumentListIcon}
              title="Audit Log"
              count={logs.length}
              iconClass="text-gray-500 dark:text-dark-300"
            >
              {logs.length === 0 ? (
                <p className="text-center text-sm text-gray-400 dark:text-dark-400">
                  No audit log entries found for this activity.
                </p>
              ) : (
                <Timeline pointSize="1.75rem" lineSpace="0.5rem">
                  {logs.map((log) => {
                    const Icon = AUDIT_ICON[log.action];
                    const pointColor = AUDIT_POINT_COLOR[log.action];
                    return (
                      <TimelineItem
                        key={log.id}
                        title={`${log.action} by ${log.changed_by?.full_name ?? "System"}`}
                        time={dayjs(log.changed_at).valueOf()}
                        point={
                          <div className={`timeline-item-point ${pointColor} relative flex shrink-0 items-center justify-center rounded-full border border-current text-this dark:text-this-light`}>
                            <Icon className="size-3" />
                          </div>
                        }
                      >
                        {(log.old_values || log.new_values) && (
                          <DiffView oldVals={log.old_values} newVals={log.new_values} />
                        )}
                        {log.ip_address && (
                          <p className="mt-2 text-xs text-gray-400 dark:text-dark-500">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </TimelineItem>
                    );
                  })}
                </Timeline>
              )}
            </AccordionSection>

          </div>
        )}
      </div>
    </Page>
  );
}
