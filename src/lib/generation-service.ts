import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { generateWithProvider, type ProviderConfig } from "@/lib/ai-provider";
import { GENERATED_DIR, ensureRuntimeDirs } from "@/lib/runtime-paths";
import type { GenerationMode, HistoryItem } from "@/types/ai-studio";

export type GenerationJobStatus =
  | "queued"
  | "generating"
  | "succeeded"
  | "failed"
  | "content_rejected"
  | "interrupted"
  | "cancelled";

type StoredGenerationJobStatus = Exclude<GenerationJobStatus, "content_rejected">;

export interface CreateGenerationJobInput {
  id?: string;
  userId: number;
  prompt: string;
  negativePrompt?: string;
  mode: GenerationMode;
  model: string;
  aspectRatio: string;
  resolution: string;
  referenceImage?: string | null;
}

export interface GenerationJobRecord {
  id: string;
  userId: number;
  prompt: string;
  negativePrompt?: string;
  mode: GenerationMode;
  model: string;
  aspectRatio: string;
  resolution: string;
  status: GenerationJobStatus;
  errorMessage?: string;
  resultImageUrl?: string;
  originalImageUrl?: string;
  timestamp: number;
  durationMs: number;
  seed?: number;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

type DbJob = {
  id: string;
  user_id: number;
  prompt: string;
  negative_prompt: string | null;
  mode: GenerationMode;
  model: string;
  aspect_ratio: string;
  resolution: string;
  status: StoredGenerationJobStatus;
  error_message: string | null;
  error_code: string | null;
  reference_path: string | null;
  reference_mime: string | null;
  result_path: string | null;
  result_mime: string | null;
  started_at: number | null;
  finished_at: number | null;
  heartbeat_at: number | null;
  created_at: number;
  updated_at: number;
  is_favorite: number;
};

const MAX_REFERENCE_BYTES = 50 * 1024 * 1024;
const MAX_RESULT_BYTES = 100 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const REMOTE_REFERENCE_HOSTS = new Set(["images.unsplash.com"]);

declare global {
  // eslint-disable-next-line no-var
  var generationWorkerState:
    | { initialized: boolean; running: boolean }
    | undefined;
}

function workerState() {
  if (!globalThis.generationWorkerState) {
    globalThis.generationWorkerState = { initialized: false, running: false };
  }
  return globalThis.generationWorkerState;
}

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS generation_jobs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      negative_prompt TEXT,
      mode TEXT NOT NULL,
      model TEXT NOT NULL,
      aspect_ratio TEXT NOT NULL,
      resolution TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('queued','generating','succeeded','failed','interrupted','cancelled')),
      error_message TEXT,
      error_code TEXT,
      reference_path TEXT,
      reference_mime TEXT,
      result_path TEXT,
      result_mime TEXT,
      started_at INTEGER,
      finished_at INTEGER,
      heartbeat_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_created
      ON generation_jobs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_generation_jobs_status
      ON generation_jobs(status, updated_at);
  `);
  const columns = db.prepare("PRAGMA table_info(generation_jobs)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "reference_mime")) {
    db.exec("ALTER TABLE generation_jobs ADD COLUMN reference_mime TEXT");
  }
  if (!columns.some((column) => column.name === "error_code")) {
    db.exec("ALTER TABLE generation_jobs ADD COLUMN error_code TEXT");
  }
  return db;
}

function safeJobId(id: string) {
  return /^[a-zA-Z0-9_-]{1,80}$/.test(id);
}

function extensionForMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "png";
}

function parseDataUrl(value: string, maxBytes: number) {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  if (!IMAGE_MIME_TYPES.has(mime)) throw new Error("仅支持 PNG、JPG、WEBP 或 GIF 图片");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > maxBytes) {
    throw new Error("图片文件超过大小限制");
  }
  return { mime, buffer };
}

function readStoredGeneratedImage(value: string, userId: number, maxBytes: number) {
  let url: URL;
  try {
    url = new URL(value, "http://localhost");
  } catch {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 5 || segments[0] !== "api" || segments[1] !== "generated") return null;

  const [requestedUserId, jobId, fileName] = segments.slice(2);
  if (requestedUserId !== String(userId) || !safeJobId(jobId) || !/^[a-zA-Z0-9_-]+\.(?:gif|jpe?g|png|webp)$/i.test(fileName)) {
    throw new Error("无权使用该生成图片作为参考图");
  }

  const row = ensureTable()
    .prepare(
      `SELECT reference_path, reference_mime, result_path, result_mime
       FROM generation_jobs WHERE id = ? AND user_id = ?`
    )
    .get(jobId, userId) as Pick<DbJob, "reference_path" | "reference_mime" | "result_path" | "result_mime"> | undefined;
  if (!row) throw new Error("参考图片任务不存在");

  const candidates = [
    { relativePath: row.reference_path, mime: row.reference_mime },
    { relativePath: row.result_path, mime: row.result_mime },
  ];
  const matched = candidates.find((candidate) => candidate.relativePath && path.posix.basename(candidate.relativePath) === fileName);
  if (!matched?.relativePath) throw new Error("参考图片文件不存在");

  const root = path.resolve(GENERATED_DIR, String(userId), jobId);
  const absolutePath = path.resolve(process.cwd(), matched.relativePath);
  if (!absolutePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolutePath)) {
    throw new Error("参考图片文件不存在");
  }
  const buffer = fs.readFileSync(absolutePath);
  if (!buffer.length || buffer.length > maxBytes) throw new Error("图片文件超过大小限制");
  return { mime: matched.mime || "image/png", buffer };
}

async function readImage(value: string, maxBytes: number, userId?: number) {
  const dataUrl = parseDataUrl(value, maxBytes);
  if (dataUrl) return dataUrl;

  if (userId !== undefined) {
    const stored = readStoredGeneratedImage(value, userId, maxBytes);
    if (stored) return stored;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("参考图片地址无效");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("参考图片仅支持 HTTPS 地址或本地上传图片");
  }
  if (userId !== undefined && !REMOTE_REFERENCE_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("外部参考图仅支持已验证的示例来源，请先下载或上传图片");
  }

  let response: Response;
  try {
    response = await fetch(value, { signal: AbortSignal.timeout(60_000) });
  } catch {
    throw new Error("无法下载参考图片");
  }
  if (!response.ok) throw new Error("无法下载参考图片");

  const mime = (response.headers.get("content-type") || "image/png").split(";")[0].toLowerCase();
  if (!IMAGE_MIME_TYPES.has(mime)) throw new Error("参考地址未返回图片文件");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > maxBytes) throw new Error("图片文件超过大小限制");
  return { mime, buffer };
}

function jobDirectory(userId: number, jobId: string) {
  return path.join(GENERATED_DIR, String(userId), jobId);
}

function writeImageFile(userId: number, jobId: string, name: "reference" | "result", mime: string, buffer: Buffer) {
  ensureRuntimeDirs();
  const directory = jobDirectory(userId, jobId);
  fs.mkdirSync(directory, { recursive: true });
  const fileName = `${name}.${extensionForMime(mime)}`;
  const absolutePath = path.join(directory, fileName);
  const tempPath = `${absolutePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, buffer, { flag: "wx" });
  fs.renameSync(tempPath, absolutePath);
  return {
    absolutePath,
    relativePath: path.posix.join("uploads", "generated", String(userId), jobId, fileName),
    mime,
  };
}

