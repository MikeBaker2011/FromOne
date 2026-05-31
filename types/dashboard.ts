export type MediaKind = "image" | "flyer" | "video";

export type GeneratedPost = {
  day?: string;
  platform?: string;
  title?: string;
  caption?: string;
  cta?: string;
  hashtags?: string[];
  image_prompt?: string;
};

export type AccessInfo = {
  id: string;
  user_id: string;
  access_status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  extension_ends_at: string | null;
  subscription_status: string | null;
};

export type WeeklyProgress = {
  total: number;
  posted: number;
  remaining: number;
  nextPost: any | null;
};

export type WeeklyUpload = {
  id: string;
  file: File;
  previewUrl: string;
  mediaUrl?: string;
  mediaPath?: string;
  mediaType?: MediaKind;
  note: string;
};

export type UploadedMediaItem = {
  upload_id: string;
  position: number;
  file_name: string;
  media_url: string;
  media_path: string;
  media_type: MediaKind;
  content_type: string;
  file_size: number;
  type: string;
  mimeType: string;
  description: string;
  context: string;
  topic_hint: string;
  note: string;
  conversion_warning?: string;
  original_media_url?: string;
  original_media_path?: string;
  original_media_type?: MediaKind;
  converted_from_pdf?: boolean;
};

export type PlatformOption = {
  name: string;
  shortName: string;
  description: string;
};
