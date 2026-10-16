import { apiGet, apiPost } from "@/api/client";

export type GuiTableInfo = { schema: string; table: string; kind?: string; server_column?: string; key_column?: string };

export type GuiFilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "not_in"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_null"
  | "not_null";

export type GuiTableFilter = { column: string; operator: GuiFilterOperator; value: string | null; second_value?: string };
export type GuiTableSort = { column: string; descending: boolean };
export type GuiTableQueryResult = { columns: string[]; rows: unknown[][]; total_count: number; page: number; page_size: number };

export type GuiTableQuery = {
  page: number;
  page_size: number;
  search: string;
  match: "all" | "any";
  filters: GuiTableFilter[];
  sort: GuiTableSort | null;
};

const tablePath = (table: GuiTableInfo) =>
  `/gui/tables/${encodeURIComponent(table.schema)}/${encodeURIComponent(table.table)}`;

export type GuiColumnInfo = { column_name: string; data_type: string; is_nullable: boolean; is_read_only: boolean };

export function fetchGuiColumnInfo(table: GuiTableInfo): Promise<GuiColumnInfo[]> {
  return apiGet(`${tablePath(table)}/metadata`);
}

export function writeGuiRow(table: GuiTableInfo, action: "insert" | "update" | "delete", key: string | null, values: Record<string, string | null>, original: Record<string, string | null>) {
  return apiPost<{ saved: boolean }>(`${tablePath(table)}/write`, { action, key, values, original });
}

export function fetchGuiTables(): Promise<GuiTableInfo[]> {
  return apiGet("/gui/tables");
}

export function queryGuiTable(table: GuiTableInfo, query: GuiTableQuery, signal?: AbortSignal): Promise<GuiTableQueryResult> {
  return apiPost(`${tablePath(table)}/query`, query, signal);
}
