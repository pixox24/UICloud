"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock3,
  FileArchive,
  FileImage,
  FileText,
  FileUp,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import {
  ASPECT_RATIO_OPTIONS,
  COLOR_THEME_OPTIONS,
  ORIENTATION_OPTIONS,
  USE_SCENARIO_OPTIONS,
} from "@/lib/asset-options";
import {
  ASSET_NAME_CATEGORY_CODES,
  ASSET_NAME_CATEGORY_CODE_LABELS,
  DEFAULT_ASSET_NAME_CATEGORY_CODE,
  type AssetNameCategoryCode,
} from "@/lib/asset-naming";
import type { Asset, Category } from "@/types";

const SOURCE_ACCEPT =
  ".ai,.eps,.psd,.xd,.sketch,.fig,.png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.mp4,.mov,.webm,.avi,.ttf,.otf,.woff,.woff2";

type PreviewSource = "uploaded" | "image" | "source" | "none";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "success" | "error";
  message?: string;
  assetName?: string;
  usedAutoName?: boolean;
  previewGenerated?: boolean;
  previewSource?: PreviewSource;
}

interface UploadResponse {
  success?: boolean;
  error?: string;
  assetName?: string;
  usedAutoName?: boolean;
  assetNameCategoryCode?: AssetNameCategoryCode;
  assetNameShapeCode?: string;
  previewGenerated?: boolean;
  previewSource?: PreviewSource;
  previewWarning?: string | null;
}

