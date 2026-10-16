import assert from "node:assert/strict";
import { test } from "node:test";
import { fixtureRows, queryRows } from "./table-preview.mjs";

const filter = (operator, value, column = "ServerName", second_value) => ({ column, operator, value, second_value });

test("exact filtering precedes paging", () => {
  const result = queryRows(fixtureRows, { page: 2, page_size: 25, filters: [filter("eq", "server-0")] });
  assert.equal(result.total_count, 41);
  assert.equal(result.rows.length, 16);
  assert.ok(result.rows.every((row) => row[1] === "server-0"));
});

test("exclusion preserves nulls", () => {
  const result = queryRows(fixtureRows, { filters: [filter("neq", "Production", "Environment")] });
  assert.equal(result.total_count, 102);
  assert.ok(result.rows.every((row) => row[2] === null));
});

test("all/any groups combine with search", () => {
  const filters = [filter("eq", "server-0"), filter("eq", "server-1")];
  assert.equal(queryRows(fixtureRows, { filters, match: "all" }).total_count, 0);
  assert.equal(queryRows(fixtureRows, { filters, match: "any" }).total_count, 82);
  assert.equal(queryRows(fixtureRows, { filters, match: "any", search: "production" }).total_count, 41);
});

test("range, sorting and paging compose", () => {
  const result = queryRows(fixtureRows, { filters: [filter("between", "10", "ID", "20")], sort: { column: "ID", descending: true }, page_size: 5 });
  assert.equal(result.total_count, 11);
  assert.deepEqual(result.rows.map((row) => row[0]), [20, 19, 18, 17, 16]);
});

for (const [operator, value, column, count] of [
  ["contains", "SERVER-0", "ServerName", 41], ["not_contains", "server-0", "ServerName", 162],
  ["starts_with", "server-", "ServerName", 203], ["ends_with", "-4", "ServerName", 40],
  ["contains", "%", "ServerName", 0], ["contains", "", "ServerName", 203],
  ["gt", "200", "ID", 3], ["gte", "200", "ID", 4], ["lt", "3", "ID", 2], ["lte", "3", "ID", 3],
  ["is_null", null, "Environment", 102], ["not_null", null, "Environment", 101],
  ["in", '["1","3"]', "ID", 2], ["not_in", '["1","3"]', "ID", 201],
]) {
  test(`${operator} ${JSON.stringify(value)}`, () => assert.equal(queryRows(fixtureRows, { filters: [filter(operator, value, column)] }).total_count, count));
}

test("invalid queries fail rather than silently ignoring conditions", () => {
  for (const query of [{ filters: [filter("eq", "1", "unknown")] }, { filters: [filter("unknown", "1")] },
    { filters: [filter("eq", "abc", "ID")] }, { page: 0 }, { page_size: 501 }, { match: "invalid" }]) assert.throws(() => queryRows(fixtureRows, query));
});