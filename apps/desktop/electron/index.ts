import { app, BrowserWindow, Menu, Notification, ipcMain, shell, type MenuItemConstructorOptions } from "electron";
import { autoUpdater } from "electron-updater";
import { sqlite } from "./db/client.js";
import path from "node:path";
import { copyFile, chmod, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createIPCHandler } from "./ipc/handler.js";
import { appRouter, uiEventEmitter } from "./ipc/router.js";
import { createContext } from "./ipc/context.js";
import { SocketServer } from "@supermuschel/core";
import { AgentManager } from "@supermuschel/agent-api";

// Set name early so it appears correctly in native dialogs and menus
app.setName("Supermuschel");

let mainWindow: BrowserWindow | null = null;

export const agentManager = new AgentManager();
export let socketServer: SocketServer | null = null;

// ─── CLI bootstrap ────────────────────────────────────────────────────────────

async function bootstrapCLI(): Promise<void> {
  const binDir = path.join(app.getPath("userData"), "bin");
  await mkdir(binDir, { recursive: true });

  const dest = path.join(binDir, "supermuschel");

  // In production, binaries land in process.resourcesPath/bin/
  // In dev, look relative to the project root (built separately with `bun run build` in cli package)
  // process.resourcesPath is an Electron main-process property (not in Node.js typings)
  const resourcesPath = (process as NodeJS.Process & { resourcesPath: string }).resourcesPath;
  const srcProd = path.join(resourcesPath, "bin", "supermuschel");
  const srcDev = path.resolve(__dirname, "../../../../tools/supermuschel-cli/dist/supermuschel");

  const src = app.isPackaged ? srcProd : srcDev;

  if (!existsSync(src)) {
    console.warn("[supermuschel] CLI binary not found at", src, "— skipping bootstrap");
    return;
  }

  await copyFile(src, dest);
  await chmod(dest, 0o755);
}

// ─── Menu bar ─────────────────────────────────────────────────────────────────

function setupMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: "Supermuschel",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          label: "Settings…",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            mainWindow?.webContents.send("navigate", "/settings");
          },
        },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: "Supermuschel",
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: "#0e1117",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // electron-trpc only allows one handler per channel; remove stale one before re-registering
  // (happens on macOS when the window is recreated after being closed without quitting)
  ipcMain.removeHandler("sm-trpc-req");
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

// ─── IPC helpers ──────────────────────────────────────────────────────────────

ipcMain.handle("shell:openExternal", (_event, url: string) => shell.openExternal(url));

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  socketServer = new SocketServer((event) => {
    uiEventEmitter.emit("ui-event", event);

    // Persist set-status and set-progress to the workspace row
    if (event.type === "set-status") {
      try {
        const row = sqlite.prepare("SELECT status_badges FROM workspaces WHERE id = ?")
          .get(event.workspaceId) as { status_badges: string | null } | undefined;
        const badges: Record<string, { value: string; icon?: string }> = row?.status_badges
          ? JSON.parse(row.status_badges)
          : {};
        badges[event.key] = { value: event.value, ...(event.icon ? { icon: event.icon } : {}) };
        sqlite.prepare("UPDATE workspaces SET status_badges = ?, updated_at = ? WHERE id = ?")
          .run(JSON.stringify(badges), Date.now(), event.workspaceId);
      } catch (err) {
        console.error("[supermuschel] failed to persist set-status:", err);
      }
    } else if (event.type === "set-progress") {
      try {
        sqlite.prepare("UPDATE workspaces SET progress = ?, updated_at = ? WHERE id = ?")
          .run(event.progress, Date.now(), event.workspaceId);
      } catch (err) {
        console.error("[supermuschel] failed to persist set-progress:", err);
      }
    }

    // Handle notifications directly
    if (event.type === "notify" && Notification.isSupported()) {
      new Notification({ title: event.title, body: event.body }).show();
    }
  });
  await socketServer.start();

  // Stop per-workspace socket when the last agent for that workspace exits naturally
  agentManager.on("exit", ({ workspaceId }: { agentId: string; workspaceId: string; exitCode: number }) => {
    const remaining = agentManager.getAgentsForWorkspace(workspaceId);
    if (remaining.length === 0) {
      void socketServer?.stopForWorkspace(workspaceId);
    }
  });

  setupMenu();
  await bootstrapCLI();
  createWindow();

  // Check for updates in production (silently — only notifies if an update is available)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error("[updater]", err);
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  agentManager.stopAll();
  socketServer?.stop();
  if (process.platform !== "darwin") app.quit();
});
