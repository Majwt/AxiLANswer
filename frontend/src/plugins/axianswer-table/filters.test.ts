import { describe, expect, it } from "vitest";
import { describeFilter, formatCell, sameFilter } from "./filters";

describe("dynamic table filter state", () => {
  it("distinguishes a null cell from an empty string", () => {
    expect(sameFilter({ column: "name", operator: "is_null", value: null }, { column: "name", operator: "eq", value: "" })).toBe(false);
  });

  it("preserves range endpoints when comparing filters", () => {
    const filter = { column: "count", operator: "between" as const, value: "1", second_value: "10" };
    expect(sameFilter(filter, { ...filter })).toBe(true);
    expect(sameFilter(filter, { ...filter, second_value: "20" })).toBe(false);
    expect(describeFilter(filter)).toContain('to "10"');
  });

  it("keeps zero and false usable as exact-match cell filters", () => {
    expect(formatCell(0)).toBe("0");
    expect(formatCell(false)).toBe("false");
    expect(formatCell("")).toBe("");
  });
});