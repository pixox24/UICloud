"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, Loader2, Search, X, Star } from "lucide-react";
import Header from "@/components/Header";
import AssetCard from "@/components/AssetCard";
import AssetDetailModal from "@/components/AssetDetailModal";
import Pagination from "@/components/Pagination";
import { useDebounce } from "@/lib/use-debounce";
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
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(search, 300);
  const [categoryId, setCategoryId] = useState(searchParams.get("category_id") || "");
  const [tagFilter, setTagFilter] = useState(searchParams.get("tag") || "");
  const [formatFilter, setFormatFilter] = useState(searchParams.get("format") || "");
  const [fileTypeFilter, setFileTypeFilter] = useState(searchParams.get("file_type") || "");
  const [orientationFilter, setOrientationFilter] = useState(searchParams.get("orientation") || "");
  const [aspectRatioFilter, setAspectRatioFilter] = useState(searchParams.get("aspect_ratio") || "");
  const [colorThemeFilter, setColorThemeFilter] = useState(searchParams.get("color_theme") || "");
  const [useScenarioFilter, setUseScenarioFilter] = useState(searchParams.get("use_scenario") || "");
  const [showFavorites, setShowFavorites] = useState(searchParams.get("favorites") === "1");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");

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

  const fetchFavorites = useCallback(() => {
    fetch("/api/favorites?favorites=1")
      .then((r) => r.json())
      .then((data) => {
        const ids = new Set<number>((data.assets || []).map((a: Asset) => a.id));
        setFavoriteIds(ids);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user, fetchFavorites]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAssets() {
      setLoading(true);

      if (showFavorites) {
        try {
          const response = await fetch("/api/favorites?favorites=1", {
            signal: controller.signal,
          });
          const data = await response.json();
          setAssets(data.assets || []);
          setTotalPages(1);
        } catch (error: unknown) {
          if (error instanceof Error && error.name !== "AbortError") {
            setAssets([]);
            setTotalPages(1);
          }
        } finally {
          setLoading(false);
        }
        return;
      }

      const params = new URLSearchParams({
        page: searchParams.get("page") || "1",
        limit: "20",
        sort: sortBy,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryId) params.set("category_id", categoryId);
      if (tagFilter) params.set("tag", tagFilter);
      if (formatFilter) params.set("format", formatFilter);
      if (fileTypeFilter) params.set("file_type", fileTypeFilter);
      if (orientationFilter) params.set("orientation", orientationFilter);
      if (aspectRatioFilter) params.set("aspect_ratio", aspectRatioFilter);
      if (colorThemeFilter) params.set("color_theme", colorThemeFilter);
      if (useScenarioFilter) params.set("use_scenario", useScenarioFilter);

      try {
        const response = await fetch(`/api/assets?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        setAssets(data.assets || []);
        setTotalPages(data.totalPages || 1);
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          setAssets([]);
          setTotalPages(1);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchAssets();

    return () => controller.abort();
  }, [
    searchParams,
    debouncedSearch,
    categoryId,
    tagFilter,
    formatFilter,
    fileTypeFilter,
    orientationFilter,
    aspectRatioFilter,
    colorThemeFilter,
    useScenarioFilter,
    showFavorites,
    sortBy,
  ]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

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
    setShowFavorites(false);
    setSortBy("newest");
    window.history.replaceState(null, "", window.location.pathname);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.delete("page");
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const toggleFavoritesView = () => {
    const next = !showFavorites;
    setShowFavorites(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("favorites", "1");
    } else {
      params.delete("favorites");
    }
    params.delete("page");
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const toggleFavorite = async (assetId: number) => {
    const isFav = favoriteIds.has(assetId);
    try {
      if (isFav) {
        await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId }),
        });
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(assetId);
          return next;
        });
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId }),
        });
        setFavoriteIds((prev) => new Set(prev).add(assetId));
      }
    } catch {
      // Silently fail
    }
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
    !!useScenarioFilter ||
    showFavorites;

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const displayTotalPages = showFavorites ? 1 : totalPages;

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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索名称、描述、标签"
                className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                updateFilter("category_id", event.target.value);
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
                setTagFilter(event.target.value);
                updateFilter("tag", event.target.value);
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
                setFormatFilter(event.target.value);
                updateFilter("format", event.target.value);
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
                setFileTypeFilter(event.target.value);
                updateFilter("file_type", event.target.value);
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
                setOrientationFilter(event.target.value);
                updateFilter("orientation", event.target.value);
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
                setAspectRatioFilter(event.target.value);
                updateFilter("aspect_ratio", event.target.value);
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
                setColorThemeFilter(event.target.value);
                updateFilter("color_theme", event.target.value);
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
                value={sortBy}
                onChange={(event) => handleSortChange(event.target.value)}
                className="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="newest">最新上传</option>
                <option value="downloads">最多下载</option>
                <option value="views">最多浏览</option>
              </select>

              <select
                value={useScenarioFilter}
                onChange={(event) => {
                  setUseScenarioFilter(event.target.value);
                  updateFilter("use_scenario", event.target.value);
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

              <button
                type="button"
                onClick={toggleFavoritesView}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  showFavorites
                    ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-400"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <Star className="h-4 w-4" fill={showFavorites ? "currentColor" : "none"} />
                收藏
              </button>

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
            {showFavorites ? (
              <>
                <Star className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p>暂无收藏的资产</p>
                <button
                  onClick={toggleFavoritesView}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  返回全部资产
                </button>
              </>
            ) : (
              <>
                <Filter className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p>没有匹配的资产</p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    重置筛选条件
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="columns-2 gap-4 space-y-4 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6">
            {assets.map((asset) => (
              <div key={asset.id} className="break-inside-avoid">
                <AssetCard
                  asset={asset}
                  onSelect={setSelectedAsset}
                  isFavorite={favoriteIds.has(asset.id)}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            ))}
          </div>
        )}

        <Pagination page={currentPage} totalPages={displayTotalPages} onPageChange={setPage} />
      </main>

      {selectedAsset ? (
        <AssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      ) : null}
    </div>
  );
}
