import { useEffect, useMemo, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, verticalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Columns3, Download, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GuiFilterOperator, GuiTableFilter, GuiTableQueryResult, GuiTableSort } from "@/api/gui-table-api";
import { cn } from "@/lib/utils";
import { formatCell } from "./filters";

const DEFAULT_WIDTH = 160;
const MIN_WIDTH = 60;

type Layout = { order: string[]; hidden: string[]; widths: Record<string, number>; pinned: string[] };
const EMPTY_LAYOUT: Layout = { order: [], hidden: [], widths: {}, pinned: [] };

function loadLayout(storageKey: string): Layout {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...EMPTY_LAYOUT, ...(JSON.parse(raw) as Partial<Layout>) } : EMPTY_LAYOUT;
  } catch {
    return EMPTY_LAYOUT;
  }
}

type MenuTarget = { column: string; value: unknown; isHeader: boolean; rowIndex: number };

type DataGridProps = {
  storageKey: string;
  result: GuiTableQueryResult;
  sort: GuiTableSort | null;
  onSort: (sort: GuiTableSort | null) => void;
  onAddFilter: (filter: GuiTableFilter) => void;
  onNavigateServer: (kind: "server_config" | "server_errors", row: unknown[]) => void;
  canNavigateServer: (kind: "server_config" | "server_errors") => boolean;
  onEditRow?: (row: unknown[]) => void;
};

