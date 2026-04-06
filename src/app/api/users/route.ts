import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();
    const users = db
      .prepare("SELECT id, username, role, created_at FROM users ORDER BY created_at DESC")
      .all();
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { username, password, role } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    if (!["admin", "user"].includes(role)) {
      return NextResponse.json({ error: "角色必须是 admin 或 user" }, { status: 400 });
    }

    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username) as { id: number } | undefined;

    if (existing) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)")
      .run(username, passwordHash, role);

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { id, role, password } = await req.json();

    const db = getDb();

    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
    }

    if (role) {
      if (!["admin", "user"].includes(role)) {
        return NextResponse.json({ error: "角色无效" }, { status: 400 });
      }
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const { id } = await req.json();

    if (id === user.userId) {
      return NextResponse.json({ error: "不能删除自己的账号" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 }
    );
  }
}
