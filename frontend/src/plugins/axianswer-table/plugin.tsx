import type { PluginDefinition } from "@/features/plugins/plugin-types";
import TablePage from "./table-page";

const plugin: PluginDefinition = {
  id: "axianswer-table",
  name: "AxiAnswer Tables",
  pages: [{ id: "tables", title: "Tables", component: TablePage, roles: ["Admin"] }],
};

export default plugin;