export function DataGrid({ storageKey, result, sort, onSort, onAddFilter, onNavigateServer, canNavigateServer, onEditRow }: DataGridProps) {
  const [layout, setLayout] = useState<Layout>(() => loadLayout(storageKey));
  const [target, setTarget] = useState<MenuTarget | null>(null);
  const [rowOrder, setRowOrder] = useState(() => result.rows.map((_, index) => index));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(layout));
  }, [storageKey, layout]);

  // Saved order may be stale: drop removed columns, append new ones.
  const order = useMemo(() => {
    const known = layout.order.filter((column) => result.columns.includes(column));
    return [...known, ...result.columns.filter((column) => !known.includes(column))];
  }, [layout.order, result.columns]);

  const visible = [...layout.pinned.filter((column) => order.includes(column)), ...order.filter((column) => !layout.pinned.includes(column))].filter((column) => !layout.hidden.includes(column));
  const widthOf = (column: string) => layout.widths[column] ?? DEFAULT_WIDTH;
  const totalWidth = 40 + visible.reduce((sum, column) => sum + widthOf(column), 0);
  const columnIndex = useMemo(() => new Map(result.columns.map((column, index) => [column, index])), [result.columns]);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    if (typeof active.id === "number" && typeof over.id === "number") {
      setRowOrder((current) => arrayMove(current, current.indexOf(Number(active.id)), current.indexOf(Number(over.id))));
      return;
    }
    const from = visible.indexOf(String(active.id));
    const to = visible.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const reorderedVisible = arrayMove(visible, from, to);
    // Hidden columns keep their slot in the full order.
    let next = 0;
    setLayout((current) => ({
      ...current,
      order: order.map((column) => (current.hidden.includes(column) ? column : reorderedVisible[next++])),
    }));
  }

  function setWidth(column: string, width: number) {
    setLayout((current) => ({ ...current, widths: { ...current.widths, [column]: width } }));
  }

  function toggleColumn(column: string) {
    setLayout((current) => ({
      ...current,
      hidden: current.hidden.includes(column)
        ? current.hidden.filter((entry) => entry !== column)
        : [...current.hidden, column],
    }));
  }

  function captureTarget(event: React.MouseEvent) {
    const element = (event.target as HTMLElement).closest<HTMLElement>("[data-col]");
    if (!element) {
      setTarget(null);
      return;
    }
    const column = element.dataset.col!;
    const rowIndex = element.dataset.row;
    const value = rowIndex === undefined ? null : result.rows[Number(rowIndex)]?.[columnIndex.get(column) ?? -1];
    setTarget({ column, value, isHeader: rowIndex === undefined, rowIndex: Number(rowIndex) });
  }

  const filterBy = (operator: GuiFilterOperator, value: string | null) => {
    if (target) onAddFilter({ column: target.column, operator, value });
  };

  const cellText = target ? formatCell(target.value) : "";
  const isNull = target?.value === null || target?.value === undefined;
  const preview = cellText.length > 40 ? `${cellText.slice(0, 40)}…` : cellText;

  function exportPage() {
    const csv = [visible, ...rowOrder.map((index) => visible.map((column) => formatCell(result.rows[index][columnIndex.get(column) ?? -1])))];
    const content = csv.map((row) => row.map((value) => `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "table-page.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function pinnedStyle(column: string) {
    if (!layout.pinned.includes(column)) return {};
    const offset = visible.slice(0, visible.indexOf(column)).reduce((sum, name) => sum + widthOf(name), 40);
    return { position: "sticky" as const, left: offset, background: "var(--background)", zIndex: 1 };
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2 lg:px-6">
        <p className="text-xs text-muted-foreground">
          {result.rows.length.toLocaleString()} rows, {visible.length} of {order.length} columns
        </p>
        <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={exportPage}><Download data-icon="inline-start" />Export page</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Columns3 data-icon="inline-start" />Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
            <DropdownMenuGroup>
            {order.map((column) => (
              <DropdownMenuCheckboxItem
                key={column}
                checked={!layout.hidden.includes(column)}
                onCheckedChange={() => toggleColumn(column)}
                onSelect={(event) => event.preventDefault()}
              >
                {column}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setLayout(EMPTY_LAYOUT)}>Reset layout</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="min-h-0 flex-1 overflow-auto" onContextMenuCapture={captureTarget}>
            <DndContext
              sensors={sensors}
              collisionDetection={(args) => closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((container) => typeof container.id === typeof args.active.id) })}
              onDragEnd={handleDragEnd}
            >
              <table className="table-fixed border-collapse text-sm" style={{ width: totalWidth }}>
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr>
                    <th className="w-10" aria-label="Row order" />
                    <SortableContext items={visible} strategy={horizontalListSortingStrategy}>
                      {visible.map((column) => (
                        <HeaderCell
                          key={column}
                          column={column}
                          width={widthOf(column)}
                          sortDirection={sort?.column === column ? (sort.descending ? "desc" : "asc") : null}
                          onToggleSort={() =>
                            onSort(
                              sort?.column !== column
                                ? { column, descending: false }
                                : sort.descending
                                  ? null
                                  : { column, descending: true },
                            )
                          }
                          onResize={setWidth}
                          pinnedStyle={pinnedStyle(column)}
                        />
                      ))}
                    </SortableContext>
                  </tr>
                </thead>
                <SortableContext items={rowOrder} strategy={verticalListSortingStrategy}>
                <tbody>
                  {rowOrder.map((rowIndex) => (
                    <SortableRow key={rowIndex} id={rowIndex} onDoubleClick={() => onEditRow?.(result.rows[rowIndex])}>
                      {visible.map((column) => {
                        const value = result.rows[rowIndex][columnIndex.get(column) ?? -1];
                        return (
                          <td
                            key={column}
                            data-col={column}
                            data-row={rowIndex}
                            tabIndex={0}
                            title={formatCell(value)}
                            className="truncate px-3 py-1.5"
                            style={{ width: widthOf(column), ...pinnedStyle(column) }}
                          >
                            {value === null || value === undefined ? (
                              <span className="italic text-muted-foreground">NULL</span>
                            ) : (
                              formatCell(value)
                            )}
                          </td>
                        );
                      })}
                    </SortableRow>
                  ))}
                </tbody>
                </SortableContext>
              </table>
            </DndContext>
            {result.rows.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No rows match the current filters.</p>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-60">
          <ContextMenuGroup>
          {target && (
            <>
              <ContextMenuLabel className="truncate">{target.column}</ContextMenuLabel>
              {!target.isHeader && (
                <>
                  {isNull ? (
                    <>
                      <ContextMenuItem onSelect={() => filterBy("is_null", null)}>Show only NULL</ContextMenuItem>
                      <ContextMenuItem onSelect={() => filterBy("not_null", null)}>Hide NULL</ContextMenuItem>
                    </>
                  ) : (
                    <>
                      <ContextMenuItem onSelect={() => filterBy("eq", cellText)}>Only "{preview}"</ContextMenuItem>
                      <ContextMenuItem onSelect={() => filterBy("neq", cellText)}>Exclude "{preview}"</ContextMenuItem>
                      <ContextMenuItem onSelect={() => filterBy("contains", cellText)}>Contains "{preview}"</ContextMenuItem>
                      <ContextMenuItem onSelect={() => filterBy("starts_with", cellText)}>Starts with "{preview}"</ContextMenuItem>
                      <ContextMenuItem onSelect={() => filterBy("gte", cellText)}>Greater or equal to "{preview}"</ContextMenuItem>
                      <ContextMenuItem onSelect={() => filterBy("lte", cellText)}>Less or equal to "{preview}"</ContextMenuItem>
                      <ContextMenuItem onSelect={() => filterBy("not_null", null)}>Hide NULL</ContextMenuItem>
                    </>
                  )}
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => void navigator.clipboard.writeText(cellText)}>Copy value</ContextMenuItem>
                  <ContextMenuItem onSelect={() => void navigator.clipboard.writeText(result.rows[target.rowIndex].map(formatCell).join("\t"))}>Copy row</ContextMenuItem>
                  <ContextMenuItem disabled={!canNavigateServer("server_config")} onSelect={() => onNavigateServer("server_config", result.rows[target.rowIndex])}>Go to server config</ContextMenuItem>
                  <ContextMenuItem disabled={!canNavigateServer("server_errors")} onSelect={() => onNavigateServer("server_errors", result.rows[target.rowIndex])}>Go to server errors</ContextMenuItem>
                  {onEditRow && <ContextMenuItem onSelect={() => onEditRow(result.rows[target.rowIndex])}>Edit server</ContextMenuItem>}
                  <ContextMenuSeparator />
                </>
              )}
              <ContextMenuItem onSelect={() => onSort({ column: target.column, descending: false })}>Sort ascending</ContextMenuItem>
              <ContextMenuItem onSelect={() => onSort({ column: target.column, descending: true })}>Sort descending</ContextMenuItem>
              {sort && <ContextMenuItem onSelect={() => onSort(null)}>Clear sort</ContextMenuItem>}
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => toggleColumn(target.column)}>Hide column</ContextMenuItem>
              <ContextMenuItem onSelect={() => setLayout((current) => ({ ...current, pinned: current.pinned.includes(target.column) ? current.pinned.filter((column) => column !== target.column) : [...current.pinned, target.column] }))}>
                {layout.pinned.includes(target.column) ? "Unpin column" : "Pin column left"}
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => setWidth(target.column, Math.min(600, Math.max(100, ...result.rows.map((row) => formatCell(row[columnIndex.get(target.column) ?? -1]).length * 8 + 32))))}>Fit column to values</ContextMenuItem>
            </>
          )}
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

function SortableRow({ id, children, onDoubleClick }: { id: number; children: ReactNode; onDoubleClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <tr ref={setNodeRef} onDoubleClick={onDoubleClick} className={cn("border-b hover:bg-muted/50", isDragging && "bg-accent opacity-70")}
      style={{ transform: CSS.Translate.toString(transform && { ...transform, x: 0 }), transition }}>
      <td className="w-10 px-2"><button type="button" {...attributes} {...listeners} title="Move row (current page only)" aria-label={`Move row ${id + 1}`} className="touch-none cursor-grab"><GripVertical className="size-4" /></button></td>
      {children}
    </tr>
  );
}

type HeaderCellProps = {
  column: string;
  width: number;
  sortDirection: "asc" | "desc" | null;
  onToggleSort: () => void;
  onResize: (column: string, width: number) => void;
  pinnedStyle: React.CSSProperties;
};

function HeaderCell({ column, width, sortDirection, onToggleSort, onResize, pinnedStyle }: HeaderCellProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column });

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => onResize(column, Math.max(MIN_WIDTH, width + moveEvent.clientX - startX));
    const stop = () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", stop);
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", stop);
  }

  return (
    <th
      ref={setNodeRef}
      data-col={column}
      style={{ width, transform: CSS.Translate.toString(transform), transition, ...pinnedStyle }}
      className={cn("relative border-b px-3 py-2 text-left font-medium", isDragging && "z-20 bg-accent opacity-80")}
    >
      <div className="flex items-center gap-1">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground"
          aria-label={`Move column ${column}`}
        >
          <GripVertical className="size-3.5" />
        </span>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left" onClick={onToggleSort}>
          <span className="truncate">{column}</span>
          {sortDirection === "asc" && <ArrowUp className="size-3.5 shrink-0" />}
          {sortDirection === "desc" && <ArrowDown className="size-3.5 shrink-0" />}
        </button>
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize touch-none hover:bg-primary/40"
        onPointerDown={startResize}
      />
    </th>
  );
}
