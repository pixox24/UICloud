"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Image as ImageIcon,
  Wand2,
  History,
  Layers,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  LogOut,
} from "lucide-react";
import type { User } from "@/types";
import type { GenerationMode } from "@/types/ai-studio";

interface SideNavProps {
  user: User | null;
  activeItem?: string;
  currentMode?: GenerationMode;
  onSelectMode?: (mode: GenerationMode) => void;
  historyCount?: number;
  onOpenHistory?: () => void;
  onOpenTemplates?: () => void;
}

const COLLAPSE_KEY = "uicloud:sidebar-collapsed";

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

export default function SideNav({
  user,
  activeItem,
  onSelectMode,
  historyCount = 0,
  onOpenHistory,
  onOpenTemplates,
}: SideNavProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      setCollapsed(false);
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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

  const isActive = (id: string) => activeItem === id;

  const selectMode = (mode: GenerationMode) => {
    if (onSelectMode) {
      onSelectMode(mode);
    } else {
      router.push(`/studio?mode=${mode}`);
    }
  };

  const openHistory = () => {
    if (onOpenHistory) {
      onOpenHistory();
    } else {
      router.push("/studio?tab=history");
    }
  };

  const openTemplates = () => {
    router.push("/templates");
  };

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : "?";
  const displayName = user?.username ?? "访客";
  const avatarTheme = getAvatarTheme(displayName.trim().toLowerCase() || "guest");
  const roleLabel = user?.role === "admin" ? "管理员" : "普通成员";
  const roleColor =
    user?.role === "admin"
      ? "text-[#33fb02] bg-[#18241b] border border-[#33fb02]/40"
      : "text-gray-400 bg-[#1a1f29] border border-[#2a3344]";

  return (
    <aside
      className={`relative flex flex-col h-full bg-[#101318] border-r border-[#202632] transition-all duration-300 z-30 select-none ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#202632]">
        <a
          href="/"
          className="flex items-center gap-3 overflow-hidden cursor-pointer group"
          title="UI 库"
        >
          <div className="w-8 h-8 rounded-lg bg-[#19221a] border-2 border-[#33fb02] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
            <Zap className="w-4 h-4 text-[#33fb02]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white tracking-wide text-sm group-hover:text-[#33fb02] transition-colors">Omni Flash</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#1b271d] text-[#33fb02] rounded font-bold border border-[#33fb02]/40">PRO</span>
              </div>
              <span className="text-[11px] text-gray-400">AI 视觉工坊</span>
            </div>
          )}
        </a>

        <button
          onClick={toggleCollapse}
          className="w-7 h-7 rounded-md bg-[#161a22] text-gray-400 hover:text-white hover:bg-[#222834] active:scale-95 flex items-center justify-center transition-all shrink-0"
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {/* UI 库 */}
        <div>
          {!collapsed && (
            <div className="px-2 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              资源中心
            </div>
          )}
          <div className="space-y-1.5">
            <a
              href="/"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                isActive("library")
                  ? "bg-[#182619] text-[#33fb02] border-2 border-[#33fb02]"
                  : "text-gray-300 hover:bg-[#181d26] hover:text-white border-2 border-transparent hover:border-[#232b38]"
              }`}
              title="UI 库"
            >
              <ImageIcon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive("library") ? "text-[#33fb02] scale-110" : "text-gray-400"}`} />
              {!collapsed && <span>UI 库</span>}
            </a>
          </div>
        </div>

        {/* AI 图像引擎 */}
        <div>
          {!collapsed && (
            <div className="px-2 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              AI 图像引擎
            </div>
          )}

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => selectMode("text-to-image")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                isActive("text-to-image")
                  ? "bg-[#182619] text-[#33fb02] border-2 border-[#33fb02]"
                  : "text-gray-300 hover:bg-[#181d26] hover:text-white border-2 border-transparent hover:border-[#232b38]"
              }`}
              title="文字生成图片"
            >
              <Sparkles className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive("text-to-image") ? "text-[#33fb02] scale-110" : "text-gray-400"}`} />
              {!collapsed && <span>文字生成图片</span>}
            </button>

            <button
              type="button"
              onClick={() => selectMode("image-edit")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                isActive("image-edit")
                  ? "bg-[#182619] text-[#33fb02] border-2 border-[#33fb02]"
                  : "text-gray-300 hover:bg-[#181d26] hover:text-white border-2 border-transparent hover:border-[#232b38]"
              }`}
              title="图片生成图片 / 编辑"
            >
              <Wand2 className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive("image-edit") ? "text-[#33fb02] scale-110" : "text-gray-400"}`} />
              {!collapsed && <span>图片编辑 / 图生图</span>}
            </button>
          </div>
        </div>

        {/* 资产与灵感 */}
        <div>
          {!collapsed && (
            <div className="px-2 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              资产与灵感
            </div>
          )}

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={openHistory}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                isActive("history")
                  ? "bg-[#182619] text-[#33fb02] border-2 border-[#33fb02]"
                  : "text-gray-300 hover:bg-[#181d26] hover:text-white border-2 border-transparent hover:border-[#232b38]"
              }`}
              title="我的创作历史"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <History className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive("history") ? "text-[#33fb02] scale-110" : "text-gray-400"}`} />
                {!collapsed && <span>我的创作历史</span>}
              </div>
              {!collapsed && historyCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#202733] text-gray-300 font-mono font-medium">
                  {historyCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openTemplates}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                isActive("templates")
                  ? "bg-[#182619] text-[#33fb02] border-2 border-[#33fb02]"
                  : "text-gray-300 hover:bg-[#181d26] hover:text-white border-2 border-transparent hover:border-[#232b38]"
              }`}
              title="灵感模板库"
            >
              <Layers className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive("templates") ? "text-[#33fb02] scale-110" : "text-gray-400"}`} />
              {!collapsed && <span>灵感预设模板</span>}
            </button>
          </div>
        </div>

        {/* 管理后台 */}
        {user?.role === "admin" && (
          <div>
            <a
              href="/admin/upload"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                isActive("admin")
                  ? "bg-[#182619] text-[#33fb02] border-2 border-[#33fb02]"
                  : "text-gray-300 hover:bg-[#181d26] hover:text-white border-2 border-transparent hover:border-[#232b38]"
              }`}
              title="管理后台"
            >
              <Shield className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive("admin") ? "text-[#33fb02] scale-110" : "text-gray-400"}`} />
              {!collapsed && <span>管理后台</span>}
            </a>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#202632] bg-[#0d1015]">
        {!collapsed ? (
          <div>
            {/* User / Actions */}
            <div className="relative">
              <button
                ref={avatarRef}
                onClick={() => setPopoverOpen((v) => !v)}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-[#141820] border border-[#232b38] hover:border-[#2d3749] transition-all duration-150 active:scale-[0.98]"
                title={displayName}
              >
                <div
                  className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[10px] font-semibold tracking-[0.15em] text-white"
                  style={{ backgroundImage: avatarTheme.gradient, boxShadow: `0 10px 20px -14px ${avatarTheme.shadow}` }}
                >
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.24),transparent_48%)]" />
                  <span className="relative">{initials}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <span className="max-w-full truncate text-xs font-semibold text-gray-200">{displayName}</span>
                  <span className={`mt-0.5 inline-block rounded-full px-1.5 py-px text-[10px] font-medium ${roleColor}`}>
                    {roleLabel}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>

              {popoverOpen && (
                <div
                  ref={popoverRef}
                  className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl bg-[#141820] shadow-2xl ring-1 ring-inset ring-white/[0.06]"
                  style={{ animation: "popover-in 0.18s cubic-bezier(0.16,1,0.3,1) forwards" }}
                >
                  <div className="p-1.5">
                    {user?.role === "admin" && (
                      <a
                        href="/admin/upload"
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-[#1c222c] hover:text-white"
                        onClick={() => setPopoverOpen(false)}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        管理后台
                      </a>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-red-950/30 hover:text-red-400"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative flex justify-center">
            <button
              ref={avatarRef}
              onClick={() => setPopoverOpen((v) => !v)}
              className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg text-[10px] font-semibold tracking-[0.15em] text-white transition-transform hover:scale-105"
              style={{ backgroundImage: avatarTheme.gradient, boxShadow: `0 12px 24px -16px ${avatarTheme.shadow}` }}
              title={displayName}
            >
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.24),transparent_48%)]" />
              <span className="relative">{initials}</span>
            </button>

            {popoverOpen && (
              <div
                ref={popoverRef}
                className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl bg-[#141820] shadow-2xl ring-1 ring-inset ring-white/[0.06]"
                style={{ animation: "popover-in 0.18s cubic-bezier(0.16,1,0.3,1) forwards" }}
              >
                <div className="px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-gray-200">{displayName}</p>
                  <p className={`mt-0.5 inline-block rounded-full px-1.5 py-px text-[10px] font-medium ${roleColor}`}>
                    {roleLabel}
                  </p>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                <div className="p-1.5">
                  {user?.role === "admin" && (
                    <a
                      href="/admin/upload"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-[#1c222c] hover:text-white"
                      onClick={() => setPopoverOpen(false)}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      管理后台
                    </a>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-red-950/30 hover:text-red-400"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes popover-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </aside>
  );
}
