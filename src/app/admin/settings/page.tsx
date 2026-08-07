"use client";

import { useState, useRef, useEffect } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setLogoUrl(data.settings?.logo_url || "");
    } catch {
      showError("加载设置失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showError("请先选择 LOGO 图片");
      return;
    }

    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["png", "jpg", "jpeg", "svg"].includes(ext || "")) {
      showError("仅支持 png、jpg、jpeg、svg 格式");
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      showError("LOGO 文件最大支持 2MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/settings", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setLogoUrl(data.settings?.logo_url || "");
      success("LOGO 上传成功");
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("确定移除当前 LOGO？")) return;
    try {
      const res = await fetch("/api/settings", { method: "DELETE" });
      if (!res.ok) throw new Error("移除失败");
      setLogoUrl("");
      success("LOGO 已移除");
    } catch {
      showError("移除失败");
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">系统设置</h1>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold mb-1">站点 LOGO</h2>
        <p className="text-xs text-muted-foreground mb-4">
          用于首页顶部菜单栏左上角展示，支持 png、jpg、jpeg、svg，最大 2MB。
        </p>

        <div className="flex items-center gap-6">
          <div className="flex h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="当前 LOGO" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">未上传</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
              onChange={handleFileChange}
              className="block w-full max-w-xs text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-muted"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                上传
              </button>
              {logoUrl ? (
                <button
                  onClick={handleRemove}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  移除
                </button>
              ) : null}
            </div>
            {selectedFile ? (
              <p className="text-xs text-muted-foreground">已选择：{selectedFile.name}</p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ImagePlus className="h-3.5 w-3.5" />
                选择文件后点击上传
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
