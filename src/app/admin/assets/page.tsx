"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { useToast } from "@/components/Toast";
import Pagination from "@/components/Pagination";
import {
  ASSET_NAME_CATEGORY_CODES,
  ASSET_NAME_CATEGORY_CODE_LABELS,
  DEFAULT_ASSET_NAME_CATEGORY_CODE,
  parseAssetNameCategoryCode,
  type AssetNameCategoryCode,
} from "@/lib/asset-naming";
import { formatFileSize } from "@/lib/utils";
import type { Asset, Category } from "@/types";

interface EditFormData {
  name: string;
  description: string;
  category_id: number | string;
  tags: string;
  is_active: number;
  asset_name_category_code: AssetNameCategoryCode;
}

type BatchAction = "activate" | "deactivate" | "delete";

export default function AssetsManagePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState<BatchAction | null>(null);
  const [editData, setEditData] = useState<EditFormData>({
    name: "",
    description: "",
    category_id: "",
    tags: "",
    is_active: 1,
    asset_name_category_code: DEFAULT_ASSET_NAME_CATEGORY_CODE,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { success, error: showError } = useToast();
  const selectAllRef = useRef<HTMLInputElement>(null);

  const allSelectedOnPage = useMemo(
    () => assets.length > 0 && selectedIds.length === assets.length,
    [assets.length, selectedIds.length]
  );
  const hasPartialSelection = selectedIds.length > 0 && !allSelectedOnPage;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasPartialSelection;
    }
  }, [hasPartialSelection]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets?page=${page}&limit=20&all=1`);
      if (!res.ok) {
        throw new Error("加载失败");
      }

      const data = await res.json();
      setAssets(data.assets || []);
      setTotalPages(data.totalPages || 1);
      setSelectedIds([]);
    } catch {
      showError("加载资产失败，请重试。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [page]);

  const startEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setEditData({
      name: asset.name,
      description: asset.description,
      category_id: asset.category_id || "",
      tags: asset.tags.join(", "),
      is_active: asset.is_active,
      asset_name_category_code:
        parseAssetNameCategoryCode(asset.name) || DEFAULT_ASSET_NAME_CATEGORY_CODE,
    });
  };

  const saveEdit = async (regenerateName = false) => {
    if (!editingId) {
      return;
    }

    try {
      const res = await fetch("/api/assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          ...editData,
          category_id: editData.category_id || null,
          tags: editData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          regenerate_name: regenerateName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "保存失败");
      }

      setEditData((current) => ({ ...current, name: data.assetName || current.name }));
      setEditingId(null);
      success(regenerateName ? "已按规则重新命名。" : "保存成功。");
      fetchAssets();
    } catch {
      showError(regenerateName ? "重新命名失败，请重试。" : "保存失败，请重试。");
    }
  };

  const deleteAsset = async (id: number) => {
    if (!confirm("确定要删除这个资产吗？")) {
      return;
    }

    try {
      const res = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error("删除失败");
      }

      success("删除成功。");
      fetchAssets();
    } catch {
      showError("删除失败，请重试。");
    }
  };

  const toggleActive = async (asset: Asset) => {
    try {
      const res = await fetch("/api/assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset.id,
          name: asset.name,
          description: asset.description,
          category_id: asset.category_id,
          is_active: asset.is_active ? 0 : 1,
        }),
      });

      if (!res.ok) {
        throw new Error("操作失败");
      }

      success(asset.is_active ? "已下架。" : "已上架。");
      fetchAssets();
    } catch {
      showError("操作失败，请重试。");
    }
  };

  const toggleSelect = (assetId: number) => {
    setSelectedIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : current.concat(assetId)
    );
  };

  const toggleSelectAll = () => {
    if (allSelectedOnPage) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(assets.map((asset) => asset.id));
  };

  const runBatchAction = async (action: BatchAction) => {
    if (!selectedIds.length) {
      return;
    }

    if (
      action === "delete" &&
      !confirm(`确定要删除选中的 ${selectedIds.length} 个资产吗？此操作不可恢复。`)
    ) {
      return;
    }

    setBatchActionLoading(action);

    try {
      if (action === "delete") {
        const res = await fetch("/api/assets", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "批量删除失败");
        }

        success(`已删除 ${data.deletedCount || selectedIds.length} 个资产。`);
      } else {
        const nextActive = action === "activate" ? 1 : 0;
        const res = await fetch("/api/assets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds, is_active: nextActive }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "批量操作失败");
        }

        success(
          action === "activate"
            ? `已批量上架 ${data.updatedCount || selectedIds.length} 个资产。`
            : `已批量下架 ${data.updatedCount || selectedIds.length} 个资产。`
        );
      }

      fetchAssets();
    } catch {
      showError(
        action === "delete"
          ? "批量删除失败，请重试。"
          : action === "activate"
            ? "批量上架失败，请重试。"
            : "批量下架失败，请重试。"
      );
    } finally {
      setBatchActionLoading(null);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">资产管理</h1>

      {selectedIds.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-4 py-3">
          <div className="text-sm text-muted-foreground">
            已选中 <span className="font-medium text-foreground">{selectedIds.length}</span> 个资产
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => runBatchAction("activate")}
              disabled={Boolean(batchActionLoading)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {batchActionLoading === "activate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              批量上架
            </button>

            <button
              type="button"
              onClick={() => runBatchAction("deactivate")}
              disabled={Boolean(batchActionLoading)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {batchActionLoading === "deactivate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              批量下架
            </button>

            <button
              type="button"
              onClick={() => runBatchAction("delete")}
              disabled={Boolean(batchActionLoading)}
              className="inline-flex items-center gap-2 rounded-lg border border-destructive/20 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {batchActionLoading === "delete" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              批量删除
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={Boolean(batchActionLoading)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              取消选择
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto overflow-hidden rounded-xl border border-border">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAll}
                    aria-label="全选当前页"
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">名称</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  分类
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">格式</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">缩略图</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  大小
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  下载
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {assets.map((asset) => {
                const selected = selectedIds.includes(asset.id);
                const thumbnailAvailable = hasThumbnail(asset);

                return (
                  <tr
                    key={asset.id}
                    className={`transition-colors hover:bg-secondary/50 ${
                      selected ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(asset.id)}
                        aria-label={`选择 ${asset.name}`}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                    </td>

                    <td className="px-4 py-3 align-top">
                      {editingId === asset.id ? (
                        <div className="space-y-2">
                          <input
                            value={editData.name}
                            onChange={(event) =>
                              setEditData((current) => ({ ...current, name: event.target.value }))
                            }
                            className="w-full rounded border border-border bg-muted px-2 py-1 text-sm"
                          />

                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={editData.asset_name_category_code}
                              onChange={(event) =>
                                setEditData((current) => ({
                                  ...current,
                                  asset_name_category_code: event.target.value as AssetNameCategoryCode,
                                }))
                              }
                              className="rounded border border-border bg-muted px-2 py-1 text-xs"
                            >
                              {ASSET_NAME_CATEGORY_CODES.map((code) => (
                                <option key={code} value={code}>
                                  {code} / {ASSET_NAME_CATEGORY_CODE_LABELS[code]}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => saveEdit(true)}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              按规则重命名
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="font-medium">{asset.name}</span>
                      )}
                    </td>

                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {editingId === asset.id ? (
                        <select
                          value={editData.category_id}
                          onChange={(event) =>
                            setEditData((current) => ({ ...current, category_id: event.target.value }))
                          }
                          className="rounded border border-border bg-muted px-2 py-1 text-sm"
                        >
                          <option value="">无</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        asset.category_name || "-"
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {asset.file_format}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex"
                        title={thumbnailAvailable ? "有缩略图" : "无缩略图"}
                        aria-label={thumbnailAvailable ? "有缩略图" : "无缩略图"}
                      >
                        {thumbnailAvailable ? (
                          <Check className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : (
                          <X className="mx-auto h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                    </td>

                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {formatFileSize(asset.file_size)}
                    </td>

                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {asset.download_count}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(asset)}
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          asset.is_active
                            ? "bg-green-500/10 text-green-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {asset.is_active ? "已上架" : "已下架"}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === asset.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(false)}
                              className="rounded p-1.5 text-green-500 hover:bg-muted"
                              title="保存"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                              title="取消"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(asset)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                              title="编辑"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteAsset(asset.id)}
                              className="rounded p-1.5 text-destructive hover:bg-muted"
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function hasThumbnail(asset: Asset) {
  return Boolean(
    asset.thumbnail_medium ||
      asset.thumbnail_path ||
      asset.thumbnail_original ||
      asset.thumbnail_large ||
      asset.thumbnail_small
  );
}
