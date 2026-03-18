import { createRoute } from "@tanstack/react-router";
import { SettingsView } from "../components/settings/SettingsView.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsView,
});
