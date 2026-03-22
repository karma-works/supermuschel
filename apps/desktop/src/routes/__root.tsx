import { useEffect } from "react";
import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AppShell } from "../components/layout/AppShell.js";

declare global {
  interface Window {
    electronNav?: {
      onNavigate: (cb: (path: string) => void) => () => void;
    };
  }
}

function RootComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    const cleanup = window.electronNav?.onNavigate((path) => {
      void navigate({ to: path as "/" | "/settings" });
    });
    return cleanup;
  }, [navigate]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
