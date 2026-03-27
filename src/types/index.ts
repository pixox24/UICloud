import type {
  AspectRatio,
  ColorTheme,
  FileType,
  Orientation,
  UseScenario,
} from "@/lib/asset-options";

export interface User {
  id: number;
  username: string;
  role: "admin" | "user";
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
}

export interface Asset {
  id: number;
  name: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  file_path: string;
  file_hash: string | null;
  mime_type: string | null;
  file_type: FileType;
  thumbnail_path: string;
  thumbnail_original: string;
  thumbnail_large: string;
  thumbnail_medium: string;
  thumbnail_small: string;
  file_size: number;
  file_format: string;
  aspect_ratio: AspectRatio | null;
  orientation: Orientation | null;
  width_px: number | null;
  height_px: number | null;
  color_theme: ColorTheme | null;
  primary_color: string | null;
  use_scenario: UseScenario[];
  version: number;
  parent_id: number | null;
  download_count: number;
  view_count: number;
  created_by: number;
  creator_name: string;
  created_at: string;
  updated_at: string;
  is_active: number;
  tags: string[];
}

export interface Tag {
  id: number;
  name: string;
}
