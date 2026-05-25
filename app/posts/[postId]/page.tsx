"use client";

import "../posts.css";

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
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);


const reviewPageStyles = `
  .f1-review-page {
    min-height: 100vh;
    padding: 28px;
    background:
      radial-gradient(circle at 80% 0%, rgba(255, 212, 59, 0.08), transparent 30%),
      linear-gradient(180deg, #07111f 0%, #101827 100%);
    color: #f8fafc;
    box-sizing: border-box;
  }

  .f1-review-topbar,
  .f1-review-message,
  .f1-review-layout {
    width: min(1120px, 100%);
    max-width: 1120px;
    margin-left: auto;
    margin-right: auto;
  }

  .f1-review-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .f1-review-back,
  .f1-review-status-pill,
  .f1-review-card,
  .f1-review-side-card {
    border: 1px solid rgba(255, 255, 255, 0.11);
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.035));
    box-shadow: 0 20px 55px rgba(0, 0, 0, 0.2);
  }

  .f1-review-back {
    min-height: 44px;
    border-radius: 14px;
    color: #101420;
    background: #ffd43b;
    border-color: rgba(255, 212, 59, 0.55);
    font-weight: 950;
    padding: 0 16px;
    cursor: pointer;
  }

  .f1-review-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 999px;
  }

  .f1-review-status-pill span,
  .f1-review-card-title span,
  .f1-review-side-card span {
    color: #ffd43b;
    font-size: 0.76rem;
    font-weight: 950;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .f1-review-status-pill strong {
    color: #ffffff;
    font-size: 0.9rem;
  }

  .f1-review-message {
    width: fit-content;
    margin-bottom: 14px;
    padding: 9px 13px;
    border-radius: 999px;
    background: rgba(255, 212, 59, 0.13);
    border: 1px solid rgba(255, 212, 59, 0.26);
    color: #ffe58a;
    font-size: 0.86rem;
    font-weight: 950;
  }

  .f1-review-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 18px;
    align-items: start;
  }

  .f1-review-main {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  .f1-review-side {
    position: sticky;
    top: 22px;
  }

  .f1-review-card,
  .f1-review-side-card {
    border-radius: 24px;
    padding: 20px;
    box-sizing: border-box;
  }

  .f1-review-side-card {
    display: grid;
    gap: 6px;
  }

  .f1-review-card-title {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
  }

  .f1-review-card-title h1,
  .f1-review-card-title h2,
  .f1-review-side-card h2 {
    margin: 4px 0 0;
    color: #ffffff;
    line-height: 1.05;
    letter-spacing: -0.035em;
  }

  .f1-review-card-title h1,
  .f1-review-card-title h2 {
    font-size: clamp(1.45rem, 2.6vw, 2.1rem);
  }

  .f1-review-side-card h2 {
    font-size: 1.8rem;
  }

  .f1-review-side-card p {
    margin: 8px 0 4px;
    color: rgba(248, 250, 252, 0.72);
    line-height: 1.5;
  }

  .f1-review-media-frame {
    width: 100%;
    height: 340px;
    max-height: 340px;
    border-radius: 20px;
    overflow: hidden;
    background: rgba(2, 6, 23, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.09);
    display: grid;
    place-items: center;
    box-sizing: border-box;
  }

  .f1-review-media-frame img,
  .f1-review-media-frame video {
    width: 100%;
    height: 100%;
    max-height: 340px;
    object-fit: contain;
    display: block;
  }

  .f1-review-empty {
    padding: 24px;
    text-align: center;
  }

  .f1-review-empty strong {
    display: block;
    color: #ffffff;
    margin-bottom: 6px;
  }

  .f1-review-empty p {
    margin: 0;
    color: rgba(248, 250, 252, 0.7);
  }

  .f1-review-action-row,
  .f1-review-tool-row,
  .f1-review-side-options,
  .f1-review-publish-primary-actions {
    display: grid;
    gap: 10px;
  }

  .f1-review-action-row {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    margin-top: 12px;
  }

  .f1-review-tool-row {
    grid-template-columns: minmax(180px, 1fr) repeat(3, 88px);
    align-items: end;
  }

  .f1-review-publish-primary-actions {
    gap: 6px;
    width: 100%;
    margin-bottom: 0;
  }

  .f1-review-action-row button,
  .f1-review-action-row a,
  .f1-review-tool-row button,
  .f1-review-side-card button,
  .f1-review-improve-grid button,
  .f1-review-secondary,
  .f1-review-side-options button {
    min-height: 44px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
    font-weight: 950;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 14px;
    cursor: pointer;
    text-align: center;
    box-sizing: border-box;
  }

  .f1-review-primary {
    min-height: 44px;
    border-radius: 14px;
    border: 1px solid rgba(255, 212, 59, 0.42);
    background: #ffd43b;
    color: #101420;
    font-weight: 950;
    box-shadow: 0 16px 32px rgba(255, 212, 59, 0.14);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
  }

  .f1-review-action-row .is-danger {
    background: rgba(127, 29, 29, 0.18);
    border-color: rgba(248, 113, 113, 0.28);
    color: #fecaca;
  }

  .f1-review-prepared-strip {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    gap: 10px;
    align-items: center;
    margin-top: 12px;
    padding: 12px;
    border-radius: 16px;
    background: rgba(61, 220, 151, 0.1);
    border: 1px solid rgba(61, 220, 151, 0.22);
  }

  .f1-review-prepared-strip strong {
    color: #ffffff;
  }

  .f1-review-prepared-strip span {
    color: rgba(248, 250, 252, 0.7);
    font-weight: 900;
  }

  .f1-review-prepared-strip button {
    min-height: 38px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    font-weight: 900;
    padding: 0 12px;
  }

  .f1-review-prepare {
    display: grid;
    gap: 14px;
  }

  .f1-review-transform-stage {
    height: 430px;
    border-radius: 20px;
    background: rgba(2, 6, 23, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.09);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    padding: 22px;
    box-sizing: border-box;
  }

  .f1-review-frame {
    position: relative;
    width: auto;
    height: auto;
    max-width: 94%;
    max-height: 380px;
    border-radius: 18px;
    overflow: hidden;
    border: 2px solid rgba(255, 212, 59, 0.92);
    background: rgba(15, 23, 42, 0.9);
    cursor: grab;
  }

  .f1-review-frame-facebook-feed {
    width: min(94%, 660px);
    aspect-ratio: 1200 / 630;
  }

  .f1-review-frame-facebook-square,
  .f1-review-frame-instagram-square,
  .f1-review-frame-tiktok-square {
    width: min(84%, 360px);
    aspect-ratio: 1 / 1;
  }

  .f1-review-frame-instagram-portrait {
    width: min(78%, 300px);
    aspect-ratio: 4 / 5;
  }

  .f1-review-frame-facebook-story,
  .f1-review-frame-instagram-story,
  .f1-review-frame-tiktok-vertical {
    width: min(58%, 215px);
    aspect-ratio: 9 / 16;
  }

  .f1-review-frame img {
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
    transform-origin: center;
    transition: transform 80ms ease-out;
  }

  .f1-review-frame img.is-fill {
    object-fit: cover;
  }

  .f1-review-frame img.is-fit {
    object-fit: contain;
    background: rgba(2, 6, 23, 0.9);
  }

  .f1-review-frame-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(to right, transparent 33.1%, rgba(255,255,255,0.22) 33.2%, rgba(255,255,255,0.22) 33.6%, transparent 33.7%, transparent 66.1%, rgba(255,255,255,0.22) 66.2%, rgba(255,255,255,0.22) 66.6%, transparent 66.7%),
      linear-gradient(to bottom, transparent 33.1%, rgba(255,255,255,0.22) 33.2%, rgba(255,255,255,0.22) 33.6%, transparent 33.7%, transparent 66.1%, rgba(255,255,255,0.22) 66.2%, rgba(255,255,255,0.22) 66.6%, transparent 66.7%);
  }

  .f1-review-prepare-tools {
    display: grid;
    gap: 12px;
  }

  .f1-review-preset-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .f1-review-preset-row button {
    min-height: 58px;
    border-radius: 15px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.075);
    color: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.12);
    font-weight: 950;
    text-align: left;
    cursor: pointer;
  }

  .f1-review-preset-row button.is-active {
    background: rgba(255, 212, 59, 0.14);
    border-color: rgba(255, 212, 59, 0.42);
  }

  .f1-review-preset-row strong,
  .f1-review-preset-row small {
    display: block;
  }

  .f1-review-preset-row small {
    margin-top: 3px;
    color: rgba(248, 250, 252, 0.66);
    font-weight: 850;
  }

  .f1-review-tool-row label {
    display: grid;
    gap: 7px;
  }

  .f1-review-tool-row label span {
    color: rgba(248, 250, 252, 0.76);
    font-size: 0.85rem;
    font-weight: 900;
  }

  .f1-review-tool-row input[type="range"] {
    width: 100%;
    accent-color: #ffd43b;
  }

  .f1-review-wording {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 14px;
  }

  .f1-review-wording label,
  .f1-review-select-row label {
    display: grid;
    gap: 7px;
  }

  .f1-review-wording strong,
  .f1-review-select-row strong {
    color: #ffffff;
    font-size: 0.88rem;
  }

  .f1-review-wording textarea,
  .f1-review-wording input,
  .f1-review-select-row select {
    width: 100%;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: rgba(2, 6, 23, 0.76);
    color: #ffffff;
    font: inherit;
    padding: 12px 14px;
    box-sizing: border-box;
  }

  .f1-review-wording textarea {
    min-height: 180px;
    resize: vertical;
  }

  .f1-review-wording .is-caption {
    grid-row: span 2;
  }

  .f1-review-improve-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }

  .f1-review-select-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin: 12px 0;
  }

  .f1-review-options {
    width: 100%;
  }

  .f1-review-media-options {
    margin-top: 16px;
  }

  .f1-review-more-options {
    margin-top: 0;
  }

  .f1-review-options summary {
    width: 100%;
    min-height: 44px;
    border-radius: 13px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: rgba(255, 255, 255, 0.07);
    color: #f8fafc;
    font-weight: 950;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 14px;
    cursor: pointer;
    list-style: none;
    box-sizing: border-box;
  }

  .f1-review-options summary::-webkit-details-marker {
    display: none;
  }

  .f1-review-options summary::after {
    content: "▾";
    margin-left: 10px;
    color: #ffd43b;
    font-size: 0.8rem;
  }

  .f1-review-options[open] summary::after {
    content: "▴";
  }

  .f1-review-side-options {
    margin-top: 8px;
    gap: 8px;
  }

  .f1-review-side-options button,
  .f1-review-side-card button {
    width: 100%;
  }

  .f1-review-loading {
    max-width: 620px;
    margin: 120px auto;
    padding: 24px;
    border-radius: 24px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    text-align: center;
  }

  button:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
  }

  @media (max-width: 980px) {
    .f1-review-layout {
      grid-template-columns: 1fr;
    }

    .f1-review-side {
      position: static;
    }

    .f1-review-preset-row,
    .f1-review-improve-grid,
    .f1-review-select-row,
    .f1-review-action-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .f1-review-tool-row {
      grid-template-columns: 1fr repeat(3, 80px);
    }
  }

  @media (max-width: 680px) {
    .f1-review-page {
      padding: 14px 10px 28px;
    }

    .f1-review-topbar {
      align-items: stretch;
      flex-direction: column;
    }

    .f1-review-card,
    .f1-review-side-card {
      border-radius: 22px;
      padding: 16px;
    }

    .f1-review-card-title {
      flex-direction: column;
    }

    .f1-review-media-frame {
      height: 280px;
      max-height: 280px;
    }

    .f1-review-media-frame img,
    .f1-review-media-frame video {
      max-height: 280px;
    }

    .f1-review-transform-stage {
      height: 430px;
      padding: 16px;
    }

    .f1-review-frame-facebook-feed {
      width: min(96%, 360px);
    }

    .f1-review-frame-facebook-square,
    .f1-review-frame-instagram-square,
    .f1-review-frame-tiktok-square {
      width: min(86%, 320px);
    }

    .f1-review-frame-instagram-portrait {
      width: min(76%, 265px);
    }

    .f1-review-frame-facebook-story,
    .f1-review-frame-instagram-story,
    .f1-review-frame-tiktok-vertical {
      width: min(54%, 205px);
    }

    .f1-review-preset-row {
      display: flex;
      overflow-x: auto;
      padding-bottom: 6px;
      scroll-snap-type: x mandatory;
    }

    .f1-review-preset-row button {
      flex: 0 0 210px;
      scroll-snap-align: start;
    }

    .f1-review-improve-grid,
    .f1-review-select-row,
    .f1-review-action-row,
    .f1-review-tool-row,
    .f1-review-side-card,
    .f1-review-wording,
    .f1-review-prepared-strip {
      grid-template-columns: 1fr;
    }

    .f1-review-prepared-strip {
      align-items: stretch;
    }
  }
`;


