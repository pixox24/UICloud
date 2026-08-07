import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { THUMBNAIL_ORIGINAL_DIR, ensureRuntimeDirs } from "@/lib/runtime-paths";

const SOURCE_PREVIEW_EXTENSIONS = ["psd", "ai", "eps", "pdf"] as const;
const PREVIEW_CONCURRENCY = 3;
const COMMAND_TIMEOUT_MS = 20_000;

type SupportedSourcePreviewExtension = (typeof SOURCE_PREVIEW_EXTENSIONS)[number];

type PreviewToolsStatus = {
  imagemagick: boolean;
};

type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export type SourcePreviewResult = {
  generated: boolean;
  absolutePath: string;
  relativePath: string;
  warning: string | null;
};

class Semaphore {
  private readonly limit: number;
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(limit: number) {
    this.limit = limit;
  }

  async use<T>(callback: () => Promise<T>): Promise<T> {
    await this.acquire();

    try {
      return await callback();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release() {
    this.active = Math.max(this.active - 1, 0);
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

const previewSemaphore = new Semaphore(PREVIEW_CONCURRENCY);
let toolsStatusPromise: Promise<PreviewToolsStatus> | null = null;

export function supportsSourcePreview(extension: string): extension is SupportedSourcePreviewExtension {
  return SOURCE_PREVIEW_EXTENSIONS.includes(
    extension.replace(/^\./, "").toLowerCase() as SupportedSourcePreviewExtension
  );
}

export async function getSourcePreviewToolsStatus(): Promise<PreviewToolsStatus> {
  if (!toolsStatusPromise) {
    toolsStatusPromise = detectTools();
  }

  return toolsStatusPromise;
}

export function clearSourcePreviewToolsCache() {
  toolsStatusPromise = null;
}

export async function extractPreviewFromSource(input: {
  filePath: string;
  extension: string;
  fileName: string;
}): Promise<SourcePreviewResult> {
  const extension = input.extension.replace(/^\./, "").toLowerCase();

  if (!supportsSourcePreview(extension)) {
    return {
      generated: false,
      absolutePath: "",
      relativePath: "",
      warning: "当前文件类型暂不支持自动预览。",
    };
  }

  const tools = await getSourcePreviewToolsStatus();
  if (!tools.imagemagick) {
    return {
      generated: false,
      absolutePath: "",
      relativePath: "",
      warning: "未检测到 ImageMagick，无法自动生成源文件预览图。",
    };
  }

  ensureRuntimeDirs();

  return previewSemaphore.use(async () => {
    const outputName = `${path.parse(input.fileName).name}.png`;
    const outputPath = path.join(THUMBNAIL_ORIGINAL_DIR, outputName);
    const relativePath = path.posix.join("uploads", "thumbnails", "original", outputName);

    try {
      const args = buildMagickArgs(input.filePath, extension, outputPath);
      const result = await runCommandWithTimeout("magick", args, COMMAND_TIMEOUT_MS);

      if (result.code !== 0 || !fs.existsSync(outputPath)) {
        return {
          generated: false,
          absolutePath: "",
          relativePath: "",
          warning: formatCommandFailure(extension, result),
        };
      }

      const validationWarning = await validateGeneratedPreview(outputPath, extension);
      if (validationWarning) {
        safeUnlink(outputPath);
        return {
          generated: false,
          absolutePath: "",
          relativePath: "",
          warning: validationWarning,
        };
      }

      return {
        generated: true,
        absolutePath: outputPath,
        relativePath,
        warning: null,
      };
    } catch (error) {
      return {
        generated: false,
        absolutePath: "",
        relativePath: "",
        warning: error instanceof Error ? error.message : `无法为 .${extension} 生成预览图。`,
      };
    }
  });
}

function buildMagickArgs(
  inputPath: string,
  extension: SupportedSourcePreviewExtension,
  outputPath: string
) {
  const source = `${inputPath}[0]`;

  if (extension === "psd") {
    return [
      source,
      "-auto-orient",
      "-colorspace",
      "sRGB",
      "-alpha",
      "on",
      "-resize",
      "2400x2400>",
      `PNG32:${outputPath}`,
    ];
  }

  return [
    "-density",
    "144",
    source,
    "-background",
    "white",
    "-alpha",
    "remove",
    "-alpha",
    "off",
    "-colorspace",
    "sRGB",
    "-resize",
    "2400x2400>",
    `PNG32:${outputPath}`,
  ];
}

async function validateGeneratedPreview(
  previewPath: string,
  extension: SupportedSourcePreviewExtension
): Promise<string | null> {
  if (extension !== "ai") {
    return null;
  }

  const looksLikeCompatibilityNotice = await isLikelyIllustratorCompatibilityNotice(previewPath);
  if (!looksLikeCompatibilityNotice) {
    return null;
  }

  return "这个 AI 文件提取到的是 Illustrator 兼容提示页，不是真实画面。请在 Illustrator 里勾选“创建 PDF 兼容文件”后重新保存，或手动上传缩略图。";
}

async function isLikelyIllustratorCompatibilityNotice(previewPath: string) {
  try {
    const image = sharp(previewPath);
    const metadata = await image.metadata();
    const stats = await image.stats();

    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const dominant = stats.dominant || { r: 0, g: 0, b: 0 };
    const colorChannels = stats.channels.slice(0, 3);
    const averageMean =
      colorChannels.reduce((total, channel) => total + channel.mean, 0) / Math.max(colorChannels.length, 1);

    const isLargeLightCanvas =
      width * height >= 1_000_000 &&
      dominant.r >= 240 &&
      dominant.g >= 240 &&
      dominant.b >= 240;
    const hasLowInformationDensity = averageMean >= 235 && stats.entropy <= 0.9;

    return isLargeLightCanvas && hasLowInformationDensity;
  } catch {
    return false;
  }
}

async function detectTools(): Promise<PreviewToolsStatus> {
  const imagemagick = await commandExists("magick", ["-version"]);

  return {
    imagemagick,
  };
}

async function commandExists(command: string, args: string[]) {
  try {
    const result = await runCommandWithTimeout(command, args, 5_000);
    return result.code === 0;
  } catch {
    return false;
  }
}

export async function runCommandWithTimeout(
  command: string,
  args: string[],
  timeoutMs: number
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      env: {
        ...process.env,
        MAGICK_MEMORY_LIMIT: "1GiB",
        MAGICK_MAP_LIMIT: "1GiB",
        MAGICK_THREAD_LIMIT: "2",
      },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve({
        code,
        stdout,
        stderr,
        timedOut,
      });
    });
  });
}

function formatCommandFailure(extension: string, result: CommandResult) {
  if (extension === "ai") {
    if (result.timedOut) {
      return "AI 预览生成超时。请优先使用勾选“创建 PDF 兼容文件”的 AI，或手动上传缩略图。";
    }

    return "AI 预览生成失败。部分 AI 文件无法被 ImageMagick/Ghostscript 正确解析，请在 Illustrator 里勾选“创建 PDF 兼容文件”后重新保存，或手动上传缩略图。";
  }

  if (result.timedOut) {
    return `.${extension} 预览生成超时，已回退为占位图。`;
  }

  const details = (result.stderr || result.stdout || "").trim();
  if (details) {
    return `.${extension} 预览生成失败：${details.split(/\r?\n/)[0]}`;
  }

  return `.${extension} 预览生成失败，已回退为占位图。`;
}

function safeUnlink(filePath: string) {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  fs.unlinkSync(filePath);
}
