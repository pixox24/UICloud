import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const url = req.nextUrl;
  const showFavorites = url.searchParams.get("favorites") === "1";

  const db = getDb();

  if (showFavorites) {
    const assets = db
      .prepare(
        `SELECT a.*, c.name as category_name, u.username as creator_name
         FROM assets a
         INNER JOIN asset_favorites af ON af.asset_id = a.id
         LEFT JOIN categories c ON c.id = a.category_id
         LEFT JOIN users u ON u.id = a.created_by
         WHERE af.user_id = ? AND a.is_active = 1
         ORDER BY af.created_at DESC`
      )
      .all(user.userId);

    return NextResponse.json({ assets });
  }

  return NextResponse.json({ assets: [] });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { assetId } = await req.json();
  if (!assetId) {
    return NextResponse.json({ error: "资产 ID 不能为空" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO asset_favorites (user_id, asset_id) VALUES (?, ?)")
    .run(user.userId, assetId);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { assetId } = await req.json();
  if (!assetId) {
    return NextResponse.json({ error: "资产 ID 不能为空" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM asset_favorites WHERE user_id = ? AND asset_id = ?")
    .run(user.userId, assetId);

  return NextResponse.json({ success: true });
}
