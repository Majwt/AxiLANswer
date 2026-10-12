import { createContext, useContext } from "react";
import type { InstalledPlugin } from "./plugin-types";

export type PluginRegistry = {
  configuredPlugins: InstalledPlugin[];
  enabledPluginIds: string[];
  plugins: InstalledPlugin[];
  status: "loading" | "ready" | "error";
  retry: () => void;
};

export const PluginContext = createContext<PluginRegistry | null>(null);

export function usePlugins() {
  const context = useContext(PluginContext);
  if (!context) throw new Error("usePlugins must be used within PluginProvider");
  return context;
}