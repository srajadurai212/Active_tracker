import { RouteObject } from "react-router";

import AuthGuard from "@/middleware/AuthGuard";
import { DynamicLayout } from "../layouts/DynamicLayout";

/**
 * Protected routes configuration for IZ Leads Activity Tracker
 */
const protectedRoutes: RouteObject = {
  id: "protected",
  Component: AuthGuard,
  children: [
    {
      Component: DynamicLayout,
      children: [
        {
          index: true,
          lazy: async () => ({
            Component: (await import("@/app/pages/dashboard")).default,
          }),
        },
        {
          path: "/activities",
          lazy: async () => ({
            Component: (await import("@/app/pages/activities")).default,
          }),
        },
        {
          path: "/users",
          lazy: async () => ({
            Component: (await import("@/app/pages/users")).default,
          }),
        },
        {
          path: "/audit-log",
          lazy: async () => ({
            Component: (await import("@/app/pages/audit-log")).default,
          }),
        },
        {
          path: "/history/:activityId",
          lazy: async () => ({
            Component: (await import("@/app/pages/history")).default,
          }),
        },
        {
          path: "/activities/:activityId/review",
          lazy: async () => ({
            Component: (await import("@/app/pages/activities/ReviewPage")).default,
          }),
        },
      ],
    },
  ],
};

export { protectedRoutes };
