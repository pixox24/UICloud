import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireAdmin, requireUser } from "@/lib/auth";
import { getProviderConfig, maskApiKey, saveProviderConfig } from "@/lib/ai-provider";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireUser();

    const config = getProviderConfig();
    return NextResponse.json({
      configured: Boolean(config),
      enabled: config?.enabled ?? false,
      base_url: config?.base_url || "",
      model: config?.model || "",
      api_key_masked: config ? maskApiKey(config.api_key) : "",
      has_api_key: Boolean(config?.api_key),
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "未登录" }, { status: error.status });
    }
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();

    const body = await req.json();
    const baseUrl = String(body.base_url || "").trim();
    const apiKey = String(body.api_key || "").trim();
    const enabled = Boolean(body.enabled);
    const model = String(body.model || "").trim();

    if (!baseUrl) {
      return NextResponse.json({ error: "请填写 Base URL" }, { status: 400 });
    }

    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("unsupported protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Base URL 格式不正确，需以 http:// 或 https:// 开头" },
        { status: 400 }
      );
    }

    const existing = getProviderConfig();

    // 保留未修改的密钥（前端回传的是脱敏后的值）
    let finalKey = apiKey;
    if (!finalKey || finalKey === maskApiKey(existing?.api_key || "")) {
      finalKey = existing?.api_key || "";
    }
    if (!finalKey) {
      return NextResponse.json({ error: "请填写 API Key" }, { status: 400 });
    }

    const finalModel = model || existing?.model || "gpt-image-2";

    saveProviderConfig({ base_url: baseUrl, api_key: finalKey, model: finalModel, enabled });
    logAudit(user, "update", "setting", null, "ai_provider_update");

    return NextResponse.json({
      success: true,
      configured: true,
      enabled,
      base_url: baseUrl,
      model: finalModel,
      api_key_masked: maskApiKey(finalKey),
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "无权限访问" }, { status: error.status });
    }
    console.error("AI provider config error:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
