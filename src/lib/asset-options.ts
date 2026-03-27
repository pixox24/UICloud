export const FILE_TYPE_OPTIONS = ["source", "image", "pdf", "video", "font", "other"] as const;
export const ASPECT_RATIO_OPTIONS = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "4:1",
  "1:4",
  "2:1",
  "1:2",
  "2:3",
  "3:2",
  "circle",
  "custom",
] as const;
export const ORIENTATION_OPTIONS = ["landscape", "portrait", "square", "circle"] as const;
export const COLOR_THEME_OPTIONS = ["dark", "light", "colorful", "gradient", "monochrome"] as const;
export const USE_SCENARIO_OPTIONS = [
  "banner",
  "icon",
  "landing",
  "packaging",
  "social",
  "ui_component",
  "illustration",
  "other",
] as const;

export type FileType = (typeof FILE_TYPE_OPTIONS)[number];
export type AspectRatio = (typeof ASPECT_RATIO_OPTIONS)[number];
export type Orientation = (typeof ORIENTATION_OPTIONS)[number];
export type ColorTheme = (typeof COLOR_THEME_OPTIONS)[number];
export type UseScenario = (typeof USE_SCENARIO_OPTIONS)[number];

type ThumbnailFields = {
  thumbnail_path?: string | null;
  thumbnail_original?: string | null;
  thumbnail_large?: string | null;
  thumbnail_medium?: string | null;
  thumbnail_small?: string | null;
};

export function getPreferredThumbnailPath(asset: ThumbnailFields): string {
  return (
    asset.thumbnail_medium ||
    asset.thumbnail_path ||
    asset.thumbnail_original ||
    asset.thumbnail_large ||
    asset.thumbnail_small ||
    ""
  );
}

export function parseUseScenarioValue(value: unknown): UseScenario[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(isUseScenario);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(isUseScenario);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(isUseScenario);
    }
  }

  return [];
}

export function isFileType(value: string): value is FileType {
  return FILE_TYPE_OPTIONS.indexOf(value as FileType) >= 0;
}

export function isAspectRatio(value: string): value is AspectRatio {
  return ASPECT_RATIO_OPTIONS.indexOf(value as AspectRatio) >= 0;
}

export function isOrientation(value: string): value is Orientation {
  return ORIENTATION_OPTIONS.indexOf(value as Orientation) >= 0;
}

export function isColorTheme(value: string): value is ColorTheme {
  return COLOR_THEME_OPTIONS.indexOf(value as ColorTheme) >= 0;
}

export function isUseScenario(value: string): value is UseScenario {
  return USE_SCENARIO_OPTIONS.indexOf(value as UseScenario) >= 0;
}
