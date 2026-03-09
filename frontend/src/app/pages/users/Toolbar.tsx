import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { CSSProperties } from "react";
import { Table } from "@tanstack/react-table";
import { Badge, Button, Input } from "@/components/ui";
import { TableConfig } from "./TableConfig";
import { useBreakpointsContext } from "@/app/contexts/breakpoint/context";
import { User } from "@/@types/user";
import { createScopedKeydownHandler } from "@/utils/dom/createScopedKeydownHandler";

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: true },
  { label: "Inactive", value: false },
];

export function Toolbar({ table, onAddClick }: { table: Table<User>; onAddClick: () => void }) {
  const { isXs } = useBreakpointsContext();
  const isFullScreen = table.getState().tableSettings?.enableFullScreen;

  return (
    <div className="table-toolbar">
      <div className={clsx("transition-content flex items-center justify-between gap-4", isFullScreen ? "px-4 sm:px-5" : "px-(--margin-x) pt-4")}>
        <h2 className="dark:text-dark-50 truncate text-xl font-medium tracking-wide text-gray-800">Users</h2>
        <Button color="primary" className="h-8 gap-1.5 rounded-md px-3 text-xs" onClick={onAddClick}>
          <PlusIcon className="size-4" />
          <span>Add User</span>
        </Button>
      </div>

      {/* Status tabs */}
      <StatusTabs table={table} />

      {isXs ? (
        <div className={clsx("flex space-x-2 pt-4 [&_.input-root]:flex-1", isFullScreen ? "px-4 sm:px-5" : "px-(--margin-x)")}>
          <SearchInput table={table} />
          <TableConfig table={table} />
        </div>
      ) : (
        <div
          className={clsx("custom-scrollbar transition-content flex justify-between space-x-4 overflow-x-auto pt-4 pb-1", isFullScreen ? "px-4 sm:px-5" : "px-(--margin-x)")}
          style={{ "--margin-scroll": isFullScreen ? "1.25rem" : "var(--margin-x)" } as CSSProperties}
        >
          <SearchInput table={table} />
          <TableConfig table={table} />
        </div>
      )}
    </div>
  );
}

function SearchInput({ table }: { table: Table<User> }) {
  return (
    <Input
      value={table.getState().globalFilter ?? ""}
      onChange={(e) => table.setGlobalFilter(e.target.value)}
      prefix={<MagnifyingGlassIcon className="size-4" />}
      classNames={{ input: "ring-primary-500/50 h-8 text-xs focus:ring-3", root: "shrink-0" }}
      placeholder="Search name, email..."
    />
  );
}

function StatusTabs({ table }: { table: Table<User> }) {
  const col = table.getColumn("is_active");
  const val = col?.getFilterValue();
  const isFullScreen = table.getState().tableSettings?.enableFullScreen;
  const facets = col?.getFacetedUniqueValues();
  const totalCount = table.getCoreRowModel().rows.length;

  return (
    <div className={clsx("transition-content hide-scrollbar mt-4 mb-1 overflow-x-auto", isFullScreen ? "px-4 sm:px-5" : "px-(--margin-x)")}>
      <div className="border-gray-150 dark:border-dark-500 w-max min-w-full border-b-2">
        <div className="-mb-0.5 flex gap-2" data-tab>
          {STATUS_TABS.map((tab) => {
            const isActive = tab.value === "all" ? val === undefined : val === tab.value;
            const count = tab.value === "all" ? totalCount : (facets?.get(tab.value) ?? 0);
            return (
              <Button
                key={String(tab.value)}
                onClick={() => col?.setFilterValue(tab.value === "all" ? undefined : tab.value)}
                className={clsx("relative flex gap-2 border-b-2 px-3 pb-3 font-medium", isActive ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400" : "border-transparent")}
                unstyled data-tab-item
                onKeyDown={createScopedKeydownHandler({ siblingSelector: "[data-tab-item]", parentSelector: "[data-tab]", activateOnFocus: true, loop: false, orientation: "horizontal" })}
              >
                <span>{tab.label}</span>
                <Badge color={isActive ? "primary" : "neutral"} className="h-4.5 px-1.5">{count}</Badge>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
