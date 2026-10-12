# AxiLANswer Frontend

The frontend uses React, TypeScript, Vite, and shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `src/components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## Frontend Plugins

Plugins are trusted React modules bundled into the AxiLANswer frontend. Their
pages render directly inside the authenticated application shell, sharing its
React runtime, routing, theme, and UI components. A plugin may call its own
backend, but a separate backend is optional.

### Create a Plugin

Create `src/plugins/<plugin-id>/plugin.tsx`. Vite discovers modules at this
exact path during the frontend build. Export a `PluginDefinition` with one or
more page components:

```tsx
import type {
  PluginDefinition,
  PluginPageProps,
} from "@/features/plugins/plugin-types";

function Overview({ customerId, role }: PluginPageProps) {
  return (
    <section className="p-6">
      <h2 className="font-heading text-xl font-semibold">Inventory</h2>
      <p>Customer: {customerId ?? "All customers"}</p>
      <p>Signed-in role: {role}</p>
    </section>
  );
}

const plugin: PluginDefinition = {
  id: "inventory",
  name: "Inventory",
  pages: [
    { id: "overview", title: "Inventory overview", component: Overview },
    {
      id: "admin",
      title: "Inventory administration",
      component: Overview,
      roles: ["Admin"],
    },
  ],
};

export default plugin;
```

Plugin and page IDs must be unique, start with a lowercase letter, and contain
only lowercase letters, digits, or hyphens. Page components receive
`customerId: number | null` and `role: "Admin" | "Customer"`. The customer ID
is the selected customer for an admin, or the signed-in customer's ID. Use
`roles` to control which pages appear in host navigation and can be opened by
direct host URLs. These frontend checks do not secure backend data.

The host adds each page to the plugin's sidebar group. Routes use
`/plugins/<plugin-id>/<page-id>`; admins can also use
`/customer/<customer-id>/plugins/<plugin-id>/<page-id>` for customer-scoped
pages. Switching customers preserves the current plugin page.

### Enable and Install

1. Review the module, then build and deploy the frontend containing it. A
  manifest cannot install code that is not in that build.
2. Sign in as an admin and enable the module in **Settings**.
3. Download the updated `plugins.json` and publish it to the frontend static
  root. Refresh AxiLANswer to load the new configuration.

The settings manifest only enables bundled modules; it does not download or
execute remote code. The configuration format is:

```json
{
  "schemaVersion": 1,
  "enabledPluginIds": ["inventory"]
}
```

During development, edit `public/plugins.json`. The production build copies the
default configuration to `dist/plugins.json`; keep a deployment-managed copy
when publishing frontend updates so enabled plugin IDs are retained. An empty
`enabledPluginIds` list disables all plugins.

Because plugins execute in the host JavaScript environment, install only
reviewed code. Frontend role filters and customer IDs are UI context, not
security boundaries.

### Optional Backend

A plugin can call an independently deployed backend with `fetch` or a shared
frontend API client. For a cross-origin API, configure CORS for the AxiLANswer
origin. Implement authentication, authorization, and tenant checks in the
backend. If sending a host access token, the backend must be configured to
validate that token and its audience. Never treat the page's `role` or
`customerId` props as authorization.

## Security

Plugin modules execute in the host JavaScript environment and have the same
browser access as the frontend. Only bundle reviewed code. The enabled-plugin
manifest is configuration, not a security boundary; restrict who can publish
frontend code and static files. Backend services must independently authorize
every request.

## Verify

```sh
npm test -- src/features/plugins/manifest.test.ts
npm run build
```
