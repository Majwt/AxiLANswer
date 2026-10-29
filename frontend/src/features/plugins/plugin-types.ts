import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export type PluginRole = "Admin" | "Customer";

export type PluginPageProps = {
  customerId: number | null;
  role: PluginRole;
};

export type PluginPageDefinition = {
  id: string;
  title: string;
  component: ComponentType<PluginPageProps>;
  icon?: LucideIcon;
  customerScope?: boolean;
  roles?: PluginRole[];
};

export type PluginDefinition = {
  id: string;
  name: string;
  pages: PluginPageDefinition[];
};

export type InstalledPlugin = PluginDefinition & { enabled: boolean };