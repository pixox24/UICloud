import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireAdmin, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const MSG_UNAUTHORIZED = "\u65e0\u6743\u9650\u8bbf\u95ee\u3002";
const MSG_UNAUTHENTICATED = "\u672a\u767b\u5f55\u3002";
const MSG_GET_FAILED = "\u83b7\u53d6\u5206\u7c7b\u5931\u8d25\u3002";
const MSG_CREATE_FAILED = "\u521b\u5efa\u5206\u7c7b\u5931\u8d25\u3002";
const MSG_UPDATE_FAILED = "\u66f4\u65b0\u5206\u7c7b\u5931\u8d25\u3002";
const MSG_DELETE_FAILED = "\u5220\u9664\u5206\u7c7b\u5931\u8d25\u3002";
const MSG_NAME_REQUIRED = "\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a\u3002";

export async function GET() {
  try {
    await requireUser();

    const db = getDb();
    const categories = db.prepare("SELECT * FROM categories ORDER BY sort_order ASC, id ASC").all();
    return NextResponse.json({ categories });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHENTICATED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_GET_FAILED }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { name, parent_id, sort_order } = await req.json();

    if (!name) {
      return NextResponse.json({ error: MSG_NAME_REQUIRED }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO categories (name, parent_id, sort_order) VALUES (?, ?, ?)")
      .run(name, parent_id || null, sort_order || 0);

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHORIZED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_CREATE_FAILED }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { id, name, parent_id, sort_order } = await req.json();
    const db = getDb();

    db.prepare("UPDATE categories SET name = ?, parent_id = ?, sort_order = ? WHERE id = ?").run(
      name,
      parent_id || null,
      sort_order ?? 0,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHORIZED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_UPDATE_FAILED }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    const db = getDb();
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHORIZED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_DELETE_FAILED }, { status: 500 });
  }
}
