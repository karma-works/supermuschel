import { ipcMain } from "electron";
import type { BrowserWindow } from "electron";
import type { AnyRouter } from "@trpc/server";
import { t } from "./trpc.js";

export const REQUEST_CHANNEL = "sm-trpc-req";
export const EVENT_CHANNEL = "sm-trpc-evt";

type Unsubscribe = () => void;

export function createIPCHandler<TRouter extends AnyRouter>({
  router,
  windows: _windows,
  createContext,
}: {
  router: TRouter;
  windows: BrowserWindow[];
  createContext: () => Promise<Record<string, unknown>>;
}) {
  const createCaller = t.createCallerFactory(router);
  const subscriptions = new Map<string, Unsubscribe>();

  ipcMain.handle(REQUEST_CHANNEL, async (event, message: any) => {
    const { id, type, path, input } = message as {
      id: string;
      type: "query" | "mutation" | "subscription" | "subscription.stop";
      path: string;
      input: unknown;
    };

    if (type === "subscription.stop") {
      subscriptions.get(id)?.();
      subscriptions.delete(id);
      return null;
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);

    // Navigate nested path: "agent.start" → caller.agent.start
    const parts = path.split(".");
    // biome-ignore lint/suspicious/noExplicitAny: dynamic traversal
    let fn: any = caller;
    for (const part of parts) fn = fn[part];

    if (type === "subscription") {
      try {
        const obs = await fn(input);
        const sender = event.sender;

        const sub = obs.subscribe({
          next(data: unknown) {
            if (!sender.isDestroyed()) {
              sender.send(EVENT_CHANNEL, { id, result: { type: "data", data } });
            }
          },
          error(err: unknown) {
            if (!sender.isDestroyed()) {
              const msg = err instanceof Error ? err.message : String(err);
              const code = (err as any)?.code ?? "INTERNAL_SERVER_ERROR";
              sender.send(EVENT_CHANNEL, { id, error: { message: msg, code } });
            }
          },
          complete() {
            if (!sender.isDestroyed()) {
              sender.send(EVENT_CHANNEL, { id, result: { type: "stopped" } });
            }
          },
        });

        subscriptions.set(id, () => sub.unsubscribe());
        return null; // ack — data comes via EVENT_CHANNEL
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { id, error: { message: msg, code: (err as any)?.code ?? "INTERNAL_SERVER_ERROR" } };
      }
    }

    try {
      const result = await fn(input);
      return { id, result: { type: "data", data: result } };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { id, error: { message: msg, code: (err as any)?.code ?? "INTERNAL_SERVER_ERROR" } };
    }
  });
}
