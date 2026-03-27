"use client";

import { useEffect, useState } from "react";
import { Filter, Loader2, Search, X } from "lucide-react";
import Header from "@/components/Header";
import AssetCard from "@/components/AssetCard";
import AssetDetailModal from "@/components/AssetDetailModal";
import {
  ASPECT_RATIO_OPTIONS,
  COLOR_THEME_OPTIONS,
  FILE_TYPE_OPTIONS,
  ORIENTATION_OPTIONS,
  USE_SCENARIO_OPTIONS,
} from "@/lib/asset-options";
import type { Asset, Category, Tag, User } from "@/types";

const FORMAT_OPTIONS = ["AI", "EPS", "PSD", "XD", "SKETCH", "FIG", "PNG", "JPG", "JPEG", "WEBP", "GIF", "SVG", "PDF"];

export default function BrowsePage() {
  const [user, setUser] = useState<User | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("");
  const [orientationFilter, setOrientationFilter] = useState("");
  const [aspectRatioFilter, setAspectRatioFilter] = useState("");
  const [colorThemeFilter, setColorThemeFilter] = useState("");
  const [useScenarioFilter, setUseScenarioFilter] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setUser(data.user));
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => setCategories(data.categories || []));
    fetch("/api/tags")
      .then((response) => response.json())
      .then((data) => setTags(data.tags || []));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAssets() {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (categoryId) params.set("category_id", categoryId);
      if (tagFilter) params.set("tag", tagFilter);
      if (formatFilter) params.set("format", formatFilter);
      if (fileTypeFilter) params.set("file_type", fileTypeFilter);
      if (orientationFilter) params.set("orientation", orientationFilter);
      if (aspectRatioFilter) params.set("aspect_ratio", aspectRatioFilter);
      if (colorThemeFilter) params.set("color_theme", colorThemeFilter);
      if (useScenarioFilter) params.set("use_scenario", useScenarioFilter);

      const response = await fetch(`/api/assets?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await response.json();

      setAssets(data.assets || []);
      setTotalPages(data.totalPages || 1);
      setLoading(false);
    }

    fetchAssets().catch((error) => {
      if (error.name !== "AbortError") {
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [
    page,
    search,
    categoryId,
    tagFilter,
    formatFilter,
    fileTypeFilter,
    orientationFilter,
    aspectRatioFilter,
    colorThemeFilter,
    useScenarioFilter,
  ]);

  const resetFilters = () => {
    setSearch("");
    setCategoryId("");
    setTagFilter("");
    setFormatFilter("");
    setFileTypeFilter("");
    setOrientationFilter("");
    setAspectRatioFilter("");
    setColorThemeFilter("");
    setUseScenarioFilter("");
    setPage(1);
  };

  const hasActiveFilters =
    !!search ||
    !!categoryId ||
    !!tagFilter ||
    !!formatFilter ||
    !!fileTypeFilter ||
    !!orientationFilter ||
    !!aspectRatioFilter ||
    !!colorThemeFilter ||
    !!useScenarioFilter;

  return (
    <div className="min-h-screen">
      <Header user={user} />

      <main className="container space-y-6 py-6">
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative block md:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="搜索名称、描述、标签"
                className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <select
              value={categoryId}
              onChange={(event) => {
                setPage(1);
                setCategoryId(event.target.value);
              }}
              className="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">全部分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={tagFilter}
              onChange={(event) => {
                setPage(1);
                setTagFilter(event.target.value);
              }}
              className="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">全部标签</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>

            <select
              value={formatFilter}
              onChange={(event) => {
                setPage(1);
                setFormatFilter(event.target.value);
              }}
              className="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">全部格式</option>
              {FORMAT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select
              value={fileTypeFilter}
              onChange={(event) => {
                setPage(1);
                setFileTypeFilter(event.target.value);
              }}
              className="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">全部文件类型</option>
              {FILE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={orientationFilter}
              onChange={(event) => {
                setPage(1);
                setOrientationFilter(event.target.value);
              }}
              className="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">全部方向</option>
              {ORIENTATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={aspectRatioFilter}
              onChange={(event) => {
                setPage(1);
                setAspectRatioFilter(event.target.value);
              }}
              className="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">全部比例</option>
              {ASPECT_RATIO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={colorThemeFilter}
              onChange={(event) => {
                setPage(1);
                setColorThemeFilter(event.target.value);
              }}
              className="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">全部颜色风格</option>
              {COLOR_THEME_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <select
                value={useScenarioFilter}
                onChange={(event) => {
                  setPage(1);
                  setUseScenarioFilter(event.target.value);
                }}
                className="min-w-0 flex-1 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">全部场景</option>
                {USE_SCENARIO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  重置
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : assets.length === 0 ? (
          <div className="py-32 text-center text-muted-foreground">
            <Filter className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>没有匹配的资产</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onSelect={setSelectedAsset} />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-md bg-secondary px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-30"
            >
              上一页
            </button>
            <span className="px-3 text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="rounded-md bg-secondary px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-30"
            >
              下一页
            </button>
          </div>
        ) : null}
      </main>

      {selectedAsset ? (
        <AssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      ) : null}
    </div>
  );
}
