import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { EllipsisHorizontalIcon, PencilIcon, NoSymbolIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment } from "react";
import { Row, Table } from "@tanstack/react-table";
import { Button } from "@/components/ui";
import { User } from "@/@types/user";

export function RowActions({ row, table }: { row: Row<User>; table: Table<User> }) {
  return (
    <div className="flex justify-center gap-1.5">
      <Menu as="div" className="relative inline-block text-left">
        <MenuButton as={Button} isIcon className="size-8 rounded-full">
          <EllipsisHorizontalIcon className="size-4.5" />
        </MenuButton>
        <Transition
          as={Fragment}
          enter="transition ease-out" enterFrom="opacity-0 translate-y-2" enterTo="opacity-100 translate-y-0"
          leave="transition ease-in" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-2"
        >
          <MenuItems
            anchor={{ to: "bottom end" }}
            className="dark:border-dark-500 dark:bg-dark-750 absolute z-100 min-w-[10rem] rounded-lg border border-gray-300 bg-white py-1 shadow-lg outline-hidden dark:shadow-none"
          >
            <MenuItem>
              {({ focus }) => (
                <button
                  onClick={() => table.options.meta?.editRow?.(row)}
                  className={clsx("flex h-9 w-full items-center space-x-3 px-3 tracking-wide outline-hidden transition-colors", focus && "dark:bg-dark-600 dark:text-dark-100 bg-gray-100 text-gray-800")}
                >
                  <PencilIcon className="size-4.5 stroke-1" />
                  <span>Edit</span>
                </button>
              )}
            </MenuItem>
            {row.original.is_active && (
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => table.options.meta?.deleteRow?.(row)}
                    className={clsx("this:error text-this dark:text-this-light flex h-9 w-full items-center space-x-3 px-3 tracking-wide outline-hidden transition-colors", focus && "bg-this/10")}
                  >
                    <NoSymbolIcon className="size-4.5 stroke-1" />
                    <span>Deactivate</span>
                  </button>
                )}
              </MenuItem>
            )}
          </MenuItems>
        </Transition>
      </Menu>
    </div>
  );
}
