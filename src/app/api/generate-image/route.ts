import { NextRequest, NextResponse } from "next/server";
import { generateWithProvider, getProviderConfig } from "@/lib/ai-provider";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { prompt, negativePrompt, mode, model, aspectRatio, resolution, referenceImage } = body || {};

    if (!prompt && !referenceImage) {
      return NextResponse.json({ error: "请提供提示词或参考图片" }, { status: 400 });
    }

    const provider = getProviderConfig();
    if (provider && provider.enabled && provider.base_url && provider.api_key) {
      try {
        const result = await generateWithProvider(provider, {
          prompt: prompt || "Transform and enhance the image based on creative composition",
          negativePrompt,
          aspectRatio,
          resolution,
          referenceImage,
        });

        return NextResponse.json({
          success: true,
          imageUrl: result.imageUrl,
          mode,
          model,
          aspectRatio,
          resolution,
          durationMs: Date.now() - startTime,
          message: result.message,
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: err?.message || "图像生成失败，请检查模型提供商配置" },
          { status: 502 }
        );
      }
    }

    // 未配置模型提供商时的演示模式
    const simulatedUrl =
      referenceImage && mode === "image-edit"
        ? "https://images.unsplash.com/photo-1563089145-599997674d42?w=1000&auto=format&fit=crop&q=85"
        : `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 50000000)}?w=1000&auto=format&fit=crop&q=85`;

    return NextResponse.json({
      success: true,
      imageUrl: simulatedUrl,
      mode,
      model,
      aspectRatio,
      resolution,
      durationMs: Date.now() - startTime + 800,
      simulated: true,
      message: "未配置 AI 模型提供商，当前为演示模式生成",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "图像生成遇到问题，请重试", durationMs: Date.now() - startTime },
      { status: 500 }
    );
  }
}
