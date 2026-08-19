import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAuthError } from "@/lib/auth";
import { getGenerationJob } from "@/lib/generation-service";
import { GENERATED_DIR } from "@/lib/runtime-paths";

const MIME_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function isSafeJobId(value: string) {
  return /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function isSafeFileName(value: string) {
  return /^[a-zA-Z0-9_-]+\.(?:gif|jpe?g|png|webp)$/i.test(value);
}

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string; jobId: string; fileName: string } }
) {
  try {
    const user = await requireUser();
    if (String(user.userId) !== params.userId) {
      return NextResponse.json({ error: "无权访问该图片" }, { status: 403 });
    }
    if (!isSafeJobId(params.jobId) || !isSafeFileName(params.fileName)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const job = getGenerationJob(params.jobId, user.userId);
    const allowedFileNames = [job?.originalImageUrl, job?.resultImageUrl]
      .filter((value): value is string => Boolean(value))
      .map((value) => path.posix.basename(new URL(value, "http://localhost").pathname));
    if (!job || !allowedFileNames.includes(params.fileName)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const root = path.resolve(GENERATED_DIR);
    const jobDirectory = path.resolve(root, params.userId, params.jobId);
    const requested = path.resolve(jobDirectory, params.fileName);
    if (!requested.startsWith(`${jobDirectory}${path.sep}`)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    if (!fs.existsSync(requested) || !fs.statSync(requested).isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const extension = path.extname(requested).toLowerCase();
    const stream = fs.createReadStream(requested);
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (isAuthError(error)) return NextResponse.json({ error: "未登录" }, { status: error.status });
    return NextResponse.json({ error: "读取图片失败" }, { status: 500 });
  }
}
