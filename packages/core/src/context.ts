import type Database from "better-sqlite3";
import type { AgentManager } from "@supermuschel/agent-api";
import type { SocketServer } from "./socket-server.js";

export interface Context {
  db: Database.Database;
  agentManager: AgentManager;
  socketServer: SocketServer | null;
  /** "electron" | "web" — changes which optional capabilities are available */
  platform: "electron" | "web";
  /** Set on web server: root directory users may browse. Null on Electron. */
  workdir: string | null;
  /** Directory containing the supermuschel CLI binary. */
  supermushelBinDir: string;
  /** Native folder picker (Electron only). Null on web → throws NOT_IMPLEMENTED. */
  dialogPicker: (() => Promise<string | null>) | null;
}