type ResizePresetValue =
  | "instagram-square"
  | "instagram-portrait"
  | "facebook-feed"
  | "facebook-square"
  | "facebook-story"
  | "instagram-story"
  | "tiktok-vertical"
  | "tiktok-square";

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
  { value: "instagram-portrait", label: "Instagram portrait", size: "1080 × 1350", width: 1080, height: 1350 },
  { value: "instagram-square", label: "Instagram square", size: "1080 × 1080", width: 1080, height: 1080 },
  { value: "instagram-story", label: "Instagram story / reel", size: "1080 × 1920", width: 1080, height: 1920 },
  { value: "facebook-feed", label: "Facebook feed", size: "1200 × 630", width: 1200, height: 630 },
  { value: "facebook-square", label: "Facebook square", size: "1080 × 1080", width: 1080, height: 1080 },
  { value: "facebook-story", label: "Facebook story", size: "1080 × 1920", width: 1080, height: 1920 },
  { value: "tiktok-vertical", label: "TikTok vertical", size: "1080 × 1920", width: 1080, height: 1920 },
  { value: "tiktok-square", label: "TikTok square cover", size: "1080 × 1080", width: 1080, height: 1080 },
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
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
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
      ["instagram-portrait", "instagram-square", "instagram-story"].includes(preset.value),
    );
  }

  if (platform.includes("tiktok")) {
    return resizePresets.filter((preset) =>
      ["tiktok-vertical", "tiktok-square"].includes(preset.value),
    );
  }

  return resizePresets.filter((preset) =>
    ["facebook-feed", "facebook-square", "facebook-story"].includes(preset.value),
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

async function urlToFile(url: string, filename: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load the prepared image for sharing.");
  }

  const blob = await response.blob();
  const type = blob.type || "image/jpeg";
  const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";

  return new File([blob], `${filename}.${extension}`, { type });
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
  const [activePanel, setActivePanel] = useState<"review" | "prepare" | "improve">("review");

  const [resizePresetValue, setResizePresetValue] = useState<ResizePresetValue>("facebook-feed");
  const [prepareFitMode, setPrepareFitMode] = useState<"fill" | "fit">("fill");
  const [mediaZoom, setMediaZoom] = useState(1);
  const [mediaOffset, setMediaOffset] = useState<MediaOffset>({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizingMedia, setResizingMedia] = useState(false);
  const [sharingMedia, setSharingMedia] = useState(false);
  const [autoPublishing, setAutoPublishing] = useState(false);
  const [preparedMedia, setPreparedMedia] = useState<PreparedMedia | null>(null);

  const [rewriting, setRewriting] = useState("");
  const [audienceTarget, setAudienceTarget] = useState("Small business owners");
  const [reachTarget, setReachTarget] = useState("Local customers");
  const [toneTarget, setToneTarget] = useState("Use current tone");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activePointersRef = useRef<Map<number, ActivePointer>>(new Map());
  const pinchStateRef = useRef<PinchState | null>(null);

  const platformName = normalisePlatform(post?.platform);
  const recommendedPresets = useMemo(() => getRecommendedPresets(platformName), [platformName]);
  const selectedPreset =
    recommendedPresets.find((preset) => preset.value === resizePresetValue) ||
    recommendedPresets[0] ||
    resizePresets[0];

  const mediaUrl = cleanText(post?.media_url);
  const mediaType = cleanText(post?.media_type).toLowerCase();
  const isVideo = mediaType === "video";
  const isFlyer = mediaType === "flyer" || mediaType === "pdf" || mediaUrl.toLowerCase().includes(".pdf");
  const canPrepareImage = Boolean(mediaUrl) && !isVideo && !isFlyer;

  const isFacebookPost = platformName.toLowerCase().includes("facebook");
  const isInstagramPost = platformName.toLowerCase().includes("instagram");
  const canAutopublish = isFacebookPost || isInstagramPost;
  const autopublishPlatformLabel = isInstagramPost ? "Instagram" : "Facebook";

  const isPosted =
    Boolean(post?.is_posted) ||
    cleanText(post?.status).toLowerCase() === "posted" ||
    cleanText(post?.publish_status).toLowerCase() === "posted";

  const fullCaption = useMemo(() => {
    return [caption, cta, hashtags].map(cleanText).filter(Boolean).join("\n\n");
  }, [caption, cta, hashtags]);

  const transformStyle = useMemo(() => {
    return {
      transform: `translate(${mediaOffset.x}px, ${mediaOffset.y}px) scale(${mediaZoom})`,
    };
  }, [mediaOffset, mediaZoom]);

  const frameClassName = `f1-review-frame f1-review-frame-${resizePresetValue}`;

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
    setCaption(cleanText(data.caption));
    setCta(cleanText(data.cta));
    setHashtags(Array.isArray(data.hashtags) ? data.hashtags.join(" ") : cleanText(data.hashtags));
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
      setMessage("Could not copy automatically. Please copy the caption manually.");
    }
  };

  const openPlatform = async () => {
    await copyCaption();
    window.open(getPlatformUrl(platformName), "_blank", "noopener,noreferrer");
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

    setPost({ ...post, is_posted: true, status: "posted", publish_status: "posted" });
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

    setPost({ ...post, is_posted: false, status: "ready", publish_status: "ready" });
    setMessage("Post set back to ready.");
    setSaving(false);
  };

  const handleUploadMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !post?.id) return;

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

      const { data: publicUrlData } = supabase.storage.from("campaign-assets").getPublicUrl(path);

      const nextMediaType = file.type.startsWith("video/")
        ? "video"
        : file.type.includes("pdf")
          ? "pdf"
          : "image";

      const { error: updateError } = await supabase
        .from("campaign_posts")
        .update({
          media_url: publicUrlData.publicUrl,
          media_type: nextMediaType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (updateError) throw updateError;

      setPost({ ...post, media_url: publicUrlData.publicUrl, media_type: nextMediaType });
      setPreparedMedia(null);
      setMessage("Media updated.");
    } catch (error: any) {
      setMessage(error?.message || "Could not upload media.");
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
      .update({ media_url: null, media_type: null, updated_at: new Date().toISOString() })
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not remove media.");
      setSaving(false);
      return;
    }

    setPost({ ...post, media_url: null, media_type: null });
    setPreparedMedia(null);
    setMessage("Media removed.");
    setSaving(false);
  };

  const downloadMedia = () => {
    if (!mediaUrl) return;

    const extension = isVideo ? "mp4" : isFlyer ? "pdf" : "jpg";
    triggerDownload(mediaUrl, `${getSafeFileName("fromone-post-media")}-original.${extension}`);
  };

  const resetTransform = () => {
    activePointersRef.current.clear();
    pinchStateRef.current = null;
    setDragState(null);
    setPrepareFitMode("fill");
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setPreparedMedia(null);
  };

  const fitFullImage = () => {
    activePointersRef.current.clear();
    pinchStateRef.current = null;
    setDragState(null);
    setPrepareFitMode("fit");
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setPreparedMedia(null);
  };

  const fillFrame = () => {
    activePointersRef.current.clear();
    pinchStateRef.current = null;
    setDragState(null);
    setPrepareFitMode("fill");
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setPreparedMedia(null);
  };

  const selectPreset = (value: ResizePresetValue) => {
    setResizePresetValue(value);
    resetTransform();
  };

  const startTransform = (event: PointerEvent<HTMLDivElement>) => {
    if (!canPrepareImage) return;

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

      setMediaZoom(clampNumber(Number((pinch.startZoom * (distance / pinch.startDistance)).toFixed(2)), 0.75, 3));
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
    setMediaZoom((current) => clampNumber(Number((current + direction).toFixed(2)), 0.75, 3));
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
          mode: "transform",
          fitMode: prepareFitMode,
          zoom: mediaZoom,
          offsetX: mediaOffset.x,
          offsetY: mediaOffset.y,
          outputWidth: selectedPreset.width,
          outputHeight: selectedPreset.height,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(result?.error || result?.message || "Could not prepare this image.");

      const url = result?.url || result?.publicUrl || result?.public_url;
      if (!url) throw new Error("Prepared image was created but no URL was returned.");

      setPreparedMedia({
        url,
        label: result?.label || selectedPreset.label,
        width: Number(result?.width || selectedPreset.width),
        height: Number(result?.height || selectedPreset.height),
      });
      setMessage("Prepared image created.");
    } catch (error: any) {
      setMessage(error?.message || "Could not prepare this image.");
    } finally {
      setResizingMedia(false);
    }
  };

  const downloadPreparedImage = () => {
    if (!preparedMedia?.url) return;

    triggerDownload(
      preparedMedia.url,
      `fromone-post-${preparedMedia.width}x${preparedMedia.height}.jpg`,
    );
  };

  const sharePreparedImage = async () => {
    if (!preparedMedia?.url) {
      setMessage("Create a prepared image first.");
      return;
    }

    setSharingMedia(true);
    await copyCaption();

    try {
      const file = await urlToFile(preparedMedia.url, "fromone-post");
      const nav = navigator as any;

      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ title: "FromOne post", text: fullCaption, files: [file] });
        setMessage("Share sheet opened.");
        return;
      }

      downloadPreparedImage();
      window.open(getPlatformUrl(platformName), "_blank", "noopener,noreferrer");
      setMessage("Sharing is not supported here. Prepared image downloaded and platform opened.");
    } catch {
      downloadPreparedImage();
      window.open(getPlatformUrl(platformName), "_blank", "noopener,noreferrer");
      setMessage("Sharing was not available. Prepared image downloaded and platform opened.");
    } finally {
      setSharingMedia(false);
    }
  };

  const autopublishNow = async () => {
    if (!post?.id) return;

    if (!canAutopublish) {
      setMessage("Autopublish is only available for connected Facebook and Instagram business accounts.");
      return;
    }

    if (isInstagramPost && !mediaUrl) {
      setMessage("Instagram autopublish needs an image or video attached.");
      return;
    }

    if (isInstagramPost && isFlyer) {
      setMessage("Instagram cannot autopublish a PDF or flyer file. Use Prepare media or manual posting.");
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
      const endpoint = isInstagramPost ? "/api/instagram/publish" : "/api/facebook/publish";
      const publishMediaUrl = preparedMedia?.url || mediaUrl;
      const publishMediaType = preparedMedia?.url ? "image" : mediaType;

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
          setMessage("Autopublish needs attention. Reconnect Facebook/Instagram in Settings, or use manual posting.");
          return;
        }

        throw new Error(message || `Could not autopublish to ${autopublishPlatformLabel}.`);
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
      setMessage(error?.message || `Could not autopublish to ${autopublishPlatformLabel}.`);
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

      if (!response.ok) throw new Error(result?.error || result?.message || "Could not improve this post.");

      const nextCaption = cleanText(result.caption || result.rewrittenCaption || result.post?.caption);
      const nextCta = cleanText(result.cta || result.rewrittenCta || result.post?.cta);
      const nextHashtags = Array.isArray(result.hashtags)
        ? result.hashtags.join(" ")
        : cleanText(result.hashtags || result.rewrittenHashtags || result.post?.hashtags);

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
      <main className="f1-review-page">
        <style dangerouslySetInnerHTML={{ __html: reviewPageStyles }} />
        <section className="f1-review-loading">Loading post...</section>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="f1-review-page">
        <style dangerouslySetInnerHTML={{ __html: reviewPageStyles }} />
        <section className="f1-review-loading">
          <h1>Post not found</h1>
          <p>{message || "This post could not be loaded."}</p>
          <button type="button" onClick={() => router.push("/posts")}>Back to posts</button>
        </section>
      </main>
    );
  }

  return (
    <main className="f1-review-page">
      <style dangerouslySetInnerHTML={{ __html: reviewPageStyles }} />
      <section className="f1-review-topbar">
        <button type="button" className="f1-review-back" onClick={() => router.push("/posts")}>
          ← Back to posts
        </button>

        <div className="f1-review-status-pill">
          <span>{platformName}</span>
          <strong>{isPosted ? "Posted" : "Ready"}</strong>
        </div>
      </section>

      {message && <div className="f1-review-message">{message}</div>}

      <section className="f1-review-layout">
        <section className="f1-review-main">
          <article className="f1-review-card">
            <div className="f1-review-card-title">
              <div>
                <span>Media</span>
                <h1>{activePanel === "prepare" ? "Prepare media" : "Review media"}</h1>
              </div>

              {canPrepareImage && activePanel !== "prepare" && (
                <button type="button" className="f1-review-primary" onClick={() => setActivePanel("prepare")}>
                  Prepare media
                </button>
              )}

              {activePanel === "prepare" && (
                <button type="button" className="f1-review-secondary" onClick={() => setActivePanel("review")}>
                  Done
                </button>
              )}
            </div>

            {activePanel === "prepare" && canPrepareImage ? (
              <div className="f1-review-prepare">
                <div
                  className="f1-review-transform-stage"
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
                      className={prepareFitMode === "fit" ? "is-fit" : "is-fill"}
                      style={transformStyle}
                    />
                    <span className="f1-review-frame-grid" />
                  </div>
                </div>

                <div className="f1-review-prepare-tools">
                  <div className="f1-review-preset-row">
                    {recommendedPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        className={resizePresetValue === preset.value ? "is-active" : ""}
                        onClick={() => selectPreset(preset.value)}
                      >
                        <strong>{preset.label}</strong>
                        <small>{preset.size}</small>
                      </button>
                    ))}
                  </div>

                  <div className="f1-review-tool-row">
                    <label>
                      <span>Zoom</span>
                      <input
                        type="range"
                        min="0.75"
                        max="3"
                        step="0.01"
                        value={mediaZoom}
                        onChange={(event) => {
                          setMediaZoom(Number(event.target.value));
                          setPreparedMedia(null);
                        }}
                      />
                    </label>

                    <button type="button" onClick={fitFullImage}>Fit</button>
                    <button type="button" onClick={fillFrame}>Fill</button>
                    <button type="button" onClick={resetTransform}>Reset</button>
                  </div>

                  <div className="f1-review-action-row">
                    <button type="button" className="f1-review-primary" onClick={createPreparedImage} disabled={resizingMedia}>
                      {resizingMedia ? "Creating..." : "Create prepared image"}
                    </button>

                    <button type="button" onClick={sharePreparedImage} disabled={!preparedMedia?.url || sharingMedia}>
                      {sharingMedia ? "Opening..." : "Share to social app"}
                    </button>

                    <button type="button" onClick={downloadPreparedImage} disabled={!preparedMedia?.url}>
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="f1-review-media-frame">
                  {mediaUrl ? (
                    isVideo ? (
                      <video src={mediaUrl} controls />
                    ) : isFlyer ? (
                      <div className="f1-review-empty">
                        <strong>PDF / flyer attached</strong>
                        <p>Open or download the file before posting.</p>
                      </div>
                    ) : (
                      <img src={mediaUrl} alt="Post media" />
                    )
                  ) : (
                    <div className="f1-review-empty">
                      <strong>No media attached</strong>
                      <p>Upload an image, flyer or video before posting.</p>
                    </div>
                  )}
                </div>

                <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf" hidden onChange={handleUploadMedia} />

                <details className="f1-review-options f1-review-media-options">
                  <summary>Media options</summary>

                  <div className="f1-review-action-row">
                    <button type="button" onClick={() => fileInputRef.current?.click()}>
                      Upload / replace
                    </button>

                    {mediaUrl && (
                      <>
                        <a href={mediaUrl} target="_blank" rel="noreferrer">View media</a>
                        <button type="button" onClick={downloadMedia}>Download</button>
                        <button type="button" className="is-danger" onClick={removeMedia}>Remove</button>
                      </>
                    )}
                  </div>
                </details>

                {preparedMedia?.url && (
                  <div className="f1-review-prepared-strip">
                    <strong>Prepared image ready</strong>
                    <span>{preparedMedia.width} × {preparedMedia.height}</span>
                    <button type="button" onClick={sharePreparedImage}>Share to social app</button>
                    <button type="button" onClick={downloadPreparedImage}>Download</button>
                  </div>
                )}
              </>
            )}
          </article>

          <article className="f1-review-card">
            <div className="f1-review-card-title">
              <div>
                <span>Wording</span>
                <h2>Check caption</h2>
              </div>
            </div>

            <div className="f1-review-wording">
              <label className="is-caption">
                <strong>Caption</strong>
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)} />
              </label>

              <label>
                <strong>CTA</strong>
                <input value={cta} onChange={(event) => setCta(event.target.value)} />
              </label>

              <label>
                <strong>Hashtags</strong>
                <input value={hashtags} onChange={(event) => setHashtags(event.target.value)} />
              </label>
            </div>

            <div className="f1-review-action-row">
              <button type="button" className="f1-review-primary" onClick={saveWording} disabled={saving}>
                {saving ? "Saving..." : "Save wording"}
              </button>
              <button type="button" onClick={copyCaption}>Copy caption</button>
              <button type="button" onClick={() => setActivePanel("improve")}>Improve wording</button>
            </div>
          </article>

          {activePanel === "improve" && (
            <article className="f1-review-card">
              <div className="f1-review-card-title">
                <div>
                  <span>Improve</span>
                  <h2>Make it stronger</h2>
                </div>

                <button type="button" className="f1-review-secondary" onClick={() => setActivePanel("review")}>
                  Done
                </button>
              </div>

              <div className="f1-review-improve-grid">
                {quickImproveActions.map((action) => (
                  <button
                    key={action.value}
                    type="button"
                    onClick={() => quickImprove(action.value)}
                    disabled={Boolean(rewriting)}
                  >
                    {rewriting === action.value ? "Improving..." : action.label}
                  </button>
                ))}
              </div>

              <div className="f1-review-select-row">
                <label>
                  <strong>Audience</strong>
                  <select value={audienceTarget} onChange={(event) => setAudienceTarget(event.target.value)}>
                    {audienceOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>

                <label>
                  <strong>Reach</strong>
                  <select value={reachTarget} onChange={(event) => setReachTarget(event.target.value)}>
                    {reachOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>

                <label>
                  <strong>Tone</strong>
                  <select value={toneTarget} onChange={(event) => setToneTarget(event.target.value)}>
                    {toneOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
              </div>

              <button
                type="button"
                className="f1-review-primary"
                onClick={() => quickImprove("audience_targeted")}
                disabled={Boolean(rewriting)}
              >
                {rewriting === "audience_targeted" ? "Improving..." : "Improve for selected audience"}
              </button>
            </article>
          )}
        </section>

        <aside className="f1-review-side">
          <article className="f1-review-side-card">
            <span>Publish</span>
            <h2>{platformName}</h2>
            <p>Copy the caption, add the media, then publish.</p>

            <div className="f1-review-publish-primary-actions">
              <button type="button" className="f1-review-primary" onClick={openPlatform}>
                Post manually
              </button>

              {preparedMedia?.url && (
                <button type="button" onClick={sharePreparedImage} disabled={sharingMedia}>
                  {sharingMedia ? "Opening..." : "Share to social app"}
                </button>
              )}
            </div>

            <details className="f1-review-options f1-review-more-options">
              <summary>More options</summary>

              <div className="f1-review-side-options">
                {canAutopublish && (
                  <button type="button" onClick={autopublishNow} disabled={autoPublishing || isPosted}>
                    {autoPublishing ? "Autopublishing..." : `Autopublish to ${autopublishPlatformLabel}`}
                  </button>
                )}

                <button type="button" onClick={markAsPosted} disabled={saving || isPosted}>
                  Mark as posted
                </button>

                {isPosted && (
                  <button type="button" onClick={markAsNotPosted} disabled={saving}>
                    Mark as not posted
                  </button>
                )}
              </div>
            </details>
          </article>
        </aside>
      </section>
    </main>
  );
}
