"use client";

import { useState, useEffect } from "react";
import { Loader2, Pencil, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/components/Toast";
import Pagination from "@/components/Pagination";
import { formatFileSize } from "@/lib/utils";
import type { Asset, Category } from "@/types";

interface EditFormData {
  name: string;
  description: string;
  category_id: number | string;
  tags: string;
  is_active: number;
}

export default function AssetsManagePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<EditFormData>({
    name: "",
    description: "",
    category_id: "",
    tags: "",
    is_active: 1,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { success, error: showError } = useToast();

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets?page=${page}&limit=20&all=1`);
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setAssets(data.assets || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      showError("加载资产失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || []));
  }, []);

  useEffect(() => { fetchAssets(); }, [page]);

  const startEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setEditData({
      name: asset.name,
      description: asset.description,
      category_id: asset.category_id || "",
      tags: asset.tags.join(", "),
      is_active: asset.is_active,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch("/api/assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          ...editData,
          category_id: editData.category_id || null,
          tags: editData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      setEditingId(null);
      success("保存成功");
      fetchAssets();
    } catch {
      showError("保存失败，请重试");
    }
  };

  const deleteAsset = async (id: number) => {
    if (!confirm("确定删除？")) return;
    try {
      const res = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("删除失败");
      success("删除成功");
      fetchAssets();
    } catch {
      showError("删除失败，请重试");
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
      if (!res.ok) throw new Error("操作失败");
      success(asset.is_active ? "已下架" : "已上架");
      fetchAssets();
    } catch {
      showError("操作失败，请重试");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">资产管理</h1>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">名称</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">分类</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">格式</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">大小</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">下载</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">状态</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    {editingId === asset.id ? (
                      <input
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-muted border border-border text-sm"
                      />
                    ) : (
                      <span className="font-medium">{asset.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {editingId === asset.id ? (
                      <select
                        value={editData.category_id}
                        onChange={(e) => setEditData({ ...editData, category_id: e.target.value })}
                        className="px-2 py-1 rounded bg-muted border border-border text-sm"
                      >
                        <option value="">无</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      asset.category_name || "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{asset.file_format}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatFileSize(asset.file_size)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{asset.download_count}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(asset)}
                      className={`text-xs px-2 py-0.5 rounded-full ${asset.is_active ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}
                    >
                      {asset.is_active ? "已上架" : "已下架"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === asset.id ? (
                        <>
                          <button onClick={saveEdit} className="p-1.5 rounded hover:bg-muted text-green-400"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(asset)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => deleteAsset(asset.id)} className="p-1.5 rounded hover:bg-muted text-destructive"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
