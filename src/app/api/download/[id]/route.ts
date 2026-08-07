import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const MSG_UNAUTHENTICATED = "\u672a\u767b\u5f55\u3002";
const MSG_DOWNLOAD_FAILED = "\u4e0b\u8f7d\u5931\u8d25\u3002";
const MSG_FILE_NOT_FOUND = "\u6587\u4ef6\u4e0d\u5b58\u5728\u3002";
const MSG_SOURCE_MISSING = "\u6e90\u6587\u4ef6\u5df2\u4e22\u5931\u3002";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();

    const db = getDb();
    const asset = db
      .prepare("SELECT * FROM assets WHERE id = ? AND is_active = 1")
      .get(parseInt(params.id, 10)) as
      | { id: number; name: string; file_path: string; mime_type: string | null }
      | undefined;

    if (!asset) {
      return NextResponse.json({ error: MSG_FILE_NOT_FOUND }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), asset.file_path);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: MSG_SOURCE_MISSING }, { status: 404 });
    }

    db.prepare("UPDATE assets SET download_count = download_count + 1 WHERE id = ?").run(asset.id);

    const fileBuffer = fs.readFileSync(filePath);
    const extension = path.extname(asset.file_path);
    const originalName = `${asset.name}${extension}`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": asset.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHENTICATED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_DOWNLOAD_FAILED }, { status: 500 });
  }
}
