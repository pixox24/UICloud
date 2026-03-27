import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import type { AspectRatio, ColorTheme, Orientation } from "@/lib/asset-options";
import { isAspectRatio, isColorTheme, isOrientation, parseUseScenarioValue } from "@/lib/asset-options";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  MAX_UPLOAD_SIZE_BYTES,
  THUMBNAIL_ORIGINAL_DIR,
  UPLOAD_ASSETS_DIR,
  ensureRuntimeDirs,
} from "@/lib/runtime-paths";
import {
  analyzeImageVisuals,
  calculateFileHash,
  detectFileType,
  detectMimeType,
  generateThumbnails,
  inferAspectRatio,
  inferOrientation,
} from "@/lib/thumbnail";

const ALLOWED_FORMATS = [
  ".ai",
  ".avi",
  ".eps",
  ".fig",
  ".gif",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp4",
  ".otf",
  ".pdf",
  ".png",
  ".psd",
  ".sketch",
  ".svg",
  ".ttf",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".xd",
] as const;

type VisualMetadata = {
  widthPx: number | null;
  heightPx: number | null;
  aspectRatio: AspectRatio | null;
  orientation: Orientation | null;
  colorTheme: ColorTheme | null;
  primaryColor: string | null;
};

export async function POST(req: NextRequest) {
  const createdPaths: string[] = [];

  try {
    const user = await requireAdmin();
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const thumbnail = formData.get("thumbnail") as File | null;
    const name = ((formData.get("name") as string) || "").trim();
    const description = ((formData.get("description") as string) || "").trim();
    const categoryId = (formData.get("category_id") as string) || "";
    const tagsStr = ((formData.get("tags") as string) || "").trim();
    const parentIdStr = (formData.get("parent_id") as string) || "";
    const widthPxStr = (formData.get("width_px") as string) || "";
    const heightPxStr = (formData.get("height_px") as string) || "";
    const aspectRatioStr = (formData.get("aspect_ratio") as string) || "";
    const orientationStr = (formData.get("orientation") as string) || "";
    const colorThemeStr = (formData.get("color_theme") as string) || "";
    const useScenarioStr = (formData.get("use_scenario") as string) || "[]";

    if (!file || !name) {
      return NextResponse.json({ error: "文件和名称不能为空" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json({ error: "单个文件最大支持 500MB" }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    if (ALLOWED_FORMATS.indexOf(extension as (typeof ALLOWED_FORMATS)[number]) < 0) {
      return NextResponse.json(
        {
          error:
            "不支持的文件类型。支持 ai、eps、psd、xd、sketch、fig、png、jpg、jpeg、webp、gif、svg、pdf、mp4、mov、webm、avi、ttf、otf、woff、woff2。",
        },
        { status: 400 }
      );
    }

    ensureRuntimeDirs();

    const fileId = randomUUID();
    const storedFileName = `${fileId}${extension}`;
    const relativeFilePath = path.posix.join("uploads", "assets", storedFileName);
    const absoluteFilePath = path.join(UPLOAD_ASSETS_DIR, storedFileName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(absoluteFilePath, fileBuffer);
    createdPaths.push(absoluteFilePath);

    const fileHash = await calculateFileHash(absoluteFilePath);
    const db = getDb();
    const duplicateAsset = db
      .prepare("SELECT id, name FROM assets WHERE file_hash = ? LIMIT 1")
      .get(fileHash) as { id: number; name: string } | undefined;

    if (duplicateAsset) {
      cleanupCreatedFiles(createdPaths);
      return NextResponse.json(
        {
          error: `检测到重复文件，已存在资产 #${duplicateAsset.id}：${duplicateAsset.name}`,
          duplicateAsset,
        },
        { status: 409 }
      );
    }

    const fileType = detectFileType(extension);
    const mimeType = file.type || detectMimeType(extension);

    const thumbnailSource = await prepareThumbnailSource({
      fileId,
      fileType,
      fileExtension: extension,
      thumbnail,
      absoluteFilePath,
      createdPaths,
    });

    const visualMetadata = await buildVisualMetadata({
      thumbnailSourcePath: thumbnailSource.absolutePath,
      widthPxStr,
      heightPxStr,
      aspectRatioStr,
      orientationStr,
      colorThemeStr,
    });

    const useScenario = parseUseScenarioValue(useScenarioStr);
    const parentId = parentIdStr ? parseInt(parentIdStr, 10) : null;
    const categoryValue = categoryId ? parseInt(categoryId, 10) : null;
    const version = parentId ? resolveNextVersion(db, parentId) : 1;

    const result = db
      .prepare(
        `INSERT INTO assets (
          name,
          description,
          category_id,
          file_path,
          file_hash,
          mime_type,
          file_type,
          thumbnail_path,
          thumbnail_original,
          thumbnail_large,
          thumbnail_medium,
          thumbnail_small,
          file_size,
          file_format,
          aspect_ratio,
          orientation,
          width_px,
          height_px,
          color_theme,
          primary_color,
          use_scenario,
          version,
          parent_id,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        description,
        categoryValue,
        relativeFilePath,
        fileHash,
        mimeType,
        fileType,
        thumbnailSource.thumbnailMedium || thumbnailSource.originalRelativePath || "",
        thumbnailSource.originalRelativePath || "",
        thumbnailSource.thumbnailLarge || "",
        thumbnailSource.thumbnailMedium || "",
        thumbnailSource.thumbnailSmall || "",
        file.size,
        extension.replace(".", "").toUpperCase(),
        visualMetadata.aspectRatio || "custom",
        visualMetadata.orientation || "landscape",
        visualMetadata.widthPx,
        visualMetadata.heightPx,
        visualMetadata.colorTheme,
        visualMetadata.primaryColor,
        JSON.stringify(useScenario),
        version,
        parentId,
        user.userId
      );

    attachTags(db, Number(result.lastInsertRowid), tagsStr);

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      fileHash,
      fileType,
    });
  } catch (error: unknown) {
    cleanupCreatedFiles(createdPaths);
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败" },
      { status: 500 }
    );
  }
}

async function prepareThumbnailSource(input: {
  fileId: string;
  fileType: string;
  fileExtension: string;
  thumbnail: File | null;
  absoluteFilePath: string;
  createdPaths: string[];
}) {
  const result = {
    absolutePath: "",
    originalRelativePath: "",
    thumbnailLarge: "",
    thumbnailMedium: "",
    thumbnailSmall: "",
  };

  let thumbnailAbsolutePath = "";
  if (input.thumbnail && input.thumbnail.size > 0) {
    const thumbnailExtension = path.extname(input.thumbnail.name).toLowerCase() || ".png";
    const originalName = `${input.fileId}${thumbnailExtension}`;
    thumbnailAbsolutePath = path.join(THUMBNAIL_ORIGINAL_DIR, originalName);
    fs.writeFileSync(thumbnailAbsolutePath, Buffer.from(await input.thumbnail.arrayBuffer()));
    input.createdPaths.push(thumbnailAbsolutePath);
    result.absolutePath = thumbnailAbsolutePath;
    result.originalRelativePath = path.posix.join("uploads", "thumbnails", "original", originalName);
  } else if (input.fileType === "image") {
    const originalName = `${input.fileId}${input.fileExtension}`;
    thumbnailAbsolutePath = path.join(THUMBNAIL_ORIGINAL_DIR, originalName);
    fs.copyFileSync(input.absoluteFilePath, thumbnailAbsolutePath);
    input.createdPaths.push(thumbnailAbsolutePath);
    result.absolutePath = thumbnailAbsolutePath;
    result.originalRelativePath = path.posix.join("uploads", "thumbnails", "original", originalName);
  }

  if (result.absolutePath) {
    const generated = await generateThumbnails(result.absolutePath, input.fileId);
    result.thumbnailLarge = generated.large;
    result.thumbnailMedium = generated.medium;
    result.thumbnailSmall = generated.small;
    input.createdPaths.push(
      path.join(process.cwd(), generated.large),
      path.join(process.cwd(), generated.medium),
      path.join(process.cwd(), generated.small)
    );
  }

  return result;
}

async function buildVisualMetadata(input: {
  thumbnailSourcePath: string;
  widthPxStr: string;
  heightPxStr: string;
  aspectRatioStr: string;
  orientationStr: string;
  colorThemeStr: string;
}): Promise<VisualMetadata> {
  const widthFromForm = parseNullableInteger(input.widthPxStr);
  const heightFromForm = parseNullableInteger(input.heightPxStr);
  let analyzed = {
    width: null,
    height: null,
    aspectRatio: null,
    orientation: null,
    primaryColor: null,
    colorTheme: null,
  } as Awaited<ReturnType<typeof analyzeImageVisuals>>;

  if (input.thumbnailSourcePath) {
    analyzed = await analyzeImageVisuals(input.thumbnailSourcePath);
  }

  return {
    widthPx: widthFromForm ?? analyzed.width,
    heightPx: heightFromForm ?? analyzed.height,
    aspectRatio: isAspectRatio(input.aspectRatioStr)
      ? input.aspectRatioStr
      : inferAspectRatio(widthFromForm ?? analyzed.width, heightFromForm ?? analyzed.height) || analyzed.aspectRatio,
    orientation: isOrientation(input.orientationStr)
      ? input.orientationStr
      : inferOrientation(widthFromForm ?? analyzed.width, heightFromForm ?? analyzed.height) || analyzed.orientation,
    colorTheme: isColorTheme(input.colorThemeStr)
      ? input.colorThemeStr
      : analyzed.colorTheme,
    primaryColor: analyzed.primaryColor,
  };
}

function parseNullableInteger(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveNextVersion(db: ReturnType<typeof getDb>, parentId: number): number {
  const parent = db
    .prepare("SELECT id, version FROM assets WHERE id = ?")
    .get(parentId) as { id: number; version: number } | undefined;

  if (!parent) {
    return 1;
  }

  const child = db
    .prepare("SELECT MAX(version) as maxVersion FROM assets WHERE parent_id = ? OR id = ?")
    .get(parentId, parentId) as { maxVersion: number | null };

  return (child.maxVersion || parent.version || 1) + 1;
}

function attachTags(db: ReturnType<typeof getDb>, assetId: number, tagsStr: string) {
  if (!tagsStr) {
    return;
  }

  const tagNames = tagsStr
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  for (let index = 0; index < tagNames.length; index += 1) {
    db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(tagNames[index]);
    const tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(tagNames[index]) as
      | { id: number }
      | undefined;

    if (tag) {
      db.prepare("INSERT INTO asset_tags (asset_id, tag_id) VALUES (?, ?)").run(assetId, tag.id);
    }
  }
}

function cleanupCreatedFiles(paths: string[]) {
  for (let index = 0; index < paths.length; index += 1) {
    if (paths[index] && fs.existsSync(paths[index])) {
      fs.unlinkSync(paths[index]);
    }
  }
}
