import type { EventEmitter } from "node:events";
import { observable } from "@trpc/server/observable";
import { z } from "zod";
import type { UIEvent } from "@supermuschel/shared";
import { t } from "../trpc.js";

export function agentUiRouter(eventEmitter: EventEmitter) {
  return t.router({
    events: t.procedure
      .input(z.object({ workspaceId: z.string() }))
      .subscription(({ input }) => {
        return observable<UIEvent>((emit) => {
          const handler = (event: UIEvent) => {
            if (event.workspaceId === input.workspaceId) {
              emit.next(event);
            }
          };
          eventEmitter.on("ui-event", handler);
          return () => {
            eventEmitter.off("ui-event", handler);
          };
        });
      }),
  });
}
