import { RotateCw } from "lucide-react";
import { useParams } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { usePlugins } from "./plugin-context";

export function PluginPage() {
  const { pluginId, pageId, customerId: routeCustomerId } = useParams();
  const { role, customerId } = useAuth();
  const { plugins, status, retry } = usePlugins();
  const plugin = plugins.find((entry) => entry.id === pluginId);
  const page = plugin?.pages.find((entry) => entry.id === pageId);

  if (status === "loading") {
    return <p role="status" className="p-6 text-sm text-muted-foreground">Loading plugins...</p>;
  }

  if (status === "error") {
    return (
      <section className="flex flex-col items-start gap-3 p-6">
        <h1 className="text-lg font-semibold">Plugins unavailable</h1>
        <p role="alert" className="text-sm text-muted-foreground">The plugin configuration could not be loaded.</p>
        <Button variant="outline" onClick={retry}><RotateCw data-icon="inline-start" />Retry</Button>
      </section>
    );
  }

  if (!page || !plugin) {
    return (
      <section className="flex flex-col gap-2 p-6">
        <h1 className="text-lg font-semibold">Plugin page unavailable</h1>
        <p className="text-sm text-muted-foreground">This page is not installed, is disabled, or is not available to your account.</p>
      </section>
    );
  }

  const routeCustomerNumber = routeCustomerId ? Number(routeCustomerId) : null;
  const selectedCustomerId = role === "Admin" ? routeCustomerNumber : customerId;
  const PageComponent = page.component;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3 lg:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{plugin.name}</p>
          <h1 className="truncate text-lg font-semibold">{page.title}</h1>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <PageComponent customerId={selectedCustomerId != null && Number.isFinite(selectedCustomerId) ? selectedCustomerId : null} role={role === "Admin" ? "Admin" : "Customer"} />
      </div>
    </section>
  );
}