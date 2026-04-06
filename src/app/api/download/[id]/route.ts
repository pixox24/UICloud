import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const db = getDb();
  const asset = db
    .prepare("SELECT * FROM assets WHERE id = ? AND is_active = 1")
    .get(parseInt(params.id, 10)) as
    | { id: number; name: string; file_path: string; file_size: number; mime_type: string | null }
    | undefined;

  if (!asset) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), asset.file_path);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "源文件已丢失" }, { status: 404 });
  }

  db.prepare("UPDATE assets SET download_count = download_count + 1 WHERE id = ?").run(asset.id);

  const extension = path.extname(asset.file_path);
  const originalName = `${asset.name}${extension}`;

  const fileStream = fs.createReadStream(filePath);

  return new NextResponse(fileStream as any, {
    headers: {
      "Content-Type": asset.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`,
      "Content-Length": asset.file_size.toString(),
      "Cache-Control": "no-store",
    },
  });
}
