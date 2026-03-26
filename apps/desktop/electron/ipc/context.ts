import path from "node:path";
import { app, dialog, BrowserWindow } from "electron";
import type { Context } from "@supermuschel/core";
import { agentManager, socketServer } from "../index.js";

async function dialogPicker(): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow();
  const opts = { properties: ["openDirectory"] as const };
  const result = win
    ? await dialog.showOpenDialog(win, opts)
    : await dialog.showOpenDialog(opts);
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

export async function createContext(): Promise<Context> {
  return {
    db: (await import("../db/client.js")).sqlite,
    agentManager,
    socketServer,
    platform: "electron",
    workdir: null,
    supermushelBinDir: path.join(app.getPath("userData"), "bin"),
    dialogPicker,
  };
}

export type { Context };
