import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import {
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useState } from "react";
import { Row, Table } from "@tanstack/react-table";
import { useNavigate } from "react-router";

import { ConfirmModal, type ConfirmMessages } from "@/components/shared/ConfirmModal";
import { Button } from "@/components/ui";
import { Activity } from "@/@types/activity";
import { useAuthContext } from "@/app/contexts/auth/context";

const confirmMessages: ConfirmMessages = {
  pending: {
    description: "Are you sure you want to delete this activity? This cannot be undone.",
  },
  success: { title: "Activity Deleted" },
};

export function RowActions({
  row,
  table,
}: {
  row: Row<Activity>;
  table: Table<Activity>;
}) {
  const { user } = useAuthContext();
  const isAdmin = user?.role === "admin";
  const canEdit =
    isAdmin || row.original.assigned_to_id === user?.id;

  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const handleDelete = useCallback(() => {
    setConfirmLoading(true);
    setDeleteError(false);
    table.options.meta?.deleteRow?.(row);
    // actual async call is handled by deleteRow in parent
    setTimeout(() => {
      setDeleteSuccess(true);
      setConfirmLoading(false);
    }, 600);
  }, [row, table]);

  const state = deleteError ? "error" : deleteSuccess ? "success" : "pending";

  return (
    <>
      <div className="flex justify-center gap-1.5">
        <Menu as="div" className="relative inline-block text-left">
          <MenuButton as={Button} isIcon className="size-8 rounded-full">
            <EllipsisHorizontalIcon className="size-4.5" />
          </MenuButton>
          <Transition
            as={Fragment}
            enter="transition ease-out"
            enterFrom="opacity-0 translate-y-2"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-2"
          >
            <MenuItems
              anchor={{ to: "bottom end" }}
              className="dark:border-dark-500 dark:bg-dark-750 absolute z-100 min-w-[10rem] rounded-lg border border-gray-300 bg-white py-1 shadow-lg shadow-gray-200/50 outline-hidden dark:shadow-none"
            >
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => navigate(`/history/${row.original.id}`)}
                    className={clsx(
                      "flex h-9 w-full items-center space-x-3 px-3 tracking-wide outline-hidden transition-colors",
                      focus && "dark:bg-dark-600 dark:text-dark-100 bg-gray-100 text-gray-800",
                    )}
                  >
                    <ClockIcon className="size-4.5 stroke-1" />
                    <span>History</span>
                  </button>
                )}
              </MenuItem>
              {canEdit && (
                <MenuItem>
                  {({ focus }) => (
                    <button
                      onClick={() => table.options.meta?.editRow?.(row)}
                      className={clsx(
                        "flex h-9 w-full items-center space-x-3 px-3 tracking-wide outline-hidden transition-colors",
                        focus && "dark:bg-dark-600 dark:text-dark-100 bg-gray-100 text-gray-800",
                      )}
                    >
                      <PencilIcon className="size-4.5 stroke-1" />
                      <span>Edit</span>
                    </button>
                  )}
                </MenuItem>
              )}
              {isAdmin && (
                <MenuItem>
                  {({ focus }) => (
                    <button
                      onClick={() => {
                        setDeleteModalOpen(true);
                        setDeleteError(false);
                        setDeleteSuccess(false);
                      }}
                      className={clsx(
                        "this:error text-this dark:text-this-light flex h-9 w-full items-center space-x-3 px-3 tracking-wide outline-hidden transition-colors",
                        focus && "bg-this/10 dark:bg-this-light/10",
                      )}
                    >
                      <TrashIcon className="size-4.5 stroke-1" />
                      <span>Delete</span>
                    </button>
                  )}
                </MenuItem>
              )}
            </MenuItems>
          </Transition>
        </Menu>
      </div>

      <ConfirmModal
        show={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        messages={confirmMessages}
        onOk={handleDelete}
        confirmLoading={confirmLoading}
        state={state}
      />
    </>
  );
}
