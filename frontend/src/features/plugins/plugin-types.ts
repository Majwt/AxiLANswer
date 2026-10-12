import type { ComponentType } from "react";

export type PluginRole = "Admin" | "Customer";

export type PluginPageProps = {
  customerId: number | null;
  role: PluginRole;
};

export type PluginPageDefinition = {
  id: string;
  title: string;
  component: ComponentType<PluginPageProps>;
  roles?: PluginRole[];
};

export type PluginDefinition = {
  id: string;
  name: string;
  pages: PluginPageDefinition[];
};

export type InstalledPlugin = PluginDefinition & { enabled: boolean };