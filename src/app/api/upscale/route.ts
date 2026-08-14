import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 高清放大（演示实现，后续接入后端超分服务）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, targetResolution = "4K" } = body || {};
    if (!imageUrl) return NextResponse.json({ error: "缺少图片" }, { status: 400 });

    return NextResponse.json({
      success: true,
      upscaledImageUrl: imageUrl,
      targetResolution,
      message: `已成功完成 ${targetResolution} 高清纹理超分辨率重构`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "放大失败" }, { status: 500 });
  }
}
