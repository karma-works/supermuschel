import { EventEmitter } from "node:events";
import { t } from "./trpc.js";
import { workspaceRouter } from "./workspace.js";
import { sandboxRouter } from "./sandbox.js";
import { agentRouter } from "./agent.js";
import { agentUiRouter } from "./agent-ui.js";
import { settingsRouter } from "./settings.js";

export const uiEventEmitter = new EventEmitter();

export const appRouter = t.router({
  workspace: workspaceRouter,
  sandbox: sandboxRouter,
  agent: agentRouter,
  agentUi: agentUiRouter(uiEventEmitter),
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
