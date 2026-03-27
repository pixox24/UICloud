import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { Vibrant } from "node-vibrant/node";
import type {
  AspectRatio,
  ColorTheme,
  FileType,
  Orientation,
} from "@/lib/asset-options";
import {
  THUMBNAIL_LARGE_DIR,
  THUMBNAIL_MEDIUM_DIR,
  THUMBNAIL_SMALL_DIR,
  ensureRuntimeDirs,
} from "@/lib/runtime-paths";

const SOURCE_EXTENSIONS = ["ai", "eps", "psd", "xd", "sketch", "fig"];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "svg"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "avi"];
const FONT_EXTENSIONS = ["ttf", "otf", "woff", "woff2"];

type ThumbnailResult = {
  large: string;
  medium: string;
  small: string;
};

type ImageAnalysisResult = {
  width: number | null;
  height: number | null;
  aspectRatio: AspectRatio | null;
  orientation: Orientation | null;
  primaryColor: string | null;
  colorTheme: ColorTheme | null;
};

type PaletteEntry = {
  hex?: string;
  hsl?: [number, number, number];
};

export function detectFileType(extension: string): FileType {
  const normalized = extension.replace(/^\./, "").toLowerCase();

  if (SOURCE_EXTENSIONS.indexOf(normalized) >= 0) {
    return "source";
  }

  if (IMAGE_EXTENSIONS.indexOf(normalized) >= 0) {
    return "image";
  }

  if (normalized === "pdf") {
    return "pdf";
  }

  if (VIDEO_EXTENSIONS.indexOf(normalized) >= 0) {
    return "video";
  }

  if (FONT_EXTENSIONS.indexOf(normalized) >= 0) {
    return "font";
  }

  return "other";
}

export function detectMimeType(extension: string): string {
  const normalized = extension.replace(/^\./, "").toLowerCase();
  const mimeTypes: Record<string, string> = {
    ai: "application/postscript",
    avi: "video/x-msvideo",
    eps: "application/postscript",
    fig: "application/octet-stream",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    mov: "video/quicktime",
    mp4: "video/mp4",
    otf: "font/otf",
    pdf: "application/pdf",
    png: "image/png",
    psd: "image/vnd.adobe.photoshop",
    sketch: "application/octet-stream",
    svg: "image/svg+xml",
    ttf: "font/ttf",
    webm: "video/webm",
    webp: "image/webp",
    woff: "font/woff",
    woff2: "font/woff2",
    xd: "application/octet-stream",
  };

  return mimeTypes[normalized] || "application/octet-stream";
}

export function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("md5");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", (error) => {
      reject(error);
    });
  });
}

