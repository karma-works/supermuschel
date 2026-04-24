import { createServer, type Server } from "node:net";
import { chmod, unlink } from "node:fs/promises";
import type { UIEvent } from "@supermuschel/shared";
import { UIEventSchema } from "@supermuschel/shared";

export class SocketServer {
  private servers: Map<string, Server> = new Map();

  constructor(private readonly onEvent: (event: UIEvent) => void) {}

  getSocketPath(workspaceId: string): string {
    return `/tmp/supermuschel-${workspaceId}.sock`;
  }

  async startForWorkspace(workspaceId: string): Promise<void> {
    if (this.servers.has(workspaceId)) return;

    const socketPath = this.getSocketPath(workspaceId);

    try { await unlink(socketPath); } catch {}

    const server = createServer((socket) => {
      let buffer = "";
      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = UIEventSchema.parse(JSON.parse(line));
            this.onEvent(event);
          } catch (err) {
            console.error("Socket: invalid event:", err);
          }
        }
      });
    });

    await new Promise<void>((resolve, reject) => {
      server.listen(socketPath, resolve);
      server.once("error", reject);
    });

    await chmod(socketPath, 0o600);
    this.servers.set(workspaceId, server);
  }

  async stopForWorkspace(workspaceId: string): Promise<void> {
    const server = this.servers.get(workspaceId);
    if (!server) return;
    server.close();
    this.servers.delete(workspaceId);
    try { await unlink(this.getSocketPath(workspaceId)); } catch {}
  }

  async start(): Promise<void> {
    // Per-workspace; nothing global to start
  }

  stop(): void {
    for (const [id] of this.servers) {
      void this.stopForWorkspace(id);
    }
  }
}
