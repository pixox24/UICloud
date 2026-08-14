"use client";

import { useEffect, useState } from "react";
import {
  Cable,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plug,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/Toast";

export default function ConnectionsPage() {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-image-2");
  const [enabled, setEnabled] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/ai-provider")
      .then((r) => r.json())
      .then((data) => {
        setConfigured(Boolean(data.configured));
        setBaseUrl(data.base_url || "");
        setModel(data.model || "gpt-image-2");
        setApiKey(data.api_key_masked || "");
        setEnabled(Boolean(data.enabled));
      })
      .catch(() => showError("加载配置失败"))
      .finally(() => setLoading(false));
  }, [showError]);

  const handleSave = async () => {
    if (!baseUrl.trim()) {
      showError("请填写 Base URL");
      return;
    }
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: baseUrl.trim(), api_key: apiKey.trim(), model: model.trim(), enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setConfigured(true);
      setApiKey(data.api_key_masked || "");
      success("配置已保存");
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!baseUrl.trim()) {
      showError("请先填写 Base URL");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai-provider/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: baseUrl.trim(), api_key: apiKey.trim(), model: model.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "连接失败");
      setTestResult({ ok: true, message: data.message || "连接成功" });
    } catch (err: unknown) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : "连接失败" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">系统连接配置</h1>

      {/* Status banner */}
      {!loading && (
        <div
          className={`mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            configured && enabled
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : configured
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-border bg-card text-muted-foreground"
          }`}
        >
          {configured && enabled ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : configured ? (
            <Cable className="h-4 w-4 shrink-0" />
          ) : (
            <Plug className="h-4 w-4 shrink-0" />
          )}
          <span>
            {!configured
              ? "尚未配置模型提供商，AI 图像引擎将使用演示模式生成。"
              : enabled
                ? "模型提供商已启用，AI 图像引擎将调用真实生图接口。"
                : "模型提供商已保存但处于停用状态，AI 图像引擎将使用演示模式。"}
          </span>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Cable className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">AI 模型提供商</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              配置 OpenAI 兼容的生图服务（<code className="rounded bg-secondary px-1 py-0.5">/images/generations</code>
              ），填写 Base URL 与 API Key 后即可在「AI 图像引擎」中使用真实生图模型。API Key 仅保存在服务端。
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={loading}
              placeholder="https://your-provider.com/v1"
              className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              例如 <code className="rounded bg-secondary px-1 py-0.5">https://api.example.com/v1</code>，系统会自动拼接
              <code className="rounded bg-secondary px-1 py-0.5">/images/generations</code>。
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={loading}
                placeholder="sk-..."
                className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow disabled:opacity-60"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                title={showKey ? "隐藏密钥" : "显示密钥"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              留空或保持脱敏值不变则保留原有密钥。
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">模型名称</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={loading}
              placeholder="gpt-image-2"
              className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow disabled:opacity-60"
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              文档示例使用的模型 ID 为 <code className="rounded bg-secondary px-1 py-0.5">gpt-image-2</code>，请按提供商文档填写。
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                启用该提供商
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                停用时 AI 图像引擎自动回退到演示模式
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full p-1 transition-colors duration-200 ${
                enabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {testResult ? (
            <div
              className={`flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-sm ${
                testResult.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          ) : null}

          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存配置
            </button>
            <button
              onClick={handleTest}
              disabled={testing || loading}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground active:scale-95 disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              {testing ? "测试中..." : "测试连接"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
