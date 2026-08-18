"use client";

import React, { useState } from 'react';
import {
  Download,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Maximize2,
  Layers,
  SlidersHorizontal,
  Clock,
  ArrowRightLeft,
  Share2,
  FolderHeart,
  Image as ImageIcon
} from 'lucide-react';
import { HistoryItem } from '@/types/ai-studio';

interface PreviewCanvasProps {
  currentResult: HistoryItem | null;
  referenceImage: string | null;
  isGenerating: boolean;
  onDownload: () => void;
  onRegenerate: () => void;
  onUseAsReference: (imageUrl: string) => void;
  onOpenHistory: () => void;
  onOpenLightbox: (imageUrl: string) => void;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  currentResult,
  referenceImage,
  isGenerating,
  onDownload,
  onRegenerate,
  onUseAsReference,
  onOpenHistory,
  onOpenLightbox,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'slider' | 'single'>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState(50);

  const beforeImage = currentResult?.originalImageUrl || referenceImage;
  const afterImage = currentResult?.resultImageUrl;

  const handleCopyPrompt = () => {
    if (!currentResult?.prompt) return;
    navigator.clipboard.writeText(currentResult.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isEditMode = currentResult?.mode === 'image-edit' || (beforeImage && afterImage);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0c0e12] overflow-y-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#1c222c]">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-white tracking-wide">
            {currentResult ? '生成结果' : '示例预览'}
          </h2>
          {currentResult && (
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="px-2 py-0.5 rounded bg-[#181e28] border border-[#273142] text-gray-300 font-mono">
                {currentResult.resolution} · {currentResult.aspectRatio}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#33fb02]" />
                <span>{(currentResult.durationMs / 1000).toFixed(1)}s</span>
              </span>
              {currentResult.upscaled && (
                <span className="px-1.5 py-0.5 rounded bg-[#33fb02]/15 text-[#33fb02] text-[10px] font-bold border border-[#33fb02]/30">
                  HD 超清增强
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && afterImage && (
            <div className="flex items-center p-0.5 rounded-lg bg-[#141820] border border-[#222834] text-[11px] gap-1">
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all duration-150 active:scale-95 ${
                  viewMode === 'side-by-side'
                    ? 'bg-[#1e2720] text-[#33fb02] border-2 border-[#33fb02]'
                    : 'text-gray-400 hover:text-gray-200 border-2 border-transparent'
                }`}
              >
                双栏对比
              </button>
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all duration-150 active:scale-95 ${
                  viewMode === 'slider'
                    ? 'bg-[#1e2720] text-[#33fb02] border-2 border-[#33fb02]'
                    : 'text-gray-400 hover:text-gray-200 border-2 border-transparent'
                }`}
              >
                滑动对比
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181d26] hover:bg-[#202734] border-2 border-[#252e3e] hover:border-amber-500/60 text-xs font-bold text-amber-300 hover:text-amber-200 transition-all duration-150 active:scale-95 shadow-sm"
          >
            <FolderHeart className="w-3.5 h-3.5 text-amber-400" />
            <span>我的创作</span>
          </button>
        </div>
      </div>

      <div className="relative rounded-2xl bg-[#11141b] border-2 border-[#202734] p-3 md:p-4 min-h-[420px] flex flex-shrink-0 items-center justify-center overflow-hidden">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-[#202734] border-t-[#33fb02] animate-spin flex items-center justify-center" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#33fb02]" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-200">
                AI 正在渲染光影与图像结构...
              </h3>
              <p className="text-xs text-gray-400">
                正在等待已配置的模型提供商返回结果
              </p>
            </div>
          </div>
        ) : afterImage ? (
          isEditMode && beforeImage && viewMode === 'side-by-side' ? (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-gray-400">编辑前 (Before)</span>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-black/60 border-2 border-[#222a36] hover:border-gray-500 transition-all flex items-center justify-center group">
                  <img
                    src={beforeImage}
                    alt="编辑前"
                    referrerPolicy="no-referrer"
                    className="block w-full h-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => onOpenLightbox(beforeImage)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90 active:scale-95"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[#33fb02] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>编辑后 (After)</span>
                  </span>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-black/60 border-2 border-[#33fb02] flex items-center justify-center group">
                  <img
                    src={afterImage}
                    alt="编辑后"
                    referrerPolicy="no-referrer"
                    className="block w-full h-auto object-contain cursor-zoom-in"
                    onDoubleClick={() => onOpenLightbox(afterImage)}
                  />
                  <button
                    type="button"
                    onClick={() => onOpenLightbox(afterImage)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90 active:scale-95"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : isEditMode && beforeImage && viewMode === 'slider' ? (
            <div className="w-full max-w-2xl mx-auto">
              <div
                className="relative w-full rounded-xl overflow-hidden border-2 border-[#2b3544] select-none cursor-ew-resize bg-black/60"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                  setSliderPosition((x / rect.width) * 100);
                }}
                onTouchMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const touch = e.touches[0];
                  const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
                  setSliderPosition((x / rect.width) * 100);
                }}
              >
                <img
                  src={beforeImage}
                  alt="编辑前"
                  referrerPolicy="no-referrer"
                  className="relative z-0 block w-full h-auto object-contain"
                />

                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <img
                    src={afterImage}
                    alt="编辑后"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-contain cursor-zoom-in"
                    onDoubleClick={() => onOpenLightbox(afterImage)}
                  />
                </div>

                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-[#33fb02]"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#101318] border-2 border-[#33fb02] flex items-center justify-center shadow-lg">
                    <ArrowRightLeft className="w-3 h-3 text-[#33fb02]" />
                  </div>
                </div>

                <span className="absolute top-3 left-3 px-2 py-1 rounded bg-black/80 text-[10px] text-[#33fb02] font-bold border border-[#33fb02]/30">
                  编辑后
                </span>
                <span className="absolute top-3 right-3 px-2 py-1 rounded bg-black/80 text-[10px] text-gray-300 font-bold border border-gray-700">
                  编辑前
                </span>
              </div>
            </div>
          ) : (
            <div className="relative max-h-[600px] w-full flex items-center justify-center group">
              <img
                src={afterImage}
                alt="AI 生成图片"
                referrerPolicy="no-referrer"
                className="max-h-[560px] w-auto max-w-full rounded-xl object-contain shadow-2xl border-2 border-[#33fb02] cursor-zoom-in"
                onDoubleClick={() => onOpenLightbox(afterImage)}
              />
              <button
                type="button"
                onClick={() => onOpenLightbox(afterImage)}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black active:scale-95"
                title="全屏放大查看"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#151922] border-2 border-[#252d3a] flex items-center justify-center text-gray-400">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-sm font-semibold text-gray-300">
                准备生成全新画作
              </h4>
              <p className="text-xs text-gray-400">
                在左侧输入提示词或上传参考图，点击“生成”即可开始
              </p>
            </div>
          </div>
        )}
      </div>

      {afterImage && (
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c222e] hover:bg-[#252d3d] text-xs font-bold text-white border-2 border-[#2d3749] hover:border-[#33fb02] transition-all duration-150 active:scale-95 shadow-sm"
            >
              <Download className="w-4 h-4 text-[#33fb02]" />
              <span>下载图片</span>
            </button>

            <button
              type="button"
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c222e] hover:bg-[#252d3d] text-xs font-bold text-gray-300 hover:text-white border-2 border-[#2d3749] hover:border-gray-500 transition-all duration-150 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              <span>重新生成</span>
            </button>

            <button
              type="button"
              onClick={() => onUseAsReference(afterImage)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c222e] hover:bg-[#252d3d] text-xs font-bold text-gray-300 hover:text-[#33fb02] border-2 border-[#2d3749] hover:border-[#33fb02] transition-all duration-150 active:scale-95"
              title="将此结果作为参考图继续编辑"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>设为参考图</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#161a22] hover:bg-[#1e2430] text-xs font-semibold text-gray-300 hover:text-white border-2 border-[#242c3b] hover:border-gray-500 transition-all duration-150 active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#33fb02]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制提示词' : '复制提示词'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-[#12161e] border border-[#222936] p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>获得更好效果的提示</span>
        </div>

        <ul className="space-y-1.5 text-xs text-gray-300 leading-relaxed">
          <li className="flex items-start gap-1.5">
            <span className="text-[#33fb02] font-bold">·</span>
            <span><strong className="text-gray-200">描述具体：</strong>使用详细描述而非笼统词汇（如主体姿态、材质纹理、环境光影）。</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[#33fb02] font-bold">·</span>
            <span><strong className="text-gray-200">添加拍摄细节：</strong>提及光线（如丁达尔效应、体积光）、角度和镜头类型以获得逼真照片。</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[#33fb02] font-bold">·</span>
            <span><strong className="text-gray-200">清晰描述编辑：</strong>在图生图或修改时，明确指出“将X替换为Y”或“在原图背景增加Z”。</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[#33fb02] font-bold">·</span>
            <span><strong className="text-gray-200">明智选择分辨率：</strong>512px 适合快速草稿，1K 适合常规创作，2K 适合高质量成片。</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
