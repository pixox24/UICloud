"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Save, X, GripVertical, Loader2 } from "lucide-react";
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

  const fetchCategories = async () => {
    setLoading(true);
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data.categories || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const parentCategories = categories.filter((c) => !c.parent_id);

  const addCategory = async () => {
    if (!newName.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        parent_id: newParentId ? parseInt(newParentId) : null,
        sort_order: categories.length,
      }),
    });
    setNewName("");
    setNewParentId("");
    fetchCategories();
  };

  const saveEdit = async (id: number) => {
    await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: editName,
        parent_id: editParentId ? parseInt(editParentId) : null,
      }),
    });
    setEditingId(null);
    fetchCategories();
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("确定删除此分类？")) return;
    await fetch("/api/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchCategories();
  };

  const handleDragStart = (id: number) => setDragItem(id);

  const handleDrop = async (targetId: number) => {
    if (dragItem === null || dragItem === targetId) return;
    const newOrder = [...categories];
    const fromIdx = newOrder.findIndex((c) => c.id === dragItem);
    const toIdx = newOrder.findIndex((c) => c.id === targetId);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);

    // Update sort orders
    for (let i = 0; i < newOrder.length; i++) {
      await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newOrder[i].id, name: newOrder[i].name, parent_id: newOrder[i].parent_id, sort_order: i }),
      });
    }
    setDragItem(null);
    fetchCategories();
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditParentId(cat.parent_id ? String(cat.parent_id) : "");
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">分类管理</h1>

      {/* Add new */}
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
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(cat.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors ${cat.parent_id ? "ml-8" : ""}`}
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
