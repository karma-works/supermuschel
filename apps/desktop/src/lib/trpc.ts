import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@supermuschel/core";
import { electronLink } from "./electron-link.js";
import { webLink } from "./web-link.js";

export const trpc = createTRPCReact<AppRouter>();

function createLink() {
  if (typeof window !== "undefined" && "trpcBridge" in window) {
    return electronLink();
  }
  return webLink();
}

export const trpcClient = trpc.createClient({
  links: [createLink()],
});
