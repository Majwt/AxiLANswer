import { House, Puzzle, RotateCw } from "lucide-react";

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
import { canUseCustomerContext, pluginPagePath } from "@/features/plugins/manifest";

export function AppSidebar() {
  const { customerId, pluginId, pageId } = useParams();
  const location = useLocation();
  const { plugins, status, retry } = usePlugins();
  const { isMobile, setOpenMobile } = useSidebar();
  const showCustomerSelect = canUseCustomerContext(plugins, pluginId, pageId);

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        {showCustomerSelect && <SidebarCustomerSelect />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>AxiAnswer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/"}
                  className="data-[active=true]:bg-primary/12 data-[active=true]:text-primary"
                >
                  <NavLink to="/">
                    <House />
                    <span>Home</span>
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
                  const path = pluginPagePath(plugin.id, page.id, page.customerScope ? customerId : undefined);
                  const PageIcon = page.icon ?? Puzzle;
                  return (
                    <SidebarMenuItem key={page.id}>
                      <SidebarMenuButton asChild isActive={location.pathname === path}>
                        <NavLink to={path} title={page.title} onClick={() => { if (isMobile) setOpenMobile(false); }}>
                          <PageIcon />
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
