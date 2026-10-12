import { useState } from "react";
import { Download, RotateCw } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { usePlugins } from "@/features/plugins/plugin-context";

export default function SettingsPage() {
  const { role } = useAuth();
  const { configuredPlugins, status, retry } = usePlugins();
  const [enabledOverrides, setEnabledOverrides] = useState<Record<string, boolean>>({});

  if (role !== "Admin") {
    return (
      <section className="p-4 md:p-6">
        <h1 className="font-heading text-2xl font-semibold">Settings</h1>
        <p className="mt-4 text-sm text-muted-foreground">Plugin settings are available to administrators only.</p>
      </section>
    );
  }

  const plugins = configuredPlugins.map((plugin) => ({
    plugin,
    enabled: enabledOverrides[plugin.id] ?? plugin.enabled,
  }));
  const hasChanges = plugins.some(({ plugin, enabled }) => enabled !== plugin.enabled);

  function downloadManifest() {
    const content = JSON.stringify({
      schemaVersion: 1,
      enabledPluginIds: plugins.filter(({ enabled }) => enabled).map(({ plugin }) => plugin.id),
    }, null, 2) + "\n";
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "plugins.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="font-heading text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Plugins</CardTitle>
          <CardDescription>Enable approved frontend modules and publish the configuration to the frontend static root.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {status === "loading" && <p className="text-sm text-muted-foreground">Loading plugin manifest...</p>}
          {status === "error" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-destructive">Could not load plugins.json.</p>
              <Button variant="outline" onClick={retry}><RotateCw data-icon="inline-start" />Retry</Button>
            </div>
          )}
          {status === "ready" && plugins.length === 0 && (
            <p className="text-sm text-muted-foreground">No frontend plugins are installed. Add a module and rebuild the frontend to register it.</p>
          )}
          {status === "ready" && plugins.map(({ plugin, enabled }) => (
            <div key={plugin.id} className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 last:border-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium">{plugin.name}</p>
                <p className="text-sm text-muted-foreground">{plugin.id} · {plugin.pages.length} {plugin.pages.length === 1 ? "page" : "pages"}</p>
              </div>
              <label className="flex shrink-0 items-center gap-3 text-sm">
                <span>{enabled ? "Enabled" : "Disabled"}</span>
                <Switch
                  checked={enabled}
                  aria-label={`${enabled ? "Disable" : "Enable"} ${plugin.name}`}
                  onCheckedChange={(checked) => setEnabledOverrides((current) => ({ ...current, [plugin.id]: checked }))}
                />
              </label>
            </div>
          ))}
          {status === "ready" && (
            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <Button onClick={downloadManifest} disabled={!hasChanges}>
                <Download data-icon="inline-start" />Download plugins.json
              </Button>
              <p className="text-sm text-muted-foreground">{hasChanges ? "Publish this file, then refresh AxiLANswer." : "Toggle a plugin to prepare an updated manifest."}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Install or create a plugin</CardTitle>
          <CardDescription>Plugins are trusted React modules rendered inside the AxiLANswer application.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <ol className="list-decimal pl-5">
            <li>Create a React/TypeScript module under <code>frontend/src/plugins/&lt;id&gt;/plugin.tsx</code>. It is bundled with the host and uses the same component tree, routes, and UI system.</li>
            <li>Export a plugin definition with an ID, name, and pages. Each page supplies a React component; use <code>roles: ["Admin"]</code> for admin-only navigation and routes.</li>
            <li>Use the provided <code>customerId</code> page prop or the host auth context for frontend context. UI role filters are not authorization.</li>
            <li>A backend is optional. If needed, call your service from the page and configure it to validate authentication and enforce its own authorization.</li>
            <li>Build and deploy the frontend module, enable it above, download <code>plugins.json</code>, and publish that file to the frontend static root.</li>
          </ol>
          <p className="text-muted-foreground">Only install reviewed modules: native plugins run in the host frontend and share its JavaScript environment. The settings manifest enables installed code; it does not install or download plugin code.</p>
        </CardContent>
      </Card>
    </section>
  );
}
