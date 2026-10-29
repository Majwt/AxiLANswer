import { ArrowUpRight, Puzzle, RotateCw } from "lucide-react";
import { NavLink, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { usePlugins } from "@/features/plugins/plugin-context";
import { pluginPagePath } from "@/features/plugins/manifest";

export function HomePage() {
  const { plugins, status, retry } = usePlugins();
  const { customerId } = useParams();

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 lg:px-6">
      <header className="mb-5 border-b pb-4">
        <h1 className="font-heading text-xl font-semibold">Home</h1>
      </header>

      {status === "loading" && (
        <p role="status" className="text-sm text-muted-foreground">Loading available tools...</p>
      )}

      {status === "error" && (
        <section className="flex flex-col items-start gap-3">
          <h2 className="text-base font-semibold">Tools unavailable</h2>
          <p role="alert" className="text-sm text-muted-foreground">The tool configuration could not be loaded.</p>
          <Button variant="outline" onClick={retry}>
            <RotateCw data-icon="inline-start" />Retry
          </Button>
        </section>
      )}

      {status === "ready" && plugins.length === 0 && (
        <p className="text-sm text-muted-foreground">No tools are available for your account.</p>
      )}

      {status === "ready" && plugins.length > 0 && (
        <div className="divide-y border-y">
          {plugins.map((plugin) => (
            <section key={plugin.id} className="py-4 first:pt-0 last:pb-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Puzzle className="size-4 text-muted-foreground" aria-hidden="true" />
                {plugin.name}
              </h2>
              <ul className="mt-2 flex flex-wrap gap-x-6">
                {plugin.pages.map((page) => (
                  <li key={page.id}>
                    <NavLink
                      to={pluginPagePath(plugin.id, page.id, page.customerScope ? customerId : undefined)}
                      className="inline-flex items-center gap-1 py-2 text-sm font-medium hover:text-primary"
                    >
                      {page.title}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}