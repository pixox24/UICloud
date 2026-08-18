import { NextRequest, NextResponse } from "next/server";
import { generateWithProvider, getProviderConfig } from "@/lib/ai-provider";

export const runtime = "nodejs";

const VALID_MODES = new Set(["image-edit", "text-to-image", "reference-image"]);
const SUPPORTED_RESOLUTIONS = new Set(["512px", "1K", "2K"]);

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { prompt, negativePrompt, mode, model, aspectRatio, resolution, referenceImage } = body || {};

    if (typeof mode !== "string" || !VALID_MODES.has(mode)) {
      return NextResponse.json({ error: "生成模式无效" }, { status: 400 });
    }

    if (resolution !== undefined && (typeof resolution !== "string" || !SUPPORTED_RESOLUTIONS.has(resolution))) {
      return NextResponse.json({ error: "当前仅支持 512px、1K 和 2K 分辨率" }, { status: 400 });
    }

    if (!prompt && !referenceImage) {
      return NextResponse.json({ error: "请提供提示词或参考图片" }, { status: 400 });
    }

    if (mode === "image-edit" && !referenceImage) {
      return NextResponse.json({ error: "图片编辑模式需要参考图片" }, { status: 400 });
    }

    // The mode is authoritative. A stale or forged reference image must never
    // turn a text-to-image request into an image edit request.
    const normalizedReferenceImage = mode === "text-to-image" ? null : referenceImage || null;

    const provider = getProviderConfig();
    if (provider && provider.enabled && provider.base_url && provider.api_key) {
      try {
        const result = await generateWithProvider(provider, {
          prompt: prompt || "Transform and enhance the image based on creative composition",
          negativePrompt,
          aspectRatio,
          resolution,
          referenceImage: normalizedReferenceImage,
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

    return NextResponse.json(
      { error: "AI 模型未配置或当前未启用，请先在管理后台完成连接配置" },
      { status: 503 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "图像生成遇到问题，请重试", durationMs: Date.now() - startTime },
      { status: 500 }
    );
  }
}
