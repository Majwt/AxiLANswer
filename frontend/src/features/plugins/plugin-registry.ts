import type { PluginDefinition } from "./plugin-types";

const modules = import.meta.glob<PluginDefinition>("/src/plugins/*/plugin.tsx", {
  eager: true,
  import: "default",
});

export const pluginDefinitions = Object.values(modules);