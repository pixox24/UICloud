import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireAdmin, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { LOGO_DIR, ensureRuntimeDirs } from "@/lib/runtime-paths";

const MSG_UNAUTHORIZED = "\u65e0\u6743\u9650\u8bbf\u95ee\u3002";
const MSG_UNAUTHENTICATED = "\u672a\u767b\u5f55\u3002";
const MSG_GET_FAILED = "\u83b7\u53d6\u8bbe\u7f6e\u5931\u8d25\u3002";
const MSG_UPLOAD_FAILED = "LOGO \u4e0a\u4f20\u5931\u8d25\u3002";
const MSG_REMOVE_FAILED = "\u79fb\u9664 LOGO \u5931\u8d25\u3002";
const MSG_FILE_REQUIRED = "\u8bf7\u9009\u62e9\u8981\u4e0a\u4f20\u7684 LOGO \u56fe\u7247\u3002";
const MSG_FORMAT_INVALID = "\u4e0d\u652f\u6301\u7684\u683c\u5f0f\uff0c\u4ec5\u652f\u6301 png\u3001jpg\u3001jpeg\u3001svg\u3002";
const MSG_SIZE_EXCEEDED = "LOGO \u6587\u4ef6\u6700\u5927\u652f\u6301 2MB\u3002";

const SETTING_LOGO_URL = "logo_url";
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg"];
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

function getSetting(db: ReturnType<typeof getDb>, key: string): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value || "";
}

function setSetting(db: ReturnType<typeof getDb>, key: string, value: string) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

function deleteLogoFile(db: ReturnType<typeof getDb>) {
  const current = getSetting(db, SETTING_LOGO_URL);
  if (!current) {
    return;
  }

  const filename = current.split("/").pop();
  if (filename) {
    const absolute = path.join(LOGO_DIR, filename);
    if (fs.existsSync(absolute)) {
      fs.unlinkSync(absolute);
    }
  }

  setSetting(db, SETTING_LOGO_URL, "");
}

export async function GET() {
  try {
    await requireUser();

    const db = getDb();
    const logoUrl = getSetting(db, SETTING_LOGO_URL);
    return NextResponse.json({ settings: { logo_url: logoUrl } });
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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: MSG_FILE_REQUIRED }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    if (ALLOWED_EXTENSIONS.indexOf(extension as (typeof ALLOWED_EXTENSIONS)[number]) < 0) {
      return NextResponse.json({ error: MSG_FORMAT_INVALID }, { status: 400 });
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return NextResponse.json({ error: MSG_SIZE_EXCEEDED }, { status: 400 });
    }

    ensureRuntimeDirs();

    const db = getDb();
    deleteLogoFile(db);

    const storedFileName = `${randomUUID()}${extension}`;
    const absoluteFilePath = path.join(LOGO_DIR, storedFileName);
    fs.writeFileSync(absoluteFilePath, Buffer.from(await file.arrayBuffer()));

    const logoUrl = `/api/static/logo/${storedFileName}`;
    setSetting(db, SETTING_LOGO_URL, logoUrl);
    logAudit(user, "update", "setting", null, "logo_upload");

    return NextResponse.json({ success: true, settings: { logo_url: logoUrl } });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHORIZED }, { status: error.status });
    }

    console.error("Logo upload error:", error);
    return NextResponse.json({ error: MSG_UPLOAD_FAILED }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await requireAdmin();
    const db = getDb();
    deleteLogoFile(db);
    logAudit(user, "delete", "setting", null, "logo_remove");
    return NextResponse.json({ success: true, settings: { logo_url: "" } });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHORIZED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_REMOVE_FAILED }, { status: 500 });
  }
}
