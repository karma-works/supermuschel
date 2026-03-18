#!/usr/bin/env node
import { createConnection } from "node:net";
import type { UIEvent } from "@supermuschel/shared";

const workspaceId = process.env.SUPERMUSCHEL_WORKSPACE_ID;
const socketPath = process.env.SUPERMUSCHEL_SOCKET;

if (!workspaceId || !socketPath) {
  console.error("supermuschel: not running inside a supermuschel agent session");
  process.exit(1);
}

function sendEvent(event: UIEvent): void {
  const client = createConnection(socketPath!, () => {
    client.write(JSON.stringify(event) + "\n");
    client.end();
  });

  client.on("error", (err) => {
    console.error("supermuschel: socket error:", err.message);
    process.exit(1);
  });
}

const [, , command, ...rest] = process.argv;

switch (command) {
  case "set-status": {
    const [key, value, ...flags] = rest;
    if (!key || !value) {
      console.error("Usage: supermuschel set-status <key> <value> [--icon <name>]");
      process.exit(1);
    }
    const iconIdx = flags.indexOf("--icon");
    const icon = iconIdx >= 0 ? flags[iconIdx + 1] : undefined;
    sendEvent({ type: "set-status", workspaceId, key, value, icon });
    break;
  }

  case "set-progress": {
    const [rawProgress] = rest;
    const progress = parseFloat(rawProgress ?? "");
    if (isNaN(progress) || progress < 0 || progress > 1) {
      console.error("Usage: supermuschel set-progress <0.0-1.0>");
      process.exit(1);
    }
    sendEvent({ type: "set-progress", workspaceId, progress });
    break;
  }

  case "notify": {
    const titleIdx = rest.indexOf("--title");
    const bodyIdx = rest.indexOf("--body");
    const title = titleIdx >= 0 ? rest[titleIdx + 1] : undefined;
    const body = bodyIdx >= 0 ? rest[bodyIdx + 1] : undefined;
    if (!title || !body) {
      console.error("Usage: supermuschel notify --title <title> --body <body>");
      process.exit(1);
    }
    sendEvent({ type: "notify", workspaceId, title, body });
    break;
  }

  case "trigger-flash": {
    sendEvent({ type: "trigger-flash", workspaceId });
    break;
  }

  default: {
    console.error(`supermuschel: unknown command '${command}'`);
    console.error("Commands: set-status, set-progress, notify, trigger-flash");
    process.exit(1);
  }
}
