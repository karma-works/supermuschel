import { createWSClient, wsLink, splitLink, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@supermuschel/core";
import type { TRPCLink } from "@trpc/client";

export function webLink(): TRPCLink<AppRouter> {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsClient = createWSClient({ url: `${protocol}//${window.location.host}/trpc` });

  // biome-ignore lint/suspicious/noExplicitAny: tRPC v11 transformer generics require cast
  return splitLink({
    condition: (op) => op.type === "subscription",
    true: wsLink({ client: wsClient }) as any,
    false: httpBatchLink({ url: "/trpc" }) as any,
  }) as TRPCLink<AppRouter>;
}
