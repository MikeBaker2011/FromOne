"use client";

import "./post-review.module.css";

import {
  ChangeEvent,
  PointerEvent,
  WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase/browser";

type ResizePresetValue =
  | "instagram-square"
  | "instagram-portrait"
  | "instagram-story"
  | "facebook-feed"
  | "facebook-square"
  | "facebook-story"
  | "tiktok-vertical"
  | "tiktok-square";

type EditMode = "crop" | "rotate" | "flip";

type ResizePreset = {
  value: ResizePresetValue;
  label: string;
  size: string;
  width: number;
  height: number;
};

type MediaOffset = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startOffset: MediaOffset;
};

type ActivePointer = {
  pointerId: number;
  clientX: number;
  clientY: number;
};

type PinchState = {
  startDistance: number;
  startZoom: number;
  startOffset: MediaOffset;
  startCenterX: number;
  startCenterY: number;
};

type PreparedMedia = {
  url: string;
  label: string;
  width: number;
  height: number;
};

const resizePresets: ResizePreset[] = [
  {
    value: "instagram-portrait",
    label: "Instagram portrait",
    size: "1080 × 1350",
    width: 1080,
    height: 1350,
  },
  {
    value: "instagram-square",
    label: "Instagram square",
    size: "1080 × 1080",
    width: 1080,
    height: 1080,
  },
  {
    value: "instagram-story",
    label: "Instagram story / reel",
    size: "1080 × 1920",
    width: 1080,
    height: 1920,
  },
  {
    value: "facebook-feed",
    label: "Facebook feed",
    size: "1200 × 630",
    width: 1200,
    height: 630,
  },
  {
    value: "facebook-square",
    label: "Facebook square",
    size: "1080 × 1080",
    width: 1080,
    height: 1080,
  },
  {
    value: "facebook-story",
    label: "Facebook story",
    size: "1080 × 1920",
    width: 1080,
    height: 1920,
  },
  {
    value: "tiktok-vertical",
    label: "TikTok vertical",
    size: "1080 × 1920",
    width: 1080,
    height: 1920,
  },
  {
    value: "tiktok-square",
    label: "TikTok square cover",
    size: "1080 × 1080",
    width: 1080,
    height: 1080,
  },
];

const quickImproveActions = [
  { value: "shorter", label: "Make shorter" },
  { value: "premium", label: "More premium" },
  { value: "sales", label: "Sales focused" },
  { value: "less_generic", label: "Less generic" },
  { value: "different", label: "Different version" },
];

const audienceOptions = [
  "Small business owners",
  "Local customers",
  "Homeowners",
  "Families",
  "Retail customers",
  "Event organisers",
  "Tradespeople",
];

const reachOptions = [
  "Local customers",
  "Regional customers",
  "Nationwide UK customers",
  "Online customers",
];

const toneOptions = [
  "Use current tone",
  "Premium and polished",
  "Friendly and local",
  "Direct and sales focused",
  "Warm and reassuring",
  "Bold and confident",
];

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPointerDistance(first: ActivePointer, second: ActivePointer) {
  return Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY,
  );
}

function getPointerCenter(first: ActivePointer, second: ActivePointer) {
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
}

function normalisePlatform(platform?: string | null) {
  const clean = cleanText(platform).toLowerCase();

  if (clean.includes("instagram")) return "Instagram";
  if (clean.includes("tiktok")) return "TikTok";
  if (clean.includes("facebook")) return "Facebook";

  return "Facebook";
}

function getPlatformUrl(platform: string) {
  const clean = platform.toLowerCase();

  if (clean.includes("instagram")) return "https://www.instagram.com/";
  if (clean.includes("tiktok")) return "https://www.tiktok.com/upload";

  return "https://www.facebook.com/";
}

function formatScheduledDate(value?: string | null) {
  const cleanValue = cleanText(value);

  if (!cleanValue) return "";

  const date = new Date(cleanValue);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScheduleValue(post: any) {
  return cleanText(post?.scheduled_publish_at || post?.scheduled_at);
}

function getDateTimeLocalValue(value?: string | null) {
  const cleanValue = cleanText(value);

  if (!cleanValue) return "";

  const date = new Date(cleanValue);

  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
}

function getAutopublishStatus(post: any, isPosted: boolean) {
  const publishStatus = cleanText(post?.publish_status).toLowerCase();
  const status = cleanText(post?.status).toLowerCase();
  const publishError = cleanText(post?.publish_error);
  const scheduleValue = getScheduleValue(post);

  if (
    isPosted ||
    publishStatus === "posted" ||
    publishStatus === "published" ||
    status === "posted"
  ) {
    return {
      label: "Published",
      tone: "success",
      description: "This post has been published.",
    };
  }

  if (publishStatus === "failed" || status === "failed" || publishError) {
    return {
      label: "Needs attention",
      tone: "error",
      description:
        publishError ||
        "Autopublish did not complete. Reconnect Meta or post manually.",
    };
  }

  if (!scheduleValue) {
    return {
      label: "Not scheduled",
      tone: "neutral",
      description: "Choose a time or publish manually.",
    };
  }

  const scheduleTime = new Date(scheduleValue).getTime();
  const isDue = !Number.isNaN(scheduleTime) && scheduleTime <= Date.now();

  if (isDue) {
    return {
      label: "Due now",
      tone: "warning",
      description:
        "This post is due. The scheduler will try to publish it, or you can publish now.",
    };
  }

  return {
    label: "Planned",
    tone: "planned",
    description:
      "FromOne will try to publish this automatically at the planned time.",
  };
}

function getPresetForApi(value: ResizePresetValue) {
  if (value === "facebook-square") return "instagram-square";
  if (value === "facebook-story") return "story-reel";
  if (value === "instagram-story") return "story-reel";
  if (value === "tiktok-vertical") return "story-reel";
  if (value === "tiktok-square") return "instagram-square";

  return value;
}

function getRecommendedPresets(platformName: string) {
  const platform = platformName.toLowerCase();

  if (platform.includes("instagram")) {
    return resizePresets.filter((preset) =>
      ["instagram-portrait", "instagram-square", "instagram-story"].includes(
        preset.value,
      ),
    );
  }

  if (platform.includes("tiktok")) {
    return resizePresets.filter((preset) =>
      ["tiktok-vertical", "tiktok-square"].includes(preset.value),
    );
  }

  return resizePresets.filter((preset) =>
    ["facebook-feed", "facebook-square", "facebook-story"].includes(
      preset.value,
    ),
  );
}

function getDefaultPresetForPlatform(platformName: string): ResizePresetValue {
  const platform = platformName.toLowerCase();

  if (platform.includes("instagram")) return "instagram-portrait";
  if (platform.includes("tiktok")) return "tiktok-vertical";

  return "facebook-feed";
}

function getSafeFileName(value?: string | null) {
  return (
    cleanText(value || "fromone-post-media")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "fromone-post-media"
  );
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function withCacheBust(url: string) {
  if (!url) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

async function urlToFile(url: string, filename: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load the prepared image for sharing.");
  }

  const blob = await response.blob();
  const type = blob.type || "image/jpeg";
  const extension = type.includes("png")
    ? "png"
    : type.includes("webp")
      ? "webp"
      : "jpg";

  return new File([blob], `${filename}.${extension}`, { type });
}

async function setupPdfJs() {
  const pdfjs = await import("pdfjs-dist");

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  return pdfjs;
}

function looksLikePdf(data: ArrayBuffer) {
  if (!data || data.byteLength < 5) return false;

  const header = new TextDecoder("ascii")
    .decode(new Uint8Array(data.slice(0, 5)))
    .trim();

  return header.startsWith("%PDF");
}

async function getPdfBytesFromUrl(url: string) {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(
      "This stored PDF could not be loaded. Please re-upload the flyer or upload a JPG/PNG version.",
    );
  }

  const data = await response.arrayBuffer();

  if (!looksLikePdf(data)) {
    throw new Error(
      "This older flyer needs to be re-uploaded so FromOne can prepare it automatically.",
    );
  }

  return data;
}

async function getPdfBytesFromFile(file: File) {
  const data = await file.arrayBuffer();

  if (!looksLikePdf(data)) {
    throw new Error(
      "This file does not look like a valid PDF. Please export it again or upload a JPG/PNG version.",
    );
  }

  return data;
}

function PdfFirstPagePreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewStatus, setPreviewStatus] = useState("Loading PDF preview...");
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;

    const renderPreview = async () => {
      if (!url) return;

      setPreviewStatus("Loading PDF preview...");
      setPreviewFailed(false);

      try {
        const pdfjs = await setupPdfJs();
        const pdfBytes = await getPdfBytesFromUrl(url);

        loadingTask = pdfjs.getDocument({ data: pdfBytes });

        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = 900;
        const scale = clampNumber(targetWidth / baseViewport.width, 0.75, 2);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context) {
          throw new Error("PDF preview canvas is unavailable.");
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvas,
    canvasContext: context, viewport }).promise;

        if (!cancelled) {
          setPreviewStatus("");
          setPreviewFailed(false);
        }
      } catch (error: any) {
        if (!cancelled) {
          setPreviewStatus(
            error?.message ||
              "PDF preview is unavailable. You can still view, download, or re-upload this PDF.",
          );
          setPreviewFailed(true);
        }
      }
    };

    renderPreview();

    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
    };
  }, [url]);

  return (
    <div className="pr2-pdf-preview">
      <canvas
        ref={canvasRef}
        style={{
          display: previewFailed ? "none" : "block",
          maxWidth: "100%",
          width: "100%",
          height: "auto",
          borderRadius: 18,
          background: "#ffffff",
        }}
      />
      {previewStatus && <p>{previewStatus}</p>}
    </div>
  );
}

