import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, RotateCw, X } from "lucide-react";
import {
  fetchGuiTables,
  queryGuiTable,
  type GuiFilterOperator,
  type GuiTableFilter,
  type GuiTableInfo,
  type GuiTableQueryResult,
  type GuiTableSort,
} from "@/api/gui-table-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataGrid } from "./data-grid";
import { FILTER_OPERATORS, describeFilter, sameFilter } from "./filters";
import { RowEditor } from "./row-editor";

const PAGE_SIZES = [25, 50, 100, 250, 500];

type TablesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; tables: GuiTableInfo[] };

type QueryState = { key: string; tableKey: string; result?: GuiTableQueryResult; error?: string };

const tableKeyOf = (table: GuiTableInfo) => `${table.schema}.${table.table}`;

export default function AxiAnswerTablePage() {
  const [tablesState, setTablesState] = useState<TablesState>({ status: "loading" });
  const [selected, setSelected] = useState<GuiTableInfo | null>(null);
  const [filters, setFilters] = useState<GuiTableFilter[]>([]);
  const [sort, setSort] = useState<GuiTableSort | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [search, setSearch] = useState("");
  const [match, setMatch] = useState<"all" | "any">("all");
  const [nonce, setNonce] = useState(0);
  const [query, setQuery] = useState<QueryState | null>(null);
  const [editor, setEditor] = useState<{ original: Record<string, string | null> | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGuiTables()
      .then((tables) => !cancelled && setTablesState({ status: "ready", tables }))
      .catch(() => !cancelled && setTablesState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);

  const queryKey = selected ? JSON.stringify([selected, filters, sort, page, pageSize, search, match, nonce]) : null;

  useEffect(() => {
    if (!selected || !queryKey) return;
    const controller = new AbortController();
    const tableKey = tableKeyOf(selected);
    const timer = setTimeout(() => {
      queryGuiTable(selected, { page, page_size: pageSize, search, match, filters, sort }, controller.signal)
        .then((result) => !controller.signal.aborted && setQuery({ key: queryKey, tableKey, result }))
        .catch((error: Error) => !controller.signal.aborted && setQuery({ key: queryKey, tableKey, error: error.message }));
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [queryKey, selected, page, pageSize, search, match, filters, sort]);

  const loading = queryKey !== null && query?.key !== queryKey;
  const current = selected && query?.tableKey === tableKeyOf(selected) ? query : null;
  const columns = current?.result?.columns ?? [];

  function selectTable(table: GuiTableInfo) {
    setSelected(table);
    setFilters([]);
    setSort(null);
    setSearch("");
    setMatch("all");
    setPage(1);
  }

  function addFilter(filter: GuiTableFilter) {
    setPage(1);
    setFilters((existing) => (existing.some((entry) => sameFilter(entry, filter)) ? existing : [...existing, filter]));
  }

  if (tablesState.status === "loading") {
    return <p role="status" className="p-6 text-sm text-muted-foreground">Loading tables...</p>;
  }
  if (tablesState.status === "error") {
    return <p role="alert" className="p-6 text-sm text-destructive">Could not load the table list.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-end gap-3 px-4 py-3 lg:px-6">
        <Select
          value={selected ? tableKeyOf(selected) : ""}
          onValueChange={(value) => {
            const table = tablesState.tables.find((entry) => tableKeyOf(entry) === value);
            if (table) selectTable(table);
          }}
        >
          <SelectTrigger className="w-72 max-w-full" aria-label="Table">
            <SelectValue placeholder="Select a table" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
            {tablesState.tables.map((table) => (
              <SelectItem key={tableKeyOf(table)} value={tableKeyOf(table)}>
                [{table.schema}].[{table.table}]
              </SelectItem>
            ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Input aria-label="Search all columns" placeholder="Search all columns" className="w-64 max-w-full" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />

        <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
          <SelectTrigger className="w-32" aria-label="Page size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
            {PAGE_SIZES.map((limit) => (
              <SelectItem key={limit} value={String(limit)}>{limit} per page</SelectItem>
            ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => setNonce((value) => value + 1)} disabled={!selected} aria-label="Refresh">
          <RotateCw />
        </Button>

        {columns.length > 0 && <FilterForm columns={columns} onAdd={addFilter} />}
        {selected?.kind === "server_config" && <Button onClick={() => setEditor({ original: null })}><Plus data-icon="inline-start" />Add server</Button>}
      </div>

      {filters.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-3 lg:px-6">
          <Select value={match} onValueChange={(value) => { setMatch(value as "all" | "any"); setPage(1); }}>
            <SelectTrigger aria-label="Combine filters"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="all">Match all</SelectItem><SelectItem value="any">Match any</SelectItem></SelectGroup></SelectContent>
          </Select>
          {filters.map((filter) => (
            <Badge key={describeFilter(filter)} variant="secondary" className="gap-1">
              {describeFilter(filter)}
              <button
                type="button"
                aria-label={`Remove filter ${describeFilter(filter)}`}
                onClick={() => { setFilters((existing) => existing.filter((entry) => entry !== filter)); setPage(1); }}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={() => { setFilters([]); setPage(1); }}>Clear all</Button>
        </div>
      )}

      {!selected && <p className="p-6 text-sm text-muted-foreground">Select a table to view its data.</p>}
      {current?.error && <p role="alert" className="px-6 py-3 text-sm text-destructive">{current.error}</p>}
      {selected && current?.result && (
        <div className={loading ? "flex min-h-0 flex-1 flex-col opacity-60" : "flex min-h-0 flex-1 flex-col"}>
          <DataGrid
            key={`${tableKeyOf(selected)}:${current.key}`}
            storageKey={`axianswer-table:layout:${tableKeyOf(selected)}`}
            result={current.result}
            sort={sort}
            onSort={(value) => { setSort(value); setPage(1); }}
            onAddFilter={(filter) => { setMatch("all"); addFilter(filter); }}
            onNavigateServer={(kind, row) => {
              const destination = tablesState.tables.find((table) => table.kind === kind);
              const sourceIndex = selected.server_column ? columns.indexOf(selected.server_column) : -1;
              const server = row[sourceIndex];
              if (!destination?.server_column || server == null) return;
              selectTable(destination);
              setFilters([{ column: destination.server_column, operator: "eq", value: String(server) }]);
            }}
            canNavigateServer={(kind) => !!selected.server_column && tablesState.tables.some((table) => table.kind === kind && table.server_column)}
            onEditRow={selected.kind === "server_config" ? (row) => setEditor({ original: Object.fromEntries(columns.map((column, index) => [column, row[index] == null ? null : String(row[index])])) }) : undefined}
          />
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-2">
            <p role="status" className="text-sm text-muted-foreground">{loading ? "Updating..." : `${current.result.total_count.toLocaleString()} matching rows`}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" title="Previous page" aria-label="Previous page" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button>
              <span className="text-sm">Page {page} / {Math.max(1, Math.ceil(current.result.total_count / pageSize))}</span>
              <Button variant="outline" size="icon" title="Next page" aria-label="Next page" disabled={loading || page * pageSize >= current.result.total_count} onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button>
            </div>
          </div>
        </div>
      )}
      {selected && !current && loading && <p role="status" className="p-6 text-sm text-muted-foreground">Loading...</p>}
      {editor && selected && <RowEditor table={selected} original={editor.original} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setPage(1); setNonce((value) => value + 1); }} />}
    </div>
  );
}

function FilterForm({ columns, onAdd }: { columns: string[]; onAdd: (filter: GuiTableFilter) => void }) {
  const [column, setColumn] = useState("");
  const [operator, setOperator] = useState<GuiFilterOperator>("contains");
  const [value, setValue] = useState("");
  const [secondValue, setSecondValue] = useState("");
  const needsValue = FILTER_OPERATORS.find((entry) => entry.value === operator)?.needsValue ?? true;
  const canAdd = columns.includes(column) && (!needsValue || value !== "") && (operator !== "between" || secondValue !== "");

  function submit() {
    if (!canAdd) return;
    onAdd({ column, operator, value: needsValue ? (operator === "in" || operator === "not_in" ? JSON.stringify(value.split("\n")) : value) : null,
      ...(operator === "between" ? { second_value: secondValue } : {}) });
    setValue("");
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Select value={column} onValueChange={setColumn}>
        <SelectTrigger className="w-44" aria-label="Filter column">
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
          {columns.map((entry) => (
            <SelectItem key={entry} value={entry}>{entry}</SelectItem>
          ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select value={operator} onValueChange={(next) => setOperator(next as GuiFilterOperator)}>
        <SelectTrigger className="w-44" aria-label="Filter operator">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
          {FILTER_OPERATORS.map((entry) => (
            <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>
          ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {needsValue && (
        operator === "in" || operator === "not_in" ?
          <textarea aria-label="Values, one per line" className="rounded-md border bg-background p-2" placeholder="One value per line" value={value} onChange={(event) => setValue(event.target.value)} /> :
          <Input aria-label="Filter value" className="w-44" placeholder="Value" value={value} onChange={(event) => setValue(event.target.value)} />
      )}
      {operator === "between" && <Input aria-label="Range end" className="w-44" placeholder="Range end" value={secondValue} onChange={(event) => setSecondValue(event.target.value)} />}
      <Button type="submit" variant="outline" disabled={!canAdd}><Plus data-icon="inline-start" />Add filter</Button>
    </form>
  );
}
