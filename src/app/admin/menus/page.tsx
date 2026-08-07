"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Save, X, GripVertical, Loader2, Power } from "lucide-react";
import { useToast } from "@/components/Toast";
import { MenuIcon, MENU_ICONS } from "@/components/menu-icons";
import type { Menu } from "@/types";

export default function MenusManagePage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editIcon, setEditIcon] = useState<Menu["icon"]>("link");
  const [editUrl, setEditUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newIcon, setNewIcon] = useState<Menu["icon"]>("link");
  const [newUrl, setNewUrl] = useState("");
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const { success, error: showError } = useToast();

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/menus");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setMenus(data.menus || []);
    } catch {
      showError("加载菜单失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenus(); }, []);

  const addMenu = async () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      showError("标题和网址不能为空");
      return;
    }
    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          icon: newIcon,
          url: newUrl.trim(),
          sort_order: menus.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "添加失败");
      setNewTitle("");
      setNewIcon("link");
      setNewUrl("");
      success("菜单添加成功");
      fetchMenus();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "添加菜单失败");
    }
  };

  const saveEdit = async (id: number) => {
    if (!editTitle.trim() || !editUrl.trim()) {
      showError("标题和网址不能为空");
      return;
    }
    try {
      const res = await fetch("/api/menus", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title: editTitle.trim(),
          icon: editIcon,
          url: editUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setEditingId(null);
      success("保存成功");
      fetchMenus();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "保存失败");
    }
  };

  const deleteMenu = async (id: number) => {
    if (!confirm("确定删除此菜单？")) return;
    try {
      const res = await fetch("/api/menus", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("删除失败");
      success("删除成功");
      fetchMenus();
    } catch {
      showError("删除菜单失败");
    }
  };

  const toggleActive = async (menu: Menu) => {
    try {
      const res = await fetch("/api/menus", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: menu.id,
          title: menu.title,
          icon: menu.icon,
          url: menu.url,
          sort_order: menu.sort_order,
          is_active: menu.is_active ? 0 : 1,
        }),
      });
      if (!res.ok) throw new Error("更新失败");
      success(menu.is_active ? "已停用" : "已启用");
      fetchMenus();
    } catch {
      showError("更新失败");
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
    const newOrder = [...menus];
    const fromIdx = newOrder.findIndex((m) => m.id === dragItem);
    const toIdx = newOrder.findIndex((m) => m.id === targetId);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);

    try {
      const updates = newOrder.map((menu, i) =>
        fetch("/api/menus", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: menu.id,
            title: menu.title,
            icon: menu.icon,
            url: menu.url,
            sort_order: i,
            is_active: menu.is_active,
          }),
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
      fetchMenus();
    }
  };

  const startEdit = (menu: Menu) => {
    setEditingId(menu.id);
    setEditTitle(menu.title);
    setEditIcon(menu.icon);
    setEditUrl(menu.url);
  };

  const renderIconPicker = (value: Menu["icon"], onChange: (value: Menu["icon"]) => void) => (
    <div className="flex items-center gap-1.5">
      {MENU_ICONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          title={label}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
            value === id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          <MenuIcon id={id} className="h-4 w-4" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">菜单管理</h1>

      <div className="space-y-2 mb-6 rounded-xl border border-border p-4 bg-card">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="菜单标题（如：内部文档）"
          className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="跳转网址（如：/admin 或 https://example.com）"
          className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => e.key === "Enter" && addMenu()}
        />
        <div className="flex items-center justify-between gap-3">
          {renderIconPicker(newIcon, setNewIcon)}
          <button
            onClick={addMenu}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> 添加
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-1">
          {menus.map((menu) => (
            <div
              key={menu.id}
              draggable
              onDragStart={() => handleDragStart(menu.id)}
              onDragEnter={() => handleDragEnter(menu.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(menu.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-card border transition-colors ${
                dragOverId === menu.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/20"
              } ${menu.is_active ? "" : "opacity-60"}`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />

              <button
                onClick={() => toggleActive(menu)}
                title={menu.is_active ? "停用" : "启用"}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 transition-colors ${
                  menu.is_active
                    ? "border-green-500/40 bg-green-500/10 text-green-500"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Power className="w-4 h-4" />
              </button>

              {editingId === menu.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 space-y-1.5">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="菜单标题"
                      className="w-full px-2 py-1 rounded bg-muted border border-border text-sm"
                    />
                    <input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="跳转网址"
                      className="w-full px-2 py-1 rounded bg-muted border border-border text-sm"
                    />
                    {renderIconPicker(editIcon, setEditIcon)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => saveEdit(menu.id)} className="p-1.5 text-green-400 hover:bg-muted rounded"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="flex items-center gap-2 flex-1 text-sm font-medium">
                    <MenuIcon id={menu.icon} className="w-4 h-4 text-primary" />
                    {menu.title}
                  </span>
                  <span className="max-w-[180px] truncate text-xs text-muted-foreground">
                    {menu.url}
                  </span>
                  <span className={`shrink-0 text-xs ${menu.is_active ? "text-green-500" : "text-muted-foreground"}`}>
                    {menu.is_active ? "已启用" : "已停用"}
                  </span>
                  <button onClick={() => startEdit(menu)} className="p-1.5 text-muted-foreground hover:bg-muted rounded"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteMenu(menu.id)} className="p-1.5 text-destructive hover:bg-muted rounded"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          ))}

          {menus.length === 0 && !loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无菜单，请在上方添加。</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
