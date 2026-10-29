import { describe, expect, it } from "vitest";
import {
  applyModuleAvailability,
  canAccessPluginPage,
  canUseCustomerContext,
  parsePluginManifest,
  pluginPagePath,
} from "./manifest";

const page = { id: "overview", title: "Overview", component: () => null };

describe("plugin configuration and routes", () => {
  it("accepts an empty configuration and defaults enabled plugins to none", () => {
    expect(parsePluginManifest({ schemaVersion: 1 }).enabledPluginIds).toEqual([]);
  });

  it("validates the schema version, unique enabled IDs, and plugin identifiers", () => {
    expect(() => parsePluginManifest({ schemaVersion: 2, enabledPluginIds: [] })).toThrow();
    expect(() => parsePluginManifest({ schemaVersion: 1, enabledPluginIds: ["inventory", "inventory"] })).toThrow();
    expect(() => parsePluginManifest({ schemaVersion: 1, enabledPluginIds: ["../settings"] })).toThrow();
  });

  it("filters roles for both navigation and direct page access", () => {
    expect(canAccessPluginPage(page, "Customer")).toBe(true);
    expect(canAccessPluginPage({ ...page, roles: ["Admin"] }, "Customer")).toBe(false);
    expect(canAccessPluginPage({ ...page, roles: ["Admin"] }, "Admin")).toBe(true);
    expect(canAccessPluginPage(page, null)).toBe(false);
  });

  it("shows customer context only when Network is enabled and the active page supports scope", () => {
    const network = [{ id: "network", name: "Network", enabled: true, pages: [{ ...page, customerScope: true }] }];
    const tables = [{ id: "tables", name: "Tables", enabled: true, pages: [page] }];

    expect(canUseCustomerContext(tables, undefined, undefined)).toBe(false);
    expect(canUseCustomerContext(network, "network", "overview")).toBe(true);
    expect(canUseCustomerContext([...network, ...tables], "tables", "overview")).toBe(false);
  });

  it("hides Network when the server reports the module disabled", () => {
    expect(applyModuleAvailability(["network", "axianswer-table"], false)).toEqual(["axianswer-table"]);
    expect(applyModuleAvailability(["network", "axianswer-table"], true)).toEqual(["network", "axianswer-table"]);
  });

  it("builds global and customer-scoped routes", () => {
    expect(pluginPagePath("inventory", "overview")).toBe("/plugins/inventory/overview");
    expect(pluginPagePath("inventory", "overview", "42")).toBe("/customer/42/plugins/inventory/overview");
  });

  it("registers the Network pages", async () => {
    const pluginModule = await import("@/plugins/network/plugin");
    expect(pluginModule.default.id).toBe("network");
    expect(pluginModule.default.pages.map((page) => page.id)).toEqual(["overview", "graph"]);
    expect(pluginModule.default.pages.every((page) => page.customerScope)).toBe(true);
  });
});