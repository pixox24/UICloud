import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const MSG_UNAUTHENTICATED = "\u672a\u767b\u5f55\u3002";
const MSG_RECORD_FAILED = "\u8bb0\u5f55\u6d4f\u89c8\u5931\u8d25\u3002";
const MSG_INVALID_ID = "\u65e0\u6548\u7684\u8d44\u4ea7 ID\u3002";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();

    const assetId = parseInt(params.id, 10);
    if (Number.isNaN(assetId)) {
      return NextResponse.json({ error: MSG_INVALID_ID }, { status: 400 });
    }

    const db = getDb();
    db.prepare("UPDATE assets SET view_count = view_count + 1 WHERE id = ?").run(assetId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHENTICATED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_RECORD_FAILED }, { status: 500 });
  }
}
