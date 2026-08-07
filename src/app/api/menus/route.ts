import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireAdmin, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const MSG_UNAUTHORIZED = "\u65e0\u6743\u9650\u8bbf\u95ee\u3002";
const MSG_UNAUTHENTICATED = "\u672a\u767b\u5f55\u3002";
const MSG_GET_FAILED = "\u83b7\u53d6\u83dc\u5355\u5931\u8d25\u3002";
const MSG_CREATE_FAILED = "\u521b\u5efa\u83dc\u5355\u5931\u8d25\u3002";
const MSG_UPDATE_FAILED = "\u66f4\u65b0\u83dc\u5355\u5931\u8d25\u3002";
const MSG_DELETE_FAILED = "\u5220\u9664\u83dc\u5355\u5931\u8d25\u3002";
const MSG_TITLE_REQUIRED = "\u83dc\u5355\u6807\u9898\u4e0d\u80fd\u4e3a\u7a7a\u3002";
const MSG_URL_REQUIRED = "\u8df3\u8f6c\u7f51\u5740\u4e0d\u80fd\u4e3a\u7a7a\u3002";
const MSG_URL_INVALID = "\u8df3\u8f6c\u7f51\u5740\u683c\u5f0f\u4e0d\u6b63\u786e\u3002";

const VALID_ICONS = new Set(["link", "external-link", "bookmark", "toolbox"]);

function isValidUrl(url: string) {
  return /^\/(?:[^?#\s]*)?(?:\?[^#\s]*)?(?:#[^\s]*)?$/.test(url) || /^https?:\/\/[^\s]+$/i.test(url);
}

export async function GET() {
  try {
    await requireUser();

    const db = getDb();
    const menus = db.prepare("SELECT * FROM menus ORDER BY sort_order ASC, id ASC").all();
    return NextResponse.json({ menus });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHENTICATED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_GET_FAILED }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const { title, icon, url, sort_order } = await req.json();

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: MSG_TITLE_REQUIRED }, { status: 400 });
    }

    if (!url || !String(url).trim()) {
      return NextResponse.json({ error: MSG_URL_REQUIRED }, { status: 400 });
    }

    const normalizedUrl = String(url).trim();
    if (!isValidUrl(normalizedUrl)) {
      return NextResponse.json({ error: MSG_URL_INVALID }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO menus (title, icon, url, sort_order) VALUES (?, ?, ?, ?)")
      .run(String(title).trim(), VALID_ICONS.has(icon) ? icon : "link", normalizedUrl, sort_order ?? 0);

    logAudit(user, "create", "menu", Number(result.lastInsertRowid), title);
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
    const user = await requireAdmin();
    const { id, title, icon, url, sort_order, is_active } = await req.json();
    const db = getDb();

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: MSG_TITLE_REQUIRED }, { status: 400 });
    }

    if (!url || !String(url).trim()) {
      return NextResponse.json({ error: MSG_URL_REQUIRED }, { status: 400 });
    }

    const normalizedUrl = String(url).trim();
    if (!isValidUrl(normalizedUrl)) {
      return NextResponse.json({ error: MSG_URL_INVALID }, { status: 400 });
    }

    db.prepare(
      "UPDATE menus SET title = ?, icon = ?, url = ?, sort_order = ?, is_active = ? WHERE id = ?"
    ).run(
      String(title).trim(),
      VALID_ICONS.has(icon) ? icon : "link",
      normalizedUrl,
      sort_order ?? 0,
      is_active === undefined ? 1 : is_active ? 1 : 0,
      id
    );

    logAudit(user, "update", "menu", id, title);
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
    const user = await requireAdmin();
    const { id } = await req.json();
    const db = getDb();

    db.prepare("DELETE FROM menus WHERE id = ?").run(id);
    logAudit(user, "delete", "menu", id, "");
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHORIZED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_DELETE_FAILED }, { status: 500 });
  }
}
