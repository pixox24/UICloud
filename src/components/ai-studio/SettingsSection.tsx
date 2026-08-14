"use client";

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Globe,
  Sliders,
  Sparkles
} from 'lucide-react';
import { AIModelId, AspectRatio, GenerationMode, OutputFormat, Resolution } from '@/types/ai-studio';
import { ASPECT_RATIOS, AVAILABLE_MODELS } from '@/lib/ai-studio/templates';

interface SettingsSectionProps {
  mode: GenerationMode;
  onChangeMode: (mode: GenerationMode) => void;
  model: AIModelId;
  onChangeModel: (model: AIModelId) => void;
  aspectRatio: AspectRatio;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  resolution: Resolution;
  onChangeResolution: (res: Resolution) => void;
  enableGoogleSearch: boolean;
  onToggleGoogleSearch: (enable: boolean) => void;
  outputFormat: OutputFormat;
  onChangeOutputFormat: (format: OutputFormat) => void;
  negativePrompt: string;
  onChangeNegativePrompt: (val: string) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  mode,
  onChangeMode,
  model,
  aspectRatio,
  onChangeAspectRatio,
  resolution,
  onChangeResolution,
  enableGoogleSearch,
  onToggleGoogleSearch,
  outputFormat,
  onChangeOutputFormat,
  negativePrompt,
  onChangeNegativePrompt,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(true);

  const currentModelObj = AVAILABLE_MODELS.find((m) => m.id === model) || AVAILABLE_MODELS[0];

  const resolutionList: { id: Resolution; label: string; credits: string }[] = [
    { id: '1K', label: '1K', credits: '2 credits' },
    { id: '2K', label: '2K', credits: '4 credits' },
    { id: '4K', label: '4K', credits: '6 credits' },
    { id: '512px', label: '512px', credits: '1 credit' },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Model Display (configured centrally in admin) */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#13171f] border-2 border-[#242b38]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-6 h-6 rounded-md bg-[#18241b] border-2 border-[#33fb02] flex items-center justify-center p-0.5 shrink-0">
            <span className="text-[10px] font-black text-[#33fb02]">AI</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-200 truncate">
                {currentModelObj.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#1b271d] text-[#33fb02] rounded font-bold border border-[#33fb02]/40 shrink-0">
                {currentModelObj.badge}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 truncate">
              模型由后台「系统连接配置」统一管理
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-gray-400 shrink-0">{model}</span>
      </div>

      <div className="grid grid-cols-3 p-1 rounded-xl bg-[#11141b] border border-[#222834] gap-1">
        <button
          type="button"
          onClick={() => onChangeMode('image-edit')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
            mode === 'image-edit'
              ? 'text-[#33fb02] bg-[#1a231b] border-2 border-[#33fb02]'
              : 'text-gray-400 hover:text-gray-200 border-2 border-transparent hover:border-[#222834]'
          }`}
        >
          图片编辑
        </button>
        <button
          type="button"
          onClick={() => onChangeMode('text-to-image')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
            mode === 'text-to-image'
              ? 'text-[#33fb02] bg-[#1a231b] border-2 border-[#33fb02]'
              : 'text-gray-400 hover:text-gray-200 border-2 border-transparent hover:border-[#222834]'
          }`}
        >
          文生图
        </button>
        <button
          type="button"
          onClick={() => onChangeMode('reference-image')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
            mode === 'reference-image'
              ? 'text-[#33fb02] bg-[#1a231b] border-2 border-[#33fb02]'
              : 'text-gray-400 hover:text-gray-200 border-2 border-transparent hover:border-[#222834]'
          }`}
        >
          参考图生图
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#33fb02]" />
            <span>Resolution (分辨率)</span>
          </label>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {resolutionList.map((res) => {
            const isSelected = resolution === res.id;
            return (
              <button
                key={res.id}
                type="button"
                onClick={() => onChangeResolution(res.id)}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-150 text-center relative active:scale-[0.97] ${
                  isSelected
                    ? 'bg-[#18241b] border-2 border-[#33fb02]'
                    : 'bg-[#13161d] border-2 border-[#222936] hover:border-gray-500 text-gray-300'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-1 right-1.5 text-[#33fb02] font-bold text-[10px]">✓</span>
                )}
                <span className={`text-xs font-bold ${isSelected ? 'text-[#33fb02]' : 'text-gray-200'}`}>
                  {res.label}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 font-mono">
                  {res.credits}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-[#13161d] border border-[#222936]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#33fb02]" />
            <span className="text-xs font-semibold text-gray-200">Google Search 实时增强</span>
          </div>
          <p className="text-[10px] text-gray-400">
            联网搜索以获取更精准的现实人物、地标与时事上下文
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleGoogleSearch(!enableGoogleSearch)}
          className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 active:scale-95 ${
            enableGoogleSearch ? 'bg-[#33fb02]' : 'bg-[#222a36]'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-[#0c0e12] transition-transform duration-200 ease-in-out ${
              enableGoogleSearch ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="rounded-xl bg-[#13161d] border border-[#222936] overflow-hidden">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-[#181e28] transition-colors"
        >
          <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#33fb02]" />
            <span>高级设置 (Aspect Ratio & 格式)</span>
          </span>
          {advancedOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {advancedOpen && (
          <div className="p-3 pt-1 border-t border-[#1c222c] space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-gray-400">
                Aspect Ratio (画面纵横比)
              </label>

              <div className="grid grid-cols-5 gap-1.5">
                {ASPECT_RATIOS.map((item) => {
                  const isSelected = aspectRatio === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onChangeAspectRatio(item.id)}
                      title={`${item.label} - ${item.desc}`}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-150 relative group active:scale-[0.97] ${
                        isSelected
                          ? 'bg-[#19241c] border-2 border-[#33fb02] text-[#33fb02]'
                          : 'bg-[#101318] border-2 border-[#222834] hover:border-gray-500 text-gray-300'
                      }`}
                    >
                      <div className="h-8 w-full flex items-center justify-center mb-1">
                        <div
                          className={`rounded-[2px] transition-colors ${
                            isSelected
                              ? 'border-2 border-[#33fb02] bg-[#33fb02]/15'
                              : 'border border-gray-500 group-hover:border-gray-300'
                          } ${item.iconRatio}`}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-gray-400">
                Output Format (导出格式)
              </label>
              <div className="flex items-center gap-2">
                {(['PNG', 'JPG', 'WEBP'] as OutputFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => onChangeOutputFormat(fmt)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                      outputFormat === fmt
                        ? 'bg-[#1a251e] border-2 border-[#33fb02] text-[#33fb02]'
                        : 'bg-[#101318] border-2 border-[#222834] hover:border-gray-500 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-400">
                Negative Prompt (负向提示词 / 过滤要素)
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => onChangeNegativePrompt(e.target.value)}
                placeholder="例如：模糊、低分辨率、畸形、噪点、多余手指..."
                className="w-full bg-[#101318] border border-[#222834] focus:border-2 focus:border-[#33fb02] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-400 focus:outline-none transition-all"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
