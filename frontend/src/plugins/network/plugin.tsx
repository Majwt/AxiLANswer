import { lazy } from "react";
import { LayoutDashboard, Network } from "lucide-react";
import type { PluginDefinition, PluginPageProps } from "@/features/plugins/plugin-types";

const DashboardShell = lazy(() =>
  import("@/features/dashboard/ui/dashboard-shell").then((module) => ({ default: module.DashboardShell })),
);
const GraphShell = lazy(() =>
  import("@/features/graph/ui/graph-shell").then((module) => ({ default: module.GraphShell })),
);

function NetworkOverviewPage(_props: PluginPageProps) {
  return <DashboardShell />;
}

function NetworkGraphPage(_props: PluginPageProps) {
  return <GraphShell />;
}

const plugin: PluginDefinition = {
  id: "network",
  name: "Network",
  pages: [
    { id: "overview", title: "Network Overview", component: NetworkOverviewPage, icon: LayoutDashboard, customerScope: true },
    { id: "graph", title: "Graph", component: NetworkGraphPage, icon: Network, customerScope: true },
  ],
};

export default plugin;