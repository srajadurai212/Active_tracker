import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Activity } from "@/@types/activity";
import { SelectCell, SelectHeader } from "@/components/shared/table/SelectCheckbox";
import { RowActions } from "./RowActions";
import {
  ClientCell,
  ActionItemCell,
  AssignedToCell,
  DomainCell,
  TypeCell,
  StatusBadgeCell,
  TargetDateCell,
  ActualDateCell,
} from "./rows";

export const columns: ColumnDef<Activity>[] = [
  {
    id: "select",
    header: SelectHeader,
    label: "Row Select",
    cell: SelectCell,
  },
  {
    id: "client_name",
    accessorKey: "client_name",
    header: "Client",
    label: "Client",
    cell: ClientCell,
  },
  {
    id: "action_item",
    accessorKey: "action_item",
    header: "Action Item",
    label: "Action Item",
    cell: ActionItemCell,
  },
  {
    id: "assigned_to",
    accessorFn: (row) => row.assigned_to?.full_name ?? "",
    header: "Assigned To",
    label: "Assigned To",
    cell: AssignedToCell,
  },
  {
    id: "product_domain",
    accessorKey: "product_domain",
    header: "Domain",
    label: "Domain",
    cell: DomainCell,
  },
  {
    id: "activity_type",
    accessorKey: "activity_type",
    header: "Type",
    label: "Type",
    cell: TypeCell,
  },
  {
    id: "target_closure_date",
    accessorKey: "target_closure_date",
    header: "Target Date",
    label: "Target Date",
    cell: TargetDateCell,
  },
  {
    id: "actual_closure_date",
    accessorKey: "actual_closure_date",
    header: "Actual Date",
    label: "Actual Date",
    cell: ActualDateCell,
  },
  // "status" is both visible (shows badge) and used by tab filter via setFilterValue
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    label: "Status",
    cell: StatusBadgeCell,
    filterFn: "statusFilter" as never,
  },
  {
    id: "actions",
    header: "",
    label: "Actions",
    cell: RowActions,
  },
  // ── Hidden filter-only columns (not rendered) ────────────────────────────
  {
    id: "_overdue",
    accessorFn: (row) =>
      row.target_closure_date !== null &&
      row.status !== "Closed" &&
      dayjs(row.target_closure_date).isBefore(dayjs().startOf("day")),
    isHiddenColumn: true,
    filterFn: (row, columnId, value: boolean) =>
      !value || (row.getValue(columnId) as boolean) === true,
  },
];
