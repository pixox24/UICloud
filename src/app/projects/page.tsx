"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
  Loader2,
  Circle,
  Calendar,
  Users,
  Zap,
} from "lucide-react";
import StarfieldCanvas from "@/components/projects/StarfieldCanvas";
import SideNav from "@/components/SideNav";
import type { User } from "@/types";

/* ── Data ── */

interface Milestone {
  id: string;
  title: string;
  description: string;
  date: string;
  status: "completed" | "in_progress" | "planned";
  participants?: string[];
  highlights?: string[];
}

const MILESTONES: Milestone[] = [
  {
    id: "m1",
    title: "项目启动 · 基础架构",
    description:
      "完成 Next.js 14 + SQLite 技术选型，搭建完整的资产管理数据模型，实现用户认证、资产上传、缩略图自动生成、分类与标签系统、管理后台。",
    date: "2026-03-27",
    status: "completed",
    participants: ["华子", "pixox24"],
    highlights: [
      "Next.js + SQLite 架构",
      "JWT 认证体系",
      "多格式上传 & 缩略图",
      "分类 & 标签管理",
      "管理后台",
    ],
  },
  {
    id: "m2",
    title: "UX 体验优化",
    description:
      "引入瀑布流布局、搜索防抖、URL 同步筛选、收藏功能、批量上传、Toast 通知系统、分页组件与流式下载，全面提升用户体验。",
    date: "2026-04-07",
    status: "completed",
    participants: ["华子", "pixox24"],
    highlights: [
      "Masonry 瀑布流",
      "URL 筛选同步",
      "收藏系统",
      "批量上传",
      "Toast 通知",
      "流式下载",
    ],
  },
  {
    id: "m3",
    title: "视觉系统重构",
    description:
      "重新设计资产详情弹窗、新增左侧浮动导航栏、优化卡片交互动效，建立统一的动画语言和视觉层次体系。打造未来感项目历程页面。",
    date: "2026-04-21",
    status: "in_progress",
    participants: ["华子", "pixox24"],
    highlights: [
      "弹窗动画重构",
      "浮动导航栏",
      "星际航线历程页",
      "统一动画语言",
    ],
  },
  {
    id: "m4",
    title: "协作与版本控制",
    description:
      "支持多人协作标注、资产版本历史追踪、操作日志审计强化与细粒度权限管理，让团队协作更高效。",
    date: "2026-06-01",
    status: "planned",
    highlights: ["版本历史追踪", "协作标注", "权限管理强化"],
  },
  {
    id: "m5",
    title: "智能化 & 开放生态",
    description:
      "AI 自动打标签、相似资产推荐、开放 API 接口以及插件系统，让 UICloud 成为设计资产的智能中枢。",
    date: "2026-09-01",
    status: "planned",
    highlights: ["AI 自动标签", "智能推荐", "开放 API", "插件系统"],
  },
];

/* ── Status helpers ── */

const STATUS_CONFIG = {
  completed: {
    label: "已完成",
    color: "text-sky-400",
    bg: "bg-sky-400",
    glow: "#38bdf8",
    ring: "ring-sky-400/30",
    icon: CheckCircle2,
  },
  in_progress: {
    label: "进行中",
    color: "text-amber-400",
    bg: "bg-amber-400",
    glow: "#fbbf24",
    ring: "ring-amber-400/30",
    icon: Loader2,
  },
  planned: {
    label: "规划中",
    color: "text-slate-500",
    bg: "bg-slate-600",
    glow: "#475569",
    ring: "ring-slate-500/20",
    icon: Circle,
  },
};

/* ── Page ── */

