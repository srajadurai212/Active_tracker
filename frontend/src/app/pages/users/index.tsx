import {
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "sonner";
import { Table, Card, THead, TBody, Th, Tr, Td, Input, Button, Skeleton } from "@/components/ui";
import { TableSortIcon } from "@/components/shared/table/TableSortIcon";
import { Page } from "@/components/shared/Page";
import { PaginationSection } from "@/components/shared/table/PaginationSection";
import { useLockScrollbar, useLocalStorage } from "@/hooks";
import { fuzzyFilter } from "@/utils/react-table/fuzzyFilter";
import { useSkipper } from "@/utils/react-table/useSkipper";
import { useThemeContext } from "@/app/contexts/theme/context";
import { getUserAgentBrowser } from "@/utils/dom/getUserAgentBrowser";
import { TableSettings } from "@/components/shared/table/TableSettings";

import { User } from "@/@types/user";
import { useUsers } from "@/hooks/useUsers";
import { userService, UserCreate, UserUpdate } from "@/services/userService";
import { Toolbar } from "./Toolbar";
import { columns } from "./columns";

const isSafari = getUserAgentBrowser() === "Safari";

const createSchema = yup.object({
  email: yup.string().email("Invalid email").required("Email required"),
  full_name: yup.string().required("Full name required"),
  password: yup.string().min(6, "Min 6 characters").required("Password required"),
  role: yup.string().oneOf(["admin", "user"]).required(),
});
type CreateForm = yup.InferType<typeof createSchema>;

const editSchema = yup.object({
  full_name: yup.string().required("Full name required"),
  role: yup.string().oneOf(["admin", "user"]).required(),
  is_active: yup.boolean().required(),
});
type EditForm = yup.InferType<typeof editSchema>;

export default function UsersPage() {
  const { cardSkin } = useThemeContext();
  const { users, isLoading, refetch } = useUsers();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [tableSettings, setTableSettings] = useState<TableSettings>({ enableFullScreen: false, enableRowDense: false });
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useLocalStorage("column-visibility-users-1", {});
  const [columnPinning, setColumnPinning] = useLocalStorage("column-pinning-users-1", {});
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

  const createForm = useForm<CreateForm>({ resolver: yupResolver(createSchema), defaultValues: { email: "", full_name: "", password: "", role: "user" } });
  const editForm = useForm<EditForm>({ resolver: yupResolver(editSchema) });

  const table = useReactTable({
    data: users,
    columns,
    state: { globalFilter, sorting, columnVisibility, columnPinning, tableSettings },
    meta: {
      editRow: (row) => {
        editForm.reset({ full_name: row.original.full_name, role: row.original.role, is_active: row.original.is_active });
        setEditingUser(row.original);
      },
      deleteRow: (row) => {
        skipAutoResetPageIndex();
        userService.deactivate(row.original.id)
          .then(() => { refetch(); toast.success("User deactivated"); })
          .catch(() => toast.error("Failed to deactivate user"));
      },
      setTableSettings,
    },
    filterFns: {
      fuzzy: fuzzyFilter,
      boolFilter: (row, columnId, value) => value === undefined ? true : row.getValue(columnId) === value,
    },
    enableSorting: tableSettings.enableSorting,
    enableColumnFilters: tableSettings.enableColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    globalFilterFn: fuzzyFilter,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    autoResetPageIndex,
  });

  const handleCreate = async (values: CreateForm) => {
    try {
      await userService.create(values as UserCreate);
      toast.success("User created");
      setShowCreate(false);
      createForm.reset();
      refetch();
    } catch { toast.error("Failed to create user"); }
  };

  const handleEdit = async (values: EditForm) => {
    if (!editingUser) return;
    try {
      await userService.update(editingUser.id, values as UserUpdate);
      toast.success("User updated");
      setEditingUser(null);
      refetch();
    } catch { toast.error("Failed to update user"); }
  };

  useLockScrollbar(tableSettings.enableFullScreen);

  return (
    <Page title="User Management">
      <div className="transition-content w-full pb-5">
        <div className={clsx("flex h-full w-full flex-col", tableSettings.enableFullScreen && "dark:bg-dark-900 fixed inset-0 z-61 bg-white pt-3")}>
          <Toolbar table={table} onAddClick={() => setShowCreate(true)} />
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
                    {isLoading ? (
                      [...Array(6)].map((_, i) => (
                        <Tr key={`sk-${i}`}>
                          {table.getHeaderGroups()[0]?.headers.filter((h) => !h.column.columnDef.isHiddenColumn).map((h) => (
                            <Td key={h.id} className={clsx("bg-white", cardSkin === "shadow" ? "dark:bg-dark-700" : "dark:bg-dark-900")}>
                              <Skeleton className="h-4 rounded w-3/4" />
                            </Td>
                          ))}
                        </Tr>
                      ))
                    ) : table.getRowModel().rows.length === 0 ? (
                      <Tr><Td colSpan={99} className="py-10 text-center text-gray-400">No users found.</Td></Tr>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <Tr key={row.id} className={clsx("dark:border-b-dark-500 relative border-y border-transparent border-b-gray-200", row.getIsSelected() && !isSafari && "row-selected after:bg-primary-500/10 ltr:after:border-l-primary-500 after:pointer-events-none after:absolute after:inset-0 after:z-2 after:h-full after:w-full after:border-3 after:border-transparent")}>
                          {row.getVisibleCells().filter((cell) => !cell.column.columnDef.isHiddenColumn).map((cell) => (
                            <Td key={cell.id} className={clsx("relative bg-white", cardSkin === "shadow" ? "dark:bg-dark-700" : "dark:bg-dark-900")}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </Td>
                          ))}
                        </Tr>
                      ))
                    )}
                  </TBody>
                </Table>
              </div>
              {table.getCoreRowModel().rows.length > 0 && (
                <div className={clsx("px-4 pt-4 pb-4 sm:px-5", tableSettings.enableFullScreen && "dark:bg-dark-800 bg-gray-50")}>
                  <PaginationSection table={table} />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-dark-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-dark-100">Add New User</h2>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <Input label="Email *" type="email" {...createForm.register("email")} error={createForm.formState.errors.email?.message} />
              <Input label="Full Name *" {...createForm.register("full_name")} error={createForm.formState.errors.full_name?.message} />
              <Input label="Password *" type="password" {...createForm.register("password")} error={createForm.formState.errors.password?.message} />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">Role</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100" {...createForm.register("role")}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outlined" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" color="primary" disabled={createForm.formState.isSubmitting}>{createForm.formState.isSubmitting ? "Creating..." : "Create User"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setEditingUser(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-dark-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-dark-100">Edit User</h2>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <Input label="Full Name *" {...editForm.register("full_name")} error={editForm.formState.errors.full_name?.message} />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">Role</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100" {...editForm.register("role")}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" {...editForm.register("is_active")} className="h-4 w-4 rounded border-gray-300 accent-primary-600" />
                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-dark-200">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outlined" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button type="submit" color="primary" disabled={editForm.formState.isSubmitting}>{editForm.formState.isSubmitting ? "Saving..." : "Save Changes"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}
