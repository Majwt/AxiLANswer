
# AxiAnswer API

After upgrading to AxiAnswer, users must sign in again. Existing browser and
refresh-token sessions are not migrated.

To run as IIS web app you need the [dotnet Hosting Runtime](https://dotnet.microsoft.com/en-us/download/dotnet/10.0).

## Graph endpoints

- `GET /api/graph` returns the full graph payload (`nodes`, `edges`) for backwards compatibility.
- `GET /api/graph/snapshot` returns full graph data and a cursor (`cursor.last_seen`, `cursor.last_row_id`).
- `GET /api/graph/delta?since_last_seen=<ISO>&since_row_id=<row-id>` returns incremental updates:
  - `upsert_nodes`
  - `upsert_edges`
  - `remove_node_ids`
  - `remove_edge_ids`
  - `cursor`

## Module configuration

Network is enabled by default. Set `Modules__Network__Enabled=false` to omit
Network services and return 404 for Graph, Dashboard, and network customer
endpoints. Network database options and `ConnectionStrings__Default` are only
required while Network is enabled.

Host refresh-session persistence can use the separate
`ConnectionStrings__Auth` database. If it is not configured, the API falls
back to `ConnectionStrings__Default` for existing deployments. Tables can use
`ConnectionStrings__GuiTables` independently; it also falls back to `Default`.
A Tables-only deployment should configure both `Auth` and `GuiTables`, allowing
it to run without Network tables or Network database configuration. Apply
`../db/auth_session.sql` and `../db/auth_refresh_token.sql` to the Auth database.

