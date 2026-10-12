import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";
import { canAccessPluginPage, parsePluginManifest } from "./manifest";
import { PluginContext, type PluginRegistry } from "./plugin-context";
import { pluginDefinitions } from "./plugin-registry";

export function PluginProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    enabledPluginIds: string[];
    status: PluginRegistry["status"];
  }>({ enabledPluginIds: [], status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
    fetch(`${import.meta.env.BASE_URL}plugins.json`, { cache: "no-store", signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Plugin manifest returned ${response.status}`);
        return parsePluginManifest(await response.json());
      })
      .then((manifest) => {
        if (!controller.signal.aborted) setState({ enabledPluginIds: manifest.enabledPluginIds, status: "ready" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Unable to load plugin manifest", error);
        setState({ enabledPluginIds: [], status: "error" });
      });
    return () => controller.abort();
  }, [revision]);

  const configuredPlugins = pluginDefinitions.map((plugin) => ({
    ...plugin,
    enabled: state.enabledPluginIds.includes(plugin.id),
  }));
  const plugins = configuredPlugins
    .filter((plugin) => plugin.enabled)
    .map((plugin) => ({ ...plugin, pages: plugin.pages.filter((page) => canAccessPluginPage(page, role)) }))
    .filter((plugin) => plugin.pages.length > 0);

  const retry = () => {
    setState({ enabledPluginIds: [], status: "loading" });
    setRevision((value) => value + 1);
  };

  return (
    <PluginContext.Provider value={{ configuredPlugins, enabledPluginIds: state.enabledPluginIds, plugins, status: state.status, retry }}>
      {children}
    </PluginContext.Provider>
  );
}