function imageUrl(userId: number, jobId: string, relativePath: string) {
  const fileName = path.posix.basename(relativePath);
  return `/api/generated/${userId}/${jobId}/${encodeURIComponent(fileName)}`;
}

function publicJobStatus(row: DbJob): GenerationJobStatus {
  return row.status === "failed" && row.error_code === "content_policy" ? "content_rejected" : row.status;
}

function isContentPolicyError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return /content[\s_-]?(policy|filter|moderation)|safety|内容(?:审核|安全|政策)|审核(?:未通过|拦截)|违规/.test(message);
}

function mapJob(row: DbJob): GenerationJobRecord {
  const item: GenerationJobRecord = {
    id: row.id,
    userId: row.user_id,
    prompt: row.prompt,
    negativePrompt: row.negative_prompt || undefined,
    mode: row.mode,
    model: row.model,
    aspectRatio: row.aspect_ratio,
    resolution: row.resolution,
    status: publicJobStatus(row),
    errorMessage: row.error_message || undefined,
    timestamp: row.finished_at || row.created_at,
    durationMs: row.started_at && row.finished_at ? Math.max(0, row.finished_at - row.started_at) : 0,
    isFavorite: Boolean(row.is_favorite),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.result_path) item.resultImageUrl = imageUrl(row.user_id, row.id, row.result_path);
  if (row.reference_path) item.originalImageUrl = imageUrl(row.user_id, row.id, row.reference_path);
  return item;
}

