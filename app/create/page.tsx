"use client";


import BackToDashboardButton from "@/app/components/BackToDashboardButton";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "../../lib/supabase/browser";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useToast } from "@/app/components/ToastProvider";

const MEDIA_BUCKET = "campaign-assets";
const MAX_PDF_FLYER_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SCAN_BYTES = 20 * 1024 * 1024;

const SUPPORTED_WEEKLY_UPLOAD_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "application/pdf",
];

type GeneratedPost = {
  day?: string;
  platform?: string;
  title?: string;
  caption?: string;
  cta?: string;
  hashtags?: string[];
  image_prompt?: string;
  smilesDraft?: SmilesDraft;
};

type SmilesDraftType = "venue" | "offer" | "event" | "none";

type SmilesDraft = {
  recommended?: boolean;
  type?: SmilesDraftType;
  title?: string;
  description?: string;
  shortDescription?: string;
  savingText?: string;
  terms?: string;
  validDays?: string;
  validTimes?: string;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  priceText?: string;
  locationName?: string;
  locationArea?: string;
  address?: string;
  venueType?: string;
  websiteUrl?: string;
  bookingUrl?: string;
};

type AccessInfo = {
  id: string;
  user_id: string;
  access_status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  extension_ends_at: string | null;
  subscription_status: string | null;
};

type WeeklyProgress = {
  total: number;
  posted: number;
  remaining: number;
  nextPost: any | null;
};

type WeeklyPostAllowance = {
  weeklyLimit: number;
  postsUsed: number;
  postsRemaining: number;
  weekStart: string | null;
  weekEnd: string | null;
};

type WeeklyUpload = {
  id: string;
  file: File;
  previewUrl: string;
  mediaUrl?: string;
  mediaPath?: string;
  mediaType?: "image" | "flyer" | "video";
  note: string;
};

type UploadedMediaItem = {
  upload_id: string;
  position: number;
  file_name: string;
  media_url: string;
  media_path: string;
  media_type: "image" | "flyer" | "video";
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
  original_media_type?: "image" | "flyer" | "video";
  converted_from_pdf?: boolean;
  media_prepare_status?: "ready" | "preparing" | "prepared" | "failed" | "needs_preparing";
  media_prepare_error?: string | null;
  media_prepared_at?: string | null;
  flyer_to_wording?: boolean;
  flyer_wording_instruction?: string;
  flyer_extraction_focus?: string[];
};

type PlatformOption = {
  name: string;
  shortName: string;
  description: string;
};

const availablePlatforms: PlatformOption[] = [
  {
    name: "Facebook",
    shortName: "Facebook",
    description: "Auto-post when Meta is connected.",
  },
  {
    name: "Instagram",
    shortName: "Instagram",
    description: "Auto-post when Meta is connected.",
  },
  {
    name: "Stockport Smiles",
    shortName: "Smiles",
    description: "Prepare suitable offers and events for Smiles approval.",
  },
];

const marketReachOptions = [
  {
    value: "Local customers",
    title: "Local",
    description: "For customers near your business.",
  },
  {
    value: "Nationwide customers",
    title: "Nationwide",
    description: "For customers across the UK.",
  },
  {
    value: "Online customers",
    title: "Online",
    description: "For online shops, digital services or remote work.",
  },
];

const postingFrequencyOptions = [
  {
    value: 3,
    title: "3 posts",
    description: "Simple weekly set.",
  },
  {
    value: 5,
    title: "5 posts",
    description: "Steady weekday set.",
  },
  {
    value: 7,
    title: "7 posts",
    description: "Full weekly set.",
  },
];

const defaultSelectedPlatforms = ["Facebook", "Instagram", "Stockport Smiles"];

const platformFallback = [
  "Facebook",
  "Instagram",
  "Stockport Smiles",
  "Facebook",
  "Instagram",
  "Stockport Smiles",
  "Facebook",
];

const DEMO_WEEKLY_SCAN_LIMIT = 1;
const PAID_WEEKLY_SCAN_LIMIT = 2;

const DEMO_WEEKLY_VIDEO_SCAN_LIMIT = 1;
const PAID_WEEKLY_VIDEO_SCAN_LIMIT = 2;

const MAX_SAVED_CAMPAIGNS = 4;

const WEBSITE_SCAN_EVENT_TYPES = ["website_scan", "campaign_regenerate"];
const VIDEO_SCAN_EVENT_TYPES = ["video_scan"];


function PdfUploadPreview({
  file,
  label,
}: {
  file: File;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewMessage, setPreviewMessage] = useState("Loading PDF preview...");

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    const renderPdfPreview = async () => {
      const canvas = canvasRef.current;

      if (!canvas) return;

      try {
        setPreviewMessage("Loading PDF preview...");

        const pdfjsLib: any = await import("pdfjs-dist");

        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).toString();
        }

        const pdfData = await file.arrayBuffer();

        if (cancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdfDocument = await loadingTask.promise;
        const page = await pdfDocument.getPage(1);

        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const parentWidth = canvas.parentElement?.clientWidth || 720;
        const targetWidth = Math.min(Math.max(parentWidth, 320), 920);
        const scale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Could not create PDF preview.");
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        context.clearRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;

        if (!cancelled) {
          setPreviewMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewMessage("PDF preview unavailable. You can still create posts or convert it later.");
        }
      }
    };

    renderPdfPreview();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel?.();
      } catch {
        // Ignore render cancellation errors.
      }
    };
  }, [file]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: "#020617",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label={label}
        style={{
          width: "100%",
          maxWidth: "100%",
          height: "auto",
          maxHeight: "100%",
          objectFit: "contain",
          display: previewMessage ? "none" : "block",
          background: "#ffffff",
        }}
      />

      {previewMessage && (
        <div
          style={{
            textAlign: "center",
            padding: 18,
            color: "#ffffff",
          }}
        >
          <strong>PDF flyer</strong>
          <p
            style={{
              margin: "8px 0 0",
              color: "rgba(248,250,252,0.7)",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {previewMessage}
          </p>
        </div>
      )}
    </div>
  );
}

