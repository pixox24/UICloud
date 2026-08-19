import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireUser } from "@/lib/auth";
import { getProviderConfig } from "@/lib/ai-provider";
import type { GenerationMode } from "@/types/ai-studio";
import {
  cancelGenerationJob,
  clearGenerationHistory,
  createGenerationJob,
  deleteGenerationJob,
  getGenerationJob,
  listActiveGenerationJobs,
  listGenerationHistory,
  startGenerationWorker,
  toggleGenerationFavorite,
} from "@/lib/generation-service";

export const runtime = "nodejs";

const VALID_MODES = new Set(["image-edit", "text-to-image", "reference-image"]);
const SUPPORTED_RESOLUTIONS = new Set(["512px", "1K", "2K"]);

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { prompt, negativePrompt, mode, model, aspectRatio, resolution, referenceImage, jobId } = body || {};

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

    const provider = getProviderConfig();
    if (!provider || !provider.enabled || !provider.base_url || !provider.api_key) {
      return NextResponse.json({ error: "AI 模型未配置或当前未启用，请先在管理后台完成连接配置" }, { status: 503 });
    }

    const job = await createGenerationJob({
      id: typeof jobId === "string" ? jobId : undefined,
      userId: user.userId,
      prompt: String(prompt || "Transform and enhance the image based on creative composition"),
      negativePrompt: typeof negativePrompt === "string" ? negativePrompt : undefined,
      mode: mode as GenerationMode,
      model: typeof model === "string" && model ? model : provider.model,
      aspectRatio: typeof aspectRatio === "string" ? aspectRatio : "1:1",
      resolution: typeof resolution === "string" ? resolution : "1K",
      referenceImage: mode === "text-to-image" ? null : referenceImage || null,
    });

    startGenerationWorker(provider);
    return NextResponse.json({ success: true, jobId: job.id, status: job.status });
  } catch (error: unknown) {
    if (isAuthError(error)) return NextResponse.json({ error: "未登录" }, { status: error.status });
    const message = error instanceof Error ? error.message : "创建生成任务失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const jobId = req.nextUrl.searchParams.get("jobId");
    const provider = getProviderConfig();
    if (provider?.enabled && provider.base_url && provider.api_key) startGenerationWorker(provider);

    if (jobId) {
      const job = getGenerationJob(jobId, user.userId);
      if (!job) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
      return NextResponse.json({ job });
    }

    return NextResponse.json({
      jobs: listGenerationHistory(user.userId),
      activeJobs: listActiveGenerationJobs(user.userId),
    });
  } catch (error: unknown) {
    if (isAuthError(error)) return NextResponse.json({ error: "未登录" }, { status: error.status });
    return NextResponse.json({ error: "读取生成记录失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (req.nextUrl.searchParams.get("all") === "1") {
      clearGenerationHistory(user.userId);
      return NextResponse.json({ success: true, cleared: true });
    }
    if (!jobId) return NextResponse.json({ error: "缺少任务 ID" }, { status: 400 });

    const cancelled = cancelGenerationJob(jobId, user.userId);
    if (cancelled) return NextResponse.json({ success: true, cancelled: true });
    const deleted = deleteGenerationJob(jobId, user.userId);
    if (!deleted) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    return NextResponse.json({ success: true, deleted: true });
  } catch (error: unknown) {
    if (isAuthError(error)) return NextResponse.json({ error: "未登录" }, { status: error.status });
    return NextResponse.json({ error: "删除生成记录失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const jobId = String(body?.jobId || "");
    if (!jobId) return NextResponse.json({ error: "缺少任务 ID" }, { status: 400 });
    if (body?.action === "cancel") {
      const cancelled = cancelGenerationJob(jobId, user.userId);
      return cancelled
        ? NextResponse.json({ success: true, status: "cancelled" })
        : NextResponse.json({ error: "任务无法取消" }, { status: 409 });
    }
    if (body?.action === "favorite") {
      const favorite = toggleGenerationFavorite(jobId, user.userId);
      if (favorite === null) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
      return NextResponse.json({ success: true, isFavorite: favorite });
    }
    return NextResponse.json({ error: "不支持的操作" }, { status: 400 });
  } catch (error: unknown) {
    if (isAuthError(error)) return NextResponse.json({ error: "未登录" }, { status: error.status });
    return NextResponse.json({ error: "更新生成记录失败" }, { status: 500 });
  }
}