export function toHistoryItem(job: GenerationJobRecord): HistoryItem | null {
  if (job.status !== "succeeded" || !job.resultImageUrl) return null;
  return {
    id: job.id,
    prompt: job.prompt,
    negativePrompt: job.negativePrompt,
    mode: job.mode,
    model: job.model,
    aspectRatio: job.aspectRatio as HistoryItem["aspectRatio"],
    resolution: job.resolution as HistoryItem["resolution"],
    outputFormat: "PNG",
    originalImageUrl: job.originalImageUrl,
    resultImageUrl: job.resultImageUrl,
    timestamp: job.timestamp,
    durationMs: job.durationMs,
    seed: job.seed,
    isFavorite: job.isFavorite,
  };
}

export async function createGenerationJob(input: CreateGenerationJobInput) {
  const db = ensureTable();
  const id = input.id || `gen-${randomUUID()}`;
  if (!safeJobId(id)) throw new Error("任务 ID 格式无效");
  const existing = db.prepare("SELECT id FROM generation_jobs WHERE id = ?").get(id);
  if (existing) throw new Error("任务 ID 已存在");

  const now = Date.now();
  let referencePath: string | null = null;
  let referenceMime: string | null = null;
  if (input.referenceImage && input.mode !== "text-to-image") {
    const reference = await readImage(input.referenceImage, MAX_REFERENCE_BYTES, input.userId);
    const referenceFile = writeImageFile(input.userId, id, "reference", reference.mime, reference.buffer);
    referencePath = referenceFile.relativePath;
    referenceMime = referenceFile.mime;
  }

  db.prepare(
    `INSERT INTO generation_jobs
     (id, user_id, prompt, negative_prompt, mode, model, aspect_ratio, resolution, status,
      reference_path, reference_mime, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?)`
  ).run(
    id,
    input.userId,
    input.prompt,
    input.negativePrompt || null,
    input.mode,
    input.model,
    input.aspectRatio,
    input.resolution,
    referencePath,
    referenceMime,
    now,
    now
  );

  return getGenerationJob(id, input.userId)!;
}

export function getGenerationJob(id: string, userId: number) {
  const db = ensureTable();
  const row = db.prepare("SELECT * FROM generation_jobs WHERE id = ? AND user_id = ?").get(id, userId) as DbJob | undefined;
  return row ? mapJob(row) : null;
}

export function listGenerationHistory(userId: number, limit = 100) {
  const db = ensureTable();
  const rows = db
    .prepare(
      `SELECT * FROM generation_jobs
       WHERE user_id = ? AND status = 'succeeded'
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, Math.min(Math.max(limit, 1), 200)) as DbJob[];
  return rows.map(mapJob);
}

export function listActiveGenerationJobs(userId: number, limit = 20) {
  const db = ensureTable();
  const rows = db
    .prepare(
      `SELECT * FROM generation_jobs
       WHERE user_id = ? AND status IN ('queued', 'generating')
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, Math.min(Math.max(limit, 1), 50)) as DbJob[];
  return rows.map(mapJob);
}

export function deleteGenerationJob(id: string, userId: number) {
  const db = ensureTable();
  const row = db.prepare("SELECT * FROM generation_jobs WHERE id = ? AND user_id = ?").get(id, userId) as DbJob | undefined;
  if (!row) return false;
  db.prepare("DELETE FROM generation_jobs WHERE id = ? AND user_id = ?").run(id, userId);
  const directory = jobDirectory(userId, id);
  if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  return true;
}

export function clearGenerationHistory(userId: number) {
  const db = ensureTable();
  const clearSucceeded = db.transaction(() => {
    const rows = db
      .prepare("SELECT id FROM generation_jobs WHERE user_id = ? AND status = 'succeeded'")
      .all(userId) as Array<{ id: string }>;
    db.prepare("DELETE FROM generation_jobs WHERE user_id = ? AND status = 'succeeded'").run(userId);
    return rows;
  });
  const rows = clearSucceeded();
  for (const row of rows) {
    const directory = jobDirectory(userId, row.id);
    if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  }
}

