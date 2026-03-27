"use client";

import { Download, Eye, FileText } from "lucide-react";
import { getPreferredThumbnailPath } from "@/lib/asset-options";
import { formatFileSize } from "@/lib/utils";
import type { Asset } from "@/types";

interface AssetCardProps {
  asset: Asset;
  onSelect: (asset: Asset) => void;
}

export default function AssetCard({ asset, onSelect }: AssetCardProps) {
  const thumbnail = getPreferredThumbnailPath(asset);

  const handleDownload = (event: React.MouseEvent) => {
    event.stopPropagation();
    window.location.href = `/api/download/${asset.id}`;
  };

  return (
    <div
      onClick={() => onSelect(asset)}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:scale-[1.02] hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="aspect-[4/3] overflow-hidden bg-secondary">
        {thumbnail ? (
          <img
            src={`/${thumbnail}`}
            alt={asset.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        <button
          onClick={handleDownload}
          className="absolute right-3 top-3 rounded-lg bg-primary p-2 text-primary-foreground opacity-0 shadow-lg transition-all duration-200 hover:scale-105 group-hover:opacity-100"
          title="下载源文件"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-medium">{asset.name}</h3>
          {asset.primary_color ? (
            <span
              className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-white/50"
              style={{ backgroundColor: asset.primary_color }}
              title={asset.primary_color}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
            {asset.file_format}
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
            {asset.file_type}
          </span>
          {asset.aspect_ratio ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
              {asset.aspect_ratio}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(asset.file_size)}</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {asset.view_count}
          </span>
        </div>
      </div>
    </div>
  );
}
