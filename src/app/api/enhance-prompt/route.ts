import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// AI 提示词扩写（演示实现，后续接入后端 LLM 服务）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body?.prompt;
    if (!prompt) {
      return NextResponse.json({ error: "请提供基础提示词" }, { status: 400 });
    }

    const enhanced = `${prompt}，8K分辨率，电影级光影，体积光，微距景深，精致细节，大师级构图，色彩丰富，材质细腻，虚幻引擎5渲染质感`;

    return NextResponse.json({ enhancedPrompt: enhanced });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "扩写失败" }, { status: 500 });
  }
}
