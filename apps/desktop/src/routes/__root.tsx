import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "../components/layout/AppShell.js";

export const Route = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
