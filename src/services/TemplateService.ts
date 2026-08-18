import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { AspectRatio, GenerationMode } from "@/types/ai-studio";

export interface SavedTemplate {
  id: string;
  title: string;
  category: string;
  prompt: string;
  sampleImage: string;
  sampleOriginalImage?: string;
  defaultMode: GenerationMode;
  aspectRatio: AspectRatio;
  tags: string[];
  createdAt: string;
  createdBy: number;
}

export interface CreateTemplateInput {
  title: string;
  category?: string;
  prompt: string;
  sampleImage?: string;
  sampleOriginalImage?: string;
  defaultMode?: GenerationMode;
  aspectRatio?: AspectRatio;
  tags?: string[];
}

let initialized = false;

function ensureTable() {
  if (initialized) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '我的模板',
      prompt TEXT NOT NULL,
      sample_image TEXT,
      sample_original_image TEXT,
      default_mode TEXT NOT NULL DEFAULT 'text-to-image',
      aspect_ratio TEXT NOT NULL DEFAULT '1:1',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER
    )
  `);
  initialized = true;
}

export class TemplateService {
  static init() {
    ensureTable();
  }

  static list(search?: string) {
    ensureTable();
    const db = getDb();
    const rows = search
      ? db
          .prepare(
            `SELECT * FROM templates
             WHERE title LIKE ? OR prompt LIKE ? OR tags LIKE ?
             ORDER BY created_at DESC`
          )
          .all(`%${search}%`, `%${search}%`, `%${search}%`)
      : db.prepare(`SELECT * FROM templates ORDER BY created_at DESC`).all();

    return rows.map(mapRow);
  }

  static getById(id: string) {
    ensureTable();
    const db = getDb();
    const row = db.prepare(`SELECT * FROM templates WHERE id = ?`).get(id);
    return row ? mapRow(row) : null;
  }

  static create(input: CreateTemplateInput, userId: number) {
    ensureTable();
    const db = getDb();
    const id = randomUUID();
    const tags = Array.isArray(input.tags) ? input.tags : [];

    db.prepare(
      `INSERT INTO templates
       (id, title, category, prompt, sample_image, sample_original_image, default_mode, aspect_ratio, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.title,
      input.category || "我的模板",
      input.prompt,
      input.sampleImage || null,
      input.sampleOriginalImage || null,
      input.defaultMode || "text-to-image",
      input.aspectRatio || "1:1",
      JSON.stringify(tags),
      userId
    );

    return this.getById(id);
  }

  static delete(id: string) {
    ensureTable();
    const db = getDb();
    db.prepare(`DELETE FROM templates WHERE id = ?`).run(id);
  }
}

function mapRow(row: any): SavedTemplate {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags);
  } catch {
    tags = [];
  }

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    prompt: row.prompt,
    sampleImage: row.sample_image || "",
    sampleOriginalImage: row.sample_original_image || undefined,
    defaultMode: row.default_mode,
    aspectRatio: row.aspect_ratio,
    tags,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}
