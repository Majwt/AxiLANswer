import { LegacyNetworkRedirect } from "@/features/network/legacy-routes";
import { HomePage } from "@/pages/home/home-page";
import SettingsPage from "@/pages/settings/settings-page";
import type { AdminRouteDef, ProtectedRouteDef } from "@/app/router/route-types";

export const protectedChildRoutes: ProtectedRouteDef[] = [
  {
    key: "home",
    index: true,
    element: <HomePage />,
  },
  {
    key: "settings",
    path: "settings",
    element: <SettingsPage />,
  },
];

export const legacyNetworkProtectedRoutes: ProtectedRouteDef[] = [
  {
    key: "legacy-dashboard",
    path: "dashboard",
    element: <LegacyNetworkRedirect pageId="overview" />,
  },
  {
    key: "legacy-graph",
    path: "graph",
    element: <LegacyNetworkRedirect pageId="graph" />,
  },
];

export const legacyNetworkAdminRoutes: AdminRouteDef[] = [
  {
    key: "legacy-customer-dashboard",
    path: "customer/:customerId/dashboard",
    element: <LegacyNetworkRedirect pageId="overview" customerScoped />,
  },
  {
    key: "legacy-customer-graph",
    path: "customer/:customerId/graph",
    element: <LegacyNetworkRedirect pageId="graph" customerScoped />,
  },
  {
    key: "legacy-customer-root",
    path: "customer/:customerId",
    element: <LegacyNetworkRedirect pageId="graph" customerScoped />,
  },
];
