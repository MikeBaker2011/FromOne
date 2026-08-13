"use client";

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

const offerPricingOptions = [
  "Free",
  "Discount",
  "Fixed price",
  "From price",
  "BOGOF / multibuy",
  "Ask venue",
  "Price to be confirmed",
];

const eventTicketOptions = [
  "Free entry",
  "Ticketed",
  "Pay on door",
  "From price",
  "Donation",
  "Price to be confirmed",
];

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function isValidHttpUrl(value: string) {
  const cleaned = cleanText(value);

  if (!cleaned) return true;

  try {
    const url = new URL(cleaned);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

  if (clean.includes("stockport smiles") || clean.includes("smiles")) {
    return "Stockport Smiles";
  }
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

function mergePublishedPlatform(currentValue: any, platform: "Facebook" | "Instagram") {
  const currentPlatforms = (Array.isArray(currentValue) ? currentValue : cleanText(currentValue).split(","))
    .map((value) => cleanText(value).toLowerCase())
    .filter(Boolean);
  const nextPlatform = platform.toLowerCase();

  const nextPlatforms = currentPlatforms.some(
    (value) => value === nextPlatform,
  )
    ? currentPlatforms
    : [...currentPlatforms, nextPlatform];

  return Array.from(new Set(nextPlatforms));
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


function getCreatedFromUploadLabel(post: any) {
  const mediaType = cleanText(post?.media_type).toLowerCase();
  const mediaUrl = cleanText(post?.media_url).toLowerCase();

  if (mediaType === "video" || mediaUrl.match(/\.(mp4|mov|webm|m4v)(\?|$)/)) {
    return "Created from video";
  }

  if (
    mediaType === "flyer" ||
    mediaType === "pdf" ||
    mediaUrl.includes(".pdf")
  ) {
    return "Created from flyer";
  }

  if (mediaType === "image" || mediaUrl) {
    return "Created from image";
  }

  return "Profile-only draft";
}

function getCreatedFromUploadDescription(post: any) {
  const label = getCreatedFromUploadLabel(post);

  if (label === "Created from video") {
    return "FromOne created this scheduled post from your uploaded video.";
  }

  if (label === "Created from flyer") {
    return "FromOne created this scheduled post from your uploaded flyer.";
  }

  if (label === "Created from image") {
    return "FromOne created this scheduled post from your uploaded image.";
  }

  return "This draft was created from your saved business profile. Add media here if you want.";
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
      description: "This post is approved. You can publish now, keep the scheduled time, or copy it manually.",
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
      description: "Check the wording, media and scheduled time, then approve it when you are happy.",
    };
  }

  return {
    label: "Needs review",
    tone: "warning",
    description: "Check the wording, then publish or autoschedule.",
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
      description: "Choose or confirm the scheduled time.",
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
      "FromOne will use this scheduled time once approved.",
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

function detectSmilezType(post: any, caption: string): "venue" | "offer" | "event" {
  const savedDraft = post?.smiles_draft || post?.smilesDraft || null;
  if (
    savedDraft?.type === "venue" ||
    savedDraft?.type === "offer" ||
    savedDraft?.type === "event"
  ) {
    return savedDraft.type;
  }

  const text = [
    post?.title,
    post?.caption,
    caption,
    post?.cta,
    post?.hashtags,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const eventSignals = [
    "live music",
    "quiz night",
    "dj ",
    " dj",
    "event",
    "tickets",
    "ticket",
    "doors open",
    "this friday",
    "this saturday",
    "this sunday",
    "tonight",
    "starts at",
    "from 7pm",
    "from 8pm",
    "from 9pm",
  ];

  const offerSignals = [
    "2 for 1",
    "two for one",
    "buy one get one",
    "bogo",
    "% off",
    "discount",
    "special offer",
    "offer",
    "deal",
    "save £",
    "save ",
    "half price",
    "free with",
    "happy hour",
  ];

  if (eventSignals.some((signal) => text.includes(signal))) return "event";
  if (offerSignals.some((signal) => text.includes(signal))) return "offer";
  return "venue";
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
  const [sendingToSmilesPostId, setSendingToSmilesPostId] = useState<
    string | null
  >(null);
  const [smilesActionMessage, setSmilesActionMessage] = useState("");
  const [smilesActionTone, setSmilesActionTone] = useState<
    "info" | "success" | "error"
  >("info");
  const [lastPublishedPlatform, setLastPublishedPlatform] = useState("");
  const [smilesChoice, setSmilesChoice] = useState<"no" | "venue" | "offer" | "event">("no");
  const [showSmilezDetails, setShowSmilezDetails] = useState(false);
  const [publishToFacebook, setPublishToFacebook] = useState(true);
  const [publishToInstagram, setPublishToInstagram] = useState(true);
  const [publishToSmilez, setPublishToSmilez] = useState(false);
  const [publishingSelected, setPublishingSelected] = useState(false);
  const [smilesTitle, setSmilesTitle] = useState("");
  const [smilesDescription, setSmilesDescription] = useState("");
  const [smilesShortDescription, setSmilesShortDescription] = useState("");
  const [smilesOfferText, setSmilesOfferText] = useState("");
  const [smilesPricingLabel, setSmilesPricingLabel] = useState("Price to be confirmed");
  const [smilesPriceValue, setSmilesPriceValue] = useState("");
  const [smilesEventText, setSmilesEventText] = useState("");
  const [smilesTicketType, setSmilesTicketType] = useState("Price to be confirmed");
  const [smilesTicketPrice, setSmilesTicketPrice] = useState("");
  const [smilesStartDate, setSmilesStartDate] = useState("");
  const [smilesEndDate, setSmilesEndDate] = useState("");
  const [smilesValidDays, setSmilesValidDays] = useState("");
  const [smilesValidTimes, setSmilesValidTimes] = useState("");
  const [smilesTerms, setSmilesTerms] = useState("");
  const [smilesEventDate, setSmilesEventDate] = useState("");
  const [smilesEventEndDate, setSmilesEventEndDate] = useState("");
  const [smilesStartTime, setSmilesStartTime] = useState("");
  const [smilesEndTime, setSmilesEndTime] = useState("");
  const [smilesBookingUrl, setSmilesBookingUrl] = useState("");
  const [smilesVenueType, setSmilesVenueType] = useState("");
  const [smilesLocationName, setSmilesLocationName] = useState("");
  const [smilesLocationArea, setSmilesLocationArea] = useState("");
  const [smilesAddress, setSmilesAddress] = useState("");
  const [smilesWebsiteUrl, setSmilesWebsiteUrl] = useState("");
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
  const isSmilesPost = platformName.toLowerCase().includes("smiles");
  const canAutopublish = isFacebookPost || isInstagramPost;
  const autopublishPlatformLabel = isInstagramPost ? "Instagram" : "Facebook";

  const isPosted =
    Boolean(post?.is_posted) ||
    cleanText(post?.status).toLowerCase() === "posted" ||
    cleanText(post?.publish_status).toLowerCase() === "posted";
  const publishedTo = cleanText(post?.published_to || post?.publishedTo);
  const displayedPublishedPlatform = publishedTo || lastPublishedPlatform;
  const facebookPublished = displayedPublishedPlatform.toLowerCase().includes("facebook");
  const instagramPublished = displayedPublishedPlatform.toLowerCase().includes("instagram");

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

  const getSmilesDraft = (sourcePost: any) => {
    return sourcePost?.smiles_draft || sourcePost?.smilesDraft || null;
  };

  const smilesDraft = getSmilesDraft(post);

  const applySmilesDraftToForm = (
    draft: any,
    sourcePost: any,
    fallbackType: "venue" | "offer" | "event" | "" = "",
  ) => {
    const draftType =
      draft?.type === "venue" ||
      draft?.type === "offer" ||
      draft?.type === "event"
        ? draft.type
        : fallbackType;

    if (
      draftType !== "venue" &&
      draftType !== "offer" &&
      draftType !== "event"
    ) {
      setSmilesChoice("no");
      setSmilesTitle("");
      setSmilesDescription("");
      setSmilesShortDescription("");
      setSmilesOfferText("");
      setSmilesPricingLabel("Price to be confirmed");
      setSmilesPriceValue("");
      setSmilesEventText("");
      setSmilesTicketType("Price to be confirmed");
      setSmilesTicketPrice("");
      setSmilesStartDate("");
      setSmilesEndDate("");
      setSmilesValidDays("");
      setSmilesValidTimes("");
      setSmilesTerms("");
      setSmilesEventDate("");
      setSmilesEventEndDate("");
      setSmilesStartTime("");
      setSmilesEndTime("");
      setSmilesBookingUrl("");
      setSmilesVenueType("");
      setSmilesLocationName("");
      setSmilesLocationArea("");
      setSmilesAddress("");
      setSmilesWebsiteUrl("");
      return;
    }

    setSmilesChoice(draftType);
    setSmilesTitle(cleanText(draft?.title || sourcePost?.title || ""));
    setSmilesDescription(
      cleanText(
        draft?.description ||
          draft?.shortDescription ||
          draft?.short_description ||
          sourcePost?.caption ||
          caption,
      ),
    );
    setSmilesShortDescription(
      cleanText(
        draft?.shortDescription ||
          draft?.short_description ||
          draft?.description ||
          sourcePost?.caption ||
          caption,
      ).slice(0, 180),
    );

    setSmilesOfferText(
      draftType === "offer"
        ? cleanText(
            draft?.savingText ||
              draft?.saving_text ||
              draft?.priceText ||
              draft?.price_text ||
              "",
          )
        : "",
    );
    setSmilesPricingLabel(
      draftType === "offer"
        ? cleanText(draft?.pricingLabel || draft?.pricing_label || "") ||
            "Price to be confirmed"
        : "Price to be confirmed",
    );
    setSmilesPriceValue(
      draftType === "offer"
        ? cleanText(
            draft?.priceValue ||
              draft?.price_value ||
              draft?.savingValue ||
              draft?.saving_value ||
              draft?.priceText ||
              draft?.price_text ||
              "",
          )
        : "",
    );

    setSmilesEventText(
      draftType === "event"
        ? cleanText(draft?.title || draft?.description || sourcePost?.title || "")
        : "",
    );
    setSmilesTicketType(
      draftType === "event"
        ? cleanText(draft?.ticketType || draft?.ticket_type || "") ||
            "Price to be confirmed"
        : "Price to be confirmed",
    );
    setSmilesTicketPrice(
      draftType === "event"
        ? cleanText(
            draft?.ticketPrice ||
              draft?.ticket_price ||
              draft?.priceText ||
              draft?.price_text ||
              "",
          )
        : "",
    );

    setSmilesStartDate(
      cleanText(draft?.startDate || draft?.start_date || ""),
    );
    setSmilesEndDate(cleanText(draft?.endDate || draft?.end_date || ""));
    setSmilesValidDays(
      cleanText(draft?.validDays || draft?.valid_days || ""),
    );
    setSmilesValidTimes(
      cleanText(draft?.validTimes || draft?.valid_times || ""),
    );
    setSmilesTerms(cleanText(draft?.terms || ""));
    setSmilesEventDate(
      cleanText(draft?.startDate || draft?.start_date || ""),
    );
    setSmilesEventEndDate(
      cleanText(draft?.endDate || draft?.end_date || ""),
    );
    setSmilesStartTime(
      cleanText(draft?.startTime || draft?.start_time || ""),
    );
    setSmilesEndTime(cleanText(draft?.endTime || draft?.end_time || ""));
    setSmilesBookingUrl(
      cleanText(
        draft?.bookingUrl ||
          draft?.booking_url ||
          sourcePost?.booking_url ||
          "",
      ),
    );
    setSmilesVenueType(
      cleanText(
        draft?.venueType ||
          draft?.venue_type ||
          sourcePost?.venue_type ||
          sourcePost?.industry ||
          "",
      ),
    );
    setSmilesLocationName(
      cleanText(
        draft?.locationName ||
          draft?.location_name ||
          sourcePost?.location_name ||
          sourcePost?.business_name ||
          sourcePost?.company_name ||
          "",
      ),
    );
    setSmilesLocationArea(
      cleanText(
        draft?.locationArea ||
          draft?.location_area ||
          sourcePost?.location_area ||
          sourcePost?.town ||
          sourcePost?.city ||
          "",
      ),
    );
    setSmilesAddress(
      cleanText(draft?.address || sourcePost?.address || ""),
    );
    setSmilesWebsiteUrl(
      cleanText(
        draft?.websiteUrl ||
          draft?.website_url ||
          sourcePost?.website_url ||
          "",
      ),
    );
  };

  const handleSmilesChoiceChange = (
    nextChoice: "no" | "venue" | "offer" | "event",
  ) => {
    if (nextChoice === "no") {
      setSmilesChoice("no");
      setShowSmilezDetails(false);
      return;
    }

    const savedDraft = getSmilesDraft(post) || {};
    applySmilesDraftToForm(
      {
        ...savedDraft,
        recommended: true,
        type: nextChoice,
        title:
          savedDraft?.title ||
          post?.title ||
          (nextChoice === "venue" ? post?.business_name : ""),
        description:
          savedDraft?.description ||
          savedDraft?.shortDescription ||
          post?.caption ||
          caption,
        shortDescription:
          savedDraft?.shortDescription ||
          savedDraft?.short_description ||
          post?.caption ||
          caption,
        priceText:
          savedDraft?.priceText ||
          savedDraft?.price_text ||
          savedDraft?.savingText ||
          "",
      },
      post,
      nextChoice,
    );
  };

  const handleSmilezShareToggle = () => {
    if (post?.smiles_status === "sent") {
      setShowSmilezDetails((current) => !current);
      return;
    }

    if (smilesChoice !== "no") {
      handleSmilesChoiceChange("no");
      setPublishToSmilez(false);
      return;
    }

    const detectedType = detectSmilezType(post, caption);
    handleSmilesChoiceChange(detectedType);
    setPublishToSmilez(true);
    setShowSmilezDetails(false);
  };

  const buildSmilesDraftFromLiveItem = (
    itemType: "offer" | "event",
    item: any,
    fallbackDraft: any,
  ) => {
    if (itemType === "offer") {
      return {
        ...(fallbackDraft || {}),
        id: item?.id || fallbackDraft?.id || fallbackDraft?.smilesDraftId || null,
        smilesDraftId: item?.id || fallbackDraft?.smilesDraftId || fallbackDraft?.id || null,
        smiles_draft_id: item?.id || fallbackDraft?.smiles_draft_id || fallbackDraft?.id || null,
        smilesOfferId: item?.id || fallbackDraft?.smilesOfferId || fallbackDraft?.id || null,
        smiles_offer_id: item?.id || fallbackDraft?.smiles_offer_id || fallbackDraft?.id || null,
        table: "offers",
        smilesTable: "offers",
        smiles_table: "offers",
        recommended: true,
        type: "offer",
        title: item?.title,
        description: item?.description || item?.short_description,
        shortDescription: item?.short_description || item?.description,
        savingText: item?.saving_text || item?.price_text,
        saving_text: item?.saving_text || item?.price_text,
        priceText: item?.price_text,
        price_text: item?.price_text,
        pricingLabel: item?.pricing_label,
        pricing_label: item?.pricing_label,
        priceValue: item?.price_value,
        price_value: item?.price_value,
        startDate: item?.start_date,
        start_date: item?.start_date,
        endDate: item?.end_date,
        end_date: item?.end_date,
        validDays: item?.valid_days,
        valid_days: item?.valid_days,
        validTimes: item?.valid_times,
        valid_times: item?.valid_times,
        terms: item?.terms,
      };
    }

    return {
      ...(fallbackDraft || {}),
      id: item?.id || fallbackDraft?.id || fallbackDraft?.smilesDraftId || null,
      smilesDraftId: item?.id || fallbackDraft?.smilesDraftId || fallbackDraft?.id || null,
      smiles_draft_id: item?.id || fallbackDraft?.smiles_draft_id || fallbackDraft?.id || null,
      smilesEventId: item?.id || fallbackDraft?.smilesEventId || fallbackDraft?.id || null,
      smiles_event_id: item?.id || fallbackDraft?.smiles_event_id || fallbackDraft?.id || null,
      table: "events",
      smilesTable: "events",
      smiles_table: "events",
      recommended: true,
      type: "event",
      title: item?.title,
      description: item?.description || item?.short_description,
      shortDescription: item?.short_description || item?.description,
      ticketType: item?.ticket_type,
      ticket_type: item?.ticket_type,
      ticketPrice: item?.ticket_price,
      ticket_price: item?.ticket_price,
      priceText: item?.price_text,
      price_text: item?.price_text,
      startDate: item?.start_date,
      start_date: item?.start_date,
      endDate: item?.end_date,
      end_date: item?.end_date,
      startTime: item?.start_time,
      start_time: item?.start_time,
      endTime: item?.end_time,
      end_time: item?.end_time,
      bookingUrl: item?.booking_url,
      booking_url: item?.booking_url,
    };
  };

  const smilesPrefillKey = [
    cleanText(post?.id),
    cleanText(post?.smiles_draft_id),
    cleanText(post?.smiles_table),
  ].join("|");

  useEffect(() => {
    if (!post?.id) return;

    const draft = getSmilesDraft(post);
    const linkedSmilesType =
      cleanText(post?.smiles_table).toLowerCase() === "offers"
        ? "offer"
        : cleanText(post?.smiles_table).toLowerCase() === "events"
          ? "event"
          : "";
    const linkedSmilesId = cleanText(
      post?.smiles_draft_id || draft?.id || draft?.smilesDraftId,
    );

    if (draft?.type === "venue" || draft?.type === "offer" || draft?.type === "event") {
      applySmilesDraftToForm(draft, post);
    } else if (linkedSmilesType === "offer" || linkedSmilesType === "event") {
      applySmilesDraftToForm(
        {
          recommended: true,
          type: linkedSmilesType,
          title: post?.title,
          description: post?.caption || caption,
        },
        post,
        linkedSmilesType,
      );
    } else {
      applySmilesDraftToForm(null, post);
      return;
    }

    const liveItemType: "offer" | "event" | "" =
      linkedSmilesType ||
      (draft?.type === "offer" || draft?.type === "event" ? draft.type : "");

    if (
      (liveItemType !== "offer" && liveItemType !== "event") ||
      !linkedSmilesId
    ) {
      return;
    }

    let cancelled = false;

    const loadLiveSmilesItem = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;

        if (!accessToken) {
          return;
        }

        const response = await fetch(
          `/api/smiles/items/${liveItemType}/${linkedSmilesId}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result?.ok === false || result?.success === false) {
          return;
        }

        const liveItem =
          result?.item ||
          result?.data ||
          result?.offer ||
          result?.event ||
          result?.record ||
          null;

        if (!liveItem || cancelled) return;

        applySmilesDraftToForm(
          buildSmilesDraftFromLiveItem(liveItemType, liveItem, draft),
          post,
          liveItemType,
        );
      } catch {
        // Keep the saved FromOne draft visible if the live Smiles lookup fails.
      }
    };

    loadLiveSmilesItem();

    return () => {
      cancelled = true;
    };
  }, [smilesPrefillKey]);

  const canSendToSmiles = (sourcePost: any) => {
    const draft = getSmilesDraft(sourcePost);

    return Boolean(
      sourcePost?.id &&
        draft &&
        draft.recommended === true &&
        draft.type &&
        draft.type !== "none" &&
        sourcePost?.smiles_status !== "sent",
    );
  };

  const getSmilesStatusText = (sourcePost: any) => {
    if (!sourcePost?.id) return "Smiles status unavailable.";
    if (sourcePost?.smiles_status === "sent") return "Already sent to Smiles.";
    if (sourcePost?.smiles_status === "failed") {
      return sourcePost?.smiles_error || "Smiles send failed.";
    }

    const draft = getSmilesDraft(sourcePost);

    if (!draft) {
      return "No Smiles draft was saved for this post.";
    }

    if (draft.recommended !== true || draft.type === "none") {
      return "Not suitable for Smiles.";
    }

    return "Ready to send to Smiles.";
  };

  const getSmilesSentInfo = (sourcePost: any) => {
    const draft = getSmilesDraft(sourcePost) || {};
    const table = cleanText(sourcePost?.smiles_table || draft.table || draft.smilesTable);
    const slug = cleanText(sourcePost?.smiles_slug || draft.slug || draft.smilesSlug);
    const referenceCode = cleanText(
      sourcePost?.smiles_reference_code ||
        draft.referenceCode ||
        draft.reference_code ||
        draft.smilesReferenceCode,
    );

    const pathPrefix =
      table === "events" || draft.type === "event"
        ? "events"
        : table === "offers" || draft.type === "offer"
          ? "offers"
          : table === "venues" || draft.type === "venue"
            ? "venues"
            : "";

    const baseUrl = (
      cleanText(process.env.NEXT_PUBLIC_STOCKPORT_SMILEZ_URL) ||
      cleanText(process.env.NEXT_PUBLIC_STOCKPORT_SMILES_URL) ||
      "https://www.stockportsmilez.co.uk"
    ).replace(/\/+$/, "");
    const href = slug && pathPrefix
      ? `${baseUrl}/${pathPrefix}/${slug}`
      : "";

    return {
      table,
      slug,
      referenceCode,
      href,
    };
  };

  useEffect(() => {
    if (!post?.id || post?.smiles_status !== "sent") return;

    const smilesSentInfo = getSmilesSentInfo(post);
    if (smilesSentInfo.referenceCode) return;

    const table = cleanText(post?.smiles_table || smilesSentInfo.table);
    const draftId = cleanText(post?.smiles_draft_id);
    const itemType =
      table === "offers"
        ? "offer"
        : table === "events"
          ? "event"
          : "";

    if (!itemType || !draftId) return;

    let cancelled = false;

    const backfillSmilesReference = async () => {
      try {
        const response = await fetch("/api/smiles/reference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemType,
            itemId: draftId,
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result?.ok === false || result?.success === false) {
          return;
        }

        const referenceCode = cleanText(result?.reference_code);
        const slug = cleanText(result?.smilesSlug || result?.slug);
        if (!referenceCode || cancelled) return;

        const nextDraft = {
          ...(getSmilesDraft(post) || {}),
          table,
          slug: slug || getSmilesDraft(post)?.slug || getSmilesDraft(post)?.smilesSlug || "",
          referenceCode,
          reference_code: referenceCode,
        };

        await supabase
          .from("campaign_posts")
          .update({
            smiles_draft: nextDraft,
            updated_at: new Date().toISOString(),
          })
          .eq("id", post.id);

        if (!cancelled) {
          setPost({
            ...post,
            smiles_draft: nextDraft,
          });
        }
      } catch {
        // Reference display should not block reviewing the post.
      }
    };

    backfillSmilesReference();

    return () => {
      cancelled = true;
    };
  }, [post?.id, post?.smiles_status, post?.smiles_draft_id, post?.smiles_table]);

  const getOfferPriceText = () => {
    const label = cleanText(smilesPricingLabel);
    const value = cleanText(smilesPriceValue || smilesOfferText);

    if (label === "Free") return "Free";
    if (label === "Ask venue") return "Ask venue";
    if (label === "Price to be confirmed") return "Price to be confirmed";
    if (!value) return label;
    if (label === "From price") return `From ${value}`;
    if (label === "Fixed price") return value;
    return value;
  };

  const getEventTicketText = () => {
    const label = cleanText(smilesTicketType);
    const value = cleanText(smilesTicketPrice);

    if (label === "Free entry") return "Free entry";
    if (label === "Price to be confirmed") return "Ticket details TBC";
    if (!value) return label;
    if (label === "From price") return `From ${value}`;
    return `${label}: ${value}`;
  };

  const buildClientSmilesDraft = () => {
    if (smilesChoice === "no") return null;

    const savedDraft = getSmilesDraft(post);
    const savedDraftId = cleanText(
      savedDraft?.id ||
        savedDraft?.smilesDraftId ||
        savedDraft?.smiles_draft_id ||
        post?.smiles_draft_id,
    );
    const savedTable =
      smilesChoice === "venue"
        ? "venues"
        : smilesChoice === "offer"
          ? "offers"
          : "events";
    const baseTitle =
      cleanText(smilesTitle) ||
      (smilesChoice === "venue"
        ? cleanText(smilesLocationName) ||
          cleanText(post?.business_name) ||
          cleanText(post?.title) ||
          "Local venue"
        : smilesChoice === "offer"
          ? cleanText(smilesOfferText) ||
            cleanText(post?.title) ||
            "Special offer"
          : cleanText(smilesEventText) ||
            cleanText(post?.title) ||
            cleanText(caption).split(".")[0] ||
            "Local event");
    const description = cleanText(smilesDescription) || cleanText(caption);
    const shortDescription =
      cleanText(smilesShortDescription) || description.slice(0, 180);
    const offerPriceText = getOfferPriceText();
    const ticketText = getEventTicketText();

    return {
      ...(savedDraft || {}),
      id: savedDraftId || savedDraft?.id || null,
      smilesDraftId: savedDraftId || savedDraft?.smilesDraftId || null,
      smiles_draft_id: savedDraftId || savedDraft?.smiles_draft_id || null,
      smilesOfferId:
        smilesChoice === "offer"
          ? savedDraftId || savedDraft?.smilesOfferId || null
          : "",
      smiles_offer_id:
        smilesChoice === "offer"
          ? savedDraftId || savedDraft?.smiles_offer_id || null
          : "",
      smilesEventId:
        smilesChoice === "event"
          ? savedDraftId || savedDraft?.smilesEventId || null
          : "",
      smiles_event_id:
        smilesChoice === "event"
          ? savedDraftId || savedDraft?.smiles_event_id || null
          : "",
      table: savedTable,
      smilesTable: savedTable,
      smiles_table: savedTable,
      recommended: true,
      type: smilesChoice,
      title: baseTitle,
      description,
      shortDescription,
      short_description: shortDescription,
      savingText:
        smilesChoice === "offer"
          ? cleanText(smilesOfferText || offerPriceText)
          : "",
      pricingLabel:
        smilesChoice === "offer" ? cleanText(smilesPricingLabel) : "",
      pricing_label:
        smilesChoice === "offer" ? cleanText(smilesPricingLabel) : "",
      priceValue:
        smilesChoice === "offer" ? cleanText(smilesPriceValue) : "",
      price_value:
        smilesChoice === "offer" ? cleanText(smilesPriceValue) : "",
      ticketType:
        smilesChoice === "event" ? cleanText(smilesTicketType) : "",
      ticket_type:
        smilesChoice === "event" ? cleanText(smilesTicketType) : "",
      ticketPrice:
        smilesChoice === "event" ? cleanText(smilesTicketPrice) : "",
      ticket_price:
        smilesChoice === "event" ? cleanText(smilesTicketPrice) : "",
      terms:
        smilesChoice === "offer"
          ? cleanText(smilesTerms) || "Subject to availability."
          : cleanText(smilesTerms),
      validDays:
        smilesChoice === "offer" ? cleanText(smilesValidDays) : "",
      valid_days:
        smilesChoice === "offer" ? cleanText(smilesValidDays) : "",
      validTimes:
        smilesChoice === "offer" ? cleanText(smilesValidTimes) : "",
      valid_times:
        smilesChoice === "offer" ? cleanText(smilesValidTimes) : "",
      startDate:
        smilesChoice === "offer"
          ? cleanText(smilesStartDate) || null
          : smilesChoice === "event"
            ? cleanText(smilesEventDate) || null
            : null,
      endDate:
        smilesChoice === "offer"
          ? cleanText(smilesEndDate) || null
          : smilesChoice === "event"
            ? cleanText(smilesEventEndDate || smilesEventDate) || null
            : null,
      startTime:
        smilesChoice === "event" ? cleanText(smilesStartTime) || null : null,
      endTime:
        smilesChoice === "event" ? cleanText(smilesEndTime) || null : null,
      priceText:
        smilesChoice === "offer"
          ? offerPriceText
          : smilesChoice === "event"
            ? ticketText
            : "",
      price_text:
        smilesChoice === "offer"
          ? offerPriceText
          : smilesChoice === "event"
            ? ticketText
            : "",
      locationName:
        cleanText(smilesLocationName) ||
        cleanText(post?.location_name || post?.business_name || ""),
      locationArea:
        cleanText(smilesLocationArea) ||
        cleanText(post?.location_area || post?.town || post?.city || ""),
      address: cleanText(smilesAddress) || cleanText(post?.address || ""),
      venueType: cleanText(smilesVenueType),
      venue_type: cleanText(smilesVenueType),
      websiteUrl:
        cleanText(smilesWebsiteUrl) || cleanText(post?.website_url || ""),
      website_url:
        cleanText(smilesWebsiteUrl) || cleanText(post?.website_url || ""),
      bookingUrl:
        smilesChoice === "event" || smilesChoice === "venue"
          ? cleanText(smilesBookingUrl)
          : "",
      booking_url:
        smilesChoice === "event" || smilesChoice === "venue"
          ? cleanText(smilesBookingUrl)
          : "",
    };
  };

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
    setMessage("Post approved. You can now publish, keep the scheduled time, or copy it manually.");
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

  const saveWordingSilently = async () => {
    if (!post?.id) return true;

    const cleanHashtags = hashtags
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    const updates = {
      caption,
      cta,
      hashtags: cleanHashtags,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not save the wording.");
      return false;
    }

    setPost({ ...post, ...updates });
    return true;
  };

  const showSmilesActionMessage = (
    value: string,
    tone: "info" | "success" | "error" = "info",
  ) => {
    setSmilesActionMessage(value);
    setSmilesActionTone(tone);
    setMessage(value);
  };

  const handleSmilesActionClick = () => {
    showSmilesActionMessage(
      post?.smiles_status === "sent" || Boolean(post?.smiles_draft_id)
        ? "Checking your linked Smilez listing..."
        : "Checking your Smilez draft...",
      "info",
    );

    void sendPostToSmiles();
  };

  const sendPostToSmiles = async () => {
    if (!post?.id) {
      showSmilesActionMessage("This post is still loading. Please wait a moment, then try again.", "error");
      return;
    }

    showSmilesActionMessage("Preparing your Smilez listing...", "info");

    const clientDraft = buildClientSmilesDraft();
    const savedDraft = getSmilesDraft(post);
    const draft = clientDraft || savedDraft;

    if (!draft || !draft.recommended || draft.type === "none") {
      showSmilesActionMessage("Choose Venue, Offer or Event before sending this to Smilez.", "error");
      return;
    }

    if (draft.type === "venue" && !cleanText(draft.title)) {
      showSmilesActionMessage("Add the venue name before updating Smilez.", "error");
      return;
    }

    if (draft.type === "offer" && !cleanText(draft.title)) {
      showSmilesActionMessage("Add the offer headline before updating Smilez.", "error");
      return;
    }

    if (!cleanText(draft.description)) {
      showSmilesActionMessage("Add a public description before updating Smilez.", "error");
      return;
    }

    if (cleanText(draft.shortDescription).length > 180) {
      showSmilesActionMessage("Keep the Smilez card summary to 180 characters or fewer.", "error");
      return;
    }

    if (draft.type === "venue") {
      if (!cleanText(draft.locationArea) && !cleanText(draft.address)) {
        showSmilesActionMessage(
          "Add the venue area or address before updating Smilez.",
          "error",
        );
        return;
      }

      if (!isValidHttpUrl(cleanText(draft.websiteUrl))) {
        showSmilesActionMessage(
          "Use a full website link beginning with http:// or https://.",
          "error",
        );
        return;
      }

      if (!isValidHttpUrl(cleanText(draft.bookingUrl))) {
        showSmilesActionMessage(
          "Use a full booking link beginning with http:// or https://.",
          "error",
        );
        return;
      }
    }

    if (draft.type === "offer") {
      const startDate = cleanText(draft.startDate);
      const endDate = cleanText(draft.endDate);

      if (startDate && endDate && endDate < startDate) {
        showSmilesActionMessage("The offer end date must be on or after its start date.", "error");
        return;
      }

      if (!cleanText(draft.priceText)) {
        showSmilesActionMessage("Add the offer price or saving before updating Smilez.", "error");
        return;
      }
    }

    if (draft.type === "event" && !cleanText(draft.startDate)) {
      showSmilesActionMessage("Add the event date before updating Smilez.", "error");
      return;
    }

    if (draft.type === "event") {
      const startDate = cleanText(draft.startDate);
      const endDate = cleanText(draft.endDate);
      const startTime = cleanText(draft.startTime);
      const endTime = cleanText(draft.endTime);

      if (startDate && endDate && endDate < startDate) {
        showSmilesActionMessage("The event end date must be on or after its start date.", "error");
        return;
      }

      if (
        startTime &&
        endTime &&
        (!endDate || endDate === startDate) &&
        endTime <= startTime
      ) {
        showSmilesActionMessage("The event end time must be later than its start time.", "error");
        return;
      }

      if (!isValidHttpUrl(cleanText(draft.bookingUrl))) {
        showSmilesActionMessage("Use a full booking link beginning with http:// or https://.", "error");
        return;
      }
    }

    const isUpdatingSmilesPost =
      post?.smiles_status === "sent" || Boolean(post?.smiles_draft_id);

    setSendingToSmilesPostId(post.id);
    showSmilesActionMessage(
      isUpdatingSmilesPost
        ? "Updating linked Smilez listing..."
        : "Publishing to Smilez...",
      "info",
    );

    try {
      await saveWordingSilently().catch(() => false);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch("/api/smiles/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          postId: post.id,
          campaignPostId: post.id,
          campaign_id: post.campaign_id,
          userId: post.user_id || null,
          user_id: post.user_id || null,
          smilesDraftId: draft.id || draft.smilesDraftId || draft.smiles_draft_id || post.smiles_draft_id || null,
          smiles_draft_id: draft.id || draft.smiles_draft_id || draft.smilesDraftId || post.smiles_draft_id || null,
          smilesOfferId: draft.type === "offer" ? draft.id || draft.smilesOfferId || draft.smiles_offer_id || post.smiles_draft_id || null : null,
          smiles_offer_id: draft.type === "offer" ? draft.id || draft.smiles_offer_id || draft.smilesOfferId || post.smiles_draft_id || null : null,
          smilesEventId: draft.type === "event" ? draft.id || draft.smilesEventId || draft.smiles_event_id || post.smiles_draft_id || null : null,
          smiles_event_id: draft.type === "event" ? draft.id || draft.smiles_event_id || draft.smilesEventId || post.smiles_draft_id || null : null,
          smilesTable:
            draft.type === "venue"
              ? "venues"
              : draft.type === "offer"
                ? "offers"
                : "events",
          smiles_table:
            draft.type === "venue"
              ? "venues"
              : draft.type === "offer"
                ? "offers"
                : "events",
          smilesReferenceCode:
            draft.referenceCode ||
            draft.reference_code ||
            draft.smilesReferenceCode ||
            post.smiles_reference_code ||
            null,
          smiles_reference_code:
            draft.reference_code ||
            draft.referenceCode ||
            draft.smilesReferenceCode ||
            post.smiles_reference_code ||
            null,
          draftType: draft.type,
          title: draft.title || post.title,
          description: draft.description || post.caption,
          shortDescription: draft.shortDescription || post.caption,
          savingText: draft.savingText || "",
          saving_text: draft.savingText || "",
          pricingLabel: draft.pricingLabel || draft.pricing_label || "",
          pricing_label: draft.pricingLabel || draft.pricing_label || "",
          priceValue: draft.priceValue || draft.price_value || "",
          price_value: draft.priceValue || draft.price_value || "",
          terms: draft.terms || "Subject to availability.",
          validDays: draft.validDays || "",
          validTimes: draft.validTimes || "",
          startDate: draft.startDate || null,
          endDate: draft.endDate || null,
          startTime: draft.startTime || null,
          endTime: draft.endTime || null,
          priceText: draft.priceText || "",
          price_text: draft.priceText || draft.price_text || "",
          ticketType: draft.ticketType || draft.ticket_type || "",
          ticket_type: draft.ticketType || draft.ticket_type || "",
          ticketPrice: draft.ticketPrice || draft.ticket_price || "",
          ticket_price: draft.ticketPrice || draft.ticket_price || "",
          locationName: draft.locationName || "",
          locationArea: draft.locationArea || "",
          address: draft.address || "",
          venueType: draft.venueType || "",
          websiteUrl: draft.websiteUrl || "",
          bookingUrl: draft.bookingUrl || "",
          mediaUrl: post.media_url || null,
          media_url: post.media_url || null,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.ok === false || result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Could not publish this item to Smilez.",
        );
      }

      const updates = {
        smiles_status: "sent",
        smiles_draft_id: result?.smilesDraftId || post?.smiles_draft_id || draft.id || null,
        smiles_table: result?.smilesTable || post?.smiles_table || draft.table || null,
        smiles_draft: {
          ...draft,
          table: result?.smilesTable || post?.smiles_table || draft.table || null,
          slug: result?.smilesSlug || draft.slug || draft.smilesSlug || null,
          referenceCode: result?.smilesReferenceCode || null,
          reference_code: result?.smilesReferenceCode || null,
        },
        smiles_sent_at: new Date().toISOString(),
        smiles_error: null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", post.id);

      if (error) throw error;

      setPost({ ...post, ...updates });
      showSmilesActionMessage(
        isUpdatingSmilesPost
          ? "Linked Smilez listing updated successfully."
          : "Published to Smilez successfully.",
        "success",
      );
    } catch (error: any) {
      const message =
        error?.message || "Could not publish this item to Smilez.";

      const updates = {
        smiles_status: "failed",
        smiles_error: message,
        updated_at: new Date().toISOString(),
      };

      await supabase.from("campaign_posts").update(updates).eq("id", post.id);
      setPost({ ...post, ...updates });
      showSmilesActionMessage(message, "error");
    } finally {
      setSendingToSmilesPostId(null);
    }
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
    setMessage("Autoscheduled. Returning to your posts...");
    setSavingSchedule(false);
    router.push("/posts");
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

  const autopublishNow = async (targetPlatform?: "Facebook" | "Instagram" | unknown) => {
    if (!post?.id) return;

    const saved = await saveWordingSilently();
    if (!saved) return;

    const requestedPlatform =
      targetPlatform === "Facebook" || targetPlatform === "Instagram"
        ? targetPlatform
        : null;
    const publishPlatform = requestedPlatform || autopublishPlatformLabel;
    const targetIsInstagram = publishPlatform === "Instagram";
    const targetIsFacebook = publishPlatform === "Facebook";

    if (!targetIsFacebook && !targetIsInstagram) {
      setMessage(
        "Direct posting is only available for connected Facebook and Instagram business accounts.",
      );
      return;
    }

    if (targetIsInstagram && !mediaUrl) {
      setMessage("Instagram needs an image or video attached.");
      return;
    }

    if (targetIsInstagram && isFlyer) {
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

      const endpoint = targetIsInstagram
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
          platform: publishPlatform,
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
          message || `Could not post to ${publishPlatform}.`,
        );
      }

      const nextPublishedTo = mergePublishedPlatform(post?.published_to, publishPlatform);
      const publishUpdates = {
        is_posted: true,
        status: "posted",
        publish_status: "published",
        published_to: nextPublishedTo,
        approval_status: "posted",
        approved_at: post?.approved_at || new Date().toISOString(),
        publish_error: null,
        updated_at: new Date().toISOString(),
      };

      const { error: publishSaveError } = await supabase
        .from("campaign_posts")
        .update(publishUpdates)
        .eq("id", post.id);

      if (publishSaveError) {
        throw new Error(
          publishSaveError.message ||
            `Posted to ${publishPlatform}, but the saved status could not be updated.`,
        );
      }

      setPost({
        ...post,
        ...publishUpdates,
      });
      setLastPublishedPlatform(publishPlatform);
      setMessage(`Published to ${publishPlatform}.`);
    } catch (error: any) {
      setMessage(
        error?.message ||
          `Could not post to ${publishPlatform}.`,
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
Do not return the same caption.

Opening-line quality rules:
- The first sentence must be specific, natural and immediately useful. Lead with the strongest real detail from the current post, uploaded media, offer, event, service, product, result or customer benefit.
- Never start with vague lifestyle marketing or generic AI copy.
- Do not use openings such as "Elevate your...", "Elevate your evenings...", "Discover...", "Experience...", "Transform...", "Unlock...", "Step into...", "Looking for...", "Treat yourself..." or similar stock phrases.
- Avoid generic filler such as "perfect for", "whether you're", "something for everyone", "unforgettable", "ultimate", "vibrant", "stunning" or "amazing" unless the supplied content genuinely supports it.
- For bars, restaurants, hospitality and events, open with the actual reason to visit: the food, drinks, offer, event, atmosphere, date, entertainment or booking opportunity that is genuinely present in the source content.
- Prefer a strong concrete hook over a polished slogan. It should sound like a real local business wrote it, not an advertising template.
- Do not invent prices, dates, offers, ingredients, products, services, claims or event details that are not in the current post or supplied source material.`,
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

  const publishSelected = async () => {
    if (publishingSelected) return;

    const facebookNeeded = publishToFacebook && !facebookPublished;
    const instagramNeeded = publishToInstagram && !instagramPublished;
    const smilezNeeded =
      publishToSmilez &&
      post?.smiles_status !== "sent" &&
      smilesChoice !== "no";

    if (!facebookNeeded && !instagramNeeded && !smilezNeeded) {
      setMessage("Choose at least one destination that has not already been published.");
      return;
    }

    setPublishingSelected(true);

    try {
      if (facebookNeeded) {
        await autopublishNow("Facebook");
      }

      if (instagramNeeded) {
        await autopublishNow("Instagram");
      }

      if (smilezNeeded) {
        await sendPostToSmiles();
      }
    } finally {
      setPublishingSelected(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!post) {
    return (
      <main className="fromone-post-review-page app-page" data-review-page="shared-posts-design-v1">

        <section className="pr2-loading">
          <h1>Post not found</h1>
          <p>{message || "This post could not be loaded."}</p>
          <button
            type="button"
            className="app-button app-button-primary pr2-btn pr2-btn-primary"
            onClick={() => router.push("/posts")}
          >
            Back to posts
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="fromone-post-review-page app-page" data-review-page="publishing-only-v1">
      <section className="app-page-stack">
        <div className="app-card app-toolbar">
          <button
            type="button"
            className="app-button app-button-secondary"
            onClick={() => router.push("/posts")}
          >
            ← Back to posts
          </button>
        </div>

        {message && <div className="app-card app-section">{message}</div>}

        <header className="app-page-header">
          <span className="app-page-eyebrow">Publish post</span>
          <h1 className="app-page-title">Ready to publish.</h1>
          <p className="app-page-description">
            Check the wording, choose the destinations, then publish once.
          </p>
        </header>

        <section className="app-card app-section publish-only-preview">
          <div className="publish-only-media">
            {preparedDisplayMedia?.url ? (
              <img
                src={preparedDisplayMedia.url}
                alt={cleanText(post?.title || "Post media")}
              />
            ) : mediaUrl && isVideo ? (
              <video src={mediaUrl} controls playsInline />
            ) : mediaUrl && isFlyer ? (
              <PdfFirstPagePreview url={mediaUrl} />
            ) : mediaUrl ? (
              <img src={mediaUrl} alt={cleanText(post?.title || "Post media")} />
            ) : (
              <div className="publish-only-empty">No media attached</div>
            )}
          </div>

          <div className="publish-only-copy">
            <span className="app-page-eyebrow">Edit post</span>
            <h2>{cleanText(post?.title) || "Social media post"}</h2>
            <p>Edit only if you want to.</p>

            <div className="app-form-stack publish-only-edit-form">
              <label>
                <strong>Caption</strong>
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Write the main post caption"
                />
              </label>

              <label>
                <strong>Call to action</strong>
                <input
                  value={cta}
                  onChange={(event) => setCta(event.target.value)}
                  placeholder="Tell customers what to do next"
                />
              </label>

              <label>
                <strong>Hashtags</strong>
                <textarea
                  className="publish-only-hashtags-field"
                  value={hashtags}
                  onChange={(event) => setHashtags(event.target.value)}
                  placeholder="#YourBusiness #YourLocation"
                />
              </label>

              <div className="publish-only-edit-actions">
                <button
                  type="button"
                  className="app-button app-button-primary"
                  onClick={saveWording}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>

                <button
                  type="button"
                  className="app-button app-button-secondary"
                  onClick={() => quickImprove("different_version")}
                  disabled={Boolean(rewriting)}
                >
                  {rewriting ? "Rewriting..." : "Rewrite caption"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="app-card app-section publish-pill-section">
          <div className="publish-pill-header">
            <div>
              <span className="app-page-eyebrow">Publish</span>
              <h2>Publish to</h2>
              <p>Choose where this post should go.</p>
            </div>

          </div>

          <div className="publish-pill-list" aria-label="Publishing channels">
            <label className={`publish-channel-pill ${publishToFacebook || facebookPublished ? "is-selected" : ""}`}>
              <input
                type="checkbox"
                checked={facebookPublished ? true : publishToFacebook}
                onChange={(event) => setPublishToFacebook(event.target.checked)}
                disabled={facebookPublished}
              />
              <span className="publish-channel-pill-tick">✓</span>
              <strong>Facebook</strong>
            </label>

            <label className={`publish-channel-pill ${publishToInstagram || instagramPublished ? "is-selected" : ""}`}>
              <input
                type="checkbox"
                checked={instagramPublished ? true : publishToInstagram}
                onChange={(event) => setPublishToInstagram(event.target.checked)}
                disabled={instagramPublished}
              />
              <span className="publish-channel-pill-tick">✓</span>
              <strong>Instagram</strong>
            </label>

            <label className={`publish-channel-pill ${publishToSmilez || post?.smiles_status === "sent" ? "is-selected" : ""}`}>
              <input
                type="checkbox"
                checked={post?.smiles_status === "sent" ? true : publishToSmilez}
                disabled={post?.smiles_status === "sent"}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setPublishToSmilez(checked);

                  if (checked && smilesChoice === "no") {
                    handleSmilesChoiceChange(detectSmilezType(post, caption));
                  }

                  if (!checked) {
                    handleSmilesChoiceChange("no");
                    setShowSmilezDetails(false);
                  }
                }}
              />
              <span className="publish-channel-pill-tick">✓</span>
              <strong>Smilez</strong>
            </label>
          </div>

          <button
            type="button"
            className="app-button app-button-primary publish-pill-primary publish-pill-primary-bottom"
            onClick={publishSelected}
            disabled={
              publishingSelected ||
              autoPublishing ||
              saving ||
              Boolean(sendingToSmilesPostId)
            }
          >
            {publishingSelected || autoPublishing || Boolean(sendingToSmilesPostId)
              ? "Publishing..."
              : "Publish now"}
          </button>

          {(publishToSmilez || post?.smiles_status === "sent") ? (
            <div className="publish-pill-smilez-row">
              <div>
                <strong>
                  {post?.smiles_status === "sent"
                    ? "Smilez"
                    : `Smilez: ${
                        smilesChoice === "offer"
                          ? "Offer"
                          : smilesChoice === "event"
                            ? "Event"
                            : "Venue update"
                      }`}
                </strong>
                <span>
                  {post?.smiles_status === "sent"
                    ? `${cleanText(smilesTitle) || "Published listing"} · Live`
                    : "FromOne detected the listing type automatically."}
                </span>
              </div>

              <div className="publish-pill-smilez-actions">
                {post?.smiles_status !== "sent" ? (
                  <select
                    value={smilesChoice === "no" ? "venue" : smilesChoice}
                    onChange={(event) =>
                      handleSmilesChoiceChange(
                        event.target.value as "venue" | "offer" | "event",
                      )
                    }
                    aria-label="Smilez type"
                  >
                    <option value="venue">Venue update</option>
                    <option value="offer">Offer</option>
                    <option value="event">Event</option>
                  </select>
                ) : null}

                <button
                  type="button"
                  className="publish-pill-link"
                  onClick={() => setShowSmilezDetails((current) => !current)}
                >
                  {showSmilezDetails
                    ? "Close"
                    : post?.smiles_status === "sent"
                      ? "Edit"
                      : "Details"}
                </button>

                {post?.smiles_status === "sent" && getSmilesSentInfo(post).href ? (
                  <a
                    className="publish-pill-link"
                    href={getSmilesSentInfo(post).href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View live
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {showSmilezDetails ? (
            <div className="publish-pill-details">
              <label>
                <span>Title</span>
                <input
                  value={smilesTitle}
                  onChange={(event) => setSmilesTitle(event.target.value)}
                />
              </label>

              <label className="publish-pill-wide">
                <span>Description</span>
                <textarea
                  value={smilesDescription}
                  onChange={(event) => setSmilesDescription(event.target.value)}
                  rows={3}
                />
              </label>

              {smilesChoice === "offer" ? (
                <>
                  <label>
                    <span>Price / saving</span>
                    <input
                      value={smilesPriceValue}
                      onChange={(event) => setSmilesPriceValue(event.target.value)}
                      placeholder="e.g. 2 for 1"
                    />
                  </label>
                  <label>
                    <span>Valid days</span>
                    <input
                      value={smilesValidDays}
                      onChange={(event) => setSmilesValidDays(event.target.value)}
                      placeholder="e.g. Thursday–Saturday"
                    />
                  </label>
                  <label>
                    <span>Valid times</span>
                    <input
                      value={smilesValidTimes}
                      onChange={(event) => setSmilesValidTimes(event.target.value)}
                      placeholder="e.g. 5PM–8PM"
                    />
                  </label>
                </>
              ) : null}

              {smilesChoice === "event" ? (
                <>
                  <label>
                    <span>Date</span>
                    <input
                      type="date"
                      value={smilesEventDate}
                      onChange={(event) => setSmilesEventDate(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Start time</span>
                    <input
                      type="time"
                      value={smilesStartTime}
                      onChange={(event) => setSmilesStartTime(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Ticket price</span>
                    <input
                      value={smilesTicketPrice}
                      onChange={(event) => setSmilesTicketPrice(event.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                </>
              ) : null}

              {smilesChoice === "venue" ? (
                <>
                  <label>
                    <span>Venue type</span>
                    <input
                      value={smilesVenueType}
                      onChange={(event) => setSmilesVenueType(event.target.value)}
                      placeholder="Bar, restaurant, salon..."
                    />
                  </label>
                  <label>
                    <span>Location</span>
                    <input
                      value={smilesLocationArea}
                      onChange={(event) => setSmilesLocationArea(event.target.value)}
                      placeholder="Stockport"
                    />
                  </label>
                </>
              ) : null}

              {post?.smiles_status === "sent" ? (
                <button
                  type="button"
                  className="app-button app-button-primary publish-pill-wide"
                  onClick={handleSmilesActionClick}
                  disabled={Boolean(sendingToSmilesPostId)}
                >
                  {sendingToSmilesPostId ? "Updating..." : "Update Smilez listing"}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </section>

      <style jsx global>{`
        /* Review page: mobile-first clean white canvas. */
        html,
        body:has(.fromone-post-review-page),
        body:has(.fromone-post-review-page) .app-shell,
        body:has(.fromone-post-review-page) .main-content,
        body:has(.fromone-post-review-page) .main-content.fromone-mobile-bottom-safe,
        body:has(.fromone-post-review-page) .fromone-universal-mobile-page-frame,
        body:has(.fromone-post-review-page) #fromone-standard-shell,
        .fromone-post-review-page,
        .fromone-post-review-page.app-page,
        .fromone-post-review-page .app-page-stack {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
        }

        body:has(.fromone-post-review-page)::before,
        body:has(.fromone-post-review-page)::after,
        body:has(.fromone-post-review-page) .app-shell::before,
        body:has(.fromone-post-review-page) .app-shell::after,
        body:has(.fromone-post-review-page) .main-content::before,
        body:has(.fromone-post-review-page) .main-content::after,
        body:has(.fromone-post-review-page) .fromone-universal-mobile-page-frame::before,
        body:has(.fromone-post-review-page) .fromone-universal-mobile-page-frame::after,
        .fromone-post-review-page::before,
        .fromone-post-review-page::after {
          display: none !important;
          content: none !important;
          background: none !important;
          background-image: none !important;
        }

        body:has(.fromone-post-review-page) .main-content {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }

        .fromone-post-review-page .app-page-stack {
          width: 100% !important;
          max-width: 100% !important;
          gap: 18px !important;
        }

        .fromone-post-review-page .app-toolbar {
          padding: 0 !important;
          border: 0 !important;
          box-shadow: none !important;
          background: transparent !important;
        }

        .fromone-post-review-page .app-page-header {
          padding: 0 2px !important;
        }

        .fromone-post-review-page .app-page-title {
          font-size: clamp(2rem, 10vw, 3rem) !important;
          line-height: 0.98 !important;
        }

        .publish-only-preview {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 16px !important;
          padding: 16px !important;
          border-radius: 18px !important;
        }

        .publish-only-media {
          width: 100% !important;
          min-height: 0 !important;
          aspect-ratio: 4 / 5;
          border-radius: 14px !important;
          overflow: hidden;
        }

        .publish-only-media img,
        .publish-only-media video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        .publish-only-copy h2 {
          font-size: 1.3rem !important;
        }

        .publish-only-edit-actions {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 9px !important;
        }

        .publish-only-edit-actions .app-button {
          width: 100% !important;
          min-height: 46px !important;
        }

        .publish-pill-section {
          display: grid;
          gap: 14px;
          padding: 16px !important;
          border: 1px solid rgba(7, 27, 73, 0.08) !important;
          border-radius: 18px !important;
          background: #ffffff !important;
          box-shadow: none !important;
        }

        .publish-pill-header {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          align-items: stretch;
        }

        .publish-pill-header h2 {
          margin: 3px 0 3px;
          color: #071b49;
          font-size: 1.12rem;
          line-height: 1.2;
        }

        .publish-pill-header p {
          margin: 0;
          color: #758096;
          font-size: 0.8rem;
        }

        .publish-pill-primary {
          width: 100% !important;
          min-height: 46px;
          border-radius: 12px !important;
          box-shadow: none !important;
        }

        .publish-pill-primary-bottom {
          margin-top: 2px;
        }

        .publish-pill-list {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .publish-channel-pill {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 40px;
          padding: 0 14px;
          border: 1px solid rgba(7, 27, 73, 0.13);
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          cursor: pointer;
          box-sizing: border-box;
          flex: 1 1 calc(50% - 4px);
          min-width: 0;
        }

        .publish-channel-pill:last-child {
          flex-basis: 100%;
        }

        .publish-channel-pill input {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          margin: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        .publish-channel-pill strong {
          color: inherit;
          font-size: 0.82rem;
          font-weight: 850;
          text-transform: none;
          white-space: nowrap;
        }

        .publish-channel-pill-tick {
          display: none;
          width: 17px;
          height: 17px;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #f72585;
          color: #ffffff;
          font-size: 0.68rem;
          font-weight: 950;
          line-height: 1;
        }

        .publish-channel-pill.is-selected {
          border-color: rgba(247, 37, 133, 0.42);
          background: rgba(247, 37, 133, 0.045);
        }

        .publish-channel-pill.is-selected .publish-channel-pill-tick {
          display: inline-flex;
        }

        .publish-pill-smilez-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          padding-top: 9px;
          border-top: 1px solid rgba(7, 27, 73, 0.06);
        }

        .publish-pill-smilez-row > div:first-child {
          display: grid;
          gap: 2px;
        }

        .publish-pill-smilez-row strong {
          color: #071b49;
          font-size: 0.82rem;
        }

        .publish-pill-smilez-row span {
          color: #7a8497;
          font-size: 0.74rem;
        }

        .publish-pill-smilez-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          align-items: stretch;
        }

        .publish-pill-smilez-actions select {
          grid-column: 1 / -1;
          width: 100%;
          min-height: 40px;
          padding: 7px 30px 7px 10px;
          border: 1px solid rgba(7, 27, 73, 0.1);
          border-radius: 10px;
          background: #ffffff;
          color: #071b49;
          font-size: 0.76rem;
          font-weight: 800;
        }

        .publish-pill-link {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(7, 27, 73, 0.09);
          border-radius: 10px;
          padding: 0 10px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
          font-size: 0.74rem;
          font-weight: 850;
          text-decoration: none;
          cursor: pointer;
        }

        .publish-pill-details {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          padding: 12px;
          border: 1px solid rgba(7, 27, 73, 0.07);
          border-radius: 12px;
          background: #fafbfc;
        }

        .publish-pill-details label {
          display: grid;
          gap: 5px;
        }

        .publish-pill-details label span {
          color: #59657a;
          font-size: 0.7rem;
          font-weight: 850;
        }

        .publish-pill-details input,
        .publish-pill-details textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(7, 27, 73, 0.09);
          border-radius: 9px;
          padding: 10px;
          background: #ffffff;
          color: #071b49;
          font: inherit;
        }

        .publish-pill-wide {
          grid-column: auto;
        }

        @media (min-width: 760px) {
          body:has(.fromone-post-review-page) .main-content {
            padding-left: clamp(24px, 4vw, 54px) !important;
            padding-right: clamp(24px, 4vw, 54px) !important;
          }

          .publish-only-preview {
            grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.1fr) !important;
            gap: 22px !important;
            padding: 20px !important;
          }

          .publish-only-media {
            aspect-ratio: auto;
            min-height: 360px !important;
          }

          .publish-only-edit-actions {
            grid-template-columns: 1fr 1fr !important;
          }

          .publish-pill-section {
            padding: 20px 22px !important;
          }

          .publish-pill-header {
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
          }

          .publish-pill-primary {
            width: auto !important;
            min-width: 158px;
          }

          .publish-channel-pill {
            flex: 0 0 auto;
            min-width: 128px;
          }

          .publish-channel-pill:last-child {
            flex-basis: auto;
          }

          .publish-pill-smilez-row {
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
          }

          .publish-pill-smilez-actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .publish-pill-smilez-actions select {
            grid-column: auto;
            width: auto;
            min-width: 142px;
          }

          .publish-pill-details {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            padding: 14px;
          }

          .publish-pill-wide {
            grid-column: 1 / -1;
          }
        }

        /* Remove any inherited cream/yellow tint from legacy Smilez/review containers. */
        .fromone-post-review-page .publish-only-smilez,
        .fromone-post-review-page .publish-only-status,
        .fromone-post-review-page .publish-only-smilez-fields,
        .fromone-post-review-page .publish-only-smilez-status-choice,
        .fromone-post-review-page .publish-pill-section,
        .fromone-post-review-page .publish-pill-smilez-row,
        .fromone-post-review-page .publish-pill-details,
        .fromone-post-review-page .app-card,
        .fromone-post-review-page .app-section {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
        }

        .fromone-post-review-page .publish-pill-link,
        .fromone-post-review-page .app-button-secondary {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
        }

        /* FINAL visual cleanup: remove the remaining cream/yellow glow completely. */
        html:has(.fromone-post-review-page),
        body:has(.fromone-post-review-page),
        body:has(.fromone-post-review-page) .app-shell,
        body:has(.fromone-post-review-page) .main-content,
        body:has(.fromone-post-review-page) .main-content.fromone-mobile-bottom-safe,
        body:has(.fromone-post-review-page) .fromone-universal-mobile-page-frame,
        body:has(.fromone-post-review-page) #fromone-standard-shell,
        body:has(.fromone-post-review-page) main,
        body:has(.fromone-post-review-page) section,
        .fromone-post-review-page,
        .fromone-post-review-page.app-page,
        .fromone-post-review-page .app-page-stack {
          background-color: #ffffff !important;
          background-image: none !important;
          filter: none !important;
        }

        .fromone-post-review-page .publish-pill-section,
        .fromone-post-review-page .publish-pill-smilez-row,
        .fromone-post-review-page .publish-pill-details,
        .fromone-post-review-page .publish-only-preview,
        .fromone-post-review-page .app-card,
        .fromone-post-review-page .app-section {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          filter: none !important;
        }

        .fromone-post-review-page .publish-pill-section {
          box-shadow: none !important;
        }

        .fromone-post-review-page .publish-pill-smilez-row {
          box-shadow: none !important;
        }

        body:has(.fromone-post-review-page) .app-shell::before,
        body:has(.fromone-post-review-page) .app-shell::after,
        body:has(.fromone-post-review-page) .main-content::before,
        body:has(.fromone-post-review-page) .main-content::after,
        body:has(.fromone-post-review-page) .fromone-universal-mobile-page-frame::before,
        body:has(.fromone-post-review-page) .fromone-universal-mobile-page-frame::after,
        body:has(.fromone-post-review-page) #fromone-standard-shell::before,
        body:has(.fromone-post-review-page) #fromone-standard-shell::after,
        .fromone-post-review-page::before,
        .fromone-post-review-page::after,
        .fromone-post-review-page .app-page-stack::before,
        .fromone-post-review-page .app-page-stack::after,
        .fromone-post-review-page .publish-pill-section::before,
        .fromone-post-review-page .publish-pill-section::after {
          content: none !important;
          display: none !important;
          background: none !important;
          background-image: none !important;
          box-shadow: none !important;
          filter: none !important;
        }

        /* FINAL REVIEW-PAGE BACKGROUND OVERRIDE — intentionally last. */
        html:has(.fromone-post-review-page),
        body:has(.fromone-post-review-page),
        body:has(.fromone-post-review-page) .app-shell,
        body:has(.fromone-post-review-page) .main-content,
        body:has(.fromone-post-review-page) .main-content.fromone-mobile-bottom-safe,
        body:has(.fromone-post-review-page) .fromone-universal-mobile-page-frame,
        body:has(.fromone-post-review-page) #fromone-standard-shell,
        body:has(.fromone-post-review-page) main,
        .fromone-post-review-page,
        .fromone-post-review-page.app-page,
        .fromone-post-review-page .app-page-stack {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
        }

        body:has(.fromone-post-review-page)::before,
        body:has(.fromone-post-review-page)::after,
        body:has(.fromone-post-review-page) .app-shell::before,
        body:has(.fromone-post-review-page) .app-shell::after,
        body:has(.fromone-post-review-page) .main-content::before,
        body:has(.fromone-post-review-page) .main-content::after,
        body:has(.fromone-post-review-page) .fromone-universal-mobile-page-frame::before,
        body:has(.fromone-post-review-page) .fromone-universal-mobile-page-frame::after,
        body:has(.fromone-post-review-page) #fromone-standard-shell::before,
        body:has(.fromone-post-review-page) #fromone-standard-shell::after {
          display: none !important;
          content: none !important;
          background: none !important;
          background-image: none !important;
        }
      `}</style>
    </main>
  );
}