export async function generateThumbnails(sourceImagePath: string, fileName: string): Promise<ThumbnailResult> {
  ensureRuntimeDirs();

  const baseName = path.parse(fileName).name;
  const largeOutput = path.join(THUMBNAIL_LARGE_DIR, `${baseName}.webp`);
  const mediumOutput = path.join(THUMBNAIL_MEDIUM_DIR, `${baseName}.webp`);
  const smallOutput = path.join(THUMBNAIL_SMALL_DIR, `${baseName}.webp`);

  await sharp(sourceImagePath)
    .rotate()
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(largeOutput);

  await sharp(sourceImagePath)
    .rotate()
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(mediumOutput);

  await sharp(sourceImagePath)
    .rotate()
    .resize({ width: 200, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(smallOutput);

  return {
    large: path.posix.join("uploads", "thumbnails", "large", `${baseName}.webp`),
    medium: path.posix.join("uploads", "thumbnails", "medium", `${baseName}.webp`),
    small: path.posix.join("uploads", "thumbnails", "small", `${baseName}.webp`),
  };
}

export async function extractPrimaryColor(imagePath: string): Promise<string | null> {
  try {
    const palette = await Vibrant.from(imagePath).getPalette();
    const swatch =
      palette.Vibrant ||
      palette.Muted ||
      palette.DarkVibrant ||
      palette.LightVibrant ||
      palette.DarkMuted ||
      palette.LightMuted;

    return swatch?.hex || null;
  } catch {
    return null;
  }
}

export async function analyzeImageVisuals(imagePath: string): Promise<ImageAnalysisResult> {
  try {
    const metadata = await sharp(imagePath).metadata();
    const width = metadata.width || null;
    const height = metadata.height || null;
    const palette = await Vibrant.from(imagePath).getPalette();
    const primaryColor =
      palette.Vibrant?.hex ||
      palette.Muted?.hex ||
      palette.DarkVibrant?.hex ||
      palette.LightVibrant?.hex ||
      palette.DarkMuted?.hex ||
      palette.LightMuted?.hex ||
      null;

    return {
      width,
      height,
      aspectRatio: inferAspectRatio(width, height),
      orientation: inferOrientation(width, height),
      primaryColor,
      colorTheme: inferColorThemeFromPalette(palette, primaryColor),
    };
  } catch {
    return {
      width: null,
      height: null,
      aspectRatio: null,
      orientation: null,
      primaryColor: null,
      colorTheme: null,
    };
  }
}

export function inferAspectRatio(width: number | null, height: number | null): AspectRatio | null {
  if (!width || !height) {
    return null;
  }

  if (width === height) {
    return "1:1";
  }

  const ratio = width / height;
  const aspectPresets: Array<{ ratio: number; value: AspectRatio }> = [
    { ratio: 1, value: "1:1" },
    { ratio: 4 / 3, value: "4:3" },
    { ratio: 3 / 4, value: "3:4" },
    { ratio: 16 / 9, value: "16:9" },
    { ratio: 9 / 16, value: "9:16" },
    { ratio: 4, value: "4:1" },
    { ratio: 1 / 4, value: "1:4" },
    { ratio: 2, value: "2:1" },
    { ratio: 1 / 2, value: "1:2" },
    { ratio: 2 / 3, value: "2:3" },
    { ratio: 3 / 2, value: "3:2" },
  ];

  for (let index = 0; index < aspectPresets.length; index += 1) {
    if (Math.abs(ratio - aspectPresets[index].ratio) <= 0.08) {
      return aspectPresets[index].value;
    }
  }

  return "custom";
}

export function inferOrientation(width: number | null, height: number | null): Orientation | null {
  if (!width || !height) {
    return null;
  }

  if (width === height) {
    return "square";
  }

  return width > height ? "landscape" : "portrait";
}

function inferColorThemeFromPalette(
  palette: Record<string, PaletteEntry | null>,
  primaryColor: string | null
): ColorTheme | null {
  const swatches: PaletteEntry[] = [];
  const keys = Object.keys(palette);

  for (let index = 0; index < keys.length; index += 1) {
    const swatch = palette[keys[index]];
    if (swatch?.hex && swatch.hsl) {
      swatches.push(swatch);
    }
  }

  if (!swatches.length || !primaryColor) {
    return null;
  }

  let saturationTotal = 0;
  let lightnessTotal = 0;
  let minHue = 1;
  let maxHue = 0;

  for (let index = 0; index < swatches.length; index += 1) {
    const hsl = swatches[index].hsl as [number, number, number];
    saturationTotal += hsl[1];
    lightnessTotal += hsl[2];
    minHue = Math.min(minHue, hsl[0]);
    maxHue = Math.max(maxHue, hsl[0]);
  }

  const averageSaturation = saturationTotal / swatches.length;
  const averageLightness = lightnessTotal / swatches.length;
  const hueSpread = maxHue - minHue;

  if (averageSaturation <= 0.12) {
    return "monochrome";
  }

  if (averageSaturation >= 0.45 && hueSpread >= 0.18) {
    return "gradient";
  }

  if (averageLightness <= 0.35) {
    return "dark";
  }

  if (averageLightness >= 0.72) {
    return "light";
  }

  return "colorful";
}
