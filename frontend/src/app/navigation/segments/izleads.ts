import { NavigationTree } from "@/@types/navigation";

export const izleads: NavigationTree = {
  id: "izleads",
  type: "root",
  title: "Daily Activity Tracker",
  transKey: "nav.izleads.izleads",
  icon: "apps",
  childs: [
    {
      id: "izleads.dashboard",
      path: "/",
      type: "item",
      title: "Dashboard",
      transKey: "nav.izleads.dashboard",
      icon: "dashboards",
    },
    {
      id: "izleads.activities",
      path: "/activities",
      type: "item",
      title: "Activities",
      transKey: "nav.izleads.activities",
      icon: "tables",
    },
    {
      id: "izleads.users",
      path: "/users",
      type: "item",
      title: "Users",
      transKey: "nav.izleads.users",
      icon: "components",
    },
    {
      id: "izleads.audit-log",
      path: "/audit-log",
      type: "item",
      title: "Audit Log",
      transKey: "nav.izleads.audit-log",
      icon: "docs",
    },
  ],
};
