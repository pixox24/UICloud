import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DB_PATH, ensureRuntimeDirs } from "@/lib/runtime-paths";
import { detectFileType, detectMimeType } from "@/lib/thumbnail";

type ColumnDefinition = {
  name: string;
  sql: string;
};

const assetColumns: ColumnDefinition[] = [
  { name: "file_hash", sql: "file_hash TEXT" },
  { name: "mime_type", sql: "mime_type TEXT" },
  { name: "file_type", sql: "file_type TEXT DEFAULT 'other'" },
  { name: "thumbnail_original", sql: "thumbnail_original TEXT DEFAULT ''" },
  { name: "thumbnail_large", sql: "thumbnail_large TEXT DEFAULT ''" },
  { name: "thumbnail_medium", sql: "thumbnail_medium TEXT DEFAULT ''" },
  { name: "thumbnail_small", sql: "thumbnail_small TEXT DEFAULT ''" },
  { name: "aspect_ratio", sql: "aspect_ratio TEXT DEFAULT 'custom'" },
  { name: "orientation", sql: "orientation TEXT DEFAULT 'landscape'" },
  { name: "width_px", sql: "width_px INTEGER" },
  { name: "height_px", sql: "height_px INTEGER" },
  { name: "color_theme", sql: "color_theme TEXT" },
  { name: "primary_color", sql: "primary_color TEXT" },
  { name: "use_scenario", sql: "use_scenario TEXT DEFAULT '[]'" },
  { name: "version", sql: "version INTEGER DEFAULT 1" },
  { name: "parent_id", sql: "parent_id INTEGER REFERENCES assets(id)" },
  { name: "view_count", sql: "view_count INTEGER DEFAULT 0" },
];

export function initializeDatabase() {
  ensureRuntimeDirs();

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      file_path TEXT NOT NULL,
      file_hash TEXT,
      mime_type TEXT,
      file_type TEXT DEFAULT 'other',
      thumbnail_path TEXT DEFAULT '',
      thumbnail_original TEXT DEFAULT '',
      thumbnail_large TEXT DEFAULT '',
      thumbnail_medium TEXT DEFAULT '',
      thumbnail_small TEXT DEFAULT '',
      file_size INTEGER DEFAULT 0,
      file_format TEXT DEFAULT '',
      aspect_ratio TEXT DEFAULT 'custom',
      orientation TEXT DEFAULT 'landscape',
      width_px INTEGER,
      height_px INTEGER,
      color_theme TEXT,
      primary_color TEXT,
      use_scenario TEXT DEFAULT '[]',
      version INTEGER DEFAULT 1,
      parent_id INTEGER REFERENCES assets(id),
      download_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS asset_tags (
      asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
      tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (asset_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS asset_favorites (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, asset_id)
    );
  `);

  ensureAssetColumns(db);
  ensureAssetIndexes(db);
  backfillAssetCompatibility(db);
  seedUsers(db);
  seedCategories(db);

  db.close();

  return DB_PATH;
}

function ensureAssetColumns(db: Database.Database) {
  const tableInfo = db.prepare("PRAGMA table_info(assets)").all() as Array<{ name: string }>;
  const existingColumns: Record<string, boolean> = {};

  for (let index = 0; index < tableInfo.length; index += 1) {
    existingColumns[tableInfo[index].name] = true;
  }

  for (let index = 0; index < assetColumns.length; index += 1) {
    if (!existingColumns[assetColumns[index].name]) {
      db.prepare(`ALTER TABLE assets ADD COLUMN ${assetColumns[index].sql}`).run();
    }
  }
}

function ensureAssetIndexes(db: Database.Database) {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_assets_file_hash ON assets(file_hash);
    CREATE INDEX IF NOT EXISTS idx_assets_file_type ON assets(file_type);
    CREATE INDEX IF NOT EXISTS idx_assets_parent_id ON assets(parent_id);
  `);
}

function backfillAssetCompatibility(db: Database.Database) {
  db.prepare(
    `UPDATE assets
     SET thumbnail_original = CASE
       WHEN (thumbnail_original IS NULL OR thumbnail_original = '') AND thumbnail_path IS NOT NULL AND thumbnail_path != ''
       THEN thumbnail_path ELSE thumbnail_original END,
         thumbnail_medium = CASE
       WHEN (thumbnail_medium IS NULL OR thumbnail_medium = '') AND thumbnail_path IS NOT NULL AND thumbnail_path != ''
       THEN thumbnail_path ELSE thumbnail_medium END`
  ).run();

  const assets = db
    .prepare(
      `SELECT id, file_path, file_format, mime_type, file_type, use_scenario, version, view_count
       FROM assets`
    )
    .all() as Array<{
      id: number;
      file_path: string;
      file_format: string;
      mime_type: string | null;
      file_type: string | null;
      use_scenario: string | null;
      version: number | null;
      view_count: number | null;
    }>;

  const updateAsset = db.prepare(
    `UPDATE assets
     SET mime_type = ?,
         file_type = ?,
         use_scenario = ?,
         version = ?,
         view_count = ?
     WHERE id = ?`
  );

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const extension =
      path.extname(asset.file_path || "").replace(".", "").toLowerCase() ||
      (asset.file_format || "").toLowerCase();

    updateAsset.run(
      asset.mime_type || detectMimeType(extension),
      asset.file_type || detectFileType(extension),
      asset.use_scenario || "[]",
      asset.version || 1,
      asset.view_count || 0,
      asset.id
    );
  }
}

function seedUsers(db: Database.Database) {
  const adminHash = bcrypt.hashSync("admin123", 10);
  const demoHash = bcrypt.hashSync("demo123", 10);
  const insertUser = db.prepare(
    "INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)"
  );

  insertUser.run("admin", adminHash, "admin");
  insertUser.run("demo", demoHash, "user");
}

function seedCategories(db: Database.Database) {
  const categories = [
    { name: "图标组件", sortOrder: 1 },
    { name: "Banner 模板", sortOrder: 2 },
    { name: "落地页模板", sortOrder: 3 },
    { name: "品牌资产", sortOrder: 4 },
  ];
  const existsStatement = db.prepare("SELECT id FROM categories WHERE name = ?");
  const insertCategory = db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)");

  for (let index = 0; index < categories.length; index += 1) {
    if (!existsStatement.get(categories[index].name)) {
      insertCategory.run(categories[index].name, categories[index].sortOrder);
    }
  }
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const dbPath = initializeDatabase();
  if (!fs.existsSync(dbPath)) {
    throw new Error("Database initialization failed.");
  }
  console.log(`Database initialized successfully: ${dbPath}`);
}
