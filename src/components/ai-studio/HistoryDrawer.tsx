"use client";

import React, { useEffect, useState } from 'react';
import {
  X,
  Trash2,
  Heart,
  Download,
  Copy,
  Check,
  Clock,
  Search,
  Sliders,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { HistoryItem } from '@/types/ai-studio';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onDeleteHistoryItem: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistoryItem,
  onDeleteHistoryItem,
  onToggleFavorite,
  onClearHistory,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'text-to-image' | 'image-edit' | 'favorite'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const filteredItems = history.filter((item) => {
    if (filterMode === 'text-to-image' && item.mode !== 'text-to-image') return false;
    if (filterMode === 'image-edit' && item.mode !== 'image-edit' && item.mode !== 'reference-image') return false;
    if (filterMode === 'favorite' && !item.isFavorite) return false;
    if (searchQuery.trim()) {
      return item.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleCopy = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDownload = (e: React.MouseEvent, imageUrl: string, filename: string) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#11141a] border-l border-[#222938] h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#202734] bg-[#0e1117]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#18241b] border border-[#33fb02]/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#33fb02]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">我的创作历史</h3>
              <p className="text-[11px] text-gray-400">共 {history.length} 次生图记录</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="px-2.5 py-1 rounded text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 border border-red-900/30 transition-colors"
              >
                清空全部
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1f2633] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-[#1d232e] space-y-3 bg-[#13171f]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索提示词关键词..."
              className="w-full bg-[#0c0e12] border border-[#222834] rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-400 focus:outline-none focus:border-[#33fb02]/60"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: '全部' },
              { id: 'text-to-image', label: '文生图' },
              { id: 'image-edit', label: '图片编辑/参考图' },
              { id: 'favorite', label: '收藏夹' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 ${
                  filterMode === tab.id
                    ? 'bg-[#1a251e] border-2 border-[#33fb02] text-[#33fb02]'
                    : 'bg-[#181d26] border-2 border-[#222834] text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400 space-y-2">
              <Sparkles className="w-8 h-8 text-gray-400" />
              <p className="text-xs">暂无符合条件的创作记录</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectHistoryItem(item);
                  onClose();
                }}
                className="group relative rounded-xl bg-[#141820] hover:bg-[#1a202c] border-2 border-[#232b38] hover:border-[#33fb02] transition-all duration-150 p-3 cursor-pointer flex gap-3 shadow-md active:scale-[0.99]"
              >
                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-[#202734]">
                  <img
                    src={item.resultImageUrl}
                    alt={item.prompt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.originalImageUrl && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-[9px] text-[#33fb02] rounded font-bold border border-[#33fb02]/30">
                      编辑
                    </span>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f2634] text-gray-300 font-mono">
                        {item.resolution} · {item.aspectRatio}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#1d232e]">
                    <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                      {item.model}
                    </span>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => onToggleFavorite(item.id)}
                        className={`p-1 rounded hover:bg-[#202734] transition-colors ${
                          item.isFavorite ? 'text-rose-500' : 'text-gray-400 hover:text-gray-200'
                        }`}
                        title="收藏"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, item.id, item.prompt)}
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#202734] transition-colors"
                        title="复制提示词"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-[#33fb02]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownload(e, item.resultImageUrl, `ai-gen-${item.id}.png`)}
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#202734] transition-colors"
                        title="下载"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteHistoryItem(item.id);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                        title="删除记录"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
