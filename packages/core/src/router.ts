import { EventEmitter } from "node:events";
import { t } from "./trpc.js";
import { workspaceRouter } from "./routers/workspace.js";
import { sandboxRouter } from "./routers/sandbox.js";
import { agentRouter } from "./routers/agent.js";
import { agentUiRouter } from "./routers/agent-ui.js";
import { settingsRouter } from "./routers/settings.js";

export const uiEventEmitter = new EventEmitter();

export const appRouter = t.router({
  workspace: workspaceRouter,
  sandbox: sandboxRouter,
  agent: agentRouter,
  agentUi: agentUiRouter(uiEventEmitter),
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
