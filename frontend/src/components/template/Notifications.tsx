// Import Dependencies
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Transition,
} from "@headlessui/react";
import {
  ArchiveBoxXMarkIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { IoCheckmarkDoneOutline } from "react-icons/io5";
import clsx from "clsx";
import React, { Fragment, useState, FocusEvent } from "react";
import { useNavigate } from "react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// Local Imports
import {
  Avatar,
  type AvatarProps,
  AvatarDot,
  Badge,
  Button,
} from "@/components/ui";
import { useThemeContext } from "@/app/contexts/theme/context";
import { NotificationType } from "@/@types/common";
import AlarmIcon from "@/assets/dualicons/alarm.svg?react";
import GirlEmptyBox from "@/assets/illustrations/girl-empty-box.svg?react";
import { AppNotification } from "@/@types/notification";
import { useNotifications } from "@/hooks/useNotifications";

// ----------------------------------------------------------------------

interface NotificationTypeInfo {
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: AvatarProps["initialColor"];
}

const types: Record<string, NotificationTypeInfo> = {
  message: {
    title: "Message",
    Icon: EnvelopeIcon,
    color: "info",
  },
  task: {
    title: "Status",
    Icon: IoCheckmarkDoneOutline,
    color: "success",
  },
  log: {
    title: "Date",
    Icon: DocumentTextIcon,
    color: "neutral",
  },
  security: {
    title: "Security",
    Icon: ExclamationTriangleIcon,
    color: "error",
  },
  review: {
    title: "Review",
    Icon: ClipboardDocumentCheckIcon,
    color: "warning",
  },
  approved: {
    title: "Approved",
    Icon: CheckCircleIcon,
    color: "success",
  },
  rejected: {
    title: "Rejected",
    Icon: XCircleIcon,
    color: "error",
  },
};

const typesKey = Object.keys(types) as NotificationType[];

interface NotificationItemProps {
  data: AppNotification;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
  onNavigate?: () => void;
}

function NotificationItem({ data, onDismiss, onMarkRead, onNavigate }: NotificationItemProps) {
  const typeInfo = types[data.type] ?? types.task;
  const Icon = typeInfo.Icon;

  const handleClick = () => {
    if (!data.is_read) onMarkRead(data.id);
    if (data.related_activity_id && onNavigate) onNavigate();
  };

  const colorBorder =
    data.type === "approved"
      ? "border-l-2 border-l-green-500"
      : data.type === "rejected"
        ? "border-l-2 border-l-red-500"
        : data.type === "review"
          ? "border-l-2 border-l-amber-500"
          : "";

  return (
    <div
      className={clsx(
        "group flex items-center justify-between gap-3 rounded-lg p-1 -mx-1 cursor-pointer transition hover:bg-gray-50 dark:hover:bg-dark-600",
        !data.is_read && "bg-primary-50/50 dark:bg-primary-900/10",
        colorBorder,
      )}
      onClick={handleClick}
    >
      <div className="flex min-w-0 gap-3">
        <div className="relative shrink-0">
          <Avatar
            size={10}
            initialColor={typeInfo.color}
            classNames={{ display: "rounded-lg" }}
          >
            <Icon className="size-4.5" />
          </Avatar>
          {!data.is_read && (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary-500" />
          )}
        </div>
        <div className="min-w-0">
          <p className="-mt-0.5 truncate font-medium text-gray-800 dark:text-dark-100">
            {data.title}
          </p>
          <div className="mt-0.5 truncate text-xs text-gray-600 dark:text-dark-300">
            {data.description}
          </div>
          <div className="mt-1 truncate text-xs text-gray-400 dark:text-dark-400">
            {dayjs(data.created_at).fromNow()}
          </div>
        </div>
      </div>
      <Button
        variant="flat"
        isIcon
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDismiss(data.id); }}
        className="size-7 rounded-full opacity-0 group-hover:opacity-100 ltr:-mr-2 rtl:-ml-2 shrink-0"
      >
        <ArchiveBoxXMarkIcon className="size-4" />
      </Button>
    </div>
  );
}

function Empty() {
  const { primaryColorScheme: primary, darkColorScheme: dark } = useThemeContext();
  return (
    <div className="grid grow place-items-center text-center">
      <div>
        <GirlEmptyBox
          className="mx-auto w-40"
          style={{ "--primary": primary[500], "--dark": dark[500] } as React.CSSProperties}
        />
        <div className="mt-6">
          <p>No new notifications yet</p>
        </div>
      </div>
    </div>
  );
}

