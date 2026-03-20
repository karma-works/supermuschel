import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../electron/ipc/router.js";
import { electronLink } from "./electron-link.js";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [electronLink()],
});
