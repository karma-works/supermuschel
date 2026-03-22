import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  projectPath: text("project_path").notNull(),
  agentType: text("agent_type", { enum: ["claude", "opencode"] }).notNull(),
  sandboxLevel: integer("sandbox_level").default(1),
  sandboxConfig: text("sandbox_config", { mode: "json" }).$type<Record<string, unknown>>(),
  statusBadges: text("status_badges", { mode: "json" }).$type<
    Record<string, { value: string; icon?: string }>
  >(),
  progress: real("progress"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export const sonderaInstall = sqliteTable("sondera_install", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  completedAt: integer("completed_at", { mode: "timestamp" }).notNull(),
  version: text("version").notNull(),
  ollamaEnabled: integer("ollama_enabled", { mode: "boolean" }).notNull().default(false),
});

export type SonderaInstallRow = typeof sonderaInstall.$inferSelect;
