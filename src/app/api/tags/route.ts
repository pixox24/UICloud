import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const db = getDb();
  const tags = db.prepare("SELECT * FROM tags ORDER BY name ASC").all();
  return NextResponse.json({ tags });
}
