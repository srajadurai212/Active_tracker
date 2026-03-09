import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { PlusIcon, XMarkIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Table } from "@tanstack/react-table";

import { Badge, Button, Input } from "@/components/ui";
import { TableConfig } from "./TableConfig";
import { Activity, ActivityStatus, ACTIVITY_STATUSES } from "@/@types/activity";
import { createScopedKeydownHandler } from "@/utils/dom/createScopedKeydownHandler";
import { useBreakpointsContext } from "@/app/contexts/breakpoint/context";
import { useAllUserNames } from "@/hooks/useUsers";

// ─── Status tab config ────────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: ActivityStatus | "all" }[] = [
  { label: "All", value: "all" },
  ...ACTIVITY_STATUSES.map((s) => ({ label: s, value: s as ActivityStatus })),
];

// ─── Multi-select dropdown ────────────────────────────────────────────────────

interface MSOption { id: string; label: string }

function MultiSelectDropdown({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string;
  options: MSOption[];
  value: string[];
  onChange: (val: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownStyle({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((o) => !o);
  };

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  const displayLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
      ? (options.find((o) => o.id === value[0])?.label ?? placeholder)
      : `${value.length} selected`;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={clsx(
          "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition cursor-pointer select-none",
          "focus:outline-none focus:ring-1 focus:ring-primary-500/50",
          value.length > 0
            ? "border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/20 dark:text-primary-300"
            : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-300 dark:hover:border-dark-400",
        )}
      >
        <span className="whitespace-nowrap">{displayLabel}</span>
        {value.length > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
            {value.length}
          </span>
        )}
        <svg
          className={clsx("size-3 shrink-0 text-gray-400 transition-transform duration-150", open && "rotate-180")}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{ position: "fixed", top: dropdownStyle.top, left: dropdownStyle.left, zIndex: 9999 }}
          className="min-w-[170px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-dark-600 dark:bg-dark-800"
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {options.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400">No options</p>
            ) : (
              options.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-700"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(opt.id)}
                    onChange={() => toggle(opt.id)}
                    className="size-3.5 rounded accent-primary-600"
                  />
                  <span className="text-xs text-gray-700 dark:text-dark-200">{opt.label}</span>
                </label>
              ))
            )}
          </div>
          {value.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-1.5 dark:border-dark-600">
              <button
                onClick={() => { onChange([]); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-dark-200"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

export function Toolbar({
  table,
  onAddClick,
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  statusCounts,
  totalCount,
  assignedToFilter,
  onAssignedToChange,
}: {
  table: Table<Activity>;
  onAddClick: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string[];
  onStatusChange: (v: string) => void;
  statusCounts: Record<string, number>;
  totalCount: number;
  assignedToFilter: string[];
  onAssignedToChange: (ids: string[]) => void;
}) {
  const { isXs } = useBreakpointsContext();
  const isFullScreen = table.getState().tableSettings?.enableFullScreen;

  return (
    <div className="table-toolbar">
      {/* Top row: title + add button */}
      <div
        className={clsx(
          "transition-content flex items-center justify-between gap-4",
          isFullScreen ? "px-4 sm:px-5" : "px-(--margin-x) pt-4",
        )}
      >
        <div className="min-w-0">
          <h2 className="dark:text-dark-50 truncate text-xl font-medium tracking-wide text-gray-800">
            Activities
          </h2>
        </div>
        <Button
          color="primary"
          className="h-8 gap-1.5 rounded-md px-3 text-xs"
          onClick={onAddClick}
        >
          <PlusIcon className="size-4" />
          <span>Add Activity</span>
        </Button>
      </div>

      {/* Status tabs */}
      <StatusTabs
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        statusCounts={statusCounts}
        totalCount={totalCount}
        isFullScreen={!!isFullScreen}
      />

      {/* Search + filters + config row */}
      {isXs ? (
        <div
          className={clsx(
            "flex items-center gap-2 pt-4 pb-1",
            isFullScreen ? "px-4 sm:px-5" : "px-(--margin-x)",
          )}
        >
          <SearchInput value={search} onChange={onSearchChange} className="flex-1" />
          <FilterBar assignedToFilter={assignedToFilter} onAssignedToChange={onAssignedToChange} />
          <TableConfig table={table} />
        </div>
      ) : (
        <div
          className={clsx(
            "custom-scrollbar transition-content flex items-center justify-between gap-2 overflow-x-auto pt-4 pb-1",
            isFullScreen ? "px-4 sm:px-5" : "px-(--margin-x)",
          )}
          style={{ "--margin-scroll": isFullScreen ? "1.25rem" : "var(--margin-x)" } as CSSProperties}
        >
          <div className="flex shrink-0 items-center gap-2">
            <SearchInput value={search} onChange={onSearchChange} />
            <FilterBar assignedToFilter={assignedToFilter} onAssignedToChange={onAssignedToChange} />
          </div>
          <TableConfig table={table} />
        </div>
      )}
    </div>
  );
}

// ─── Search input ─────────────────────────────────────────────────────────────

function SearchInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      prefix={<MagnifyingGlassIcon className="size-4" />}
      classNames={{
        input: "ring-primary-500/50 h-8 text-xs focus:ring-3",
        root: clsx("shrink-0", className),
      }}
      placeholder="Search client, action item..."
    />
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({
  assignedToFilter,
  onAssignedToChange,
}: {
  assignedToFilter: string[];
  onAssignedToChange: (ids: string[]) => void;
}) {
  const { users } = useAllUserNames();
  const assigneeOptions = useMemo<MSOption[]>(
    () => users
      .filter((u) => u.is_active)
      .map((u) => ({ id: u.id, label: u.full_name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [users],
  );

  return (
    <div className="flex items-center gap-2">
      <FunnelIcon className="size-3.5 shrink-0 text-gray-400 dark:text-dark-400" />

      <MultiSelectDropdown
        placeholder="Assigned To"
        options={assigneeOptions}
        value={assignedToFilter}
        onChange={onAssignedToChange}
      />

      {assignedToFilter.length > 0 && (
        <button
          type="button"
          onClick={() => onAssignedToChange([])}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-600 dark:hover:text-dark-200"
        >
          <XMarkIcon className="size-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}

// ─── Status tabs ──────────────────────────────────────────────────────────────

function StatusTabs({
  statusFilter,
  onStatusChange,
  statusCounts,
  totalCount,
  isFullScreen,
}: {
  statusFilter: string[];
  onStatusChange: (v: string) => void;
  statusCounts: Record<string, number>;
  totalCount: number;
  isFullScreen: boolean;
}) {
  return (
    <div
      className={clsx(
        "transition-content hide-scrollbar mt-4 mb-1 overflow-x-auto",
        isFullScreen ? "px-4 sm:px-5" : "px-(--margin-x)",
      )}
    >
      <div className="border-gray-150 dark:border-dark-500 w-max min-w-full border-b-2">
        <div className="-mb-0.5 flex gap-2" data-tab>
          {STATUS_TABS.map((tab) => {
            const isActive =
              tab.value === "all" ? statusFilter.length === 0 : statusFilter.includes(tab.value);
            const count =
              tab.value === "all"
                ? (statusCounts["All"] ?? totalCount)
                : (statusCounts[tab.value] ?? 0);

            return (
              <Button
                key={tab.value}
                onClick={() => onStatusChange(tab.value === "all" ? "" : tab.value)}
                className={clsx(
                  "relative flex gap-2 border-b-2 px-3 pb-3 font-medium",
                  isActive
                    ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                    : "border-transparent",
                )}
                unstyled
                data-tab-item
                onKeyDown={createScopedKeydownHandler({
                  siblingSelector: "[data-tab-item]",
                  parentSelector: "[data-tab]",
                  activateOnFocus: true,
                  loop: false,
                  orientation: "horizontal",
                })}
              >
                <span>{tab.label}</span>
                <Badge
                  color={isActive ? "primary" : "neutral"}
                  className="h-4.5 px-1.5"
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
