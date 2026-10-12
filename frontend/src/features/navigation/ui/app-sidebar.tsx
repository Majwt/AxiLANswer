import { LayoutDashboard, Network, Puzzle, RotateCw } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink, useLocation, useParams } from "react-router";
import SidebarCustomerSelect from "./sidebar-customer-select";
import { NavUser } from "@/components/nav-user";
import { usePlugins } from "@/features/plugins/plugin-context";
import { pluginPagePath } from "@/features/plugins/manifest";

export function AppSidebar() {
  const { customerId } = useParams();
  const location = useLocation();
  const { plugins, status, retry } = usePlugins();
  const { isMobile, setOpenMobile } = useSidebar();
  const dashboardPath = customerId ? `/customer/${customerId}/dashboard` : "/dashboard";
  const graphPath = customerId ? `/customer/${customerId}/graph` : "/graph";

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <SidebarCustomerSelect />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>AxiLANswer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/" || location.pathname === dashboardPath}
                  className="data-[active=true]:bg-primary/12 data-[active=true]:text-primary"
                >
                  <NavLink to={dashboardPath}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === graphPath}
                  className="data-[active=true]:bg-primary/12 data-[active=true]:text-primary"
                >
                  <NavLink to={graphPath}>
                    <Network />
                    <span>Graph</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {status === "error" && (
          <SidebarGroup>
            <SidebarGroupLabel>Plugins unavailable</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={retry}><RotateCw /><span>Retry</span></SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {plugins.map((plugin) => (
          <SidebarGroup key={plugin.id}>
            <SidebarGroupLabel title={plugin.name}><span className="truncate">{plugin.name}</span></SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {plugin.pages.map((page) => {
                  const path = pluginPagePath(plugin.id, page.id, customerId);
                  return (
                    <SidebarMenuItem key={page.id}>
                      <SidebarMenuButton asChild isActive={location.pathname === path}>
                        <NavLink to={path} title={page.title} onClick={() => { if (isMobile) setOpenMobile(false); }}>
                          <Puzzle />
                          <span>{page.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        <SidebarGroup className="">
          <SidebarGroupLabel>Other</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/settings"}
                  className="data-[active=true]:bg-primary/12 data-[active=true]:text-primary"
                >
                  <NavLink to="/settings">
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
