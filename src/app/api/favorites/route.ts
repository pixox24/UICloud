import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const MSG_UNAUTHENTICATED = "\u672a\u767b\u5f55\u3002";
const MSG_GET_FAILED = "\u83b7\u53d6\u6536\u85cf\u5931\u8d25\u3002";
const MSG_CREATE_FAILED = "\u6536\u85cf\u5931\u8d25\u3002";
const MSG_DELETE_FAILED = "\u53d6\u6d88\u6536\u85cf\u5931\u8d25\u3002";
const MSG_ASSET_ID_REQUIRED = "\u8d44\u4ea7 ID \u4e0d\u80fd\u4e3a\u7a7a\u3002";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
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
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHENTICATED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_GET_FAILED }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { assetId } = await req.json();

    if (!assetId) {
      return NextResponse.json({ error: MSG_ASSET_ID_REQUIRED }, { status: 400 });
    }

    const db = getDb();
    db.prepare("INSERT OR IGNORE INTO asset_favorites (user_id, asset_id) VALUES (?, ?)").run(
      user.userId,
      assetId
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHENTICATED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_CREATE_FAILED }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const { assetId } = await req.json();

    if (!assetId) {
      return NextResponse.json({ error: MSG_ASSET_ID_REQUIRED }, { status: 400 });
    }

    const db = getDb();
    db.prepare("DELETE FROM asset_favorites WHERE user_id = ? AND asset_id = ?").run(
      user.userId,
      assetId
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHENTICATED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_DELETE_FAILED }, { status: 500 });
  }
}
