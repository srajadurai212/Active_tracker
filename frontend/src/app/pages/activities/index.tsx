import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Table, Card, THead, TBody, Th, Tr, Td, Skeleton } from "@/components/ui";
import { TableSortIcon } from "@/components/shared/table/TableSortIcon";
import { Page } from "@/components/shared/Page";
import { PaginationSection } from "@/components/shared/table/PaginationSection";
import { useLockScrollbar, useLocalStorage } from "@/hooks";
import { useThemeContext } from "@/app/contexts/theme/context";
import { getUserAgentBrowser } from "@/utils/dom/getUserAgentBrowser";
import { TableSettings } from "@/components/shared/table/TableSettings";
import { useAuthContext } from "@/app/contexts/auth/context";

import { Activity } from "@/@types/activity";
import { activityService } from "@/services/activityService";
import { Toolbar } from "./Toolbar";
import { columns } from "./columns";
import { SelectedRowsActions } from "./SelectedRowsActions";
import ActivityForm from "./ActivityForm";

const isSafari = getUserAgentBrowser() === "Safari";

export default function ActivitiesPage() {
  const { cardSkin } = useThemeContext();
  const { user } = useAuthContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Server-side state ────────────────────────────────────────────────────
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters — initialized from URL params set by dashboard links
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    return s ? [s] : [];
  });
  const [assignedToFilter, setAssignedToFilter] = useState<string[]>(() => {
    const id = new URLSearchParams(window.location.search).get("assigned_to");
    return id ? [id] : [];
  });
  const [overdueOnly] = useState<boolean>(() => {
    return new URLSearchParams(window.location.search).get("filter") === "overdue";
  });
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [reloadKey, setReloadKey] = useState(0);

  // Form state
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);

  // Table settings
  const [tableSettings, setTableSettings] = useState<TableSettings>({
    enableFullScreen: false,
    enableRowDense: false,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useLocalStorage(
    "column-visibility-activities-1",
    {},
  );
  const [columnPinning, setColumnPinning] = useLocalStorage(
    "column-pinning-activities-1",
    {},
  );

  const isDashboardFilter = searchParams.toString().length > 0;

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch activities ─────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    activityService
      .getAll({
        page,
        page_size: pageSize,
        status: statusFilter.length > 0 ? statusFilter : undefined,
        assigned_to_id: assignedToFilter.length > 0 ? assignedToFilter : undefined,
        search: debouncedSearch || undefined,
        overdue_only: overdueOnly || undefined,
      })
      .then((res) => {
        setActivities(res.items);
        setTotal(res.total);
      })
      .catch(() => toast.error("Failed to load activities"))
      .finally(() => setLoading(false));
  }, [page, pageSize, statusFilter, assignedToFilter, debouncedSearch, overdueOnly, reloadKey]);

  // ── Fetch status counts ──────────────────────────────────────────────────
  useEffect(() => {
    activityService
      .getStatusCounts(assignedToFilter.length > 0 ? assignedToFilter : undefined, overdueOnly || undefined)
      .then(setStatusCounts)
      .catch(() => {});
  }, [assignedToFilter, overdueOnly, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  // Filter change handlers (also reset page)
  const handleStatusChange = (v: string) => {
    setStatusFilter((prev) =>
      v === "" ? [] : prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]
    );
    setPage(1);
  };
  const handleAssignedToChange = (ids: string[]) => { setAssignedToFilter(ids); setPage(1); };

  // ── TanStack Table (manual server-side pagination) ───────────────────────
  const table = useReactTable({
    data: activities,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnPinning,
      tableSettings,
      pagination: { pageIndex: page - 1, pageSize },
    },
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize })
          : updater;
      if (next.pageSize !== pageSize) {
        setPageSize(next.pageSize);
        setPage(1);
      } else {
        setPage(next.pageIndex + 1);
      }
    },
    meta: {
      editRow: (row) => { setEditingActivity(row.original); setViewOnly(false); setShowForm(true); },
      deleteRow: (row) => {
        activityService
          .delete(row.original.id)
          .then(() => { toast.success("Activity deleted"); reload(); })
          .catch(() => toast.error("Failed to delete activity"));
      },
      deleteRows: (rows) => {
        const ids = rows.map((r) => r.original.id);
        Promise.all(ids.map((id) => activityService.delete(id)))
          .then(() => { toast.success(`${ids.length} activities deleted`); reload(); })
          .catch(() => toast.error("Failed to delete some activities"));
      },
      setTableSettings,
    },
    enableSorting: tableSettings.enableSorting,
    enableColumnFilters: tableSettings.enableColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
  });

  useLockScrollbar(tableSettings.enableFullScreen);

  // Visible headers for skeleton rows
  const visibleHeaders =
    table.getHeaderGroups()[0]?.headers.filter((h) => !h.column.columnDef.isHiddenColumn) ?? [];

  return (
    <Page title="Activities">
      <div className="transition-content w-full pb-5">
        <div className={clsx("flex h-full w-full flex-col", tableSettings.enableFullScreen && "dark:bg-dark-900 fixed inset-0 z-61 bg-white pt-3")}>

          {/* Dashboard filter banner */}
          {isDashboardFilter && (() => {
            const parts: string[] = [];
            if (overdueOnly) parts.push("Overdue activities");
            if (statusFilter.length > 0) parts.push(`Status: ${statusFilter.join(", ")}`);
            if (assignedToFilter.length > 0) parts.push(`Assigned to filter active`);
            const label = parts.join(" · ");
            return label ? (
              <div className="transition-content px-(--margin-x) pt-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5 dark:border-primary-800 dark:bg-primary-900/20">
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    <span className="font-medium">Filtered:</span> {label}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter([]);
                      setAssignedToFilter([]);
                      setSearch("");
                      setPage(1);
                      navigate("/activities", { replace: true });
                    }}
                    className="flex shrink-0 items-center gap-1 text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                  >
                    <XMarkIcon className="size-3.5" />
                    Clear filter
                  </button>
                </div>
              </div>
            ) : null;
          })()}

          <Toolbar
            table={table}
            onAddClick={() => { setEditingActivity(null); setShowForm(true); }}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusChange={handleStatusChange}
            statusCounts={statusCounts}
            totalCount={total}
            assignedToFilter={assignedToFilter}
            onAssignedToChange={handleAssignedToChange}
          />

          <div className={clsx("transition-content flex grow flex-col pt-3", tableSettings.enableFullScreen ? "overflow-hidden" : "px-(--margin-x)")}>
            <Card className={clsx("relative flex grow flex-col", tableSettings.enableFullScreen && "overflow-hidden")}>
              <div className="table-wrapper min-w-full grow overflow-x-auto">
                <Table hoverable dense={tableSettings.enableRowDense} sticky={tableSettings.enableFullScreen} className="w-full text-left rtl:text-right">
                  <THead>
                    {table.getHeaderGroups().map((hg) => (
                      <Tr key={hg.id}>
                        {hg.headers.filter((h) => !h.column.columnDef.isHiddenColumn).map((header) => (
                          <Th key={header.id} className="dark:bg-dark-800 dark:text-dark-100 bg-gray-200 font-semibold text-gray-800 uppercase first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg">
                            {header.column.getCanSort() ? (
                              <div className="flex cursor-pointer items-center space-x-3 select-none" onClick={header.column.getToggleSortingHandler()}>
                                <span className="flex-1">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</span>
                                <TableSortIcon sorted={header.column.getIsSorted()} />
                              </div>
                            ) : header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </Th>
                        ))}
                      </Tr>
                    ))}
                  </THead>
                  <TBody>
                    {loading ? (
                      [...Array(8)].map((_, i) => (
                        <Tr key={`sk-${i}`}>
                          {visibleHeaders.map((h) => (
                            <Td key={h.id} className={clsx("bg-white", cardSkin === "shadow" ? "dark:bg-dark-700" : "dark:bg-dark-900")}>
                              <Skeleton className="h-4 rounded w-3/4" />
                            </Td>
                          ))}
                        </Tr>
                      ))
                    ) : table.getRowModel().rows.length === 0 ? (
                      <Tr><Td colSpan={99} className="py-10 text-center text-gray-400">No activities found.</Td></Tr>
                    ) : (
                      table.getRowModel().rows.map((row) => {
                        const canEdit =
                          user?.role === "admin" ||
                          row.original.assigned_to_id === user?.id;
                        return (
                          <Tr
                            key={row.id}
                            className={clsx(
                              "dark:border-b-dark-500 relative border-y border-transparent border-b-gray-200 cursor-pointer",
                              row.getIsSelected() && !isSafari && "row-selected after:bg-primary-500/10 ltr:after:border-l-primary-500 after:pointer-events-none after:absolute after:inset-0 after:z-2 after:h-full after:w-full after:border-3 after:border-transparent",
                            )}
                            onClick={() => {
                              setEditingActivity(row.original);
                              setViewOnly(!canEdit);
                              setShowForm(true);
                            }}
                          >
                            {row.getVisibleCells().filter((cell) => !cell.column.columnDef.isHiddenColumn).map((cell) => (
                              <Td
                                key={cell.id}
                                className={clsx("relative bg-white", cardSkin === "shadow" ? "dark:bg-dark-700" : "dark:bg-dark-900")}
                                onClick={
                                  cell.column.id === "select" || cell.column.id === "actions"
                                    ? (e: React.MouseEvent) => e.stopPropagation()
                                    : undefined
                                }
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </Td>
                            ))}
                          </Tr>
                        );
                      })
                    )}
                  </TBody>
                </Table>
              </div>
              <SelectedRowsActions table={table} />
              {total > 0 && (
                <div className={clsx("px-4 pb-4 sm:px-5 sm:pt-4", tableSettings.enableFullScreen && "dark:bg-dark-800 bg-gray-50", !(table.getIsSomeRowsSelected() || table.getIsAllRowsSelected()) && "pt-4")}>
                  <PaginationSection table={table} />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => { setShowForm(false); setEditingActivity(null); setViewOnly(false); }}
          />
          <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-xl dark:bg-dark-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-dark-600">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-100">
                  {viewOnly ? "View Activity" : editingActivity ? "Edit Activity" : "New Activity"}
                </h2>
                {viewOnly && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-dark-600 dark:text-dark-300">
                    View only
                  </span>
                )}
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingActivity(null); setViewOnly(false); }}
                className="text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <ActivityForm
                activity={editingActivity}
                viewOnly={viewOnly}
                onSuccess={() => { setShowForm(false); setEditingActivity(null); setViewOnly(false); reload(); }}
                onCancel={() => { setShowForm(false); setEditingActivity(null); setViewOnly(false); }}
              />
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
