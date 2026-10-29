import { describe, expect, it } from "vitest";
import { networkLegacyLocation } from "./legacy-routes";

describe("legacy Network routes", () => {
  it("preserves global query and hash state", () => {
    expect(networkLegacyLocation("graph", undefined, "?q=host-a", "#node-1")).toEqual({
      pathname: "/plugins/network/graph",
      search: "?q=host-a",
      hash: "#node-1",
    });
  });

  it("preserves customer scope, query, and hash state", () => {
    expect(networkLegacyLocation("overview", "42", "?range=7d", "#events")).toEqual({
      pathname: "/customer/42/plugins/network/overview",
      search: "?range=7d",
      hash: "#events",
    });
  });

  it("rejects invalid customer scopes", () => {
    expect(networkLegacyLocation("graph", "not-a-customer", "", "")).toBeNull();
  });
});