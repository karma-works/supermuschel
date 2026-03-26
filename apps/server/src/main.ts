import http from "node:http";
import path from "node:path";
import { homedir } from "node:os";
import { readFileSync, statSync, mkdirSync } from "node:fs";
import { parseArgs } from "node:util";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { AgentManager } from "@supermuschel/agent-api";
import {
  createDb,
  appRouter,
  SocketServer,
  uiEventEmitter,
  type Context,
} from "@supermuschel/core";

// ─── CLI args ─────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    workdir: { type: "string" },
    port: { type: "string", default: "3000" },
    dbpath: { type: "string" },
    "static-dir": { type: "string" },
  },
  allowPositionals: false,
});

const workdir = path.resolve(values.workdir ?? process.cwd());
const port = Number.parseInt(values.port ?? "3000", 10);
const dbDir = path.join(homedir(), ".supermuschel");
mkdirSync(dbDir, { recursive: true });
const dbPath = values.dbpath ?? path.join(dbDir, "server.db");
const staticDir =
  values["static-dir"] ??
  path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../desktop/out/web-renderer");
const supermushelBinDir = path.join(homedir(), ".supermuschel", "bin");

// ─── Core services ─────────────────────────────────────────────────────────────

const db = createDb(dbPath);
const agentManager = new AgentManager();
const socketServer = new SocketServer((event) => {
  uiEventEmitter.emit("ui-event", event);

  if (event.type === "set-status") {
    try {
      const row = db
        .prepare("SELECT status_badges FROM workspaces WHERE id = ?")
        .get(event.workspaceId) as { status_badges: string | null } | undefined;
      const badges: Record<string, { value: string; icon?: string }> = row?.status_badges
        ? JSON.parse(row.status_badges)
        : {};
      badges[event.key] = { value: event.value, ...(event.icon ? { icon: event.icon } : {}) };
      db.prepare("UPDATE workspaces SET status_badges = ?, updated_at = ? WHERE id = ?").run(
        JSON.stringify(badges),
        Date.now(),
        event.workspaceId,
      );
    } catch {}
  } else if (event.type === "set-progress") {
    try {
      db.prepare("UPDATE workspaces SET progress = ?, updated_at = ? WHERE id = ?").run(
        event.progress,
        Date.now(),
        event.workspaceId,
      );
    } catch {}
  }
});

async function createContext(): Promise<Context> {
  return {
    db,
    agentManager,
    socketServer,
    platform: "web",
    workdir,
    supermushelBinDir,
    dialogPicker: null,
  };
}

// ─── Static file server ────────────────────────────────────────────────────────

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
};

function serveStatic(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
): void {
  let filePath = path.join(staticDir, pathname === "/" ? "index.html" : pathname);
  try {
    if (statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    filePath = path.join(staticDir, "index.html"); // SPA fallback
  }
  try {
    const ext = path.extname(filePath);
    const content = readFileSync(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}

// ─── tRPC HTTP handler ─────────────────────────────────────────────────────────

const trpcHandler = createHTTPHandler({ router: appRouter, createContext });

// ─── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-trpc-source");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost`);

  if (url.pathname.startsWith("/trpc")) {
    // Strip /trpc prefix so the handler sees just the procedure path
    req.url = req.url!.slice("/trpc".length) || "/";
    return trpcHandler(req, res);
  }

  serveStatic(req, res, url.pathname);
});

// ─── WebSocket server (tRPC subscriptions) ────────────────────────────────────

const wss = new WebSocketServer({ server });
applyWSSHandler({ wss, router: appRouter, createContext });

// ─── Lifecycle ────────────────────────────────────────────────────────────────

agentManager.on(
  "exit",
  ({ workspaceId }: { agentId: string; workspaceId: string; exitCode: number }) => {
    const remaining = agentManager.getAgentsForWorkspace(workspaceId);
    if (remaining.length === 0) {
      void socketServer.stopForWorkspace(workspaceId);
    }
  },
);

process.on("SIGINT", () => {
  agentManager.stopAll();
  socketServer.stop();
  process.exit(0);
});

server.listen(port, () => {
  console.log(`[supermuschel] server  http://localhost:${port}`);
  console.log(`[supermuschel] workdir ${workdir}`);
  console.log(`[supermuschel] db      ${dbPath}`);
  console.log(`[supermuschel] static  ${staticDir}`);
});
