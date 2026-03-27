"use client";

import { useRouter } from "next/navigation";
import { User, LogOut, Shield, FolderOpen } from "lucide-react";
import type { User as UserType } from "@/types";

interface HeaderProps {
  user: UserType | null;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between h-14">
        <a href="/" className="flex items-center gap-2.5 font-semibold text-lg tracking-tight">
          <FolderOpen className="w-5 h-5 text-primary" />
          设计资产库
        </a>

        <div className="flex items-center gap-3">
          {user?.role === "admin" && (
            <a
              href="/admin/upload"
              className="text-sm px-3 py-1.5 rounded-md bg-secondary hover:bg-muted text-secondary-foreground transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              管理后台
            </a>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            {user?.username}
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-secondary"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
