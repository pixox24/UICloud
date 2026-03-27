import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const db = getDb();
  const categories = db
    .prepare("SELECT * FROM categories ORDER BY sort_order ASC, id ASC")
    .all();
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { name, parent_id, sort_order } = await req.json();
    if (!name) return NextResponse.json({ error: "名称不能为空" }, { status: 400 });

    const db = getDb();
    const result = db
      .prepare("INSERT INTO categories (name, parent_id, sort_order) VALUES (?, ?, ?)")
      .run(name, parent_id || null, sort_order || 0);

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch {
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { id, name, parent_id, sort_order } = await req.json();
    const db = getDb();
    db.prepare("UPDATE categories SET name=?, parent_id=?, sort_order=? WHERE id=?").run(
      name, parent_id || null, sort_order ?? 0, id
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    const db = getDb();
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
