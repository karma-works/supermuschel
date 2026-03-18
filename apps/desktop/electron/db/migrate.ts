import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";

// Run migrations against a local dev DB
const dbPath = path.join(process.cwd(), "dev.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });
console.log("Migrations applied");
sqlite.close();
