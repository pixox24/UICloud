import Database from "better-sqlite3";
import { DB_PATH, ensureRuntimeDirs } from "@/lib/runtime-paths";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    ensureRuntimeDirs();
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }

  return db;
}
