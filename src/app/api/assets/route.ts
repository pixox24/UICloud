import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  buildDefaultAssetName,
  DEFAULT_ASSET_NAME_CATEGORY_CODE,
  inferAssetNameShapeCode,
  isAssetNameCategoryCode,
} from "@/lib/asset-naming";
import { getPreferredThumbnailPath, parseUseScenarioValue } from "@/lib/asset-options";
import { isAuthError, requireAdmin, requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";

type AssetFileRecord = {
  id: number;
  file_path: string;
  thumbnail_path: string;
  thumbnail_original: string;
  thumbnail_large: string;
  thumbnail_medium: string;
  thumbnail_small: string;
};

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const fetchAll = url.searchParams.get("limit") === "all";
    const page = fetchAll ? 1 : Math.max(1, parseInteger(url.searchParams.get("page"), 1));
    const limit = fetchAll ? null : Math.min(100, Math.max(1, parseInteger(url.searchParams.get("limit"), 20)));
    const offset = fetchAll || limit === null ? 0 : (page - 1) * limit;
    const showAll = url.searchParams.get("all") === "1";
    const sortBy = url.searchParams.get("sort") || "newest";

    if (showAll) {
      await requireAdmin();
    } else {
      await requireUser();
    }

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

    const assetsQuery = fetchAll
      ? `SELECT a.*, c.name as category_name, u.username as creator_name
         FROM assets a
         LEFT JOIN categories c ON c.id = a.category_id
         LEFT JOIN users u ON u.id = a.created_by
         ${where}
         ${orderBy}`
      : `SELECT a.*, c.name as category_name, u.username as creator_name
         FROM assets a
         LEFT JOIN categories c ON c.id = a.category_id
         LEFT JOIN users u ON u.id = a.created_by
         ${where}
         ${orderBy}
         LIMIT ? OFFSET ?`;

    const assets = (
      fetchAll
        ? db.prepare(assetsQuery).all(...params)
        : db.prepare(assetsQuery).all(...params, limit, offset)
    ) as Array<Record<string, unknown>>;

    const getTagsStatement = db.prepare(
      "SELECT t.name FROM asset_tags at JOIN tags t ON t.id = at.tag_id WHERE at.asset_id = ?"
    );

    for (let index = 0; index < assets.length; index += 1) {
      const asset = assets[index];
      asset.tags = (getTagsStatement.all(asset.id) as Array<{ name: string }>).map((tag) => tag.name);
      asset.use_scenario = parseUseScenarioValue(asset.use_scenario);
      asset.thumbnail_path = getPreferredThumbnailPath(asset);
      asset.has_thumbnail = Boolean(
        asset.thumbnail_medium ||
          asset.thumbnail_path ||
          asset.thumbnail_original ||
          asset.thumbnail_large ||
          asset.thumbnail_small
      );
    }

    return NextResponse.json({
      assets,
      total: total.total,
      page,
      totalPages: fetchAll || limit === null ? 1 : Math.ceil(total.total / limit),
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "未登录。" }, { status: error.status });
    }

    return NextResponse.json({ error: "获取资产失败。" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const payload = await req.json();
    const db = getDb();
    const batchIds = normalizeIds(payload.ids);

    if (batchIds.length > 0) {
      if (payload.is_active !== 0 && payload.is_active !== 1) {
        return NextResponse.json({ error: "批量操作目前只支持上架和下架。" }, { status: 400 });
      }

      const placeholders = batchIds.map(() => "?").join(", ");
      db.prepare(
        `UPDATE assets
         SET is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id IN (${placeholders})`
      ).run(payload.is_active, ...batchIds);

      for (let index = 0; index < batchIds.length; index += 1) {
        logAudit(
          user,
          "update",
          "asset",
          batchIds[index],
          payload.is_active === 1 ? "批量上架" : "批量下架"
        );
      }

      return NextResponse.json({
        success: true,
        updatedCount: batchIds.length,
      });
    }

    const assetId = normalizeSingleId(payload.id);
    if (!assetId) {
      return NextResponse.json({ error: "缺少资产 ID。" }, { status: 400 });
    }

    const existingAsset = db
      .prepare("SELECT id, aspect_ratio, orientation FROM assets WHERE id = ?")
      .get(assetId) as
      | { id: number; aspect_ratio: string | null; orientation: string | null }
      | undefined;

    if (!existingAsset) {
      return NextResponse.json({ error: "资产不存在。" }, { status: 404 });
    }

    const categoryCodeValue = String(payload.asset_name_category_code || "").toUpperCase();
    const categoryCode = isAssetNameCategoryCode(categoryCodeValue)
      ? categoryCodeValue
      : DEFAULT_ASSET_NAME_CATEGORY_CODE;
    const shapeCode = inferAssetNameShapeCode({
      aspectRatio: payload.aspect_ratio || existingAsset.aspect_ratio,
      orientation: payload.orientation || existingAsset.orientation,
    });
    const finalName =
      payload.regenerate_name === true
        ? buildDefaultAssetName(assetId, categoryCode, shapeCode)
        : payload.name;

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
      finalName,
      payload.description || "",
      payload.category_id || null,
      payload.is_active ?? 1,
      payload.aspect_ratio || null,
      payload.orientation || null,
      payload.color_theme || null,
      payload.width_px || null,
      payload.height_px || null,
      payload.use_scenario ? JSON.stringify(payload.use_scenario) : null,
      assetId
    );

    if (payload.tags !== undefined) {
      db.prepare("DELETE FROM asset_tags WHERE asset_id = ?").run(assetId);
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
            assetId,
            tag.id
          );
        }
      }
    }

    logAudit(user, "update", "asset", assetId, finalName);

    return NextResponse.json({
      success: true,
      assetName: finalName,
      assetNameCategoryCode: categoryCode,
      assetNameShapeCode: shapeCode,
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "无权限访问。" }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败。" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const payload = await req.json();
    const ids = normalizeIds(payload.ids);
    const assetId = normalizeSingleId(payload.id);
    const targetIds = ids.length > 0 ? ids : assetId ? [assetId] : [];

    if (!targetIds.length) {
      return NextResponse.json({ error: "缺少资产 ID。" }, { status: 400 });
    }

    const db = getDb();
    const assets = getAssetsForDeletion(db, targetIds);

    for (let index = 0; index < assets.length; index += 1) {
      removeAssetFiles(assets[index]);
    }

    const placeholders = targetIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM assets WHERE id IN (${placeholders})`).run(...targetIds);

    for (let index = 0; index < targetIds.length; index += 1) {
      logAudit(user, "delete", "asset", targetIds[index]);
    }

    return NextResponse.json({
      success: true,
      deletedCount: targetIds.length,
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "无权限访问。" }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败。" },
      { status: 500 }
    );
  }
}

function getAssetsForDeletion(db: ReturnType<typeof getDb>, ids: number[]) {
  const placeholders = ids.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT id, file_path, thumbnail_path, thumbnail_original, thumbnail_large, thumbnail_medium, thumbnail_small
       FROM assets
       WHERE id IN (${placeholders})`
    )
    .all(...ids) as AssetFileRecord[];
}

function removeAssetFiles(asset: AssetFileRecord) {
  const relativePaths = [
    asset.file_path,
    asset.thumbnail_path,
    asset.thumbnail_original,
    asset.thumbnail_large,
    asset.thumbnail_medium,
    asset.thumbnail_small,
  ];
  const handledPaths = new Set<string>();

  for (let index = 0; index < relativePaths.length; index += 1) {
    const relativePath = relativePaths[index];
    if (!relativePath || handledPaths.has(relativePath)) {
      continue;
    }

    handledPaths.add(relativePath);
    const absolutePath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }
}

function normalizeIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => normalizeSingleId(item))
        .filter((item): item is number => Boolean(item))
    )
  );
}

function normalizeSingleId(value: unknown): number | null {
  const parsed = parseInt(String(value || ""), 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
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
