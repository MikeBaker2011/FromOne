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
        `You already have ${MAX_SAVED_CAMPAIGNS} saved weekly post sets. Go to Settings to delete an old or empty test set before creating a new one.`,
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
    // In every_platform mode, each uploaded media item/base idea becomes one post per selected platform.
    // Example: Facebook + Instagram selected = one Facebook post and one Instagram post.
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
- Platform distribution mode: ${platformDistributionMode === "every_platform" ? "create each base post for every selected platform" : "split base posts across selected platforms"}.
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
        posts: `Return exactly ${postCount} scheduled post object${postCount === 1 ? "" : "s"} with day, platform, title, caption, cta, hashtags, image_prompt. Use only Facebook, Instagram and Stockport Smiles. If mediaItems are supplied, create exactly one post per uploaded item in the same order. Do not create 7 posts unless 7 items were uploaded or 7 profile-only posts were requested. If no mediaItems are supplied, create profile-led draft posts. Platform distribution mode: ${platformDistributionMode}.`,
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
          platform_plan: `${buildPlatformPlanText(selectedPlatforms, totalPlatformPostsToCreate)}. Market reach: ${marketReachContext}. Platform mode: ${platformDistributionMode === "every_platform" ? "each post for every platform" : "split across platforms"}`,
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
  const effectivePostCount =
    uploadDrivenPostCount > 0 ? uploadDrivenPostCount : selectedPostingFrequency;
  const createdPostTotal =
    platformDistributionMode === "every_platform"
      ? effectivePostCount * selectedPlatforms.length
      : effectivePostCount;
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
  const canCreatePosts = businessProfileReady && selectedPlatforms.length > 0 && !accessLocked && !scanning && !preparingFlyers;

  if (!dashboardMounted || loading) {
    return (
      <main
        style={{
          width: "100%",
          minHeight: "calc(100vh - 120px)",
          margin: "0",
          padding: "32px 16px 72px",
        }}
      >
        <section
          id="fromone-standard-shell"
          className="fromone-agency-shell premium-card"
          aria-label="Dashboard loading"
          style={{
            width: "1040px",
            maxWidth: "calc(100% - 32px)",
            minHeight: 620,
            padding: "clamp(30px, 4vw, 48px)",
            borderRadius: 36,
            border: "1px solid rgba(255, 212, 59, 0.24)",
            background:
              "radial-gradient(circle at top, rgba(255, 212, 59, 0.12), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.028))",
            boxShadow: "0 30px 96px rgba(0,0,0,0.28)",
          }}
        >
          <div className="page-eyebrow">Dashboard</div>

          <div
            style={{
              width: "min(520px, 100%)",
              height: 42,
              borderRadius: 18,
              background: "rgba(255,255,255,0.08)",
              margin: "10px 0 18px",
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                style={{
                  minHeight: 112,
                  borderRadius: 24,
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            ))}
          </div>

          <div
            style={{
              minHeight: 190,
              borderRadius: 30,
              border: "1px dashed rgba(255, 212, 59, 0.24)",
              background: "rgba(15, 23, 42, 0.46)",
            }}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="fromone-create-page dashboard-final-page" data-create-page>
      <section
        id="fromone-standard-shell"
        className="create-create-style-card"
        aria-label="Create social media posts"
      >
        <header className="create-hero">
          <div className="page-eyebrow">Create</div>
          <h1 className="page-title">
            Create a post.
            <br />
            Keep it simple.
          </h1>
          <p className="page-description">
            Add a photo, video or flyer. Choose where it should go. Review it before anything is published.
          </p>

          {addToCampaignId && (
            <div className="create-status-pill">Adding to existing weekly set</div>
          )}
        </header>

        <section className="create-simple-panel" id="upload-media" aria-label="Upload media">
          <div className="create-panel-heading">
            <span>01</span>
            <div>
              <h2>Add what you have</h2>
              <p>Upload images, videos or flyers. FromOne creates one draft for each upload.</p>
            </div>
          </div>

          <label className="dashboard-upload-dropzone create-upload-dropzone">
            <input
              type="file"
              accept="image/*,video/*,application/pdf"
              multiple
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                handleWeeklyUploadFiles(event.target.files);
                event.target.value = "";
              }}
            />

            <span className="dashboard-upload-inner create-upload-inner">
              <span className="dashboard-upload-type-grid create-upload-type-grid" aria-label="Supported upload types">
                <span className="dashboard-upload-type-card create-upload-type-card">
                  <span className="dashboard-upload-type-icon create-upload-type-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="presentation">
                      <rect x="4" y="5" width="16" height="14" rx="3" />
                      <path d="M7 16l3.4-3.4 2.6 2.6 2-2 2.9 2.8" />
                      <circle cx="8.4" cy="8.8" r="1.1" />
                    </svg>
                  </span>
                  <strong>Add image</strong>
                </span>

                <span className="dashboard-upload-type-card create-upload-type-card">
                  <span className="dashboard-upload-type-icon create-upload-type-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="presentation">
                      <rect x="4" y="6" width="16" height="12" rx="3" />
                      <path d="M10 9.5v5l4.4-2.5z" />
                    </svg>
                  </span>
                  <strong>Add video</strong>
                </span>

                <span className="dashboard-upload-type-card create-upload-type-card">
                  <span className="dashboard-upload-type-icon create-upload-type-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="presentation">
                      <path d="M7 4h7l3 3v13H7z" />
                      <path d="M14 4v4h4" />
                      <path d="M9.5 11h5" />
                      <path d="M9.5 14h5" />
                      <path d="M9.5 17h3" />
                    </svg>
                  </span>
                  <strong>Add flyer</strong>
                </span>
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
            </span>
          </label>

          {weeklyUploads.length > 0 && (
            <div className="dashboard-weekly-upload-grid create-upload-grid">
              {weeklyUploads.map((upload, index) => (
                <article key={upload.id} className="create-upload-card">
                  <div className="create-upload-preview">
                    <span className="create-upload-post-pill">Post {index + 1}</span>

                    {upload.file.type.startsWith("image/") ? (
                      <img src={upload.previewUrl} alt={`Upload ${index + 1}`} />
                    ) : upload.file.type.startsWith("video/") ? (
                      <video src={upload.previewUrl} muted playsInline />
                    ) : upload.file.type === "application/pdf" ? (
                      <PdfUploadPreview file={upload.file} label={`PDF flyer preview for upload ${index + 1}`} />
                    ) : (
                      <strong>PDF flyer</strong>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeWeeklyUpload(upload.id)}
                    disabled={scanning}
                    aria-label={`Delete upload ${index + 1}`}
                    className="create-delete-button"
                  >
                    Delete
                  </button>

                  <p className="create-upload-file-name">{upload.file.name}</p>

                  <label className="create-upload-note-label">
                    <span>
                      {upload.mediaType === "flyer"
                        ? "Optional note for this flyer"
                        : `What is this ${upload.mediaType === "video" ? "video" : "image"} about?`}
                    </span>

                    {upload.mediaType === "flyer" && (
                      <small>
                        FromOne can read the flyer. Add a note only if you want to guide the wording.
                      </small>
                    )}

                    <textarea
                      value={upload.note}
                      onChange={(event) => updateWeeklyUploadNote(upload.id, event.target.value)}
                      disabled={scanning}
                      rows={2}
                      placeholder={
                        upload.mediaType === "flyer"
                          ? "Optional: mention a tone, audience or extra detail"
                          : "Example: Finished garden job in Sale today"
                      }
                    />
                  </label>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="create-simple-panel create-platform-panel" id="platforms" aria-label="Choose where to post">
          <div className="create-panel-heading">
            <span>02</span>
            <div>
              <h2>Post to</h2>
              <p>Choose where these drafts should be prepared for. Nothing is published from this screen.</p>
            </div>
          </div>

          <div className="dashboard-platform-grid create-platform-grid">
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
                name: "Stockport Smiles",
                title: "Smiles",
                description: "Only for offers and events. Social posts stay in Posts.",
              },
            ].map((platform) => {
              const selected = selectedPlatforms.includes(platform.name);

              return (
                <button
                  key={platform.name}
                  type="button"
                  className={`dashboard-platform-card create-platform-pill ${selected ? "is-selected" : "is-deselected"}`}
                  onClick={() => togglePlatform(platform.name)}
                  aria-pressed={selected}
                >
                  <strong>{platform.title}</strong>
                  <small>{platform.description}</small>
                </button>
              );
            })}
          </div>

          {selectedPlatforms.length === 0 && (
            <p className="create-warning-note">Choose at least one platform.</p>
          )}
        </section>

        {!businessProfileReady && (
          <section className="create-profile-needed-card">
            <div>
              <span>Business profile</span>
              <strong>Finish your business profile</strong>
              <p>Add this once so FromOne knows what you offer, where you work and who you want to reach.</p>
            </div>
            <Link href="/settings?setup=business">Set up profile</Link>
          </section>
        )}

        {accessLocked && (
          <section className="create-access-card">
            <strong>Access locked</strong>
            <p>{accessMessage}</p>
          </section>
        )}

        <section className="create-action-panel" id="create-posts">
          <button
            type="button"
            className="dashboard-platform-create-button create-primary-button"
            onClick={handleGeneratePosts}
            disabled={!canCreatePosts || savingWebsite || savingManualProfile}
          >
            {creationProgressMessage
              ? creationProgressMessage
              : preparingFlyers
                ? "Preparing flyers for posting..."
                : scanning
                  ? "Creating your posts..."
                  : weeklyUploads.length > 0
                    ? addToCampaignId
                      ? "Add drafts to this set"
                      : "Create drafts for review"
                    : "Create drafts for review"}
          </button>

          <p className="dashboard-nothing-published-note create-nothing-published-note">
            Nothing is published from this screen.
          </p>
        </section>
      </section>

      {scanning && (
        <div className="fromone-loading-overlay" role="status" aria-live="polite">
          <section className="fromone-loading-card">
            <div className="fromone-loading-orb">
              <span />
              <span />
              <span />
            </div>

            <div className="page-eyebrow">Creating your week</div>
            <h2>{creationProgressMessage || "Creating your scheduled posts."}</h2>
            <p>
              FromOne is using your Business Profile, creating one post per upload, choosing suggested times and building your review board.
            </p>

            <div className="fromone-loading-steps">
              <span className={creationProgressMessage.includes("Uploading") ? "is-active" : ""}>
                Using media
              </span>
              <span className={creationProgressMessage.includes("Preparing") ? "is-active" : ""}>
                Preparing flyers
              </span>
              <span className={creationProgressMessage.includes("wording") ? "is-active" : ""}>
                Creating posts
              </span>
              <span className={creationProgressMessage.includes("Saving") ? "is-active" : ""}>
                Setting schedule
              </span>
              <span className={creationProgressMessage.includes("Opening") ? "is-active" : ""}>
                Opening review board
              </span>
            </div>
          </section>
        </div>
      )}

      <style jsx global>{`
        body:has(.fromone-create-page) {
          background: #f5f7fb !important;
          overflow-x: hidden !important;
        }

        body:has(.fromone-create-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-create-page) .app-shell,
        body:has(.fromone-create-page) .main-content {
          background: #f5f7fb !important;
        }

        body:has(.fromone-create-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding-top: 38px !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .fromone-create-page.dashboard-final-page {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 16px 104px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
          background: #f5f7fb !important;
          color: #071b49 !important;
          font-family:
            var(--font-main),
            "Plus Jakarta Sans",
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif !important;
          font-weight: 500 !important;
          letter-spacing: -0.01em !important;
        }

        .fromone-create-page #fromone-standard-shell.create-create-style-card {
          width: 1040px !important;
          max-width: calc(100% - 32px) !important;
          min-width: 0 !important;
          min-height: 620px !important;
          margin: 28px auto 0 !important;
          padding: clamp(30px, 4vw, 48px) !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          display: block !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 32px !important;
          background: #ffffff !important;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.10) !important;
          color: #071b49 !important;
          backdrop-filter: none !important;
        }

        .fromone-create-page .create-hero {
          width: 100% !important;
          max-width: 760px !important;
          margin: 0 0 22px !important;
          padding: 0 !important;
          text-align: left !important;
        }

        .fromone-create-page .page-eyebrow,
        .fromone-create-page .create-profile-needed-card span {
          display: block !important;
          margin: 0 0 12px !important;
          color: #f72585 !important;
          font-size: 0.78rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .fromone-create-page .page-title {
          max-width: 760px !important;
          margin: 0 0 14px !important;
          color: #071b49 !important;
          font-size: clamp(3rem, 5.2vw, 4.45rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.055em !important;
          font-weight: 800 !important;
          text-align: left !important;
          overflow: visible !important;
        }

        .fromone-create-page .page-description {
          max-width: 720px !important;
          margin: 0 !important;
          color: #52617a !important;
          font-size: 1.02rem !important;
          line-height: 1.5 !important;
          font-weight: 600 !important;
          text-align: left !important;
        }

        .fromone-create-page .create-status-pill {
          width: fit-content !important;
          margin: 18px 0 0 !important;
          padding: 10px 14px !important;
          border: 1px solid #ffc8df !important;
          border-radius: 999px !important;
          background: #fff6fa !important;
          color: #f72585 !important;
          font-weight: 800 !important;
        }

        .fromone-create-page .create-panel-heading > span {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 42px !important;
          min-width: 42px !important;
          max-width: 42px !important;
          height: 42px !important;
          min-height: 42px !important;
          max-height: 42px !important;
          flex: 0 0 42px !important;
          aspect-ratio: 1 / 1 !important;
          padding: 0 !important;
          border-radius: 999px !important;
          background: #f72585 !important;
          color: #ffffff !important;
          font-size: 0.84rem !important;
          font-weight: 900 !important;
          box-shadow: 0 16px 34px rgba(247, 37, 133, 0.18) !important;
        }

        .fromone-create-page .create-simple-panel p,
        .fromone-create-page .create-profile-needed-card p,
        .fromone-create-page .create-access-card p {
          margin: 0 !important;
          color: #52617a !important;
          line-height: 1.45 !important;
          font-weight: 650 !important;
        }

        .fromone-create-page .create-simple-panel,
        .fromone-create-page .create-profile-needed-card,
        .fromone-create-page .create-access-card {
          width: 100% !important;
          max-width: 100% !important;
          margin-top: 18px !important;
          padding: clamp(20px, 3vw, 30px) !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 24px !important;
          background: #f7f9fd !important;
          box-sizing: border-box !important;
        }

        .fromone-create-page .create-panel-heading {
          display: flex !important;
          align-items: flex-start !important;
          gap: 16px !important;
          margin-bottom: 18px !important;
        }

        .fromone-create-page .create-panel-heading h2 {
          margin: 0 0 6px !important;
          color: #071b49 !important;
          font-size: clamp(1.65rem, 3.4vw, 2.15rem) !important;
          line-height: 1.05 !important;
          font-weight: 800 !important;
          letter-spacing: -0.045em !important;
        }

        .fromone-create-page .create-upload-dropzone {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          cursor: pointer !important;
        }

        .fromone-create-page .create-upload-dropzone > input[type="file"],
        .fromone-create-page .dashboard-mobile-capture-hidden-input {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        .fromone-create-page .create-upload-inner {
          display: block !important;
          width: 100% !important;
        }

        .fromone-create-page .create-upload-type-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 12px !important;
          width: 100% !important;
        }

        .fromone-create-page .create-upload-type-card {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 14px !important;
          min-height: 88px !important;
          padding: 18px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 18px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
          transform: none !important;
        }

        .fromone-create-page .create-upload-type-icon {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex: 0 0 42px !important;
          width: 42px !important;
          height: 42px !important;
          border-radius: 14px !important;
          background: #f72585 !important;
          color: #ffffff !important;
        }

        .fromone-create-page .create-upload-type-icon svg {
          width: 18px !important;
          height: 18px !important;
          fill: none !important;
          stroke: currentColor !important;
          stroke-width: 2 !important;
          stroke-linecap: round !important;
          stroke-linejoin: round !important;
        }

        .fromone-create-page .create-upload-type-card strong {
          color: #071b49 !important;
          font-size: 1.08rem !important;
          line-height: 1.1 !important;
          font-weight: 850 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        .fromone-create-page .create-upload-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
          gap: 12px !important;
          margin-top: 16px !important;
        }

        .fromone-create-page .create-upload-card {
          min-width: 0 !important;
          padding: 12px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 20px !important;
          background: #ffffff !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
        }

        .fromone-create-page .create-upload-preview {
          position: relative !important;
          width: 100% !important;
          aspect-ratio: 4 / 3 !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          background: #071b49 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin-bottom: 10px !important;
        }

        .fromone-create-page .create-upload-preview img,
        .fromone-create-page .create-upload-preview video {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
          object-position: center !important;
          background: #071b49 !important;
        }

        .fromone-create-page .create-upload-post-pill {
          position: absolute !important;
          left: 10px !important;
          top: 10px !important;
          z-index: 2 !important;
          padding: 6px 9px !important;
          border-radius: 999px !important;
          background: rgba(7, 27, 73, 0.82) !important;
          color: #ffffff !important;
          font-size: 0.72rem !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }

        .fromone-create-page .create-delete-button {
          width: 100% !important;
          min-height: 42px !important;
          border: 1px solid #ffc8df !important;
          border-radius: 999px !important;
          background: #fff6fa !important;
          color: #f72585 !important;
          font-weight: 850 !important;
          cursor: pointer !important;
        }

        .fromone-create-page .create-delete-button:disabled {
          opacity: 0.55 !important;
          cursor: not-allowed !important;
        }

        .fromone-create-page .create-upload-file-name {
          margin: 8px 0 10px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          color: #52617a !important;
          font-size: 0.78rem !important;
          font-weight: 750 !important;
        }

        .fromone-create-page .create-upload-note-label {
          display: grid !important;
          gap: 7px !important;
        }

        .fromone-create-page .create-upload-note-label span {
          color: #071b49 !important;
          font-size: 0.82rem !important;
          font-weight: 850 !important;
        }

        .fromone-create-page .create-upload-note-label small {
          color: #52617a !important;
          line-height: 1.4 !important;
          font-weight: 650 !important;
        }

        .fromone-create-page .create-upload-note-label textarea {
          width: 100% !important;
          min-height: 72px !important;
          resize: vertical !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 16px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          padding: 12px !important;
          font: inherit !important;
          font-weight: 650 !important;
          line-height: 1.4 !important;
          outline: none !important;
          box-sizing: border-box !important;
        }

        .fromone-create-page .create-platform-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 12px !important;
        }

        .fromone-create-page .create-platform-pill {
          display: grid !important;
          align-content: center !important;
          justify-items: center !important;
          gap: 6px !important;
          min-height: 76px !important;
          padding: 14px 18px !important;
          border-radius: 999px !important;
          border: 1px solid #f72585 !important;
          background: #f72585 !important;
          color: #ffffff !important;
          text-align: center !important;
          box-shadow: 0 16px 34px rgba(247, 37, 133, 0.18) !important;
          cursor: pointer !important;
          transform: none !important;
          transition: background 140ms ease, border-color 140ms ease, opacity 140ms ease !important;
        }

        .fromone-create-page .create-platform-pill.is-deselected {
          background: rgba(247, 37, 133, 0.18) !important;
          border-color: rgba(247, 37, 133, 0.28) !important;
          color: #f72585 !important;
          box-shadow: none !important;
          opacity: 1 !important;
        }

        .fromone-create-page .create-platform-pill strong {
          color: inherit !important;
          font-size: 1.04rem !important;
          line-height: 1.1 !important;
          font-weight: 850 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        .fromone-create-page .create-platform-pill small {
          display: none !important;
        }

        .fromone-create-page .create-warning-note {
          margin: 14px 0 0 !important;
          text-align: center !important;
          color: #f72585 !important;
          font-weight: 850 !important;
        }

        .fromone-create-page .create-profile-needed-card {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 18px !important;
          background: #fff6fa !important;
          border-color: #ffc8df !important;
        }

        .fromone-create-page .create-profile-needed-card strong {
          display: block !important;
          margin: 0 0 6px !important;
          color: #071b49 !important;
          font-size: 1.5rem !important;
          line-height: 1.05 !important;
          font-weight: 850 !important;
          letter-spacing: -0.04em !important;
        }

        .fromone-create-page .create-profile-needed-card a {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 50px !important;
          padding: 0 22px !important;
          border-radius: 999px !important;
          background: #f72585 !important;
          color: #ffffff !important;
          text-decoration: none !important;
          font-weight: 850 !important;
          white-space: nowrap !important;
          box-shadow: 0 16px 34px rgba(247, 37, 133, 0.18) !important;
        }

        .fromone-create-page .create-access-card {
          background: #fff6fa !important;
          border-color: #ffc8df !important;
        }

        .fromone-create-page .create-access-card strong {
          display: block !important;
          margin: 0 0 6px !important;
          color: #071b49 !important;
          font-weight: 850 !important;
        }

        .fromone-create-page .create-action-panel {
          width: 100% !important;
          max-width: 100% !important;
          margin-top: 18px !important;
          text-align: center !important;
        }

        .fromone-create-page .create-primary-button {
          width: 100% !important;
          min-height: 58px !important;
          border: 0 !important;
          border-radius: 999px !important;
          background: #f72585 !important;
          color: #ffffff !important;
          font-size: 1rem !important;
          font-weight: 850 !important;
          box-shadow: 0 18px 42px rgba(247, 37, 133, 0.22) !important;
          cursor: pointer !important;
        }

        .fromone-create-page .create-primary-button:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
        }

        .fromone-create-page .create-nothing-published-note {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 16px auto 0 !important;
          text-align: center !important;
          color: #52617a !important;
          line-height: 1.5 !important;
          font-weight: 750 !important;
        }

        .fromone-create-page .fromone-loading-overlay {
          position: fixed !important;
          inset: 0 !important;
          z-index: 1000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 24px !important;
          background: rgba(245, 247, 251, 0.82) !important;
          backdrop-filter: blur(10px) !important;
        }

        .fromone-create-page .fromone-loading-card {
          width: min(520px, 100%) !important;
          padding: 28px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 28px !important;
          background: #ffffff !important;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.16) !important;
          text-align: center !important;
        }

        .fromone-create-page .fromone-loading-card h2 {
          margin: 10px 0 !important;
          color: #071b49 !important;
          font-size: 2rem !important;
          line-height: 1.05 !important;
          font-weight: 850 !important;
          letter-spacing: -0.045em !important;
        }

        .fromone-create-page .fromone-loading-steps {
          display: flex !important;
          flex-wrap: wrap !important;
          justify-content: center !important;
          gap: 8px !important;
          margin-top: 18px !important;
        }

        .fromone-create-page .fromone-loading-steps span {
          padding: 8px 10px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 999px !important;
          background: #f7f9fd !important;
          color: #52617a !important;
          font-size: 0.78rem !important;
          font-weight: 800 !important;
        }

        .fromone-create-page .fromone-loading-steps span.is-active {
          border-color: #ffc8df !important;
          background: #fff6fa !important;
          color: #f72585 !important;
        }

        @media (max-width: 820px) {
          .fromone-create-page .create-upload-type-grid,
          .fromone-create-page .create-platform-grid {
            grid-template-columns: 1fr !important;
          }

          .fromone-create-page .create-profile-needed-card {
            display: grid !important;
            justify-items: start !important;
          }
        }

        @media (max-width: 760px) {
          body:has(.fromone-create-page) .main-content {
            padding-top: 0 !important;
          }

          .fromone-create-page.dashboard-final-page {
            padding: 0 0 112px !important;
          }

          .fromone-create-page #fromone-standard-shell.create-create-style-card {
            width: calc(100% - 56px) !important;
            max-width: 468px !important;
            min-height: auto !important;
            margin: 18px auto 0 !important;
            padding: 24px 22px 24px !important;
            border-radius: 24px !important;
          }

          .fromone-create-page .page-title {
            font-size: clamp(2.35rem, 10.4vw, 3.15rem) !important;
            line-height: 0.95 !important;
          }

          .fromone-create-page .page-description {
            font-size: 0.96rem !important;
            line-height: 1.42 !important;
          }

          .fromone-create-page .create-simple-panel,
          .fromone-create-page .create-profile-needed-card,
          .fromone-create-page .create-access-card {
            margin-top: 14px !important;
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .fromone-create-page .create-panel-heading {
            gap: 12px !important;
            margin-bottom: 14px !important;
          }

          .fromone-create-page .create-panel-heading > span {
            width: 38px !important;
            min-width: 38px !important;
            max-width: 38px !important;
            height: 38px !important;
            min-height: 38px !important;
            max-height: 38px !important;
            flex-basis: 38px !important;
            font-size: 0.78rem !important;
          }

          .fromone-create-page .create-upload-type-card {
            min-height: 58px !important;
            justify-content: center !important;
            padding: 0 18px !important;
          }

          .fromone-create-page .create-platform-pill {
            min-height: 54px !important;
          }
        }

        @media (max-width: 420px) {
          .fromone-create-page #fromone-standard-shell.create-create-style-card {
            width: calc(100% - 40px) !important;
            padding: 22px 20px 22px !important;
          }
        }
      `}</style>
    </main>
  );
}
