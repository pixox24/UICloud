import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireUser } from "@/lib/auth";
import { TemplateService } from "@/services/TemplateService";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: "缺少模板 ID" }, { status: 400 });
    }

    const existing = TemplateService.getById(id);
    if (!existing) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    }

    TemplateService.delete(id);
    logAudit(user, "delete", "template", null, "template_delete");
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "未登录" }, { status: error.status });
    }
    console.error("Delete template error:", error);
    return NextResponse.json({ error: "删除模板失败" }, { status: 500 });
  }
}
