"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Calendar,
  Download,
  Eye,
  FolderOpen,
  HardDrive,
  Layers,
  Maximize2,
  Palette,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { getPreferredThumbnailPath } from "@/lib/asset-options";
import { formatFileSize } from "@/lib/utils";
import type { Asset } from "@/types";

interface Props {
  asset: Asset;
  onClose: () => void;
}

export default function AssetDetailModal({ asset, onClose }: Props) {
  const [viewCount, setViewCount] = useState(asset.view_count);
  const [closing, setClosing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const thumbnail = getPreferredThumbnailPath(asset);

  /* ── View count ── */
  useEffect(() => {
    let active = true;

    fetch(`/api/assets/${asset.id}/view`, { method: "POST" })
      .then((response) => response.json())
      .then(() => {
        if (active) {
          setViewCount((current) => current + 1);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [asset.id]);

  /* ── Close with exit animation ── */
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 220);
  }, [onClose]);

  /* ── Escape key & scroll lock ── */
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [handleClose]);

  /* ── Derived data ── */
  const hasDimensions = asset.width_px && asset.height_px;
  const uploadDate = new Date(asset.created_at).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-md ${closing ? "modal-overlay-exit" : "modal-overlay-enter"}`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`modal-scroll relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-card shadow-[0_32px_80px_-20px_rgba(0,0,0,0.8)] ${closing ? "modal-panel-exit" : "modal-panel-enter"}`}
      >
        {/* ─── Close Button ─── */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 text-white/70 backdrop-blur-md transition-all duration-200 hover:bg-black/60 hover:text-white"
          title="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ─── Hero Image ─── */}
        <div className="relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-b from-secondary via-secondary/80 to-card" style={{ minHeight: "280px", maxHeight: "50vh" }}>
          {thumbnail ? (
            <>
              {/* Ambient glow behind image */}
              <div
                className="absolute inset-0 scale-110 opacity-30 blur-3xl"
                style={{
                  backgroundImage: `url(/${thumbnail})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <img
                src={`/${thumbnail}`}
                alt={asset.name}
                className={`relative z-10 max-h-[50vh] max-w-full object-contain transition-all duration-700 ${imageLoaded ? "scale-100 opacity-100" : "scale-[1.02] opacity-0"}`}
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground/25">
              <HardDrive className="h-16 w-16" />
              <p className="text-sm tracking-wide">暂无预览</p>
            </div>
          )}

          {/* Bottom fade into content */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent" />

          {/* Floating dimension badge */}
          {hasDimensions ? (
            <div className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5 rounded-lg bg-black/40 px-2.5 py-1 text-[11px] text-white/60 backdrop-blur-md">
              <Maximize2 className="h-3 w-3" />
              {asset.width_px} × {asset.height_px}
            </div>
          ) : null}
        </div>

        {/* ─── Content ─── */}
        <div className="modal-content-stagger flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
          {/* Header: title + download */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold leading-tight tracking-[-0.01em] text-foreground sm:text-2xl">
                {asset.name}
              </h2>
              {asset.description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {asset.description}
                </p>
              ) : null}
            </div>

            <a
              href={`/api/download/${asset.id}`}
              className="group/dl flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)] transition-all duration-200 hover:shadow-[0_0_28px_-4px_hsl(var(--primary)/0.6)] hover:brightness-110 active:scale-[0.98]"
            >
              <Download className="h-4 w-4 transition-transform duration-200 group-hover/dl:-translate-y-0.5" />
              下载
            </a>
          </div>

          {/* Badges row */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              v{asset.version}
            </span>
            <span className="rounded-lg bg-secondary px-3 py-1 text-xs text-muted-foreground">
              {asset.file_format}
            </span>
            <span className="rounded-lg bg-secondary px-3 py-1 text-xs text-muted-foreground">
              {asset.file_type}
            </span>
            {asset.aspect_ratio ? (
              <span className="rounded-lg bg-secondary px-3 py-1 text-xs text-muted-foreground">
                {asset.aspect_ratio}
              </span>
            ) : null}
          </div>

          {/* Divider */}
          <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Meta Grid */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <MetaItem
              icon={<HardDrive className="h-4 w-4" />}
              label="文件大小"
              value={formatFileSize(asset.file_size)}
            />
            <MetaItem
              icon={<Eye className="h-4 w-4" />}
              label="浏览量"
              value={String(viewCount)}
            />
            <MetaItem
              icon={<Download className="h-4 w-4" />}
              label="下载量"
              value={String(asset.download_count)}
            />
            {asset.color_theme ? (
              <MetaItem
                icon={<Palette className="h-4 w-4" />}
                label="色彩风格"
                value={asset.color_theme}
              />
            ) : null}
            {asset.orientation ? (
              <MetaItem
                icon={<Layers className="h-4 w-4" />}
                label="方向"
                value={asset.orientation}
              />
            ) : null}
            {asset.category_name ? (
              <MetaItem
                icon={<FolderOpen className="h-4 w-4" />}
                label="分类"
                value={asset.category_name}
              />
            ) : null}
            <MetaItem
              icon={<Calendar className="h-4 w-4" />}
              label="上传于"
              value={uploadDate}
            />
          </div>

          {/* Primary Color */}
          {asset.primary_color ? (
            <>
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="flex items-center gap-2">
                <span
                  className="h-8 w-8 rounded-lg border border-white/10 shadow-[0_0_12px_-2px_var(--swatch-color)]"
                  style={
                    {
                      backgroundColor: asset.primary_color,
                      "--swatch-color": asset.primary_color,
                    } as React.CSSProperties
                  }
                />
                <div>
                  <p className="text-xs text-muted-foreground">主色调</p>
                  <p className="text-sm font-medium tracking-wide text-foreground">
                    {asset.primary_color}
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {/* Use Scenarios */}
          {asset.use_scenario.length > 0 ? (
            <>
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  适用场景
                </div>
                <div className="flex flex-wrap gap-2">
                  {asset.use_scenario.map((scenario) => (
                    <span
                      key={scenario}
                      className="rounded-lg bg-primary/[0.07] px-3 py-1.5 text-xs text-primary/90 ring-1 ring-inset ring-primary/10 transition-colors duration-200 hover:bg-primary/[0.12]"
                    >
                      {scenario}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {/* Tags */}
          {asset.tags.length > 0 ? (
            <>
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  标签
                </div>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-secondary-foreground/80 ring-1 ring-inset ring-white/[0.04] transition-colors duration-200 hover:bg-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Meta Item ── */
function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 ring-1 ring-inset ring-white/[0.03] transition-colors duration-200 hover:bg-secondary/80">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