export function toggleGenerationFavorite(id: string, userId: number) {
  const db = ensureTable();
  const row = db.prepare("SELECT is_favorite FROM generation_jobs WHERE id = ? AND user_id = ?").get(id, userId) as { is_favorite: number } | undefined;
  if (!row) return null;
  const next = row.is_favorite ? 0 : 1;
  db.prepare("UPDATE generation_jobs SET is_favorite = ?, updated_at = ? WHERE id = ? AND user_id = ?").run(next, Date.now(), id, userId);
  return Boolean(next);
}

export function cancelGenerationJob(id: string, userId: number) {
  const db = ensureTable();
  const result = db
    .prepare(
      `UPDATE generation_jobs SET status = 'cancelled', error_message = '用户已取消', updated_at = ?
       WHERE id = ? AND user_id = ? AND status IN ('queued','generating')`
    )
    .run(Date.now(), id, userId);
  return result.changes > 0;
}

function recoverInterruptedJobs() {
  const db = ensureTable();
  db.prepare(
    `UPDATE generation_jobs
     SET status = 'interrupted', error_message = '服务重启或连接中断，未自动重复生成', updated_at = ?
     WHERE status = 'generating'`
  ).run(Date.now());
}

function claimNextJob() {
  const db = ensureTable();
  const row = db
    .prepare("SELECT * FROM generation_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1")
    .get() as DbJob | undefined;
  if (!row) return null;
  const now = Date.now();
  const claimed = db
    .prepare(
      `UPDATE generation_jobs
       SET status = 'generating', started_at = ?, heartbeat_at = ?, updated_at = ?, error_message = NULL
       WHERE id = ? AND status = 'queued'`
    )
    .run(now, now, now, row.id);
  return claimed.changes ? { ...row, status: "generating" as const, started_at: now, heartbeat_at: now } : null;
}

function localReferenceDataUrl(relativePath: string, mime: string) {
  const absolutePath = path.join(process.cwd(), relativePath);
  return `data:${mime};base64,${fs.readFileSync(absolutePath).toString("base64")}`;
}

async function processJob(job: DbJob, provider: ProviderConfig) {
  const db = ensureTable();
  const heartbeat = setInterval(() => {
    db.prepare("UPDATE generation_jobs SET heartbeat_at = ?, updated_at = ? WHERE id = ? AND status = 'generating'").run(Date.now(), Date.now(), job.id);
  }, 30_000);
  heartbeat.unref?.();

  try {
    const current = getGenerationJob(job.id, job.user_id);
    if (!current || current.status === "cancelled") return;
    const referenceImage = job.reference_path
      ? localReferenceDataUrl(job.reference_path, job.reference_mime || "image/png")
      : null;
    const result = await generateWithProvider(provider, {
      prompt: job.prompt,
      negativePrompt: job.negative_prompt || undefined,
      aspectRatio: job.aspect_ratio,
      resolution: job.resolution,
      referenceImage,
    });

    const after = getGenerationJob(job.id, job.user_id);
    if (!after || after.status === "cancelled") return;
    const stored = await readImage(result.imageUrl, MAX_RESULT_BYTES);
    const resultFile = writeImageFile(job.user_id, job.id, "result", stored.mime, stored.buffer);
    const now = Date.now();
    db.prepare(
      `UPDATE generation_jobs
      SET status = 'succeeded', result_path = ?, result_mime = ?, finished_at = ?, heartbeat_at = ?, updated_at = ?, error_message = NULL, error_code = NULL
       WHERE id = ? AND status = 'generating'`
    ).run(resultFile.relativePath, resultFile.mime, now, now, now, job.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "图像生成失败";
    const errorCode = isContentPolicyError(error) ? "content_policy" : "provider_error";
    db.prepare(
      `UPDATE generation_jobs SET status = 'failed', error_message = ?, error_code = ?, finished_at = ?, updated_at = ?
       WHERE id = ? AND status = 'generating'`
    ).run(message, errorCode, Date.now(), Date.now(), job.id);
  } finally {
    clearInterval(heartbeat);
  }
}

async function drain(provider: ProviderConfig) {
  const state = workerState();
  if (state.running) return;
  state.running = true;
  try {
    while (true) {
      const job = claimNextJob();
      if (!job) break;
      await processJob(job, provider);
    }
  } finally {
    state.running = false;
  }
}

export function initializeGenerationWorker() {
  const state = workerState();
  if (!state.initialized) {
    recoverInterruptedJobs();
    state.initialized = true;
  }
}

export function startGenerationWorker(provider: ProviderConfig) {
  initializeGenerationWorker();
  void drain(provider);
}
