import type { MediaKind, WeeklyUpload } from "@/types/dashboard";

export const MAX_PDF_FLYER_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_SCAN_BYTES = 20 * 1024 * 1024;

export const SUPPORTED_WEEKLY_UPLOAD_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "application/pdf",
];

export const getSafeFileName = (fileName: string) => {
  const cleanName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleanName || "media";
};

export const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0MB";

  const mb = bytes / (1024 * 1024);

  if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)}MB`;

  return `${Math.max(bytes / 1024, 1).toFixed(0)}KB`;
};

export const getWeeklyUploadMediaType = (file: File): MediaKind => {
  if (file.type === "application/pdf") return "flyer";
  if (file.type.startsWith("video/")) return "video";
  return "image";
};

export const isSupportedWeeklyUploadFile = (file: File) => {
  return (
    SUPPORTED_WEEKLY_UPLOAD_TYPES.includes(file.type) ||
    file.name.toLowerCase().endsWith(".pdf")
  );
};

export const getWeeklyUploadUnsupportedReason = (file: File) => {
  const fileName = file.name || "This file";

  if (!isSupportedWeeklyUploadFile(file)) {
    return `${fileName} is not supported. Please upload JPG, PNG, WEBP, MP4, MOV, or PDF.`;
  }

  if (file.type === "application/pdf" && file.size > MAX_PDF_FLYER_BYTES) {
    return `${fileName} is ${formatFileSize(file.size)}. PDF flyers need to be under 10MB. Try exporting a smaller PDF or upload a JPG/PNG version.`;
  }

  if (file.type.startsWith("video/") && file.size > MAX_VIDEO_SCAN_BYTES) {
    return `${fileName} is ${formatFileSize(file.size)}. Short videos under 20MB work best for scanning. Please upload a shorter clip or add a clear quick description.`;
  }

  return "";
};

export const buildUploadAnalysisContext = (
  upload: WeeklyUpload,
  mediaType: MediaKind,
  uploadNote: string,
  index: number,
) => {
  if (mediaType === "flyer" && upload.file.size > MAX_PDF_FLYER_BYTES) {
    throw new Error(
      `${upload.file.name} is ${formatFileSize(upload.file.size)}. PDF flyers need to be under 10MB. Try exporting a smaller PDF or an image from Canva.`,
    );
  }

  const baseContext = [
    `Upload ${index + 1}`,
    `Original filename: ${upload.file.name}`,
    `MIME type: ${upload.file.type || "unknown"}`,
    `File size: ${upload.file.size} bytes`,
    uploadNote
      ? `Client quick description: ${uploadNote}`
      : "Client quick description: not supplied",
  ].join(". ");

  if (mediaType === "video") {
    return `${baseContext}. This is a video-led post. Analyse the actual video footage if available. The post must relate to what the clip shows: the scene, action, movement, atmosphere, product, service, event, job progress, result, behind-the-scenes moment, offer or booking/enquiry opportunity. Use the quick description as supporting context. Do not write a generic business post. If the video cannot be inspected because it is too large or unsupported, use the quick description and filename carefully without pretending to have seen exact details.`;
  }

  if (mediaType === "flyer") {
    return `${baseContext}. This is a flyer/poster/PDF-led post. Use extracted text if available and the quick description to identify the offer, event, date, price, service, location and CTA. Rewrite it as a natural social post.`;
  }

  return `${baseContext}. This is an image-led post. Analyse the image if available and make the visible subject the topic. Use the quick description as supporting context and the business profile for tone, CTA and local relevance.`;
};
