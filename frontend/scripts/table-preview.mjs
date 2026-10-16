import http from "node:http";
import { pathToFileURL } from "node:url";

export const columns = ["ID", "ServerName", "Environment"];
export const fixtureRows = Array.from({ length: 203 }, (_, index) => [index + 1, `server-${index % 5}`, index % 2 ? "Production" : null]);

function compare(left, right) {
  if (left === right) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  return typeof left === "number" ? left - right : String(left).localeCompare(String(right), "en", { sensitivity: "base" });
}

function predicate(filter) {
  const index = columns.indexOf(filter.column);
  if (index < 0) throw new Error("Unknown column.");
  const convert = (value) => {
    if (value == null) throw new Error("A value is required.");
    if (index !== 0) return String(value);
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error("Invalid number.");
    return number;
  };
  if (filter.operator === "is_null") return (row) => row[index] == null;
  if (filter.operator === "not_null") return (row) => row[index] != null;
  if (["contains", "not_contains", "starts_with", "ends_with"].includes(filter.operator)) {
    if (filter.value == null) throw new Error("A value is required.");
    const needle = String(filter.value).toLowerCase();
    return (row) => {
      if (row[index] == null) return filter.operator === "not_contains";
      const text = String(row[index]).toLowerCase();
      if (filter.operator === "starts_with") return text.startsWith(needle);
      if (filter.operator === "ends_with") return text.endsWith(needle);
      return filter.operator === "contains" ? text.includes(needle) : !text.includes(needle);
    };
  }
  if (["in", "not_in"].includes(filter.operator)) {
    const list = JSON.parse(filter.value);
    if (!Array.isArray(list)) throw new Error("Expected a value list.");
    const values = list.map(convert);
    return (row) => row[index] != null && (values.some((value) => compare(row[index], value) === 0) === (filter.operator === "in"));
  }
  const value = convert(filter.value);
  if (filter.operator === "between") {
    const end = convert(filter.second_value);
    return (row) => row[index] != null && compare(row[index], value) >= 0 && compare(row[index], end) <= 0;
  }
  const operators = { eq: (result) => result === 0, neq: (result) => result !== 0, gt: (result) => result > 0,
    gte: (result) => result >= 0, lt: (result) => result < 0, lte: (result) => result <= 0 };
  if (!operators[filter.operator]) throw new Error("Unknown operator.");
  return (row) => row[index] == null ? filter.operator === "neq" : operators[filter.operator](compare(row[index], value));
}

export function queryRows(rows, query) {
  const { page = 1, page_size = 100, filters = [], search = "", match = "all", sort = null } = query;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(page_size) || page_size < 1 || page_size > 500 ||
      !Array.isArray(filters) || filters.length > 50 || !["all", "any"].includes(match) || typeof search !== "string" || search.length > 500) throw new Error("Invalid query.");
  const rules = filters.map(predicate);
  const needle = search.toLowerCase();
  const filtered = rows.filter((row) => (rules.length === 0 || (match === "any" ? rules.some((rule) => rule(row)) : rules.every((rule) => rule(row)))) &&
    (!needle || row.some((value) => value != null && String(value).toLowerCase().includes(needle))));
  const index = columns.indexOf(sort?.column ?? "ID");
  if (index < 0) throw new Error("Unknown sort column.");
  filtered.sort((left, right) => compare(left[index], right[index]) * (sort?.descending ? -1 : 1) || left[0] - right[0]);
  const offset = (page - 1) * page_size;
  return { columns, rows: filtered.slice(offset, offset + page_size), total_count: filtered.length, page, page_size };
}

const tables = [
  { schema: "dbo", table: "Inventory", kind: "data", server_column: "ServerName", key_column: "ID" },
  { schema: "dbo", table: "Servers", kind: "server_config", server_column: "ServerName", key_column: "ID" },
  { schema: "dbo", table: "Errors", kind: "server_errors", server_column: "ServerName", key_column: "ID" },
];
const metadata = columns.map((name, index) => ({ column_name: name, data_type: index ? "nvarchar" : "int", is_nullable: index === 2, is_read_only: index === 0 }));

export function createPreviewServer() {
  const datasets = new Map(tables.map((table) => [table.table, fixtureRows.map((row) => [...row])]));
  return http.createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
    response.setHeader("Content-Type", "application/json");
    if (request.method === "OPTIONS") { response.end(); return; }
    try {
      const path = new URL(request.url, "http://localhost").pathname;
      if (path.endsWith("/auth/config")) { response.end(JSON.stringify({ oidc_enabled: false })); return; }
      if (path.endsWith("/customers")) { response.end("[]"); return; }
      if (path.endsWith("/gui/tables")) { response.end(JSON.stringify(tables)); return; }
      const target = path.match(/\/gui\/tables\/dbo\/([^/]+)\/(query|metadata|write)$/);
      if (!target || !datasets.has(target[1])) { response.writeHead(404).end("{}"); return; }
      const rows = datasets.get(target[1]);
      if (target[2] === "metadata") { response.end(JSON.stringify(metadata)); return; }
      let body = "";
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 100000) throw new Error("Request too large.");
      }
      const query = JSON.parse(body);
      if (target[2] === "query") { response.end(JSON.stringify(queryRows(rows, query))); return; }
      if (target[1] !== "Servers" || !["insert", "update", "delete"].includes(query.action)) throw new Error("Invalid write.");
      if (query.action === "insert") {
        if (!query.values?.ServerName) throw new Error("ServerName is required.");
        rows.push([Math.max(0, ...rows.map((row) => row[0])) + 1, query.values.ServerName, query.values.Environment ?? null]);
      } else {
        const index = rows.findIndex((row) => String(row[0]) === query.key);
        if (index < 0 || columns.some((column, position) => (rows[index][position] == null ? null : String(rows[index][position])) !== query.original?.[column])) {
          response.writeHead(409).end(JSON.stringify({ error: "This row changed. Refresh before retrying." })); return;
        }
        if (query.action === "delete") rows.splice(index, 1);
        else {
          if (Object.keys(query.values).some((column) => columns.indexOf(column) <= 0)) throw new Error("Invalid write column.");
          for (const [column, value] of Object.entries(query.values)) rows[index][columns.indexOf(column)] = value;
        }
      }
      response.end(JSON.stringify({ saved: true }));
    } catch (error) {
      response.writeHead(400).end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request." }));
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.TABLE_PREVIEW_PORT ?? 8098);
  createPreviewServer().listen(port, "127.0.0.1", () => console.log(`Synthetic table preview API: http://127.0.0.1:${port}`));
}