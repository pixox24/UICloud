"use client";

import { useEffect, useState } from "react";
import { Calendar, Download, Eye, FolderOpen, HardDrive, Layers, Palette, Tag, X } from "lucide-react";
import { getPreferredThumbnailPath } from "@/lib/asset-options";
import { formatFileSize } from "@/lib/utils";
import type { Asset } from "@/types";

interface Props {
  asset: Asset;
  onClose: () => void;
}

export default function AssetDetailModal({ asset, onClose }: Props) {
  const [viewCount, setViewCount] = useState(asset.view_count);
  const thumbnail = getPreferredThumbnailPath(asset);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg bg-secondary p-2 transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-t-2xl bg-secondary">
          {thumbnail ? (
            <img
              src={`/${thumbnail}`}
              alt={asset.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="text-center text-muted-foreground/30">
              <HardDrive className="mx-auto mb-2 h-16 w-16" />
              <p>暂无预览</p>
            </div>
          )}
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{asset.name}</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  v{asset.version}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {asset.file_type}
                </span>
              </div>
              {asset.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{asset.description}</p>
              ) : null}
            </div>

            <a
              href={`/api/download/${asset.id}`}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              下载
            </a>
          </div>

          <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
            <MetaItem icon={<Tag className="h-4 w-4" />} label="格式" value={asset.file_format} />
            <MetaItem icon={<HardDrive className="h-4 w-4" />} label="大小" value={formatFileSize(asset.file_size)} />
            <MetaItem icon={<Eye className="h-4 w-4" />} label="浏览" value={String(viewCount)} />
            <MetaItem icon={<Download className="h-4 w-4" />} label="下载" value={String(asset.download_count)} />
            <MetaItem
              icon={<Layers className="h-4 w-4" />}
              label="比例 / 方向"
              value={`${asset.aspect_ratio || "-"} / ${asset.orientation || "-"}`}
            />
            <MetaItem icon={<Palette className="h-4 w-4" />} label="颜色风格" value={asset.color_theme || "-"} />
            {asset.category_name ? (
              <MetaItem icon={<FolderOpen className="h-4 w-4" />} label="分类" value={asset.category_name} />
            ) : null}
            <MetaItem
              icon={<Calendar className="h-4 w-4" />}
              label="上传时间"
              value={new Date(asset.created_at).toLocaleDateString("zh-CN")}
            />
            <MetaItem
              icon={<Layers className="h-4 w-4" />}
              label="尺寸"
              value={asset.width_px && asset.height_px ? `${asset.width_px} × ${asset.height_px}px` : "-"}
            />
          </div>

          {asset.primary_color ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-4 py-3">
              <span
                className="h-8 w-8 rounded-full border border-white/50"
                style={{ backgroundColor: asset.primary_color }}
              />
              <div>
                <p className="text-xs text-muted-foreground">主色调</p>
                <p className="text-sm font-medium">{asset.primary_color}</p>
              </div>
            </div>
          ) : null}

          {asset.use_scenario.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">适用场景</p>
              <div className="flex flex-wrap gap-1.5">
                {asset.use_scenario.map((scenario) => (
                  <span
                    key={scenario}
                    className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                  >
                    {scenario}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {asset.tags.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">标签</p>
              <div className="flex flex-wrap gap-1.5">
                {asset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span>
        {label}：<span className="text-foreground">{value}</span>
      </span>
    </div>
  );
}