export default function CreatePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const notify = (
    message: any,
    type: "success" | "error" | "info" | "warning" = "info",
    title?: string
  ) => {
    const cleanMessage = String(message || "").trim();

    if (!cleanMessage) return;

    showToast({
      type,
      title:
        title ||
        (type === "success"
          ? "Done"
          : type === "error"
            ? "Something went wrong"
            : type === "warning"
              ? "Please check"
              : "FromOne"),
      message: cleanMessage,
    });
  };

  const updateCreationProgress = (message: string) => {
    setCreationProgressMessage(message);
  };

  const [addToCampaignId, setAddToCampaignId] = useState<string | null>(null);
  const [client, setClient] = useState<any>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [dashboardMounted, setDashboardMounted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [preparingFlyers, setPreparingFlyers] = useState(false);
  const [creationProgressMessage, setCreationProgressMessage] = useState("");
  const [savingWebsite, setSavingWebsite] = useState(false);
  const [showManualProfile, setShowManualProfile] = useState(false);
  const [savingManualProfile, setSavingManualProfile] = useState(false);

  const [weeklyScansUsed, setWeeklyScansUsed] = useState(0);
  const [weeklyVideoScansUsed, setWeeklyVideoScansUsed] = useState(0);
  const [savedCampaignsCount, setSavedCampaignsCount] = useState(0);
  const [weeklyPostAllowance, setWeeklyPostAllowance] =
    useState<WeeklyPostAllowance>({
      weeklyLimit: 4,
      postsUsed: 0,
      postsRemaining: 4,
      weekStart: null,
      weekEnd: null,
    });

  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress>({
    total: 0,
    posted: 0,
    remaining: 0,
    nextPost: null,
  });

  const [hasScheduledPost, setHasScheduledPost] = useState(false);

  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [billingPlan, setBillingPlan] = useState<"demo" | "starter">("demo");
  const [accessLocked, setAccessLocked] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    defaultSelectedPlatforms
  );
  const [platformDistributionMode, setPlatformDistributionMode] = useState<
    "split" | "every_platform"
  >("split");
  const [selectedMarketReach, setSelectedMarketReach] =
    useState("Local customers");
  const [selectedPostingFrequency, setSelectedPostingFrequency] = useState(3);
  const [weeklyUploads, setWeeklyUploads] = useState<WeeklyUpload[]>([]);
  const [weeklyPostNote, setWeeklyPostNote] = useState("");

  const [creationMode, setCreationMode] = useState<"ai" | "manual">("ai");
  const [manualPostTitle, setManualPostTitle] = useState("");
  const [manualPostCaption, setManualPostCaption] = useState("");
  const [manualPostCta, setManualPostCta] = useState("");
  const [manualPostHashtags, setManualPostHashtags] = useState("");

  const mobilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const mobileVideoInputRef = useRef<HTMLInputElement | null>(null);
  const mobileFileInputRef = useRef<HTMLInputElement | null>(null);
  const navigatingToPostsRef = useRef(false);

  const [manualBusinessName, setManualBusinessName] = useState("");
  const [manualIndustry, setManualIndustry] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualServices, setManualServices] = useState("");
  const [manualAudience, setManualAudience] = useState("");
  const [manualTone, setManualTone] = useState("Professional");
  const [manualMainOffer, setManualMainOffer] = useState("");
  const [manualGoals, setManualGoals] = useState("");
  const [manualContentPillars, setManualContentPillars] = useState("");

  useEffect(() => {
    setDashboardMounted(true);
    router.prefetch("/posts");
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAddToCampaignId(params.get("addToCampaign"));
    fetchClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      weeklyUploads.forEach((upload) => URL.revokeObjectURL(upload.previewUrl));
    };
  }, [weeklyUploads]);

  const getSafeAuthUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      const message = error.message || "";

      if (
        message.includes("Invalid Refresh Token") ||
        message.includes("Refresh Token Not Found") ||
        message.includes("refresh_token_not_found")
      ) {
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/signin");
        return null;
      }

      const isMissingSession =
        error.message?.toLowerCase().includes("auth session missing") ||
        error.name === "AuthSessionMissingError";

      if (isMissingSession) {
        return null;
      }

      console.error("Auth user error:", error.message);
      return null;
    }

    return data.user || null;
  };

  const getFriendlyAiBusyMessage = (message: string) => {
    const lowerMessage = String(message || "").toLowerCase();

    const providerBusy =
      lowerMessage.includes("high demand") ||
      lowerMessage.includes("try again later") ||
      lowerMessage.includes("temporarily unavailable") ||
      lowerMessage.includes("overloaded") ||
      lowerMessage.includes("rate limit") ||
      lowerMessage.includes("too many requests") ||
      lowerMessage.includes("resource exhausted") ||
      lowerMessage.includes("quota") ||
      lowerMessage.includes("model is currently experiencing");

    if (providerBusy) {
      return "FromOne is busy right now. Please try again in a minute.";
    }

    return message;
  };

  const getErrorMessage = (error: any) => {
    if (!error) return "Unknown error.";

    if (typeof error === "string") {
      return getFriendlyAiBusyMessage(error);
    }

    let message = "";

    if (axios.isAxiosError(error)) {
      message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data?.details ||
        error.message ||
        "Request failed.";

      return getFriendlyAiBusyMessage(message);
    }

    message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      error?.error_description ||
      error?.details ||
      error?.hint ||
      "Unknown error creating or saving posts.";

    return getFriendlyAiBusyMessage(message);
  };

  const throwSupabaseError = (error: any) => {
    throw new Error(
      error?.message ||
        error?.details ||
        error?.hint ||
        error?.code ||
        JSON.stringify(error) ||
        "Supabase error."
    );
  };

  const normaliseWebsiteUrl = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return "";

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    return `https://${trimmed}`;
  };

  const safeArray = (value: any) => {
    if (Array.isArray(value)) return value;

    if (typeof value === "string" && value.trim()) {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  const isFutureDate = (value?: string | null) => {
    if (!value) return false;
    return new Date(value).getTime() > Date.now();
  };

  const isPaidSubscription = (status?: string | null) => {
    return ["active", "paid", "trialing"].includes(
      String(status || "").toLowerCase()
    );
  };

  const calculateAccess = (access: AccessInfo | null) => {
    if (!access) {
      return {
        locked: false,
        message: "7-day demo access is being prepared.",
      };
    }

    if (isPaidSubscription(access.subscription_status)) {
      return {
        locked: false,
        message: "Subscription active.",
      };
    }

    if (isFutureDate(access.extension_ends_at)) {
      const date = new Date(access.extension_ends_at as string).toLocaleDateString(
        undefined,
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );

      return {
        locked: false,
        message: `Manual extension active until ${date}.`,
      };
    }

    if (isFutureDate(access.trial_ends_at)) {
      const date = new Date(access.trial_ends_at as string).toLocaleDateString(
        undefined,
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );

      return {
        locked: false,
        message: `7-day demo active until ${date}.`,
      };
    }

    return {
      locked: true,
      message:
        "Your 7-day 7-day demo has ended. You can still view existing posts, but creating new weekly posts is locked until access is extended or a subscription is active.",
    };
  };

  const getSevenDaysAgoIso = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return sevenDaysAgo.toISOString();
  };

  const getStartOfWeek = () => {
    const date = new Date();
    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + mondayOffset);
    date.setHours(0, 0, 0, 0);

    return date;
  };

  const getEndOfWeek = () => {
    const date = getStartOfWeek();
    date.setDate(date.getDate() + 6);
    date.setHours(23, 59, 59, 999);

    return date;
  };

  const loadWeeklyScanUsage = async (userId: string) => {
    const { count, error } = await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("event_type", WEBSITE_SCAN_EVENT_TYPES)
      .gte("created_at", getSevenDaysAgoIso());

    if (error) {
      console.error("Error loading scan usage:", error.message);
      setWeeklyScansUsed(0);
      return 0;
    }

    const used = count || 0;
    setWeeklyScansUsed(used);
    return used;
  };

  const loadWeeklyVideoScanUsage = async (userId: string) => {
    const { count, error } = await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("event_type", VIDEO_SCAN_EVENT_TYPES)
      .gte("created_at", getSevenDaysAgoIso());

    if (error) {
      console.error("Error loading video scan usage:", error.message);
      setWeeklyVideoScansUsed(0);
      return 0;
    }

    const used = count || 0;
    setWeeklyVideoScansUsed(used);
    return used;
  };

  const loadBillingPlan = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_billing")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error loading billing plan:", error.message);
      setBillingPlan("demo");
      return "demo";
    }

    const plan = data?.plan === "starter" && data?.status === "active" ? "starter" : "demo";

    setBillingPlan(plan);
    return plan;
  };

  const loadSavedCampaignCount = async (userId: string) => {
    const { data: campaignRows, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("user_id", userId);

    if (campaignsError) {
      console.error(
        "Error loading FromOne weekly post sets:",
        campaignsError.message,
      );
      setSavedCampaignsCount(0);
      return 0;
    }

    const campaignIds = (campaignRows || [])
      .map((campaign) => String(campaign?.id || "").trim())
      .filter(Boolean);

    if (campaignIds.length === 0) {
      setSavedCampaignsCount(0);
      return 0;
    }

    const { data: activePostRows, error: postsError } = await supabase
      .from("campaign_posts")
      .select("campaign_id")
      .eq("user_id", userId)
      .in("campaign_id", campaignIds)
      .is("deleted_at", null);

    if (postsError) {
      console.error(
        "Error checking active FromOne weekly posts:",
        postsError.message,
      );
      setSavedCampaignsCount(campaignIds.length);
      return campaignIds.length;
    }

    const activeCampaignIds = new Set(
      (activePostRows || [])
        .map((post) => String(post?.campaign_id || "").trim())
        .filter(Boolean),
    );

    const emptyCampaignIds = campaignIds.filter(
      (campaignId) => !activeCampaignIds.has(campaignId),
    );

    if (emptyCampaignIds.length > 0) {
      const { error: cleanupError } = await supabase
        .from("campaigns")
        .delete()
        .eq("user_id", userId)
        .in("id", emptyCampaignIds);

      if (cleanupError) {
        console.error(
          "Could not remove empty FromOne weekly sets:",
          cleanupError.message,
        );
      }
    }

    const total = activeCampaignIds.size;
    setSavedCampaignsCount(total);
    return total;
  };

  const loadWeeklyPostAllowance = async (userId: string) => {
    const { data, error } = await supabase.rpc(
      "get_weekly_campaign_post_allowance",
      { requested_user_id: userId },
    );

    if (error) {
      console.error("Error loading weekly post allowance:", error.message);

      const fallback = {
        weeklyLimit: Number(client?.post_limit_override) || 4,
        postsUsed: 0,
        postsRemaining: Number(client?.post_limit_override) || 4,
        weekStart: null,
        weekEnd: null,
      };

      setWeeklyPostAllowance(fallback);
      return fallback;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const allowance = {
      weeklyLimit: Number(row?.weekly_limit || 4),
      postsUsed: Number(row?.posts_used || 0),
      postsRemaining: Number(row?.posts_remaining || 0),
      weekStart: row?.week_start || null,
      weekEnd: row?.week_end || null,
    };

    setWeeklyPostAllowance(allowance);
    return allowance;
  };

  const loadWeeklyProgress = async (userId: string) => {
    const startOfWeek = getStartOfWeek();
    const endOfWeek = getEndOfWeek();

    const { data, error } = await supabase
      .from("campaign_posts")
      .select("*")
      .eq("user_id", userId)
      .gte("scheduled_at", startOfWeek.toISOString())
      .lte("scheduled_at", endOfWeek.toISOString())
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error("Error loading weekly progress:", error.message);
      setWeeklyProgress({
        total: 0,
        posted: 0,
        remaining: 0,
        nextPost: null,
      });
      return;
    }

    const posts = data || [];
    const posted = posts.filter((post) => post.is_posted).length;
    const remaining = Math.max(posts.length - posted, 0);
    const nextPost =
      posts.find(
        (post) =>
          !post.is_posted && new Date(post.scheduled_at).getTime() >= Date.now()
      ) ||
      posts.find((post) => !post.is_posted) ||
      null;

    setWeeklyProgress({
      total: posts.length,
      posted,
      remaining,
      nextPost,
    });
  };

  const loadScheduledPostStatus = async (userId: string) => {
    const { count, error } = await supabase
      .from("campaign_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("scheduled_publish_at", "is", null)
      .neq("publish_status", "posted");

    if (error) {
      console.error("Error loading scheduled post status:", error.message);
      setHasScheduledPost(false);
      return;
    }

    setHasScheduledPost((count || 0) > 0);
  };

  const loadOrCreateAccess = async (userId: string) => {
    const { data: existingAccess, error: accessLoadError } = await supabase
      .from("user_access")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (accessLoadError) {
      console.error("Error loading user access:", accessLoadError.message);
      setAccessInfo(null);
      setAccessLocked(false);
      setAccessMessage("Access check unavailable.");
      return;
    }

    if (existingAccess) {
      const access = existingAccess as AccessInfo;
      const calculated = calculateAccess(access);

      setAccessInfo(access);
      setAccessLocked(calculated.locked);
      setAccessMessage(calculated.message);
      return;
    }

    const trialStartedAt = new Date();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialStartedAt.getDate() + 7);

    const { data: newAccess, error: accessUpsertError } = await supabase
      .from("user_access")
      .upsert(
        {
          user_id: userId,
          access_status: "trial",
          trial_started_at: trialStartedAt.toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
          subscription_status: "none",
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (accessUpsertError) {
      console.error("Error creating user access:", accessUpsertError.message);
      setAccessInfo(null);
      setAccessLocked(false);
      setAccessMessage("Access check unavailable.");
      return;
    }

    const access = newAccess as AccessInfo;
    const calculated = calculateAccess(access);

    setAccessInfo(access);
    setAccessLocked(calculated.locked);
    setAccessMessage(calculated.message);
  };

  const fetchClient = async () => {
    setLoading(true);

    const user = await getSafeAuthUser();
    const userId = user?.id;

    if (!userId) {
      setLoading(false);
      return;
    }

    await Promise.all([
      loadWeeklyScanUsage(userId),
      loadWeeklyVideoScanUsage(userId),
      loadBillingPlan(userId),
      loadSavedCampaignCount(userId),
      loadWeeklyPostAllowance(userId),
      loadOrCreateAccess(userId),
      loadWeeklyProgress(userId),
      loadScheduledPostStatus(userId),
    ]);

    const { data, error } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error loading business profile:", error);
      setClient(null);
      setWebsiteUrl("");
      setLoading(false);
      return;
    }

    setClient(data);
    setWebsiteUrl(data?.website_url || "");

    if (data) {
      setManualBusinessName(data.business_name || "");
      setManualIndustry(data.industry || "");
      setManualLocation(data.location || "");
      setManualServices(Array.isArray(data.services) ? data.services.join(", ") : "");
      setManualAudience(
        Array.isArray(data.target_audience) ? data.target_audience.join(", ") : ""
      );
      setManualTone(data.tone_of_voice || "Professional");
      setManualMainOffer(data.main_offer || "");
      setManualGoals(Array.isArray(data.business_goals) ? data.business_goals.join(", ") : "");
      setManualContentPillars(
        Array.isArray(data.content_pillars) ? data.content_pillars.join(", ") : ""
      );

      if (String(data.industry || "").toLowerCase().includes("online")) {
        setSelectedMarketReach("Online customers");
      } else if (data.location) {
        setSelectedMarketReach("Local customers");
      }
    }

    setLoading(false);
  };

  const ensureAccessAllowed = () => {
    if (!accessLocked) return true;

    notify(accessMessage, "warning", "Access locked");
    return false;
  };

  const isAdminUser = async (userId: string) => {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      const message = error.message || "";

      if (
        message.includes("Could not find the table 'public.admin_users'") ||
        message.includes("admin_users") ||
        error.code === "PGRST205"
      ) {
        return false;
      }

      console.warn("Admin check unavailable:", message);
      return false;
    }

    return Boolean(data);
  };

  const checkWeeklyScanLimit = async (userId: string) => {
    const admin = await isAdminUser(userId);

    if (admin) return true;

    const plan = await loadBillingPlan(userId);
    const limit = plan === "starter" ? PAID_WEEKLY_SCAN_LIMIT : DEMO_WEEKLY_SCAN_LIMIT;
    const used = await loadWeeklyScanUsage(userId);

    if (used >= limit) {
      notify(
        plan === "starter"
          ? `You have used your ${PAID_WEEKLY_SCAN_LIMIT} website scans for this 7-day period. You can still create posts using saved business details.`
          : `Your 7-day demo includes ${DEMO_WEEKLY_SCAN_LIMIT} website scan per 7 days. Use saved business details or upgrade to FromOne Introductory Plan.`,
        "warning",
        "Weekly limit reached"
      );
      return false;
    }

    return true;
  };

  const checkWeeklyVideoScanLimit = async (userId: string) => {
    const admin = await isAdminUser(userId);

    if (admin) return true;

    const videoUploadsThisRun = weeklyUploads.filter(
      (upload) => getWeeklyUploadMediaType(upload.file) === "video"
    ).length;

    if (videoUploadsThisRun === 0) return true;

    const plan = await loadBillingPlan(userId);
    const limit =
      plan === "starter" ? PAID_WEEKLY_VIDEO_SCAN_LIMIT : DEMO_WEEKLY_VIDEO_SCAN_LIMIT;
    const used = await loadWeeklyVideoScanUsage(userId);
    const remaining = Math.max(limit - used, 0);

    if (videoUploadsThisRun > remaining) {
      notify(
        plan === "starter"
          ? `You can scan ${PAID_WEEKLY_VIDEO_SCAN_LIMIT} videos per 7 days. You have ${remaining} video scan left.`
          : `Your 7-day demo includes ${DEMO_WEEKLY_VIDEO_SCAN_LIMIT} video scan per 7 days. You have ${remaining} video scan left.`,
        "warning",
        "Video limit reached"
      );
      return false;
    }

    return true;
  };

  const checkSavedCampaignLimit = async (userId: string) => {
    const total = await loadSavedCampaignCount(userId);

    if (total >= MAX_SAVED_CAMPAIGNS) {
      notify(
        `You already have ${MAX_SAVED_CAMPAIGNS} active FromOne weekly post sets. Open Posts and delete an old set before creating a new one.`,
        "warning",
        "Saved set limit reached"
      );
      return false;
    }

    return true;
  };

  const checkWeeklyPostAllowance = async (
    userId: string,
    requestedPosts: number,
  ) => {
    const allowance = await loadWeeklyPostAllowance(userId);

    if (allowance.postsRemaining <= 0) {
      notify(
        `You have used all ${allowance.weeklyLimit} posts for this week. Your allowance resets on Monday.`,
        "warning",
        "Weekly post limit reached",
      );
      return false;
    }

    if (requestedPosts > allowance.postsRemaining) {
      notify(
        `You can create ${allowance.postsRemaining} more post${allowance.postsRemaining === 1 ? "" : "s"} this week. Reduce the uploads or platform versions, then try again.`,
        "warning",
        "Weekly allowance exceeded",
      );
      return false;
    }

    return true;
  };

  const recordUsageEvent = async (
    userId: string,
    eventType: "website_scan" | "campaign_regenerate" | "video_scan",
    metadata: Record<string, any> = {}
  ) => {
    const { error } = await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: eventType,
      metadata,
    });

    if (error) {
      console.error("Error recording usage event:", error.message);
      return;
    }

    if (eventType === "video_scan") {
      await loadWeeklyVideoScanUsage(userId);
      return;
    }

    await loadWeeklyScanUsage(userId);
  };

  const getBusinessLocation = (profile?: any) => {
    return String(profile?.location || manualLocation || "").trim();
  };

  const getMarketReachContext = (profile?: any) => {
    const location = getBusinessLocation(profile);

    if (selectedMarketReach === "Local customers" && location) {
      return `Local customers in and around ${location}`;
    }

    if (selectedMarketReach === "Nationwide customers") {
      return "Nationwide customers across the UK";
    }

    if (selectedMarketReach === "Online customers") {
      return "Online customers";
    }

    return selectedMarketReach;
  };

  const getMarketReachDisplayLabel = (profile?: any) => {
    const location = getBusinessLocation(profile);

    if (selectedMarketReach === "Local customers" && location) {
      return `Local · ${location}`;
    }

    if (selectedMarketReach === "Nationwide customers") {
      return "Nationwide · UK";
    }

    if (selectedMarketReach === "Online customers") {
      return "Online";
    }

    return selectedMarketReach;
  };

  const buildBusinessDescription = (profile: any) => {
    const marketReachContext = getMarketReachContext(profile);
    const businessLocation = getBusinessLocation(profile);

    return `
Website URL: ${profile.website_url || ""}
Business name: ${profile.business_name || ""}
Industry: ${profile.industry || ""}
Location: ${businessLocation}
Services: ${Array.isArray(profile.services) ? profile.services.join(", ") : ""}
Target audience: ${
      Array.isArray(profile.target_audience) ? profile.target_audience.join(", ") : ""
    }
Tone of voice: ${profile.tone_of_voice || ""}
Content pillars: ${Array.isArray(profile.content_pillars) ? profile.content_pillars.join(", ") : ""}
Main offer: ${profile.main_offer || ""}
Business goals: ${Array.isArray(profile.business_goals) ? profile.business_goals.join(", ") : ""}

Market reach:
${marketReachContext}

Core FromOne rule:
- Uploaded media provides the topic.
- The business profile provides the quality, local angle, industry relevance, tone, CTA and sales angle.
- Do not only describe a photo, flyer or video.
- Turn each upload into a useful post that sounds like the business.
- Do not invent product claims from an image.
- Never guess ingredients, materials, preparation methods, health benefits, prices, offers, guarantees, safety claims, sizes, dates or technical specifications unless they are clearly visible in the uploaded media or supplied by the user.
- If the image is unclear or the product is ambiguous, write cautiously and generally. Use phrases like "available now", "new in", "ask us for details" or "message us to check availability" instead of making specific claims.
- If the user adds a quick description, treat that description as the main source of truth for what the item is.
`;
  };

  const buildHashtags = (profile: any) => {
    const industry = String(profile.industry || "business")
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");

    const locationSource =
      selectedMarketReach === "Nationwide customers"
        ? "UK"
        : selectedMarketReach === "Online customers"
          ? "Online"
          : getBusinessLocation(profile) || "Local";

    const location = String(locationSource)
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");

    return [`#${industry}`, `#${location}`, "#SmallBusiness", "#FromOne"];
  };

  const getRecommendedPlatforms = () => {
    return defaultSelectedPlatforms;
  };

  const selectedPostingFrequencyOption =
    postingFrequencyOptions.find((option) => option.value === selectedPostingFrequency) ||
    postingFrequencyOptions[0];

  const recommendedPlatforms = useMemo(() => getRecommendedPlatforms(), []);

  const buildPlatformPlanText = (platforms: string[], postCount: number) => {
    const safePlatforms = platforms.length > 0 ? platforms : defaultSelectedPlatforms;

    return Array.from({ length: postCount })
      .map((_, index) => {
        const platform = safePlatforms[index % safePlatforms.length];
        return `Post ${index + 1} ${platform}`;
      })
      .join(", ");
  };

  const getPlatformScheduleOffsetMinutes = (platform: string) => {
    const cleanPlatform = String(platform || "").toLowerCase();

    if (cleanPlatform.includes("instagram")) return 15;
    if (cleanPlatform.includes("tiktok")) return 30;

    return 0;
  };

  const getExistingCampaignStats = async (campaignId: string) => {
    const { data, error } = await supabase
      .from("campaign_posts")
      .select("scheduled_day")
      .eq("campaign_id", campaignId)
      .is("deleted_at", null);

    if (error) {
      console.error("Error counting existing campaign posts:", error.message);
      return {
        postRecords: 0,
        contentDays: 0,
      };
    }

    const existingPosts = data || [];
    const dayNumbers = existingPosts
      .map((item) => String(item.scheduled_day || ""))
      .map((value) => {
        const match = value.match(/Post\s+(\d+)/i);
        return match ? Number(match[1]) : 0;
      })
      .filter((value) => value > 0);

    return {
      postRecords: existingPosts.length,
      contentDays:
        dayNumbers.length > 0
          ? Math.max(...dayNumbers)
          : new Set(existingPosts.map((item) => item.scheduled_day).filter(Boolean)).size,
    };
  };

  const deleteEmptyCampaignIfNeeded = async (campaignId?: string | null) => {
    if (!campaignId) return;

    try {
      const { count, error: countError } = await supabase
        .from("campaign_posts")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId);

      if (countError) {
        console.error("Could not check empty weekly set:", countError.message);
        return;
      }

      if ((count || 0) > 0) return;

      const { error: deleteError } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (deleteError) {
        console.error("Could not delete empty weekly set:", deleteError.message);
      }
    } catch (cleanupError: any) {
      console.error("Empty weekly set cleanup failed:", cleanupError?.message || cleanupError);
    }
  };


  const saveWebsiteToProfile = async () => {
    const cleanWebsiteUrl = normaliseWebsiteUrl(websiteUrl);

    if (!cleanWebsiteUrl) {
      notify("Please enter a website URL, or use the business details option.", "warning", "Website needed");
      return null;
    }

    setSavingWebsite(true);

    try {
      const user = await getSafeAuthUser();
      const userId = user?.id || null;

      if (!userId) {
        notify("Please sign in again.", "warning", "Sign in needed");
        return null;
      }

      if (client?.id) {
        const { data, error } = await supabase
          .from("business_profiles")
          .update({
            user_id: userId,
            website_url: cleanWebsiteUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", client.id)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throwSupabaseError(error);

        setClient(data);
        setWebsiteUrl(data.website_url || "");

        return data;
      }

      const { data, error } = await supabase
        .from("business_profiles")
        .insert({
          user_id: userId,
          website_url: cleanWebsiteUrl,
          tone_of_voice: "Professional",
          services: [],
          target_audience: [],
          content_pillars: [],
          business_goals: [],
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throwSupabaseError(error);

      setClient(data);
      setWebsiteUrl(data.website_url || "");

      return data;
    } catch (error: any) {
      const message = getErrorMessage(error);

      console.error("Error saving website profile:", error);
      notify(message, "error");
      return null;
    } finally {
      setSavingWebsite(false);
    }
  };

  const saveManualProfile = async () => {
    if (!manualBusinessName.trim() || !manualIndustry.trim()) {
      notify("Please add at least the business name and industry.", "warning", "Business details needed");
      return null;
    }

    setSavingManualProfile(true);

    try {
      const user = await getSafeAuthUser();
      const userId = user?.id || null;

      if (!userId) {
        notify("Please sign in again.", "warning", "Sign in needed");
        return null;
      }

      const profilePayload = {
        user_id: userId,
        business_name: manualBusinessName.trim(),
        industry: manualIndustry.trim(),
        location: manualLocation.trim(),
        services: safeArray(manualServices),
        target_audience: safeArray(manualAudience),
        tone_of_voice: manualTone.trim() || "Professional",
        main_offer: manualMainOffer.trim(),
        business_goals: safeArray(manualGoals),
        content_pillars: safeArray(manualContentPillars),
        updated_at: new Date().toISOString(),
      };

      if (client?.id) {
        const { data, error } = await supabase
          .from("business_profiles")
          .update(profilePayload)
          .eq("id", client.id)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throwSupabaseError(error);

        setClient(data);
        return data;
      }

      const { data, error } = await supabase
        .from("business_profiles")
        .insert({
          ...profilePayload,
          website_url: "",
        })
        .select()
        .single();

      if (error) throwSupabaseError(error);

      setClient(data);
      return data;
    } catch (error: any) {
      const message = getErrorMessage(error);

      console.error("Error saving business details:", error);
      notify(message, "error");
      return null;
    } finally {
      setSavingManualProfile(false);
    }
  };

  const updateBusinessProfileFromScan = async (scanData: any, activeClient: any) => {
    if (!activeClient?.id || !scanData) return;

    const businessProfileUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (scanData.business_name) businessProfileUpdates.business_name = scanData.business_name;
    if (scanData.industry) businessProfileUpdates.industry = scanData.industry;
    if (scanData.location) businessProfileUpdates.location = scanData.location;
    if (scanData.main_offer) businessProfileUpdates.main_offer = scanData.main_offer;
    if (scanData.tone_of_voice) businessProfileUpdates.tone_of_voice = scanData.tone_of_voice;
    if (scanData.services) businessProfileUpdates.services = safeArray(scanData.services);
    if (scanData.target_audience) {
      businessProfileUpdates.target_audience = safeArray(scanData.target_audience);
    }
    if (scanData.content_pillars) {
      businessProfileUpdates.content_pillars = safeArray(scanData.content_pillars);
    }
    if (scanData.business_goals) {
      businessProfileUpdates.business_goals = safeArray(scanData.business_goals);
    }
    if (scanData.brand_primary_color) {
      businessProfileUpdates.brand_primary_color = scanData.brand_primary_color;
    }
    if (scanData.brand_secondary_color) {
      businessProfileUpdates.brand_secondary_color = scanData.brand_secondary_color;
    }
    if (scanData.brand_accent_color) {
      businessProfileUpdates.brand_accent_color = scanData.brand_accent_color;
    }
    if (scanData.brand_logo_url) {
      businessProfileUpdates.brand_logo_url = scanData.brand_logo_url;
    }
    if (scanData.brand_summary) {
      businessProfileUpdates.brand_summary = scanData.brand_summary;
    }

    if (Object.keys(businessProfileUpdates).length <= 1) return;

    const { data, error } = await supabase
      .from("business_profiles")
      .update(businessProfileUpdates)
      .eq("id", activeClient.id)
      .eq("user_id", activeClient.user_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating scanned business profile:", error);
      return;
    }

    setClient(data);
  };

  const getSafeFileName = (fileName: string) => {
    const cleanName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return cleanName || "media";
  };

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0MB";

    const mb = bytes / (1024 * 1024);

    if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)}MB`;

    return `${Math.max(bytes / 1024, 1).toFixed(0)}KB`;
  };

  const getWeeklyUploadMediaType = (file: File): "image" | "flyer" | "video" => {
    if (file.type === "application/pdf") return "flyer";
    if (file.type.startsWith("video/")) return "video";
    return "image";
  };

  const isSupportedWeeklyUploadFile = (file: File) => {
    return (
      SUPPORTED_WEEKLY_UPLOAD_TYPES.includes(file.type) ||
      file.name.toLowerCase().endsWith(".pdf")
    );
  };

  const getWeeklyUploadUnsupportedReason = (file: File) => {
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

  const hasSelectedSocialPlatform = () => {
    return selectedPlatforms.some((platform) => {
      const cleanPlatform = String(platform || "").toLowerCase();
      return (
        cleanPlatform.includes("facebook") ||
        cleanPlatform.includes("instagram") ||
        cleanPlatform.includes("stockport smiles") ||
        cleanPlatform.includes("smiles")
      );
    });
  };


  const buildFlyerWordingInstruction = (
    upload: WeeklyUpload,
    convertedFromPdf: boolean,
    conversionWarning: string,
  ) => {
    const note = String(upload.note || "").trim();

    return [
      "FLYER_TO_WORDING_ENABLED",
      `Original flyer filename: ${upload.file.name}`,
      convertedFromPdf
        ? "The PDF flyer has been converted into a social-ready image. Read the visible flyer artwork/image before writing."
        : "Use the original flyer/PDF context and any available visual text.",
      note ? `Client note: ${note}` : "Client note: not supplied.",
      conversionWarning
        ? `Preparation warning: ${conversionWarning}`
        : "Preparation warning: none.",
      "Extract and use only details visible on the flyer or supplied by the client.",
      "Look for: offer/event/service/product, date, time, price, discount, address/location, booking/contact details, website/social handle, deadline, terms, audience and urgency.",
      "Turn the flyer into a social caption that sounds natural, not like OCR text.",
      "Use the flyer as the main source of truth. The business profile should only improve tone, local relevance and CTA.",
      "Do not invent missing details. If a detail is not visible, leave it out.",
    ].join("\\n");
  };


  const buildUploadAnalysisContext = (
    upload: WeeklyUpload,
    mediaType: "image" | "flyer" | "video",
    uploadNote: string,
    index: number
  ) => {
    if (mediaType === "flyer" && upload.file.size > MAX_PDF_FLYER_BYTES) {
      throw new Error(
        `${upload.file.name} is ${formatFileSize(upload.file.size)}. PDF flyers need to be under 10MB. Try exporting a smaller PDF or an image from Canva.`
      );
    }

    const baseContext = [
      `Upload ${index + 1}`,
      `Original filename: ${upload.file.name}`,
      `MIME type: ${upload.file.type || "unknown"}`,
      `File size: ${upload.file.size} bytes`,
      uploadNote ? `Client quick description: ${uploadNote}` : "Client quick description: not supplied",
    ].join(". ");

    if (mediaType === "video") {
      return `${baseContext}. This is a video-led post. Analyse the actual video footage if available. The post must relate to what the clip shows: the scene, action, movement, atmosphere, product, service, event, job progress, result, behind-the-scenes moment, offer or booking/enquiry opportunity. Use the quick description as supporting context. Do not write a generic business post. If the video cannot be inspected because it is too large or unsupported, use the quick description and filename carefully without pretending to have seen exact details.`;
    }

    if (mediaType === "flyer") {
      return `${baseContext}. This is a flyer/poster/PDF-led post. Read the visible flyer text and design if available. Extract the practical details first: offer, event name, service, product, date, time, price, location, contact method, booking instruction, deadline and terms. Then rewrite those details as a natural social caption with a clear CTA. Do not just describe the flyer. Do not invent missing dates, prices or contact details. If key details are unreadable, create a useful caption from the readable details and say the user should check the final wording.`;
    }

    return `${baseContext}. This is an image-led post. Analyse the image if available and make the visible subject the topic. Use the quick description as the main source of truth when it is supplied. If the image is unclear, partial, close-up, ambiguous, unlabelled, or the exact product/material/ingredient/preparation method cannot be confidently identified, do not guess. Do not invent product claims, ingredients, materials, preparation methods, health benefits, prices, guarantees, safety claims, sizes, dates or technical specifications. Use cautious wording and create a useful general post that invites the customer to ask for details or check availability. The business profile may improve tone, CTA and local relevance, but it must not be used to invent specifics not visible or supplied.`;
  };

  const renderPdfFileToJpegBlob = async (file: File) => {
    const pdfjsLib: any = await import("pdfjs-dist");

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
    }

    const pdfData = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);

    const baseViewport = page.getViewport({ scale: 1 });
    const targetWidth = 1080;
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("FromOne could not create a flyer image from this PDF.");
    }

    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      throw new Error("FromOne could not create a JPEG from this PDF preview.");
    }

    return {
      blob,
      width: canvas.width,
      height: canvas.height,
    };
  };

  const prepareUploadedPdfForSocialPlatforms = async ({
    upload,
    userId,
  }: {
    upload: WeeklyUpload;
    userId: string;
  }) => {
    const rendered = await renderPdfFileToJpegBlob(upload.file);
    const safeFileName = getSafeFileName(upload.file.name).replace(/\.pdf$/i, "");
    const imagePath = `${userId}/weekly-uploads/prepared/${Date.now()}-${upload.id}-${safeFileName || "flyer"}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(imagePath, rendered.blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/jpeg",
      });

    if (uploadError) {
      throw new Error(uploadError.message || "FromOne could not save the prepared flyer image.");
    }

    const { data: publicUrlData } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(imagePath);

    return {
      mediaUrl: publicUrlData.publicUrl,
      mediaPath: imagePath,
      width: rendered.width,
      height: rendered.height,
    };
  };

  const uploadWeeklyMediaToStorage = async (userId: string): Promise<UploadedMediaItem[]> => {
    if (weeklyUploads.length === 0) return [];

    updateCreationProgress("Uploading your media...");

    const uploadedItems: UploadedMediaItem[] = [];
    const shouldPrepareAnyFlyers =
      hasSelectedSocialPlatform() &&
      weeklyUploads.some((upload) => getWeeklyUploadMediaType(upload.file) === "flyer");

    if (shouldPrepareAnyFlyers) {
      setPreparingFlyers(true);
      updateCreationProgress("Preparing flyers for posting...");
    }

    try {
      for (let index = 0; index < weeklyUploads.length; index++) {
      const upload = weeklyUploads[index];
      updateCreationProgress(`Uploading ${index + 1} of ${weeklyUploads.length}...`);
      const safeFileName = getSafeFileName(upload.file.name);
      const mediaType = getWeeklyUploadMediaType(upload.file);
      const path = `${userId}/weekly-uploads/${Date.now()}-${index + 1}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, upload.file, {
          cacheControl: "3600",
          upsert: true,
          contentType: upload.file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);

      const shouldPreparePdfForSocial = mediaType === "flyer" && hasSelectedSocialPlatform();

      let effectiveMediaUrl = publicUrlData.publicUrl;
      let effectiveMediaPath = path;
      let effectiveMediaType: "image" | "flyer" | "video" = mediaType;
      let effectiveContentType = upload.file.type || mediaType;
      let convertedFromPdf = false;
      let mediaPrepareStatus: "ready" | "preparing" | "prepared" | "failed" | "needs_preparing" =
        mediaType === "image"
          ? "prepared"
          : mediaType === "flyer"
            ? "needs_preparing"
            : "ready";
      let mediaPrepareError: string | null = null;
      let mediaPreparedAt: string | null =
        mediaType === "image" ? new Date().toISOString() : null;

      let conversionWarning = "";

      if (shouldPreparePdfForSocial) {
        mediaPrepareStatus = "preparing";
        mediaPrepareError = null;
        updateCreationProgress(`Preparing flyer ${index + 1} of ${weeklyUploads.length}...`);

        try {
          const converted = await prepareUploadedPdfForSocialPlatforms({
            upload,
            userId,
          });

          effectiveMediaUrl = converted.mediaUrl;
          effectiveMediaPath = converted.mediaPath || path;
          effectiveMediaType = "image";
          effectiveContentType = "image/jpeg";
          convertedFromPdf = true;
          mediaPrepareStatus = "prepared";
          mediaPrepareError = null;
          mediaPreparedAt = new Date().toISOString();
        } catch (conversionError: any) {
          conversionWarning =
            conversionError?.message ||
            `${upload.file.name} could not be prepared automatically for posting.`;

          mediaPrepareStatus = "failed";
          mediaPrepareError = conversionWarning;
          mediaPreparedAt = null;

          notify(
            `${conversionWarning} We still created the post using the original PDF. You can prepare the flyer later from the post review screen or upload a JPG/PNG version.`,
            "warning",
            "Flyer needs manual preparation"
          );
        }
      }

      const uploadNote = String(upload.note || "").trim();
      const uploadContext = buildUploadAnalysisContext(upload, mediaType, uploadNote, index);
      const flyerWordingInstruction =
        mediaType === "flyer"
          ? buildFlyerWordingInstruction(upload, convertedFromPdf, conversionWarning)
          : "";

      const finalUploadContext =
        mediaType === "flyer"
          ? `${uploadContext}

${flyerWordingInstruction}

Important flyer-to-wording rule: the generated caption, CTA and hashtags must be based on the flyer details. Extract the flyer message and turn it into wording the customer can post.`
          : convertedFromPdf
            ? `${uploadContext}. This PDF flyer was automatically prepared as a JPEG image for the selected social platforms. Use the visible flyer artwork/image as the media for the generated post.`
            : conversionWarning
              ? `${uploadContext}. The app tried to prepare this PDF automatically for posting, but conversion failed. Use the original flyer/PDF context and warn the user later that the flyer may need manual preparation before publishing.`
              : uploadContext;

      uploadedItems.push({
        upload_id: upload.id,
        position: index + 1,
        file_name: upload.file.name,
        media_url: effectiveMediaUrl,
        media_path: effectiveMediaPath,
        media_type: effectiveMediaType,
        content_type: effectiveContentType,
        file_size: upload.file.size,
        type: effectiveContentType || effectiveMediaType,
        mimeType: effectiveContentType || effectiveMediaType,
        description: uploadNote,
        context: finalUploadContext,
        note: uploadNote,
        topic_hint: finalUploadContext,
        original_media_url: convertedFromPdf ? publicUrlData.publicUrl : undefined,
        original_media_path: convertedFromPdf ? path : undefined,
        original_media_type: convertedFromPdf ? mediaType : undefined,
        converted_from_pdf: convertedFromPdf,
        conversion_warning: conversionWarning || undefined,
        media_prepare_status: mediaPrepareStatus,
        media_prepare_error: mediaPrepareError,
        media_prepared_at: mediaPreparedAt,
        flyer_to_wording: mediaType === "flyer",
        flyer_wording_instruction: flyerWordingInstruction || undefined,
        flyer_extraction_focus:
          mediaType === "flyer"
            ? [
                "offer",
                "event",
                "service",
                "date",
                "time",
                "price",
                "location",
                "booking",
                "contact",
                "CTA",
              ]
            : undefined,
      });
      }

      return uploadedItems;
    } finally {
      if (shouldPrepareAnyFlyers) {
        setPreparingFlyers(false);
      }
    }
  };

  const buildCampaignName = (businessName: string) => {
    const date = new Date().toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${businessName || "Weekly posts"} — ${date} ${time}`;
  };

  const isNightlifeBusiness = (profile: any, industry?: string) => {
    const source = [
      profile?.industry,
      industry,
      profile?.business_name,
      profile?.main_offer,
      Array.isArray(profile?.services) ? profile.services.join(" ") : "",
      Array.isArray(profile?.content_pillars) ? profile.content_pillars.join(" ") : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      source.includes("club") ||
      source.includes("nightclub") ||
      source.includes("bar") ||
      source.includes("pub") ||
      source.includes("venue") ||
      source.includes("nightlife")
    );
  };

  const getSuggestedPostTime = (
    index: number,
    platform: string,
    activeClient: any,
    detectedIndustry: string
  ) => {
    const now = new Date();
    const suggestedDate = new Date(now);
    const nightlife = isNightlifeBusiness(activeClient, detectedIndustry);
    const cleanPlatform = String(platform || "").toLowerCase();

    suggestedDate.setDate(now.getDate() + index);

    if (nightlife) {
      const nightlifeTimes = [
        { hour: 19, minute: 0 },
        { hour: 16, minute: 30 },
        { hour: 18, minute: 0 },
        { hour: 14, minute: 0 },
        { hour: 19, minute: 30 },
        { hour: 12, minute: 30 },
        { hour: 18, minute: 30 },
      ];

      const selected = nightlifeTimes[index % nightlifeTimes.length];
      suggestedDate.setHours(selected.hour, selected.minute, 0, 0);
    } else {
      const standardTimes = [
        { hour: 9, minute: 30 },
        { hour: 12, minute: 30 },
        { hour: 18, minute: 30 },
        { hour: 10, minute: 30 },
        { hour: 15, minute: 30 },
        { hour: 11, minute: 0 },
        { hour: 17, minute: 30 },
      ];

      const selected = standardTimes[index % standardTimes.length];
      suggestedDate.setHours(selected.hour, selected.minute, 0, 0);
    }

    if (cleanPlatform.includes("instagram") && !nightlife) {
      suggestedDate.setMinutes(suggestedDate.getMinutes() + 15);
    }

    if (cleanPlatform.includes("tiktok")) {
      suggestedDate.setMinutes(suggestedDate.getMinutes() + 30);
    }

    if (suggestedDate.getTime() <= now.getTime() + 10 * 60 * 1000) {
      suggestedDate.setDate(now.getDate() + 1);
    }

    return suggestedDate;
  };

  const getReadableSuggestedTime = (value: Date) => {
    return value.toLocaleString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const normaliseGeneratedPost = (
    post: GeneratedPost | string,
    index: number,
    activeClient: any,
    detectedIndustry: string,
    detectedLocation: string
  ) => {
    const selectedPlatformFallback =
      selectedPlatforms[index % selectedPlatforms.length] || platformFallback[index] || "Facebook";

    const fallbackHashtags = buildHashtags({
      ...activeClient,
      industry: detectedIndustry,
      location:
        selectedMarketReach === "Nationwide customers"
          ? "UK"
          : selectedMarketReach === "Online customers"
            ? "Online"
        : detectedLocation,
    });

    const fallbackSmilesDraft: SmilesDraft = {
      recommended: false,
      type: "none",
      title: "",
      description: "",
      shortDescription: "",
      savingText: "",
      terms: "",
      validDays: "",
      validTimes: "",
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      priceText: "",
      locationName: activeClient.business_name || activeClient.name || "",
      locationArea: detectedLocation || "",
      address: "",
      venueType: detectedIndustry || "Business",
      websiteUrl: activeClient.website_url || "",
      bookingUrl: "",
    };

    if (typeof post === "string") {
      return {
        day: `Post ${index + 1}`,
        platform: selectedPlatformFallback,
        title: `${selectedPlatformFallback} Post`,
        caption: post,
        cta: activeClient.main_offer || "Contact us today to find out more.",
        hashtags: fallbackHashtags,
        image_prompt:
          "Use the uploaded photo, flyer or video that supports this post.",
        smilesDraft: fallbackSmilesDraft,
      };
    }

    const allowedPlatform = selectedPlatforms.includes(post.platform || "")
      ? post.platform
      : selectedPlatformFallback;

    return {
      day: post.day || `Post ${index + 1}`,
      platform: allowedPlatform || selectedPlatformFallback,
      title: post.title || `${allowedPlatform || selectedPlatformFallback} Post`,
      caption: post.caption || "",
      cta: post.cta || activeClient.main_offer || "Contact us today to find out more.",
      hashtags:
        Array.isArray(post.hashtags) && post.hashtags.length > 0
          ? post.hashtags
          : fallbackHashtags,
      image_prompt:
        post.image_prompt ||
        "Use the uploaded photo, flyer or video that supports this post.",
      smilesDraft: post.smilesDraft || fallbackSmilesDraft,
    };
  };

  const createCampaignFromProfile = async (
    activeClient: any,
    source: "website_scan" | "manual_profile"
  ) => {
    const user = await getSafeAuthUser();
    const userId = user?.id;

    if (!userId) {
      notify("You need to sign in before saving posts.", "warning", "Sign in needed");
      return;
    }

    if (selectedPlatforms.length === 0) {
      notify("Please choose at least one platform.", "warning", "Platform needed");
      return;
    }

    const marketReachContext = getMarketReachContext(activeClient);
    const marketReachDisplayLabel = getMarketReachDisplayLabel(activeClient);
    const contentDayCount =
      weeklyUploads.length > 0
        ? Math.min(weeklyUploads.length, 7)
        : 1;

    const existingCampaignStats = addToCampaignId
      ? await getExistingCampaignStats(addToCampaignId)
      : { postRecords: 0, contentDays: 0 };

    if (addToCampaignId && existingCampaignStats.contentDays + contentDayCount > 7) {
      notify(
        `This weekly set already has ${existingCampaignStats.contentDays} content day${existingCampaignStats.contentDays === 1 ? "" : "s"}. You can add ${Math.max(7 - existingCampaignStats.contentDays, 0)} more to keep it as a 7-day week.`,
        "warning",
        "Weekly set full"
      );
      return;
    }

    const postCount = contentDayCount;
    // Create exactly one review draft per uploaded item/base idea.
    // Facebook, Instagram and Smilez are chosen later from the review page.
    const totalPlatformPostsToCreate = contentDayCount;

    const weeklyPostLimitAllowed = await checkWeeklyPostAllowance(
      userId,
      totalPlatformPostsToCreate,
    );

    if (!weeklyPostLimitAllowed) return;

    const campaignLimitAllowed = addToCampaignId
      ? true
      : await checkSavedCampaignLimit(userId);

    if (!campaignLimitAllowed) return;

    if (source === "website_scan") {
      const allowed = await checkWeeklyScanLimit(userId);

      if (!allowed) return;
    }

    const videoLimitAllowed = await checkWeeklyVideoScanLimit(userId);

    if (!videoLimitAllowed) return;

    const oversizedPdfUpload = weeklyUploads.find(
      (upload) => getWeeklyUploadMediaType(upload.file) === "flyer" && upload.file.size > MAX_PDF_FLYER_BYTES
    );

    if (oversizedPdfUpload) {
      notify(
        `${oversizedPdfUpload.file.name} is ${formatFileSize(oversizedPdfUpload.file.size)}. PDF flyers need to be under 10MB. Try exporting a smaller PDF or an image from Canva.`,
        "warning",
        "PDF too large"
      );
      return;
    }


    const largeVideoUploads = weeklyUploads.filter(
      (upload) => getWeeklyUploadMediaType(upload.file) === "video" && upload.file.size > 20 * 1024 * 1024
    );

    if (largeVideoUploads.length > 0) {
      notify(
        "Large videos can still create posts, but the AI may rely more on your quick description. For the best scan, use short clips under 20MB.",
        "info",
        "Video scan note"
      );
    }

    const hasPdfUploadsToPrepare =
      hasSelectedSocialPlatform() &&
      weeklyUploads.some((upload) => getWeeklyUploadMediaType(upload.file) === "flyer");

    if (hasPdfUploadsToPrepare) {
      notify(
        "Preparing PDF flyer as a social-ready image before creating posts.",
        "info",
        "Preparing flyer"
      );
    }

    const uploadedMediaItems =
      weeklyUploads.length > 0 ? await uploadWeeklyMediaToStorage(userId) : [];

    updateCreationProgress(
      weeklyUploads.length > 0
        ? "Creating one scheduled post for each upload..."
        : "Creating scheduled posts from your business profile..."
    );

    const response = await axios.post("/api/generatePosts", {
      website: source === "website_scan" ? activeClient.website_url : "",
      clientName: activeClient.business_name,
      industry: activeClient.industry,
      description: `${buildBusinessDescription(activeClient)}

Guided post creation mode:
- If uploads are supplied, create one scheduled post for each upload.
- If no uploads are supplied, create the requested number of profile-only draft posts.
- Use the uploaded media as the main topic for each post.
- If an upload is unclear, use the business profile and client note to create a safe useful post.
- Nothing should imply publishing happens automatically before review.

Weekly uploaded media count: ${uploadedMediaItems.length}.
This week's note from the user:
${weeklyPostNote.trim() || "No extra note supplied."}

If uploads are supplied:
- Treat uploads as the content the client has available.
- Create one post per upload, in upload order.
- Use each upload's note/context/description field as the most important user context for that specific post.
- Do not add extra posts beyond the number of uploads unless there are no uploads.
- For image uploads, only write specific product claims when they are clearly visible in the image or supplied in the user's quick description.
- For unclear image uploads, do not guess the exact product type, ingredients, materials, preparation method, health benefit, price, size, offer, date, guarantee, safety claim or technical specification.
- Never turn an ambiguous image into confident claims such as "air-baked", "100% natural", "no fillers", "handmade", "organic", "safe", "premium", "discounted" or similar unless those details are supplied by the user or clearly visible.
- If the image is ambiguous, use careful wording and invite enquiries, for example "available now", "ask us for details", "message us to check availability" or "pop in to see what is in stock".
- For videos, the API will try to send the actual video to Gemini. If available, the generated post must be about the visible footage itself, not a generic business message.
- For videos, write about the specific scene, action, atmosphere, event, product, service, job progress, result, behind-the-scenes moment, offer or booking/enquiry angle shown or strongly supported.
- If the model cannot inspect a video, it must use the quick description and filename carefully without pretending it saw exact details.
- Create one review draft per content item. Do not duplicate a draft for multiple destinations.
- The final destination is chosen later on the review page, where the user can publish to Facebook, Instagram or send suitable content to Smilez.
- Keep the wording broadly usable across those destinations unless the uploaded media clearly requires platform-specific wording.
- Do not only describe the image, flyer or video.
- Use the business profile to add quality, local angle, industry relevance, tone, CTA and sales angle, but never to invent product specifics.`,
      provider: "gemini",
      platforms: selectedPlatforms,
      postingFrequency: postCount,
      numberOfPosts: postCount,
      marketReach: marketReachContext,
      mediaItems: uploadedMediaItems,
      weeklyUploads: uploadedMediaItems,
      uploads: uploadedMediaItems,
      requestedOutput: {
        posts: `Return exactly ${postCount} scheduled post object${postCount === 1 ? "" : "s"} with day, platform, title, caption, cta, hashtags, image_prompt. If mediaItems are supplied, create exactly one post per uploaded item in the same order. Do not duplicate a post for multiple destinations. If no mediaItems are supplied, create exactly ${postCount} profile-led review draft${postCount === 1 ? "" : "s"}. The user chooses Facebook, Instagram or Smilez later on the review page. Keep the wording broadly reusable across destinations.`,
        selected_platforms: selectedPlatforms,
        market_reach: marketReachContext,
        uploaded_media: uploadedMediaItems,
        media_analysis_rule: "Create one scheduled post per uploaded media item. For image uploads, do not invent product claims, ingredients, materials, preparation methods, health benefits, prices, guarantees, safety claims, dates, sizes or technical details unless clearly visible or supplied by the user's quick description. If the image is unclear or ambiguous, write cautiously and generally, and invite the customer to ask for details or check availability. For flyer/PDF uploads, read visible text/artwork and turn the flyer details into natural caption wording, CTA and hashtags. For video uploads, analyse the footage when available and write about the visible video moment. If footage cannot be inspected, use the quick description cautiously.",
        flyer_to_wording_rule: "When a media item has flyer_to_wording=true, the generated post must be based on details from the flyer: offer/event/service, date, time, price, location, booking/contact, deadline and CTA. Do not invent missing information.",
        business_name: "detected business name",
        industry: "detected industry",
        location: "detected location",
        services: "array",
        target_audience: "array",
        tone_of_voice: "detected tone",
        content_pillars: "array",
        main_offer: "main offer or CTA",
        business_goals: "array",
        brand_primary_color: "hex code",
        brand_secondary_color: "hex code",
        brand_accent_color: "hex code",
        brand_logo_url: "logo URL or null",
        brand_summary: "short brand style summary",
      },
    });

    updateCreationProgress("Choosing dates and times...");

    const returnedPosts = response.data.posts || [];

    if (returnedPosts.length > postCount) {
      console.warn(
        `FromOne received ${returnedPosts.length} generated posts but only ${postCount} were requested. Extra posts were ignored.`
      );
    }

    const posts: GeneratedPost[] = returnedPosts.slice(0, postCount);
    const inlineVideoMediaUsed = Number(response.data.inlineVideoMediaUsed || 0);
    const inlineImageMediaUsed = Number(response.data.inlineImageMediaUsed || response.data.visionMediaUsed || 0);

    if (!posts.length) {
      notify(response.data.error || "No posts were created.", "error", "No posts created");
      return;
    }

    const scanData =
      response.data.businessProfile ||
      response.data.scan ||
      response.data.brief ||
      response.data;

    await updateBusinessProfileFromScan(scanData, activeClient);

    const campaignIdea =
      scanData?.campaign_idea ||
      scanData?.brand_summary ||
      `Weekly ${marketReachContext.toLowerCase()} post set`;

    const detectedBusinessName =
      scanData?.business_name || activeClient.business_name || "Weekly Posts";

    const detectedIndustry = scanData?.industry || activeClient.industry || "General";
    const detectedLocation =
      scanData?.location ||
      activeClient.location ||
      getBusinessLocation(activeClient) ||
      marketReachContext;

    const detectedAudience = Array.isArray(scanData?.target_audience)
      ? scanData.target_audience.join(", ")
      : Array.isArray(activeClient.target_audience)
        ? activeClient.target_audience.join(", ")
        : marketReachContext;

    const detectedTone = scanData?.tone_of_voice || activeClient.tone_of_voice || "Professional";

    let campaign: any = null;
    let createdCampaignId: string | null = null;

    if (addToCampaignId) {
      const { data: existingCampaign, error: existingCampaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", addToCampaignId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingCampaignError) throwSupabaseError(existingCampaignError);

      if (!existingCampaign) {
        notify("Could not find the weekly post set to add to.", "error", "Weekly set not found");
        return;
      }

      campaign = existingCampaign;
    } else {
      const { data: newCampaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          user_id: userId,
          name: buildCampaignName(detectedBusinessName),
          business_type: detectedIndustry,
          location: detectedLocation,
          is_active: true,
          keywords: [],
          selected_keywords: [],
          client_id: activeClient.id,
          business_name: detectedBusinessName,
          target_audience: detectedAudience,
          campaign_idea: campaignIdea,
          audience: detectedAudience,
          drafts: totalPlatformPostsToCreate,
          scheduled: totalPlatformPostsToCreate,
          assets: uploadedMediaItems.length,
          posted: 0,
          launch_date: new Date().toISOString().split("T")[0],
          campaign_area: detectedLocation,
          tone: detectedTone,
          posting_frequency: `${totalPlatformPostsToCreate} posts`,
          platform_plan: `Destinations chosen during review. Available: Facebook, Instagram and Smilez. Market reach: ${marketReachContext}.`,
        })
        .select()
        .single();

      if (campaignError) throwSupabaseError(campaignError);

      campaign = newCampaign;
      createdCampaignId = newCampaign.id;
    }

    const suggestedScheduleSummary: string[] = [];

    updateCreationProgress("Creating your review board...");

    try {
      let createdPostIndex = 0;

      for (let i = 0; i < posts.length; i++) {
        const baseContentDayIndex = existingCampaignStats.contentDays + i;
        const contentDayNumber = baseContentDayIndex + 1;
        const mediaItem = uploadedMediaItems[i] || null;
        const baseGeneratedPost = posts[i];

        // Keep one internal platform value for existing scheduling/media behaviour.
        // The review page can still explicitly publish the same draft to Facebook
        // or Instagram, and can send suitable content to Smilez.
        const platformsForThisPost = [
          selectedPlatforms[baseContentDayIndex % selectedPlatforms.length] ||
            platformFallback[baseContentDayIndex % platformFallback.length] ||
            "Facebook",
        ];

        for (const selectedPlatform of platformsForThisPost) {
          const scheduleIndex = existingCampaignStats.contentDays + createdPostIndex;

          const post = normaliseGeneratedPost(
            {
              ...(typeof baseGeneratedPost === "string"
                ? { caption: baseGeneratedPost }
                : baseGeneratedPost),
              platform: selectedPlatform,
              day: `Post ${contentDayNumber}`,
              title: `Post ${contentDayNumber}`,
            },
            scheduleIndex,
            activeClient,
            detectedIndustry,
            detectedLocation
          );

          const suggestedPublishTime = getSuggestedPostTime(
            scheduleIndex,
            selectedPlatform,
            activeClient,
            detectedIndustry
          );

          suggestedPublishTime.setMinutes(
            suggestedPublishTime.getMinutes() + getPlatformScheduleOffsetMinutes(selectedPlatform)
          );

          suggestedScheduleSummary.push(
            `${selectedPlatform}: ${getReadableSuggestedTime(suggestedPublishTime)}`
          );

          const { error: postError } = await supabase.from("campaign_posts").insert({
            user_id: userId,
            campaign_id: campaign.id,
            keyword: detectedIndustry || "business",
            title: post.title,
            caption: post.caption,
            cta: post.cta,
            hashtags: post.hashtags,
            platform: selectedPlatform,
            type: source,
            scheduled_day: `Post ${contentDayNumber} ${selectedPlatform}`,
            scheduled_at: suggestedPublishTime.toISOString(),
            scheduled_publish_at: suggestedPublishTime.toISOString(),
            publish_status: "ready",
            status: "needs_review",
            is_posted: false,
            client_id: activeClient.id,
            image_prompt: post.image_prompt,
            media_url: mediaItem?.media_url || null,
            media_path: mediaItem?.media_path || null,
            media_type: mediaItem?.media_type || null,
            prepared_media_url: mediaItem?.converted_from_pdf ? mediaItem?.media_url || null : null,
            prepared_media_width: null,
            prepared_media_height: null,
            original_media_url: mediaItem?.original_media_url || null,
            original_media_path: mediaItem?.original_media_path || null,
            original_media_type: mediaItem?.original_media_type || null,
            converted_from_pdf: Boolean(mediaItem?.converted_from_pdf),
            conversion_warning: mediaItem?.conversion_warning || null,
            media_prepare_status:
              mediaItem?.media_prepare_status ||
              (mediaItem?.media_type === "image" ? "prepared" : "ready"),
            media_prepare_error: mediaItem?.media_prepare_error || null,
            media_prepared_at: mediaItem?.media_prepared_at || null,
            smiles_draft: post.smilesDraft || null,
            smiles_status: post.smilesDraft?.recommended
              ? "draft_ready"
              : "not_recommended",
            smiles_draft_id: null,
            smiles_table: null,
            smiles_sent_at: null,
            smiles_error: null,
            approval_status: "needs_review",
            approved_at: null,
            reach: 0,
            clicks: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            saves: 0,
          });

          if (postError) throwSupabaseError(postError);

          createdPostIndex += 1;
        }
      }
    } catch (postInsertError) {
      await deleteEmptyCampaignIfNeeded(createdCampaignId);
      throw postInsertError;
    }

    if (addToCampaignId) {
      await supabase
        .from("campaigns")
        .update({
          drafts: existingCampaignStats.postRecords + totalPlatformPostsToCreate,
          scheduled: existingCampaignStats.postRecords + totalPlatformPostsToCreate,
          assets: (Number(campaign.assets) || 0) + uploadedMediaItems.length,
          posting_frequency: `${existingCampaignStats.postRecords + totalPlatformPostsToCreate} posts`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id)
        .eq("user_id", userId);
    }

    if (source === "website_scan") {
      const admin = await isAdminUser(userId);

      if (!admin) {
        await recordUsageEvent(userId, "website_scan", {
          website: activeClient.website_url,
          client_id: activeClient.id,
          campaign_id: campaign.id,
          platforms: selectedPlatforms,
          postingFrequency: postCount,
          marketReach: marketReachContext,
          marketReachDisplayLabel,
          uploadedMediaCount: uploadedMediaItems.length,
          inlineImageMediaUsed,
          inlineVideoMediaUsed,
          suggestedSchedule: suggestedScheduleSummary,
        });
      }
    }

    const videoItems = uploadedMediaItems.filter((item) => item.media_type === "video");

    for (const videoItem of videoItems) {
      await recordUsageEvent(userId, "video_scan", {
        campaign_id: campaign.id,
        file_name: videoItem.file_name,
        media_path: videoItem.media_path,
        media_url: videoItem.media_url,
        inlineVideoMediaUsed,
        note: videoItem.note,
        context: videoItem.context,
        file_size: videoItem.file_size,
        content_type: videoItem.content_type,
      });
    }

    updateCreationProgress("Opening your review board...");

    localStorage.setItem("fromone_has_new_posts", "true");
    window.dispatchEvent(new Event("fromone-new-posts-updated"));

    await Promise.all([
      loadSavedCampaignCount(userId),
      loadWeeklyProgress(userId),
      loadScheduledPostStatus(userId),
    ]);

    navigatingToPostsRef.current = true;
    router.push(`/posts?created=true&campaign=${campaign.id}`);
  };

  const createManualDraft = async () => {
    navigatingToPostsRef.current = false;
    setCreationProgressMessage("Saving your draft...");
    setScanning(true);

    if (!ensureAccessAllowed()) {
      setScanning(false);
      return;
    }

    try {
      const activeClient = client;

      if (!activeClient?.business_name || !activeClient?.industry) {
        notify(
          "Set up the Business Profile in Settings first. Then come back here to create your post.",
          "warning",
          "Finish your business profile",
        );
        return;
      }

      if (!manualPostCaption.trim() && !manualPostTitle.trim()) {
        notify(
          "Add a caption or title before saving your manual draft.",
          "warning",
          "Post wording needed",
        );
        return;
      }

      if (weeklyUploads.length > 1) {
        notify(
          "Manual creation is one post at a time. Keep one image, video or flyer attached.",
          "warning",
          "One upload per manual post",
        );
        return;
      }

      const user = await getSafeAuthUser();
      const userId = user?.id;

      if (!userId) {
        notify("You need to sign in before saving posts.", "warning", "Sign in needed");
        return;
      }

      const weeklyPostLimitAllowed = await checkWeeklyPostAllowance(userId, 1);
      if (!weeklyPostLimitAllowed) return;

      const campaignLimitAllowed = addToCampaignId
        ? true
        : await checkSavedCampaignLimit(userId);

      if (!campaignLimitAllowed) return;

      const existingCampaignStats = addToCampaignId
        ? await getExistingCampaignStats(addToCampaignId)
        : { postRecords: 0, contentDays: 0 };

      if (addToCampaignId && existingCampaignStats.contentDays + 1 > 7) {
        notify(
          "This weekly set already has 7 content days. Start a new set before adding another post.",
          "warning",
          "Weekly set full",
        );
        return;
      }

      const uploadedMediaItems =
        weeklyUploads.length > 0 ? await uploadWeeklyMediaToStorage(userId) : [];
      const mediaItem = uploadedMediaItems[0] || null;

      const detectedBusinessName = activeClient.business_name || "Weekly Posts";
      const detectedIndustry = activeClient.industry || "General";
      const detectedLocation =
        activeClient.location ||
        getBusinessLocation(activeClient) ||
        getMarketReachContext(activeClient);
      const detectedAudience = Array.isArray(activeClient.target_audience)
        ? activeClient.target_audience.join(", ")
        : getMarketReachContext(activeClient);
      const detectedTone = activeClient.tone_of_voice || "Professional";

      let campaign: any = null;
      let createdCampaignId: string | null = null;

      if (addToCampaignId) {
        const { data: existingCampaign, error: existingCampaignError } = await supabase
          .from("campaigns")
          .select("*")
          .eq("id", addToCampaignId)
          .eq("user_id", userId)
          .maybeSingle();

        if (existingCampaignError) throwSupabaseError(existingCampaignError);

        if (!existingCampaign) {
          notify(
            "Could not find the weekly post set to add to.",
            "error",
            "Weekly set not found",
          );
          return;
        }

        campaign = existingCampaign;
      } else {
        const { data: newCampaign, error: campaignError } = await supabase
          .from("campaigns")
          .insert({
            user_id: userId,
            name: buildCampaignName(detectedBusinessName),
            business_type: detectedIndustry,
            location: detectedLocation,
            is_active: true,
            keywords: [],
            selected_keywords: [],
            client_id: activeClient.id,
            business_name: detectedBusinessName,
            target_audience: detectedAudience,
            campaign_idea: "Manual post",
            audience: detectedAudience,
            drafts: 1,
            scheduled: 1,
            assets: uploadedMediaItems.length,
            posted: 0,
            launch_date: new Date().toISOString().split("T")[0],
            campaign_area: detectedLocation,
            tone: detectedTone,
            posting_frequency: "1 post",
            platform_plan:
              "Manual draft. Destination chosen during review: Facebook, Instagram or Smilez.",
          })
          .select()
          .single();

        if (campaignError) throwSupabaseError(campaignError);

        campaign = newCampaign;
        createdCampaignId = newCampaign.id;
      }

      const contentDayNumber = existingCampaignStats.contentDays + 1;
      const scheduleIndex = existingCampaignStats.contentDays;
      const internalPlatform = "Facebook";
      const suggestedPublishTime = getSuggestedPostTime(
        scheduleIndex,
        internalPlatform,
        activeClient,
        detectedIndustry,
      );

      const hashtagArray = manualPostHashtags
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => (item.startsWith("#") ? item : `#${item}`));

      const title =
        manualPostTitle.trim() ||
        manualPostCaption.trim().split(/[.!?]/)[0]?.slice(0, 80) ||
        `Post ${contentDayNumber}`;

      const { error: postError } = await supabase.from("campaign_posts").insert({
        user_id: userId,
        campaign_id: campaign.id,
        keyword: detectedIndustry || "business",
        title,
        caption: manualPostCaption.trim(),
        cta: manualPostCta.trim(),
        hashtags: hashtagArray,
        platform: internalPlatform,
        type: "manual",
        scheduled_day: `Post ${contentDayNumber}`,
        scheduled_at: suggestedPublishTime.toISOString(),
        scheduled_publish_at: suggestedPublishTime.toISOString(),
        publish_status: "ready",
        status: "needs_review",
        is_posted: false,
        client_id: activeClient.id,
        image_prompt: "",
        media_url: mediaItem?.media_url || null,
        media_path: mediaItem?.media_path || null,
        media_type: mediaItem?.media_type || null,
        prepared_media_url:
          mediaItem?.converted_from_pdf ? mediaItem?.media_url || null : null,
        prepared_media_width: null,
        prepared_media_height: null,
        original_media_url: mediaItem?.original_media_url || null,
        original_media_path: mediaItem?.original_media_path || null,
        original_media_type: mediaItem?.original_media_type || null,
        converted_from_pdf: Boolean(mediaItem?.converted_from_pdf),
        conversion_warning: mediaItem?.conversion_warning || null,
        media_prepare_status:
          mediaItem?.media_prepare_status ||
          (mediaItem?.media_type === "image" ? "prepared" : "ready"),
        media_prepare_error: mediaItem?.media_prepare_error || null,
        media_prepared_at: mediaItem?.media_prepared_at || null,
        smiles_draft: null,
        smiles_status: "not_recommended",
        smiles_draft_id: null,
        smiles_table: null,
        smiles_sent_at: null,
        smiles_error: null,
        approval_status: "needs_review",
        approved_at: null,
        reach: 0,
        clicks: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      });

      if (postError) {
        await deleteEmptyCampaignIfNeeded(createdCampaignId);
        throwSupabaseError(postError);
      }

      if (addToCampaignId) {
        await supabase
          .from("campaigns")
          .update({
            drafts: existingCampaignStats.postRecords + 1,
            scheduled: existingCampaignStats.postRecords + 1,
            assets: (Number(campaign.assets) || 0) + uploadedMediaItems.length,
            posting_frequency: `${existingCampaignStats.postRecords + 1} posts`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", campaign.id)
          .eq("user_id", userId);
      }

      updateCreationProgress("Opening your review board...");

      localStorage.setItem("fromone_has_new_posts", "true");
      window.dispatchEvent(new Event("fromone-new-posts-updated"));

      await Promise.all([
        loadSavedCampaignCount(userId),
        loadWeeklyProgress(userId),
        loadScheduledPostStatus(userId),
      ]);

      navigatingToPostsRef.current = true;
      router.push(`/posts?created=true&campaign=${campaign.id}`);
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error("Manual draft error:", error);
      notify(message, "error");
    } finally {
      if (!navigatingToPostsRef.current) {
        setPreparingFlyers(false);
        setScanning(false);
        setCreationProgressMessage("");
      }
    }
  };

  const handleGeneratePosts = async () => {
    navigatingToPostsRef.current = false;
    setCreationProgressMessage("Getting your posts ready...");
    setScanning(true);

    if (!ensureAccessAllowed()) {
      setScanning(false);
      return;
    }

    try {
      const activeClient = client;

      if (!activeClient?.business_name || !activeClient?.industry) {
        notify("Set up the Business Profile in Settings first. Then come back here to upload media and create posts.", "warning", "Finish your business profile");
        setScanning(false);
        return;
      }

      await createCampaignFromProfile(activeClient, "manual_profile");
    } catch (error: any) {
      const message = getErrorMessage(error);

      console.error("Readable weekly posts error:", message);

      if (axios.isAxiosError(error)) {
        console.error("API response:", error.response?.data);
        console.error("API status:", error.response?.status);
      } else {
        console.error("Non-Axios weekly posts error:", error);
      }

      notify(message, "error");
    } finally {
      if (!navigatingToPostsRef.current) {
        setPreparingFlyers(false);
        setScanning(false);
        setCreationProgressMessage("");
      }
    }
  };

  const handleWeeklyUploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    const invalidFile = selectedFiles.find((file) => getWeeklyUploadUnsupportedReason(file));

    if (invalidFile) {
      notify(getWeeklyUploadUnsupportedReason(invalidFile), "warning", "Unsupported file");
      return;
    }

    setWeeklyUploads((currentUploads) => {
      const maxUploads = creationMode === "manual" ? 1 : 7;
      const remainingSlots = Math.max(maxUploads - currentUploads.length, 0);

      if (remainingSlots <= 0) {
        notify(
          creationMode === "manual"
            ? "Manual creation is one post at a time. Remove the current upload before choosing another."
            : "You can upload up to 7 items for one weekly post set.",
          "warning",
          "Upload limit reached",
        );
        return currentUploads;
      }

      const filesToAdd = selectedFiles.slice(0, remainingSlots);

      if (selectedFiles.length > remainingSlots) {
        notify(
          creationMode === "manual"
            ? "Manual creation uses one upload per post. Only the first file was added."
            : `Only ${remainingSlots} more upload${remainingSlots === 1 ? "" : "s"} can be added to this weekly set.`,
          "warning",
          "Upload limit reached",
        );
      }

      const nextUploads = [
        ...currentUploads,
        ...filesToAdd.map((file) => ({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          previewUrl: URL.createObjectURL(file),
          mediaType: getWeeklyUploadMediaType(file),
          note: "",
        })),
      ];

      setSelectedPostingFrequency(Math.max(1, Math.min(nextUploads.length, 7)));
      return nextUploads;
    });
  };

  const removeWeeklyUpload = (uploadId: string) => {
    setWeeklyUploads((currentUploads) => {
      const uploadToRemove = currentUploads.find((upload) => upload.id === uploadId);

      if (uploadToRemove) {
        URL.revokeObjectURL(uploadToRemove.previewUrl);
      }

      const nextUploads = currentUploads.filter((upload) => upload.id !== uploadId);
      setSelectedPostingFrequency(nextUploads.length > 0 ? Math.max(1, Math.min(nextUploads.length, 7)) : 3);
      return nextUploads;
    });
  };

  const updateWeeklyUploadNote = (uploadId: string, note: string) => {
    setWeeklyUploads((currentUploads) =>
      currentUploads.map((upload) =>
        upload.id === uploadId ? { ...upload, note } : upload
      )
    );
  };

  const handleSaveWebsiteOnly = async () => {
    if (!ensureAccessAllowed()) return;

    if (!websiteUrl.trim()) {
      notify("Please enter a website URL first.", "warning", "Website needed");
      return;
    }

    const savedClient = await saveWebsiteToProfile();

    if (savedClient) {
      notify("Website saved. Now upload photos, videos or flyers, then create posts.", "success", "Website saved");
    }
  };

  const togglePlatform = (platformName: string) => {
    const isOnlySelectedPlatform =
      selectedPlatforms.includes(platformName) && selectedPlatforms.length === 1;

    if (isOnlySelectedPlatform) {
      notify("Please choose at least one platform.", "warning", "Platform needed");
      return;
    }

    setSelectedPlatforms((currentPlatforms) => {
      if (currentPlatforms.includes(platformName)) {
        return currentPlatforms.filter((item) => item !== platformName);
      }

      return [...currentPlatforms, platformName];
    });
  };

  const selectRecommendedPlatforms = () => {
    setSelectedPlatforms(recommendedPlatforms);
  };

  const hasManualProfile = Boolean(client?.business_name && client?.industry);

  const onboardingSteps = [
    {
      label: "Add business profile",
      helper: "Business name and industry are saved.",
      complete: Boolean(client?.business_name && client?.industry),
      href: "/settings",
    },
    {
      label: "Upload media",
      helper: "Add a photo, video or flyer for this week's posts.",
      complete: weeklyUploads.length > 0,
      href: "#upload-media",
    },
    {
      label: "Choose platforms",
      helper: "Pick where FromOne should create posts.",
      complete: selectedPlatforms.length > 0,
      href: "#platforms",
    },
    {
      label: "Create posts",
      helper: "Generate your weekly review board.",
      complete: weeklyProgress.total > 0 || hasScheduledPost,
      href: "#create-posts",
    },
    {
      label: "Review posts",
      helper: "Open the posts page and approve, edit or publish.",
      complete: weeklyProgress.total > 0 || hasScheduledPost,
      href: "/posts",
    },
  ];

  const onboardingCompleteCount = onboardingSteps.filter((step) => step.complete).length;
  const onboardingIsComplete = onboardingCompleteCount === onboardingSteps.length;

  const hasWebsite = Boolean(websiteUrl.trim());
  const marketReachDisplayLabel = getMarketReachDisplayLabel(client);
  const marketReachContext = getMarketReachContext(client);

  const uploadDrivenPostCount = weeklyUploads.length;
  const createdPostTotal =
    creationMode === "manual"
      ? 1
      : uploadDrivenPostCount > 0
        ? uploadDrivenPostCount
        : 1;
  const uploadLabel =
    weeklyUploads.length > 0
      ? `${weeklyUploads.length} upload${weeklyUploads.length === 1 ? "" : "s"} added`
      : "business profile only";
  const creationModeTitle = "Guided post creation";
  const creationModeSummary =
    weeklyUploads.length > 0
      ? `FromOne will create ${createdPostTotal} planned post${createdPostTotal === 1 ? "" : "s"} using your uploaded media where it fits.`
      : `FromOne will create ${createdPostTotal} planned post${createdPostTotal === 1 ? "" : "s"} from your saved business profile.`;

  const selectedPlatformSummary =
    selectedPlatforms.length > 3
      ? `${selectedPlatforms.slice(0, 3).join(", ")} +${selectedPlatforms.length - 3} more`
      : selectedPlatforms.join(", ");

  const hasPaidPlan =
    billingPlan === "starter" || isPaidSubscription(accessInfo?.subscription_status);

  const weeklyScanLimit = hasPaidPlan ? PAID_WEEKLY_SCAN_LIMIT : DEMO_WEEKLY_SCAN_LIMIT;
  const weeklyScansRemaining = Math.max(weeklyScanLimit - weeklyScansUsed, 0);

  const weeklyVideoScanLimit = hasPaidPlan
    ? PAID_WEEKLY_VIDEO_SCAN_LIMIT
    : DEMO_WEEKLY_VIDEO_SCAN_LIMIT;
  const weeklyVideoScansRemaining = Math.max(weeklyVideoScanLimit - weeklyVideoScansUsed, 0);

  const weeklyPostLimit = weeklyPostAllowance.weeklyLimit;
  const weeklyPostsUsed = weeklyPostAllowance.postsUsed;
  const weeklyPostsRemaining = weeklyPostAllowance.postsRemaining;
  const weeklyPostAllowanceExceeded = createdPostTotal > weeklyPostsRemaining;

  const businessProfileReady = hasManualProfile;
  const canCreatePosts =
    businessProfileReady &&
    selectedPlatforms.length > 0 &&
    weeklyPostsRemaining > 0 &&
    !weeklyPostAllowanceExceeded &&
    !accessLocked &&
    !scanning &&
    !preparingFlyers;

  if (!dashboardMounted || loading) {
    return (
      <main
        className="fromone-create-page"
        data-create-page
        aria-busy="true"
        style={{
          width: "100%",
          minHeight: "calc(100vh - var(--fromone-nav-height, 92px))",
          margin: 0,
          padding: 0,
          background: "#f4f7fb",
          color: "#071b49",
        }}
      >
        <div
          className="create-page-shell"
          style={{
            width: "100%",
            maxWidth: "1240px",
            minHeight: "620px",
            margin: "0 auto",
            padding: 0,
            background: "#f4f7fb",
          }}
        >
          <BackToDashboardButton />

          <header
            className="create-topbar"
            style={{
              minHeight: "122px",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "24px",
              padding: "4px 0 24px",
              borderBottom: "1px solid #dce4f0",
            }}
          >
            <div style={{ width: "min(640px, 100%)" }}>
              <div
                style={{
                  width: "74px",
                  height: "12px",
                  marginBottom: "14px",
                  borderRadius: "999px",
                  background: "rgba(247, 37, 133, 0.14)",
                }}
              />
              <div
                style={{
                  width: "min(520px, 88%)",
                  height: "48px",
                  marginBottom: "14px",
                  borderRadius: "16px",
                  background: "rgba(7, 27, 73, 0.07)",
                }}
              />
              <div
                style={{
                  width: "min(590px, 96%)",
                  height: "16px",
                  borderRadius: "999px",
                  background: "rgba(102, 114, 138, 0.11)",
                }}
              />
            </div>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.65fr)",
              gap: "22px",
              marginTop: "24px",
            }}
          >
            {[0, 1].map((item) => (
              <section
                key={item}
                style={{
                  minHeight: item === 0 ? "420px" : "360px",
                  border: "1px solid #dce4f0",
                  borderRadius: "26px",
                  background: "rgba(255, 255, 255, 0.84)",
                  boxShadow: "0 18px 48px rgba(7, 27, 73, 0.08)",
                }}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="fromone-create-page" data-create-page>
      <div className="create-page-shell">
        <BackToDashboardButton />

        <header className="create-topbar">
          <div>
            <span className="create-kicker">Create</span>
            <h1>Make something worth sharing.</h1>
            <p>Upload your media, create your drafts, then choose where to publish during review.</p>
          </div>

          <div className="create-usage" aria-label="Creation allowance">
            <div>
              <span>Posts left</span>
              <strong>{weeklyPostsRemaining}/{weeklyPostLimit}</strong>
            </div>
            <div>
              <span>Saved sets</span>
              <strong>{savedCampaignsCount}/{MAX_SAVED_CAMPAIGNS}</strong>
            </div>
          </div>
        </header>

        <section className="create-mode-switcher" aria-label="Choose how to create your post">
          <button
            type="button"
            className={creationMode === "ai" ? "is-active" : ""}
            onClick={() => {
              setCreationMode("ai");
              setManualPostTitle("");
              setManualPostCaption("");
              setManualPostCta("");
              setManualPostHashtags("");
            }}
          >
            <strong>Create with AI</strong>
            <span>Upload your media and let FromOne create the first draft.</span>
          </button>

          <button
            type="button"
            className={creationMode === "manual" ? "is-active" : ""}
            onClick={() => {
              setCreationMode("manual");
              setWeeklyPostNote("");
              setWeeklyUploads((currentUploads) => {
                const [firstUpload, ...extraUploads] = currentUploads;
                extraUploads.forEach((upload) => URL.revokeObjectURL(upload.previewUrl));
                return firstUpload ? [firstUpload] : [];
              });
            }}
          >
            <strong>Create manually</strong>
            <span>Use your own image or video and write the post yourself. No AI scan.</span>
          </button>
        </section>

        {addToCampaignId && (
          <div className="create-inline-status">Adding these drafts to an existing weekly set.</div>
        )}

        {weeklyPostAllowanceExceeded && (
          <div className="create-alert">
            This would create {createdPostTotal} posts, but only {weeklyPostsRemaining} remain this week.
            Reduce the uploads.
          </div>
        )}

        <div className="create-workspace">
          <section className="create-media-workspace" aria-labelledby="create-media-title">
            <div className="create-section-heading">
              <div>
                <span className="create-step">1</span>
                <h2 id="create-media-title">Your media</h2>
              </div>
              <span className="create-file-count">
                {weeklyUploads.length} {weeklyUploads.length === 1 ? "item" : "items"}
              </span>
            </div>

            <label className="create-dropzone">
              <input
                type="file"
                accept="image/*,video/*,application/pdf"
                multiple
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  handleWeeklyUploadFiles(event.target.files);
                  event.target.value = "";
                }}
              />

              <span className="create-dropzone-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 16V4" />
                  <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
                  <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                </svg>
              </span>
              <strong>Drop photos, videos or flyers here</strong>
              <span>or tap to choose files</span>
              <small>JPG, PNG, WEBP, MP4, MOV or PDF</small>
            </label>

            <div className="create-mobile-capture">
              <button type="button" onClick={() => mobilePhotoInputRef.current?.click()}>
                Take photo
              </button>
              <button type="button" onClick={() => mobileVideoInputRef.current?.click()}>
                Record video
              </button>
              <button type="button" onClick={() => mobileFileInputRef.current?.click()}>
                Browse files
              </button>
            </div>

            <input
              ref={mobilePhotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="create-hidden-input"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                handleWeeklyUploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <input
              ref={mobileVideoInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="create-hidden-input"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                handleWeeklyUploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <input
              ref={mobileFileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              multiple
              className="create-hidden-input"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                handleWeeklyUploadFiles(event.target.files);
                event.target.value = "";
              }}
            />

            {weeklyUploads.length === 0 ? (
              <div className="create-empty-state">
                <strong>No media added yet</strong>
                <p>Each upload becomes its own draft, ready for you to review.</p>
              </div>
            ) : (
              <div className="create-media-grid">
                {weeklyUploads.map((upload, index) => (
                  <article key={upload.id} className="create-media-card">
                    <div className="create-media-preview">
                      <span className="create-media-number">{index + 1}</span>

                      {upload.file.type.startsWith("image/") ? (
                        <img src={upload.previewUrl} alt={`Upload ${index + 1}`} />
                      ) : upload.file.type.startsWith("video/") ? (
                        <video src={upload.previewUrl} muted playsInline controls />
                      ) : upload.file.type === "application/pdf" ? (
                        <PdfUploadPreview
                          file={upload.file}
                          label={`PDF flyer preview for upload ${index + 1}`}
                        />
                      ) : (
                        <strong>PDF flyer</strong>
                      )}

                      <button
                        type="button"
                        className="create-remove-media"
                        onClick={() => removeWeeklyUpload(upload.id)}
                        disabled={scanning}
                        aria-label={`Remove upload ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>

                    <div className="create-media-details">
                      <strong className="create-media-name">{upload.file.name}</strong>

                      {creationMode === "ai" ? (
                        <label>
                          <span>
                            {upload.mediaType === "flyer"
                              ? "Anything we should know?"
                              : `What is this ${upload.mediaType === "video" ? "video" : "image"} about?`}
                          </span>
                          <textarea
                            value={upload.note}
                            onChange={(event) =>
                              updateWeeklyUploadNote(upload.id, event.target.value)
                            }
                            disabled={scanning}
                            rows={3}
                            placeholder={
                              upload.mediaType === "flyer"
                                ? "Optional tone, audience or extra detail"
                                : "Example: New stock available in store today"
                            }
                          />
                        </label>
                      ) : (
                        <p className="create-manual-media-note">
                          This media will be attached as-is. FromOne will not scan it with AI.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="create-review-action" aria-labelledby="create-review-action-title">
            <div className="create-review-action-copy">
              <div>
                <span className="create-step">2</span>
                <div>
                  <h2 id="create-review-action-title">
                    {creationMode === "ai" ? "Create your drafts" : "Write your post"}
                  </h2>
                  <p>
                    {creationMode === "ai"
                      ? "One upload creates one review draft. Choose Facebook, Instagram or Smilez after you have checked the wording and media."
                      : "Write the post yourself. No AI scan is used. You can still choose Facebook, Instagram or Smilez on the review page."}
                  </p>
                </div>
              </div>

              <div className="create-review-destination-note" aria-label="Destinations available during review">
                <span>Facebook</span>
                <span>Instagram</span>
                <span>Smilez</span>
              </div>
            </div>

            {creationMode === "manual" && (
              <div className="create-manual-fields">
                <label>
                  <span>Post title <small>optional</small></span>
                  <input
                    type="text"
                    value={manualPostTitle}
                    onChange={(event) => setManualPostTitle(event.target.value)}
                    placeholder="Give your post a short title"
                    maxLength={120}
                    disabled={scanning}
                  />
                </label>

                <label className="create-manual-caption">
                  <span>Caption</span>
                  <textarea
                    value={manualPostCaption}
                    onChange={(event) => setManualPostCaption(event.target.value)}
                    placeholder="Write exactly what you want customers to see..."
                    rows={6}
                    disabled={scanning}
                  />
                </label>

                <div className="create-manual-field-grid">
                  <label>
                    <span>Call to action <small>optional</small></span>
                    <input
                      type="text"
                      value={manualPostCta}
                      onChange={(event) => setManualPostCta(event.target.value)}
                      placeholder="Book now, message us, visit today..."
                      disabled={scanning}
                    />
                  </label>

                  <label>
                    <span>Hashtags <small>optional</small></span>
                    <input
                      type="text"
                      value={manualPostHashtags}
                      onChange={(event) => setManualPostHashtags(event.target.value)}
                      placeholder="#Stockport #LocalBusiness"
                      disabled={scanning}
                    />
                  </label>
                </div>
              </div>
            )}

            {!businessProfileReady && (
              <div className="create-profile-prompt">
                <strong>Business profile needed</strong>
                <p>Add your business details before creating drafts.</p>
                <Link href="/settings?setup=business">Set up profile</Link>
              </div>
            )}

            {accessLocked && (
              <div className="create-profile-prompt is-locked">
                <strong>Access locked</strong>
                <p>{accessMessage}</p>
              </div>
            )}

            <div className="create-review-action-controls">
              <div className="create-summary">
                <div>
                  <span>Uploads</span>
                  <strong>{weeklyUploads.length}</strong>
                </div>
                <div>
                  <span>{creationMode === "ai" ? "Drafts" : "Draft"}</span>
                  <strong>{createdPostTotal}</strong>
                </div>
              </div>

              <button
                type="button"
                className="create-submit"
                onClick={creationMode === "ai" ? handleGeneratePosts : createManualDraft}
                disabled={
                  !canCreatePosts ||
                  savingWebsite ||
                  savingManualProfile ||
                  (creationMode === "manual" &&
                    !manualPostCaption.trim() &&
                    !manualPostTitle.trim())
                }
              >
                {creationProgressMessage
                  ? creationProgressMessage
                  : preparingFlyers
                    ? "Preparing media..."
                    : scanning
                      ? creationMode === "ai"
                        ? "Creating drafts..."
                        : "Saving draft..."
                      : addToCampaignId
                        ? "Add draft to set"
                        : creationMode === "ai"
                          ? "Create drafts"
                          : "Save manual draft"}
              </button>
            </div>

            <p className="create-review-note">
              {creationMode === "ai"
                ? "Nothing publishes immediately. You choose the destination on the review page."
                : "No AI is used for the wording or media. Review it, then choose where to publish."}
            </p>
          </section>
        </div>
      </div>

      {scanning && (
        <div className="create-loading-overlay" role="status" aria-live="polite">
          <section className="create-loading-card">
            <div className="create-loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className="create-kicker">
              {creationMode === "ai" ? "Creating drafts" : "Saving draft"}
            </span>
            <h2>{creationProgressMessage || (creationMode === "ai" ? "Building your posts." : "Saving your post.")}</h2>
            <p>
              {creationMode === "ai"
                ? "Your media and business details are being turned into drafts for review."
                : "Your post and media are being saved without an AI scan."}
            </p>
          </section>
        </div>
      )}

      <style jsx global>{`
        :root {
          --create-navy: #071b49;
          --create-pink: #f72585;
          --create-bg: #f4f7fb;
          --create-border: #dce4f0;
          --create-muted: #66728a;
        }

        body:has(.fromone-create-page),
        body:has(.fromone-create-page) .app-shell,
        body:has(.fromone-create-page) .main-content,
        body:has(.fromone-create-page) .main-content.fromone-mobile-bottom-safe,
        body:has(.fromone-create-page) .fromone-universal-mobile-page-frame {
          overflow-x: hidden;
          background: #ffffff !important;
          background-image: none !important;
        }

        body:has(.fromone-create-page) .main-content {
          color: #071b49 !important;
        }

        .fromone-create-page,
        .fromone-create-page * {
          box-sizing: border-box;
        }

        .fromone-create-page {
          width: 100%;
          min-width: 0;
          min-height: 0;
          margin: 0;
          padding: 0;
          color: var(--create-navy) !important;
          background: #ffffff !important;
          background-image: none !important;
        }

        .create-page-shell {
          width: 100%;
          max-width: 100%;
          margin: 0;
        }

        .create-topbar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 28px;
          margin-bottom: 26px;
        }

        .create-kicker {
          display: block;
          margin-bottom: 9px;
          color: var(--create-pink);
          font-size: 0.74rem;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .create-topbar h1 {
          max-width: 760px;
          margin: 0 0 10px;
          font-size: clamp(2.45rem, 4.5vw, 4.25rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
        }

        .create-topbar p {
          max-width: 670px;
          margin: 0;
          color: var(--create-muted);
          font-size: 1.02rem;
          line-height: 1.55;
        }

        .create-usage {
          display: flex;
          flex: 0 0 auto;
          gap: 10px;
        }

        .create-usage > div {
          min-width: 108px;
          padding: 13px 15px;
          border: 1px solid var(--create-border);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.88);
        }

        .create-usage span,
        .create-summary span {
          display: block;
          margin-bottom: 3px;
          color: var(--create-muted);
          font-size: 0.7rem;
          font-weight: 850;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .create-usage strong {
          font-size: 1.1rem;
        }

        .create-inline-status,
        .create-alert {
          margin-bottom: 16px;
          padding: 12px 14px;
          border: 1px solid #f8bfd7;
          border-radius: 14px;
          color: #9d174d;
          background: #fff4f9;
          font-size: 0.88rem;
          font-weight: 750;
          line-height: 1.45;
        }

        .create-mode-switcher {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0 20px;
        }

        .create-mode-switcher button {
          min-width: 0;
          display: grid;
          gap: 4px;
          padding: 16px 18px;
          text-align: left;
          border: 1px solid var(--create-border);
          border-radius: 18px;
          background: #ffffff;
          color: var(--create-navy);
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(7, 27, 73, 0.04);
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .create-mode-switcher button:hover {
          transform: translateY(-1px);
          border-color: rgba(247, 37, 133, 0.24);
        }

        .create-mode-switcher button.is-active {
          border-color: rgba(247, 37, 133, 0.42);
          background: #fff7fb;
          box-shadow: 0 10px 28px rgba(247, 37, 133, 0.1);
        }

        .create-mode-switcher strong {
          font-size: 0.9rem;
          font-weight: 950;
        }

        .create-mode-switcher span {
          color: var(--create-muted);
          font-size: 0.73rem;
          font-weight: 700;
          line-height: 1.4;
        }

        .create-manual-media-note {
          margin: 0;
          color: var(--create-muted);
          font-size: 0.72rem;
          font-weight: 700;
          line-height: 1.45;
        }

        .create-manual-fields {
          display: grid;
          gap: 12px;
          padding: 16px;
          border: 1px solid rgba(7, 27, 73, 0.08);
          border-radius: 18px;
          background: #f9fbff;
        }

        .create-manual-fields label {
          display: grid;
          gap: 7px;
        }

        .create-manual-fields label > span {
          color: var(--create-navy);
          font-size: 0.72rem;
          font-weight: 900;
        }

        .create-manual-fields label > span small {
          color: var(--create-muted);
          font-size: 0.65rem;
          font-weight: 700;
        }

        .create-manual-fields input,
        .create-manual-fields textarea {
          width: 100%;
          border: 1px solid rgba(7, 27, 73, 0.13);
          border-radius: 13px;
          background: #ffffff;
          color: var(--create-navy);
          font: inherit;
          font-size: 0.8rem;
          font-weight: 700;
          line-height: 1.45;
          outline: none;
        }

        .create-manual-fields input {
          min-height: 44px;
          padding: 0 12px;
        }

        .create-manual-fields textarea {
          min-height: 126px;
          padding: 11px 12px;
          resize: vertical;
        }

        .create-manual-fields input:focus,
        .create-manual-fields textarea:focus {
          border-color: rgba(247, 37, 133, 0.46);
          box-shadow: 0 0 0 3px rgba(247, 37, 133, 0.08);
        }

        .create-manual-field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .create-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          align-items: start;
          gap: 18px;
        }

        .create-media-workspace {
          min-width: 0;
        }

        .create-review-action {
          display: grid;
          gap: 14px;
          padding: 18px 20px;
          border: 1px solid var(--create-border);
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 12px 34px rgba(7, 27, 73, 0.055);
        }

        .create-review-action-copy {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .create-review-action-copy > div:first-child {
          min-width: 0;
          display: flex;
          align-items: flex-start;
          gap: 11px;
        }

        .create-review-action-copy h2 {
          margin: 0;
          color: var(--create-navy);
          font-size: 1.08rem;
          line-height: 1.2;
        }

        .create-review-action-copy p {
          max-width: 680px;
          margin: 4px 0 0;
          color: var(--create-muted);
          font-size: 0.82rem;
          font-weight: 700;
          line-height: 1.45;
        }

        .create-review-destination-note {
          flex: 0 0 auto;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
        }

        .create-review-destination-note span {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 9px;
          border: 1px solid rgba(247, 37, 133, 0.16);
          border-radius: 999px;
          background: #fff7fb;
          color: var(--create-navy);
          font-size: 0.66rem;
          font-weight: 900;
        }

        .create-review-action-controls {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(190px, 250px);
          align-items: stretch;
          gap: 12px;
        }

        .create-review-action .create-summary {
          margin: 0;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .create-review-action .create-submit {
          min-height: 100%;
        }

        .create-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .create-section-heading > div {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .create-step {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          border-radius: 12px;
          color: #fff;
          background: var(--create-pink);
          font-size: 0.78rem;
          font-weight: 900;
        }

        .create-section-heading h2 {
          margin: 0;
          font-size: 1.55rem;
          letter-spacing: -0.035em;
        }

        .create-file-count {
          color: var(--create-muted);
          font-size: 0.82rem;
          font-weight: 750;
        }

        .create-dropzone {
          display: grid;
          place-items: center;
          min-height: 260px;
          padding: 32px;
          border: 2px dashed #bfcadd;
          border-radius: 26px;
          background:
            linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,253,0.95));
          text-align: center;
          cursor: pointer;
          transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
        }

        .create-dropzone:hover {
          border-color: var(--create-pink);
          transform: translateY(-2px);
          box-shadow: 0 16px 38px rgba(7, 27, 73, 0.08);
        }

        .create-dropzone > input,
        .create-hidden-input {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        .create-dropzone-icon {
          display: grid;
          place-items: center;
          width: 62px;
          height: 62px;
          margin-bottom: 15px;
          border-radius: 20px;
          color: #fff;
          background: var(--create-navy);
          box-shadow: 0 14px 30px rgba(7, 27, 73, 0.18);
        }

        .create-dropzone-icon svg {
          width: 29px;
          height: 29px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .create-dropzone strong {
          display: block;
          margin-bottom: 6px;
          font-size: 1.25rem;
        }

        .create-dropzone > span:not(.create-dropzone-icon) {
          color: var(--create-muted);
          font-weight: 650;
        }

        .create-dropzone small {
          display: block;
          margin-top: 12px;
          color: #8893a8;
          font-size: 0.76rem;
        }

        .create-mobile-capture {
          display: none;
        }

        .create-empty-state {
          padding: 22px 8px 4px;
          text-align: center;
        }

        .create-empty-state strong {
          display: block;
          margin-bottom: 5px;
        }

        .create-empty-state p {
          margin: 0;
          color: var(--create-muted);
          font-size: 0.9rem;
        }

        .create-media-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 18px;
        }

        .create-media-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid var(--create-border);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 10px 28px rgba(7, 27, 73, 0.055);
        }

        .create-media-preview {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          overflow: hidden;
          background: #071124;
        }

        .create-media-preview img,
        .create-media-preview video,
        .create-media-preview canvas {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .create-media-number,
        .create-remove-media {
          position: absolute;
          top: 10px;
          z-index: 3;
          display: grid;
          place-items: center;
          min-width: 34px;
          height: 34px;
          border-radius: 11px;
          color: #fff;
          font-weight: 900;
        }

        .create-media-number {
          left: 10px;
          background: rgba(7, 27, 73, 0.9);
        }

        .create-remove-media {
          right: 10px;
          border: 0;
          background: rgba(190, 24, 93, 0.94);
          font-size: 1.3rem;
          cursor: pointer;
        }

        .create-media-details {
          padding: 15px;
        }

        .create-media-name {
          display: block;
          margin-bottom: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .create-media-details label {
          display: grid;
          gap: 7px;
        }

        .create-media-details label > span {
          font-size: 0.82rem;
          font-weight: 850;
        }

        .create-media-details textarea {
          width: 100%;
          min-width: 0;
          padding: 11px 12px;
          resize: vertical;
          border: 1px solid #d7dfeb;
          border-radius: 13px;
          color: var(--create-navy);
          background: #fbfcfe;
          font: inherit;
          font-size: 0.88rem;
          line-height: 1.45;
          outline: none;
        }

        .create-media-details textarea:focus {
          border-color: var(--create-pink);
          box-shadow: 0 0 0 3px rgba(247, 37, 133, 0.1);
        }

        .create-publish-panel {
          position: sticky;
          top: calc(var(--fromone-nav-height, 92px) + 22px);
          padding: 22px;
          border: 1px solid var(--create-border);
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 18px 44px rgba(7, 27, 73, 0.08);
        }

        .create-publish-heading {
          margin-bottom: 16px;
        }

        .create-destination-list {
          display: grid;
          gap: 10px;
        }

        .create-destination {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 72px;
          padding: 11px 12px;
          border: 1px solid #dfe5ef;
          border-radius: 17px;
          color: var(--create-navy);
          background: #f9fbfe;
          text-align: left;
          cursor: pointer;
        }

        .create-destination.is-selected {
          border-color: rgba(247, 37, 133, 0.42);
          background: #fff5fa;
        }

        .create-destination-badge {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 14px;
          color: #fff;
          background: var(--create-navy);
          font-size: 1.05rem;
          font-weight: 900;
        }

        .create-destination.is-selected .create-destination-badge {
          background: var(--create-pink);
        }

        .create-destination-copy {
          min-width: 0;
        }

        .create-destination-copy strong,
        .create-destination-copy small {
          display: block;
        }

        .create-destination-copy strong {
          margin-bottom: 3px;
          font-size: 0.94rem;
        }

        .create-destination-copy small {
          overflow: hidden;
          color: var(--create-muted);
          font-size: 0.74rem;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .create-switch {
          position: relative;
          width: 42px;
          height: 24px;
          border-radius: 999px;
          background: #cbd3df;
          transition: background 160ms ease;
        }

        .create-switch span {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 5px rgba(0,0,0,0.16);
          transition: transform 160ms ease;
        }

        .create-destination.is-selected .create-switch {
          background: var(--create-pink);
        }

        .create-destination.is-selected .create-switch span {
          transform: translateX(18px);
        }

        .create-profile-prompt {
          margin-top: 14px;
          padding: 14px;
          border: 1px solid #f2c5d8;
          border-radius: 15px;
          background: #fff7fb;
        }

        .create-profile-prompt.is-locked {
          border-color: #fecaca;
          background: #fff7f7;
        }

        .create-profile-prompt strong {
          display: block;
          margin-bottom: 4px;
          font-size: 0.88rem;
        }

        .create-profile-prompt p {
          margin: 0 0 10px;
          color: var(--create-muted);
          font-size: 0.78rem;
          line-height: 1.4;
        }

        .create-profile-prompt a {
          color: var(--create-pink);
          font-size: 0.8rem;
          font-weight: 900;
          text-decoration: none;
        }

        .create-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin: 18px 0 12px;
        }

        .create-summary > div {
          padding: 10px 8px;
          border-radius: 13px;
          background: #f2f5f9;
          text-align: center;
        }

        .create-summary strong {
          font-size: 1.05rem;
        }

        .create-submit {
          width: 100%;
          min-height: 54px;
          border: 0;
          border-radius: 999px;
          color: #fff;
          background: linear-gradient(135deg, var(--create-pink), #de176d);
          box-shadow: 0 12px 26px rgba(247, 37, 133, 0.24);
          font-size: 0.95rem;
          font-weight: 900;
          cursor: pointer;
        }

        .create-submit:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .create-review-note {
          margin: 11px 0 0;
          color: var(--create-muted);
          font-size: 0.75rem;
          line-height: 1.4;
          text-align: center;
        }

        .create-manage-link {
          display: block;
          margin-top: 12px;
          color: var(--create-navy);
          font-size: 0.76rem;
          font-weight: 800;
          text-align: center;
          text-decoration: underline;
        }

        .create-alert-small {
          margin: 12px 0 0;
          font-size: 0.78rem;
        }

        .create-loading-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(4, 12, 32, 0.72);
          backdrop-filter: blur(10px);
        }

        .create-loading-card {
          width: min(500px, 100%);
          padding: 30px;
          border-radius: 26px;
          background: #fff;
          box-shadow: 0 30px 80px rgba(0,0,0,0.28);
          text-align: center;
        }

        .create-loading-card h2 {
          margin: 4px 0 9px;
          font-size: clamp(1.5rem, 4vw, 2.1rem);
        }

        .create-loading-card p {
          margin: 0;
          color: var(--create-muted);
          line-height: 1.5;
        }

        .create-loading-dots {
          display: flex;
          justify-content: center;
          gap: 7px;
          margin-bottom: 18px;
        }

        .create-loading-dots span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--create-pink);
          animation: createBounce 800ms infinite alternate;
        }

        .create-loading-dots span:nth-child(2) { animation-delay: 150ms; }
        .create-loading-dots span:nth-child(3) { animation-delay: 300ms; }

        @keyframes createBounce {
          from { transform: translateY(0); opacity: 0.4; }
          to { transform: translateY(-6px); opacity: 1; }
        }

        @media (max-width: 1100px) {
          .create-workspace {
            grid-template-columns: minmax(0, 1fr) minmax(280px, 0.72fr);
            gap: 18px;
          }

          .create-publish-panel {
            padding: 18px;
          }
        }

        @media (max-width: 900px) {
          .fromone-create-page,
          .create-page-shell,
          .create-workspace,
          .create-media-workspace,
          .create-publish-panel {
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }

          .create-topbar {
            align-items: flex-start;
            flex-direction: column;
            gap: 18px;
          }

          .create-usage {
            width: 100%;
          }

          .create-mode-switcher {
            grid-template-columns: 1fr;
          }

          .create-manual-field-grid {
            grid-template-columns: 1fr;
          }

          .create-workspace {
            grid-template-columns: 1fr;
          }

          .create-review-action-copy {
            align-items: flex-start;
            flex-direction: column;
          }

          .create-review-destination-note {
            justify-content: flex-start;
          }

          .create-review-action-controls {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          body:has(.fromone-create-page),
          body:has(.fromone-create-page) .app-shell,
          body:has(.fromone-create-page) .main-content,
          body:has(.fromone-create-page) .main-content.fromone-mobile-bottom-safe,
          body:has(.fromone-create-page) .fromone-universal-mobile-page-frame,
          .fromone-create-page,
          .create-page-shell,
          .create-workspace {
            background: #ffffff !important;
            background-image: none !important;
          }

          .fromone-create-page {
            overflow-x: clip;
          }

          .create-page-shell {
            overflow: visible;
          }

          .create-topbar {
            gap: 14px;
            margin-bottom: 18px;
          }

          .create-kicker {
            margin-bottom: 6px;
            font-size: 0.68rem;
          }

          .create-topbar h1 {
            max-width: 100%;
            margin-bottom: 8px;
            font-size: clamp(2rem, 10vw, 2.65rem);
            line-height: 1;
            letter-spacing: -0.055em;
            overflow-wrap: anywhere;
          }

          .create-topbar p {
            max-width: 100%;
            font-size: 0.9rem;
            line-height: 1.46;
          }

          .create-usage {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .create-usage > div {
            min-width: 0;
            padding: 10px 12px;
            border-radius: 14px;
          }

          .create-usage span {
            font-size: 0.63rem;
          }

          .create-usage strong {
            font-size: 1rem;
          }

          .create-inline-status,
          .create-alert {
            padding: 11px 12px;
            font-size: 0.8rem;
          }

          .create-workspace {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .create-media-workspace {
            order: 1;
          }

          .create-review-action {
            order: 2;
            width: 100%;
            padding: 15px;
            border-radius: 19px;
          }

          .create-section-heading {
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
          }

          .create-section-heading > div {
            min-width: 0;
          }

          .create-section-heading h2 {
            font-size: 1.12rem;
          }

          .create-file-count {
            flex: 0 0 auto;
            font-size: 0.72rem;
          }

          .create-step {
            width: 31px;
            height: 31px;
            flex-basis: 31px;
            border-radius: 10px;
          }

          .create-dropzone {
            min-height: 178px;
            padding: 20px 14px;
            border-radius: 18px;
          }

          .create-dropzone-icon {
            width: 52px;
            height: 52px;
            margin-bottom: 13px;
            border-radius: 16px;
          }

          .create-dropzone strong {
            font-size: 1.02rem;
          }

          .create-dropzone > span:not(.create-dropzone-icon) {
            font-size: 0.83rem;
          }

          .create-dropzone small {
            margin-top: 9px;
            font-size: 0.69rem;
            line-height: 1.35;
          }

          .create-mobile-capture {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
            margin-top: 9px;
          }

          .create-mobile-capture button {
            width: 100%;
            min-width: 0;
            min-height: 42px;
            padding: 6px;
            border: 1px solid var(--create-border);
            border-radius: 12px;
            color: var(--create-navy);
            background: #fff;
            box-shadow: none;
            font-size: 0.69rem;
            font-weight: 850;
            line-height: 1.15;
          }

          .create-media-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-top: 14px;
          }

          .create-media-card {
            border-radius: 18px;
          }

          .create-media-preview {
            aspect-ratio: 16 / 11;
          }

          .create-media-details {
            padding: 13px;
          }

          .create-media-name {
            margin-bottom: 10px;
            font-size: 0.85rem;
          }

          .create-media-details textarea {
            min-height: 92px;
            font-size: 0.82rem;
          }

          .create-destination-list {
            gap: 9px;
          }

          .create-destination {
            grid-template-columns: 42px minmax(0, 1fr) auto;
            gap: 10px;
            min-height: 0;
            padding: 11px;
            border-radius: 15px;
          }

          .create-destination-badge {
            width: 42px;
            height: 42px;
            border-radius: 13px;
          }

          .create-destination-copy strong {
            font-size: 0.88rem;
          }

          .create-destination-copy small {
            white-space: normal;
            font-size: 0.7rem;
            line-height: 1.3;
          }

          .create-switch {
            transform: scale(0.92);
            transform-origin: right center;
          }

          .create-profile-prompt {
            padding: 12px;
          }

          .create-summary {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
            margin: 12px 0 10px;
          }

          .create-summary > div {
            min-width: 0;
            padding: 10px 5px;
            border-radius: 12px;
          }

          .create-summary span {
            font-size: 0.58rem;
            letter-spacing: 0.03em;
          }

          .create-summary strong {
            font-size: 1rem;
          }

          .create-submit {
            min-height: 50px;
            border-radius: 999px;
          }

          .create-review-note,
          .create-manage-link {
            font-size: 0.72rem;
            line-height: 1.4;
          }

          .create-loading-overlay {
            padding: 12px;
          }

          .create-loading-card {
            padding: 22px 16px;
            border-radius: 20px;
          }
        }

        @media (max-width: 420px) {
          .create-topbar h1 {
            font-size: 1.95rem;
          }

          .create-usage {
            grid-template-columns: 1fr;
          }

          .create-mobile-capture {
            grid-template-columns: 1fr;
          }

          .create-destination {
            grid-template-columns: 38px minmax(0, 1fr) auto;
            padding: 10px 9px;
          }

          .create-destination-badge {
            width: 38px;
            height: 38px;
          }

          .create-summary {
            grid-template-columns: 1fr;
          }

          .create-summary > div {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 11px;
          }

          .create-summary span {
            margin: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .fromone-create-page *,
          .create-loading-overlay * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}