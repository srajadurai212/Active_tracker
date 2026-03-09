import { ElementType } from "react";
import {
  BellAlertIcon,
  CubeIcon,
  UserIcon as HiUserIcon,
} from "@heroicons/react/24/outline";
import { TbCoins, TbDevices, TbPalette } from "react-icons/tb";

import DashboardsIcon from "@/assets/dualicons/dashboards.svg?react";
import AppsIcon from "@/assets/dualicons/applications.svg?react";
import ComponentsIcon from "@/assets/dualicons/components.svg?react";
import DualTableIcon from "@/assets/dualicons/table.svg?react";
import LampIcon from "@/assets/dualicons/lamp.svg?react";
import SettingIcon from "@/assets/dualicons/setting.svg?react";

// Icons used by izleads navigation (icon keys in izleads.ts)
// and settings navigation (icon keys in settings.ts)
export const navigationIcons: Record<string, ElementType> = {
  // Generic icons used by izleads.ts nav items
  apps: AppsIcon,
  dashboards: DashboardsIcon,
  tables: DualTableIcon,
  components: ComponentsIcon,
  docs: LampIcon,

  // Settings
  settings: SettingIcon,
  "settings.general": HiUserIcon,
  "settings.appearance": TbPalette,
  "settings.billing": TbCoins,
  "settings.notifications": BellAlertIcon,
  "settings.applications": CubeIcon,
  "settings.sessions": TbDevices,
};
