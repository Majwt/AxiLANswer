import AppShellLayout from "@/app/layouts/app-shell-layout";
import { adminChildRoutes, protectedChildRoutes } from "@/app/router/feature-routes";
import { AdminRoute, ProtectedRoute } from "@/app/router/guards";
import { PluginPage } from "@/features/plugins/plugin-page";
import { PluginProvider } from "@/features/plugins/plugin-provider";
import LoginPage from "@/pages/login/login-page";
import { Route, Routes } from "react-router";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <PluginProvider>
              <AppShellLayout />
            </PluginProvider>
          </ProtectedRoute>
        }
      >
        <Route path="plugins/:pluginId/:pageId" element={<PluginPage />} />
        <Route
          path="customer/:customerId/plugins/:pluginId/:pageId"
          element={<AdminRoute><PluginPage /></AdminRoute>}
        />
        {protectedChildRoutes.map((route) => (
          <Route
            key={route.key}
            index={route.index}
            path={route.path}
            element={route.element}
          />
        ))}

        {adminChildRoutes.map((route) => (
          <Route
            key={route.key}
            path={route.path}
            element={<AdminRoute>{route.element}</AdminRoute>}
          />
        ))}
      </Route>
    </Routes>
  );
}
