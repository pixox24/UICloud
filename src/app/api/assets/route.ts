import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getPreferredThumbnailPath, parseUseScenarioValue } from "@/lib/asset-options";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const url = req.nextUrl;
  const page = Math.max(1, parseInteger(url.searchParams.get("page"), 1));
  const limit = Math.min(100, Math.max(1, parseInteger(url.searchParams.get("limit"), 20)));
  const offset = (page - 1) * limit;
  const showAll = url.searchParams.get("all") === "1";
  const sortBy = url.searchParams.get("sort") || "newest";

  let where = showAll ? "WHERE 1=1" : "WHERE a.is_active = 1";
  const params: Array<string | number> = [];

  appendLikeFilter(url.searchParams.get("search"), (search) => {
    where +=
      " AND (a.name LIKE ? OR a.description LIKE ? OR EXISTS (SELECT 1 FROM asset_tags at2 JOIN tags t2 ON t2.id = at2.tag_id WHERE at2.asset_id = a.id AND t2.name LIKE ?))";
    params.push(search, search, search);
  });

  appendExactFilter(url.searchParams.get("category_id"), (categoryId) => {
    where += " AND a.category_id = ?";
    params.push(parseInt(categoryId, 10));
  });

  appendExactFilter(url.searchParams.get("tag"), (tagName) => {
    where +=
      " AND EXISTS (SELECT 1 FROM asset_tags at3 JOIN tags t3 ON t3.id = at3.tag_id WHERE at3.asset_id = a.id AND t3.name = ?)";
    params.push(tagName);
  });

  appendExactFilter(url.searchParams.get("format"), (format) => {
    where += " AND a.file_format = ?";
    params.push(format.toUpperCase());
  });

  appendExactFilter(url.searchParams.get("file_type"), (fileType) => {
    where += " AND a.file_type = ?";
    params.push(fileType);
  });

  appendExactFilter(url.searchParams.get("orientation"), (orientation) => {
    where += " AND a.orientation = ?";
    params.push(orientation);
  });

  appendExactFilter(url.searchParams.get("aspect_ratio"), (aspectRatio) => {
    where += " AND a.aspect_ratio = ?";
    params.push(aspectRatio);
  });

  appendExactFilter(url.searchParams.get("color_theme"), (colorTheme) => {
    where += " AND a.color_theme = ?";
    params.push(colorTheme);
  });

  appendExactFilter(url.searchParams.get("use_scenario"), (useScenario) => {
    where += " AND a.use_scenario LIKE ? ESCAPE '\\'";
    params.push(`%\\\"${escapeLikePattern(useScenario)}\\\"%`);
  });

  const db = getDb();
  const total = db
    .prepare(`SELECT COUNT(*) as total FROM assets a ${where}`)
    .get(...params) as { total: number };

  const orderBy =
    sortBy === "downloads"
      ? "ORDER BY a.download_count DESC"
      : sortBy === "views"
      ? "ORDER BY a.view_count DESC"
      : "ORDER BY a.created_at DESC";

  const assets = db
    .prepare(
      `SELECT a.*, c.name as category_name, u.username as creator_name
       FROM assets a
       LEFT JOIN categories c ON c.id = a.category_id
       LEFT JOIN users u ON u.id = a.created_by
       ${where}
       ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Array<Record<string, unknown>>;

  const getTagsStatement = db.prepare(
    "SELECT t.name FROM asset_tags at JOIN tags t ON t.id = at.tag_id WHERE at.asset_id = ?"
  );

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    asset.tags = (getTagsStatement.all(asset.id) as Array<{ name: string }>).map((tag) => tag.name);
    asset.use_scenario = parseUseScenarioValue(asset.use_scenario);
    asset.thumbnail_path = getPreferredThumbnailPath(asset);
  }

  return NextResponse.json({
    assets,
    total: total.total,
    page,
    totalPages: Math.ceil(total.total / limit),
  });
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const payload = await req.json();
    const db = getDb();

    db.prepare(
      `UPDATE assets
       SET name = ?,
           description = ?,
           category_id = ?,
           is_active = ?,
           aspect_ratio = COALESCE(?, aspect_ratio),
           orientation = COALESCE(?, orientation),
           color_theme = COALESCE(?, color_theme),
           width_px = COALESCE(?, width_px),
           height_px = COALESCE(?, height_px),
           use_scenario = COALESCE(?, use_scenario),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      payload.name,
      payload.description || "",
      payload.category_id || null,
      payload.is_active ?? 1,
      payload.aspect_ratio || null,
      payload.orientation || null,
      payload.color_theme || null,
      payload.width_px || null,
      payload.height_px || null,
      payload.use_scenario ? JSON.stringify(payload.use_scenario) : null,
      payload.id
    );

    if (payload.tags !== undefined) {
      db.prepare("DELETE FROM asset_tags WHERE asset_id = ?").run(payload.id);
      const tags = Array.isArray(payload.tags) ? payload.tags : [];

      for (let index = 0; index < tags.length; index += 1) {
        const tagName = String(tags[index] || "").trim();
        if (!tagName) {
          continue;
        }

        db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(tagName);
        const tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName) as
          | { id: number }
          | undefined;

        if (tag) {
          db.prepare("INSERT OR IGNORE INTO asset_tags (asset_id, tag_id) VALUES (?, ?)").run(
            payload.id,
            tag.id
          );
        }
      }
    }

    logAudit(user, "update", "asset", payload.id, payload.name);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const { id } = await req.json();
    const db = getDb();
    const asset = db
      .prepare(
        "SELECT file_path, thumbnail_path, thumbnail_original, thumbnail_large, thumbnail_medium, thumbnail_small FROM assets WHERE id = ?"
      )
      .get(id) as
      | {
          file_path: string;
          thumbnail_path: string;
          thumbnail_original: string;
          thumbnail_large: string;
          thumbnail_medium: string;
          thumbnail_small: string;
        }
      | undefined;

    if (asset) {
      const relativePaths = [
        asset.file_path,
        asset.thumbnail_path,
        asset.thumbnail_original,
        asset.thumbnail_large,
        asset.thumbnail_medium,
        asset.thumbnail_small,
      ];
      const handledPaths: Record<string, boolean> = {};

      for (let index = 0; index < relativePaths.length; index += 1) {
        const relativePath = relativePaths[index];
        if (!relativePath || handledPaths[relativePath]) {
          continue;
        }

        handledPaths[relativePath] = true;
        const absolutePath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      }
    }

    db.prepare("DELETE FROM assets WHERE id = ?").run(id);
    logAudit(user, "delete", "asset", id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 }
    );
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function appendLikeFilter(value: string | null, apply: (value: string) => void) {
  if (!value) {
    return;
  }

  apply(`%${escapeLikePattern(value)}%`);
}

function appendExactFilter(value: string | null, apply: (value: string) => void) {
  if (!value) {
    return;
  }

  apply(value);
}

function parseInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
