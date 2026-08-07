import type { AspectRatio, Orientation } from "@/lib/asset-options";

export const ASSET_NAME_CATEGORY_CODES = ["UI", "ELM", "MOD", "NUM", "BRD"] as const;
export const ASSET_NAME_SHAPE_CODES = ["R", "SQ", "RC", "H", "V", "C"] as const;
export const DEFAULT_ASSET_NAME_CATEGORY_CODE = "UI";
export const ASSET_NAME_CATEGORY_CODE_LABELS: Record<AssetNameCategoryCode, string> = {
  UI: "完整界面",
  ELM: "元素",
  MOD: "模块",
  NUM: "数字",
  BRD: "品牌",
};

export type AssetNameCategoryCode = (typeof ASSET_NAME_CATEGORY_CODES)[number];
export type AssetNameShapeCode = (typeof ASSET_NAME_SHAPE_CODES)[number];

export function isAssetNameCategoryCode(value: string): value is AssetNameCategoryCode {
  return ASSET_NAME_CATEGORY_CODES.includes(value as AssetNameCategoryCode);
}

export function parseAssetNameCategoryCode(value: string | null | undefined): AssetNameCategoryCode | null {
  if (!value) {
    return null;
  }

  const segments = value.split("_");
  if (segments.length < 3) {
    return null;
  }

  return isAssetNameCategoryCode(segments[1]) ? segments[1] : null;
}

export function buildDefaultAssetName(
  assetId: number,
  categoryCode: AssetNameCategoryCode,
  shapeCode: AssetNameShapeCode
) {
  return `${assetId}_${categoryCode}_${shapeCode}`;
}

export function inferAssetNameShapeCode(input: {
  aspectRatio: AspectRatio | null;
  orientation: Orientation | null;
}): AssetNameShapeCode {
  if (input.aspectRatio === "circle" || input.orientation === "circle") {
    return "R";
  }

  if (input.aspectRatio === "1:1" || input.orientation === "square") {
    return "SQ";
  }

  if (input.orientation === "landscape") {
    return "H";
  }

  if (input.orientation === "portrait") {
    return "V";
  }

  return "C";
}
