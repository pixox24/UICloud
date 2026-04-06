"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Save, X, UserPlus, Key } from "lucide-react";
import { useToast } from "@/components/Toast";
import type { User } from "@/types";

interface UserWithDate extends User {
  created_at: string;
}

export default function UsersManagePage() {
  const [users, setUsers] = useState<UserWithDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [resetPassword, setResetPassword] = useState("");
  const { success, error: showError } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      showError("加载用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const addUser = async () => {
    if (!newUsername.trim() || !newPassword) {
      showError("用户名和密码不能为空");
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "添加失败");
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      setShowAdd(false);
      success("用户添加成功");
      fetchUsers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "添加失败");
    }
  };

  const saveRole = async (id: number) => {
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: editRole }),
      });
      if (!res.ok) throw new Error("保存失败");
      setEditingId(null);
      success("角色已更新");
      fetchUsers();
    } catch {
      showError("保存失败");
    }
  };

  const resetUserPassword = async (id: number) => {
    if (!resetPassword) {
      showError("请输入新密码");
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password: resetPassword }),
      });
      if (!res.ok) throw new Error("重置失败");
      setResetPassword("");
      success("密码已重置");
    } catch {
      showError("密码重置失败");
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("确定删除此用户？")) return;
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      success("用户已删除");
      fetchUsers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const startEdit = (user: UserWithDate) => {
    setEditingId(user.id);
    setEditRole(user.role);
    setResetPassword("");
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">用户管理</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <UserPlus className="w-4 h-4" /> 添加用户
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
          <h2 className="text-sm font-medium">新用户</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="用户名"
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="密码"
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "admin" | "user")}
                className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
              <button
                onClick={addUser}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
              >
                添加
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewUsername(""); setNewPassword(""); }}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{user.username}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    user.role === "admin"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {user.role === "admin" ? "管理员" : "用户"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  创建于 {new Date(user.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>

              {editingId === user.id ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as "admin" | "user")}
                    className="rounded-lg border border-border bg-secondary px-2 py-1 text-sm"
                  >
                    <option value="user">用户</option>
                    <option value="admin">管理员</option>
                  </select>
                  <button
                    onClick={() => saveRole(user.id)}
                    className="p-1.5 rounded hover:bg-muted text-green-400"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="新密码"
                      className="w-24 rounded border border-border bg-secondary px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => resetUserPassword(user.id)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                      title="重置密码"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(user)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                    title="编辑"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="p-1.5 rounded hover:bg-muted text-destructive"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