export default function ProjectsPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCurrentUser() {
      try {
        const response = await fetch("/api/auth/me");
        const data = response.ok ? await response.json() : { user: null };

        if (!cancelled) {
          setUser(data.user ?? null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      }
    }

    fetchCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden md:flex" style={{ background: "#060912" }}>
      <StarfieldCanvas />

      {/* Nebula blobs */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        <div className="absolute -left-40 top-1/4 h-[500px] w-[500px] rounded-full bg-[hsl(213_60%_30%/0.06)] blur-[120px]" />
        <div className="absolute -right-32 top-2/3 h-[400px] w-[400px] rounded-full bg-[hsl(260_50%_30%/0.05)] blur-[100px]" />
        <div className="absolute left-1/3 top-0 h-[300px] w-[600px] rounded-full bg-[hsl(200_60%_25%/0.04)] blur-[140px]" />
      </div>

      <div className="sticky top-0 h-screen shrink-0 z-20 hidden md:block">
        <SideNav user={user} activeItem="projects" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-w-0 flex-1">
        <HeroSection />
        <TimelineSection milestones={MILESTONES} />
        <FooterStats milestones={MILESTONES} />
      </div>
    </div>
  );
}

/* ── Hero ── */

function HeroSection() {
  return (
    <section className="flex min-h-[85vh] flex-col items-center justify-center px-4 text-center">
      <div className="tl-hero-enter">
        {/* Orbital decoration */}
        <div className="relative mx-auto mb-8 h-28 w-28">
          <div className="absolute inset-0 rounded-full border border-sky-400/20 tl-orbit" />
          <div className="absolute -inset-3 rounded-full border border-dashed border-indigo-400/10 tl-orbit-slow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="h-10 w-10 rounded-full bg-sky-500/20 tl-glow-pulse"
              style={{ boxShadow: "0 0 40px 8px rgba(56,189,248,0.15)" }}
            />
            <Zap className="absolute h-5 w-5 text-sky-400" />
          </div>
          {/* Orbiting dot */}
          <div className="absolute inset-0 tl-orbit">
            <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-sky-400 shadow-[0_0_8px_2px_rgba(56,189,248,0.5)]" />
          </div>
        </div>

        <p className="mb-4 text-xs font-medium uppercase tracking-[0.38em] text-sky-300/75 sm:text-sm">
          产品二部UI资产库
        </p>
        <h1 className="bg-gradient-to-b from-white via-white/90 to-white/40 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
          项目历程
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
          记录产品二部 UI 资产库从基础能力建设到协作与智能化演进的关键节点
        </p>
      </div>

      {/* Scroll hint */}
      <div className="mt-16 tl-scroll-hint">
        <ChevronDown className="mx-auto h-5 w-5 text-slate-500" />
      </div>
    </section>
  );
}

/* ── Timeline ── */

function TimelineSection({ milestones }: { milestones: Milestone[] }) {
  return (
    <section className="relative mx-auto max-w-5xl px-4 pb-32">
      {/* Center energy line */}
      <div className="absolute left-1/2 top-0 bottom-0 hidden -translate-x-1/2 md:block">
        <EnergyLine count={milestones.length} />
      </div>
      {/* Mobile center line */}
      <div className="absolute left-8 top-0 bottom-0 md:hidden">
        <div className="h-full w-px bg-gradient-to-b from-transparent via-sky-500/20 to-transparent" />
      </div>

      <div className="relative space-y-16 md:space-y-24">
        {milestones.map((ms, i) => (
          <MilestoneNode key={ms.id} milestone={ms} index={i} />
        ))}
      </div>
    </section>
  );
}

/* ── Energy Line (SVG) ── */

function EnergyLine({ count }: { count: number }) {
  const lineRef = useRef<SVGSVGElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = lineRef.current?.parentElement;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height;
      const visible = Math.min(Math.max(-rect.top, 0), total);
      setScrollProgress(visible / total);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const height = count * 280 + 200;
  const lineLength = height - 40;
  const litLength = lineLength * scrollProgress;

  return (
    <svg ref={lineRef} width="2" height={height} className="overflow-visible">
      {/* Base dim line */}
      <line x1="1" y1="20" x2="1" y2={height - 20} stroke="rgba(56,189,248,0.08)" strokeWidth="1" />
      {/* Lit portion */}
      <line
        x1="1"
        y1="20"
        x2="1"
        y2={20 + litLength}
        stroke="url(#energyGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Glow */}
      <line
        x1="1"
        y1="20"
        x2="1"
        y2={20 + litLength}
        stroke="rgba(56,189,248,0.15)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Milestone Node ── */

function MilestoneNode({ milestone, index }: { milestone: Milestone; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const isLeft = index % 2 === 0;
  const cfg = STATUS_CONFIG[milestone.status];
  const Icon = cfg.icon;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const formattedDate = new Date(milestone.date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
  });

  return (
    <div
      ref={ref}
      className={`relative flex items-start gap-6 md:gap-0 ${
        isLeft ? "md:flex-row" : "md:flex-row-reverse"
      }`}
    >
      {/* ── Card ── */}
      <div
        className={`ml-16 flex-1 md:ml-0 md:w-[calc(50%-40px)] ${
          visible
            ? isLeft
              ? "tl-node-visible-left"
              : "tl-node-visible-right"
            : "opacity-0"
        }`}
        style={{ animationDelay: `${index * 0.08}s` }}
      >
        <div
          className={`group relative overflow-hidden rounded-lg border border-white/[0.04] bg-[#0d1220]/80 p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.08] hover:bg-[#0f1525]/90 ${cfg.ring} ring-1 ring-inset`}
        >
          {/* Top glow accent */}
          <div
            className="absolute -top-px left-4 right-4 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${cfg.glow}40, transparent)`,
            }}
          />

          {/* Date */}
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            {formattedDate}
          </div>

          {/* Title + Status */}
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white/90">{milestone.title}</h3>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.color} bg-current/10`}
              style={{ backgroundColor: `${cfg.glow}15` }}
            >
              <Icon className={`h-3 w-3 ${milestone.status === "in_progress" ? "animate-spin" : ""}`} />
              {cfg.label}
            </span>
          </div>

          {/* Description */}
          <p className="mb-4 text-sm leading-relaxed text-slate-400">{milestone.description}</p>

          {/* Highlights */}
          {milestone.highlights && milestone.highlights.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {milestone.highlights.map((h) => (
                <span
                  key={h}
                  className="rounded-md bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400 ring-1 ring-inset ring-white/[0.04] transition-colors duration-200 hover:bg-white/[0.07]"
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* Participants */}
          {milestone.participants && milestone.participants.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Users className="h-3.5 w-3.5" />
              <div className="flex -space-x-1.5">
                {milestone.participants.map((p) => (
                  <span
                    key={p}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700/80 text-[10px] font-medium text-slate-300 ring-1 ring-[#0d1220]"
                    title={p}
                  >
                    {p[0]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Center node dot (Desktop) ── */}
      <div className="absolute left-1/2 hidden -translate-x-1/2 md:flex">
        <div className="relative flex h-10 w-10 items-center justify-center">
          {/* Outer ring */}
          {milestone.status === "in_progress" && (
            <div
              className="absolute inset-0 rounded-full tl-breathe"
              style={{ color: cfg.glow }}
            />
          )}
          <div
            className={`relative flex h-5 w-5 items-center justify-center rounded-full ${
              milestone.status === "planned" ? "border border-dashed border-slate-600 bg-transparent" : cfg.bg
            }`}
            style={
              milestone.status !== "planned"
                ? { boxShadow: `0 0 16px -2px ${cfg.glow}` }
                : undefined
            }
          >
            {milestone.status === "completed" && (
              <CheckCircle2 className="h-3 w-3 text-white" />
            )}
            {milestone.status === "in_progress" && (
              <div className="h-2 w-2 rounded-full bg-white" />
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile node dot ── */}
      <div className="absolute left-8 top-2 flex -translate-x-1/2 md:hidden">
        <div
          className={`h-4 w-4 rounded-full ${
            milestone.status === "planned" ? "border border-dashed border-slate-600" : cfg.bg
          }`}
          style={
            milestone.status !== "planned"
              ? { boxShadow: `0 0 12px -2px ${cfg.glow}` }
              : undefined
          }
        />
      </div>

      {/* ── Spacer for opposite side (Desktop) ── */}
      <div className="hidden flex-1 md:block md:w-[calc(50%-40px)]" />
    </div>
  );
}

/* ── Footer Stats ── */

function FooterStats({ milestones }: { milestones: Milestone[] }) {
  const completed = milestones.filter((m) => m.status === "completed").length;
  const inProgress = milestones.filter((m) => m.status === "in_progress").length;
  const planned = milestones.filter((m) => m.status === "planned").length;

  const stats = [
    { label: "已完成", value: completed, color: "#38bdf8" },
    { label: "进行中", value: inProgress, color: "#fbbf24" },
    { label: "规划中", value: planned, color: "#64748b" },
  ];

  return (
    <section className="relative z-10 mx-auto max-w-2xl px-4 pb-20">
      <div className="flex items-center justify-center gap-8 rounded-lg border border-white/[0.04] bg-[#0d1220]/60 px-6 py-5 backdrop-blur-sm">
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            {i > 0 && <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-700 to-transparent" />}
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
