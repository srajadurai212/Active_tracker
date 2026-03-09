import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/@types/user";
import { SelectCell, SelectHeader } from "@/components/shared/table/SelectCheckbox";
import { RowActions } from "./RowActions";
import { NameCell, EmailCell, RoleBadgeCell, StatusBadgeCell, DateCell } from "./rows";

export const columns: ColumnDef<User>[] = [
  { id: "select", header: SelectHeader, label: "Row Select", cell: SelectCell },
  { id: "full_name", accessorKey: "full_name", header: "Name", label: "Name", cell: NameCell },
  { id: "email", accessorKey: "email", header: "Email", label: "Email", cell: EmailCell },
  { id: "role", accessorKey: "role", header: "Role", label: "Role", cell: RoleBadgeCell },
  // "is_active" is both visible (shows badge) and used by tab filter
  { id: "is_active", accessorKey: "is_active", header: "Status", label: "Status", cell: StatusBadgeCell, filterFn: "boolFilter" as never },
  { id: "created_at", accessorKey: "created_at", header: "Created", label: "Created", cell: DateCell },
  { id: "actions", header: "", label: "Actions", cell: RowActions },
];
