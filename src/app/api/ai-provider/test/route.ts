import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireAdmin } from "@/lib/auth";
import { getProviderConfig, maskApiKey, testProviderConnection } from "@/lib/ai-provider";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();

    const body = await req.json();
    let baseUrl = String(body.base_url || "").trim();
    let apiKey = String(body.api_key || "").trim();
    let model = String(body.model || "").trim();

    const existing = getProviderConfig();
    if (!baseUrl) {
      baseUrl = existing?.base_url || "";
    }
    if (!apiKey || apiKey === maskApiKey(existing?.api_key || "")) {
      apiKey = existing?.api_key || "";
    }
    if (!model) {
      model = existing?.model || "gpt-image-2";
    }

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: "请先填写 Base URL 和 API Key 再测试" },
        { status: 400 }
      );
    }

    const message = await testProviderConnection({
      base_url: baseUrl,
      api_key: apiKey,
      model,
      enabled: true,
    });

    logAudit(user, "test", "setting", null, "ai_provider_test");

    return NextResponse.json({ success: true, message });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "无权限访问" }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "连接失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
