import { db } from "../db/client.js";
import { agentManager, socketServer } from "../main.js";

export async function createContext() {
  return {
    db,
    agentManager,
    socketServer,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
