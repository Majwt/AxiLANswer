import type { GuiFilterOperator, GuiTableFilter } from "@/api/gui-table-api";

export const FILTER_OPERATORS: { value: GuiFilterOperator; label: string; needsValue: boolean }[] = [
  { value: "between", label: "between (inclusive)", needsValue: true },
  { value: "in", label: "in value list", needsValue: true },
  { value: "not_in", label: "not in value list", needsValue: true },
  { value: "eq", label: "equals", needsValue: true },
  { value: "neq", label: "does not equal", needsValue: true },
  { value: "contains", label: "contains", needsValue: true },
  { value: "not_contains", label: "does not contain", needsValue: true },
  { value: "starts_with", label: "starts with", needsValue: true },
  { value: "ends_with", label: "ends with", needsValue: true },
  { value: "gt", label: "greater than", needsValue: true },
  { value: "gte", label: "greater or equal", needsValue: true },
  { value: "lt", label: "less than", needsValue: true },
  { value: "lte", label: "less or equal", needsValue: true },
  { value: "is_null", label: "is empty (NULL)", needsValue: false },
  { value: "not_null", label: "is not empty", needsValue: false },
];

export function operatorLabel(operator: GuiFilterOperator): string {
  return FILTER_OPERATORS.find((entry) => entry.value === operator)?.label ?? operator;
}

export function describeFilter(filter: GuiTableFilter): string {
  const base = `${filter.column} ${operatorLabel(filter.operator)}`;
  return filter.value === null ? base : `${base} "${filter.value}"${filter.second_value === undefined ? "" : ` to "${filter.second_value}"`}`;
}

export function sameFilter(a: GuiTableFilter, b: GuiTableFilter): boolean {
  return a.column === b.column && a.operator === b.operator && a.value === b.value && a.second_value === b.second_value;
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