export function Notifications() {
  const { notifications, unreadCount, dismiss, markRead, dismissAll } = useNotifications();
  const [activeTab, setActiveTab] = useState<number>(0);
  const navigate = useNavigate();

  const visibleNotifications =
    activeTab === 0
      ? notifications
      : notifications.filter((n) => n.type === typesKey[activeTab - 1]);

  const handleDismissAll = async () => {
    if (activeTab === 0) {
      await dismissAll();
    } else {
      await dismissAll(typesKey[activeTab - 1]);
    }
  };

  return (
    <Popover className="relative flex">
      <PopoverButton
        as={Button}
        variant="flat"
        isIcon
        className="relative size-9 rounded-full"
      >
        <AlarmIcon className="size-6 text-gray-900 dark:text-dark-100" />
        {unreadCount > 0 && (
          <AvatarDot
            color="error"
            isPing
            className="top-0 ltr:right-0 rtl:left-0"
          />
        )}
      </PopoverButton>

      <Transition
        enter="transition ease-out"
        enterFrom="opacity-0 translate-y-2"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-2"
      >
        <PopoverPanel
          anchor={{ to: "bottom end", gap: 8 }}
          className="z-70 mx-4 flex h-[min(32rem,calc(100vh-6rem))] w-[calc(100vw-2rem)] flex-col rounded-lg border border-gray-150 bg-white shadow-soft dark:border-dark-800 dark:bg-dark-700 dark:shadow-soft-dark sm:m-0 sm:w-80"
        >
          {({ close }: { close: () => void }) => (
            <div className="flex grow flex-col overflow-hidden">
              {/* Header */}
              <div className="rounded-t-lg bg-gray-100 dark:bg-dark-800">
                <div className="flex items-center justify-between px-4 pt-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800 dark:text-dark-100">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <Badge color="primary" className="h-5 rounded-full px-1.5" variant="soft">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
                  <div />
                </div>
              </div>

              {/* Tabs */}
              <TabGroup as={Fragment} selectedIndex={activeTab} onChange={setActiveTab}>
                <TabList className="hide-scrollbar flex shrink-0 overflow-x-auto scroll-smooth bg-gray-100 px-3 dark:bg-dark-800">
                  {["All", ...typesKey.map((k) => types[k].title)].map((label) => (
                    <Tab
                      key={label}
                      onFocus={(e: FocusEvent<HTMLButtonElement>) => {
                        const target = e.target;
                        const parent = target.parentNode as HTMLElement;
                        if (parent) parent.scrollLeft = target.offsetLeft - parent.offsetWidth / 2;
                      }}
                      className={({ selected }: { selected: boolean }) =>
                        clsx(
                          "shrink-0 scroll-mx-16 whitespace-nowrap border-b-2 px-3 py-2 font-medium",
                          selected
                            ? "border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-400"
                            : "border-transparent hover:text-gray-800 focus:text-gray-800 dark:hover:text-dark-100 dark:focus:text-dark-100"
                        )
                      }
                      as={Button}
                      unstyled
                    >
                      {label}
                    </Tab>
                  ))}
                </TabList>

                {visibleNotifications.length > 0 ? (
                  <TabPanels as={Fragment}>
                    {[0, ...typesKey.map((_, i) => i + 1)].map((panelIdx) => (
                      <TabPanel
                        key={panelIdx}
                        className="custom-scrollbar grow space-y-2 overflow-y-auto overflow-x-hidden p-4 outline-hidden"
                      >
                        {visibleNotifications.map((item) => (
                          <NotificationItem
                            key={item.id}
                            data={item}
                            onDismiss={dismiss}
                            onMarkRead={markRead}
                            onNavigate={() => {
                              close();
                              if (item.type === "review") {
                                navigate(`/activities/${item.related_activity_id}/review`);
                              } else {
                                navigate(`/history/${item.related_activity_id}`);
                              }
                            }}
                          />
                        ))}
                      </TabPanel>
                    ))}
                  </TabPanels>
                ) : (
                  <Empty />
                )}
              </TabGroup>

              {/* Footer */}
              {visibleNotifications.length > 0 && (
                <div className="shrink-0 overflow-hidden rounded-b-lg bg-gray-100 dark:bg-dark-800">
                  <Button className="w-full rounded-t-none" onClick={handleDismissAll}>
                    <span>Dismiss all</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </PopoverPanel>
      </Transition>
    </Popover>
  );
}
