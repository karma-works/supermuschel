import { app, BrowserWindow, Notification } from "electron";
import path from "node:path";
import { createIPCHandler } from "electron-trpc/main";
import { appRouter, uiEventEmitter } from "./ipc/router.js";
import { createContext } from "./ipc/context.js";
import { SocketServer } from "./socket/server.js";
import { AgentManager } from "@supermuschel/agent-api";

let mainWindow: BrowserWindow | null = null;

export const agentManager = new AgentManager();
export let socketServer: SocketServer | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: "#0e1117",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  createIPCHandler({
    router: appRouter,
    windows: [mainWindow],
    createContext,
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  // Start socket server for CLI
  socketServer = new SocketServer((event) => {
    uiEventEmitter.emit("ui-event", event);

    // Handle notifications directly
    if (event.type === "notify" && Notification.isSupported()) {
      new Notification({ title: event.title, body: event.body }).show();
    }
  });
  await socketServer.start();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  agentManager.stopAll();
  socketServer?.stop();
  if (process.platform !== "darwin") app.quit();
});
