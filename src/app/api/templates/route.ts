import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireUser } from "@/lib/auth";
import { TemplateService } from "@/services/TemplateService";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const search = request.nextUrl.searchParams.get("search") || undefined;
    const list = TemplateService.list(search);
    return NextResponse.json(list);
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "未登录" }, { status: error.status });
    }
    console.error("List templates error:", error);
    return NextResponse.json({ error: "获取模板失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const title = String(body.title || "").trim();
    const prompt = String(body.prompt || "").trim();

    if (!title || !prompt) {
      return NextResponse.json({ error: "模板名称和提示词不能为空" }, { status: 400 });
    }

    const template = TemplateService.create(
      {
        title,
        category: String(body.category || "我的模板").trim(),
        prompt,
        sampleImage: String(body.sampleImage || "").trim() || undefined,
        sampleOriginalImage: String(body.sampleOriginalImage || "").trim() || undefined,
        defaultMode: body.defaultMode,
        aspectRatio: body.aspectRatio,
        tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      },
      user.userId
    );

    logAudit(user, "create", "template", null, "template_create");
    return NextResponse.json(template, { status: 201 });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "未登录" }, { status: error.status });
    }
    console.error("Create template error:", error);
    return NextResponse.json({ error: "保存模板失败" }, { status: 500 });
  }
}
