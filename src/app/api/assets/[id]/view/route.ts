import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const assetId = parseInt(params.id, 10);
  if (Number.isNaN(assetId)) {
    return NextResponse.json({ error: "无效的资产 ID" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("UPDATE assets SET view_count = view_count + 1 WHERE id = ?").run(assetId);

  return NextResponse.json({ success: true });
}