export default function PostReviewPage() {
  const router = useRouter();
  const params = useParams();

  const postId = useMemo(() => {
    const value = params?.postId;
    return Array.isArray(value) ? value[0] : cleanText(value);
  }, [params]);

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [caption, setCaption] = useState("");
  const [cta, setCta] = useState("");
  const [hashtags, setHashtags] = useState("");

  const [message, setMessage] = useState("");
  const [activePanel, setActivePanel] = useState<
    "review" | "prepare" | "improve"
  >("review");
  const [isPositioningMedia, setIsPositioningMedia] = useState(false);

  const [resizePresetValue, setResizePresetValue] =
    useState<ResizePresetValue>("facebook-feed");
  const [prepareFitMode, setPrepareFitMode] = useState<"fill" | "fit">("fill");
  const [editMode, setEditMode] = useState<EditMode>("crop");
  const [mediaZoom, setMediaZoom] = useState(1);
  const [mediaRotation, setMediaRotation] = useState(0);
  const [mediaFlipX, setMediaFlipX] = useState(false);
  const [mediaFlipY, setMediaFlipY] = useState(false);
  const [mediaOffset, setMediaOffset] = useState<MediaOffset>({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizingMedia, setResizingMedia] = useState(false);
  const [sharingMedia, setSharingMedia] = useState(false);
  const [autoPublishing, setAutoPublishing] = useState(false);
  const [preparedMedia, setPreparedMedia] = useState<PreparedMedia | null>(
    null,
  );
  const [latestPdfFile, setLatestPdfFile] = useState<File | null>(null);

  const [rewriting, setRewriting] = useState("");
  const [audienceTarget, setAudienceTarget] = useState("Small business owners");
  const [reachTarget, setReachTarget] = useState("Local customers");
  const [toneTarget, setToneTarget] = useState("Use current tone");

  const [scheduleInputValue, setScheduleInputValue] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activePointersRef = useRef<Map<number, ActivePointer>>(new Map());
  const pinchStateRef = useRef<PinchState | null>(null);

  const platformName = normalisePlatform(post?.platform);
  const recommendedPresets = useMemo(
    () => getRecommendedPresets(platformName),
    [platformName],
  );
  const selectedPreset =
    recommendedPresets.find((preset) => preset.value === resizePresetValue) ||
    recommendedPresets[0] ||
    resizePresets[0];

  const preparedDisplayMedia = useMemo<PreparedMedia | null>(() => {
    if (preparedMedia?.url) return preparedMedia;

    const savedUrl = cleanText(
      post?.prepared_media_url ||
        post?.preparedMediaUrl ||
        post?.prepared_url ||
        post?.resized_media_url ||
        post?.resizedMediaUrl ||
        (cleanText(post?.media_type).toLowerCase() === "image" ? post?.media_url : ""),
    );

    if (!savedUrl) return null;

    return {
      url: savedUrl,
      label: selectedPreset.label,
      width: Number(
        post?.prepared_media_width ||
          post?.preparedWidth ||
          selectedPreset.width,
      ),
      height: Number(
        post?.prepared_media_height ||
          post?.preparedHeight ||
          selectedPreset.height,
      ),
    };
  }, [preparedMedia, post, selectedPreset]);

  const mediaUrl = cleanText(post?.media_url);
  const mediaType = cleanText(post?.media_type).toLowerCase();
  const isVideo = mediaType === "video";
  const isImage = mediaType === "image";
  const mediaUrlWithoutQuery = mediaUrl.split("?")[0].toLowerCase();
  const mediaUrlLooksPdf = mediaUrlWithoutQuery.endsWith(".pdf") || mediaUrlWithoutQuery.includes(".pdf");
  const isFlyer =
    !isImage &&
    !isVideo &&
    (mediaType === "flyer" || mediaType === "pdf" || (!mediaType && mediaUrlLooksPdf));
  const canPrepareImage = Boolean(mediaUrl) && isImage && !isVideo;
  const canConvertFlyer = Boolean(mediaUrl) && isFlyer && !isVideo;

  const isShowingPreparedImage = Boolean(preparedDisplayMedia?.url) && !isVideo && !isFlyer;
  const mediaPrepareStatus = cleanText(post?.media_prepare_status).toLowerCase();
  const mediaPrepareError = cleanText(post?.media_prepare_error);
  const mediaPrepareLabel =
    mediaPrepareStatus === "preparing"
      ? "Preparing flyer..."
      : mediaPrepareStatus === "failed"
        ? "Needs attention"
        : mediaPrepareStatus === "prepared" || isShowingPreparedImage
          ? "Prepared image ready"
          : isFlyer
            ? "Flyer needs preparing"
            : "Ready";

  const isFacebookPost = platformName.toLowerCase().includes("facebook");
  const isInstagramPost = platformName.toLowerCase().includes("instagram");
  const canAutopublish = isFacebookPost || isInstagramPost;
  const autopublishPlatformLabel = isInstagramPost ? "Instagram" : "Facebook";

  const isPosted =
    Boolean(post?.is_posted) ||
    cleanText(post?.status).toLowerCase() === "posted" ||
    cleanText(post?.publish_status).toLowerCase() === "posted";

  const scheduleValue = getScheduleValue(post);
  const scheduledLabel = formatScheduledDate(scheduleValue);
  const autopublishStatus = getAutopublishStatus(post, isPosted);
  const canScheduledAutopublish =
    canAutopublish && Boolean(scheduleValue) && !isPosted;

  const fullCaption = useMemo(() => {
    return [caption, cta, hashtags].map(cleanText).filter(Boolean).join("\n\n");
  }, [caption, cta, hashtags]);

  const transformStyle = useMemo(() => {
    const flipX = mediaFlipX ? -1 : 1;
    const flipY = mediaFlipY ? -1 : 1;

    return {
      transform: `translate(${mediaOffset.x}px, ${mediaOffset.y}px) rotate(${mediaRotation}deg) scale(${mediaZoom}) scaleX(${flipX}) scaleY(${flipY})`,
    };
  }, [mediaOffset, mediaZoom, mediaRotation, mediaFlipX, mediaFlipY]);

  const frameClassName = `pr2-frame pr2-frame-${resizePresetValue}`;

  useEffect(() => {
    if (!postId) return;
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => {
    const defaultPreset = getDefaultPresetForPlatform(platformName);
    const nextPresets = getRecommendedPresets(platformName);

    if (nextPresets.some((preset) => preset.value === defaultPreset)) {
      setResizePresetValue(defaultPreset);
    } else if (nextPresets[0]) {
      setResizePresetValue(nextPresets[0].value);
    }

    resetTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformName]);

  useEffect(() => {
    setScheduleInputValue(getDateTimeLocalValue(getScheduleValue(post)));
  }, [post]);

  const loadPost = async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("campaign_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      setMessage(error.message || "Could not load this post.");
      setLoading(false);
      return;
    }

    if (!data) {
      setMessage("This post could not be found.");
      setLoading(false);
      return;
    }

    setPost(data);
    setLatestPdfFile(null);
    setCaption(cleanText(data.caption));
    setCta(cleanText(data.cta));
    setHashtags(
      Array.isArray(data.hashtags)
        ? data.hashtags.join(" ")
        : cleanText(data.hashtags),
    );
    setLoading(false);
  };

  const saveWording = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage("");

    const cleanHashtags = hashtags
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("campaign_posts")
      .update({
        caption,
        cta,
        hashtags: cleanHashtags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not save this post.");
      setSaving(false);
      return;
    }

    setPost({ ...post, caption, cta, hashtags: cleanHashtags });
    setMessage("Wording saved.");
    setSaving(false);
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(fullCaption);
      setMessage("Caption copied.");
    } catch {
      setMessage(
        "Could not copy automatically. Please copy the caption manually.",
      );
    }
  };

  const openPlatform = async () => {
    await copyCaption();
    window.open(getPlatformUrl(platformName), "_blank", "noopener,noreferrer");
  };

  const saveSchedule = async () => {
    if (!post?.id) return;

    if (!scheduleInputValue) {
      setMessage("Choose a scheduled publish time first.");
      return;
    }

    const nextDate = new Date(scheduleInputValue);

    if (Number.isNaN(nextDate.getTime())) {
      setMessage("Choose a valid scheduled publish time.");
      return;
    }

    setSavingSchedule(true);
    setMessage("");

    const scheduledIso = nextDate.toISOString();

    const updates = {
      scheduled_at: scheduledIso,
      scheduled_publish_at: scheduledIso,
      status: "scheduled",
      publish_status: "scheduled",
      publish_error: null,
      is_posted: false,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not save the scheduled time.");
      setSavingSchedule(false);
      return;
    }

    setPost({ ...post, ...updates });
    setMessage("Scheduled autopublish time saved.");
    setSavingSchedule(false);
  };

  const markAsPosted = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("campaign_posts")
      .update({
        is_posted: true,
        status: "posted",
        publish_status: "posted",
        posted_at: new Date().toISOString(),
        publish_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not mark this as posted.");
      setSaving(false);
      return;
    }

    setPost({
      ...post,
      is_posted: true,
      status: "posted",
      publish_status: "posted",
    });
    setMessage("Marked as posted.");
    setSaving(false);
  };

  const markAsNotPosted = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("campaign_posts")
      .update({
        is_posted: false,
        status: "ready",
        publish_status: "ready",
        posted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not update this post.");
      setSaving(false);
      return;
    }

    setPost({
      ...post,
      is_posted: false,
      status: "ready",
      publish_status: "ready",
    });
    setMessage("Post set back to ready.");
    setSaving(false);
  };

  const convertPdfBytesToJpeg = async (
    sourcePost: any,
    pdfBytes: ArrayBuffer,
  ) => {
    if (!sourcePost?.id || !pdfBytes) {
      throw new Error("Missing PDF media details.");
    }

    const pdfjs = await setupPdfJs();
    const loadingTask = pdfjs.getDocument({ data: pdfBytes });

    try {
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const targetWidth = selectedPreset.width || 1080;
      const scale = clampNumber(targetWidth / baseViewport.width, 0.75, 3);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });

      if (!context) {
        throw new Error("Could not prepare this PDF in the browser.");
      }

      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas,
    canvasContext: context, viewport }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (createdBlob) => {
            if (!createdBlob) {
              reject(new Error("Could not create a JPEG from this PDF."));
              return;
            }

            resolve(createdBlob);
          },
          "image/jpeg",
          0.92,
        );
      });

      const userId = cleanText(sourcePost.user_id) || "anonymous";
      const storagePath = `${userId}/posts/${sourcePost.id}/prepared/${Date.now()}-pdf-preview.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("campaign-assets")
        .upload(storagePath, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("campaign-assets")
        .getPublicUrl(storagePath);

      const url = withCacheBust(publicUrlData.publicUrl);
      const convertedWidth = canvas.width;
      const convertedHeight = canvas.height;

      const preparedAt = new Date().toISOString();
      const updates = {
        media_url: url,
        media_path: storagePath,
        media_type: "image",
        prepared_media_url: url,
        prepared_media_width: convertedWidth,
        prepared_media_height: convertedHeight,
        media_prepare_status: "prepared",
        media_prepare_error: null,
        media_prepared_at: preparedAt,
        publish_error: null,
        updated_at: preparedAt,
      };

      const { error } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", sourcePost.id);

      if (error) throw error;

      return {
        updates,
        prepared: {
          url,
          label: "Prepared flyer image",
          width: convertedWidth,
          height: convertedHeight,
        },
      };
    } catch (error: any) {
      const message = String(error?.message || "");

      if (message.toLowerCase().includes("invalid pdf structure")) {
        throw new Error(
          "This PDF could not be read by the browser. Please re-upload the flyer, export it again, or upload a JPG/PNG version.",
        );
      }

      throw error;
    } finally {
      loadingTask?.destroy?.();
    }
  };

  const convertPdfUrlToJpeg = async (
    sourcePost: any,
    sourceMediaUrl: string,
  ) => {
    const pdfBytes = await getPdfBytesFromUrl(sourceMediaUrl);
    return convertPdfBytesToJpeg(sourcePost, pdfBytes);
  };

  const convertPdfFileToJpeg = async (sourcePost: any, file: File) => {
    const pdfBytes = await getPdfBytesFromFile(file);
    return convertPdfBytesToJpeg(sourcePost, pdfBytes);
  };

  // Images and videos upload normally. PDFs are automatically rendered in the
  // browser and saved as JPEG images, so Instagram-ready media appears straight away.
  const handleUploadMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !post?.id) return;

    const isPdfUpload =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (isPdfUpload) {
      setLatestPdfFile(file);
    } else {
      setLatestPdfFile(null);
    }

    setSaving(true);
    setMessage("");

    try {
      const extension = file.name.split(".").pop() || "jpg";
      const userId = cleanText(post.user_id) || "anonymous";
      const path = `${userId}/posts/${post.id}/media/${Date.now()}-${getSafeFileName(file.name)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("campaign-assets")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("campaign-assets")
        .getPublicUrl(path);
      const uploadedUrl = publicUrlData.publicUrl;

      const nextMediaType = file.type.startsWith("video/")
        ? "video"
        : isPdfUpload
          ? "pdf"
          : "image";

      const uploadedAt = new Date().toISOString();
      const uploadedUpdates = {
        media_url: uploadedUrl,
        media_path: path,
        media_type: nextMediaType,
        prepared_media_url: null,
        prepared_media_width: null,
        prepared_media_height: null,
        media_prepare_status:
          nextMediaType === "pdf"
            ? "preparing"
            : nextMediaType === "image"
              ? "prepared"
              : "ready",
        media_prepare_error: null,
        media_prepared_at: nextMediaType === "image" ? uploadedAt : null,
        publish_error: null,
        updated_at: uploadedAt,
      };

      const { error: updateError } = await supabase
        .from("campaign_posts")
        .update(uploadedUpdates)
        .eq("id", post.id);

      if (updateError) throw updateError;

      const uploadedPost = { ...post, ...uploadedUpdates };
      setPost(uploadedPost);
      setPreparedMedia(null);

      if (nextMediaType === "pdf") {
        setMessage("Preparing flyer for posting...");
        const converted = await convertPdfFileToJpeg(uploadedPost, file);
        setPost({ ...uploadedPost, ...converted.updates });
        setPreparedMedia(converted.prepared);
        setLatestPdfFile(null);
        setMessage(
          "Flyer prepared for posting. Instagram can now use this image.",
        );
        return;
      }

      setMessage("Media updated.");
    } catch (error: any) {
      const message = error?.message || "Could not upload media.";

      if (isPdfUpload && post?.id) {
        await supabase
          .from("campaign_posts")
          .update({
            media_prepare_status: "failed",
            media_prepare_error: message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", post.id);

        setPost((current: any) =>
          current
            ? {
                ...current,
                media_prepare_status: "failed",
                media_prepare_error: message,
              }
            : current,
        );
      }

      setMessage(message);
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  const removeMedia = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("campaign_posts")
      .update({
        media_url: null,
        media_path: null,
        media_type: null,
        prepared_media_url: null,
        prepared_media_width: null,
        prepared_media_height: null,
        media_prepare_status: "ready",
        media_prepare_error: null,
        media_prepared_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not remove media.");
      setSaving(false);
      return;
    }

    setPost({
      ...post,
      media_url: null,
      media_path: null,
      media_type: null,
      prepared_media_url: null,
      prepared_media_width: null,
      prepared_media_height: null,
      media_prepare_status: "ready",
      media_prepare_error: null,
      media_prepared_at: null,
    });
    setPreparedMedia(null);
    setLatestPdfFile(null);
    setMessage("Media removed.");
    setSaving(false);
  };

  const convertPdfToJpeg = async () => {
    if (!post?.id || !isFlyer) return;

    if (!latestPdfFile && !mediaUrl) {
      setMessage("Please upload or replace the PDF flyer first.");
      return;
    }

    setResizingMedia(true);
    setMessage("Preparing flyer...");

    await supabase
      .from("campaign_posts")
      .update({
        media_prepare_status: "preparing",
        media_prepare_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    setPost((current: any) =>
      current
        ? {
            ...current,
            media_prepare_status: "preparing",
            media_prepare_error: null,
          }
        : current,
    );

    try {
      const converted = latestPdfFile
        ? await convertPdfFileToJpeg(post, latestPdfFile)
        : await convertPdfUrlToJpeg(post, mediaUrl);

      setPost({ ...post, ...converted.updates });
      setPreparedMedia(converted.prepared);
      setLatestPdfFile(null);
      setActivePanel("review");
      setMessage(
        "Flyer prepared for posting. Instagram can now use this image.",
      );
    } catch (error: any) {
      const message = error?.message || "Could not prepare this flyer.";

      await supabase
        .from("campaign_posts")
        .update({
          media_prepare_status: "failed",
          media_prepare_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      setPost((current: any) =>
        current
          ? {
              ...current,
              media_prepare_status: "failed",
              media_prepare_error: message,
            }
          : current,
      );

      setMessage(message);
    } finally {
      setResizingMedia(false);
    }
  };

  const downloadMedia = () => {
    if (!mediaUrl) return;

    const extension = isVideo ? "mp4" : isFlyer ? "pdf" : "jpg";
    triggerDownload(
      mediaUrl,
      `${getSafeFileName("fromone-post-media")}-original.${extension}`,
    );
  };

  const resetTransform = () => {
    activePointersRef.current.clear();
    pinchStateRef.current = null;
    setDragState(null);
    setPrepareFitMode("fill");
    setMediaZoom(1);
    setMediaRotation(0);
    setMediaFlipX(false);
    setMediaFlipY(false);
    setMediaOffset({ x: 0, y: 0 });
    setPreparedMedia(null);
  };

  const fitFullImage = () => {
    activePointersRef.current.clear();
    pinchStateRef.current = null;
    setDragState(null);
    setPrepareFitMode("fit");
    setMediaZoom(1);
    setMediaRotation(0);
    setMediaFlipX(false);
    setMediaFlipY(false);
    setMediaOffset({ x: 0, y: 0 });
    setPreparedMedia(null);
  };

  const fillFrame = () => {
    activePointersRef.current.clear();
    pinchStateRef.current = null;
    setDragState(null);
    setPrepareFitMode("fill");
    setMediaZoom(1);
    setMediaRotation(0);
    setMediaFlipX(false);
    setMediaFlipY(false);
    setMediaOffset({ x: 0, y: 0 });
    setPreparedMedia(null);
  };

  const selectPreset = (value: ResizePresetValue) => {
    setResizePresetValue(value);
    setIsPositioningMedia(false);
    resetTransform();
  };

  const selectEditMode = (mode: EditMode) => {
    setEditMode(mode);
    activePointersRef.current.clear();
    pinchStateRef.current = null;
    setDragState(null);
  };

  const togglePositioningMedia = () => {
    activePointersRef.current.clear();
    pinchStateRef.current = null;
    setDragState(null);
    setIsPositioningMedia((current) => !current);
  };

  const rotateLeft = () => {
    setMediaRotation((current) => current - 90);
    setPreparedMedia(null);
  };

  const rotateRight = () => {
    setMediaRotation((current) => current + 90);
    setPreparedMedia(null);
  };

  const flipHorizontal = () => {
    setMediaFlipX((current) => !current);
    setPreparedMedia(null);
  };

  const flipVertical = () => {
    setMediaFlipY((current) => !current);
    setPreparedMedia(null);
  };

  const startTransform = (event: PointerEvent<HTMLDivElement>) => {
    if (!canPrepareImage) return;
    if (event.pointerType === "touch" && !isPositioningMedia) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    activePointersRef.current.set(event.pointerId, {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    });

    const pointers = Array.from(activePointersRef.current.values());

    if (pointers.length >= 2) {
      const [first, second] = pointers;
      const center = getPointerCenter(first, second);

      pinchStateRef.current = {
        startDistance: Math.max(getPointerDistance(first, second), 1),
        startZoom: mediaZoom,
        startOffset: mediaOffset,
        startCenterX: center.x,
        startCenterY: center.y,
      };
      setDragState(null);
      return;
    }

    setDragState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffset: mediaOffset,
    });
  };

  const moveTransform = (event: PointerEvent<HTMLDivElement>) => {
    if (!canPrepareImage) return;
    if (event.pointerType === "touch" && !isPositioningMedia) return;

    const pointer = activePointersRef.current.get(event.pointerId);
    if (!pointer) return;

    event.preventDefault();

    activePointersRef.current.set(event.pointerId, {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    });

    const pointers = Array.from(activePointersRef.current.values());

    if (pointers.length >= 2 && pinchStateRef.current) {
      const [first, second] = pointers;
      const distance = Math.max(getPointerDistance(first, second), 1);
      const center = getPointerCenter(first, second);
      const pinch = pinchStateRef.current;

      setMediaZoom(
        clampNumber(
          Number(
            (pinch.startZoom * (distance / pinch.startDistance)).toFixed(2),
          ),
          0.75,
          3,
        ),
      );
      setMediaOffset({
        x: pinch.startOffset.x + center.x - pinch.startCenterX,
        y: pinch.startOffset.y + center.y - pinch.startCenterY,
      });
      setPreparedMedia(null);
      return;
    }

    if (!dragState || dragState.pointerId !== event.pointerId) return;

    setMediaOffset({
      x: dragState.startOffset.x + event.clientX - dragState.startClientX,
      y: dragState.startOffset.y + event.clientY - dragState.startClientY,
    });
    setPreparedMedia(null);
  };

  const stopTransform = (event: PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);
    pinchStateRef.current = null;
    setDragState(null);

    const pointers = Array.from(activePointersRef.current.values());

    if (pointers.length === 1) {
      const pointer = pointers[0];

      setDragState({
        pointerId: pointer.pointerId,
        startClientX: pointer.clientX,
        startClientY: pointer.clientY,
        startOffset: mediaOffset,
      });
    }
  };

  const onWheelZoom = (event: WheelEvent<HTMLDivElement>) => {
    if (!canPrepareImage) return;

    event.preventDefault();

    const direction = event.deltaY > 0 ? -0.05 : 0.05;
    setMediaZoom((current) =>
      clampNumber(Number((current + direction).toFixed(2)), 0.75, 3),
    );
    setPreparedMedia(null);
  };

  const createPreparedImage = async () => {
    if (!post?.id || !canPrepareImage) return;

    setResizingMedia(true);
    setMessage("");

    try {
      const response = await fetch("/api/media/resize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          mediaUrl,
          preset: getPresetForApi(resizePresetValue),
          mode: "crop",
          fitMode: prepareFitMode,
          zoom: mediaZoom,
          rotation: mediaRotation,
          flipX: mediaFlipX,
          flipY: mediaFlipY,
          offsetX: mediaOffset.x,
          offsetY: mediaOffset.y,
          outputWidth: selectedPreset.width,
          outputHeight: selectedPreset.height,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok)
        throw new Error(
          result?.error || result?.message || "Could not prepare this image.",
        );

      const rawUrl =
        result?.url ||
        result?.publicUrl ||
        result?.public_url ||
        result?.preparedUrl ||
        result?.prepared_url ||
        result?.preparedMediaUrl ||
        result?.prepared_media_url ||
        result?.resizedUrl ||
        result?.resized_url ||
        result?.mediaUrl ||
        result?.media_url ||
        result?.data?.url ||
        result?.data?.publicUrl ||
        result?.data?.public_url;

      if (!rawUrl) {
        throw new Error("Prepared image was created but no URL was returned.");
      }

      const url = withCacheBust(String(rawUrl));
      const nextPreparedMedia = {
        url,
        label: result?.label || selectedPreset.label,
        width: Number(
          result?.width || result?.outputWidth || selectedPreset.width,
        ),
        height: Number(
          result?.height || result?.outputHeight || selectedPreset.height,
        ),
      };

      setPreparedMedia(nextPreparedMedia);
      setPost((current: any) =>
        current
          ? {
              ...current,
              prepared_media_url: url,
              prepared_media_width: nextPreparedMedia.width,
              prepared_media_height: nextPreparedMedia.height,
              media_prepare_status: "prepared",
              media_prepare_error: null,
              media_prepared_at: new Date().toISOString(),
            }
          : current,
      );
      setMessage("Prepared image ready. You can now share or download it.");
    } catch (error: any) {
      setMessage(error?.message || "Could not prepare this image.");
    } finally {
      setResizingMedia(false);
    }
  };

  const downloadPreparedImage = () => {
    if (!preparedDisplayMedia?.url) return;

    triggerDownload(
      preparedDisplayMedia.url,
      `fromone-post-${preparedDisplayMedia.width}x${preparedDisplayMedia.height}.jpg`,
    );
  };

  const sharePreparedImage = async () => {
    if (!preparedDisplayMedia?.url) {
      setMessage("Create a prepared image first.");
      return;
    }

    setSharingMedia(true);
    await copyCaption();

    try {
      const file = await urlToFile(preparedDisplayMedia.url, "fromone-post");
      const nav = navigator as any;

      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({
          title: "FromOne post",
          text: fullCaption,
          files: [file],
        });
        setMessage("Share sheet opened.");
        return;
      }

      downloadPreparedImage();
      window.open(
        getPlatformUrl(platformName),
        "_blank",
        "noopener,noreferrer",
      );
      setMessage(
        "Sharing is not supported here. Prepared image downloaded and platform opened.",
      );
    } catch {
      downloadPreparedImage();
      window.open(
        getPlatformUrl(platformName),
        "_blank",
        "noopener,noreferrer",
      );
      setMessage(
        "Sharing was not available. Prepared image downloaded and platform opened.",
      );
    } finally {
      setSharingMedia(false);
    }
  };

  const autopublishNow = async () => {
    if (!post?.id) return;

    if (!canAutopublish) {
      setMessage(
        "Autopublish is only available for connected Facebook and Instagram business accounts.",
      );
      return;
    }

    if (isInstagramPost && !mediaUrl) {
      setMessage("Instagram autopublish needs an image or video attached.");
      return;
    }

    if (isInstagramPost && isFlyer) {
      setMessage(
        "Instagram cannot autopublish a PDF or flyer file. Use Prepare flyer, then autopublish again.",
      );
      return;
    }

    const text = fullCaption;

    if (!cleanText(text)) {
      setMessage("Add wording before autopublishing.");
      return;
    }

    setAutoPublishing(true);
    setMessage("");

    try {
      const endpoint = isInstagramPost
        ? "/api/instagram/publish"
        : "/api/facebook/publish";
      const publishMediaUrl = preparedDisplayMedia?.url || mediaUrl;
      const publishMediaType = preparedDisplayMedia?.url ? "image" : mediaType;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          campaignPostId: post.id,
          campaign_id: post.campaign_id,
          platform: post.platform || platformName,
          message: text,
          text,
          caption,
          cta,
          hashtags: hashtags
            .split(/\s+/)
            .map((tag) => tag.trim())
            .filter(Boolean),
          media_url: publishMediaUrl || null,
          mediaUrl: publishMediaUrl || null,
          media_type: publishMediaType || null,
          mediaType: publishMediaType || null,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = cleanText(result?.error || result?.message);

        if (
          message.toLowerCase().includes("access token") ||
          message.toLowerCase().includes("reconnect") ||
          message.toLowerCase().includes("connection") ||
          message.toLowerCase().includes("permissions")
        ) {
          setMessage(
            "Autopublish needs attention. Reconnect Facebook/Instagram in Settings, or use manual posting.",
          );
          return;
        }

        throw new Error(
          message || `Could not autopublish to ${autopublishPlatformLabel}.`,
        );
      }

      setPost({
        ...post,
        is_posted: true,
        status: "posted",
        publish_status: "published",
        publish_error: null,
      });
      setMessage(`Autopublished to ${autopublishPlatformLabel}.`);
    } catch (error: any) {
      setMessage(
        error?.message ||
          `Could not autopublish to ${autopublishPlatformLabel}.`,
      );
    } finally {
      setAutoPublishing(false);
    }
  };

  const quickImprove = async (action: string) => {
    if (!post?.id) return;

    setRewriting(action);
    setMessage("");

    try {
      const response = await fetch("/api/rewritePost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          action,
          improvementAction: action,
          audienceTarget,
          marketReach: reachTarget,
          tone: toneTarget,
          platform: post.platform,
          caption,
          cta,
          hashtags,
          businessName: post.business_name || post.company_name || "",
          businessDescription: post.business_description || "",
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok)
        throw new Error(
          result?.error || result?.message || "Could not improve this post.",
        );

      const nextCaption = cleanText(
        result.caption || result.rewrittenCaption || result.post?.caption,
      );
      const nextCta = cleanText(
        result.cta || result.rewrittenCta || result.post?.cta,
      );
      const nextHashtags = Array.isArray(result.hashtags)
        ? result.hashtags.join(" ")
        : cleanText(
            result.hashtags ||
              result.rewrittenHashtags ||
              result.post?.hashtags,
          );

      if (nextCaption) setCaption(nextCaption);
      if (nextCta) setCta(nextCta);
      if (nextHashtags) setHashtags(nextHashtags);

      setMessage("Improved wording ready. Save it when you are happy.");
    } catch (error: any) {
      setMessage(error?.message || "Could not improve this post.");
    } finally {
      setRewriting("");
    }
  };

  if (loading) {
    return (
      <main className="pr2-page" data-review-page="simple-mobile-tools-v1">
        <section className="pr2-loading">Loading post...</section>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="pr2-page" data-review-page="simple-mobile-tools-v1">
        <section className="pr2-loading">
          <h1>Post not found</h1>
          <p>{message || "This post could not be loaded."}</p>
          <button
            type="button"
            className="pr2-btn pr2-btn-primary"
            onClick={() => router.push("/posts")}
          >
            Back to posts
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="pr2-page" data-review-page="simple-mobile-tools-v1">
      <section className="pr2-shell">
        <div className="pr2-topbar">
          <button
            type="button"
            className="pr2-back"
            onClick={() => router.push("/posts")}
          >
            ← Back to posts
          </button>

          <div className="pr2-status">
            <span>{platformName}</span>
            <strong>{isPosted ? "Posted" : "Ready"}</strong>
          </div>
        </div>

        {message && <div className="pr2-message">{message}</div>}

        <section className="pr2-layout">
          <section className="pr2-main">
            <article className="pr2-card">
              <div className="pr2-card-head">
                <div>
                  <span className="pr2-kicker">Media</span>
                  <h1>
                    {activePanel === "prepare"
                      ? "Prepare media"
                      : "Review media"}
                  </h1>
                </div>

                {canPrepareImage && !isShowingPreparedImage && activePanel !== "prepare" && (
                  <button
                    type="button"
                    className="pr2-btn pr2-btn-primary"
                    onClick={() => setActivePanel("prepare")}
                  >
                    Prepare media
                  </button>
                )}

                {activePanel === "prepare" && (
                  <button
                    type="button"
                    className="pr2-btn"
                    onClick={() => {
                      setIsPositioningMedia(false);
                      setActivePanel("review");
                    }}
                  >
                    Done
                  </button>
                )}
              </div>

              {activePanel === "prepare" && canPrepareImage ? (
                <div className="pr2-prepare">
                  <div
                    className={
                      isPositioningMedia
                        ? "pr2-stage is-positioning"
                        : "pr2-stage"
                    }
                    onPointerDown={startTransform}
                    onPointerMove={moveTransform}
                    onPointerUp={stopTransform}
                    onPointerCancel={stopTransform}
                    onPointerLeave={stopTransform}
                    onWheel={onWheelZoom}
                  >
                    <div className={frameClassName}>
                      <img
                        src={mediaUrl}
                        alt="Prepared media preview"
                        draggable={false}
                        className={
                          prepareFitMode === "fit" ? "is-fit" : "is-fill"
                        }
                        style={transformStyle}
                      />
                      <span className="pr2-grid" />
                    </div>
                  </div>

                  <div className="pr2-presets">
                    {recommendedPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        className={
                          resizePresetValue === preset.value
                            ? "pr2-preset is-active"
                            : "pr2-preset"
                        }
                        onClick={() => selectPreset(preset.value)}
                      >
                        <strong>{preset.label}</strong>
                        <small>{preset.size}</small>
                      </button>
                    ))}
                  </div>

                  <div className="pr2-mode-row" aria-label="Media edit mode">
                    <button
                      type="button"
                      className={
                        editMode === "crop"
                          ? "pr2-mode-btn is-active"
                          : "pr2-mode-btn"
                      }
                      onClick={() => selectEditMode("crop")}
                    >
                      Crop
                    </button>
                    <button
                      type="button"
                      className={
                        editMode === "rotate"
                          ? "pr2-mode-btn is-active"
                          : "pr2-mode-btn"
                      }
                      onClick={() => selectEditMode("rotate")}
                    >
                      Rotate
                    </button>
                    <button
                      type="button"
                      className={
                        editMode === "flip"
                          ? "pr2-mode-btn is-active"
                          : "pr2-mode-btn"
                      }
                      onClick={() => selectEditMode("flip")}
                    >
                      Flip
                    </button>
                  </div>

                  <div className="pr2-mode-panel">
                    {editMode === "crop" && (
                      <>
                        <p className="pr2-mode-panel-note">
                          Tap Position image before dragging or pinching. Lock
                          it again when you want to scroll.
                        </p>

                        <button
                          type="button"
                          className={
                            isPositioningMedia
                              ? "pr2-btn pr2-btn-primary"
                              : "pr2-btn pr2-position-btn"
                          }
                          onClick={togglePositioningMedia}
                        >
                          {isPositioningMedia ? "Lock image" : "Position image"}
                        </button>
                      </>
                    )}

                    {editMode === "rotate" && (
                      <>
                        <p className="pr2-mode-panel-note">
                          Rotate the image if it needs straightening for the
                          selected frame.
                        </p>

                        <div className="pr2-actions">
                          <button
                            type="button"
                            className="pr2-btn"
                            onClick={rotateLeft}
                          >
                            Rotate left
                          </button>
                          <button
                            type="button"
                            className="pr2-btn"
                            onClick={rotateRight}
                          >
                            Rotate right
                          </button>
                          <button
                            type="button"
                            className="pr2-btn"
                            onClick={resetTransform}
                          >
                            Reset
                          </button>
                        </div>
                      </>
                    )}

                    {editMode === "flip" && (
                      <>
                        <p className="pr2-mode-panel-note">
                          Flip the image horizontally or vertically.
                        </p>

                        <div className="pr2-actions">
                          <button
                            type="button"
                            className="pr2-btn"
                            onClick={flipHorizontal}
                          >
                            Flip horizontal
                          </button>
                          <button
                            type="button"
                            className="pr2-btn"
                            onClick={flipVertical}
                          >
                            Flip vertical
                          </button>
                          <button
                            type="button"
                            className="pr2-btn"
                            onClick={resetTransform}
                          >
                            Reset
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <details className="pr2-mobile-editing-tools">
                    <summary>More editing tools</summary>

                    <div className="pr2-mobile-tools-grid">
                      <button
                        type="button"
                        className="pr2-btn"
                        onClick={fitFullImage}
                      >
                        Fit image
                      </button>
                      <button
                        type="button"
                        className="pr2-btn"
                        onClick={fillFrame}
                      >
                        Fill frame
                      </button>
                      <button
                        type="button"
                        className="pr2-btn"
                        onClick={resetTransform}
                      >
                        Reset image
                      </button>
                      <button
                        type="button"
                        className="pr2-btn"
                        onClick={rotateLeft}
                      >
                        Rotate left
                      </button>
                      <button
                        type="button"
                        className="pr2-btn"
                        onClick={rotateRight}
                      >
                        Rotate right
                      </button>
                      <button
                        type="button"
                        className="pr2-btn"
                        onClick={flipHorizontal}
                      >
                        Flip horizontal
                      </button>
                      <button
                        type="button"
                        className="pr2-btn"
                        onClick={flipVertical}
                      >
                        Flip vertical
                      </button>
                    </div>
                  </details>

                  <div className="pr2-actions pr2-create-actions">
                    <button
                      type="button"
                      className="pr2-btn pr2-btn-primary"
                      onClick={createPreparedImage}
                      disabled={resizingMedia}
                    >
                      {resizingMedia
                        ? "Creating..."
                        : preparedDisplayMedia?.url
                          ? "Update prepared image"
                          : "Create prepared image"}
                    </button>
                  </div>

                  {preparedDisplayMedia?.url && (
                    <div className="pr2-prepared-ready">
                      <div>
                        <strong>{mediaPrepareLabel}</strong>
                        <span>
                          {preparedDisplayMedia.width} ×{" "}
                          {preparedDisplayMedia.height}
                        </span>
                      </div>

                      <div className="pr2-prepared-ready-actions">
                        <button
                          type="button"
                          className="pr2-btn pr2-btn-primary"
                          onClick={sharePreparedImage}
                          disabled={sharingMedia}
                        >
                          {sharingMedia ? "Opening..." : "Share to social app"}
                        </button>

                        <button
                          type="button"
                          className="pr2-btn"
                          onClick={downloadPreparedImage}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {preparedDisplayMedia?.url && activePanel !== "prepare" && (
                    <div className="pr2-media-current-label">
                      {mediaPrepareLabel}
                    </div>
                  )}

                  <div className="pr2-media-box">
                    {mediaUrl ? (
                      isVideo ? (
                        <video src={mediaUrl} controls />
                      ) : isFlyer && preparedDisplayMedia?.url ? (
                        <img
                          src={preparedDisplayMedia.url}
                          alt="PDF preview image"
                        />
                      ) : isFlyer ? (
                        <div className="pr2-empty">
                          <strong>Flyer needs preparing</strong>
                          <PdfFirstPagePreview url={mediaUrl} />
                          <p>This older flyer needs to be re-uploaded so FromOne can prepare it automatically.</p></div>
                      ) : (
                        <img
                          src={preparedDisplayMedia?.url || mediaUrl}
                          alt="Post media"
                        />
                      )
                    ) : (
                      <div className="pr2-empty">
                        <strong>No media attached</strong>
                        <p>Upload an image, flyer or video before posting.</p>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,.pdf"
                    hidden
                    onChange={handleUploadMedia}
                  />

                  <details className="pr2-details">
                    <summary>Media options</summary>

                    <div className="pr2-actions">
                      <button
                        type="button"
                        className="pr2-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload / replace
                      </button>

                      {mediaUrl && (
                        <>
                          <a
                            className="pr2-btn"
                            href={mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View media
                          </a>
                          <button
                            type="button"
                            className="pr2-btn"
                            onClick={downloadMedia}
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            className="pr2-btn pr2-btn-danger"
                            onClick={removeMedia}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </details>

                  {preparedDisplayMedia?.url && (
                    <div className="pr2-prepared-strip">
                      <strong>{mediaPrepareLabel}</strong>
                      <span>
                        {preparedDisplayMedia.width} ×{" "}
                        {preparedDisplayMedia.height}
                      </span>
                      <button
                        type="button"
                        className="pr2-btn"
                        onClick={sharePreparedImage}
                      >
                        Share to social app
                      </button>
                      <button
                        type="button"
                        className="pr2-btn"
                        onClick={downloadPreparedImage}
                      >
                        Download
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>

            <article className="pr2-card">
              <div className="pr2-card-head">
                <div>
                  <span className="pr2-kicker">Wording</span>
                  <h2>Check caption</h2>
                </div>
              </div>

              <div className="pr2-wording">
                <label className="is-caption">
                  <strong>Caption</strong>
                  <textarea
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                  />
                </label>

                <label>
                  <strong>CTA</strong>
                  <input
                    value={cta}
                    onChange={(event) => setCta(event.target.value)}
                  />
                </label>

                <label>
                  <strong>Hashtags</strong>
                  <input
                    value={hashtags}
                    onChange={(event) => setHashtags(event.target.value)}
                  />
                </label>
              </div>

              <div className="pr2-actions">
                <button
                  type="button"
                  className="pr2-btn pr2-btn-primary"
                  onClick={saveWording}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save wording"}
                </button>
                <button type="button" className="pr2-btn" onClick={copyCaption}>
                  Copy caption
                </button>
                <button
                  type="button"
                  className="pr2-btn"
                  onClick={() => setActivePanel("improve")}
                >
                  Improve wording
                </button>
              </div>
            </article>

            {activePanel === "improve" && (
              <article className="pr2-card">
                <div className="pr2-card-head">
                  <div>
                    <span className="pr2-kicker">Improve</span>
                    <h2>Make it stronger</h2>
                  </div>

                  <button
                    type="button"
                    className="pr2-btn"
                    onClick={() => {
                      setIsPositioningMedia(false);
                      setActivePanel("review");
                    }}
                  >
                    Done
                  </button>
                </div>

                <div className="pr2-improve-grid">
                  {quickImproveActions.map((action) => (
                    <button
                      key={action.value}
                      type="button"
                      className="pr2-btn"
                      onClick={() => quickImprove(action.value)}
                      disabled={Boolean(rewriting)}
                    >
                      {rewriting === action.value
                        ? "Improving..."
                        : action.label}
                    </button>
                  ))}
                </div>

                <div className="pr2-select-row">
                  <label>
                    <strong>Audience</strong>
                    <select
                      value={audienceTarget}
                      onChange={(event) =>
                        setAudienceTarget(event.target.value)
                      }
                    >
                      {audienceOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <strong>Reach</strong>
                    <select
                      value={reachTarget}
                      onChange={(event) => setReachTarget(event.target.value)}
                    >
                      {reachOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <strong>Tone</strong>
                    <select
                      value={toneTarget}
                      onChange={(event) => setToneTarget(event.target.value)}
                    >
                      {toneOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  className="pr2-btn pr2-btn-primary"
                  onClick={() => quickImprove("audience_targeted")}
                  disabled={Boolean(rewriting)}
                >
                  {rewriting === "audience_targeted"
                    ? "Improving..."
                    : "Improve for selected audience"}
                </button>
              </article>
            )}
          </section>

          <aside className="pr2-side">
            <article className="pr2-publish-card">
              <span className="pr2-kicker">Publish</span>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <h2 style={{ marginBottom: 6 }}>{platformName}</h2>
                  <p>Schedule autopublish, publish now, or post manually.</p>
                </div>

                <span
                  style={{
                    flex: "0 0 auto",
                    borderRadius: 999,
                    padding: "7px 10px",
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color:
                      autopublishStatus.tone === "error"
                        ? "#fecaca"
                        : autopublishStatus.tone === "success"
                          ? "#bbf7d0"
                          : autopublishStatus.tone === "warning"
                            ? "#fde68a"
                            : "#f8fafc",
                    background:
                      autopublishStatus.tone === "error"
                        ? "rgba(239, 68, 68, 0.16)"
                        : autopublishStatus.tone === "success"
                          ? "rgba(34, 197, 94, 0.15)"
                          : autopublishStatus.tone === "warning"
                            ? "rgba(245, 158, 11, 0.14)"
                            : "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {autopublishStatus.label}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  margin: "14px 0 16px",
                  padding: 14,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p style={{ margin: 0, fontSize: 14, opacity: 0.86 }}>
                  {autopublishStatus.description}
                </p>

                <label style={{ display: "grid", gap: 7 }}>
                  <span className="pr2-kicker" style={{ margin: 0 }}>
                    Scheduled time
                  </span>

                  <input
                    type="datetime-local"
                    value={scheduleInputValue}
                    onChange={(event) =>
                      setScheduleInputValue(event.target.value)
                    }
                    disabled={savingSchedule || isPosted}
                    style={{
                      width: "100%",
                      minHeight: 46,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(15, 23, 42, 0.72)",
                      color: "#ffffff",
                      padding: "0 12px",
                      fontWeight: 800,
                    }}
                  />
                </label>

                <div
                  style={{
                    padding: 10,
                    borderRadius: 14,
                    background: "rgba(15, 23, 42, 0.55)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="pr2-kicker" style={{ margin: 0 }}>
                    Method
                  </span>
                  <strong style={{ display: "block", marginTop: 4 }}>
                    {canAutopublish ? "Auto + manual" : "Manual only"}
                  </strong>
                </div>
              </div>

              {post?.publish_error && (
                <div className="pr2-message" style={{ marginBottom: 12 }}>
                  {cleanText(post.publish_error)}
                </div>
              )}

              <div
                className="pr2-publish-actions"
                style={{ display: "grid", gap: 10 }}
              >
                <button
                  type="button"
                  className="pr2-btn"
                  onClick={saveSchedule}
                  disabled={savingSchedule || isPosted}
                >
                  {savingSchedule ? "Saving..." : "Save schedule"}
                </button>

                {canAutopublish && (
                  <button
                    type="button"
                    className="pr2-btn pr2-btn-primary"
                    onClick={autopublishNow}
                    disabled={autoPublishing || isPosted}
                  >
                    {autoPublishing ? "Autopublishing..." : "Autopublish now"}
                  </button>
                )}

                <button
                  type="button"
                  className="pr2-btn"
                  onClick={openPlatform}
                >
                  Post manually
                </button>

                {preparedDisplayMedia?.url && (
                  <button
                    type="button"
                    className="pr2-btn"
                    onClick={sharePreparedImage}
                    disabled={sharingMedia}
                  >
                    {sharingMedia ? "Opening..." : "Share prepared media"}
                  </button>
                )}
              </div>

              <details
                className="pr2-details is-tight"
                style={{ marginTop: 12 }}
              >
                <summary>More options</summary>

                <div className="pr2-side-options">
                  <button
                    type="button"
                    className="pr2-btn"
                    onClick={markAsPosted}
                    disabled={saving || isPosted}
                  >
                    Mark as posted
                  </button>

                  {isPosted && (
                    <button
                      type="button"
                      className="pr2-btn"
                      onClick={markAsNotPosted}
                      disabled={saving}
                    >
                      Mark as not posted
                    </button>
                  )}
                </div>
              </details>

              <p style={{ marginTop: 12, fontSize: 13, opacity: 0.78 }}>
                Facebook and Instagram can autopublish when connected. TikTok
                stays manual.
              </p>
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
