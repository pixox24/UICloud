"use client";

import React, { useEffect, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react';

interface LightboxModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!imageUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.3, 0.5));
  const handleResetZoom = () => setScale(1);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `ai-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-xl bg-[#141820]/90 border-2 border-[#2b3546] shadow-2xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#202734] transition-all duration-150 active:scale-95"
          title="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#202734] transition-all duration-150 active:scale-95"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#202734] transition-all duration-150 active:scale-95"
          title="重置缩放"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-gray-700" />
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#33fb02] text-black font-bold text-xs hover:bg-[#2fe600] transition-all duration-150 active:scale-95 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>下载高清原图</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2.5 rounded-xl bg-[#181d26] text-gray-400 hover:text-white hover:bg-[#232b38] border-2 border-[#273142] transition-all duration-150 active:scale-95 z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="w-full h-full flex items-center justify-center p-8 overflow-hidden cursor-grab active:cursor-grabbing">
        <img
          src={imageUrl}
          alt="高清大图查看"
          referrerPolicy="no-referrer"
          onClick={(e) => e.stopPropagation()}
          style={{ transform: `scale(${scale})`, transition: 'transform 0.15s ease-out' }}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
};
