"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Asset } from "@/types";

interface MasonryBoardProps {
  assets: Asset[];
  showCardMeta?: boolean;
  renderAsset: (asset: Asset) => ReactNode;
}

interface MasonryLayout {
  columnCount: number;
  gap: number;
  columnWidth: number;
}

const META_CARD_INFO_HEIGHT = 118;

const ASPECT_RATIO_HEIGHT_MAP: Record<string, number> = {
  "1:1": 1,
  "4:3": 3 / 4,
  "3:4": 4 / 3,
  "16:9": 9 / 16,
  "9:16": 16 / 9,
  "4:1": 1 / 4,
  "1:4": 4,
  "2:1": 1 / 2,
  "1:2": 2,
  "2:3": 3 / 2,
  "3:2": 2 / 3,
  circle: 1,
  custom: 1.08,
};

function getGap(containerWidth: number) {
  return 12;
}

function getColumnCount(containerWidth: number) {
  if (containerWidth < 520) return 1;
  if (containerWidth < 768) return 2;
  if (containerWidth < 1024) return 3;
  if (containerWidth < 1280) return 4;
  if (containerWidth < 1536) return 5;
  if (containerWidth < 1760) return 6;
  return 7;
}

function getEstimatedVisualRatio(asset: Asset) {
  if (asset.width_px && asset.height_px && asset.width_px > 0) {
    return asset.height_px / asset.width_px;
  }

  if (asset.aspect_ratio && ASPECT_RATIO_HEIGHT_MAP[asset.aspect_ratio]) {
    return ASPECT_RATIO_HEIGHT_MAP[asset.aspect_ratio];
  }

  if (asset.orientation === "portrait") return 1.35;
  if (asset.orientation === "square" || asset.orientation === "circle") return 1;
  if (asset.orientation === "landscape") return 0.72;

  return 1.08;
}

function getEstimatedCardHeight(asset: Asset, columnWidth: number, showCardMeta: boolean) {
  const visualHeight = columnWidth * getEstimatedVisualRatio(asset);
  return visualHeight + (showCardMeta ? META_CARD_INFO_HEIGHT : 0);
}

function buildColumns(assets: Asset[], layout: MasonryLayout, showCardMeta: boolean) {
  const columns = Array.from({ length: layout.columnCount }, () => [] as Asset[]);
  const heights = Array.from({ length: layout.columnCount }, () => 0);

  for (const asset of assets) {
    let shortestColumnIndex = 0;

    for (let index = 1; index < heights.length; index += 1) {
      if (heights[index] < heights[shortestColumnIndex]) {
        shortestColumnIndex = index;
      }
    }

    columns[shortestColumnIndex].push(asset);
    heights[shortestColumnIndex] +=
      getEstimatedCardHeight(asset, layout.columnWidth, showCardMeta) + layout.gap;
  }

  return columns;
}

export default function MasonryBoard({
  assets,
  showCardMeta = true,
  renderAsset,
}: MasonryBoardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateWidth = (nextWidth: number) => {
      startTransition(() => {
        setContainerWidth((currentWidth) => {
          const roundedWidth = Math.floor(nextWidth);
          return currentWidth === roundedWidth ? currentWidth : roundedWidth;
        });
      });
    };

    updateWidth(node.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      updateWidth(entry.contentRect.width);
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const gap = getGap(containerWidth);
  const columnCount = getColumnCount(containerWidth);
  const totalGapWidth = Math.max(0, columnCount - 1) * gap;
  const columnWidth =
    containerWidth > 0 ? Math.max(0, Math.floor((containerWidth - totalGapWidth) / columnCount)) : 0;
  const layout = { columnCount, gap, columnWidth };
  const columns = buildColumns(assets, layout, showCardMeta);

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="grid items-start"
        style={{
          gap: `${gap}px`,
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        }}
      >
        {columns.map((column, columnIndex) => (
          <div
            key={`masonry-column-${columnIndex}`}
            className="flex flex-col"
            style={{ gap: `${gap}px` }}
          >
            {column.map((asset) => renderAsset(asset))}
          </div>
        ))}
      </div>
    </div>
  );
}
