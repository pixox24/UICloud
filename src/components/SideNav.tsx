"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, LogOut, Shield, Workflow } from "lucide-react";
import type { User } from "@/types";

interface SideNavProps {
  user: User | null;
  activePage?: "library" | "projects";
}

const AVATAR_THEMES = [
  {
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)",
    accent: "#e0f2fe",
    shadow: "rgba(56, 189, 248, 0.35)",
  },
  {
    gradient: "linear-gradient(135deg, #0f766e 0%, #34d399 100%)",
    accent: "#d1fae5",
    shadow: "rgba(52, 211, 153, 0.32)",
  },
  {
    gradient: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
    accent: "#f5d0fe",
    shadow: "rgba(236, 72, 153, 0.3)",
  },
  {
    gradient: "linear-gradient(135deg, #c2410c 0%, #f59e0b 100%)",
    accent: "#fde68a",
    shadow: "rgba(245, 158, 11, 0.3)",
  },
  {
    gradient: "linear-gradient(135deg, #475569 0%, #94a3b8 100%)",
    accent: "#e2e8f0",
    shadow: "rgba(148, 163, 184, 0.28)",
  },
] as const;

const NAV_ITEMS = [
  {
    id: "library" as const,
    label: "UI 库",
    href: "/",
    icon: Layers,
  },
  {
    id: "projects" as const,
    label: "项目历程",
    href: "/projects",
    icon: Workflow,
  },
];

function hashSeed(value: string) {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function getAvatarTheme(seed: string) {
  return AVATAR_THEMES[hashSeed(seed) % AVATAR_THEMES.length];
}

export default function SideNav({ user, activePage = "library" }: SideNavProps) {
  const router = useRouter();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  /* close popover on outside click */
  useEffect(() => {
    if (!popoverOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !avatarRef.current?.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popoverOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "?";
  const displayName = user?.username ?? "访客";
  const avatarTheme = getAvatarTheme(displayName.trim().toLowerCase() || "guest");

  const roleLabel = user?.role === "admin" ? "管理员" : "普通成员";
  const roleColor =
    user?.role === "admin"
      ? "text-primary bg-primary/10"
      : "text-muted-foreground bg-secondary";

  return (
    <>
      {/* ── Floating sidebar ── */}
      <nav className="fixed left-4 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl bg-card/80 px-2 py-3 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl ring-1 ring-inset ring-white/[0.05]">
        {/* Nav items */}
        {NAV_ITEMS.map(({ id, label, href, icon: Icon }) => {
          const isActive = activePage === id;
          return (
            <a
              key={id}
              href={href}
              title={label}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-primary/15 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.3)]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />

              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute -right-px top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary opacity-70" />
              )}

              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-card px-2.5 py-1 text-xs font-medium text-foreground opacity-0 shadow-lg ring-1 ring-inset ring-white/[0.06] transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1">
                {label}
              </span>
            </a>
          );
        })}

        {/* Gradient divider */}
        <div className="my-1 w-6 overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Avatar + Popover */}
        <div className="relative">
          <button
            ref={avatarRef}
            onClick={() => setPopoverOpen((v) => !v)}
            className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl text-[11px] font-semibold tracking-[0.18em] text-white transition-all duration-200 ${
              popoverOpen
                ? "scale-[1.02] ring-2 ring-white/20"
                : "hover:scale-[1.02]"
            }`}
            style={{ boxShadow: `0 12px 24px -16px ${avatarTheme.shadow}` }}
            title={displayName}
          >
            <span
              className="absolute inset-0"
              style={{ backgroundImage: avatarTheme.gradient }}
            />
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.24),transparent_48%)]" />
            <span
              className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-white/35"
              style={{ backgroundColor: avatarTheme.accent }}
            />
            <span className="absolute -bottom-2 left-1 h-4 w-4 rounded-full bg-black/10 blur-sm" />
            <span className="relative">{initials}</span>
          </button>

          {/* Popover */}
          {popoverOpen && (
            <div
              ref={popoverRef}
              className="absolute bottom-0 left-full ml-3 w-52 overflow-hidden rounded-xl bg-card shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-white/[0.06]"
              style={{ animation: "popover-in 0.18s cubic-bezier(0.16,1,0.3,1) forwards" }}
            >
              {/* User info */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-semibold tracking-[0.18em] text-white"
                    style={{
                      backgroundImage: avatarTheme.gradient,
                      boxShadow: `0 14px 28px -20px ${avatarTheme.shadow}`,
                    }}
                  >
                    <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.24),transparent_48%)]" />
                    <span
                      className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-white/35"
                      style={{ backgroundColor: avatarTheme.accent }}
                    />
                    <span className="relative">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs tracking-[0.2em] text-muted-foreground">昵称</p>
                    <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                    <span className={`mt-0.5 inline-block rounded-full px-2 py-px text-[11px] font-medium ${roleColor}`}>
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Actions */}
              <div className="p-1.5">
                {user?.role === "admin" && (
                  <a
                    href="/admin/upload"
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    onClick={() => setPopoverOpen(false)}
                  >
                    <Shield className="h-4 w-4" />
                    管理后台
                  </a>
                )}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <style>{`
        @keyframes popover-in {
          from { opacity: 0; transform: translateX(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </>
  );
}
