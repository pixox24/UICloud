import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { UPLOADS_DIR } from "@/lib/runtime-paths";

const MIME_TYPES: Record<string, string> = {
  ".ai": "application/postscript",
  ".eps": "application/postscript",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".psd": "image/vnd.adobe.photoshop",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const segments = Array.isArray(params.path) ? params.path : [];
  // Generated images contain user-scoped data and must only be served through
  // /api/generated, which performs ownership checks.
  if (segments[0]?.toLowerCase() === "generated") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uploadsRoot = path.resolve(UPLOADS_DIR);
  const requestedPath = path.resolve(uploadsRoot, ...segments);

  if (!requestedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!fs.existsSync(requestedPath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(requestedPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const fileStream = fs.createReadStream(requestedPath);

  return new NextResponse(fileStream as any, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
