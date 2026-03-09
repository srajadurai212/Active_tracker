import { RouteObject } from "react-router";

/**
 * Public routes (no auth required, non-ghost).
 * Currently unused — error pages are handled by RootErrorBoundary.
 */
const publicRoutes: RouteObject = {
  id: "public",
  children: [],
};

export { publicRoutes };
