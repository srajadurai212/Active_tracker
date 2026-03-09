import { CellContext } from "@tanstack/react-table";
import dayjs from "dayjs";
import { User } from "@/@types/user";
import { Avatar, Badge } from "@/components/ui";

export function NameCell({ row }: CellContext<User, unknown>) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar size={8} name={row.original.full_name} initialColor="auto" classNames={{ display: "text-xs" }} />
      <span className="font-medium text-gray-800 dark:text-dark-100">{row.original.full_name}</span>
    </div>
  );
}

export function EmailCell({ getValue }: CellContext<User, unknown>) {
  return <span className="text-sm text-gray-600 dark:text-dark-300">{getValue() as string}</span>;
}

export function RoleBadgeCell({ getValue }: CellContext<User, unknown>) {
  const role = getValue() as string;
  return (
    <Badge color={role === "admin" ? "secondary" : "info"} className="capitalize">
      {role}
    </Badge>
  );
}

export function StatusBadgeCell({ getValue }: CellContext<User, unknown>) {
  const active = getValue() as boolean;
  return (
    <Badge color={active ? "success" : "neutral"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

export function DateCell({ getValue }: CellContext<User, unknown>) {
  const val = getValue() as string;
  return <span className="text-sm text-gray-500 dark:text-dark-400">{dayjs(val).format("DD MMM YYYY")}</span>;
}
