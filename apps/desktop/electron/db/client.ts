import Database from "better-sqlite3";
import { app } from "electron";
import path from "node:path";

const dbPath = path.join(app.getPath("userData"), "supermuschel.db");
export const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// ─── Schema migrations ────────────────────────────────────────────────────────
// Add columns introduced after initial release — safe to run on every startup.
const addColumnIfMissing = (table: string, column: string, definition: string) => {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.find((c) => c.name === column)) {
    sqlite.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
};

// Run AFTER the CREATE TABLE IF NOT EXISTS block so the table exists first.
// This is a no-op on fresh installs where the column is already in the DDL.
const runMigrations = () => {
  addColumnIfMissing("sondera_install", "model", "TEXT DEFAULT NULL");
};

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    project_path TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    sandbox_level INTEGER DEFAULT 1,
    sandbox_config TEXT,
    status_badges TEXT,
    progress REAL,
    created_at INTEGER,
    updated_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sondera_install (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    completed_at INTEGER NOT NULL,
    version TEXT NOT NULL,
    ollama_enabled INTEGER NOT NULL DEFAULT 0,
    model TEXT DEFAULT NULL
  );
`);

runMigrations();
