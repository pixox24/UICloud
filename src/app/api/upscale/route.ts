import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl } = body || {};
    if (!imageUrl) return NextResponse.json({ error: "缺少图片" }, { status: 400 });

    return NextResponse.json(
      { error: "高清放大服务尚未接入" },
      { status: 501 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "放大失败" }, { status: 500 });
  }
}
