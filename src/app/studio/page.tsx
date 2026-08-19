"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bookmark, RotateCcw, Sparkles, Wand2, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import SideNav from "@/components/SideNav";
import { PromptSection } from "@/components/ai-studio/PromptSection";
import { ReferenceUpload } from "@/components/ai-studio/ReferenceUpload";
import { SettingsSection } from "@/components/ai-studio/SettingsSection";
import { PreviewCanvas } from "@/components/ai-studio/PreviewCanvas";
import { HistoryDrawer } from "@/components/ai-studio/HistoryDrawer";
import { TemplateModal } from "@/components/ai-studio/TemplateModal";
import { LightboxModal } from "@/components/ai-studio/LightboxModal";
import { PROMPT_TEMPLATES } from "@/lib/ai-studio/templates";
import type {
  AIModelId,
  AspectRatio,
  GenerationMode,
  HistoryItem,
  PromptTemplate,
  Resolution,
} from "@/types/ai-studio";
import type { User } from "@/types";

const STORAGE_KEY_PREFIX = "ai_image_workbench_history_v2";
const PENDING_JOB_KEY_PREFIX = "ai_image_workbench_pending_job_v1";

export default function StudioPage() {
  return (
    <Suspense fallback={<StudioSkeleton />}>
      <StudioContent />
    </Suspense>
  );
}

function StudioContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") as GenerationMode | null;
  const validMode =
    initialMode === "image-edit" || initialMode === "text-to-image" || initialMode === "reference-image"
      ? initialMode
      : null;

  const [user, setUser] = useState<User | null>(null);

  // Workbench Generation Parameters
  const [mode, setMode] = useState<GenerationMode>(validMode ?? "image-edit");
  const [model, setModel] = useState<AIModelId>("gpt-image-2");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [resolution, setResolution] = useState<Resolution>("1K");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [generationStatus, setGenerationStatus] = useState<
    "idle" | "queued" | "generating" | "success" | "failed" | "content_rejected" | "interrupted" | "cancelled"
  >("idle");
  const [generationError, setGenerationError] = useState("");

  // Results & History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [currentResult, setCurrentResult] = useState<HistoryItem | null>(null);

  // Action status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Modals
  const [historyOpen, setHistoryOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUserData = async () => {
      try {
        const authResponse = await fetch("/api/auth/me");
        const authData = await authResponse.json();
        if (cancelled) return;
        const currentUser = authData.user
          ? ({
              id: authData.user.userId,
              username: authData.user.username,
              role: authData.user.role,
            } as User)
          : null;
        setUser(currentUser);
        if (!currentUser) {
          setHistoryReady(true);
          return;
        }

        const historyKey = `${STORAGE_KEY_PREFIX}:${currentUser.id}`;
        const pendingKey = `${PENDING_JOB_KEY_PREFIX}:${currentUser.id}`;
        const pendingJobId = localStorage.getItem(pendingKey);
        if (pendingJobId) setActiveJobId(pendingJobId);
        let cachedHistory: HistoryItem[] = [];
        try {
          const cached = localStorage.getItem(historyKey);
          if (cached) cachedHistory = JSON.parse(cached);
        } catch {
          cachedHistory = [];
        }
        if (cachedHistory.length > 0) setHistory(cachedHistory);

        try {
          const response = await fetch("/api/generate-image");
          const data = await response.json();
          if (response.ok && Array.isArray(data.jobs)) {
            setHistory(data.jobs);
            localStorage.setItem(historyKey, JSON.stringify(data.jobs));
          }
          if (!pendingJobId && response.ok && Array.isArray(data.activeJobs) && data.activeJobs[0]?.id) {
            setActiveJobId(String(data.activeJobs[0].id));
          }
        } catch {
          // Keep the user-scoped cache as an offline fallback.
        }
        setHistoryReady(true);
      } catch {
        if (!cancelled) setHistoryReady(true);
      }
    };

    void loadUserData();
    return () => {
      cancelled = true;
    };
  }, []);

  // 拉取后台配置的模型名称（系统连接配置）
  useEffect(() => {
    fetch("/api/ai-provider")
      .then((r) => r.json())
      .then((data) => {
        if (data.model) {
          setModel(data.model);
        }
        setProviderStatus(data.configured && data.enabled ? "ready" : "unavailable");
      })
      .catch(() => setProviderStatus("unavailable"));
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "history") setHistoryOpen(true);
    else if (tab === "templates") setTemplateOpen(true);
    const modeParam = searchParams.get("mode");
    if (modeParam === "image-edit" || modeParam === "text-to-image" || modeParam === "reference-image") {
      setMode(modeParam);
    }

    const templateId = searchParams.get("template");
    if (templateId) {
      const found = PROMPT_TEMPLATES.find((t) => t.id === templateId);
      if (found) {
        setPrompt(found.prompt);
        setMode(found.defaultMode);
        setAspectRatio(found.aspectRatio);
        if (found.sampleOriginalImage) {
          setReferenceImage(found.sampleOriginalImage);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cache only user-scoped metadata. The server remains the source of truth.
  useEffect(() => {
    if (!user || !historyReady) return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}:${user.id}`, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to persist history", e);
    }
  }, [history, historyReady, user]);

  useEffect(() => {
    if (!activeJobId) return;
    let stopped = false;

    const pollJob = async () => {
      try {
        const response = await fetch(`/api/generate-image?jobId=${encodeURIComponent(activeJobId)}`);
        const data = await response.json();
        if (stopped) return;
        if (!response.ok || !data.job) {
          // A reload can reach this endpoint before the original POST has
          // finished persisting the client-generated task ID. Keep polling;
          // activeJobs on the next page load provides a second recovery path.
          return;
        }
        const job = data.job;

        if (job.status === "queued") {
          setIsGenerating(true);
          setGenerationStatus("queued");
          return;
        }
        if (job.status === "generating") {
          setIsGenerating(true);
          setGenerationStatus("generating");
          return;
        }

        setActiveJobId(null);
        if (user) localStorage.removeItem(`${PENDING_JOB_KEY_PREFIX}:${user.id}`);

        if (job.status === "succeeded") {
          const completed: HistoryItem = {
            id: job.id,
            prompt: job.prompt,
            negativePrompt: job.negativePrompt,
            mode: job.mode,
            model: job.model,
            aspectRatio: job.aspectRatio,
            resolution: job.resolution,
            outputFormat: "PNG",
            originalImageUrl: job.originalImageUrl,
            resultImageUrl: job.resultImageUrl,
            timestamp: job.timestamp,
            durationMs: job.durationMs,
            isFavorite: job.isFavorite,
          };
          setCurrentResult(completed);
          setHistory((prev) => [completed, ...prev.filter((item) => item.id !== completed.id)]);
          setIsGenerating(false);
          setGenerationStatus("success");
          setGenerationError("");
          showToast("图像生成成功，结果已保存到创作历史");
        } else if (job.status === "content_rejected") {
          setIsGenerating(false);
          setGenerationStatus("content_rejected");
          setGenerationError(job.errorMessage || "提示词或参考图未通过内容审核");
        } else if (job.status === "interrupted") {
          setIsGenerating(false);
          setGenerationStatus("interrupted");
          setGenerationError(job.errorMessage || "服务重启或连接中断，未自动重复生成");
        } else if (job.status === "cancelled") {
          setIsGenerating(false);
          setGenerationStatus("cancelled");
          setGenerationError("");
        } else {
          setIsGenerating(false);
          setGenerationStatus("failed");
          setGenerationError(job.errorMessage || "生成失败");
        }
      } catch {
        // Keep polling while the local service is temporarily unavailable.
      }
    };

    void pollJob();
    const timer = window.setInterval(() => void pollJob(), 1500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [activeJobId, user]);

  useEffect(() => {
    if (!saveModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSaveModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [saveModalOpen]);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleReset = () => {
    setPrompt("");
    setReferenceImage(null);
    setAspectRatio("1:1");
    setResolution("1K");
    setGenerationStatus("idle");
    setGenerationError("");
    showToast("已重置所有生成参数", "info");
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
        showToast("已利用 AI 扩写画质与光影细节");
      }
    } catch (err) {
      console.error(err);
      showToast("提示词润色失败，请重试", "error");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (providerStatus !== "ready") {
      showToast("AI 模型尚未配置或当前不可用", "error");
      return;
    }

    if (!prompt.trim() && !referenceImage) {
      showToast("请输入提示词或上传参考图片", "error");
      return;
    }

    if (mode === "image-edit" && !referenceImage) {
      showToast("“图片编辑”模式需要先上传待编辑的原图", "error");
      return;
    }

    setIsGenerating(true);
    setGenerationStatus("queued");
    setGenerationError("");
    const clientJobId = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const pendingKey = user ? `${PENDING_JOB_KEY_PREFIX}:${user.id}` : null;
    if (pendingKey) {
      try {
        // Persist before the network request so a refresh cannot lose the
        // short window between task creation and the response.
        localStorage.setItem(pendingKey, clientJobId);
      } catch {
        // The server remains the source of truth if storage is unavailable.
      }
    }

    try {
      const requestBody = {
        prompt,
        mode,
        model,
        aspectRatio,
        resolution,
        ...(mode !== "text-to-image" && referenceImage ? { referenceImage } : {}),
      };

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestBody, jobId: clientJobId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }
      const jobId = String(data.jobId || clientJobId);
      setActiveJobId(jobId);
      if (user) {
        try {
          localStorage.setItem(`${PENDING_JOB_KEY_PREFIX}:${user.id}`, jobId);
        } catch {
          // The task remains recoverable from the server's activeJobs list.
        }
      }
      setGenerationStatus("generating");
      showToast("任务已进入队列，刷新页面也会继续追踪", "info");
    } catch (err: any) {
      console.error(err);
      setIsGenerating(false);
      setActiveJobId(null);
      if (pendingKey) {
        try {
          if (localStorage.getItem(pendingKey) === clientJobId) localStorage.removeItem(pendingKey);
        } catch {
          // Ignore local cache failures.
        }
      }
      setGenerationStatus("failed");
      setGenerationError(err.message || "生成遇到错误，请检查网络或重试");
      showToast(err.message || "生成遇到错误，请检查网络或重试", "error");
    }
  };

  const handleDownload = () => {
    if (!currentResult?.resultImageUrl) return;
    const a = document.createElement("a");
    a.href = currentResult.resultImageUrl;
    a.download = `omni-flash-${currentResult.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("已下载 PNG 图片");
  };

  const handleApplyTemplate = (tmpl: PromptTemplate) => {
    setPrompt(tmpl.prompt);
    setMode(tmpl.defaultMode);
    setAspectRatio(tmpl.aspectRatio);
    if (tmpl.sampleOriginalImage) {
      setReferenceImage(tmpl.sampleOriginalImage);
    } else if (tmpl.sampleImage && tmpl.defaultMode === "image-edit") {
      setReferenceImage(tmpl.sampleImage);
    }
    showToast(`已载入模板「${tmpl.title}」`);
  };

  const openSaveTemplateModal = () => {
    if (!prompt.trim()) {
      showToast("请先输入提示词再保存为模板", "error");
      return;
    }
    setSaveTitle("");
    setSaveTags("");
    setSaveModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!saveTitle.trim() || !prompt.trim()) {
      showToast("模板名称不能为空", "error");
      return;
    }

    setIsSavingTemplate(true);
    try {
      const tags = saveTags
        .split(/[,，、]/)
        .map((t) => t.trim())
        .filter(Boolean);

      const sampleImage = currentResult?.resultImageUrl || undefined;
      const sampleOriginalImage =
        (mode === "image-edit" || mode === "reference-image") && referenceImage
          ? referenceImage
          : undefined;

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: saveTitle.trim(),
          category: mode === "text-to-image" ? "我的模板" : "我的模板",
          prompt,
          sampleImage,
          sampleOriginalImage,
          defaultMode: mode,
          aspectRatio,
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "保存失败");
      }

      setSaveModalOpen(false);
      showToast(`模板「${saveTitle.trim()}」已存入精选模板库`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "保存模板失败，请重试", "error");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleUseAsReference = (imageUrl: string) => {
    setReferenceImage(imageUrl);
    setMode("image-edit");
    showToast("已将当前结果设为输入原图，可继续迭代编辑");
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setCurrentResult(item);
    setPrompt(item.prompt);
    setMode(item.mode);
    setModel(item.model);
    setAspectRatio(item.aspectRatio);
    setResolution(item.resolution);
    if (item.originalImageUrl) {
      setReferenceImage(item.originalImageUrl);
    }
    showToast("已加载历史创作参数与视图");
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      const response = await fetch(`/api/generate-image?jobId=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("删除失败");
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (currentResult?.id === id) setCurrentResult(null);
      showToast("已删除该记录", "info");
    } catch {
      showToast("删除记录失败，请重试", "error");
    }
  };

  const handleToggleFavorite = async (id: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
    if (currentResult?.id === id) {
      setCurrentResult((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
    try {
      const response = await fetch("/api/generate-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "favorite", jobId: id }),
      });
      if (!response.ok) throw new Error("更新收藏失败");
    } catch {
      setHistory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
      );
      if (currentResult?.id === id) {
        setCurrentResult((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
      }
      showToast("更新收藏失败，请重试", "error");
    }
  };

  const handleClearHistory = async () => {
    if (confirm("确认清空所有历史创作记录吗？")) {
      try {
        const response = await fetch("/api/generate-image?all=1", { method: "DELETE" });
        if (!response.ok) throw new Error("清空失败");
        setHistory([]);
        setCurrentResult(null);
        showToast("已清空历史记录", "info");
      } catch {
        showToast("清空历史记录失败，请重试", "error");
      }
    }
  };

  const handleSelectMode = (newMode: GenerationMode) => {
    setMode(newMode);
    setHistoryOpen(false);
    setTemplateOpen(false);
  };

  const activeItem =
    historyOpen ? "history" : templateOpen ? "templates" : mode === "text-to-image" ? "text-to-image" : "image-edit";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0e12] text-gray-200">
      <SideNav
        user={user}
        activeItem={activeItem}
        currentMode={mode}
        onSelectMode={handleSelectMode}
        historyCount={history.length}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenTemplates={() => setTemplateOpen(true)}
      />

      {/* Main Workbench Content Area */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        {/* Left Generation Control Panel */}
        <div className="w-full md:w-[460px] lg:w-[480px] h-full flex flex-col border-r border-[#202734] bg-[#0f1217] shrink-0">
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
            <SettingsSection
              mode={mode}
              onChangeMode={(newMode) => setMode(newMode)}
              model={model}
              onChangeModel={setModel}
              aspectRatio={aspectRatio}
              onChangeAspectRatio={setAspectRatio}
              resolution={resolution}
              onChangeResolution={setResolution}
            />

            <PromptSection
              prompt={prompt}
              onChangePrompt={setPrompt}
              onOpenTemplates={() => setTemplateOpen(true)}
              isEnhancing={isEnhancing}
              onEnhancePrompt={handleEnhancePrompt}
            />

            {(mode === "image-edit" || mode === "reference-image") && (
              <ReferenceUpload referenceImage={referenceImage} onSelectImage={setReferenceImage} mode={mode} />
            )}
          </div>

          <div className="p-3.5 border-t border-[#202734] bg-[#12151c] space-y-2.5">
            <div
              className={`rounded-lg border px-3 py-2 text-[11px] ${
                providerStatus === "ready"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
              role="status"
              aria-live="polite"
            >
              {providerStatus === "loading"
                ? "正在检查 AI 模型服务..."
                : providerStatus === "ready"
                  ? "AI 模型服务已连接"
                  : "尚未配置可用的 AI 模型，请先在管理后台完成连接配置"}
            </div>
            {generationStatus !== "idle" && (
              <div
                className={`rounded-lg border px-3 py-2 text-[11px] ${
                  generationStatus === "failed" || generationStatus === "content_rejected" || generationStatus === "interrupted"
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : generationStatus === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-sky-500/30 bg-sky-500/10 text-sky-200"
                }`}
                role="status"
                aria-live="polite"
              >
                {generationStatus === "queued"
                  ? "已排队：任务已保存，等待开始生成..."
                  : generationStatus === "generating"
                  ? "生成中：正在等待模型返回结果..."
                  : generationStatus === "success"
                    ? "生成成功：结果已加入创作历史"
                    : generationStatus === "interrupted"
                      ? `生成中断：${generationError}`
                      : generationStatus === "content_rejected"
                        ? `内容审核未通过：${generationError}`
                        : generationStatus === "cancelled"
                          ? "已取消：任务未继续执行"
                      : `生成失败：${generationError}`}
              </div>
            )}
            <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              className="p-3 rounded-xl bg-[#181d26] hover:bg-[#222834] text-gray-400 hover:text-white border border-[#252d3a] transition-colors shrink-0"
              title="重置全部参数"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || providerStatus !== "ready"}
              className="flex-1 py-3 px-4 rounded-xl bg-[#33fb02] hover:bg-[#2ee002] active:scale-[0.99] text-black font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(51,251,2,0.3)] hover:shadow-[0_0_25px_rgba(51,251,2,0.5)] disabled:opacity-60 disabled:pointer-events-none"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>AI 正在渲染中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-black text-black" />
                  <span>{mode === "image-edit" ? "开始智能编辑" : "立即生成图片"}</span>
                </>
              )}
            </button>
            </div>
          </div>
        </div>

        {/* Right Preview & Showcase Area */}
        <PreviewCanvas
          currentResult={currentResult}
          referenceImage={referenceImage}
          isGenerating={isGenerating}
          onDownload={handleDownload}
          onRegenerate={handleGenerate}
          onUseAsReference={handleUseAsReference}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenLightbox={(img) => setLightboxImage(img)}
          onSaveTemplate={openSaveTemplateModal}
        />
      </div>

      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onSelectHistoryItem={handleSelectHistoryItem}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onToggleFavorite={handleToggleFavorite}
        onClearHistory={handleClearHistory}
      />

      <TemplateModal isOpen={templateOpen} onClose={() => setTemplateOpen(false)} onApplyTemplate={handleApplyTemplate} />

      {/* Save as Template Modal */}
      {saveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSaveModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#11141b] border border-[#232b3a] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#202734] bg-[#0e1117]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#201d12] border border-amber-400/40 flex items-center justify-center">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">保存为模板</h3>
                  <p className="text-xs text-gray-400">存入精选创作模板库，随时复用</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1f2633] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">模板名称 *</label>
                <input
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="例如：赛博朋克雨夜街道（16:9）"
                  className="w-full rounded-lg bg-[#0d1017] border border-[#232b38] px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-400/60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  标签（用逗号分隔）
                </label>
                <input
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  placeholder="例如：赛博朋克, 夜景, 霓虹"
                  className="w-full rounded-lg bg-[#0d1017] border border-[#232b38] px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-400/60"
                />
              </div>

              <div className="rounded-lg bg-[#0d1017] border border-[#1c222c] p-3">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  将保存的内容
                </div>
                <ul className="text-[11px] text-gray-400 space-y-1">
                  <li>• 当前提示词（{prompt.length} 字）</li>
                  <li>• 模式：{mode === "image-edit" ? "图片编辑" : mode === "text-to-image" ? "文生图" : "参考图"}</li>
                  <li>• 比例：{aspectRatio}</li>
                  {currentResult?.resultImageUrl && <li>• 当前生成结果作为封面</li>}
                  {referenceImage && <li>• 参考原图</li>}
                </ul>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-[#232b38] text-sm font-bold text-gray-300 hover:bg-[#181d26] transition-all duration-150 active:scale-[0.98]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate || !saveTitle.trim()}
                  className="flex-1 py-3 rounded-xl bg-amber-500/90 hover:bg-amber-500 text-black text-sm font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isSavingTemplate ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      保存模板
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <LightboxModal imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141820] border border-[#2b3546] text-xs font-semibold text-white shadow-2xl animate-bounce">
          {toastMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-[#33fb02]" />}
          {toastMessage.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toastMessage.type === "info" && <Sparkles className="w-4 h-4 text-amber-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}

function StudioSkeleton() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0c0e12] text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
