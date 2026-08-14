export type GenerationMode = 'image-edit' | 'text-to-image' | 'reference-image';

export type AspectRatio =
  | 'auto'
  | '1:1'
  | '9:16'
  | '16:9'
  | '3:4'
  | '4:3'
  | '3:2'
  | '2:3'
  | '5:4'
  | '4:5'
  | '21:9'
  | '1:4'
  | '4:1'
  | '1:8'
  | '8:1';

export type Resolution = '512px' | '1K' | '2K' | '4K';

export type OutputFormat = 'PNG' | 'JPG' | 'WEBP';

export type AIModelId = string;

export interface AIModelOption {
  id: AIModelId;
  name: string;
  badge: string;
  description: string;
  creditsMultiplier: number;
}

export interface GenerationParams {
  prompt: string;
  negativePrompt?: string;
  mode: GenerationMode;
  model: AIModelId;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;
  enableGoogleSearch: boolean;
  referenceImage?: string | null;
  referenceImageName?: string;
  strength?: number;
  seed?: number;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  negativePrompt?: string;
  mode: GenerationMode;
  model: AIModelId;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;
  originalImageUrl?: string;
  resultImageUrl: string;
  timestamp: number;
  durationMs: number;
  seed?: number;
  isFavorite?: boolean;
  upscaled?: boolean;
}

export interface PromptTemplate {
  id: string;
  title: string;
  category: string;
  prompt: string;
  sampleImage: string;
  sampleOriginalImage?: string;
  defaultMode: GenerationMode;
  aspectRatio: AspectRatio;
  tags: string[];
}
