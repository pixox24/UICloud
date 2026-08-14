"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RotateCcw, Sparkles, Wand2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import SideNav from "@/components/SideNav";
import { PromptSection } from "@/components/ai-studio/PromptSection";
import { ReferenceUpload } from "@/components/ai-studio/ReferenceUpload";
import { SettingsSection } from "@/components/ai-studio/SettingsSection";
import { PreviewCanvas } from "@/components/ai-studio/PreviewCanvas";
import { HistoryDrawer } from "@/components/ai-studio/HistoryDrawer";
import { TemplateModal } from "@/components/ai-studio/TemplateModal";
import { LightboxModal } from "@/components/ai-studio/LightboxModal";
import { INITIAL_HISTORY } from "@/lib/ai-studio/templates";
import type {
  AIModelId,
  AspectRatio,
  GenerationMode,
  HistoryItem,
  OutputFormat,
  PromptTemplate,
  Resolution,
} from "@/types/ai-studio";
import type { User } from "@/types";

const STORAGE_KEY = "ai_image_workbench_history_v1";

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
  const [prompt, setPrompt] = useState(
    "将这张照片转换为角色手办。在手办后面放一个印有角色形象的包装盒，旁边放一台电脑，屏幕上显示 Blender 建模过程。在包装盒前面放一个圆形塑料底座，角色手办站在上面。如果可能的话，场景设置在室内"
  );
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [resolution, setResolution] = useState<Resolution>("1K");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("PNG");
  const [enableGoogleSearch, setEnableGoogleSearch] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80"
  );

  // Results & History
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_HISTORY;
  });

  const [currentResult, setCurrentResult] = useState<HistoryItem | null>(() => {
    return INITIAL_HISTORY[0] || null;
  });

  // Action status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Modals
  const [historyOpen, setHistoryOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user))
      .catch(() => undefined);
  }, []);

  // 拉取后台配置的模型名称（系统连接配置）
  useEffect(() => {
    fetch("/api/ai-provider")
      .then((r) => r.json())
      .then((data) => {
        if (data.model) {
          setModel(data.model);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "history") setHistoryOpen(true);
    else if (tab === "templates") setTemplateOpen(true);
    const modeParam = searchParams.get("mode");
    if (modeParam === "image-edit" || modeParam === "text-to-image" || modeParam === "reference-image") {
      setMode(modeParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to persist history", e);
    }
  }, [history]);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleReset = () => {
    setPrompt("");
    setNegativePrompt("");
    setReferenceImage(null);
    setAspectRatio("1:1");
    setResolution("1K");
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
    if (!prompt.trim() && !referenceImage) {
      showToast("请输入提示词或上传参考图片", "error");
      return;
    }

    if (mode === "image-edit" && !referenceImage) {
      showToast("“图片编辑”模式需要先上传待编辑的原图", "error");
      return;
    }

    setIsGenerating(true);
    const startTime = Date.now();

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt,
          mode,
          model,
          aspectRatio,
          resolution,
          referenceImage,
          enableGoogleSearch,
          outputFormat,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      const newItem: HistoryItem = {
        id: "gen-" + Date.now(),
        prompt: prompt || "图片智能编辑重绘",
        negativePrompt,
        mode,
        model,
        aspectRatio,
        resolution,
        outputFormat,
        originalImageUrl:
          (mode === "image-edit" || mode === "reference-image") && referenceImage ? referenceImage : undefined,
        resultImageUrl: data.imageUrl,
        timestamp: Date.now(),
        durationMs: data.durationMs || Date.now() - startTime,
        seed: Math.floor(Math.random() * 999999),
        isFavorite: false,
      };

      setCurrentResult(newItem);
      setHistory((prev) => [newItem, ...prev]);
      if (data.simulated) {
        showToast(data.message || "当前为演示模式生成", "info");
      } else {
        showToast("图像生成成功！");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "生成遇到错误，请检查网络或重试", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpscale = async () => {
    if (!currentResult?.resultImageUrl) return;
    setIsUpscaling(true);
    try {
      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentResult.resultImageUrl,
          targetResolution: resolution === "4K" ? "4K Ultra" : "4K",
        }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = {
          ...currentResult,
          resolution: "4K" as Resolution,
          upscaled: true,
        };
        setCurrentResult(updated);
        setHistory((prev) => prev.map((item) => (item.id === currentResult.id ? updated : item)));
        showToast("已完成 4K 高清纹理放大重构");
      }
    } catch (err) {
      showToast("放大失败，请重试", "error");
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleDownload = () => {
    if (!currentResult?.resultImageUrl) return;
    const a = document.createElement("a");
    a.href = currentResult.resultImageUrl;
    a.download = `omni-flash-${currentResult.id}.${outputFormat.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`已下载 ${outputFormat} 格式图片`);
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
    setOutputFormat(item.outputFormat);
    if (item.originalImageUrl) {
      setReferenceImage(item.originalImageUrl);
    }
    showToast("已加载历史创作参数与视图");
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (currentResult?.id === id) {
      const remaining = history.filter((item) => item.id !== id);
      setCurrentResult(remaining[0] || null);
    }
    showToast("已删除该记录", "info");
  };

  const handleToggleFavorite = (id: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
    if (currentResult?.id === id) {
      setCurrentResult((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  const handleClearHistory = () => {
    if (confirm("确认清空所有历史创作记录吗？")) {
      setHistory([]);
      setCurrentResult(null);
      showToast("已清空历史记录", "info");
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
              enableGoogleSearch={enableGoogleSearch}
              onToggleGoogleSearch={setEnableGoogleSearch}
              outputFormat={outputFormat}
              onChangeOutputFormat={setOutputFormat}
              negativePrompt={negativePrompt}
              onChangeNegativePrompt={setNegativePrompt}
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

          <div className="p-3.5 border-t border-[#202734] bg-[#12151c] flex items-center gap-2.5">
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
              disabled={isGenerating}
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

        {/* Right Preview & Showcase Area */}
        <PreviewCanvas
          currentResult={currentResult}
          referenceImage={referenceImage}
          isGenerating={isGenerating}
          onDownload={handleDownload}
          onUpscale={handleUpscale}
          isUpscaling={isUpscaling}
          onRegenerate={handleGenerate}
          onUseAsReference={handleUseAsReference}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenLightbox={(img) => setLightboxImage(img)}
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