export default function UploadPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [versionParents, setVersionParents] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assetNameCategoryCode, setAssetNameCategoryCode] = useState<AssetNameCategoryCode>(
    DEFAULT_ASSET_NAME_CATEGORY_CODE
  );
  const [tags, setTags] = useState("");
  const [parentId, setParentId] = useState("");
  const [widthPx, setWidthPx] = useState("");
  const [heightPx, setHeightPx] = useState("");
  const [aspectRatio, setAspectRatio] = useState("");
  const [orientation, setOrientation] = useState("");
  const [colorTheme, setColorTheme] = useState("");
  const [useScenarios, setUseScenarios] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));

    fetch("/api/assets?all=1&limit=200")
      .then((response) => response.json())
      .then((data) => setVersionParents(data.assets || []))
      .catch(() => setVersionParents([]));
  }, []);

  const parentOptions = useMemo(
    () => versionParents.filter((asset) => asset.is_active === 1),
    [versionParents]
  );

  const clearFormFields = () => {
    setName("");
    setDescription("");
    setCategoryId("");
    setAssetNameCategoryCode(DEFAULT_ASSET_NAME_CATEGORY_CODE);
    setTags("");
    setParentId("");
    setWidthPx("");
    setHeightPx("");
    setAspectRatio("");
    setOrientation("");
    setColorTheme("");
    setUseScenarios([]);
    setFiles([]);
    setThumbnail(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    if (thumbRef.current) {
      thumbRef.current.value = "";
    }
  };

  const uploadFile = (
    file: File,
    formDataFields: Record<string, string | File | null>,
    onProgress: (progress: number) => void
  ): Promise<{ ok: boolean; data: UploadResponse }> => {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append("file", file);
      if (formDataFields.thumbnail) {
        formData.append("thumbnail", formDataFields.thumbnail as File);
      }
      formData.append("name", formDataFields.name as string);
      formData.append("asset_name_category_code", formDataFields.asset_name_category_code as string);
      formData.append("description", formDataFields.description as string);
      formData.append("tags", formDataFields.tags as string);
      formData.append("use_scenario", formDataFields.use_scenario as string);

      if (formDataFields.category_id) formData.append("category_id", formDataFields.category_id as string);
      if (formDataFields.parent_id) formData.append("parent_id", formDataFields.parent_id as string);
      if (formDataFields.width_px) formData.append("width_px", formDataFields.width_px as string);
      if (formDataFields.height_px) formData.append("height_px", formDataFields.height_px as string);
      if (formDataFields.aspect_ratio) formData.append("aspect_ratio", formDataFields.aspect_ratio as string);
      if (formDataFields.orientation) formData.append("orientation", formDataFields.orientation as string);
      if (formDataFields.color_theme) formData.append("color_theme", formDataFields.color_theme as string);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      xhr.addEventListener("load", () => {
        let data: UploadResponse = {};
        try {
          data = JSON.parse(xhr.responseText) as UploadResponse;
        } catch {
          data = { error: "服务器返回了无法解析的响应。" };
        }

        resolve({ ok: xhr.status < 400, data });
      });

      xhr.addEventListener("error", () => {
        resolve({ ok: false, data: { error: "网络错误，请稍后重试。" } });
      });

      xhr.send(formData);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (files.length === 0) {
      setError("请先选择要上传的文件。");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);
    setUploadProgress(files.map((file) => ({ fileName: file.name, progress: 0, status: "uploading" })));

    const formDataFields = {
      name: files.length === 1 ? name.trim() : "",
      asset_name_category_code: assetNameCategoryCode,
      description: description.trim(),
      tags: tags.trim(),
      use_scenario: JSON.stringify(useScenarios),
      category_id: categoryId,
      parent_id: parentId,
      width_px: widthPx,
      height_px: heightPx,
      aspect_ratio: aspectRatio,
      orientation: orientation,
      color_theme: colorTheme,
      thumbnail,
    };

    let allSuccess = true;
    let previewMissingCount = 0;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const effectiveName =
        files.length === 1 && name.trim() ? name.trim() : file.name.replace(/\.[^.]+$/, "");

      const result = await uploadFile(file, { ...formDataFields, name: effectiveName }, (progress) => {
        setUploadProgress((prev) =>
          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, progress } : item))
        );
      });

      if (result.ok && result.data.previewGenerated === false) {
        previewMissingCount += 1;
      }

      setUploadProgress((prev) =>
        prev.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                status: result.ok ? "success" : "error",
                progress: result.ok ? 100 : item.progress,
                message: result.ok
                  ? result.data.previewWarning || undefined
                  : result.data.error || "上传失败。",
                assetName: result.data.assetName,
                usedAutoName: result.data.usedAutoName,
                previewGenerated: result.data.previewGenerated,
                previewSource: result.data.previewSource,
              }
            : item
        )
      );

      if (!result.ok) {
        allSuccess = false;
      }
    }

    if (allSuccess) {
      setSuccess(true);
      clearFormFields();
      if (previewMissingCount > 0) {
        toastSuccess(`${files.length} 个文件已上传，其中 ${previewMissingCount} 个未生成预览图。`);
      } else {
        toastSuccess(`${files.length} 个文件已上传并生成预览。`);
      }
      setTimeout(() => setSuccess(false), 3000);
    } else {
      toastError("部分文件上传失败，请查看结果卡片。");
    }

    setLoading(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    setFiles((prev) => prev.concat(droppedFiles));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles((prev) => prev.concat(selectedFiles));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const toggleUseScenario = (value: string) => {
    setUseScenarios((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : current.concat(value)
    );
  };

  const successCount = uploadProgress.filter((item) => item.status === "success").length;
  const errorCount = uploadProgress.filter((item) => item.status === "error").length;
  const uploadingCount = uploadProgress.filter((item) => item.status === "uploading").length;
  const suggestedNameTemplate = `资源ID_${assetNameCategoryCode}_自动形态`;

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

          {files.length > 0 ? (
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">已选择 {files.length} 个文件</p>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  批量上传
                </span>
              </div>

              <div className="grid max-h-64 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {files.map((file, index) => {
                  const fileMeta = getFileMeta(file.name);
                  const Icon = getFileIcon(fileMeta.kind);

                  return (
                    <div
                      key={`${file.name}-${index}`}
                      className="rounded-2xl border border-border bg-card/80 p-3 shadow-sm transition-colors hover:border-primary/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`rounded-xl p-2 ${fileMeta.iconBg}`}>
                            <Icon className={`h-4 w-4 ${fileMeta.iconText}`} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full bg-secondary px-2 py-0.5 uppercase">
                                {fileMeta.ext || "FILE"}
                              </span>
                              <span>{formatFileSize(file.size)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeFile(index);
                          }}
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                          aria-label={`移除 ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">拖拽文件到这里，或点击选择本地文件</p>
              <p className="mt-1 text-xs text-muted-foreground">
                支持源文件、图片、PDF、视频和字体，单文件最大 500MB，可批量选择多个文件。
              </p>
            </>
          )}

          <input
            ref={fileRef}
            type="file"
            accept={SOURCE_ACCEPT}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {uploadProgress.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                上传中 {uploadingCount}
              </span>
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-500">
                成功 {successCount}
              </span>
              <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive">
                失败 {errorCount}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {uploadProgress.map((item, index) => {
                const statusMeta =
                  item.status === "success"
                    ? {
                        label: "上传完成",
                        icon: CheckCircle,
                        tone: "text-green-500",
                        badge: "bg-green-500/10 text-green-500",
                        bar: "bg-green-500",
                      }
                    : item.status === "error"
                    ? {
                        label: "上传失败",
                        icon: AlertCircle,
                        tone: "text-destructive",
                        badge: "bg-destructive/10 text-destructive",
                        bar: "bg-destructive",
                      }
                    : {
                        label: `${item.progress}%`,
                        icon: Clock3,
                        tone: "text-primary",
                        badge: "bg-primary/10 text-primary",
                        bar: "bg-primary",
                      };

                const previewMeta = getPreviewMeta(item);
                const StatusIcon = statusMeta.icon;
                const fileMeta = getFileMeta(item.fileName);
                const FileIcon = getFileIcon(fileMeta.kind);

                return (
                  <div
                    key={`${item.fileName}-${index}`}
                    className="rounded-2xl border border-border bg-card/80 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={`rounded-xl p-2 ${fileMeta.iconBg}`}>
                          <FileIcon className={`h-4 w-4 ${fileMeta.iconText}`} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.assetName || item.fileName}
                          </p>
                          {item.assetName && item.assetName !== item.fileName ? (
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              源文件：{item.fileName}
                            </p>
                          ) : null}
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs ${statusMeta.badge}`}>
                              {statusMeta.label}
                            </span>
                            {item.status === "success" && item.usedAutoName !== undefined ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  item.usedAutoName
                                    ? "bg-secondary text-muted-foreground"
                                    : "bg-violet-500/10 text-violet-600"
                                }`}
                              >
                                {item.usedAutoName ? "系统自动命名" : "手动命名"}
                              </span>
                            ) : null}
                            {previewMeta ? (
                              <span className={`rounded-full px-2 py-0.5 text-xs ${previewMeta.badge}`}>
                                {previewMeta.label}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${statusMeta.tone}`} />
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${statusMeta.bar}`}
                        style={{
                          width: `${
                            item.status === "error"
                              ? 100
                              : Math.max(item.progress, item.status === "success" ? 100 : 6)
                          }%`,
                        }}
                      />
                    </div>

                    {item.message ? (
                      <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{item.message}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

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
              不上传也可以。图片会直接用原图生成缩略图，PSD、AI、EPS、PDF 会尝试自动提取预览。
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
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">名称</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                files.length > 1
                  ? "批量上传时将使用系统自动命名"
                  : "留空则使用系统自动命名"
              }
              disabled={files.length > 1}
              className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {files.length > 1
                ? "批量上传时不建议手动命名，系统会按“资源ID_类别码_形态码”自动生成。"
                : `留空后默认生成：${suggestedNameTemplate}`}
            </p>
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

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">用途码</label>
            <select
              value={assetNameCategoryCode}
              onChange={(event) =>
                setAssetNameCategoryCode(event.target.value as AssetNameCategoryCode)
              }
              className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ASSET_NAME_CATEGORY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code} · {ASSET_NAME_CATEGORY_CODE_LABELS[code]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              自动命名会生成“资源ID_{assetNameCategoryCode}_形态码”，形态码由系统按缩略图自动判断。
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-3">
            <p className="text-sm font-medium text-foreground">命名预览</p>
            <p className="mt-2 text-sm text-muted-foreground">{suggestedNameTemplate}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              真实资源 ID 只有入库后才确定，所以这里显示的是模板。
            </p>
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
              const active = useScenarios.includes(option);
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
            上传完成，结果已保留在上方卡片中。
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || files.length === 0}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {loading ? `上传中（${files.length} 个文件）` : `上传${files.length > 1 ? ` ${files.length} 个` : ""}资产`}
        </button>
      </form>
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, index);
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function getFileMeta(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
    return {
      ext,
      kind: "image",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-500",
    };
  }

  if (["ai", "eps", "psd", "xd", "sketch", "fig"].includes(ext)) {
    return {
      ext,
      kind: "source",
      iconBg: "bg-sky-500/10",
      iconText: "text-sky-500",
    };
  }

  if (ext === "pdf") {
    return {
      ext,
      kind: "pdf",
      iconBg: "bg-rose-500/10",
      iconText: "text-rose-500",
    };
  }

  return {
    ext,
    kind: "other",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-500",
  };
}

function getFileIcon(kind: string) {
  if (kind === "image") return FileImage;
  if (kind === "pdf") return FileText;
  return FileArchive;
}

function getPreviewMeta(item: UploadProgress) {
  if (item.status !== "success") {
    return null;
  }

  if (item.previewGenerated === false) {
    return {
      label: "未生成预览",
      badge: "bg-amber-500/10 text-amber-600",
    };
  }

  if (item.previewSource === "source") {
    return {
      label: "自动提取预览",
      badge: "bg-sky-500/10 text-sky-600",
    };
  }

  if (item.previewSource === "uploaded") {
    return {
      label: "使用自定义缩略图",
      badge: "bg-violet-500/10 text-violet-600",
    };
  }

  if (item.previewSource === "image") {
    return {
      label: "使用原图预览",
      badge: "bg-emerald-500/10 text-emerald-600",
    };
  }

  return null;
}
