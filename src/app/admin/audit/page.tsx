"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Pagination from "@/components/Pagination";

interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: "创建",
  update: "更新",
  delete: "删除",
};

const ENTITY_LABELS: Record<string, string> = {
  asset: "资产",
  category: "分类",
  user: "用户",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/audit?page=${page}&limit=50`);
        if (!res.ok) throw new Error("加载失败");
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">操作日志</h1>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">时间</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">用户</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">操作</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">{log.username || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      log.action === "create"
                        ? "bg-green-500/10 text-green-400"
                        : log.action === "delete"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {ACTION_LABELS[log.action] || log.action} {ENTITY_LABELS[log.entity_type] || log.entity_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">
                    {log.details || (log.entity_id ? `#${log.entity_id}` : "-")}
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
