"use client";

import { Download, Eye, FileText, Star } from "lucide-react";
import { getPreferredThumbnailPath } from "@/lib/asset-options";
import { formatFileSize } from "@/lib/utils";
import type { Asset } from "@/types";

interface AssetCardProps {
  asset: Asset;
  onSelect: (asset: Asset) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (assetId: number) => void;
  showMeta?: boolean;
}

export default function AssetCard({
  asset,
  onSelect,
  isFavorite,
  onToggleFavorite,
  showMeta = true,
}: AssetCardProps) {
  const thumbnail = getPreferredThumbnailPath(asset);

  const handleDownload = (event: React.MouseEvent) => {
    event.stopPropagation();
    window.location.href = `/api/download/${asset.id}`;
  };

  const handleFavorite = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(asset.id);
    }
  };

  return (
    <div
      onClick={() => onSelect(asset)}
      className="group relative cursor-pointer overflow-hidden rounded-[8px] bg-card/85 shadow-[0_16px_30px_-26px_rgba(0,0,0,0.95)] transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-card hover:shadow-[0_28px_55px_-28px_rgba(0,0,0,1)]"
    >
      <div className="relative overflow-hidden bg-secondary/80">
        {thumbnail ? (
          <img
            src={`/${thumbnail}`}
            alt={asset.name}
            className="block h-auto w-full"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        <div className="absolute right-3 top-3 flex gap-2">
          {onToggleFavorite ? (
            <button
              onClick={handleFavorite}
              className={`rounded-full p-2 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-200 ${
                isFavorite
                  ? "bg-yellow-400/18 text-yellow-300 opacity-100"
                  : "translate-y-1 bg-background/82 text-muted-foreground opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
              }`}
              title={isFavorite ? "取消收藏" : "收藏"}
            >
              <Star className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
            </button>
          ) : null}

          <button
            onClick={handleDownload}
            className="translate-y-1 rounded-full bg-primary px-3 py-2 text-primary-foreground opacity-0 shadow-[0_16px_26px_-18px_rgba(0,0,0,1)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
            title="下载源文件"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showMeta ? (
        <div className="space-y-2.5 px-3.5 pb-3.5 pt-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-medium leading-5 text-foreground/95">
              {asset.name}
            </h3>
            {asset.primary_color ? (
              <span
                className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-white/40 shadow-[0_0_0_3px_rgba(255,255,255,0.04)]"
                style={{ backgroundColor: asset.primary_color }}
                title={asset.primary_color}
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium tracking-[0.02em] text-primary">
              {asset.file_format}
            </span>
            <span className="rounded-full bg-secondary/90 px-2.5 py-1 text-muted-foreground">
              {asset.file_type}
            </span>
            {asset.aspect_ratio ? (
              <span className="rounded-full bg-secondary/90 px-2.5 py-1 text-muted-foreground">
                {asset.aspect_ratio}
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{formatFileSize(asset.file_size)}</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {asset.view_count}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
