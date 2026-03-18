import { createRoute } from "@tanstack/react-router";
import { WorkspaceView } from "../components/workspace/WorkspaceView.js";
import { Route as rootRoute } from "./__root.js";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: WorkspaceView,
});
