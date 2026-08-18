import { getDb } from "@/lib/db";

const PROVIDER_CONFIG_KEY = "ai_provider_config";
const DEFAULT_MODEL = "gpt-image-2";
const REQUEST_TIMEOUT_MS = 300_000;

export interface ProviderConfig {
  base_url: string;
  api_key: string;
  model: string;
  enabled: boolean;
}

export function getProviderConfig(): ProviderConfig | null {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(PROVIDER_CONFIG_KEY) as { value: string } | undefined;

    if (!row?.value) return null;

    const parsed = JSON.parse(row.value) as Partial<ProviderConfig>;
    if (!parsed.base_url && !parsed.api_key) return null;

    return {
      base_url: parsed.base_url || "",
      api_key: parsed.api_key || "",
      model: parsed.model || DEFAULT_MODEL,
      enabled: Boolean(parsed.enabled),
    };
  } catch {
    return null;
  }
}

export function saveProviderConfig(config: ProviderConfig) {
  const db = getDb();
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(PROVIDER_CONFIG_KEY, JSON.stringify(config));
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

const DEFAULT_RATIOS: Record<string, [number, number]> = {
  "1:1": [1, 1],
  "9:16": [9, 16],
  "16:9": [16, 9],
  "3:4": [3, 4],
  "4:3": [4, 3],
  "3:2": [3, 2],
  "2:3": [2, 3],
  "5:4": [5, 4],
  "4:5": [4, 5],
  "21:9": [21, 9],
  "1:4": [1, 4],
  "4:1": [4, 1],
  "1:8": [1, 8],
  "8:1": [8, 1],
};

export function buildImageSize(resolution = "1K", aspectRatio = "1:1"): string {
  const base =
    { "512px": 512, "1K": 1024, "2K": 2048, "4K": 2048 }[resolution] || 1024;
  const ratio = DEFAULT_RATIOS[aspectRatio] || [1, 1];
  const [rw, rh] = ratio;

  let w: number;
  let h: number;
  if (rw === rh) {
    w = base;
    h = base;
  } else if (rw > rh) {
    w = base;
    h = Math.max(256, Math.round(((base * rh) / rw) / 16) * 16);
  } else {
    h = base;
    w = Math.max(256, Math.round(((base * rw) / rh) / 16) * 16);
  }

  return `${w}x${h}`;
}

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function resolveEndpoints(baseUrl: string, suffix: string): string[] {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const candidates: string[] = [];

  // 优先按用户填写的方式拼接
  candidates.push(`${base}${suffix}`);

  // 同时兼容带 /v1 与不带 /v1 两种前缀
  if (base.endsWith("/v1")) {
    candidates.push(`${base.replace(/\/v1$/, "")}${suffix}`);
  } else {
    candidates.push(`${base}/v1${suffix}`);
  }

  return candidates;
}

function extractErrorMessage(data: unknown): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.error === "string") return d.error;
    if (d.error && typeof d.error === "object") {
      const e = d.error as Record<string, unknown>;
      if (typeof e.message === "string") return e.message;
    }
    if (typeof d.message === "string") return d.message;
  }
  return "";
}

async function withTimeout<T>(task: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function postJson(url: string, apiKey: string, body: unknown): Promise<unknown> {
  return withTimeout(
    async (signal) => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        // ignore non-JSON responses
      }

      if (!res.ok) {
        throw new ApiError(res.status, extractErrorMessage(data) || `请求失败 (HTTP ${res.status})`);
      }

      return data;
    },
    REQUEST_TIMEOUT_MS
  );
}

async function postForm(url: string, apiKey: string, form: FormData): Promise<unknown> {
  return withTimeout(
    async (signal) => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
        signal,
      });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        // ignore non-JSON responses
      }

      if (!res.ok) {
        throw new ApiError(res.status, extractErrorMessage(data) || `请求失败 (HTTP ${res.status})`);
      }

      return data;
    },
    REQUEST_TIMEOUT_MS
  );
}

async function tryEndpoints<T>(endpoints: string[], fn: (url: string) => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < endpoints.length; i += 1) {
    try {
      return await fn(endpoints[i]);
    } catch (err) {
      lastError = err;
      if (err instanceof ApiError && err.status === 404 && i < endpoints.length - 1) {
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

export interface GenerateOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  resolution?: string;
  referenceImage?: string | null;
}

export interface GenerateResult {
  imageUrl: string;
  message?: string;
}

export async function generateWithProvider(
  config: ProviderConfig,
  options: GenerateOptions
): Promise<GenerateResult> {
  const prompt = options.negativePrompt
    ? `${options.prompt} (Exclude/Avoid: ${options.negativePrompt})`
    : options.prompt;
  const size = buildImageSize(options.resolution, options.aspectRatio);

  if (options.referenceImage) {
    return generateEdits(config, {
      ...options,
      referenceImage: options.referenceImage,
      prompt,
      size,
    });
  }

  return generateGenerations(config, { ...options, prompt, size });
}

async function generateGenerations(
  config: ProviderConfig,
  params: GenerateOptions & { prompt: string; size: string }
): Promise<GenerateResult> {
  const endpoints = resolveEndpoints(config.base_url, "/images/generations");
  const body = {
    model: config.model,
    prompt: params.prompt,
    n: 1,
    size: params.size,
  };

  return tryEndpoints(endpoints, async (url) => {
    return parseImageResult(await postJson(url, config.api_key, body));
  });
}

async function generateEdits(
  config: ProviderConfig,
  params: GenerateOptions & { prompt: string; size: string }
): Promise<GenerateResult> {
  const imageBlob = await referenceToBlob(params.referenceImage);
  const endpoints = resolveEndpoints(config.base_url, "/images/edits");

  return tryEndpoints(endpoints, async (url) => {
    const form = new FormData();
    form.append("model", config.model);
    form.append("prompt", params.prompt);
    form.append("n", "1");
    form.append("size", params.size);
    form.append("image", imageBlob, "image.png");

    return parseImageResult(await postForm(url, config.api_key, form));
  });
}

async function referenceToBlob(reference: string | null | undefined): Promise<Blob> {
  if (!reference) {
    throw new Error("缺少参考图片");
  }
  const dataUrlMatch = reference.match(/^data:([^;]*);base64,(.+)$/);
  if (dataUrlMatch) {
    const mime = dataUrlMatch[1] || "image/png";
    const buffer = Buffer.from(dataUrlMatch[2], "base64");
    return new Blob([buffer], { type: mime });
  }

  const res = await fetch(reference, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error("无法获取参考图片");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "image/png";
  return new Blob([buffer], { type: mime });
}

function parseImageResult(data: unknown): GenerateResult {
  const d = data as Record<string, unknown>;
  const dataArr = d.data;

  if (Array.isArray(dataArr) && dataArr.length > 0) {
    const first = dataArr[0] as Record<string, unknown>;
    if (typeof first.url === "string") {
      return { imageUrl: first.url };
    }
    if (typeof first.b64_json === "string") {
      return { imageUrl: `data:image/png;base64,${first.b64_json}` };
    }
    if (typeof first.image === "string") {
      return first.image.startsWith("data:")
        ? { imageUrl: first.image }
        : { imageUrl: `data:image/png;base64,${first.image}` };
    }
  }

  throw new Error("响应中未找到生成的图片");
}

export async function testProviderConnection(config: ProviderConfig): Promise<string> {
  const result = await generateWithProvider(config, {
    prompt: "一只蹲在纯色背景上的橘色小猫，极简测试图，用于验证连接",
    aspectRatio: "1:1",
    resolution: "512px",
  });
  return result.message || "连接成功，已成功生成测试图片";
}
