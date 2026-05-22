"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MEDIA_BUCKET = "campaign-assets";

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
};

type UploadedMediaItem = {
  upload_id: string;
  position: number;
  file_name: string;
  media_url: string;
  media_path: string;
  media_type: "image" | "flyer" | "video";
  content_type: string;
  topic_hint: string;
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

export default function DashboardPage() {
  const router = useRouter();

  const [addToCampaignId, setAddToCampaignId] = useState<string | null>(null);
  const [client, setClient] = useState<any>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
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
  const [selectedMarketReach, setSelectedMarketReach] =
    useState("Local customers");
  const [selectedPostingFrequency, setSelectedPostingFrequency] = useState(3);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [weeklyUploads, setWeeklyUploads] = useState<WeeklyUpload[]>([]);
  const [weeklyPostNote, setWeeklyPostNote] = useState("");

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
        router.replace("/login");
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

    alert(accessMessage);
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
      alert(
        plan === "starter"
          ? `You have used your ${PAID_WEEKLY_SCAN_LIMIT} website scans for this 7-day period. You can still create posts using saved business details.`
          : `Your demo includes ${DEMO_WEEKLY_SCAN_LIMIT} website scan per 7 days. Use saved business details or upgrade to FromOne Monthly.`
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
      alert(
        plan === "starter"
          ? `You can scan ${PAID_WEEKLY_VIDEO_SCAN_LIMIT} videos per 7 days. You have ${remaining} video scan left.`
          : `Your demo includes ${DEMO_WEEKLY_VIDEO_SCAN_LIMIT} video scan per 7 days. You have ${remaining} video scan left.`
      );
      return false;
    }

    return true;
  };

  const checkSavedCampaignLimit = async (userId: string) => {
    const total = await loadSavedCampaignCount(userId);

    if (total >= MAX_SAVED_CAMPAIGNS) {
      alert(
        `You already have ${MAX_SAVED_CAMPAIGNS} saved weekly post sets. Delete an old or empty test set from Posts before creating a new one.`
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
      alert("Please enter a website URL, or use the business details option.");
      return null;
    }

    setSavingWebsite(true);

    try {
      const user = await getSafeAuthUser();
      const userId = user?.id || null;

      if (!userId) {
        alert("Please sign in again.");
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
      alert(message);
      return null;
    } finally {
      setSavingWebsite(false);
    }
  };

  const saveManualProfile = async () => {
    if (!manualBusinessName.trim() || !manualIndustry.trim()) {
      alert("Please add at least the business name and industry.");
      return null;
    }

    setSavingManualProfile(true);

    try {
      const user = await getSafeAuthUser();
      const userId = user?.id || null;

      if (!userId) {
        alert("Please sign in again.");
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
      alert(message);
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

  const getWeeklyUploadMediaType = (file: File): "image" | "flyer" | "video" => {
    if (file.type === "application/pdf") return "flyer";
    if (file.type.startsWith("video/")) return "video";
    return "image";
  };

  const uploadWeeklyMediaToStorage = async (userId: string): Promise<UploadedMediaItem[]> => {
    if (weeklyUploads.length === 0) return [];

    const uploadedItems: UploadedMediaItem[] = [];

    for (let index = 0; index < weeklyUploads.length; index++) {
      const upload = weeklyUploads[index];
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

      uploadedItems.push({
        upload_id: upload.id,
        position: index + 1,
        file_name: upload.file.name,
        media_url: publicUrlData.publicUrl,
        media_path: path,
        media_type: mediaType,
        content_type: upload.file.type,
        topic_hint:
          mediaType === "video"
            ? "Short business video upload. Use the video as the topic. If this is an event, venue, product, job, result, food, beauty, fitness, club night, live atmosphere, or behind-the-scenes clip, create a promotional post based on what the clip appears to show."
            : mediaType === "flyer"
              ? "Flyer, poster, offer graphic or PDF upload. Extract the offer/details where possible and rewrite it as a natural business post."
              : "Business photo upload. Use the image as the topic, but write the post using the business profile.",
      });
    }

    return uploadedItems;
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
      alert("You need to sign in before saving posts.");
      return;
    }

    if (selectedPlatforms.length === 0) {
      alert("Please choose at least one platform.");
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
      alert(
        `This weekly set already has ${existingCampaignStats.contentDays} content day${existingCampaignStats.contentDays === 1 ? "" : "s"}. You can add ${Math.max(7 - existingCampaignStats.contentDays, 0)} more to keep it as a 7-day week.`
      );
      return;
    }

    const postCount = contentDayCount;
    const totalPlatformPostsToCreate = contentDayCount;

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

    const uploadedMediaItems =
      weeklyUploads.length > 0 ? await uploadWeeklyMediaToStorage(userId) : [];

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
- Continue one post per upload.
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
        posts: `array of ${postCount} post objects with day, platform, title, caption, cta, hashtags, image_prompt. Use only Facebook, Instagram and TikTok. If mediaItems are supplied, create one post per media item in the same order.`,
        selected_platforms: selectedPlatforms,
        market_reach: marketReachContext,
        uploaded_media: uploadedMediaItems,
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

    const posts: GeneratedPost[] = (response.data.posts || []).slice(0, postCount);

    if (!posts.length) {
      alert(response.data.error || "No posts were created.");
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
        alert("Could not find the weekly post set to add to.");
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
          platform_plan: `${buildPlatformPlanText(selectedPlatforms, totalPlatformPostsToCreate)}. Market reach: ${marketReachContext}`,
        })
        .select()
        .single();

      if (campaignError) throwSupabaseError(campaignError);

      campaign = newCampaign;
      createdCampaignId = newCampaign.id;
    }

    const suggestedScheduleSummary: string[] = [];

    try {
      for (let i = 0; i < posts.length; i++) {
        const contentDayIndex = existingCampaignStats.contentDays + i;
        const contentDayNumber = contentDayIndex + 1;
        const mediaItem = uploadedMediaItems[i] || null;
        const baseGeneratedPost = posts[i];

        const selectedPlatform =
          selectedPlatforms[contentDayIndex % selectedPlatforms.length] ||
          platformFallback[contentDayIndex % platformFallback.length] ||
          "Facebook";

        const post = normaliseGeneratedPost(
          {
            ...(typeof baseGeneratedPost === "string"
              ? { caption: baseGeneratedPost }
              : baseGeneratedPost),
            platform: selectedPlatform,
            day: `Post ${contentDayNumber}`,
            title: `${selectedPlatform} Post ${contentDayNumber}`,
          },
          contentDayIndex,
          activeClient,
          detectedIndustry,
          detectedLocation
        );

        const suggestedPublishTime = getSuggestedPostTime(
          contentDayIndex,
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
          publish_status: "scheduled",
          status: "scheduled",
          is_posted: false,
          client_id: activeClient.id,
          image_prompt: post.image_prompt,
          media_url: mediaItem?.media_url || null,
          media_path: mediaItem?.media_path || null,
          media_type: mediaItem?.media_type || null,
          reach: 0,
          clicks: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
        });

        if (postError) throwSupabaseError(postError);
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
      });
    }

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
    setScanning(true);

    if (!ensureAccessAllowed()) {
      setScanning(false);
      return;
    }

    try {
      const activeClient = client;

      if (!activeClient?.business_name || !activeClient?.industry) {
        alert("Set up the Business Profile in Settings first. Then come back here to upload media and create posts.");
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

      alert(message);
    } finally {
      setScanning(false);
    }
  };

  const handleWeeklyUploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const acceptedFiles = Array.from(files).filter(
      (file) =>
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type === "application/pdf"
    );

    if (acceptedFiles.length === 0) {
      alert("Please upload photos, videos, flyers, posters or offer graphics.");
      return;
    }

    setWeeklyUploads((currentUploads) => {
      const nextUploads = [
        ...currentUploads,
        ...acceptedFiles.map((file) => ({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          previewUrl: URL.createObjectURL(file),
          mediaType: getWeeklyUploadMediaType(file),
        })),
      ].slice(0, 7);

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

  const handleSaveWebsiteOnly = async () => {
    if (!ensureAccessAllowed()) return;

    if (!websiteUrl.trim()) {
      alert("Please enter a website URL first.");
      return;
    }

    const savedClient = await saveWebsiteToProfile();

    if (savedClient) {
      alert("Website saved. Now upload photos, videos or flyers, then create posts.");
    }
  };

  const togglePlatform = (platformName: string) => {
    setSelectedPlatforms((currentPlatforms) => {
      if (currentPlatforms.includes(platformName)) {
        if (currentPlatforms.length === 1) {
          alert("Please choose at least one platform.");
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
  const hasWebsite = Boolean(websiteUrl.trim());
  const marketReachDisplayLabel = getMarketReachDisplayLabel(client);
  const marketReachContext = getMarketReachContext(client);

  const uploadDrivenPostCount = weeklyUploads.length;
  const effectivePostCount =
    uploadDrivenPostCount > 0 ? uploadDrivenPostCount : selectedPostingFrequency;

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
  const canCreatePosts = businessProfileReady && weeklyUploads.length > 0 && selectedPlatforms.length > 0 && !accessLocked && !scanning;

  return (
    <main
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "grid",
        placeItems: "center",
        padding: "24px 16px 42px",
      }}
    >
      {loading ? (
        <section className="premium-card" style={{ width: "min(980px, 100%)" }}>
          <p>Loading...</p>
        </section>
      ) : (
        <section
          className="premium-card"
          style={{
            width: "min(940px, 100%)",
            padding: "clamp(22px, 3.5vw, 38px)",
            borderRadius: 36,
            border: "1px solid rgba(255, 212, 59, 0.28)",
            background:
              "radial-gradient(circle at top, rgba(255, 212, 59, 0.16), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.032))",
            boxShadow: "0 30px 96px rgba(0, 0, 0, 0.34)",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 24px" }}>
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
            <p className="page-description" style={{ margin: "0 auto", maxWidth: 660 }}>
              Add this week’s photos, videos or flyers. FromOne creates the posts, chooses the
              times, and opens the weekly calendar.
            </p>

            {addToCampaignId && (
              <div
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

          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            <label
              style={{
                minHeight: 250,
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
                <span
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
                  Upload photos, videos or flyers
                </strong>

                <span style={{ color: "var(--muted)", maxWidth: 520 }}>
                  One upload can become Facebook, Instagram and TikTok versions for the same content day, each with its own scheduled time.
                </span>
              </span>
            </label>

            {weeklyUploads.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 12,
                }}
              >
                {weeklyUploads.map((upload, index) => (
                  <div
                    key={upload.id}
                    className="card"
                    style={{
                      padding: 10,
                      borderRadius: 20,
                      background: "rgba(255,255,255,0.055)",
                    }}
                  >
                    <div
                      style={{
                        height: 118,
                        borderRadius: 16,
                        overflow: "hidden",
                        background: "rgba(255, 255, 255, 0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                      }}
                    >
                      {upload.file.type.startsWith("image/") ? (
                        <img
                          src={upload.previewUrl}
                          alt={`Upload ${index + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
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
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <strong>PDF flyer</strong>
                      )}
                    </div>

                    <strong>Post {index + 1}</strong>
                    <p
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

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => removeWeeklyUpload(upload.id)}
                      disabled={scanning}
                      style={{
                        width: "100%",
                        minHeight: 38,
                        borderRadius: 12,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
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
                  description: "FromOne can autopost at the suggested time.",
                },
                {
                  name: "Instagram",
                  title: "Instagram",
                  description: "FromOne can autopost image or video posts.",
                },
                {
                  name: "TikTok",
                  title: "TikTok",
                  description: "FromOne plans the reminder. You copy/open TikTok.",
                },
              ].map((platform) => {
                const selected = selectedPlatforms.includes(platform.name);

                return (
                  <button
                    key={platform.name}
                    type="button"
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: 10,
                padding: 12,
                borderRadius: 20,
                background: "rgba(255,255,255,0.045)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="card" style={{ padding: 14, textAlign: "center" }}>
                <strong>{effectivePostCount}</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
                  post{effectivePostCount === 1 ? "" : "s"} to create
                </p>
              </div>

              <div className="card" style={{ padding: 14, textAlign: "center" }}>
                <strong>{selectedPlatformSummary || "Choose platform"}</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
                  selected platforms
                </p>
              </div>

              <div className="card" style={{ padding: 14, textAlign: "center" }}>
                <strong>{businessProfileReady ? "Ready" : "Profile needed"}</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
                  Business Profile
                </p>
              </div>
            </div>

            {!businessProfileReady && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 20,
                  background: "rgba(255, 212, 59, 0.1)",
                  border: "1px solid rgba(255, 212, 59, 0.24)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 14,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>Business Profile needed</strong>
                  <p style={{ margin: "5px 0 0", color: "var(--muted)" }}>
                    Set this up once so FromOne knows the business.
                  </p>
                </div>

                <Link href="/settings" className="secondary-button">
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
              {scanning
                ? "Creating your posts..."
                : weeklyUploads.length > 0
                  ? addToCampaignId
                    ? "Add posts to this set"
                    : "Create my posts"
                  : "Upload media to start"}
            </button>

            {weeklyUploads.length > 0 && (
              <p style={{ textAlign: "center", margin: 0, color: "var(--muted)" }}>
                {weeklyUploads.length} upload{weeklyUploads.length === 1 ? "" : "s"} will create{" "}
                {weeklyUploads.length * selectedPlatforms.length} scheduled platform post{weeklyUploads.length * selectedPlatforms.length === 1 ? "" : "s"}
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
            <h2>Turning your uploads into posts.</h2>
            <p>
              FromOne is using the Business Profile and uploaded media to create posts, choose
              times and prepare the weekly calendar.
            </p>

            <div className="fromone-loading-steps">
              <span>Saving uploads</span>
              <span>Reading Business Profile</span>
              <span>Writing posts</span>
              <span>Choosing times</span>
              <span>Opening calendar</span>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}