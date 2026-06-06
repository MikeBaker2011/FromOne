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
  { value: "make_shorter", label: "Make shorter" },
  { value: "make_more_premium", label: "More premium" },
  { value: "make_sales_focused", label: "Sales focused" },
  { value: "make_less_generic", label: "Less generic" },
  { value: "different_version", label: "Different version" },
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


function getApprovalStatus(post: any, isPosted: boolean) {
  const approvalStatus = cleanText(post?.approval_status).toLowerCase();
  const publishStatus = cleanText(post?.publish_status).toLowerCase();
  const status = cleanText(post?.status).toLowerCase();
  const publishError = cleanText(post?.publish_error);

  if (
    isPosted ||
    approvalStatus === "posted" ||
    publishStatus === "posted" ||
    publishStatus === "published" ||
    status === "posted"
  ) {
    return {
      label: "Posted",
      tone: "success",
      description: "This post has already been posted.",
    };
  }

  if (
    approvalStatus === "failed" ||
    publishStatus === "failed" ||
    status === "failed" ||
    publishError
  ) {
    return {
      label: "Failed",
      tone: "error",
      description: publishError || "This post needs checking before it can be scheduled.",
    };
  }

  if (approvalStatus === "approved") {
    return {
      label: "Approved",
      tone: "success",
      description: "This post is approved. You can publish now, autoschedule or copy it manually.",
    };
  }

  if (approvalStatus === "scheduled") {
    return {
      label: "Scheduled",
      tone: "warning",
      description: "This post has been scheduled.",
    };
  }

  if (approvalStatus === "draft") {
    return {
      label: "Draft",
      tone: "neutral",
      description: "Review the draft and approve it when you are happy.",
    };
  }

  return {
    label: "Needs review",
    tone: "warning",
    description: "Check the wording, media and schedule. Nothing publishes until you approve it.",
  };
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
        "Posting did not complete. Check the connection in Settings.",
    };
  }

  if (!scheduleValue) {
    return {
      label: "Not scheduled",
      tone: "neutral",
      description: "Choose a time to schedule it.",
    };
  }

  const scheduleTime = new Date(scheduleValue).getTime();
  const isDue = !Number.isNaN(scheduleTime) && scheduleTime <= Date.now();

  if (isDue) {
    return {
      label: "Due now",
      tone: "warning",
      description:
        "This post is due now.",
    };
  }

  return {
    label: "Planned",
    tone: "planned",
    description:
      "FromOne will use this scheduled time.",
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
      "This flyer needs re-uploading so FromOne can use it properly.",
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


function normaliseForCompare(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isVerySimilarText(first: string, second: string) {
  const a = normaliseForCompare(first);
  const b = normaliseForCompare(second);

  if (!a || !b) return false;
  if (a === b) return true;

  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;

  if (shorter.length < 60) return false;

  return longer.includes(shorter) || shorter.includes(longer);
}

function removeLocalOnlyWording(value: string) {
  return cleanText(value)
    .replace(/\blocal small business owners?\b/gi, "business owners across the UK")
    .replace(/\blocal business owners?\b/gi, "business owners across the UK")
    .replace(/\blocal customers?\b/gi, "customers across the UK")
    .replace(/\blocal businesses?\b/gi, "businesses across the UK")
    .replace(/\blocal area\b/gi, "the UK")
    .replace(/\blocal community\b/gi, "customers across the UK")
    .replace(/\blocal visibility\b/gi, "nationwide visibility")
    .replace(/\bnearby areas?\b/gi, "the UK")
    .replace(/\bnearby customers?\b/gi, "customers across the UK")
    .replace(/\bnearby homes?\b/gi, "homes across the UK")
    .replace(/\bin your area\b/gi, "across the UK")
    .replace(/\bstand out in your area\b/gi, "stand out across the UK")
    .replace(/\bin\s+(Altrincham|Manchester|Sale|Stockport|Trafford)\b(?:\s+and\s+nearby\s+areas)?/gi, "across the UK")
    .replace(/\baround\s+(Altrincham|Manchester|Sale|Stockport|Trafford)\b/gi, "across the UK")
    .replace(/\bturning passersby into foot traffic\b/gi, "turning attention into enquiries")
    .replace(/\bturning passers-by into foot traffic\b/gi, "turning attention into enquiries")
    .replace(/\bpassersby\b/gi, "potential customers")
    .replace(/\bpassers-by\b/gi, "potential customers")
    .replace(/\bfoot traffic\b/gi, "enquiries")
    .replace(/\bpop in\b/gi, "get in touch")
    .replace(/\bwalk in\b/gi, "enquire")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLocationFallbackCaption({
  currentCaption,
  reach,
  businessName,
  industry,
}: {
  currentCaption: string;
  reach: string;
  businessName: string;
  industry: string;
}) {
  const cleanReach = cleanText(reach).toLowerCase();
  const cleanBusinessName = cleanText(businessName);
  const displayName =
    cleanBusinessName &&
    !["the business", "business"].includes(cleanBusinessName.toLowerCase())
      ? cleanBusinessName
      : "We";

  const cleanIndustry = cleanText(industry).toLowerCase();
  const isSignage =
    cleanIndustry.includes("sign") ||
    cleanIndustry.includes("print") ||
    currentCaption.toLowerCase().includes("signage") ||
    currentCaption.toLowerCase().includes("large format") ||
    currentCaption.toLowerCase().includes("graphics");

  if (cleanReach.includes("nationwide")) {
    if (isSignage) {
      return `${displayName === "We" ? "We help" : `${displayName} helps`} businesses across the UK create clear, professional visuals that make their brand easier to notice and remember. From signage and large format print to branded displays and promotional materials, we support businesses that want a stronger presence beyond one local area. Message us to discuss your next project.`;
    }

    return `${displayName === "We" ? "We help" : `${displayName} helps`} customers across the UK with clear, professional support that makes it easier to choose, enquire and take the next step. Message us to discuss what you need.`;
  }

  if (cleanReach.includes("online")) {
    return `${displayName === "We" ? "We help" : `${displayName} helps`} customers online with clear, professional support that makes it easier to browse, enquire or book from wherever they are. Visit the website or send an online enquiry to find out more.`;
  }

  if (cleanReach.includes("regional")) {
    return `${displayName === "We" ? "We help" : `${displayName} helps`} customers across the region with clear, professional support that helps them get noticed, make a strong impression and take the next step. Message us to discuss what you need.`;
  }

  return `${displayName === "We" ? "We help" : `${displayName} helps`} local customers with clear, professional support that makes it easier to get noticed and take action. Message us to discuss what you need.`;
}

function getLocationHashtags(reach: string, industry: string) {
  const cleanReach = cleanText(reach).toLowerCase();
  const industryTag = cleanText(industry)
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");

  const extra = industryTag ? `#${industryTag}` : "#SmallBusiness";

  if (cleanReach.includes("nationwide")) {
    return ["#UKBusiness", "#NationwideService", "#BusinessMarketing", extra].join(" ");
  }

  if (cleanReach.includes("online")) {
    return ["#OnlineBusiness", "#ShopOnline", "#OnlineService", extra].join(" ");
  }

  if (cleanReach.includes("regional")) {
    return ["#RegionalBusiness", "#BusinessGrowth", "#SmallBusiness", extra].join(" ");
  }

  return ["#LocalBusiness", "#SmallBusiness", "#SupportLocal", extra].join(" ");
}



function getLocationLabel(value: string) {
  return cleanText(value).replace(" customers", "");
}

function getBusinessDisplayNameForLocation(post: any) {
  const value =
    post?.business_name ||
    post?.company_name ||
    post?.client_name ||
    post?.clientName ||
    post?.campaign_business_name ||
    post?.brand_name ||
    "";

  const clean = cleanText(value);

  if (!clean || clean.toLowerCase() === "the business" || clean.toLowerCase() === "business") {
    return "We";
  }

  return clean;
}

function getIndustryForLocation(post: any) {
  return cleanText(
    post?.industry ||
      post?.business_type ||
      post?.campaign_industry ||
      post?.category ||
      "",
  );
}

function buildLocationCaption(post: any, reach: string, currentCaption: string) {
  const label = cleanText(reach).toLowerCase();
  const businessName = getBusinessDisplayNameForLocation(post);
  const industry = getIndustryForLocation(post).toLowerCase();
  const caption = cleanText(currentCaption).toLowerCase();

  const namePrefix =
    businessName === "We" ? "We help" : `${businessName} helps`;

  const isSignage =
    industry.includes("sign") ||
    industry.includes("print") ||
    caption.includes("signage") ||
    caption.includes("large format") ||
    caption.includes("graphics") ||
    caption.includes("vehicle wrap") ||
    caption.includes("banner");

  if (label.includes("nationwide")) {
    if (isSignage) {
      return `${namePrefix} businesses across the UK create clear, professional visuals that make their brand easier to notice and remember. From signage and large format print to branded displays, vehicle graphics and promotional materials, we support businesses that want a stronger presence beyond one local area. Message us to discuss your next project.`;
    }

    return `${namePrefix} customers across the UK with clear, professional support that makes it easier to get noticed, build trust and take the next step. Message us to discuss what you need.`;
  }

  if (label.includes("online")) {
    if (isSignage) {
      return `${namePrefix} businesses create professional visual marketing that can be planned, discussed and started online. From signage and large format print to branded displays and promotional materials, send an online enquiry and we can help you choose the right option.`;
    }

    return `${namePrefix} customers online with clear, professional support that makes it easier to browse, enquire or book from wherever they are. Visit the website or send an online enquiry to find out more.`;
  }

  if (label.includes("regional")) {
    if (isSignage) {
      return `${namePrefix} businesses across the region create signage, large format print and branded displays that help them stand out in busy spaces, events and customer-facing locations. Message us to discuss your next project.`;
    }

    return `${namePrefix} customers across the region with clear, professional support that helps them get noticed, make a strong impression and take the next step. Message us to discuss what you need.`;
  }

  if (isSignage) {
    return `${namePrefix} local businesses create signage, large format print and branded displays that help them stand out in the places their customers see most. From shopfronts and vehicles to events and promotions, we help make your brand easier to notice. Message us to discuss your next project.`;
  }

  return `${namePrefix} local customers with clear, professional support that makes it easier to get noticed and take action. Message us to discuss what you need.`;
}

function buildLocationCta(reach: string) {
  const label = cleanText(reach).toLowerCase();

  if (label.includes("online")) return "Send an online enquiry.";
  if (label.includes("nationwide")) return "Message us to discuss your UK-wide project.";
  if (label.includes("regional")) return "Message us to discuss your regional project.";

  return "Message us to discuss your project.";
}

function buildLocationHashtagText(post: any, reach: string) {
  const label = cleanText(reach).toLowerCase();
  const industry = getIndustryForLocation(post)
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
  const industryTag = industry ? `#${industry}` : "#SmallBusiness";

  if (label.includes("nationwide")) {
    return ["#UKBusiness", "#NationwideService", "#BusinessMarketing", industryTag].join(" ");
  }

  if (label.includes("online")) {
    return ["#OnlineBusiness", "#OnlineService", "#ShopOnline", industryTag].join(" ");
  }

  if (label.includes("regional")) {
    return ["#RegionalBusiness", "#BusinessGrowth", "#SmallBusiness", industryTag].join(" ");
  }

  return ["#LocalBusiness", "#SmallBusiness", "#SupportLocal", industryTag].join(" ");
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
  const [reachTarget, setReachTarget] = useState("Regional and local customers");
  const [applyingReach, setApplyingReach] = useState("");
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
          ? "Image ready"
          : isFlyer
            ? "Flyer needs checking"
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
  const approvalStatus = getApprovalStatus(post, isPosted);
  const isApprovedForPublishing =
    approvalStatus.label === "Approved" ||
    approvalStatus.label === "Scheduled" ||
    approvalStatus.label === "Posted";
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
      .map((tag: string) => tag.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("campaign_posts")
      .update({
        caption,
        cta,
        hashtags: cleanHashtags,
        approval_status: "needs_review",
        approved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not save this post.");
      setSaving(false);
      return;
    }

    setPost({
      ...post,
      caption,
      cta,
      hashtags: cleanHashtags,
      approval_status: "needs_review",
      approved_at: null,
    });
    setMessage("Changes saved. Review the post again, then approve it when you are happy.");
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


  const markApproved = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage("");

    const approvedAt = new Date().toISOString();

    const updates = {
      approval_status: "approved",
      approved_at: approvedAt,
      status:
        cleanText(post?.status).toLowerCase() === "posted" ||
        cleanText(post?.status).toLowerCase() === "scheduled"
          ? post.status
          : "approved",
      updated_at: approvedAt,
    };

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not approve this post.");
      setSaving(false);
      return;
    }

    setPost({ ...post, ...updates });
    setMessage("Post approved. You can now publish, autoschedule or copy it manually.");
    setSaving(false);
  };

  const markNeedsReview = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage("");

    const updates = {
      approval_status: "needs_review",
      approved_at: null,
      status:
        cleanText(post?.status).toLowerCase() === "posted"
          ? post.status
          : "needs_review",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not update this post.");
      setSaving(false);
      return;
    }

    setPost({ ...post, ...updates });
    setMessage("Post sent back to review.");
    setSaving(false);
  };


  const ensurePreparedImageForPublishing = async () => {
    if (!post?.id) return preparedDisplayMedia;

    if (!canPrepareImage || isVideo || isFlyer) {
      return preparedDisplayMedia;
    }

    if (preparedDisplayMedia?.url) {
      return preparedDisplayMedia;
    }

    setMessage("Preparing image for social media...");

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

    if (!response.ok) {
      throw new Error(
        result?.error ||
          result?.message ||
          "Could not prepare this image for social media.",
      );
    }

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

    const nextPreparedMedia = {
      url: withCacheBust(String(rawUrl)),
      label: result?.label || selectedPreset.label,
      width: Number(result?.width || result?.outputWidth || selectedPreset.width),
      height: Number(result?.height || result?.outputHeight || selectedPreset.height),
    };

    setPreparedMedia(nextPreparedMedia);
    setPost((current: any) =>
      current
        ? {
            ...current,
            prepared_media_url: nextPreparedMedia.url,
            prepared_media_width: nextPreparedMedia.width,
            prepared_media_height: nextPreparedMedia.height,
            media_prepare_status: "prepared",
            media_prepare_error: null,
            media_prepared_at: new Date().toISOString(),
          }
        : current,
    );

    return nextPreparedMedia;
  };

  const saveSchedule = async () => {
    if (!post?.id) return;

    if (!scheduleInputValue) {
      setMessage("Choose a schedule time first.");
      return;
    }

    const nextDate = new Date(scheduleInputValue);

    if (Number.isNaN(nextDate.getTime())) {
      setMessage("Choose a valid schedule time.");
      return;
    }

    setSavingSchedule(true);
    setMessage("");

    try {
      await ensurePreparedImageForPublishing();
    } catch (error: any) {
      setMessage(error?.message || "Could not prepare the image for autoschedule.");
      setSavingSchedule(false);
      return;
    }

    const scheduledIso = nextDate.toISOString();

    const updates = {
      scheduled_at: scheduledIso,
      scheduled_publish_at: scheduledIso,
      status: "scheduled",
      publish_status: "scheduled",
      approval_status: "scheduled",
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
    setMessage("Schedule saved.");
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
        approval_status: "posted",
        approved_at: post?.approved_at || new Date().toISOString(),
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
      approval_status: "posted",
      approved_at: post?.approved_at || new Date().toISOString(),
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
        status: "needs_review",
        publish_status: "ready",
        approval_status: "needs_review",
        approved_at: null,
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
      status: "needs_review",
      publish_status: "ready",
      approval_status: "needs_review",
      approved_at: null,
    });
    setMessage("Post sent back to review.");
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
          label: "Flyer image",
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
        setMessage("Preparing flyer...");
        const converted = await convertPdfFileToJpeg(uploadedPost, file);
        setPost({ ...uploadedPost, ...converted.updates });
        setPreparedMedia(converted.prepared);
        setLatestPdfFile(null);
        setMessage(
          "Flyer image ready.",
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
        "Flyer image ready.",
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
      setMessage("Image ready.");
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
        "Direct posting is only available for connected Facebook and Instagram business accounts.",
      );
      return;
    }

    if (isInstagramPost && !mediaUrl) {
      setMessage("Instagram needs an image or video attached.");
      return;
    }

    if (isInstagramPost && isFlyer) {
      setMessage(
        "Instagram cannot use a PDF directly. Re-upload the flyer or use an image version.",
      );
      return;
    }

    const text = fullCaption;

    if (!cleanText(text)) {
      setMessage("Add wording before posting.");
      return;
    }

    setAutoPublishing(true);
    setMessage("");

    try {
      const ensuredPreparedMedia = await ensurePreparedImageForPublishing();

      const endpoint = isInstagramPost
        ? "/api/instagram/publish"
        : "/api/facebook/publish";
      const publishMediaUrl =
        ensuredPreparedMedia?.url || preparedDisplayMedia?.url || mediaUrl;
      const publishMediaType =
        ensuredPreparedMedia?.url || preparedDisplayMedia?.url ? "image" : mediaType;

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
            .map((tag: string) => tag.trim())
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
            "Posting needs attention. Reconnect Facebook/Instagram in Settings.",
          );
          return;
        }

        throw new Error(
          message || `Could not post to ${autopublishPlatformLabel}.`,
        );
      }

      setPost({
        ...post,
        is_posted: true,
        status: "posted",
        publish_status: "published",
        approval_status: "posted",
        approved_at: post?.approved_at || new Date().toISOString(),
        publish_error: null,
      });
      setMessage(`Posted to ${autopublishPlatformLabel}.`);
    } catch (error: any) {
      setMessage(
        error?.message ||
          `Could not post to ${autopublishPlatformLabel}.`,
      );
    } finally {
      setAutoPublishing(false);
    }
  };



  const quickImprove = async (action: string, reachOverride?: string) => {
    if (!post?.id) return;

    const effectiveReach = reachOverride || reachTarget || "Regional and local customers";
    const cleanReachLabel = effectiveReach.replace(" customers", "");
    const isReachRewrite = action === "audience_targeted";
    const reachInstruction =
      effectiveReach === "Nationwide UK customers"
        ? "Write this for customers across the UK. Do not make the post sound local to one town or city unless the business name/location is essential."
        : effectiveReach === "Regional customers"
          ? "Write this for regional customers. Keep the wording wider than one town, but not fully national."
          : effectiveReach === "Online customers"
            ? "Write this for online customers. Avoid local walk-in wording unless the post clearly needs it."
            : "Write this for local customers near the business location.";

    if (reachOverride) {
      setReachTarget(reachOverride);
    }

    setApplyingReach(isReachRewrite ? effectiveReach : "");
    setRewriting(action);
    setMessage(
      isReachRewrite
        ? `Applying ${cleanReachLabel.toLowerCase()} location...`
        : "Improving wording and saving the new draft..."
    );

    try {
      const response = await fetch("/api/rewritePost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          action,
          improvementAction: action,

          audienceTarget,
          marketReach: effectiveReach,
          selectedReach: effectiveReach,
          locationScope: effectiveReach,
          reachInstruction,

          forceRewrite: true,
          rewriteNonce: Date.now(),

          tone: toneTarget,
          platform: post.platform || platformName,

          caption,
          originalCaption: caption,
          cta,
          hashtags,

          businessName:
            post.business_name ||
            post.company_name ||
            post.client_name ||
            post.clientName ||
            post.campaign_business_name ||
            post.brand_name ||
            "",

          industry:
            post.industry ||
            post.business_type ||
            post.campaign_industry ||
            post.category ||
            "",

          businessLocation:
            post.location ||
            post.business_location ||
            post.campaign_area ||
            post.town ||
            post.city ||
            "",

          businessDescription: `${post.business_description || ""}

Default reach: Regional and local customers.
Reach instruction: ${reachInstruction}

Important:
Rewrite the current caption using a regional and local customer focus by default.
Do not return the same caption.`,
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

      if (!nextCaption) {
        throw new Error(result?.error || "No improved caption was returned.");
      }

      const apiCaptionWasSimilar = isVerySimilarText(nextCaption, caption);
      const shouldForceLocationCaption =
        isReachRewrite &&
        (apiCaptionWasSimilar || cleanText(result?.reach_compliance_issues?.join(" ")));

      const finalCaption = shouldForceLocationCaption
        ? buildLocationFallbackCaption({
            currentCaption: caption,
            reach: effectiveReach,
            businessName:
              post.business_name ||
              post.company_name ||
              post.client_name ||
              post.clientName ||
              post.campaign_business_name ||
              post.brand_name ||
              "",
            industry:
              post.industry ||
              post.business_type ||
              post.campaign_industry ||
              post.category ||
              "",
          })
        : effectiveReach === "Nationwide UK customers"
          ? removeLocalOnlyWording(nextCaption)
          : nextCaption;

      const finalHashtags = shouldForceLocationCaption
        ? getLocationHashtags(
            effectiveReach,
            post.industry ||
              post.business_type ||
              post.campaign_industry ||
              post.category ||
              "",
          )
        : nextHashtags;

      const captionChanged = finalCaption.trim() !== caption.trim();
      const nextHashtagArray = finalHashtags
        .split(/\s+/)
        .map((tag: string) => tag.trim())
        .filter(Boolean);

      const updates = {
        caption: finalCaption,
        cta: nextCta,
        hashtags: nextHashtagArray,
        approval_status: "needs_review",
        approved_at: null,
        updated_at: new Date().toISOString(),
      };

      const { error: saveRewriteError } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", post.id);

      if (saveRewriteError) {
        throw new Error(saveRewriteError.message || "The improved wording could not be saved.");
      }

      setCaption(finalCaption);
      setCta(nextCta);
      setHashtags(finalHashtags);
      setPost({
        ...post,
        ...updates,
      });
      setActivePanel("review");

      setMessage(
        shouldForceLocationCaption
          ? `${cleanReachLabel} location applied and saved. FromOne forced a clearer location rewrite.`
          : captionChanged
            ? isReachRewrite
              ? `${cleanReachLabel} location applied and saved.`
              : "Improved wording saved. Review the updated draft before approving."
            : `${cleanReachLabel} location was applied and saved, but the wording came back very similar. Try another improvement if needed.`
      );
    } catch (error: any) {
      setMessage(error?.message || "Could not improve this post.");
    } finally {
      setRewriting("");
      setApplyingReach("");
    }
  };

  if (loading) {
    return null;
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


        </div>

        {message && <div className="pr2-message pr2-message-inline">{message}</div>}

        {rewriting && (
          <div className="pr2-ai-progress" role="status" aria-live="polite">
            <div className="pr2-ai-progress-card">
              <span className="pr2-kicker">FromOne is working</span>
              <h2>{applyingReach ? "Applying location focus" : "Improving wording"}</h2>
              <p>
                We are rewriting the caption and saving the updated wording back to this post.
                You will be returned to the review card when it is ready.
              </p>
              <div className="pr2-ai-progress-bar" aria-hidden="true">
                <span />
              </div>
              <div className="pr2-ai-progress-steps">
                <span>Reading current caption</span>
                <span>Rewriting for the selected style</span>
                <span>Saving improved wording</span>
              </div>
            </div>
          </div>
        )}

        <section className="pr2-simple-steps pr2-simple-steps-merged pr2-hidden-steps" aria-label="Post review steps">
          <span className="is-active"><strong>1</strong> Review post</span>
          <span><strong>2</strong> Publish</span>
        </section>

        <section className="pr2-layout">
          <section className="pr2-main">
            <article className="pr2-card pr2-review-post-card pr2-compact-media-card">
              <div className="pr2-card-head pr2-compact-media-head pr2-review-post-head">
                <div>
                  <span className="pr2-kicker">FromOne post</span>
                  <h1>
                    {activePanel === "prepare"
                      ? "Adjust media"
                      : "Review this post"}
                  </h1>
                  {activePanel !== "prepare" && (
                    <p className="pr2-compact-media-subtitle">
                      Check the wording, media and schedule. Nothing publishes until you approve it.
                    </p>
                  )}
                </div>

                {canPrepareImage && !isShowingPreparedImage && activePanel !== "prepare" && (
                  <button
                    type="button"
                    className="pr2-btn pr2-btn-primary"
                    onClick={() => setActivePanel("prepare")}
                  >
                    Adjust image
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
                    Back to post
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
                        alt="Post image preview"
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

                  <div className="pr2-mode-row" aria-label="Image edit mode">
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
                    <summary>More image tools</summary>

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
                          ? "Update image"
                          : "Create image"}
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
                          {sharingMedia ? "Opening..." : "Share media"}
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
                          alt="Flyer image"
                        />
                      ) : isFlyer ? (
                        <div className="pr2-empty">
                          <strong>Flyer needs checking</strong>
                          <PdfFirstPagePreview url={mediaUrl} />
                          <p>This flyer needs re-uploading so FromOne can use it properly.</p></div>
                      ) : (
                        <img
                          src={preparedDisplayMedia?.url || mediaUrl}
                          alt="Post media"
                        />
                      )
                    ) : (
                      <div className="pr2-empty">
                        <strong>No image or video attached</strong>
                        <p>Add an image, flyer or video before scheduling.</p>
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
                        Share media
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

              <div className="pr2-review-wording-divider" />

              <div className="pr2-review-wording-head">
                <div>
                  <span className="pr2-kicker">Caption</span>
                  <h2>Edit if needed</h2>
                </div>
                <p>FromOne has written a draft. Edit anything that does not sound right.</p>
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
                  <strong>Call to action</strong>
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

              <div className="pr2-actions pr2-main-review-actions pr2-tidy-edit-actions pr2-edit-action-row">
                <button
                  type="button"
                  className="pr2-btn pr2-btn-primary"
                  onClick={saveWording}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>

                <button
                  type="button"
                  className="pr2-btn"
                  onClick={() => setActivePanel("improve")}
                >
                  Improve wording
                </button>
              {rewriting && (
                <div className="pr2-improving-progress-card">
                  <strong>Improving wording...</strong>
                  <span>FromOne is creating a new draft and will save it automatically.</span>
                </div>
              )}
              </div>
            </article>

            {activePanel === "improve" && (
              <article className="pr2-card">
                <div className="pr2-card-head">
                  <div>
                    <span className="pr2-kicker">Improve wording</span>
                    <h2>Improve the wording</h2>
                    <p className="pr2-improve-default-note">
                      FromOne will write for local and surrounding-area customers by default.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="pr2-btn"
                    onClick={() => {
                      setIsPositioningMedia(false);
                      setActivePanel("review");
                    }}
                  >
                    Back to post
                  </button>
                </div>

                <div className="pr2-improve-grid">
                  {quickImproveActions.map((action) => (
                    <button
                      key={action.value}
                      type="button"
                      className="pr2-btn"
                      onClick={() => quickImprove(action.value, reachTarget)}
                      disabled={Boolean(rewriting)}
                    >
                      {rewriting === action.value
                        ? "Improving..."
                        : action.label}
                    </button>
                  ))}
                </div>

              </article>
            )}
          </section>

          <aside className="pr2-side pr2-approval-side">
            <article className="pr2-card pr2-approval-card-simple pr2-right-publish-card">
              <div className="pr2-approval-simple-head">
                <span className="pr2-kicker">Publish</span>
                <h2>
                  {isPosted
                    ? "Posted"
                    : approvalStatus.label === "Needs review" || approvalStatus.label === "Draft"
                      ? "Approve when ready"
                      : "Ready to publish"}
                </h2>
                <p>
                  {isPosted
                    ? `This post has already been posted to ${autopublishPlatformLabel}.`
                    : approvalStatus.label === "Needs review" || approvalStatus.label === "Draft"
                      ? "Once approved, you can publish now, autoschedule, or copy and post manually."
                      : "Publish now, save an autoschedule, or open the platform."}
                </p>
              </div>

              {post?.publish_error && (
                <div className="pr2-message pr2-action-error">
                  {cleanText(post.publish_error)}
                </div>
              )}

              <div className="pr2-right-publish-actions">
                {approvalStatus.label === "Needs review" || approvalStatus.label === "Draft" ? (
                  <button
                    type="button"
                    className="pr2-btn pr2-btn-primary pr2-right-main-button"
                    onClick={markApproved}
                    disabled={saving || isPosted}
                  >
                    {saving ? "Approving..." : "Approve post"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pr2-btn pr2-right-main-button"
                    onClick={isPosted ? markAsNotPosted : markNeedsReview}
                    disabled={saving}
                  >
                    {saving ? "Updating..." : "Send back to review"}
                  </button>
                )}

                {canAutopublish ? (
                  isPosted ? (
                    <button
                      type="button"
                      className="pr2-btn pr2-right-publish-now"
                      disabled
                    >
                      Already posted to {autopublishPlatformLabel}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="pr2-btn pr2-btn-primary pr2-right-publish-now"
                      data-publish-now-visible="true"
                      onClick={autopublishNow}
                      disabled={
                        autoPublishing ||
                        saving ||
                        approvalStatus.label === "Needs review" ||
                        approvalStatus.label === "Draft"
                      }
                    >
                      {autoPublishing
                        ? "Publishing..."
                        : `Publish to ${autopublishPlatformLabel} now`}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    className="pr2-btn pr2-right-publish-now"
                    onClick={openPlatform}
                    disabled={isPosted}
                  >
                    Copy caption and open platform
                  </button>
                )}

                {!isApprovedForPublishing && !isPosted && (
                  <p className="pr2-publish-locked-help">
                    Approve the post first to unlock direct publishing.
                  </p>
                )}

                <label className="pr2-simple-schedule pr2-right-schedule">
                  <span>Autoschedule</span>
                  <input
                    type="datetime-local"
                    value={scheduleInputValue}
                    onChange={(event) => setScheduleInputValue(event.target.value)}
                    disabled={savingSchedule || isPosted}
                  />
                </label>

                <button
                  type="button"
                  className="pr2-btn pr2-btn-primary pr2-right-main-button"
                  onClick={saveSchedule}
                  disabled={
                    savingSchedule ||
                    isPosted ||
                    approvalStatus.label === "Needs review" ||
                    approvalStatus.label === "Draft"
                  }
                >
                  {savingSchedule ? "Saving..." : "Save autoschedule"}
                </button>

                <button
                  type="button"
                  className="pr2-btn"
                  onClick={openPlatform}
                >
                  Copy caption and open platform
                </button>

                {preparedDisplayMedia?.url && (
                  <button
                    type="button"
                    className="pr2-btn"
                    onClick={sharePreparedImage}
                    disabled={sharingMedia}
                  >
                    {sharingMedia ? "Opening..." : "Share media"}
                  </button>
                )}
              </div>
            </article>
          </aside>
        </section>
      </section>

      <style jsx global>{`
        /* Auto-prepared image publishing polish */
        .pr2-media-current-label {
          font-weight: 900 !important;
        }


        /* Final review-page polish */
        .pr2-topbar {
          justify-content: flex-start !important;
          margin-bottom: 18px !important;
        }

        .pr2-status.pr2-approval-status {
          display: none !important;
        }

        .pr2-review-post-card,
        .pr2-right-publish-card {
          box-shadow:
            0 24px 72px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.045) !important;
        }

        .pr2-review-post-head {
          margin-bottom: 22px !important;
        }

        .pr2-review-post-head h1 {
          letter-spacing: -0.055em !important;
        }

        .pr2-wording textarea,
        .pr2-wording input,
        .pr2-right-schedule input {
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease,
            background 160ms ease !important;
        }

        .pr2-wording textarea:focus,
        .pr2-wording input:focus {
          border-color: rgba(255, 212, 59, 0.48) !important;
          box-shadow: 0 0 0 3px rgba(255, 212, 59, 0.10) !important;
          outline: none !important;
        }

        .pr2-edit-action-row,
        .pr2-main-review-actions.pr2-edit-action-row,
        .pr2-tidy-edit-actions.pr2-edit-action-row {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 12px !important;
          margin-top: 16px !important;
        }

        .pr2-edit-action-row .pr2-btn {
          width: 100% !important;
          min-height: 52px !important;
          border-radius: 16px !important;
        }

        .pr2-right-publish-card {
          border-color: rgba(255, 212, 59, 0.18) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.10), transparent 34%),
            rgba(15, 23, 42, 0.86) !important;
        }

        .pr2-right-publish-card .pr2-approval-simple-head h2 {
          font-size: clamp(1.65rem, 2.25vw, 2.2rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.045em !important;
        }

        .pr2-right-publish-card .pr2-approval-simple-head p {
          line-height: 1.48 !important;
        }

        .pr2-right-publish-actions {
          display: grid !important;
          gap: 10px !important;
          margin-top: 14px !important;
        }

        .pr2-right-publish-actions .pr2-btn {
          width: 100% !important;
          min-height: 50px !important;
          border-radius: 16px !important;
        }

        .pr2-right-main-button,
        .pr2-right-publish-now {
          min-height: 56px !important;
          font-size: 1rem !important;
          font-weight: 950 !important;
        }

        .pr2-right-schedule {
          display: grid !important;
          gap: 8px !important;
          margin-top: 4px !important;
        }

        .pr2-right-schedule span {
          color: rgba(255, 212, 59, 0.9) !important;
          font-size: 0.74rem !important;
          font-weight: 1000 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }

        .pr2-right-schedule input {
          width: 100% !important;
          min-height: 50px !important;
          padding: 0 14px !important;
          border-radius: 16px !important;
          background: #f8fafc !important;
          color: #101420 !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          color-scheme: light !important;
          font-weight: 850 !important;
        }

        .pr2-right-schedule input::-webkit-calendar-picker-indicator {
          cursor: pointer !important;
          opacity: 0.9 !important;
          filter: none !important;
        }

        .pr2-message-inline {
          width: fit-content !important;
          max-width: min(100%, 720px) !important;
          margin: 0 auto 14px !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: rgba(248, 250, 252, 0.68) !important;
          font-size: 0.92rem !important;
          font-weight: 800 !important;
          text-align: center !important;
        }

        @media (max-width: 640px) {
          .pr2-edit-action-row,
          .pr2-main-review-actions.pr2-edit-action-row,
          .pr2-tidy-edit-actions.pr2-edit-action-row {
            grid-template-columns: 1fr !important;
          }
        }


        /* Remove unnecessary review status pills */
        .pr2-topbar {
          justify-content: flex-start !important;
        }

        .pr2-status.pr2-approval-status {
          display: none !important;
        }

        .pr2-message-inline {
          width: fit-content !important;
          max-width: min(100%, 720px) !important;
          margin: 0 auto 14px !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: rgba(248, 250, 252, 0.68) !important;
          font-size: 0.92rem !important;
          font-weight: 800 !important;
          text-align: center !important;
        }

        .pr2-message-inline:empty {
          display: none !important;
        }


        /* Main edit actions: Save + Improve on one neat row */
        .pr2-edit-action-row,
        .pr2-main-review-actions.pr2-edit-action-row,
        .pr2-tidy-edit-actions.pr2-edit-action-row {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 12px !important;
          margin-top: 16px !important;
        }

        .pr2-edit-action-row .pr2-btn {
          width: 100% !important;
          min-height: 52px !important;
          border-radius: 16px !important;
        }

        @media (max-width: 640px) {
          .pr2-edit-action-row,
          .pr2-main-review-actions.pr2-edit-action-row,
          .pr2-tidy-edit-actions.pr2-edit-action-row {
            grid-template-columns: 1fr !important;
          }
        }


        /* Simple right publish card — no extra Approved button */
        .pr2-right-publish-card {
          border-color: rgba(255, 212, 59, 0.18) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.10), transparent 34%),
            rgba(15, 23, 42, 0.86) !important;
        }

        .pr2-right-publish-card .pr2-approval-simple-head h2 {
          font-size: clamp(1.65rem, 2.25vw, 2.2rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.045em !important;
        }

        .pr2-right-publish-card .pr2-approval-simple-head p {
          line-height: 1.48 !important;
        }

        .pr2-right-publish-actions {
          display: grid !important;
          gap: 10px !important;
          margin-top: 14px !important;
        }

        .pr2-right-publish-actions .pr2-btn {
          width: 100% !important;
          min-height: 50px !important;
          border-radius: 16px !important;
        }

        .pr2-right-main-button,
        .pr2-right-publish-now {
          min-height: 56px !important;
          font-size: 1rem !important;
          font-weight: 950 !important;
        }

        .pr2-right-schedule {
          display: grid !important;
          gap: 8px !important;
          margin-top: 4px !important;
        }

        .pr2-right-schedule span {
          color: rgba(255, 212, 59, 0.9) !important;
          font-size: 0.74rem !important;
          font-weight: 1000 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }

        .pr2-right-schedule input {
          width: 100% !important;
          min-height: 50px !important;
          padding: 0 14px !important;
          border-radius: 16px !important;
          background: #f8fafc !important;
          color: #101420 !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          color-scheme: light !important;
          font-weight: 850 !important;
        }

        .pr2-right-schedule input::-webkit-calendar-picker-indicator {
          cursor: pointer !important;
          opacity: 0.9 !important;
          filter: none !important;
        }

        .pr2-right-publish-card .pr2-btn:disabled {
          opacity: 0.62 !important;
          cursor: not-allowed !important;
        }

        @media (max-width: 980px) {
          .pr2-side.pr2-approval-side {
            width: 100% !important;
          }
        }


        .pr2-simple-next-card,
        .pr2-simple-publish-card {
          padding: clamp(18px, 2vw, 24px);
          border-radius: 28px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 34%),
            rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(255, 212, 59, 0.18);
          box-shadow: 0 22px 62px rgba(0, 0, 0, 0.24);
        }

        .pr2-simple-next-card {
          margin-bottom: 14px;
        }

        .pr2-simple-status-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: start;
          margin: 10px 0 16px;
        }

        .pr2-simple-status-row h2,
        .pr2-simple-publish-card h2 {
          margin: 0 0 7px;
          font-size: clamp(1.65rem, 3vw, 2.15rem);
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .pr2-simple-status-row p,
        .pr2-simple-help,
        .pr2-simple-footnote {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.48;
        }

        .pr2-big-action {
          width: 100%;
          min-height: 58px;
          font-size: 1rem;
          margin-top: 4px;
        }

        .pr2-approved-note {
          display: grid;
          gap: 4px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.24);
          color: #bbf7d0;
        }

        .pr2-approved-note span {
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.4;
        }

        .pr2-simple-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 12px;
        }

        .pr2-simple-publish-card {
          display: grid;
          gap: 12px;
        }

        .pr2-simple-schedule-label {
          display: grid;
          gap: 7px;
          margin-top: 2px;
        }

        .pr2-simple-schedule-label span {
          color: #ffd43b;
          font-size: 0.78rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .pr2-simple-schedule-label input {
          width: 100%;
          min-height: 48px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(15, 23, 42, 0.72);
          color: #ffffff;
          padding: 0 12px;
          font-weight: 850;
        }

        .pr2-advanced-publishing {
          margin-top: 4px;
        }

        .pr2-advanced-publishing summary {
          color: rgba(248, 250, 252, 0.72);
        }

        .pr2-simple-footnote {
          font-size: 0.86rem;
          opacity: 0.78;
        }

        @media (max-width: 720px) {
          .pr2-simple-status-row,
          .pr2-simple-actions {
            grid-template-columns: 1fr;
          }

          .pr2-approval-pill {
            width: fit-content;
          }
        }

        /* Final post review onboarding polish */
        .pr2-review-helper-card {
          display: grid !important;
          gap: 5px !important;
          margin-top: 16px !important;
          padding: 14px 16px !important;
          border-radius: 18px !important;
          background: rgba(255, 212, 59, 0.08) !important;
          border: 1px solid rgba(255, 212, 59, 0.16) !important;
        }

        .pr2-review-helper-card strong {
          color: #ffd43b !important;
          font-size: 0.76rem !important;
          font-weight: 1000 !important;
          letter-spacing: 0.09em !important;
          text-transform: uppercase !important;
        }

        .pr2-review-helper-card span,
        .pr2-publish-locked-help,
        .pr2-improving-progress-card span {
          color: rgba(248, 250, 252, 0.72) !important;
          font-size: 0.88rem !important;
          line-height: 1.45 !important;
          font-weight: 800 !important;
        }

        .pr2-publish-locked-help {
          margin: -4px 0 8px !important;
          text-align: center !important;
        }

        .pr2-improving-progress-card {
          display: grid !important;
          gap: 5px !important;
          margin-top: 10px !important;
          padding: 13px 14px !important;
          border-radius: 16px !important;
          background: rgba(255, 212, 59, 0.08) !important;
          border: 1px solid rgba(255, 212, 59, 0.16) !important;
        }

        .pr2-improving-progress-card strong {
          color: #ffffff !important;
          font-size: 0.92rem !important;
          font-weight: 1000 !important;
        }

        .pr2-sidebar-card h2,
        .pr2-sidebar-card h3 {
          letter-spacing: -0.04em !important;
        }

        .pr2-primary-button,
        .pr2-sidebar-card button:not(:disabled),
        .pr2-back-button {
          box-shadow: none !important;
        }

        @media (max-width: 760px) {
          .pr2-review-helper-card {
            text-align: center !important;
          }

          .pr2-review-helper-card span,
          .pr2-publish-locked-help,
          .pr2-improving-progress-card span {
            font-size: 0.82rem !important;
          }
        }

      `}</style>


      <style jsx global>{`
        /* Final customer publishing flow layout */
        .pr2-flow-card {
          padding: clamp(18px, 2vw, 24px);
          border-radius: 30px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.14), transparent 34%),
            rgba(15, 23, 42, 0.80);
          border: 1px solid rgba(255, 212, 59, 0.18);
          box-shadow: 0 22px 62px rgba(0, 0, 0, 0.24);
          display: grid;
          gap: 14px;
        }

        .pr2-flow-head h2 {
          margin: 8px 0 8px;
          font-size: clamp(1.65rem, 3vw, 2.18rem);
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .pr2-flow-head p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.46;
        }

        .pr2-flow-status {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.14);
          border: 1px solid rgba(245, 158, 11, 0.26);
          color: #fde68a;
          font-size: 0.8rem;
          font-weight: 950;
        }

        .pr2-flow-status.is-success {
          background: rgba(34, 197, 94, 0.14);
          border-color: rgba(34, 197, 94, 0.26);
          color: #bbf7d0;
        }

        .pr2-flow-status.is-error {
          background: rgba(239, 68, 68, 0.16);
          border-color: rgba(239, 68, 68, 0.28);
          color: #fecaca;
        }

        .pr2-flow-main-button {
          width: 100%;
          min-height: 58px;
          font-size: 1rem;
        }

        .pr2-flow-locked-panel,
        .pr2-flow-publish-panel {
          display: grid;
          gap: 10px;
        }

        .pr2-flow-option-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .pr2-flow-option-card,
        .pr2-flow-publish-card {
          display: grid;
          gap: 8px;
          padding: 15px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .pr2-flow-option-card.is-locked {
          opacity: 0.78;
        }

        .pr2-flow-publish-card.is-primary {
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 38%),
            rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 212, 59, 0.20);
        }

        .pr2-flow-option-card strong,
        .pr2-flow-publish-card h3 {
          margin: 0;
          color: #ffffff;
          font-size: 1.08rem;
          line-height: 1.1;
        }

        .pr2-flow-option-card p,
        .pr2-flow-publish-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.66);
          line-height: 1.38;
          font-size: 0.92rem;
        }

        .pr2-flow-schedule-label {
          display: grid;
          gap: 7px;
        }

        .pr2-flow-schedule-label span {
          color: #ffd43b;
          font-size: 0.78rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .pr2-flow-schedule-label input {
          width: 100%;
          min-height: 48px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(15, 23, 42, 0.72);
          color: #ffffff;
          padding: 0 12px;
          font-weight: 850;
        }

        .pr2-flow-helper-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .pr2-flow-more {
          margin-top: 0 !important;
        }

        .pr2-flow-more summary {
          color: rgba(248, 250, 252, 0.68);
        }

        .pr2-calm-action-card,
        .pr2-customer-action-card,
        .pr2-one-step-card,
        .pr2-simple-next-card,
        .pr2-simple-publish-card,
        .pr2-simple-post-card {
          display: none !important;
        }

        @media (max-width: 720px) {
          .pr2-flow-helper-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>


      <style jsx global>{`
        /* Compact media preview card */
        .pr2-compact-media-card {
          padding: clamp(14px, 1.8vw, 18px) !important;
          border-radius: 26px !important;
          display: grid !important;
          gap: 12px !important;
        }

        .pr2-compact-media-card .pr2-card-head,
        .pr2-compact-media-head {
          margin-bottom: 0 !important;
          align-items: center !important;
        }

        .pr2-compact-media-card h1 {
          margin: 4px 0 0 !important;
          font-size: clamp(1.35rem, 2.4vw, 1.9rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.045em !important;
        }

        .pr2-compact-media-subtitle {
          margin: 6px 0 0 !important;
          color: rgba(248, 250, 252, 0.62) !important;
          line-height: 1.35 !important;
          font-size: 0.9rem !important;
        }

        .pr2-compact-media-card .pr2-media-current-label {
          display: none !important;
        }

        .pr2-compact-media-card .pr2-media-box {
          width: 100% !important;
          max-width: 360px !important;
          height: 260px !important;
          min-height: 0 !important;
          margin: 0 !important;
          border-radius: 22px !important;
          background: #020617 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          overflow: hidden !important;
          display: grid !important;
          place-items: center !important;
        }

        .pr2-compact-media-card .pr2-media-box img,
        .pr2-compact-media-card .pr2-media-box video,
        .pr2-compact-media-card .pr2-media-box canvas {
          width: 100% !important;
          height: 100% !important;
          max-height: 260px !important;
          object-fit: contain !important;
          object-position: center !important;
          background: #020617 !important;
        }

        .pr2-compact-media-card .pr2-details {
          margin-top: 0 !important;
        }

        .pr2-compact-media-card .pr2-prepared-strip {
          display: none !important;
        }

        .pr2-compact-media-card .pr2-empty {
          min-height: 220px !important;
          padding: 16px !important;
          border-radius: 20px !important;
        }

        @media (min-width: 760px) {
          .pr2-compact-media-card > .pr2-media-box,
          .pr2-compact-media-card > .pr2-details {
            justify-self: start !important;
          }
        }

        @media (max-width: 760px) {
          .pr2-compact-media-card .pr2-media-box {
            max-width: 100% !important;
            height: 240px !important;
          }

          .pr2-compact-media-card .pr2-media-box img,
          .pr2-compact-media-card .pr2-media-box video,
          .pr2-compact-media-card .pr2-media-box canvas {
            max-height: 240px !important;
          }
        }
      `}</style>


      <style jsx global>{`
        /* Simple customer review flow */
        .pr2-simple-steps {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin: 0 0 16px;
        }

        .pr2-simple-steps span {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: rgba(248, 250, 252, 0.72);
          font-size: 0.84rem;
          font-weight: 900;
        }

        .pr2-simple-steps strong {
          width: 24px;
          height: 24px;
          display: inline-grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.14);
          color: #ffd43b;
          font-size: 0.78rem;
          font-weight: 1000;
        }

        .pr2-simple-steps .is-active {
          border-color: rgba(255, 212, 59, 0.22);
          color: #ffffff;
        }

        .pr2-card,
        .pr2-flow-card,
        .pr2-simple-action-card {
          box-shadow: 0 18px 54px rgba(0, 0, 0, 0.2) !important;
        }

        .pr2-card-head h1,
        .pr2-card-head h2 {
          letter-spacing: -0.055em;
        }

        .pr2-simple-action-card {
          display: grid;
          gap: 14px;
          padding: clamp(18px, 2vw, 22px);
          border-radius: 28px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.11), transparent 34%),
            rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(255, 212, 59, 0.18);
        }

        .pr2-simple-action-head h2 {
          margin: 8px 0 8px;
          color: #ffffff;
          font-size: clamp(1.6rem, 3vw, 2.15rem);
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .pr2-simple-action-head p {
          margin: 0;
          color: rgba(248, 250, 252, 0.68);
          line-height: 1.45;
        }

        .pr2-simple-status {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 6px 11px;
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.14);
          border: 1px solid rgba(245, 158, 11, 0.25);
          color: #fde68a;
          font-size: 0.78rem;
          font-weight: 1000;
        }

        .pr2-simple-status.is-success {
          background: rgba(34, 197, 94, 0.14);
          border-color: rgba(34, 197, 94, 0.26);
          color: #bbf7d0;
        }

        .pr2-simple-main-action {
          min-height: 56px;
        }

        .pr2-send-section {
          display: grid;
          gap: 10px;
          padding: 14px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .pr2-send-head h3 {
          margin: 5px 0 0;
          color: #ffffff;
          font-size: 1.25rem;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .pr2-simple-schedule {
          display: grid;
          gap: 7px;
        }

        .pr2-simple-schedule span {
          color: #ffd43b;
          font-size: 0.76rem;
          font-weight: 1000;
          letter-spacing: 0.085em;
          text-transform: uppercase;
        }

        .pr2-simple-schedule input {
          width: 100%;
          min-height: 46px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(15, 23, 42, 0.72);
          color: #ffffff;
          padding: 0 12px;
          font-weight: 850;
        }

        .pr2-simple-helper-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .pr2-simple-more {
          margin-top: 0 !important;
        }

        .pr2-simple-more summary {
          color: rgba(248, 250, 252, 0.66);
        }

        .pr2-flow-card,
        .pr2-calm-action-card,
        .pr2-customer-action-card,
        .pr2-one-step-card,
        .pr2-simple-next-card,
        .pr2-simple-publish-card,
        .pr2-simple-post-card {
          display: none !important;
        }

        @media (max-width: 900px) {
          .pr2-simple-steps {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 620px) {
          .pr2-simple-steps,
          .pr2-simple-helper-actions {
            grid-template-columns: 1fr;
          }
        }

        /* Phase 4 merged post review card */
        .pr2-review-post-card {
          overflow: hidden;
          border-color: rgba(255, 212, 59, 0.2) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 34%),
            rgba(255,255,255,0.055) !important;
        }

        .pr2-review-post-head {
          align-items: flex-start !important;
          padding-bottom: 10px;
        }

        .pr2-review-wording-divider {
          height: 1px;
          margin: 18px 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 212, 59, 0.22),
            rgba(255,255,255,0.08),
            transparent
          );
        }

        .pr2-review-wording-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .pr2-review-wording-head h2 {
          margin: 4px 0 0;
          color: #ffffff;
          font-size: clamp(1.55rem, 3vw, 2.25rem);
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .pr2-review-wording-head p {
          max-width: 340px;
          margin: 0;
          color: rgba(248,250,252,0.62);
          line-height: 1.42;
          font-weight: 760;
          text-align: right;
        }

        .pr2-review-post-card .pr2-wording {
          padding: 14px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(2, 6, 23, 0.28);
        }

        .pr2-review-post-card .pr2-wording textarea,
        .pr2-review-post-card .pr2-wording input {
          background: rgba(2, 6, 23, 0.42) !important;
        }

        .pr2-review-post-card > .pr2-actions {
          margin-top: 14px;
          padding-top: 2px;
        }

        .pr2-simple-steps-merged {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        @media (max-width: 760px) {
          .pr2-review-wording-head {
            display: grid;
            gap: 8px;
          }

          .pr2-review-wording-head p {
            max-width: none;
            text-align: left;
          }

          .pr2-review-post-card .pr2-wording {
            padding: 12px;
            border-radius: 20px;
          }

          .pr2-simple-steps-merged {
            grid-template-columns: 1fr !important;
          }
        }


        /* Phase 4 simplified post review action panel */
        .pr2-action-side {
          align-self: start;
        }

        .pr2-action-panel {
          position: sticky;
          top: 18px;
          display: grid;
          gap: 14px;
          border-color: rgba(255, 212, 59, 0.18) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 34%),
            rgba(255,255,255,0.055) !important;
        }

        .pr2-action-panel-head h2 {
          margin: 5px 0 8px;
          color: #ffffff;
          font-size: clamp(1.9rem, 3.2vw, 2.65rem);
          line-height: 0.95;
          letter-spacing: -0.06em;
        }

        .pr2-action-panel-head p {
          margin: 0;
          color: rgba(248,250,252,0.66);
          line-height: 1.48;
          font-weight: 760;
        }

        .pr2-action-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 46px;
          padding: 10px 12px;
          border-radius: 18px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.09);
        }

        .pr2-action-status span {
          color: rgba(248,250,252,0.55);
          font-size: 0.75rem;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .pr2-action-status strong {
          color: #ffffff;
          font-size: 0.95rem;
        }

        .pr2-action-status.is-success {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.24);
        }

        .pr2-action-status.is-warning,
        .pr2-action-status.is-planned {
          background: rgba(255, 212, 59, 0.1);
          border-color: rgba(255, 212, 59, 0.22);
        }

        .pr2-action-status.is-error {
          background: rgba(248, 113, 113, 0.12);
          border-color: rgba(248, 113, 113, 0.24);
        }

        .pr2-action-stack {
          display: grid;
          gap: 10px;
        }

        .pr2-action-main-button {
          min-height: 58px;
          font-size: 1rem;
        }

        .pr2-action-schedule-card {
          display: grid;
          gap: 10px;
          padding: 12px;
          border-radius: 20px;
          background: rgba(2, 6, 23, 0.24);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .pr2-action-more {
          margin-top: 0 !important;
        }

        .pr2-action-more summary {
          color: rgba(248, 250, 252, 0.66);
        }

        .pr2-action-error {
          margin: 0 !important;
        }

        .pr2-action-panel .pr2-side-options {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        @media (max-width: 960px) {
          .pr2-action-panel {
            position: static;
          }
        }


        /* Phase 4 radical client simplification */
        .pr2-hidden-steps {
          display: none !important;
        }

        .pr2-page[data-review-page] .pr2-layout {
          align-items: start;
        }

        .pr2-review-post-card {
          border-color: rgba(255, 212, 59, 0.18) !important;
        }

        .pr2-review-post-card .pr2-card-head {
          margin-bottom: 12px;
        }

        .pr2-review-post-card .pr2-card-head > button,
        .pr2-review-post-card .pr2-media-current-label,
        .pr2-review-post-card .pr2-prepared-strip {
          display: none !important;
        }

        .pr2-review-post-card .pr2-details {
          margin-top: 10px;
        }

        .pr2-review-post-card .pr2-details summary {
          color: rgba(248,250,252,0.56);
          font-size: 0.9rem;
        }

        .pr2-review-post-card .pr2-actions {
          grid-template-columns: 1fr !important;
        }

        .pr2-review-post-card .pr2-actions .pr2-btn {
          min-height: 50px;
        }

        .pr2-review-post-card .pr2-actions .pr2-btn:not(.pr2-btn-primary) {
          background: rgba(255,255,255,0.055);
        }

        .pr2-review-post-card .pr2-actions .pr2-btn:nth-child(2),
        .pr2-review-post-card .pr2-actions .pr2-btn:nth-child(3) {
          display: none !important;
        }

        .pr2-client-action-side {
          align-self: start;
        }

        .pr2-client-action-card {
          position: sticky;
          top: 18px;
          display: grid;
          gap: 14px;
          border-color: rgba(255, 212, 59, 0.2) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.14), transparent 36%),
            rgba(255,255,255,0.055) !important;
        }

        .pr2-client-action-head h2 {
          margin: 5px 0 8px;
          color: #ffffff;
          font-size: clamp(2rem, 3.5vw, 2.8rem);
          line-height: 0.93;
          letter-spacing: -0.065em;
        }

        .pr2-client-action-head p {
          margin: 0;
          color: rgba(248,250,252,0.66);
          line-height: 1.48;
          font-weight: 760;
        }

        .pr2-client-big-button {
          width: 100%;
          min-height: 62px;
          border-radius: 20px;
          font-size: 1.03rem;
        }

        .pr2-client-publish-flow {
          display: grid;
          gap: 10px;
        }

        .pr2-client-schedule-details,
        .pr2-client-more-details {
          margin-top: 0 !important;
        }

        .pr2-client-schedule-details summary,
        .pr2-client-more-details summary {
          color: rgba(248,250,252,0.62);
          font-weight: 900;
        }

        .pr2-client-more-details .pr2-side-options {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        .pr2-action-schedule-card {
          display: grid;
          gap: 10px;
          margin-top: 12px;
          padding: 12px;
          border-radius: 20px;
          background: rgba(2, 6, 23, 0.24);
          border: 1px solid rgba(255,255,255,0.08);
        }

        @media (max-width: 960px) {
          .pr2-client-action-card {
            position: static;
          }
        }


        /* Less crowded publish panel + approve button back */
        .pr2-main-review-actions {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 10px !important;
        }

        .pr2-main-review-actions > .pr2-btn {
          min-height: 56px !important;
        }

        .pr2-main-more-actions {
          grid-column: 1 / -1;
          margin-top: 0 !important;
        }

        .pr2-main-more-actions summary {
          color: rgba(248,250,252,0.58);
          font-weight: 900;
        }

        .pr2-review-post-card .pr2-actions .pr2-btn:nth-child(2),
        .pr2-review-post-card .pr2-actions .pr2-btn:nth-child(3) {
          display: inline-flex !important;
        }

        .pr2-publish-side {
          align-self: start;
        }

        .pr2-publish-card-simple {
          position: sticky;
          top: 18px;
          display: grid;
          gap: 12px;
          border-color: rgba(255, 212, 59, 0.18) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 34%),
            rgba(255,255,255,0.052) !important;
        }

        .pr2-publish-simple-head h2 {
          margin: 5px 0 7px;
          color: #ffffff;
          font-size: clamp(1.7rem, 3vw, 2.35rem);
          line-height: 0.96;
          letter-spacing: -0.06em;
        }

        .pr2-publish-simple-head p {
          margin: 0;
          color: rgba(248,250,252,0.62);
          line-height: 1.45;
          font-weight: 760;
        }

        .pr2-publish-simple-status {
          display: inline-flex;
          width: fit-content;
          min-height: 34px;
          align-items: center;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(248,250,252,0.78);
          font-size: 0.84rem;
          font-weight: 1000;
        }

        .pr2-publish-simple-status.is-success {
          background: rgba(34,197,94,0.12);
          border-color: rgba(34,197,94,0.24);
          color: #bbf7d0;
        }

        .pr2-publish-simple-status.is-warning,
        .pr2-publish-simple-status.is-planned {
          background: rgba(255, 212, 59, 0.1);
          border-color: rgba(255, 212, 59, 0.22);
          color: #ffe58a;
        }

        .pr2-publish-simple-button {
          min-height: 58px;
        }

        .pr2-publish-options,
        .pr2-publish-more,
        .pr2-schedule-collapsed {
          margin-top: 0 !important;
        }

        .pr2-publish-options summary,
        .pr2-publish-more summary,
        .pr2-schedule-collapsed summary {
          color: rgba(248,250,252,0.66);
          font-weight: 950;
        }

        .pr2-publish-option-stack {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        .pr2-publish-option-stack > .pr2-btn {
          min-height: 52px;
        }

        .pr2-publish-more .pr2-side-options {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        @media (max-width: 960px) {
          .pr2-publish-card-simple {
            position: static;
          }
        }

        @media (max-width: 620px) {
          .pr2-main-review-actions {
            grid-template-columns: 1fr !important;
          }
        }


        /* Client-simple approval + tidy editing */
        .pr2-approval-side {
          align-self: start;
        }

        .pr2-approval-card-simple {
          position: sticky;
          top: 18px;
          display: grid;
          gap: 12px;
          border-color: rgba(255, 212, 59, 0.18) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 34%),
            rgba(255,255,255,0.052) !important;
        }

        .pr2-approval-simple-head h2 {
          margin: 5px 0 7px;
          color: #ffffff;
          font-size: clamp(1.75rem, 3vw, 2.35rem);
          line-height: 0.96;
          letter-spacing: -0.06em;
        }

        .pr2-approval-simple-head p {
          margin: 0;
          color: rgba(248,250,252,0.62);
          line-height: 1.45;
          font-weight: 760;
        }

        .pr2-approval-simple-status {
          display: inline-flex;
          width: fit-content;
          min-height: 34px;
          align-items: center;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(248,250,252,0.78);
          font-size: 0.84rem;
          font-weight: 1000;
        }

        .pr2-approval-simple-status.is-success {
          background: rgba(34,197,94,0.12);
          border-color: rgba(34,197,94,0.24);
          color: #bbf7d0;
        }

        .pr2-approval-simple-status.is-warning,
        .pr2-approval-simple-status.is-planned {
          background: rgba(255, 212, 59, 0.1);
          border-color: rgba(255, 212, 59, 0.22);
          color: #ffe58a;
        }

        .pr2-approval-simple-status.is-error {
          background: rgba(248, 113, 113, 0.12);
          border-color: rgba(248, 113, 113, 0.24);
          color: #fecaca;
        }

        .pr2-approval-main-button,
        .pr2-approval-share-media {
          width: 100%;
          min-height: 56px;
          border-radius: 18px;
        }

        .pr2-approval-schedule-only {
          display: grid;
          gap: 10px;
          padding: 12px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(2, 6, 23, 0.24);
        }

        .pr2-tidy-edit-actions {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr !important;
          gap: 10px !important;
        }

        .pr2-tidy-edit-actions > .pr2-btn {
          min-height: 54px !important;
        }

        .pr2-review-post-card .pr2-actions .pr2-btn,
        .pr2-review-post-card .pr2-actions .pr2-btn:nth-child(2),
        .pr2-review-post-card .pr2-actions .pr2-btn:nth-child(3) {
          display: inline-flex !important;
        }

        .pr2-main-more-actions,
        .pr2-publish-more,
        .pr2-publish-options,
        .pr2-client-more-details,
        .pr2-client-schedule-details,
        .pr2-action-more {
          display: none !important;
        }

        .pr2-improve-grid {
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        }

        .pr2-select-row {
          display: none !important;
        }

        @media (max-width: 960px) {
          .pr2-approval-card-simple {
            position: static;
          }

          .pr2-tidy-edit-actions {
            grid-template-columns: 1fr !important;
          }

          .pr2-improve-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @media (max-width: 560px) {
          .pr2-improve-grid {
            grid-template-columns: 1fr !important;
          }
        }


        /* Remove visible media options from client review flow */
        .pr2-review-post-card .pr2-details:has(summary),
        .pr2-review-post-card .pr2-media-current-label,
        .pr2-review-post-card .pr2-prepared-strip {
          display: none !important;
        }

        .pr2-review-post-card .pr2-card-head > button {
          display: none !important;
        }

        .pr2-media-box {
          margin-bottom: 0 !important;
        }


        /* Improve wording spacing + simple reach selector */
        .pr2-main .pr2-card:has(.pr2-improve-grid) {
          display: grid;
          gap: 18px;
        }

        .pr2-main .pr2-card:has(.pr2-improve-grid) .pr2-card-head {
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 0;
        }

        .pr2-main .pr2-card:has(.pr2-improve-grid) .pr2-card-head h2 {
          max-width: 720px;
          line-height: 0.96;
        }

        .pr2-improve-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)) !important;
          gap: 12px !important;
          align-items: stretch;
        }

        .pr2-improve-grid .pr2-btn {
          min-height: 58px;
          white-space: normal;
          line-height: 1.12;
          padding: 12px 14px;
        }

        .pr2-simple-reach-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 12px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(2, 6, 23, 0.24);
        }

        .pr2-simple-reach-row > span {
          color: #ffd43b;
          font-size: 0.76rem;
          font-weight: 1000;
          letter-spacing: 0.085em;
          text-transform: uppercase;
          margin-right: 2px;
        }

        .pr2-reach-pill {
          appearance: none;
          min-height: 40px;
          padding: 9px 13px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: rgba(248,250,252,0.74);
          font-weight: 950;
          cursor: pointer;
        }

        .pr2-reach-pill.is-active {
          border-color: rgba(255, 212, 59, 0.42);
          background: rgba(255, 212, 59, 0.14);
          color: #ffe58a;
        }

        .pr2-select-row {
          display: none !important;
        }

        @media (max-width: 620px) {
          .pr2-improve-grid {
            grid-template-columns: 1fr !important;
          }

          .pr2-simple-reach-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .pr2-simple-reach-row > span {
            grid-column: 1 / -1;
          }
        }


        /* Phase 4 post review wording audit */
        .pr2-review-post-card .pr2-card-head > button,
        .pr2-media-current-label,
        .pr2-prepared-strip,
        .pr2-mobile-editing-tools,
        .pr2-create-actions,
        .pr2-prepared-ready {
          display: none !important;
        }

        .pr2-review-wording-head p {
          max-width: 360px;
        }

        .pr2-simple-reach-row > span {
          min-width: 72px;
        }

        .pr2-approval-card-simple {
          gap: 14px !important;
        }

        .pr2-approval-simple-head p {
          max-width: 340px;
        }

        .pr2-approval-share-media {
          order: 5;
        }


        /* Make reach/location selection clear */
        .pr2-reach-helper {
          margin: -4px 0 0;
          color: rgba(248,250,252,0.62);
          font-size: 0.92rem;
          line-height: 1.42;
          font-weight: 760;
        }


        /* Reach selector hard-guidance helper */
        .pr2-reach-helper {
          margin: -4px 0 0;
          color: rgba(248,250,252,0.62);
          font-size: 0.92rem;
          line-height: 1.42;
          font-weight: 760;
        }


        /* Reach applying state */
        .pr2-reach-pill:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .pr2-reach-pill.is-active:disabled {
          opacity: 1;
          border-color: rgba(255, 212, 59, 0.56);
          background: rgba(255, 212, 59, 0.18);
          color: #ffe58a;
        }


        /* Location selector UX */
        .pr2-location-selected {
          margin: -2px 0 0;
          color: rgba(248,250,252,0.64);
          font-size: 0.92rem;
          line-height: 1.4;
          font-weight: 760;
        }

        .pr2-location-selected strong {
          color: #ffe58a;
          font-weight: 1000;
        }

        .pr2-reach-pill:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .pr2-reach-pill.is-active:disabled {
          opacity: 1;
          border-color: rgba(255, 212, 59, 0.56);
          background: rgba(255, 212, 59, 0.18);
          color: #ffe58a;
        }


        /* Location selector saved rewrite UX */
        .pr2-location-selected {
          margin: -2px 0 0;
          color: rgba(248,250,252,0.64);
          font-size: 0.92rem;
          line-height: 1.4;
          font-weight: 760;
        }

        .pr2-location-selected strong {
          color: #ffe58a;
          font-weight: 1000;
        }

        .pr2-reach-pill:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .pr2-reach-pill.is-active:disabled {
          opacity: 1;
          border-color: rgba(255, 212, 59, 0.56);
          background: rgba(255, 212, 59, 0.18);
          color: #ffe58a;
        }


        /* Deterministic location apply */
        .pr2-location-selected {
          margin: -2px 0 0;
          color: rgba(248,250,252,0.64);
          font-size: 0.92rem;
          line-height: 1.4;
          font-weight: 760;
        }

        .pr2-location-selected strong {
          color: #ffe58a;
          font-weight: 1000;
        }

        .pr2-reach-pill:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .pr2-reach-pill.is-active:disabled {
          opacity: 1;
          border-color: rgba(255, 212, 59, 0.56);
          background: rgba(255, 212, 59, 0.18);
          color: #ffe58a;
        }


        /* AI location selector */
        .pr2-location-selected {
          margin: -2px 0 0;
          color: rgba(248,250,252,0.64);
          font-size: 0.92rem;
          line-height: 1.4;
          font-weight: 760;
        }

        .pr2-location-selected strong {
          color: #ffe58a;
          font-weight: 1000;
        }

        .pr2-reach-pill:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .pr2-reach-pill.is-active:disabled {
          opacity: 1;
          border-color: rgba(255, 212, 59, 0.56);
          background: rgba(255, 212, 59, 0.18);
          color: #ffe58a;
        }


        /* Remove Location selector from review flow */
        .pr2-simple-reach-row,
        .pr2-reach-helper,
        .pr2-location-selected {
          display: none !important;
        }


        /* Client feedback polish: visible AI wording progress state */
        .pr2-ai-progress {
          position: fixed !important;
          inset: 0 !important;
          z-index: 70 !important;
          display: grid !important;
          place-items: center !important;
          padding: 20px !important;
          background: rgba(2, 6, 23, 0.72) !important;
          backdrop-filter: blur(14px) !important;
        }

        .pr2-ai-progress-card {
          width: min(100%, 560px) !important;
          border-radius: 30px !important;
          padding: clamp(24px, 4vw, 34px) !important;
          border: 1px solid rgba(255, 212, 59, 0.24) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.16), transparent 36%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.96)) !important;
          box-shadow: 0 34px 110px rgba(0, 0, 0, 0.48) !important;
          text-align: left !important;
        }

        .pr2-ai-progress-card h2 {
          margin: 8px 0 10px !important;
          color: #ffffff !important;
          font-size: clamp(2rem, 4vw, 3.2rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.055em !important;
        }

        .pr2-ai-progress-card p {
          margin: 0 !important;
          color: rgba(248,250,252,0.72) !important;
          line-height: 1.55 !important;
          font-weight: 760 !important;
        }

        .pr2-ai-progress-bar {
          height: 10px !important;
          margin: 22px 0 16px !important;
          border-radius: 999px !important;
          overflow: hidden !important;
          background: rgba(255,255,255,0.08) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
        }

        .pr2-ai-progress-bar span {
          display: block !important;
          width: 42% !important;
          height: 100% !important;
          border-radius: inherit !important;
          background: linear-gradient(90deg, transparent, #ffd43b, #f7b733, transparent) !important;
          animation: pr2AiProgressSlide 1.08s ease-in-out infinite !important;
        }

        .pr2-ai-progress-steps {
          display: grid !important;
          gap: 8px !important;
        }

        .pr2-ai-progress-steps span {
          display: flex !important;
          align-items: center !important;
          gap: 9px !important;
          color: rgba(248,250,252,0.72) !important;
          font-size: 0.92rem !important;
          font-weight: 850 !important;
        }

        .pr2-ai-progress-steps span::before {
          content: "" !important;
          width: 8px !important;
          height: 8px !important;
          flex: 0 0 auto !important;
          border-radius: 999px !important;
          background: #ffd43b !important;
          box-shadow: 0 0 18px rgba(255, 212, 59, 0.72) !important;
        }

        @keyframes pr2AiProgressSlide {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(260%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .pr2-ai-progress-bar span {
            animation: none !important;
            width: 100% !important;
          }
        }

        .pr2-improve-default-note {
          margin: 6px 0 0;
          color: rgba(248,250,252,0.62);
          line-height: 1.45;
          font-weight: 760;
          max-width: 620px;
        }

      `}</style>

    </main>
  );
}
