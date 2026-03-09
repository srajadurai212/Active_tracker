// Import Dependencies
import { useState } from "react";
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import {
  ArrowLeftStartOnRectangleIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Avatar, AvatarDot } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import { ChangePasswordModal } from "../MainLayout/ChangePasswordModal";

// ----------------------------------------------------------------------

export function Profile() {
  const { user, logout } = useAuthContext();
  const [changePwOpen, setChangePwOpen] = useState(false);

  return (
    <>
      <Popover className="relative flex">
        <PopoverButton
          as={Avatar}
          size={9}
          role="button"
          name={user?.full_name ?? "User"}
          initialColor="auto"
          indicator={
            <AvatarDot
              color="success"
              className="-m-0.5 size-3 ltr:right-0 rtl:left-0"
            />
          }
          className="cursor-pointer"
        />
        <Transition
          enter="duration-200 ease-out"
          enterFrom="translate-y-2 opacity-0"
          enterTo="translate-y-0 opacity-100"
          leave="duration-200 ease-out"
          leaveFrom="translate-y-0 opacity-100"
          leaveTo="translate-y-2 opacity-0"
        >
          <PopoverPanel
            anchor={{ to: "bottom end", gap: 12 }}
            className="border-gray-150 shadow-soft dark:border-dark-600 dark:bg-dark-700 z-70 flex w-64 flex-col rounded-lg border bg-white transition dark:shadow-none"
          >
            {({ close }) => (
              <>
                {/* User Info */}
                <div className="dark:bg-dark-800 flex items-center gap-4 rounded-t-lg bg-gray-100 px-4 py-5">
                  <Avatar
                    size={14}
                    name={user?.full_name ?? "User"}
                    initialColor="auto"
                  />
                  <div>
                    <p className="text-base font-medium text-gray-700 dark:text-dark-100">
                      {user?.full_name ?? "User"}
                    </p>
                    <p className="dark:text-dark-300 mt-0.5 text-xs capitalize text-gray-400">
                      {user?.role ?? "user"}
                    </p>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="flex flex-col pb-5 pt-2">
                  {/* Change Password */}
                  <button
                    type="button"
                    onClick={() => { close(); setChangePwOpen(true); }}
                    className="group dark:hover:bg-dark-600 dark:focus:bg-dark-600 flex items-center gap-3 px-4 py-2 tracking-wide outline-hidden transition-all hover:bg-gray-100 focus:bg-gray-100 w-full text-left"
                  >
                    <Avatar
                      size={8}
                      initialColor="warning"
                      classNames={{ display: "rounded-lg" }}
                    >
                      <KeyIcon className="size-4.5" />
                    </Avatar>
                    <div>
                      <h2 className="group-hover:text-primary-600 group-focus:text-primary-600 dark:text-dark-100 dark:group-hover:text-primary-400 dark:group-focus:text-primary-400 font-medium text-gray-800 transition-colors">
                        Change Password
                      </h2>
                      <div className="dark:text-dark-300 truncate text-xs text-gray-400">
                        Update your password
                      </div>
                    </div>
                  </button>

                  {/* Logout */}
                  <div className="px-4 pt-4">
                    <button
                      type="button"
                      onClick={async () => { close(); await logout(); }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100 dark:hover:bg-dark-600"
                    >
                      <ArrowLeftStartOnRectangleIcon className="size-4.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>

      <ChangePasswordModal open={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </>
  );
}
