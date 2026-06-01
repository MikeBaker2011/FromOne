"use client";

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
    name: "TikTok",
    shortName: "TikTok",
    description: "Copy and open TikTok manually for now.",
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

const defaultSelectedPlatforms = ["Facebook", "Instagram", "TikTok"];

const platformFallback = [
  "Facebook",
  "Instagram",
  "TikTok",
  "Facebook",
  "Instagram",
  "TikTok",
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

export default function DashboardPage() {
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

  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress>({
    total: 0,
    posted: 0,
    remaining: 0,
    nextPost: null,
  });

  const [socialConnections, setSocialConnections] = useState<any[]>([]);
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

  const mobilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const mobileVideoInputRef = useRef<HTMLInputElement | null>(null);
  const mobileFileInputRef = useRef<HTMLInputElement | null>(null);

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
  }, []);

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
        message: "Demo access is being prepared.",
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
        message: `Demo active until ${date}.`,
      };
    }

    return {
      locked: true,
      message:
        "Your 7-day demo has ended. You can still view existing posts, but creating new weekly posts is locked until access is extended or a subscription is active.",
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
    const { count, error } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading weekly post set count:", error.message);
      setSavedCampaignsCount(0);
      return 0;
    }

    const total = count || 0;
    setSavedCampaignsCount(total);
    return total;
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

  const loadSocialConnections = async (userId: string) => {
    try {
      const params = new URLSearchParams();
      params.set("user_id", userId);

      const response = await fetch(`/api/social-connections?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Could not load connected accounts.");
      }

      setSocialConnections(result?.connections || []);
    } catch (error: any) {
      console.error("Error loading connected accounts:", error?.message || error);
      setSocialConnections([]);
    }
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
      loadOrCreateAccess(userId),
      loadWeeklyProgress(userId),
      loadSocialConnections(userId),
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
          : `Your demo includes ${DEMO_WEEKLY_SCAN_LIMIT} website scan per 7 days. Use saved business details or upgrade to FromOne Monthly.`,
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
          : `Your demo includes ${DEMO_WEEKLY_VIDEO_SCAN_LIMIT} video scan per 7 days. You have ${remaining} video scan left.`,
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
        `You already have ${MAX_SAVED_CAMPAIGNS} saved weekly post sets. Delete an old or empty test set from Posts before creating a new one.`,
        "warning",
        "Saved set limit reached"
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
        cleanPlatform.includes("tiktok")
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

    return `${baseContext}. This is an image-led post. Analyse the image if available and make the visible subject the topic. Use the quick description as supporting context and the business profile for tone, CTA and local relevance.`;
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
        : Math.max(1, Math.min(selectedPostingFrequency, 7));

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
    const totalPlatformPostsToCreate =
      platformDistributionMode === "every_platform"
        ? contentDayCount * selectedPlatforms.length
        : contentDayCount;

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
      weeklyUploads.some((upload) => getWeeklyUploadMediaType(upload.file) === "flyer")
        ? "Reading flyer details and creating post wording..."
        : "Creating your post wording..."
    );

    const response = await axios.post("/api/generatePosts", {
      website: source === "website_scan" ? activeClient.website_url : "",
      clientName: activeClient.business_name,
      industry: activeClient.industry,
      description: `${buildBusinessDescription(activeClient)}

Weekly uploaded media count: ${uploadedMediaItems.length}.
This week's note from the user:
${weeklyPostNote.trim() || "No extra note supplied."}

If uploads are supplied:
- Post 1 must use Upload 1 as the topic.
- Post 2 must use Upload 2 as the topic.
- Continue one base post per upload.
- Use each upload's note/context/description field as the most important user context for that specific post.
- For videos, the API will try to send the actual video to Gemini. If available, the generated post must be about the visible footage itself, not a generic business message.
- For videos, write about the specific scene, action, atmosphere, event, product, service, job progress, result, behind-the-scenes moment, offer or booking/enquiry angle shown or strongly supported.
- If the model cannot inspect a video, it must use the quick description and filename carefully without pretending it saw exact details.
- Platform distribution mode: ${platformDistributionMode === "every_platform" ? "create each base post for every selected platform" : "split base posts across selected platforms"}.
- Do not only describe the image, flyer or video.
- Use the business profile to add quality, local angle, industry relevance, tone, CTA and sales angle.`,
      provider: "gemini",
      platforms: selectedPlatforms,
      postingFrequency: postCount,
      numberOfPosts: postCount,
      marketReach: marketReachContext,
      mediaItems: uploadedMediaItems,
      weeklyUploads: uploadedMediaItems,
      uploads: uploadedMediaItems,
      requestedOutput: {
        posts: `array of ${postCount} base post objects with day, platform, title, caption, cta, hashtags, image_prompt. Use only Facebook, Instagram and TikTok. If mediaItems are supplied, create one base post per media item in the same order. Platform distribution mode: ${platformDistributionMode}.`,
        selected_platforms: selectedPlatforms,
        market_reach: marketReachContext,
        uploaded_media: uploadedMediaItems,
        media_analysis_rule: "Use each upload context. For flyer/PDF uploads, read visible text/artwork and turn the flyer details into natural caption wording, CTA and hashtags. For video uploads, analyse the footage when available and write about the visible video moment. If footage cannot be inspected, use the quick description cautiously.",
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

    updateCreationProgress("Building your review board...");

    const posts: GeneratedPost[] = (response.data.posts || []).slice(0, postCount);
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
          platform_plan: `${buildPlatformPlanText(selectedPlatforms, totalPlatformPostsToCreate)}. Market reach: ${marketReachContext}. Platform mode: ${platformDistributionMode === "every_platform" ? "each post for every platform" : "split across platforms"}`,
        })
        .select()
        .single();

      if (campaignError) throwSupabaseError(campaignError);

      campaign = newCampaign;
      createdCampaignId = newCampaign.id;
    }

    const suggestedScheduleSummary: string[] = [];

    updateCreationProgress("Saving your weekly posts...");

    try {
      let createdPostIndex = 0;

      for (let i = 0; i < posts.length; i++) {
        const baseContentDayIndex = existingCampaignStats.contentDays + i;
        const contentDayNumber = baseContentDayIndex + 1;
        const mediaItem = uploadedMediaItems[i] || null;
        const baseGeneratedPost = posts[i];

        const platformsForThisPost =
          platformDistributionMode === "every_platform"
            ? selectedPlatforms
            : [
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
              title:
                platformDistributionMode === "every_platform"
                  ? `${selectedPlatform} Version ${contentDayNumber}`
                  : `${selectedPlatform} Post ${contentDayNumber}`,
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

    router.push(`/posts?created=true&campaign=${campaign.id}`);
  };

  const handleGeneratePosts = async () => {
    setCreationProgressMessage("Getting things ready...");
    setScanning(true);

    if (!ensureAccessAllowed()) {
      setScanning(false);
      return;
    }

    try {
      const activeClient = client;

      if (!activeClient?.business_name || !activeClient?.industry) {
        notify("Set up the Business Profile in Settings first. Then come back here to upload media and create posts.", "warning", "Business Profile needed");
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
      setPreparingFlyers(false);
      setScanning(false);
      setCreationProgressMessage("");
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
      const remainingSlots = Math.max(7 - currentUploads.length, 0);

      if (remainingSlots <= 0) {
        notify("You can upload up to 7 items for one weekly post set.", "warning", "Upload limit reached");
        return currentUploads;
      }

      const filesToAdd = selectedFiles.slice(0, remainingSlots);

      if (selectedFiles.length > remainingSlots) {
        notify(
          `Only ${remainingSlots} more upload${remainingSlots === 1 ? "" : "s"} can be added to this weekly set.`,
          "warning",
          "Upload limit reached"
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

      setSelectedPostingFrequency(Math.max(1, nextUploads.length));
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
      setSelectedPostingFrequency(nextUploads.length > 0 ? nextUploads.length : 3);
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
    setSelectedPlatforms((currentPlatforms) => {
      if (currentPlatforms.includes(platformName)) {
        if (currentPlatforms.length === 1) {
          notify("Please choose at least one platform.", "warning", "Platform needed");
          return currentPlatforms;
        }

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
  const effectivePostCount =
    uploadDrivenPostCount > 0 ? uploadDrivenPostCount : selectedPostingFrequency;
  const createdPostTotal =
    platformDistributionMode === "every_platform"
      ? effectivePostCount * selectedPlatforms.length
      : effectivePostCount;
  const uploadLabel =
    weeklyUploads.length > 0
      ? `${weeklyUploads.length} upload${weeklyUploads.length === 1 ? "" : "s"}`
      : `${effectivePostCount} planned post${effectivePostCount === 1 ? "" : "s"}`;
  const creationModeTitle =
    platformDistributionMode === "every_platform"
      ? "Every selected platform"
      : "Spread across the week";
  const creationModeSummary =
    platformDistributionMode === "every_platform"
      ? `${uploadLabel} × ${selectedPlatforms.length} platform${selectedPlatforms.length === 1 ? "" : "s"} = ${createdPostTotal} scheduled post${createdPostTotal === 1 ? "" : "s"}.`
      : `${uploadLabel} → ${createdPostTotal} scheduled post${createdPostTotal === 1 ? "" : "s"} spread across different days/platforms.`;

  const selectedPlatformSummary =
    selectedPlatforms.length > 3
      ? `${selectedPlatforms.slice(0, 3).join(", ")} +${selectedPlatforms.length - 3} more`
      : selectedPlatforms.join(", ");

  const primaryMetaConnection =
    socialConnections.find((connection) => connection.provider === "meta") || null;

  const hasFacebookConnection = Boolean(primaryMetaConnection?.page_id);
  const hasInstagramConnection = Boolean(primaryMetaConnection?.instagram_business_account_id);
  const hasPaidPlan =
    billingPlan === "starter" || isPaidSubscription(accessInfo?.subscription_status);

  const weeklyScanLimit = hasPaidPlan ? PAID_WEEKLY_SCAN_LIMIT : DEMO_WEEKLY_SCAN_LIMIT;
  const weeklyScansRemaining = Math.max(weeklyScanLimit - weeklyScansUsed, 0);

  const weeklyVideoScanLimit = hasPaidPlan
    ? PAID_WEEKLY_VIDEO_SCAN_LIMIT
    : DEMO_WEEKLY_VIDEO_SCAN_LIMIT;
  const weeklyVideoScansRemaining = Math.max(weeklyVideoScanLimit - weeklyVideoScansUsed, 0);

  const businessProfileReady = hasManualProfile;
  const canCreatePosts = businessProfileReady && weeklyUploads.length > 0 && selectedPlatforms.length > 0 && !accessLocked && !scanning && !preparingFlyers;

  if (!dashboardMounted || loading) {
    return (
      <main
        style={{
          width: "min(1120px, calc(100vw - 28px))",
          minHeight: "calc(100vh - 120px)",
          margin: "0 auto 56px",
          padding: "0 0 42px",
          display: "grid",
          placeItems: "center",
        }}
      >
        <section
          className="premium-card"
          style={{
            width: "min(100%, 560px)",
            padding: 28,
            borderRadius: 28,
            textAlign: "center",
          }}
        >
          <div className="page-eyebrow">FromOne</div>
          <h1
            className="page-title"
            style={{
              margin: "8px 0 10px",
              fontSize: "clamp(2rem, 6vw, 3rem)",
              lineHeight: 0.95,
            }}
          >
            Loading dashboard
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
            Getting your posts ready...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        width: "min(1120px, calc(100vw - 28px))",
        minHeight: "calc(100vh - 120px)",
        margin: "0 auto 56px",
        padding: "0 0 42px",
      }}
    >
      <style jsx global>{`        @media (max-width: 900px) {
          .dashboard-upload-file-name {
            display: none !important;
          }
        }

        @media (max-width: 900px) {
          .dashboard-final-card textarea::placeholder {
            color: rgba(248,250,252,0.42);
          }
        }

        .dashboard-mobile-capture-actions,
        .dashboard-mobile-capture-hidden-input {
          display: none;
        }


        @media (max-width: 760px) {
          .dashboard-final-card {
            padding: 22px 24px 26px !important;
            border-radius: 30px !important;
          }

          .dashboard-final-hero {
            margin-bottom: 16px !important;
          }

          .dashboard-final-hero .page-eyebrow {
            font-size: 0.72rem !important;
            letter-spacing: 0.13em !important;
          }

          .dashboard-final-hero h1 {
            font-size: clamp(2.1rem, 11vw, 3.1rem) !important;
            line-height: 0.92 !important;
            margin: 7px 0 10px !important;
          }

          .dashboard-final-hero p {
            font-size: 0.98rem !important;
            line-height: 1.55 !important;
          }

          .dashboard-add-to-set-pill {
            margin-top: 14px !important;
            padding: 9px 13px !important;
            font-size: 0.9rem !important;
          }

          .dashboard-upload-dropzone {
            min-height: 210px !important;
            padding: 22px 18px !important;
            border-radius: 28px !important;
          }

          .dashboard-mobile-capture-actions {
            width: 100%;
            display: grid !important;
            grid-template-columns: 1fr;
            gap: 10px;
            margin: 0 0 18px;
          }

          .dashboard-mobile-capture-actions button {
            width: 100%;
            min-height: 56px;
            border-radius: 18px;
            border: 1px solid rgba(255, 212, 59, 0.32);
            background: linear-gradient(135deg, #ffd43b, #f7b733);
            color: #101420;
            font-weight: 1000;
            font-size: 1rem;
            box-shadow: 0 16px 34px rgba(255, 212, 59, 0.16);
          }

          .dashboard-mobile-capture-actions button.secondary {
            background: rgba(255,255,255,0.075);
            color: #ffffff;
            border-color: rgba(255,255,255,0.14);
            box-shadow: none;
          }

          .dashboard-mobile-capture-hidden-input {
            display: none !important;
          }

          .dashboard-upload-icon {
            width: 62px !important;
            height: 62px !important;
            border-radius: 22px !important;
            font-size: 30px !important;
          }

          .dashboard-upload-dropzone strong {
            font-size: 1.35rem !important;
            line-height: 1.05 !important;
          }

          .dashboard-upload-dropzone span span:last-child {
            font-size: 0.92rem !important;
            line-height: 1.42 !important;
          }

          .dashboard-platform-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          .dashboard-platform-card {
            min-height: 0 !important;
            padding: 14px 16px !important;
            border-radius: 22px !important;
            display: grid !important;
            grid-template-columns: 42px minmax(0, 1fr) !important;
            column-gap: 12px !important;
            align-items: center !important;
          }

          .dashboard-platform-card > span:first-child {
            width: 38px !important;
            height: 38px !important;
            border-radius: 14px !important;
            margin: 0 !important;
            grid-row: span 2 !important;
          }

          .dashboard-platform-card strong {
            margin: 0 0 4px !important;
            font-size: 1.02rem !important;
          }

          .dashboard-platform-card small {
            font-size: 0.82rem !important;
            line-height: 1.35 !important;
          }

          .dashboard-summary-grid {
            grid-template-columns: 1fr !important;
            padding: 10px !important;
            gap: 8px !important;
          }

          .dashboard-summary-grid .card {
            padding: 11px 12px !important;
            border-radius: 16px !important;
          }

          .dashboard-platform-create-button {
            min-height: 64px !important;
            border-radius: 22px !important;
            font-size: 1.08rem !important;
          }


        }


/* Uploaded media preview: show full image instead of cropped banner */
.f1-weekly-upload-preview,
.f1-weekly-upload-media,
.f1-uploaded-media-preview,
.f1-upload-card-preview,
.f1-generated-post-media,
.f1-post-preview-media {
  background: #020617 !important;
  display: grid !important;
  place-items: center !important;
  overflow: hidden !important;
}

.f1-weekly-upload-preview img,
.f1-weekly-upload-media img,
.f1-uploaded-media-preview img,
.f1-upload-card-preview img,
.f1-generated-post-media img,
.f1-post-preview-media img {
  width: 100% !important;
  height: auto !important;
  max-height: 360px !important;
  object-fit: contain !important;
  object-position: center center !important;
  display: block !important;
  background: #020617 !important;
}

.f1-weekly-upload-preview video,
.f1-weekly-upload-media video,
.f1-uploaded-media-preview video,
.f1-upload-card-preview video,
.f1-generated-post-media video,
.f1-post-preview-media video {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  object-position: center center !important;
  background: #020617 !important;
}

@media (max-width: 760px) {
  .f1-weekly-upload-preview img,
  .f1-weekly-upload-media img,
  .f1-uploaded-media-preview img,
  .f1-upload-card-preview img,
  .f1-generated-post-media img,
  .f1-post-preview-media img {
    max-height: 300px !important;
  }
}



/* Weekly upload cards: image previews should not be cropped into a thin banner */
.weekly-upload-item img,
.weekly-upload-card img,
.weekly-media-card img,
.weekly-upload-preview img,
.upload-preview-card img,
.upload-media-preview img,
.post-upload-preview img,
.post-media-preview img {
  width: 100% !important;
  height: 100% !important;
  max-height: none !important;
  object-fit: contain !important;
  object-position: center center !important;
  display: block !important;
  background: #020617 !important;
}

.weekly-upload-item:has(img),
.weekly-upload-card:has(img),
.weekly-media-card:has(img),
.weekly-upload-preview:has(img),
.upload-preview-card:has(img),
.upload-media-preview:has(img),
.post-upload-preview:has(img),
.post-media-preview:has(img) {
  min-height: 260px !important;
  aspect-ratio: 4 / 3 !important;
  display: grid !important;
  place-items: center !important;
  overflow: hidden !important;
  background: #020617 !important;
}

.weekly-upload-item video,
.weekly-upload-card video,
.weekly-media-card video,
.weekly-upload-preview video,
.upload-preview-card video,
.upload-media-preview video,
.post-upload-preview video,
.post-media-preview video {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  object-position: center center !important;
  background: #020617 !important;
}

.weekly-upload-item:has(video),
.weekly-upload-card:has(video),
.weekly-media-card:has(video),
.weekly-upload-preview:has(video),
.upload-preview-card:has(video),
.upload-media-preview:has(video),
.post-upload-preview:has(video),
.post-media-preview:has(video) {
  min-height: 320px !important;
  display: grid !important;
  place-items: center !important;
  overflow: hidden !important;
  background: #020617 !important;
}

@media (max-width: 760px) {
  .weekly-upload-item:has(img),
  .weekly-upload-card:has(img),
  .weekly-media-card:has(img),
  .weekly-upload-preview:has(img),
  .upload-preview-card:has(img),
  .upload-media-preview:has(img),
  .post-upload-preview:has(img),
  .post-media-preview:has(img) {
    min-height: 220px !important;
  }
}



/* Mobile upload cards: stack previews full width */
@media (max-width: 760px) {
  .weekly-upload-list,
  .weekly-upload-grid,
  .f1-weekly-upload-list,
  .f1-weekly-upload-grid,
  .upload-preview-list,
  .upload-preview-grid,
  .f1-upload-preview-list,
  .f1-upload-preview-grid {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  .weekly-upload-item,
  .weekly-upload-card,
  .weekly-media-card,
  .upload-preview-card,
  .upload-media-preview,
  .post-upload-preview {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin-inline: 0 !important;
  }

  .weekly-upload-item > div:first-child,
  .weekly-upload-card > div:first-child,
  .weekly-media-card > div:first-child,
  .upload-preview-card > div:first-child,
  .upload-media-preview > div:first-child,
  .post-upload-preview > div:first-child {
    min-height: 220px !important;
    aspect-ratio: 4 / 3 !important;
  }

  .weekly-upload-item img,
  .weekly-upload-card img,
  .weekly-media-card img,
  .upload-preview-card img,
  .upload-media-preview img,
  .post-upload-preview img {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
    object-position: center center !important;
    background: #020617 !important;
  }

  .weekly-upload-item textarea,
  .weekly-upload-card textarea,
  .weekly-media-card textarea,
  .upload-preview-card textarea,
  .upload-media-preview textarea,
  .post-upload-preview textarea {
    min-height: 88px !important;
  }
}



/* Exact mobile weekly upload stack and overlay pill */
@media (max-width: 760px) {
  .dashboard-weekly-upload-grid {
    grid-template-columns: 1fr !important;
  }

  .dashboard-weekly-upload-grid > .card {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .dashboard-upload-post-pill {
    left: 10px !important;
    top: 10px !important;
    font-size: 11px !important;
    padding: 6px 10px !important;
  }
}


  .fromone-onboarding-card {
    margin: 0;
    padding: clamp(16px, 2.2vw, 22px);
    border-radius: 28px;
    background:
      radial-gradient(circle at top right, rgba(255, 212, 59, 0.11), transparent 34%),
      rgba(15, 23, 42, 0.68);
    border: 1px solid rgba(255, 212, 59, 0.18);
  }

  .fromone-onboarding-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 16px;
    align-items: start;
    margin-bottom: 14px;
  }

  .fromone-onboarding-head h2 {
    margin: 6px 0 6px;
    font-size: clamp(1.35rem, 2.7vw, 2.1rem);
    line-height: 1;
    letter-spacing: -0.045em;
  }

  .fromone-onboarding-head p {
    margin: 0;
    color: var(--muted);
    line-height: 1.45;
  }

  .fromone-onboarding-score {
    min-width: 78px;
    min-height: 68px;
    display: grid;
    place-items: center;
    align-content: center;
    border-radius: 22px;
    background: rgba(255, 212, 59, 0.12);
    border: 1px solid rgba(255, 212, 59, 0.28);
    color: #ffd43b;
  }

  .fromone-onboarding-score strong {
    display: block;
    font-size: 2rem;
    line-height: 0.9;
    letter-spacing: -0.06em;
  }

  .fromone-onboarding-score span {
    display: block;
    margin-top: 4px;
    color: rgba(248, 250, 252, 0.72);
    font-size: 0.76rem;
    font-weight: 900;
  }

  .fromone-onboarding-steps {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 9px;
  }

  .fromone-onboarding-steps a {
    min-width: 0;
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 9px;
    align-items: center;
    padding: 11px;
    border-radius: 17px;
    background: rgba(255, 255, 255, 0.055);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: inherit;
    text-decoration: none;
  }

  .fromone-onboarding-steps a > span {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.14);
    color: rgba(248, 250, 252, 0.84);
    font-weight: 950;
    border: 1px solid rgba(148, 163, 184, 0.22);
  }

  .fromone-onboarding-steps a > span.is-complete,
  .fromone-onboarding-steps a.is-complete > span {
    background: rgba(34, 197, 94, 0.14);
    color: #bbf7d0;
    border-color: rgba(34, 197, 94, 0.34);
  }

  .fromone-onboarding-steps strong {
    display: block;
    color: #ffffff;
    font-size: 0.82rem;
    line-height: 1.12;
  }

  .fromone-onboarding-steps small {
    display: block;
    margin-top: 4px;
    color: rgba(248, 250, 252, 0.62);
    line-height: 1.3;
    font-size: 0.72rem;
  }

  .dashboard-profile-needed-card {
    padding: 16px;
    border-radius: 22px;
    background: rgba(255, 212, 59, 0.1);
    border: 1px solid rgba(255, 212, 59, 0.24);
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
  }

  .dashboard-profile-needed-card strong {
    color: #ffffff;
  }

  .dashboard-profile-needed-card p {
    margin: 5px 0 0;
    color: var(--muted);
    line-height: 1.45;
  }

  .dashboard-profile-setup-button {
    min-height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 18px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(248, 250, 252, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.14);
    font-weight: 950;
    text-decoration: none;
    white-space: nowrap;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .dashboard-profile-setup-button:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 212, 59, 0.34);
    color: #ffffff;
  }

  @media (max-width: 1100px) {
    .fromone-onboarding-steps {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 680px) {
    .fromone-onboarding-head {
      grid-template-columns: 1fr;
    }

    .fromone-onboarding-score {
      width: 100%;
      min-height: 64px;
    }

    .fromone-onboarding-steps {
      grid-template-columns: 1fr;
    }

    .dashboard-profile-needed-card {
      display: grid;
      grid-template-columns: 1fr;
      text-align: center;
    }

    .dashboard-profile-setup-button {
      width: 100%;
    }
  }



  .dashboard-quick-start-cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin: 0;
  }

  .dashboard-quick-start-card {
    min-width: 0;
    display: grid;
    gap: 8px;
    align-content: start;
    padding: 18px;
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 36%),
      rgba(15, 23, 42, 0.62);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .dashboard-quick-start-card.is-active {
    border-color: rgba(255, 212, 59, 0.28);
    box-shadow: 0 18px 48px rgba(255, 212, 59, 0.06);
  }

  .dashboard-quick-start-card.is-complete {
    background:
      radial-gradient(circle at top right, rgba(61, 220, 151, 0.1), transparent 36%),
      rgba(15, 23, 42, 0.62);
    border-color: rgba(61, 220, 151, 0.2);
  }

  .dashboard-quick-start-card > span {
    width: 38px;
    height: 38px;
    display: inline-grid;
    place-items: center;
    border-radius: 14px;
    background: rgba(255, 212, 59, 0.12);
    color: #ffd43b;
    font-size: 0.8rem;
    font-weight: 1000;
  }

  .dashboard-quick-start-card.is-complete > span {
    background: rgba(61, 220, 151, 0.13);
    color: #bbf7d0;
  }

  .dashboard-quick-start-card strong {
    color: #ffffff;
    font-size: 1.04rem;
    line-height: 1.12;
  }

  .dashboard-quick-start-card p {
    margin: 0;
    color: rgba(248, 250, 252, 0.66);
    line-height: 1.38;
    font-size: 0.92rem;
    font-weight: 760;
  }

  .dashboard-quick-start-link {
    width: fit-content;
    min-height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.065);
    border: 1px solid rgba(255, 255, 255, 0.11);
    color: #ffe58a;
    font-size: 0.78rem;
    font-weight: 950;
    text-decoration: none;
  }

  .dashboard-quick-start-link:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 212, 59, 0.25);
  }

  @media (max-width: 920px) {
    .dashboard-quick-start-cards {
      grid-template-columns: 1fr;
    }
  }


  .dashboard-quick-start-card.is-active {
    animation: dashboardQuickCardPulse 1.9s ease-in-out infinite;
  }

  @keyframes dashboardQuickCardPulse {
    0%, 100% {
      border-color: rgba(255, 212, 59, 0.22);
      box-shadow: 0 18px 48px rgba(255, 212, 59, 0.04);
    }

    50% {
      border-color: rgba(255, 212, 59, 0.42);
      box-shadow:
        0 20px 54px rgba(255, 212, 59, 0.08),
        0 0 0 5px rgba(255, 212, 59, 0.045);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dashboard-quick-start-card.is-active {
      animation: none !important;
    }
  }


  /* Compact dashboard uploaded media cards */
  .dashboard-weekly-upload-grid {
    justify-content: center !important;
    align-items: start !important;
  }

  .dashboard-weekly-upload-grid > .card {
    max-width: 260px !important;
  }

  .dashboard-weekly-upload-grid > .card > div:first-child {
    min-height: 0 !important;
    height: 170px !important;
    aspect-ratio: 4 / 3 !important;
  }

  .dashboard-weekly-upload-grid > .card img,
  .dashboard-weekly-upload-grid > .card video,
  .dashboard-weekly-upload-grid > .card canvas {
    width: 100% !important;
    height: 100% !important;
    max-height: 170px !important;
    object-fit: contain !important;
    object-position: center !important;
    background: #020617 !important;
  }

  .dashboard-weekly-upload-grid textarea {
    min-height: 68px !important;
  }

  @media (max-width: 760px) {
    .dashboard-weekly-upload-grid > .card {
      max-width: 100% !important;
    }

    .dashboard-weekly-upload-grid > .card > div:first-child {
      height: 220px !important;
    }

    .dashboard-weekly-upload-grid > .card img,
    .dashboard-weekly-upload-grid > .card video,
    .dashboard-weekly-upload-grid > .card canvas {
      max-height: 220px !important;
    }
  }


  /* Left align uploaded media cards */
  .dashboard-weekly-upload-grid {
    justify-content: start !important;
  }

  @media (max-width: 760px) {
    .dashboard-weekly-upload-grid {
      justify-content: stretch !important;
    }
  }


  /* Cleaner upload plus button */
  .dashboard-upload-dropzone > span > span:first-child {
    width: 58px !important;
    height: 58px !important;
    min-width: 58px !important;
    min-height: 58px !important;
    max-width: 58px !important;
    max-height: 58px !important;
    padding: 0 !important;
    border-radius: 18px !important;
    display: inline-grid !important;
    place-items: center !important;
    font-size: 1.75rem !important;
    line-height: 1 !important;
    box-shadow: 0 14px 34px rgba(255, 212, 59, 0.18) !important;
  }

  .dashboard-upload-dropzone {
    min-height: 210px !important;
  }

  @media (max-width: 760px) {
    .dashboard-upload-dropzone > span > span:first-child {
      width: 54px !important;
      height: 54px !important;
      min-width: 54px !important;
      min-height: 54px !important;
      max-width: 54px !important;
      max-height: 54px !important;
      border-radius: 17px !important;
      font-size: 1.6rem !important;
    }

    .dashboard-upload-dropzone {
      min-height: 190px !important;
    }
  }


  /* Clean upload dropzone camera controls */
  .dashboard-mobile-capture-actions {
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 10px !important;
    margin-bottom: 14px !important;
  }

  .dashboard-mobile-capture-actions button {
    min-width: 104px !important;
    min-height: 42px !important;
    padding: 0 14px !important;
    border-radius: 16px !important;
    font-size: 0.9rem !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
  }

  .dashboard-upload-dropzone > span {
    display: grid !important;
    justify-items: center !important;
    gap: 10px !important;
  }

  .dashboard-upload-dropzone > span > span:first-child:not(.dashboard-mobile-capture-actions) {
    width: 58px !important;
    height: 58px !important;
    min-width: 58px !important;
    min-height: 58px !important;
    max-width: 58px !important;
    max-height: 58px !important;
    padding: 0 !important;
    border-radius: 18px !important;
    display: inline-grid !important;
    place-items: center !important;
    font-size: 1.75rem !important;
    line-height: 1 !important;
  }

  @media (min-width: 761px) {
    .dashboard-mobile-capture-actions {
      display: none !important;
    }
  }

  @media (max-width: 760px) {
    .dashboard-mobile-capture-actions {
      display: flex !important;
    }

    .dashboard-mobile-capture-actions button {
      min-width: 96px !important;
      min-height: 40px !important;
      border-radius: 15px !important;
      font-size: 0.84rem !important;
    }
  }


  /* Hide mobile capture buttons on desktop */
  .dashboard-mobile-capture-actions {
    display: none !important;
  }

  @media (max-width: 760px) {
    .dashboard-mobile-capture-actions {
      display: flex !important;
      flex-wrap: wrap !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 10px !important;
      margin-bottom: 12px !important;
    }

    .dashboard-mobile-capture-actions button {
      min-width: 96px !important;
      min-height: 40px !important;
      padding: 0 14px !important;
      border-radius: 15px !important;
      font-size: 0.84rem !important;
      line-height: 1.05 !important;
      white-space: nowrap !important;
    }
  }


  /* Premium upload dropzone redesign */
  .dashboard-upload-dropzone {
    min-height: 190px !important;
    border-radius: 30px !important;
    border: 1px dashed rgba(255, 212, 59, 0.34) !important;
    background:
      radial-gradient(circle at top, rgba(255, 212, 59, 0.11), transparent 36%),
      rgba(15, 23, 42, 0.58) !important;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      background 160ms ease,
      box-shadow 160ms ease !important;
  }

  .dashboard-upload-dropzone:hover {
    transform: translateY(-1px) !important;
    border-color: rgba(255, 212, 59, 0.58) !important;
    background:
      radial-gradient(circle at top, rgba(255, 212, 59, 0.16), transparent 38%),
      rgba(15, 23, 42, 0.66) !important;
    box-shadow: 0 22px 60px rgba(255, 212, 59, 0.075) !important;
  }

  .dashboard-upload-dropzone > span {
    display: grid !important;
    justify-items: center !important;
    gap: 12px !important;
  }

  .dashboard-upload-dropzone > span > span:first-child:not(.dashboard-mobile-capture-actions) {
    width: auto !important;
    height: auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #ffd43b !important;
    font-size: 0 !important;
    line-height: 0 !important;
  }

  .dashboard-upload-dropzone > span > span:first-child:not(.dashboard-mobile-capture-actions)::before {
    content: "Click here to upload";
    min-height: 54px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 22px;
    border-radius: 18px;
    background: linear-gradient(135deg, #ffd43b, #f7b733);
    color: #101420;
    font-size: 1rem;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.01em;
    box-shadow: 0 16px 38px rgba(255, 212, 59, 0.18);
  }

  .dashboard-upload-dropzone > span > strong,
  .dashboard-upload-dropzone h2,
  .dashboard-upload-dropzone h3 {
    margin-top: 2px !important;
  }

  .dashboard-mobile-capture-actions {
    display: none !important;
  }

  @media (max-width: 760px) {
    .dashboard-upload-dropzone {
      min-height: 220px !important;
      border-radius: 26px !important;
    }

    .dashboard-mobile-capture-actions {
      display: flex !important;
      flex-wrap: wrap !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 10px !important;
      margin-bottom: 10px !important;
    }

    .dashboard-mobile-capture-actions button {
      min-width: 96px !important;
      min-height: 40px !important;
      padding: 0 14px !important;
      border-radius: 15px !important;
      font-size: 0.84rem !important;
      line-height: 1.05 !important;
      white-space: nowrap !important;
    }

    .dashboard-upload-dropzone > span > span:first-child:not(.dashboard-mobile-capture-actions)::before {
      content: "+";
      width: 54px;
      height: 54px;
      min-height: 54px;
      padding: 0;
      border-radius: 17px;
      font-size: 1.6rem;
    }
  }


  /* Agency-standard dashboard redesign */
  .dashboard-shell,
  main.dashboard-shell,
  main[data-dashboard-page],
  .dashboard-page {
    background:
      radial-gradient(circle at 50% 0%, rgba(255, 212, 59, 0.075), transparent 34%),
      radial-gradient(circle at 84% 12%, rgba(61, 220, 151, 0.055), transparent 30%),
      #050914 !important;
  }

  .dashboard-hero-card,
  .dashboard-main-card,
  .dashboard-create-card {
    border-radius: 34px !important;
  }

  .dashboard-quick-start-cards {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 14px !important;
    margin: 22px 0 18px !important;
  }

  .dashboard-quick-start-card {
    min-height: 132px !important;
    display: grid !important;
    align-content: start !important;
    gap: 9px !important;
    padding: 18px !important;
    border-radius: 24px !important;
    background:
      radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 38%),
      rgba(15, 23, 42, 0.66) !important;
    border: 1px solid rgba(255, 255, 255, 0.10) !important;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.16) !important;
  }

  .dashboard-quick-start-card.is-active {
    border-color: rgba(255, 212, 59, 0.34) !important;
    box-shadow:
      0 20px 54px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(255, 212, 59, 0.08) inset !important;
  }

  .dashboard-quick-start-card.is-complete {
    background:
      radial-gradient(circle at top right, rgba(61, 220, 151, 0.10), transparent 38%),
      rgba(15, 23, 42, 0.66) !important;
    border-color: rgba(61, 220, 151, 0.22) !important;
  }

  .dashboard-quick-start-card > span {
    width: 34px !important;
    height: 34px !important;
    display: inline-grid !important;
    place-items: center !important;
    border-radius: 13px !important;
    background: rgba(255, 212, 59, 0.12) !important;
    color: #ffd43b !important;
    font-size: 0.74rem !important;
    font-weight: 1000 !important;
  }

  .dashboard-quick-start-card.is-complete > span {
    background: rgba(61, 220, 151, 0.14) !important;
    color: #bbf7d0 !important;
  }

  .dashboard-quick-start-card strong {
    color: #ffffff !important;
    font-size: 1.04rem !important;
    line-height: 1.08 !important;
    letter-spacing: -0.02em !important;
  }

  .dashboard-quick-start-card p {
    margin: 0 !important;
    color: rgba(248, 250, 252, 0.66) !important;
    line-height: 1.38 !important;
    font-size: 0.9rem !important;
    font-weight: 760 !important;
  }

  .dashboard-quick-start-link {
    width: fit-content !important;
    min-height: 32px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin-top: 2px !important;
    padding: 0 12px !important;
    border-radius: 999px !important;
    background: rgba(255, 255, 255, 0.065) !important;
    border: 1px solid rgba(255, 255, 255, 0.11) !important;
    color: #ffe58a !important;
    font-size: 0.76rem !important;
    font-weight: 950 !important;
    text-decoration: none !important;
  }

  .dashboard-upload-dropzone {
    min-height: 260px !important;
    border-radius: 32px !important;
    border: 1px dashed rgba(255, 212, 59, 0.36) !important;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.012)),
      radial-gradient(circle at 50% 0%, rgba(255, 212, 59, 0.14), transparent 38%),
      rgba(15, 23, 42, 0.62) !important;
    box-shadow:
      0 22px 70px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.025) inset !important;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      background 160ms ease,
      box-shadow 160ms ease !important;
  }

  .dashboard-upload-dropzone:hover {
    transform: translateY(-2px) !important;
    border-color: rgba(255, 212, 59, 0.62) !important;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.018)),
      radial-gradient(circle at 50% 0%, rgba(255, 212, 59, 0.19), transparent 40%),
      rgba(15, 23, 42, 0.70) !important;
    box-shadow:
      0 26px 80px rgba(0, 0, 0, 0.24),
      0 0 0 1px rgba(255, 212, 59, 0.08) inset !important;
  }

  .dashboard-upload-dropzone > span {
    display: grid !important;
    justify-items: center !important;
    gap: 12px !important;
  }

  .dashboard-upload-dropzone > span > span:first-child:not(.dashboard-mobile-capture-actions) {
    width: auto !important;
    height: auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: transparent !important;
    font-size: 0 !important;
    line-height: 0 !important;
  }

  .dashboard-upload-dropzone > span > span:first-child:not(.dashboard-mobile-capture-actions)::before {
    content: "Click here to upload";
    min-height: 58px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 26px !important;
    border-radius: 19px !important;
    background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
    color: #101420 !important;
    font-size: 1.02rem !important;
    line-height: 1 !important;
    font-weight: 1000 !important;
    letter-spacing: -0.01em !important;
    box-shadow: 0 18px 44px rgba(255, 212, 59, 0.18) !important;
  }

  .dashboard-mobile-capture-actions {
    display: none !important;
  }

  .dashboard-weekly-upload-grid {
    justify-content: start !important;
    align-items: start !important;
    grid-template-columns: repeat(auto-fill, minmax(220px, 260px)) !important;
  }

  .dashboard-weekly-upload-grid > .card {
    max-width: 260px !important;
    border-radius: 24px !important;
    background:
      radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 36%),
      rgba(255, 255, 255, 0.058) !important;
    border: 1px solid rgba(255, 255, 255, 0.10) !important;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.16) !important;
  }

  .dashboard-weekly-upload-grid > .card > div:first-child {
    min-height: 0 !important;
    height: 170px !important;
    aspect-ratio: 4 / 3 !important;
    border-radius: 18px !important;
  }

  .dashboard-weekly-upload-grid > .card img,
  .dashboard-weekly-upload-grid > .card video,
  .dashboard-weekly-upload-grid > .card canvas {
    width: 100% !important;
    height: 100% !important;
    max-height: 170px !important;
    object-fit: contain !important;
    object-position: center !important;
    background: #020617 !important;
  }

  .dashboard-weekly-upload-grid textarea {
    min-height: 68px !important;
    border-radius: 15px !important;
  }

  @media (max-width: 920px) {
    .dashboard-quick-start-cards {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 760px) {
    .dashboard-upload-dropzone {
      min-height: 230px !important;
      border-radius: 28px !important;
    }

    .dashboard-mobile-capture-actions {
      display: flex !important;
      flex-wrap: wrap !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 10px !important;
      margin-bottom: 10px !important;
    }

    .dashboard-mobile-capture-actions button {
      min-width: 96px !important;
      min-height: 40px !important;
      padding: 0 14px !important;
      border-radius: 15px !important;
      font-size: 0.84rem !important;
      line-height: 1.05 !important;
      white-space: nowrap !important;
    }

    .dashboard-upload-dropzone > span > span:first-child:not(.dashboard-mobile-capture-actions)::before {
      content: "+";
      width: 54px !important;
      height: 54px !important;
      min-height: 54px !important;
      padding: 0 !important;
      border-radius: 17px !important;
      font-size: 1.6rem !important;
    }

    .dashboard-weekly-upload-grid {
      grid-template-columns: 1fr !important;
    }

    .dashboard-weekly-upload-grid > .card {
      max-width: 100% !important;
    }

    .dashboard-weekly-upload-grid > .card > div:first-child {
      height: 220px !important;
    }

    .dashboard-weekly-upload-grid > .card img,
    .dashboard-weekly-upload-grid > .card video,
    .dashboard-weekly-upload-grid > .card canvas {
      max-height: 220px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dashboard-upload-dropzone,
    .dashboard-quick-start-card.is-active {
      animation: none !important;
      transition: none !important;
      transform: none !important;
    }
  }


  /* Centre the upload plus icon */
  .dashboard-upload-dropzone > span > span:first-child:not(.dashboard-mobile-capture-actions)::before {
    display: inline-grid !important;
    place-items: center !important;
    text-align: center !important;
    line-height: 1 !important;
  }

  @media (max-width: 760px) {
    .dashboard-upload-dropzone > span > span:first-child:not(.dashboard-mobile-capture-actions)::before {
      display: inline-grid !important;
      place-items: center !important;
      text-align: center !important;
      line-height: 1 !important;
    }
  }


  /* Final upload icon and mobile button fix */
  .dashboard-upload-icon {
    display: inline-grid !important;
    place-items: center !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    line-height: 1 !important;
    padding: 0 !important;
  }

  .dashboard-mobile-capture-actions {
    display: none !important;
  }

  .dashboard-mobile-capture-hidden-input {
    display: none !important;
  }

  @media (max-width: 760px) {
    .dashboard-mobile-capture-actions {
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 10px !important;
      width: 100% !important;
      margin: 0 0 16px !important;
    }

    .dashboard-mobile-capture-actions button {
      width: 100% !important;
      min-height: 52px !important;
      border-radius: 18px !important;
    }

    .dashboard-upload-icon {
      width: 62px !important;
      height: 62px !important;
      border-radius: 22px !important;
      font-size: 30px !important;
    }
  }


  /* Final: mobile capture buttons only on real mobile/touch devices */
  .dashboard-mobile-capture-actions {
    display: none !important;
    visibility: hidden !important;
  }

  .dashboard-mobile-capture-hidden-input {
    display: none !important;
  }

  @media (hover: none) and (pointer: coarse) and (max-width: 760px) {
    .dashboard-mobile-capture-actions {
      display: grid !important;
      visibility: visible !important;
      grid-template-columns: 1fr !important;
      gap: 10px !important;
      width: 100% !important;
      margin: 0 0 16px !important;
    }

    .dashboard-mobile-capture-actions button {
      width: 100% !important;
      min-height: 52px !important;
      border-radius: 18px !important;
    }
  }

  .dashboard-upload-icon {
    display: inline-grid !important;
    place-items: center !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    line-height: 1 !important;
    padding: 0 !important;
  }


  /* Final responsive capture controls */
  .dashboard-mobile-capture-actions {
    display: none !important;
    visibility: hidden !important;
  }

  .dashboard-mobile-capture-hidden-input {
    display: none !important;
  }

  @media (max-width: 760px) {
    .dashboard-mobile-capture-actions {
      display: grid !important;
      visibility: visible !important;
      grid-template-columns: 1fr !important;
      gap: 10px !important;
      width: 100% !important;
      margin: 0 0 16px !important;
    }

    .dashboard-mobile-capture-actions button {
      width: 100% !important;
      min-height: 52px !important;
      border-radius: 18px !important;
      padding: 0 14px !important;
      font-size: 0.95rem !important;
      line-height: 1.05 !important;
      white-space: nowrap !important;
    }
  }

  @media (min-width: 761px) {
    .dashboard-mobile-capture-actions {
      display: none !important;
      visibility: hidden !important;
    }
  }

  .dashboard-upload-icon {
    display: inline-grid !important;
    place-items: center !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    line-height: 1 !important;
    padding: 0 !important;
  }


  /* Final clean mobile upload area */
  .dashboard-mobile-capture-actions {
    display: none !important;
    visibility: hidden !important;
  }

  .dashboard-mobile-capture-hidden-input {
    display: none !important;
  }

  .dashboard-upload-icon {
    display: inline-grid !important;
    place-items: center !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    line-height: 1 !important;
    padding: 0 !important;
  }

  @media (min-width: 761px) {
    .dashboard-mobile-capture-actions {
      display: none !important;
      visibility: hidden !important;
    }

    .dashboard-upload-icon {
      display: inline-grid !important;
    }
  }

  @media (max-width: 760px) {
    .dashboard-upload-dropzone {
      min-height: 0 !important;
      padding: 22px 18px !important;
      border-radius: 28px !important;
    }

    .dashboard-upload-dropzone > span {
      width: 100% !important;
      max-width: 420px !important;
      display: grid !important;
      gap: 14px !important;
      justify-items: stretch !important;
    }

    .dashboard-mobile-capture-actions {
      display: grid !important;
      visibility: visible !important;
      grid-template-columns: 1fr !important;
      gap: 10px !important;
      width: 100% !important;
      margin: 0 !important;
      order: 1 !important;
    }

    .dashboard-mobile-capture-actions button {
      width: 100% !important;
      min-height: 52px !important;
      padding: 0 16px !important;
      border-radius: 18px !important;
      border: 1px solid rgba(255, 212, 59, 0.34) !important;
      background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
      color: #101420 !important;
      font-size: 0.98rem !important;
      line-height: 1.05 !important;
      font-weight: 1000 !important;
      white-space: nowrap !important;
      box-shadow: 0 16px 34px rgba(255, 212, 59, 0.14) !important;
    }

    .dashboard-mobile-capture-actions button.secondary {
      background: rgba(255, 255, 255, 0.075) !important;
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.14) !important;
      box-shadow: none !important;
    }

    .dashboard-upload-icon {
      display: none !important;
      visibility: hidden !important;
    }

    .dashboard-upload-dropzone strong {
      order: 2 !important;
      display: block !important;
      margin: 0 !important;
      font-size: clamp(1.32rem, 7vw, 1.8rem) !important;
      line-height: 1.05 !important;
      text-align: center !important;
    }

    .dashboard-upload-dropzone strong::after {
      content: "";
    }

    .dashboard-upload-dropzone > span > span:last-child {
      order: 3 !important;
      display: block !important;
      max-width: 100% !important;
      color: rgba(248, 250, 252, 0.66) !important;
      font-size: 0.94rem !important;
      line-height: 1.45 !important;
      text-align: center !important;
    }
  }


  /* Final mobile upload card layout */
  @media (max-width: 760px) {
    .dashboard-upload-dropzone {
      min-height: 360px !important;
      padding: 24px 18px !important;
      border-radius: 30px !important;
      display: grid !important;
      place-items: center !important;
    }

    .dashboard-upload-dropzone > span {
      width: 100% !important;
      max-width: 390px !important;
      display: grid !important;
      grid-template-columns: 1fr !important;
      justify-items: center !important;
      align-items: center !important;
      gap: 16px !important;
    }

    .dashboard-mobile-capture-actions {
      order: 1 !important;
      width: 100% !important;
      max-width: 330px !important;
      display: grid !important;
      visibility: visible !important;
      grid-template-columns: 1fr !important;
      gap: 10px !important;
      margin: 0 auto !important;
      justify-self: center !important;
    }

    .dashboard-mobile-capture-actions button {
      width: 100% !important;
      min-height: 54px !important;
      padding: 0 16px !important;
      border-radius: 18px !important;
      font-size: 1rem !important;
      font-weight: 1000 !important;
      line-height: 1 !important;
      text-align: center !important;
      white-space: nowrap !important;
    }

    .dashboard-mobile-capture-actions button.secondary {
      background: rgba(255, 255, 255, 0.085) !important;
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.16) !important;
      box-shadow: none !important;
    }

    .dashboard-upload-icon {
      display: none !important;
      visibility: hidden !important;
    }

    .dashboard-upload-dropzone strong {
      order: 2 !important;
      display: block !important;
      margin: 0 !important;
      max-width: 330px !important;
      text-align: center !important;
      font-size: clamp(1.55rem, 7vw, 2rem) !important;
      line-height: 1.05 !important;
    }

    .dashboard-upload-dropzone > span > span:last-child {
      order: 3 !important;
      display: block !important;
      max-width: 340px !important;
      margin: 0 auto !important;
      text-align: center !important;
      color: rgba(248, 250, 252, 0.66) !important;
      font-size: 0.96rem !important;
      line-height: 1.48 !important;
    }
  }

  @media (min-width: 761px) {
    .dashboard-mobile-capture-actions {
      display: none !important;
      visibility: hidden !important;
    }
  }


  /* Final simple mobile upload actions */
  @media (max-width: 760px) {
    .dashboard-upload-dropzone {
      min-height: 300px !important;
      padding: 24px 18px !important;
      border-radius: 30px !important;
      display: grid !important;
      place-items: center !important;
    }

    .dashboard-upload-dropzone > span {
      width: 100% !important;
      max-width: 380px !important;
      display: grid !important;
      grid-template-columns: 1fr !important;
      justify-items: center !important;
      gap: 12px !important;
    }

    .dashboard-mobile-capture-actions {
      order: 1 !important;
      width: 100% !important;
      max-width: 360px !important;
      display: grid !important;
      visibility: visible !important;
      grid-template-columns: 1fr !important;
      gap: 12px !important;
      margin: 0 auto !important;
    }

    .dashboard-mobile-capture-actions button {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 58px !important;
      padding: 0 18px !important;
      border-radius: 19px !important;
      font-size: 1.02rem !important;
      font-weight: 1000 !important;
      line-height: 1 !important;
      text-align: center !important;
      white-space: nowrap !important;
    }

    .dashboard-mobile-capture-actions button.secondary {
      background: rgba(255, 255, 255, 0.085) !important;
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.16) !important;
      box-shadow: none !important;
    }

    .dashboard-upload-icon {
      display: none !important;
      visibility: hidden !important;
    }

    .dashboard-upload-dropzone strong {
      order: 2 !important;
      display: block !important;
      margin: 2px 0 0 !important;
      max-width: 360px !important;
      text-align: center !important;
      font-size: 1.08rem !important;
      line-height: 1.2 !important;
      color: rgba(248, 250, 252, 0.78) !important;
    }

    .dashboard-upload-dropzone strong {
      font-size: 0 !important;
      line-height: 0 !important;
    }

    .dashboard-upload-dropzone strong::before {
      content: "Choose how to add media";
      display: block !important;
      font-size: 1.08rem !important;
      line-height: 1.2 !important;
      color: rgba(248, 250, 252, 0.78) !important;
    }

    .dashboard-upload-dropzone > span > span:last-child {
      display: none !important;
    }
  }

  @media (min-width: 761px) {
    .dashboard-mobile-capture-actions {
      display: none !important;
      visibility: hidden !important;
    }
  }


  /* Final premium mobile upload redesign */
  .dashboard-mobile-upload-title {
    display: none !important;
  }

  @media (min-width: 761px) {
    .dashboard-mobile-capture-actions,
    .dashboard-mobile-upload-title {
      display: none !important;
      visibility: hidden !important;
    }
  }

  @media (max-width: 760px) {
    .dashboard-upload-dropzone {
      min-height: 340px !important;
      padding: 24px 18px !important;
      border-radius: 30px !important;
      display: grid !important;
      place-items: center !important;
    }

    .dashboard-upload-dropzone > span {
      width: 100% !important;
      max-width: 360px !important;
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 14px !important;
      justify-items: stretch !important;
      align-items: stretch !important;
      margin: 0 auto !important;
    }

    .dashboard-mobile-upload-title {
      order: 1 !important;
      display: block !important;
      visibility: visible !important;
      width: 100% !important;
      text-align: center !important;
      color: #ffffff !important;
      font-size: 1.45rem !important;
      line-height: 1.05 !important;
      font-weight: 1000 !important;
      letter-spacing: -0.035em !important;
      margin: 0 0 2px !important;
    }

    .dashboard-mobile-capture-actions {
      order: 2 !important;
      display: grid !important;
      visibility: visible !important;
      grid-template-columns: 1fr !important;
      gap: 11px !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      margin: 0 !important;
      justify-self: stretch !important;
    }

    .dashboard-mobile-capture-actions button {
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      min-height: 56px !important;
      padding: 0 18px !important;
      border-radius: 19px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      font-size: 1rem !important;
      font-weight: 1000 !important;
      line-height: 1 !important;
      white-space: nowrap !important;
    }

    .dashboard-mobile-capture-actions button.secondary {
      background: rgba(255, 255, 255, 0.085) !important;
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.16) !important;
      box-shadow: none !important;
    }

    .dashboard-upload-icon {
      display: none !important;
      visibility: hidden !important;
    }

    .dashboard-upload-dropzone strong {
      display: none !important;
      visibility: hidden !important;
    }

    .dashboard-upload-dropzone > span > span:last-child {
      order: 3 !important;
      display: block !important;
      width: 100% !important;
      max-width: 320px !important;
      justify-self: center !important;
      margin: 0 !important;
      text-align: center !important;
      color: rgba(248, 250, 252, 0.62) !important;
      font-size: 0.9rem !important;
      line-height: 1.38 !important;
    }
  }

      `}</style>
      {(
        <section
          className="premium-card dashboard-final-card"
          style={{
            width: "100%",
            padding: "clamp(22px, 3.5vw, 38px)",
            borderRadius: 36,
            border: "1px solid rgba(255, 212, 59, 0.28)",
            background:
              "radial-gradient(circle at top, rgba(255, 212, 59, 0.16), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.032))",
            boxShadow: "0 30px 96px rgba(0, 0, 0, 0.34)",
          }}
        >
          <div className="dashboard-final-hero" style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 22px" }}>
            <div className="page-eyebrow">Create this week’s posts</div>
            <h1
              className="page-title"
              style={{
                margin: "8px 0 12px",
                fontSize: "clamp(2.25rem, 5.4vw, 4.8rem)",
                lineHeight: 0.92,
                letterSpacing: "-0.06em",
              }}
            >
              Upload media.
              <br />
              Get scheduled posts.
            </h1>
            <p className="page-description" style={{ margin: "0 auto", maxWidth: 680 }}>
              Add photos, videos or flyers. FromOne creates posts and sends you to review
              before anything is published.
            </p>

            {addToCampaignId && (
              <div
                className="dashboard-add-to-set-pill"
                style={{
                  margin: "18px auto 0",
                  padding: "10px 14px",
                  borderRadius: 16,
                  background: "rgba(255, 212, 59, 0.1)",
                  border: "1px solid rgba(255, 212, 59, 0.22)",
                  color: "#f8fafc",
                  fontWeight: 800,
                  width: "fit-content",
                }}
              >
                Adding to existing weekly set
              </div>
            )}
          </div>

          {!onboardingIsComplete && (
            <section className="dashboard-quick-start-cards" aria-label="Dashboard quick start">
              <article
                className={
                  weeklyUploads.length > 0
                    ? "dashboard-quick-start-card is-complete"
                    : "dashboard-quick-start-card is-active"
                }
              >
                <span>01</span>
                <strong>Upload media</strong>
                <p>
                  {weeklyUploads.length > 0
                    ? `${weeklyUploads.length} file${weeklyUploads.length === 1 ? "" : "s"} added.`
                    : "Add photos, videos or flyers."}
                </p>
                <a href="#upload-media" className="dashboard-quick-start-link">
                  Upload
                </a>
              </article>

              <article
                className={
                  selectedPlatforms.length > 0
                    ? "dashboard-quick-start-card is-complete"
                    : "dashboard-quick-start-card"
                }
              >
                <span>02</span>
                <strong>Choose platforms</strong>
                <p>
                  {selectedPlatforms.length > 0
                    ? `${selectedPlatforms.length} platform${selectedPlatforms.length === 1 ? "" : "s"} selected.`
                    : "Pick Facebook, Instagram or TikTok."}
                </p>
                <a href="#platforms" className="dashboard-quick-start-link">
                  Choose
                </a>
              </article>

              <article
                className={
                  weeklyProgress.total > 0 || hasScheduledPost
                    ? "dashboard-quick-start-card is-complete"
                    : "dashboard-quick-start-card"
                }
              >
                <span>03</span>
                <strong>Create posts</strong>
                <p>
                  {weeklyProgress.total > 0 || hasScheduledPost
                    ? "Posts are ready to review."
                    : "Generate the review board."}
                </p>
                <a href="#create-posts" className="dashboard-quick-start-link">
                  Create
                </a>
              </article>
            </section>
          )}

          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            <label
              id="upload-media"
              className="dashboard-upload-dropzone"
              style={{
                minHeight: 230,
                borderRadius: 32,
                border: weeklyUploads.length > 0
                  ? "1px solid rgba(61, 220, 151, 0.34)"
                  : "1px dashed rgba(255, 212, 59, 0.5)",
                background:
                  "radial-gradient(circle at top, rgba(255, 212, 59, 0.12), transparent 36%), rgba(15, 23, 42, 0.56)",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: "clamp(24px, 4vw, 34px)",
                cursor: "pointer",
              }}
            >
              <input
                type="file"
                accept="image/*,video/*,application/pdf"
                multiple
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  handleWeeklyUploadFiles(event.target.files);
                  event.target.value = "";
                }}
                style={{ display: "none" }}
              />

              <span style={{ display: "grid", gap: 10, justifyItems: "center" }}>
                <span className="dashboard-mobile-upload-title">Add media</span>

                <span className="dashboard-mobile-capture-actions" aria-label="Mobile media options">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      mobilePhotoInputRef.current?.click();
                    }}
                    disabled={scanning}
                  >
                    Take photo
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      mobileVideoInputRef.current?.click();
                    }}
                    disabled={scanning}
                  >
                    Record video
                  </button>

                  <button
                    type="button"
                    className="secondary"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      mobileFileInputRef.current?.click();
                    }}
                    disabled={scanning}
                  >
                    Upload file
                  </button>
                </span>

                <input
                  ref={mobilePhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="dashboard-mobile-capture-hidden-input"
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
                  className="dashboard-mobile-capture-hidden-input"
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
                  className="dashboard-mobile-capture-hidden-input"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    handleWeeklyUploadFiles(event.target.files);
                    event.target.value = "";
                  }}
                />

                <span
                  className="dashboard-upload-icon"
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: 26,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ffd43b",
                    color: "#101420",
                    fontSize: 34,
                    fontWeight: 950,
                    boxShadow: "0 20px 48px rgba(255, 212, 59, 0.24)",
                  }}
                >
                  +
                </span>

                <strong style={{ fontSize: "clamp(1.35rem, 3vw, 2rem)" }}>
                  Click here to upload
                </strong>

                <span style={{ color: "var(--muted)", maxWidth: 560 }}>
                  Upload up to 7 items. Photos and videos can be used for Facebook and Instagram.
                  PDF flyers can create post wording and are automatically prepared as images for Facebook and Instagram.
                </span>
              </span>
            </label>

            {weeklyUploads.length > 0 && (
              <div
                className="dashboard-weekly-upload-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    typeof window !== "undefined" && window.innerWidth <= 760
                      ? "1fr"
                      : "repeat(auto-fill, minmax(220px, 260px))",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                {weeklyUploads.map((upload, index) => (
                  <div
                    key={upload.id}
                    className="card"
                    style={{
                      width: "100%",
                      maxWidth: 260,
                      minWidth: 0,
                      position: "relative",
                      padding: 10,
                      borderRadius: 20,
                      background: "rgba(255,255,255,0.055)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        height:
                          upload.file.type.startsWith("image/") || upload.file.type === "application/pdf"
                            ? 170
                            : 150,
                        minHeight: 0,
                        aspectRatio:
                          upload.file.type.startsWith("image/") || upload.file.type === "application/pdf"
                            ? "4 / 3"
                            : "16 / 9",
                        borderRadius: 16,
                        overflow: "hidden",
                        background: "#020617",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                      }}
                    >
                      <span
                        className="dashboard-upload-post-pill"
                        style={{
                          position: "absolute",
                          left: 12,
                          top: 12,
                          zIndex: 2,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "7px 11px",
                          borderRadius: 999,
                          background: "rgba(2, 6, 23, 0.76)",
                          border: "1px solid rgba(255, 212, 59, 0.28)",
                          color: "#ffe58a",
                          fontSize: 12,
                          fontWeight: 1000,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          backdropFilter: "blur(10px)",
                          boxShadow: "0 10px 26px rgba(0,0,0,0.24)",
                        }}
                      >
                        Post {index + 1}
                      </span>

                      {upload.file.type.startsWith("image/") ? (
                        <img
                          src={upload.previewUrl}
                          alt={`Upload ${index + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            objectPosition: "center",
                            background: "#020617",
                          }}
                        />
                      ) : upload.file.type.startsWith("video/") ? (
                        <video
                          src={upload.previewUrl}
                          muted
                          playsInline
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            objectPosition: "center",
                            background: "#020617",
                          }}
                        />
                      ) : upload.file.type === "application/pdf" ? (
                        <PdfUploadPreview
                          file={upload.file}
                          label={`PDF flyer preview for upload ${index + 1}`}
                        />
                      ) : (
                        <strong>PDF flyer</strong>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "stretch",
                        gap: 10,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => removeWeeklyUpload(upload.id)}
                        disabled={scanning}
                        aria-label={`Delete upload ${index + 1}`}
                        style={{
                          width: "100%",
                          minWidth: 78,
                          minHeight: 42,
                          borderRadius: 999,
                          border: "1px solid rgba(248,113,113,0.32)",
                          background: "rgba(248,113,113,0.1)",
                          color: "#fecaca",
                          fontWeight: 900,
                          cursor: scanning ? "not-allowed" : "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>

                    <p
                      className="dashboard-upload-file-name"
                      style={{
                        margin: "5px 0 10px",
                        color: "var(--muted)",
                        fontSize: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {upload.file.name}
                    </p>

                    <label
                      style={{
                        display: "grid",
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      <span
                        style={{
                          color: "#f8fafc",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {upload.mediaType === "flyer"
                          ? "Optional note for this flyer"
                          : `What is this ${upload.mediaType === "video" ? "video" : "image"} about?`}
                      </span>

                      {upload.mediaType === "flyer" && (
                        <small
                          style={{
                            color: "rgba(248,250,252,0.62)",
                            lineHeight: 1.35,
                            fontWeight: 760,
                          }}
                        >
                          FromOne can read the flyer. Add a note only if you want to guide the wording.
                        </small>
                      )}

                      <textarea
                        value={upload.note}
                        onChange={(event) =>
                          updateWeeklyUploadNote(upload.id, event.target.value)
                        }
                        disabled={scanning}
                        rows={2}
                        placeholder={
                          upload.mediaType === "flyer"
                            ? "Optional: mention a tone, audience or extra detail"
                            : "Example: Finished garden job in Sale today"
                        }
                        style={{
                          width: "100%",
                          minHeight: upload.mediaType === "flyer" ? 58 : 76,
                          resize: "vertical",
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(2,6,23,0.48)",
                          color: "#f8fafc",
                          padding: "10px 11px",
                          fontWeight: 760,
                          lineHeight: 1.35,
                          outline: "none",
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}

            <div
              className="dashboard-platform-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 14,
              }}
            >
              {[
                {
                  name: "Facebook",
                  title: "Facebook",
                  description: hasFacebookConnection
                    ? "Autopost ready. You still review before publishing."
                    : "Connect Meta in Settings for Facebook autoposting.",
                },
                {
                  name: "Instagram",
                  title: "Instagram",
                  description: hasInstagramConnection
                    ? "Autopost ready for image or video posts."
                    : "Connect Meta in Settings. Instagram needs image or video.",
                },
                {
                  name: "TikTok",
                  title: "TikTok",
                  description: "Manual for now. FromOne writes it; you copy/open TikTok.",
                },
              ].map((platform) => {
                const selected = selectedPlatforms.includes(platform.name);

                return (
                  <button
                    key={platform.name}
                    type="button"
                    className="dashboard-platform-card"
                    onClick={() => togglePlatform(platform.name)}
                    aria-pressed={selected}
                    style={{
                      minHeight: 136,
                      borderRadius: 24,
                      padding: 18,
                      textAlign: "left",
                      cursor: "pointer",
                      background: selected
                        ? "radial-gradient(circle at top right, rgba(255, 212, 59, 0.2), rgba(255,255,255,0.075))"
                        : "rgba(255,255,255,0.045)",
                      border: selected
                        ? "1px solid rgba(255, 212, 59, 0.46)"
                        : "1px solid rgba(255,255,255,0.1)",
                      color: "#f8fafc",
                      boxShadow: selected
                        ? "0 18px 42px rgba(255, 212, 59, 0.11)"
                        : "none",
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 13,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 14,
                        background: selected ? "#ffd43b" : "rgba(255,255,255,0.09)",
                        color: selected ? "#101420" : "rgba(248,250,252,0.78)",
                        fontWeight: 950,
                      }}
                    >
                      {selected ? "✓" : "+"}
                    </span>

                    <strong
                      style={{
                        display: "block",
                        fontSize: "1.12rem",
                        marginBottom: 8,
                        color: "#ffffff",
                      }}
                    >
                      {platform.title}
                    </strong>

                    <small
                      style={{
                        display: "block",
                        color: "rgba(248,250,252,0.68)",
                        lineHeight: 1.45,
                        fontWeight: 700,
                      }}
                    >
                      {platform.description}
                    </small>
                  </button>
                );
              })}
            </div>

            {weeklyUploads.length > 0 && (
              <p
                style={{
                  margin: 0,
                  textAlign: "center",
                  color: "rgba(248, 250, 252, 0.72)",
                  fontWeight: 850,
                  lineHeight: 1.5,
                }}
              >
                You’ll review every post before anything is published.
              </p>
            )}

            {!businessProfileReady && (
              <div className="dashboard-profile-needed-card">
                <div>
                  <strong>Business Profile needed</strong>
                  <p>
                    Set this up once so FromOne knows the business.
                  </p>
                </div>

                <Link href="/settings?setup=business" className="dashboard-profile-setup-button">
                  Set up profile
                </Link>
              </div>
            )}

            {accessLocked && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 20,
                  background: "rgba(255, 95, 109, 0.1)",
                  border: "1px solid rgba(255, 95, 109, 0.26)",
                }}
              >
                <strong>Access locked</strong>
                <p style={{ margin: "5px 0 0", color: "var(--muted)" }}>{accessMessage}</p>
              </div>
            )}

            {selectedPlatforms.length === 0 && (
              <p style={{ textAlign: "center", margin: 0, color: "var(--gold)", fontWeight: 900 }}>
                Choose at least one platform.
              </p>
            )}

            <button
              id="create-posts"
              type="button"
              className="dashboard-platform-create-button"
              onClick={handleGeneratePosts}
              disabled={!canCreatePosts || savingWebsite || savingManualProfile}
              style={{
                width: "100%",
                minHeight: 74,
                borderRadius: 24,
                fontSize: "1.18rem",
                fontWeight: 950,
                boxShadow: canCreatePosts ? "0 20px 48px rgba(255, 212, 59, 0.22)" : "none",
              }}
            >
              {creationProgressMessage
                ? creationProgressMessage
                : preparingFlyers
                  ? "Preparing flyers for posting..."
                  : scanning
                    ? "Creating your posts..."
                    : weeklyUploads.length > 0
                  ? addToCampaignId
                    ? "Add posts to this set"
                    : "Create and review posts"
                  : "Create and review posts"}
            </button>

            {weeklyUploads.length > 0 && (
              <p
                style={{
                  margin: "-4px 0 0",
                  textAlign: "center",
                  color: "var(--muted)",
                  lineHeight: 1.5,
                }}
              >
                Nothing is published from this screen. You will review and edit posts on the Posts
                page before publishing, copying or scheduling.
              </p>
            )}

          </div>
        </section>
      )}

      {scanning && (
        <div className="fromone-loading-overlay" role="status" aria-live="polite">
          <section className="fromone-loading-card">
            <div className="fromone-loading-orb">
              <span />
              <span />
              <span />
            </div>

            <div className="page-eyebrow">Creating posts</div>
            <h2>{creationProgressMessage || "Turning your uploads into posts."}</h2>
            <p>
              FromOne is preparing your media, using the Business Profile, writing the posts,
              choosing times and building your review board.
            </p>

            <div className="fromone-loading-steps">
              <span className={creationProgressMessage.includes("Uploading") ? "is-active" : ""}>
                Uploading media
              </span>
              <span className={creationProgressMessage.includes("Preparing") ? "is-active" : ""}>
                Preparing flyers
              </span>
              <span className={creationProgressMessage.includes("wording") ? "is-active" : ""}>
                Writing posts
              </span>
              <span className={creationProgressMessage.includes("Saving") ? "is-active" : ""}>
                Saving posts
              </span>
              <span className={creationProgressMessage.includes("Opening") ? "is-active" : ""}>
                Opening review board
              </span>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}