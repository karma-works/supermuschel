import { z } from "zod";
import { t } from "../trpc.js";

export const AGENT_COMMAND_DEFAULTS: Record<string, string> = {
  cmd_yolobox_claude: "yolobox claude",
  cmd_yolobox_opencode:
    "yolobox opencode" +
    " --copy-agent-instructions" +
    " --mount ~/.config/opencode/opencode-yolo.json:/home/yolo/.config/opencode/opencode.json:ro" +
    " --mount ~/.local/share/opencode/auth.json:/home/yolo/.local/share/opencode/auth.json:ro" +
    " --mount ~/.config/opencode/plugins:/home/yolo/.config/opencode/plugins:ro" +
    " --mount ~/.config/opencode/skills:/home/yolo/.config/opencode/skills:ro" +
    " --mount ~/.claude/tasks:/home/yolo/.claude/tasks" +
    " --mount ~/.config/opencode/tasks:/home/yolo/.config/opencode/tasks",
  cmd_podman_claude: "",
  cmd_podman_opencode: "",
  cmd_docker_claude: "",
  cmd_docker_opencode: "",
};

export const ALL_COMMAND_KEYS = Object.keys(AGENT_COMMAND_DEFAULTS);

export const settingsRouter = t.router({
  getCommands: t.procedure.query(({ ctx }) => {
    const rows = ctx.db
      .prepare("SELECT key, value FROM settings WHERE key LIKE 'cmd_%'")
      .all() as { key: string; value: string }[];
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return Object.fromEntries(
      ALL_COMMAND_KEYS.map((k) => [k, stored[k] ?? AGENT_COMMAND_DEFAULTS[k]]),
    ) as Record<string, string>;
  }),

  setCommand: t.procedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db
        .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .run(input.key, input.value);
      return { success: true };
    }),

  resetCommand: t.procedure
    .input(z.object({ key: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db.prepare("DELETE FROM settings WHERE key = ?").run(input.key);
      return { success: true };
    }),
});
