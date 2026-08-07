import { NextResponse } from "next/server";
import { isAuthError, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const MSG_UNAUTHENTICATED = "\u672a\u767b\u5f55\u3002";
const MSG_GET_FAILED = "\u83b7\u53d6\u6807\u7b7e\u5931\u8d25\u3002";

export async function GET() {
  try {
    await requireUser();

    const db = getDb();
    const tags = db.prepare("SELECT * FROM tags ORDER BY name ASC").all();
    return NextResponse.json({ tags });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: MSG_UNAUTHENTICATED }, { status: error.status });
    }

    return NextResponse.json({ error: MSG_GET_FAILED }, { status: 500 });
  }
}
