import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const url = req.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    const db = getDb();
    const total = db.prepare("SELECT COUNT(*) as total FROM audit_logs").get() as { total: number };

    const logs = db
      .prepare(
        `SELECT al.*, u.username
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(limit, offset);

    return NextResponse.json({
      logs,
      total: total.total,
      page,
      totalPages: Math.ceil(total.total / limit),
    });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
