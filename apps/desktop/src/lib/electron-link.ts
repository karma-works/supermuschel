import { observable } from "@trpc/server/observable";
import type { TRPCLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";

declare global {
  interface Window {
    trpcBridge: {
      request: (msg: unknown) => Promise<unknown>;
      onEvent: (cb: (event: unknown) => void) => () => void;
    };
  }
}

type IPCEvent = {
  id: string;
  result?: { type: "data" | "stopped"; data?: unknown };
  error?: { message: string; code: string };
};

// Single global listener multiplexed by operation id
const handlers = new Map<string, (event: IPCEvent) => void>();
let globalUnsub: (() => void) | null = null;

function ensureGlobalListener() {
  if (globalUnsub) return;
  globalUnsub = window.trpcBridge.onEvent((raw) => {
    const event = raw as IPCEvent;
    handlers.get(event.id)?.(event);
  });
}

export function electronLink<TRouter extends AnyRouter>(): TRPCLink<TRouter> {
  return () =>
    ({ op }) =>
      observable((observer) => {
        ensureGlobalListener();

        const id = String(op.id);
        const { type, path, input } = op;

        if (type === "subscription") {
          handlers.set(id, (event) => {
            if (event.error) {
              observer.error(new Error(event.error.message));
            } else if (event.result?.type === "stopped") {
              handlers.delete(id);
              observer.complete();
            } else if (event.result?.type === "data") {
              observer.next({ result: { type: "data", data: event.result.data } } as any);
            }
          });

          window.trpcBridge.request({ id, type: "subscription", path, input });

          return () => {
            handlers.delete(id);
            window.trpcBridge.request({ id, type: "subscription.stop", path, input });
          };
        }

        // query / mutation
        window.trpcBridge
          .request({ id, type, path, input })
          .then((raw) => {
            const resp = raw as { id: string; result?: { type: string; data: unknown }; error?: { message: string; code: string } } | null;
            if (!resp) return;
            if (resp.error) {
              observer.error(Object.assign(new Error(resp.error.message), { data: { code: resp.error.code } }));
            } else {
              observer.next({ result: resp.result } as any);
              observer.complete();
            }
          })
          .catch((err: unknown) => observer.error(err));
      });
}
