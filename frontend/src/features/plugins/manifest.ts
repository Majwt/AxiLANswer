import { z } from "zod";
import type { PluginPageDefinition, PluginRole } from "./plugin-types";

const identifier = z.string().regex(/^[a-z][a-z0-9-]*$/).max(64);

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  enabledPluginIds: z.array(identifier).default([]),
}).superRefine((manifest, context) => {
  if (new Set(manifest.enabledPluginIds).size !== manifest.enabledPluginIds.length) {
    context.addIssue({ code: "custom", message: "Enabled plugin IDs must be unique." });
  }
});

export type PluginManifest = z.infer<typeof manifestSchema>;
export type { PluginPageDefinition } from "./plugin-types";

export function parsePluginManifest(value: unknown): PluginManifest {
  return manifestSchema.parse(value);
}

export function canAccessPluginPage(page: PluginPageDefinition, role: string | null | undefined) {
  return (role === "Admin" || role === "Customer") &&
    (!page.roles || page.roles.includes(role as PluginRole));
}

export function pluginPagePath(pluginId: string, pageId: string, customerId?: string) {
  const path = `/plugins/${pluginId}/${pageId}`;
  return customerId ? `/customer/${encodeURIComponent(customerId)}${path}` : path;
}