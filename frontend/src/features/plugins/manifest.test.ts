import { describe, expect, it } from "vitest";
import { canAccessPluginPage, parsePluginManifest, pluginPagePath } from "./manifest";

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

  it("builds global and customer-scoped routes", () => {
    expect(pluginPagePath("inventory", "overview")).toBe("/plugins/inventory/overview");
    expect(pluginPagePath("inventory", "overview", "42")).toBe("/customer/42/plugins/inventory/overview");
  });
});