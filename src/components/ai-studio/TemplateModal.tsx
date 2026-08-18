"use client";

import React, { useEffect, useState } from 'react';
import { X, Sparkles, Wand2, Check, ArrowRight, Layers, LayoutGrid } from 'lucide-react';
import { PROMPT_TEMPLATES } from '@/lib/ai-studio/templates';
import { PromptTemplate } from '@/types/ai-studio';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: PromptTemplate) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = ['全部', '手办/3D盲盒', '概念艺术', '3D/粘土', '商业产品', '二次元/原画', '图片编辑'];

  const filteredTemplates = selectedCategory === '全部'
    ? PROMPT_TEMPLATES
    : PROMPT_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#11141b] border border-[#232b3a] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202734] bg-[#0e1117]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a261c] border border-[#33fb02]/40 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-[#33fb02]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">精选创作模板库</h3>
              <p className="text-xs text-gray-400">一键载入专业提示词、预设参考图与构图参数</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1f2633] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-[#1c222e] overflow-x-auto bg-[#131720]">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                selectedCategory === cat
                  ? 'bg-[#1b261d] border-2 border-[#33fb02] text-[#33fb02]'
                  : 'bg-[#181d26] border-2 border-[#232b38] hover:border-gray-500 text-gray-300 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onApplyTemplate(item);
                onClose();
              }}
              className="group relative rounded-xl bg-[#141820] hover:bg-[#19202b] border-2 border-[#232b38] hover:border-[#33fb02] transition-all duration-150 p-3 flex flex-col justify-between cursor-pointer space-y-3 shadow-lg active:scale-[0.99]"
            >
              <div className="relative rounded-lg overflow-hidden aspect-[4/3] bg-black/60 border border-[#202734]">
                <img
                  src={item.sampleImage}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-[#33fb02] font-semibold border border-[#33fb02]/30">
                  {item.category}
                </span>
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-gray-300 font-mono border border-gray-700">
                  {item.aspectRatio}
                </span>
              </div>

              <div className="space-y-1.5 flex-1">
                <h4 className="text-xs font-bold text-gray-100 group-hover:text-[#33fb02] transition-colors">
                  {item.title}
                </h4>
                <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1d232e]">
                <div className="flex items-center gap-1 flex-wrap">
                  {item.tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1f2634] text-gray-400">
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-[#33fb02] group-hover:translate-x-0.5 transition-transform">
                  <span>应用</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
