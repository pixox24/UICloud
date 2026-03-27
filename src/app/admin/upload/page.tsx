"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, FileUp, Loader2, Upload, X } from "lucide-react";
import {
  ASPECT_RATIO_OPTIONS,
  COLOR_THEME_OPTIONS,
  ORIENTATION_OPTIONS,
  USE_SCENARIO_OPTIONS,
} from "@/lib/asset-options";
import type { Asset, Category } from "@/types";

const SOURCE_ACCEPT =
  ".ai,.eps,.psd,.xd,.sketch,.fig,.png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.mp4,.mov,.webm,.avi,.ttf,.otf,.woff,.woff2";

export default function UploadPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [versionParents, setVersionParents] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [parentId, setParentId] = useState("");
  const [widthPx, setWidthPx] = useState("");
  const [heightPx, setHeightPx] = useState("");
  const [aspectRatio, setAspectRatio] = useState("");
  const [orientation, setOrientation] = useState("");
  const [colorTheme, setColorTheme] = useState("");
  const [useScenarios, setUseScenarios] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => setCategories(data.categories || []));

    fetch("/api/assets?all=1&limit=200")
      .then((response) => response.json())
      .then((data) => setVersionParents(data.assets || []));
  }, []);

  const parentOptions = useMemo(
    () => versionParents.filter((asset) => asset.is_active === 1),
    [versionParents]
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategoryId("");
    setTags("");
    setParentId("");
    setWidthPx("");
    setHeightPx("");
    setAspectRatio("");
    setOrientation("");
    setColorTheme("");
    setUseScenarios([]);
    setFile(null);
    setThumbnail(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    if (thumbRef.current) {
      thumbRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !name.trim()) {
      setError("请先填写名称并选择文件。");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", file);
    if (thumbnail) formData.append("thumbnail", thumbnail);
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("tags", tags.trim());
    formData.append("use_scenario", JSON.stringify(useScenarios));

    if (categoryId) formData.append("category_id", categoryId);
    if (parentId) formData.append("parent_id", parentId);
    if (widthPx) formData.append("width_px", widthPx);
    if (heightPx) formData.append("height_px", heightPx);
    if (aspectRatio) formData.append("aspect_ratio", aspectRatio);
    if (orientation) formData.append("orientation", orientation);
    if (colorTheme) formData.append("color_theme", colorTheme);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "上传失败");
      }

      setSuccess(true);
      resetForm();
      setTimeout(() => setSuccess(false), 3000);
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : "上传失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const toggleUseScenario = (value: string) => {
    setUseScenarios((current) =>
      current.indexOf(value) >= 0 ? current.filter((item) => item !== value) : current.concat(value)
    );
  };

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-xl font-semibold">上传资产</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50"
        >
          <FileUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          {file ? (
            <p className="text-sm">
              <span className="font-medium text-foreground">{file.name}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setFile(null);
                }}
                className="ml-2 text-destructive"
              >
                <X className="inline h-4 w-4" />
              </button>
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">拖拽文件到这里，或点击选择本地文件</p>
              <p className="mt-1 text-xs text-muted-foreground">
                支持源文件、图片、PDF、视频和字体，单文件最大 500MB
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={SOURCE_ACCEPT}
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="hidden"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">缩略图</label>
            <input
              ref={thumbRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
              onChange={(event) => setThumbnail(event.target.files?.[0] || null)}
              className="w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              如果不上传，图片类文件会自动生成缩略图。
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">版本基线</label>
            <select
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">作为新资产上传</option>
              {parentOptions.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  #{asset.id} {asset.name} (v{asset.version})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">名称 *</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">分类</label>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">未分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">描述</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">标签（逗号分隔）</label>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="例如：图标, UI, 插画"
            className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">宽度（px）</label>
            <input
              value={widthPx}
              onChange={(event) => setWidthPx(event.target.value)}
              inputMode="numeric"
              className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">高度（px）</label>
            <input
              value={heightPx}
              onChange={(event) => setHeightPx(event.target.value)}
              inputMode="numeric"
              className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">比例</label>
            <select
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">自动识别</option>
              {ASPECT_RATIO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">方向</label>
            <select
              value={orientation}
              onChange={(event) => setOrientation(event.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">自动识别</option>
              {ORIENTATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">颜色风格</label>
          <select
            value={colorTheme}
            onChange={(event) => setColorTheme(event.target.value)}
            className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">自动提取</option>
            {COLOR_THEME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">适用场景</label>
          <div className="flex flex-wrap gap-2">
            {USE_SCENARIO_OPTIONS.map((option) => {
              const active = useScenarios.indexOf(option) >= 0;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleUseScenario(option)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        ) : null}

        {success ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-500">
            <CheckCircle className="h-4 w-4" />
            上传成功，缩略图和元数据已更新。
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          上传资产
        </button>
      </form>
    </div>
  );
}
