"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Save, X, GripVertical, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const { success, error: showError } = useToast();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      showError("加载分类失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const parentCategories = categories.filter((c) => !c.parent_id);

  const addCategory = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          parent_id: newParentId ? parseInt(newParentId) : null,
          sort_order: categories.length,
        }),
      });
      if (!res.ok) throw new Error("添加失败");
      setNewName("");
      setNewParentId("");
      success("分类添加成功");
      fetchCategories();
    } catch {
      showError("添加分类失败");
    }
  };

  const saveEdit = async (id: number) => {
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: editName,
          parent_id: editParentId ? parseInt(editParentId) : null,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      setEditingId(null);
      success("保存成功");
      fetchCategories();
    } catch {
      showError("保存失败");
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("确定删除此分类？")) return;
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("删除失败");
      success("删除成功");
      fetchCategories();
    } catch {
      showError("删除分类失败");
    }
  };

  const handleDragStart = (id: number) => setDragItem(id);

  const handleDragEnter = (id: number) => setDragOverId(id);

  const handleDragEnd = () => {
    setDragItem(null);
    setDragOverId(null);
  };

  const handleDrop = async (targetId: number) => {
    if (dragItem === null || dragItem === targetId) return;
    const newOrder = [...categories];
    const fromIdx = newOrder.findIndex((c) => c.id === dragItem);
    const toIdx = newOrder.findIndex((c) => c.id === targetId);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);

    try {
      const updates = newOrder.map((cat, i) =>
        fetch("/api/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: cat.id, name: cat.name, parent_id: cat.parent_id, sort_order: i }),
        })
      );
      const results = await Promise.all(updates);
      const failed = results.some((r) => !r.ok);
      if (failed) throw new Error("部分更新失败");
      success("排序已更新");
    } catch {
      showError("排序更新失败");
    } finally {
      setDragItem(null);
      setDragOverId(null);
      fetchCategories();
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditParentId(cat.parent_id ? String(cat.parent_id) : "");
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">分类管理</h1>

      <div className="flex items-center gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新分类名称"
          className="flex-1 px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
        />
        <select
          value={newParentId}
          onChange={(e) => setNewParentId(e.target.value)}
          className="px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm"
        >
          <option value="">顶级分类</option>
          {parentCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={addCategory}
          className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> 添加
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => handleDragStart(cat.id)}
              onDragEnter={() => handleDragEnter(cat.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(cat.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-card border transition-colors ${
                dragOverId === cat.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/20"
              } ${cat.parent_id ? "ml-8" : ""}`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />

              {editingId === cat.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-2 py-1 rounded bg-muted border border-border text-sm"
                  />
                  <select
                    value={editParentId}
                    onChange={(e) => setEditParentId(e.target.value)}
                    className="px-2 py-1 rounded bg-muted border border-border text-sm"
                  >
                    <option value="">顶级</option>
                    {parentCategories.filter((c) => c.id !== cat.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button onClick={() => saveEdit(cat.id)} className="p-1.5 text-green-400 hover:bg-muted rounded"><Save className="w-4 h-4" /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{cat.name}</span>
                  {cat.parent_id && (
                    <span className="text-xs text-muted-foreground">
                      ← {parentCategories.find((p) => p.id === cat.parent_id)?.name}
                    </span>
                  )}
                  <button onClick={() => startEdit(cat)} className="p-1.5 text-muted-foreground hover:bg-muted rounded"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-destructive hover:bg-muted rounded"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
