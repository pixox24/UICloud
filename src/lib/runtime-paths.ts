import fs from "fs";
import path from "path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const DB_PATH = path.join(DATA_DIR, "assets.db");
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");
export const UPLOAD_ASSETS_DIR = path.join(UPLOADS_DIR, "assets");
export const UPLOAD_THUMBNAILS_DIR = path.join(UPLOADS_DIR, "thumbnails");
export const THUMBNAIL_ORIGINAL_DIR = path.join(UPLOAD_THUMBNAILS_DIR, "original");
export const THUMBNAIL_LARGE_DIR = path.join(UPLOAD_THUMBNAILS_DIR, "large");
export const THUMBNAIL_MEDIUM_DIR = path.join(UPLOAD_THUMBNAILS_DIR, "medium");
export const THUMBNAIL_SMALL_DIR = path.join(UPLOAD_THUMBNAILS_DIR, "small");
export const UPLOAD_FILES_DIR = UPLOAD_ASSETS_DIR;
export const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024;

export function ensureRuntimeDirs() {
  const directories = [
    DATA_DIR,
    UPLOADS_DIR,
    UPLOAD_ASSETS_DIR,
    UPLOAD_THUMBNAILS_DIR,
    THUMBNAIL_ORIGINAL_DIR,
    THUMBNAIL_LARGE_DIR,
    THUMBNAIL_MEDIUM_DIR,
    THUMBNAIL_SMALL_DIR,
  ];

  for (let index = 0; index < directories.length; index += 1) {
    if (!fs.existsSync(directories[index])) {
      fs.mkdirSync(directories[index], { recursive: true });
    }
  }
}
