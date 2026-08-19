"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Check,
  Layers,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import SideNav from "@/components/SideNav";
import { useToast } from "@/components/Toast";
import { PROMPT_TEMPLATES } from "@/lib/ai-studio/templates";
import type { User } from "@/types";
import type { PromptTemplate } from "@/types/ai-studio";
import type { SavedTemplate } from "@/services/TemplateService";

export default function TemplatesPage() {
  return (
    <Suspense fallback={<TemplatesSkeleton />}>
      <TemplatesContent />
    </Suspense>
  );
}

function TemplatesContent() {
  const router = useRouter();
  const { success, error } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [saved, setSaved] = useState<SavedTemplate[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [appliedId, setAppliedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user))
      .catch(() => undefined);
  }, []);

  const loadSaved = () => {
    setLoadingSaved(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        setSaved(Array.isArray(data) ? data : []);
      })
      .catch(() => setSaved([]))
      .finally(() => setLoadingSaved(false));
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(["全部"]);
    PROMPT_TEMPLATES.forEach((t) => set.add(t.category));
    saved.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [saved]);

  const builtIn = PROMPT_TEMPLATES.filter(
    (t) =>
      (category === "全部" || t.category === category) &&
      (!search ||
        t.title.includes(search) ||
        t.prompt.includes(search) ||
        t.tags.some((tag) => tag.includes(search)))
  );

  const savedFiltered = saved.filter(
    (t) =>
      (category === "全部" || t.category === category) &&
      (!search ||
        t.title.includes(search) ||
        t.prompt.includes(search) ||
        t.tags.some((tag) => tag.includes(search)))
  );

  const applyTemplate = (tmpl: PromptTemplate | SavedTemplate) => {
    setAppliedId(tmpl.id);
    const params = new URLSearchParams();
    params.set("template", tmpl.id);
    params.set("prompt", tmpl.prompt);
    params.set("mode", tmpl.defaultMode);
    params.set("aspect", tmpl.aspectRatio);
    if (tmpl.sampleOriginalImage) params.set("ref", tmpl.sampleOriginalImage);
    router.push(`/studio?${params.toString()}`);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("确定删除该模板吗？")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      success("模板已删除");
      loadSaved();
    } catch {
      error("删除模板失败");
    }
  };

  const isApplied = (id: string) => appliedId === id;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0e12] text-gray-200">
      <SideNav user={user} activeItem="templates" />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 md:px-8 py-6 border-b border-[#202734] bg-[#0e1117]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a261c] border border-[#33fb02]/40 flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#33fb02]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">精选创作模板库</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  内置灵感预设 + 你的专属收藏，一键载入创作
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索模板名称、提示词、标签..."
                className="w-full rounded-xl bg-[#141820] border border-[#232b38] pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#33fb02]/60"
              />
            </div>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                  category === cat
                    ? "bg-[#1b261d] border-2 border-[#33fb02] text-[#33fb02]"
                    : "bg-[#181d26] border-2 border-[#232b38] hover:border-gray-500 text-gray-300 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
          {/* My templates section */}
          {!loadingSaved && savedFiltered.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-gray-300">我的收藏模板</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#202733] text-gray-400">
                  {savedFiltered.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {savedFiltered.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-xl bg-[#141820] hover:bg-[#19202b] border-2 border-[#232b38] hover:border-amber-400/60 transition-all duration-150 p-2.5 flex flex-col justify-between space-y-2.5 shadow-lg active:scale-[0.99]"
                  >
                    <div className="relative rounded-lg overflow-hidden aspect-[4/3] bg-black/60 border border-[#202734]">
                      {item.sampleImage ? (
                        <img
                          src={item.sampleImage}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-amber-300 font-semibold border border-amber-400/30">
                        {item.category}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplate(item.id);
                        }}
                        title="删除模板"
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 text-gray-400 hover:text-red-400 hover:bg-red-950/60 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-xs font-bold text-gray-100 group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                        {item.prompt}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#1d232e]">
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-[#1f2634] text-gray-400"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => applyTemplate(item)}
                        className={`flex items-center gap-1 text-xs font-semibold transition-all active:scale-95 ${
                          isApplied(item.id) ? "text-amber-300" : "text-amber-400 group-hover:translate-x-0.5"
                        }`}
                      >
                        {isApplied(item.id) ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> 已载入
                          </>
                        ) : (
                          <>
                            <span>应用</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Built-in featured templates */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#33fb02]" />
              <h2 className="text-sm font-bold text-gray-300">官方精选模板</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#202733] text-gray-400">
                {builtIn.length}
              </span>
            </div>

            {builtIn.length === 0 && savedFiltered.length === 0 ? (
              <div className="py-24 text-center">
                <Search className="mx-auto mb-3 h-10 w-10 opacity-30 text-gray-500" />
                <p className="text-sm text-gray-500">没有匹配的模板。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {builtIn.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => applyTemplate(item)}
                    className="group relative rounded-xl bg-[#141820] hover:bg-[#19202b] border-2 border-[#232b38] hover:border-[#33fb02] transition-all duration-150 p-2.5 flex flex-col justify-between space-y-2.5 shadow-lg active:scale-[0.99] cursor-pointer"
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
                          <span
                            key={t}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-[#1f2634] text-gray-400"
                          >
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
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function TemplatesSkeleton() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0c0e12] text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
