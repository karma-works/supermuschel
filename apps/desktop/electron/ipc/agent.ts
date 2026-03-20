import { homedir } from "node:os";
import { observable } from "@trpc/server/observable";
import { z } from "zod";
import { AgentTypeSchema, SandboxLevelSchema } from "@supermuschel/shared";
import { SandboxManager } from "@supermuschel/sandbox";
import { CLAUDE_INSTALL_INSTRUCTIONS, OPENCODE_INSTALL_INSTRUCTIONS } from "@supermuschel/agent-api";
import path from "node:path";
import { app } from "electron";
import { t } from "./trpc.js";
import { AGENT_COMMAND_DEFAULTS } from "./settings.js";

/** Expand ~ and split a command string into tokens (respects double-quoted segments). */
function parseCommand(cmd: string, home: string): string[] {
  const expanded = cmd.replace(/(^|\s)~\//g, `$1${home}/`);
  const tokens: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of expanded) {
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === " " && !inQuote) { if (cur) { tokens.push(cur); cur = ""; } }
    else { cur += ch; }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

function getSupermushelBinDir(): string {
  return path.join(app.getPath("userData"), "bin");
}

export const agentRouter = t.router({
  detect: t.procedure
    .input(z.object({ type: AgentTypeSchema }))
    .query(async ({ ctx, input }) => {
      const binPath = await ctx.agentManager.detectAgent(input.type);
      return {
        installed: binPath !== null,
        path: binPath,
        instructions: binPath
          ? null
          : input.type === "claude"
            ? CLAUDE_INSTALL_INSTRUCTIONS
            : OPENCODE_INSTALL_INSTRUCTIONS,
      };
    }),

  start: t.procedure
    .input(
      z.object({
        workspaceId: z.string(),
        type: AgentTypeSchema,
        cwd: z.string(),
        sandboxLevel: SandboxLevelSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sandboxManager = new SandboxManager(input.cwd, homedir());

      // Pre-flight: verify sandbox level is actually available on this system.
      if (input.sandboxLevel > 0) {
        const diagnosis = await sandboxManager.diagnose(input.sandboxLevel);
        if (!diagnosis.available) {
          throw new Error(
            `Sandbox level ${input.sandboxLevel} (${diagnosis.name}) is not available: ${diagnosis.reason ?? "unknown reason"}. ` +
              "Open ⚙ Sandbox Settings to choose a supported level.",
          );
        }
      }

      // Look up a custom command override for this runtime + agent combination.
      let commandOverride: { cmd: string; args: string[] } | undefined;
      if (input.sandboxLevel === 2) {
        const runtime = sandboxManager.getContainerRuntime();
        if (runtime) {
          const key = `cmd_${runtime}_${input.type}`;
          const row = ctx.db
            .prepare("SELECT value FROM settings WHERE key = ?")
            .get(key) as { value: string } | undefined;
          const cmdStr = row?.value ?? AGENT_COMMAND_DEFAULTS[key] ?? "";
          if (cmdStr.trim()) {
            const parts = parseCommand(cmdStr, homedir());
            if (parts.length > 0) {
              commandOverride = { cmd: parts[0], args: parts.slice(1) };
            }
          }
        }
      }

      // Start per-workspace socket so the agent CLI can communicate back
      await ctx.socketServer?.startForWorkspace(input.workspaceId);

      const agent = await ctx.agentManager.start({
        workspaceId: input.workspaceId,
        type: input.type,
        cwd: input.cwd,
        sandboxLevel: input.sandboxLevel,
        sandboxManager,
        supermushelBinPath: getSupermushelBinDir(),
        commandOverride,
      });
      return { agentId: agent.id, pid: agent.pid, status: agent.status };
    }),

  stop: t.procedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = ctx.agentManager.getAgent(input.agentId);
      const workspaceId = agent?.workspaceId;
      ctx.agentManager.stop(input.agentId);
      if (workspaceId) {
        const remaining = ctx.agentManager.getAgentsForWorkspace(workspaceId);
        if (remaining.length === 0) {
          await ctx.socketServer?.stopForWorkspace(workspaceId);
        }
      }
      return { success: true };
    }),

  write: t.procedure
    .input(z.object({ agentId: z.string(), data: z.string() }))
    .mutation(async ({ ctx, input }) => {
      ctx.agentManager.write(input.agentId, input.data);
      return { success: true };
    }),

  resize: t.procedure
    .input(z.object({ agentId: z.string(), cols: z.number(), rows: z.number() }))
    .mutation(async ({ ctx, input }) => {
      ctx.agentManager.resize(input.agentId, input.cols, input.rows);
      return { success: true };
    }),

  output: t.procedure
    .input(z.object({ agentId: z.string() }))
    .subscription(({ ctx, input }) => {
      return observable<{ data: string }>((emit) => {
        const handler = ({ agentId, data }: { agentId: string; data: string }) => {
          if (agentId === input.agentId) {
            emit.next({ data });
          }
        };
        ctx.agentManager.on("data", handler);
        return () => {
          ctx.agentManager.off("data", handler);
        };
      });
    }),

  status: t.procedure
    .input(z.object({ workspaceId: z.string() }))
    .subscription(({ ctx, input }) => {
      return observable<{ agentId: string; status: string }>((emit) => {
        const onStart = ({ agentId, workspaceId }: { agentId: string; workspaceId: string }) => {
          if (workspaceId === input.workspaceId) emit.next({ agentId, status: "running" });
        };
        const onExit = ({
          agentId,
          workspaceId,
          exitCode,
        }: {
          agentId: string;
          workspaceId: string;
          exitCode: number;
        }) => {
          if (workspaceId === input.workspaceId)
            emit.next({ agentId, status: exitCode === 0 ? "stopped" : "crashed" });
        };
        ctx.agentManager.on("started", onStart);
        ctx.agentManager.on("exit", onExit);
        return () => {
          ctx.agentManager.off("started", onStart);
          ctx.agentManager.off("exit", onExit);
        };
      });
    }),
});
