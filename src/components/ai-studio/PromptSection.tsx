"use client";

import React, { useState } from 'react';
import { LayoutGrid, Sparkles, Wand2, X, RefreshCw, Copy, Check } from 'lucide-react';
import { QUICK_PROMPT_TAGS } from '@/lib/ai-studio/templates';

interface PromptSectionProps {
  prompt: string;
  onChangePrompt: (text: string) => void;
  onOpenTemplates: () => void;
  isEnhancing: boolean;
  onEnhancePrompt: () => void;
}

export const PromptSection: React.FC<PromptSectionProps> = ({
  prompt,
  onChangePrompt,
  onOpenTemplates,
  isEnhancing,
  onEnhancePrompt,
}) => {
  const [copied, setCopied] = useState(false);
  const maxLength = 5000;

  const handleAddTag = (tag: string) => {
    if (!prompt.includes(tag)) {
      const newPrompt = prompt ? `${prompt.trim()}，${tag}` : tag;
      onChangePrompt(newPrompt);
    }
  };

  const handleCopy = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-200 tracking-wide">
            提示词
          </label>
          <button
            type="button"
            onClick={onOpenTemplates}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 hover:border-amber-400 transition-all duration-150 active:scale-95"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
            <span>选择模板</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {prompt && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-all active:scale-95"
                title="复制提示词"
              >
                {copied ? <Check className="w-3 h-3 text-[#33fb02]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '已复制' : '复制'}</span>
              </button>
              <button
                type="button"
                onClick={() => onChangePrompt('')}
                className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-0.5 transition-all active:scale-95"
                title="清空提示词"
              >
                <X className="w-3 h-3" />
                <span>清空</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onEnhancePrompt}
            disabled={isEnhancing || !prompt}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-[#33fb02] bg-[#18241b] hover:bg-[#1f3023] border border-[#33fb02]/50 hover:border-[#33fb02] disabled:opacity-40 disabled:pointer-events-none transition-all duration-150 active:scale-95"
            title="利用 AI 智能扩写更丰富的画质、光影与材质细节"
          >
            {isEnhancing ? (
              <RefreshCw className="w-3 h-3 animate-spin text-[#33fb02]" />
            ) : (
              <Sparkles className="w-3 h-3 text-[#33fb02]" />
            )}
            <span>{isEnhancing ? 'AI 润色中...' : 'AI 智能扩写'}</span>
          </button>
        </div>
      </div>

      <div className="relative rounded-xl bg-[#11141a] border-2 border-[#232a38] focus-within:border-[#33fb02] transition-all duration-150">
        <textarea
          value={prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          maxLength={maxLength}
          rows={4}
          placeholder="描述你想要创建的图像细节（例如：构图、主体、色彩、光照、渲染风格等）..."
          className="w-full bg-transparent p-3 text-xs text-gray-200 placeholder-gray-400 focus:outline-none resize-none leading-relaxed"
        />

        <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-[#1c222c] text-[11px] text-gray-400">
          <span className="text-[10px] text-gray-400">
            描述越详尽，生成画面越精准
          </span>
          <span className="font-mono text-[11px] text-gray-400">
            <span className={prompt.length > 0 ? 'text-[#33fb02] font-bold' : ''}>{prompt.length}</span>/{maxLength}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <span className="text-[10px] text-gray-400 font-medium shrink-0">快捷加词:</span>
        {QUICK_PROMPT_TAGS.slice(0, 6).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleAddTag(tag)}
            className="px-2 py-0.5 rounded text-[10px] bg-[#161a22] hover:bg-[#202734] text-gray-300 hover:text-[#33fb02] border border-[#242b38] hover:border-[#33fb02] transition-all duration-150 active:scale-95"
          >
            +{tag}
          </button>
        ))}
      </div>
    </div>
  );
};
