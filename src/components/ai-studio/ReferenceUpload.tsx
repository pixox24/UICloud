"use client";

import React, { useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, RefreshCw, Eye, Sparkles } from 'lucide-react';

interface ReferenceUploadProps {
  referenceImage: string | null;
  onSelectImage: (base64: string | null, name?: string) => void;
  mode: string;
}

const SAMPLE_PRESETS = [
  {
    name: '街头青年摄影',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: '女孩肖像',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: '经典产品香水',
    url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: '科幻未来机甲',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  },
];

export const ReferenceUpload: React.FC<ReferenceUploadProps> = ({
  referenceImage,
  onSelectImage,
  mode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onSelectImage(event.target.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onSelectImage(event.target.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const loadPreset = async (presetUrl: string, name: string) => {
    try {
      const res = await fetch(presetUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onSelectImage(reader.result, name);
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      onSelectImage(presetUrl, name);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-200 tracking-wide flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-[#33fb02]" />
          <span>{mode === 'image-edit' ? '待编辑的原图 (Before)' : '参考图 (Reference Image)'}</span>
          <span className="text-[10px] text-gray-400 font-normal">
            {mode === 'image-edit' ? '(必填)' : '(可选参考)'}
          </span>
        </label>

        {referenceImage && (
          <button
            type="button"
            onClick={() => onSelectImage(null)}
            className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>移除原图</span>
          </button>
        )}
      </div>

      {referenceImage ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-[#2e3747] hover:border-[#33fb02] bg-[#0f1217] group transition-all duration-200">
          <div className="h-44 w-full flex items-center justify-center bg-black/40">
            <img
              src={referenceImage}
              alt="参考图"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-[#202734] hover:bg-[#2d374a] text-xs font-semibold text-white flex items-center gap-1.5 transition-all duration-150 active:scale-95 border-2 border-gray-700 hover:border-gray-500"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#33fb02]" />
              <span>更换图片</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectImage(null)}
              className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-xs font-semibold text-red-200 flex items-center gap-1.5 transition-all duration-150 active:scale-95 border-2 border-red-800/60"
            >
              <X className="w-3.5 h-3.5" />
              <span>删除</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="h-32 rounded-xl border-2 border-dashed border-[#2b3444] hover:border-[#33fb02] bg-[#11151c]/60 hover:bg-[#151a24] transition-all duration-150 cursor-pointer flex flex-col items-center justify-center p-3 text-center group active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-full bg-[#181d26] group-hover:bg-[#1b251d] border-2 border-[#273040] group-hover:border-[#33fb02] flex items-center justify-center mb-2 transition-all duration-150 group-hover:scale-105">
            <UploadCloud className="w-5 h-5 text-gray-400 group-hover:text-[#33fb02] transition-colors" />
          </div>
          <span className="text-xs text-gray-200 font-semibold group-hover:text-white transition-colors">
            点击或拖拽上传参考图
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5">
            支持 JPG、PNG、WEBP，支持直接 Ctrl+V 粘贴
          </span>
        </div>
      )}

      {!referenceImage && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[10px] text-gray-400 font-medium">快速试用示例图:</span>
          {SAMPLE_PRESETS.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => loadPreset(sample.url, sample.name)}
              className="px-2 py-0.5 rounded text-[10px] bg-[#161a22] hover:bg-[#202734] text-gray-300 hover:text-[#33fb02] border border-[#242b38] hover:border-[#33fb02] transition-all duration-150 active:scale-95"
            >
              {sample.name}
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
