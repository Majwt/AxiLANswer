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

### AxiAnswer Tables Deployment

The bundled `axianswer-table` plugin uses only stored procedures for data access.
A DBA must run `../db/manual/axianswer_table_procedures.sql` in the AxiAnswer
source database, not the AxiLANswer managed-node database. The script imports
the table list from Gui-sp's `dbo.sp_GuiTablesGet` when installed, or applies
the same discovery exclusions when it is absent. It registers tables with a
visible, non-null unique single-column key, preferring the primary key, and
reports skipped tables. Existing registrations are preserved on reruns.
Review the generated `dbo.AxiGuiTable` catalogue before granting API access;
remove any tables that should not be exposed. Additional approved tables can
be registered manually with their actual key and optional server-name column.

`Svr.ServerList` is registered as `server_config`, and `dbo.ErrorLog` as
`server_errors`, when present with a suitable key. `ServerName`, `MachineName`,
or `ComputerName` is detected as the server column when present; review this
mapping against the source schema. `managed_node` is a separate entity and is
never automatically classified as ServerList or made editable. No legacy
tables are created or replaced, and the existing `sp_Gui*` procedures are left
unchanged for the desktop GUI.

`Kind` is `data`, `server_config`, or `server_errors`. Only
`server_config` entries allow insert/update/delete; the latter two kinds are
destinations for the cell context menu. Do not register authentication tables
or datasets containing secrets. The standard API-key/password/token/secret
columns are excluded, but this is not a comprehensive data-classification policy.

Add the API database user to `db_AxiAnswer_GUI` (or `AxiGuiExecutor`); both roles
receive execute permission on the four `sp_AxiGui*` procedures. The web plugin
uses those procedures, not the desktop GUI's older query/write contracts.
Do not grant the API user access to the
catalogue or source tables. The procedures run as the database owner, so only a
trusted DBA may change the catalogue. Use a dedicated database with a trusted
owner and leave cross-database ownership chaining and TRUSTWORTHY disabled.
Set `ConnectionStrings__GuiTables` when the GUI source database differs from the
main API database (otherwise `Default` is used). Add `axianswer-table` to the
enabled plugin IDs after deploying the frontend.

Filtering, global search, counts, sorting and paging run over the full source
dataset. Row dragging rearranges the current page only; it never updates
database order. Column visibility, order, widths and pinning are stored per
table in this browser. CSV export exports the current page's visible columns,
not the full dataset. Global substring search and exact counts can be expensive;
measure against real data and index the common filter/sort columns before
promising response-time targets. Live SQL validation requires the real source
schema; the legacy procedure scripts are in the sibling `Gui-sp` workspace,
but its database tables are not included in this repository.

### Local SQL Test Fixtures

`db/manual/axianswer_test_data.sql` supplies a test-only ServerList matching the
desktop procedure fields and a synthetic ErrorLog schema. It only runs in
`AxiNetStatTest`, creates missing tables, and inserts four sample rows per
table without replacing existing rows. It does not alter `managed_node`.
From the repository root, run it before deploying the GUI procedures:

```sh
sqlcmd -S localhost,14330 -U sa -C -b -d AxiNetStatTest -i db/manual/axianswer_test_data.sql
sqlcmd -S localhost,14330 -U sa -C -b -d AxiNetStatTest -i db/manual/axianswer_table_procedures.sql
```

Use your local SQL credentials. Point `ConnectionStrings__GuiTables` at this
database if the API's default connection uses a different one. These fixtures
are not a production schema migration.

```sh
npm test -- src/features/plugins/manifest.test.ts
npm run build
```
