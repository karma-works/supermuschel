import Database from "better-sqlite3";
import { app } from "electron";
import path from "node:path";

const dbPath = path.join(app.getPath("userData"), "supermuschel.db");
export const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");


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
  CREATE TABLE IF NOT EXISTS sandbox_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('write', 'blocked')),
    path TEXT NOT NULL,
    ts INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sandbox_events_agent ON sandbox_events(agent_id, ts);
`);
