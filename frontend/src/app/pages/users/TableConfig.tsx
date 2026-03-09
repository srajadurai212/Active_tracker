import { Fragment } from "react";
import { Popover, PopoverButton, PopoverPanel, Transition } from "@headlessui/react";
import { ViewColumnsIcon } from "@heroicons/react/24/outline";
import { Table } from "@tanstack/react-table";

import { TableSettings } from "@/components/shared/table/TableSettings";
import { Button } from "@/components/ui";
import { User } from "@/@types/user";

export function TableConfig({ table }: { table: Table<User> }) {
  return (
    <Popover className="relative">
      <PopoverButton
        as={Button}
        variant="outlined"
        className="gap-1.5 border-solid! px-3 py-1.5 text-sm"
      >
        <ViewColumnsIcon className="size-4" />
        <span>View</span>
      </PopoverButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <PopoverPanel
          anchor={{ to: "bottom end", gap: 8 }}
          className="z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-dark-500 dark:bg-dark-700"
        >
          <h3 className="px-3 pt-2.5 text-sm font-medium tracking-wide text-gray-800 dark:text-dark-100">
            Table View
          </h3>
          <TableSettings table={table} />
        </PopoverPanel>
      </Transition>
    </Popover>
  );
}
