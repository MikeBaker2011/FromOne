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
  mediaType?: "image" | "flyer";
};

type UploadedMediaItem = {
  upload_id: string;
  position: number;
  file_name: string;
  media_url: string;
  media_path: string;
  media_type: "image" | "flyer";
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
    description: "Auto posting when Meta is connected.",
  },
  {
    name: "Instagram",
    shortName: "Instagram",
    description: "Auto posting when Meta is connected.",
  },
  {
    name: "TikTok",
    shortName: "TikTok",
    description: "Manual posting for now. Copy/open manually.",
  },
];

const marketReachOptions = [
  {
    value: "Local customers",
    title: "Local",
    description:
      "Best for trades, local services, venues, clinics, and businesses serving one area.",
  },
  {
    value: "Nationwide customers",
    title: "Nationwide",
    description: "Best for businesses that work across the UK or want broader reach.",
  },
  {
    value: "Online customers",
    title: "Online",
    description:
      "Best for ecommerce, digital services, remote offers, and online-first brands.",
  },
];

const postingFrequencyOptions = [
  {
    value: 3,
    title: "3 posts",
    description: "A light weekly set for simple consistency.",
  },
  {
    value: 5,
    title: "5 posts",
    description: "A steady weekday set for regular visibility.",
  },
  {
    value: 7,
    title: "7 posts",
    description: "A full weekly set for maximum activity.",
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
const MAX_SAVED_CAMPAIGNS = 4;
const WEBSITE_SCAN_EVENT_TYPES = ["website_scan", "campaign_regenerate"];

export default function DashboardPage() {
  const router = useRouter();

  const [client, setClient] = useState<any>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [savingWebsite, setSavingWebsite] = useState(false);
  const [showManualProfile, setShowManualProfile] = useState(false);
  const [savingManualProfile, setSavingManualProfile] = useState(false);

  const [weeklyScansUsed, setWeeklyScansUsed] = useState(0);
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

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(defaultSelectedPlatforms);
  const [selectedMarketReach, setSelectedMarketReach] = useState("Local customers");
  const [selectedPostingFrequency, setSelectedPostingFrequency] = useState(3);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [weeklyUploads, setWeeklyUploads] = useState<WeeklyUpload[]>([]);

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

  const getErrorMessage = (error: any) => {
    if (!error) return "Unknown error.";
    if (typeof error === "string") return error;

    if (axios.isAxiosError(error)) {
      return (
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data?.details ||
        error.message ||
        "Request failed."
      );
    }

    return (
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      error?.error_description ||
      error?.details ||
      error?.hint ||
      "Unknown error creating or saving posts."
    );
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
    return ["active", "paid", "trialing"].includes(String(status || "").toLowerCase());
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
      const date = new Date(access.extension_ends_at as string).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      return {
        locked: false,
        message: `Manual extension active until ${date}.`,
      };
    }

    if (isFutureDate(access.trial_ends_at)) {
      const date = new Date(access.trial_ends_at as string).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

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
          ? `You have used your ${PAID_WEEKLY_SCAN_LIMIT} website scans for this 7-day period. You can still create posts using the business details route.`
          : `Your demo includes ${DEMO_WEEKLY_SCAN_LIMIT} website scan per 7 days. Use the business details route or upgrade to FromOne Monthly.`
      );
      return false;
    }

    return true;
  };

  const checkSavedCampaignLimit = async (userId: string) => {
    const total = await loadSavedCampaignCount(userId);

    if (total >= MAX_SAVED_CAMPAIGNS) {
      alert(
        `You already have ${MAX_SAVED_CAMPAIGNS} saved weekly post sets. Delete an old set from Posts before creating a new one.`
      );
      return false;
    }

    return true;
  };

  const recordUsageEvent = async (
    userId: string,
    eventType: "website_scan" | "campaign_regenerate",
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
- Do not only describe a photo or flyer.
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

  const getWeeklyUploadMediaType = (file: File): "image" | "flyer" => {
    if (file.type === "application/pdf") return "flyer";
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
          mediaType === "flyer"
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
          "Use a clear business photo, flyer, product image, finished work image, or short clip that supports this post.",
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
        "Use a clear business photo, flyer, product image, finished work image, or short clip that supports this post.",
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
    const postCount =
      weeklyUploads.length > 0
        ? Math.min(weeklyUploads.length, 7)
        : Math.max(1, Math.min(selectedPostingFrequency, 7));

    const campaignLimitAllowed = await checkSavedCampaignLimit(userId);

    if (!campaignLimitAllowed) return;

    if (source === "website_scan") {
      const allowed = await checkWeeklyScanLimit(userId);

      if (!allowed) return;
    }

    const uploadedMediaItems =
      weeklyUploads.length > 0 ? await uploadWeeklyMediaToStorage(userId) : [];

    const response = await axios.post("/api/generatePosts", {
      website: source === "website_scan" ? activeClient.website_url : "",
      clientName: activeClient.business_name,
      industry: activeClient.industry,
      description: `${buildBusinessDescription(activeClient)}

Weekly uploaded media count: ${uploadedMediaItems.length}.
If uploads are supplied:
- Post 1 must use Upload 1 as the topic.
- Post 2 must use Upload 2 as the topic.
- Continue one post per upload.
- Do not only describe the image or flyer.
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

    const { data: campaign, error: campaignError } = await supabase
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
        drafts: posts.length,
        scheduled: posts.length,
        assets: uploadedMediaItems.length,
        posted: 0,
        launch_date: new Date().toISOString().split("T")[0],
        campaign_area: detectedLocation,
        tone: detectedTone,
        posting_frequency: `${postCount} posts`,
        platform_plan: `${buildPlatformPlanText(selectedPlatforms, postCount)}. Market reach: ${marketReachContext}`,
      })
      .select()
      .single();

    if (campaignError) throwSupabaseError(campaignError);

    const today = new Date();

    for (let i = 0; i < posts.length; i++) {
      const postDate = new Date(today);
      postDate.setDate(today.getDate() + i);
      postDate.setHours(9, 0, 0, 0);

      const post = normaliseGeneratedPost(
        posts[i],
        i,
        activeClient,
        detectedIndustry,
        detectedLocation
      );

      const mediaItem = uploadedMediaItems[i] || null;

      const { error: postError } = await supabase.from("campaign_posts").insert({
        user_id: userId,
        campaign_id: campaign.id,
        keyword: detectedIndustry || "business",
        title: post.title,
        caption: post.caption,
        cta: post.cta,
        hashtags: post.hashtags,
        platform: post.platform,
        type: source,
        scheduled_day: post.day,
        scheduled_at: postDate.toISOString(),
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
        });
      }
    }

    localStorage.setItem("fromone_has_new_posts", "true");
    window.dispatchEvent(new Event("fromone-new-posts-updated"));

    await Promise.all([
      loadSavedCampaignCount(userId),
      loadWeeklyProgress(userId),
      loadScheduledPostStatus(userId),
    ]);

    router.push("/posts?created=true");
  };

  const handleGeneratePosts = async () => {
    setScanning(true);

    if (!ensureAccessAllowed()) {
      setScanning(false);
      return;
    }

    try {
      let activeClient = client;

      if (websiteUrl.trim()) {
        const savedClient = await saveWebsiteToProfile();

        if (!savedClient) {
          setScanning(false);
          return;
        }

        activeClient = savedClient;
      }

      if (!activeClient) {
        alert("Please enter a website URL, or add business details.");
        setScanning(false);
        return;
      }

      if (!activeClient.website_url && !activeClient.business_name) {
        alert("Please enter a website URL, or add business details.");
        setScanning(false);
        return;
      }

      const source =
        activeClient.website_url && websiteUrl.trim() ? "website_scan" : "manual_profile";

      await createCampaignFromProfile(activeClient, source);
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
      (file) => file.type.startsWith("image/") || file.type === "application/pdf"
    );

    if (acceptedFiles.length === 0) {
      alert("Please upload photos, flyers, posters, or offer graphics.");
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
      alert("Website saved. Now upload photos or flyers, then create weekly posts.");
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

  return (
    <>
      <div className="page-header dashboard-simple-header">
        <div className="page-eyebrow">FromOne Dashboard</div>
        <h1 className="page-title">Upload. Review. Publish.</h1>
        <p className="page-description">
          Upload your business photos or flyers. FromOne turns them into Facebook, Instagram and
          TikTok posts.
        </p>

        <div className="dashboard-header-actions-row">
          {!loading && (
            <section
              className={
                accessLocked
                  ? "access-status-card access-status-locked dashboard-access-pill"
                  : "access-status-card dashboard-access-pill"
              }
            >
              <div>
                <div className="page-eyebrow">{accessLocked ? "Demo ended" : "Access active"}</div>
                <h2>
                  {accessLocked
                    ? "Creating weekly posts is currently locked."
                    : "Your access is active."}
                </h2>
                <p>{accessMessage}</p>
              </div>

              {accessLocked && (
                <Link href="/subscription" className="dashboard-profile-link">
                  View subscription options
                </Link>
              )}
            </section>
          )}
        </div>
      </div>

      {loading ? (
        <div className="premium-card">
          <p>Loading business profile...</p>
        </div>
      ) : (
        <>
          <section className="dashboard-simple-shell dashboard-simple-shell-stacked">
            <div className="dashboard-create-card">
              <div className="page-eyebrow">Business profile</div>

              <h2>
                {hasWebsite
                  ? "Use this website to create posts."
                  : hasManualProfile
                    ? "Use the saved business details."
                    : "Add a website or business details."}
              </h2>

              <p>
                Add your business details once, then upload this week’s photos or flyers. FromOne
                uses the business profile to write stronger posts.
              </p>

              <div className="button-row" style={{ marginBottom: 18 }}>
                <Link href="/posts" className="dashboard-profile-link">
                  View existing posts
                </Link>
              </div>

              <div className="dashboard-tour-target-wrap">
                <label>
                  <strong>Business website</strong>
                  <span>
                    Add the website you want FromOne to understand. You can also use business
                    details instead.
                  </span>
                </label>

                <input
                  className="input"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div className="dashboard-scan-usage-pill">
                {weeklyScansRemaining} of {weeklyScanLimit} website scans left this week
              </div>

              <div className="dashboard-create-action-row">
                <button
                  type="button"
                  className="dashboard-primary-scan-button"
                  onClick={handleSaveWebsiteOnly}
                  disabled={accessLocked || scanning || savingWebsite || savingManualProfile}
                >
                  {savingWebsite ? "Saving website..." : "Use this website"}
                </button>

                <button
                  type="button"
                  className="secondary-button dashboard-manual-toggle-button"
                  onClick={() => setShowManualProfile(!showManualProfile)}
                  disabled={scanning || savingWebsite || savingManualProfile}
                >
                  {showManualProfile
                    ? "Hide business details"
                    : hasManualProfile
                      ? "Edit business details"
                      : "No website? Add business details"}
                </button>

                <span className="dashboard-tour-link-target dashboard-view-posts-action">
                  <Link href="/posts" className="dashboard-profile-link">
                    View posts
                  </Link>
                </span>
              </div>
            </div>

            {showManualProfile && (
              <section className="dashboard-manual-profile-card dashboard-manual-profile-card-inline">
                <div className="dashboard-manual-profile-header">
                  <div>
                    <div className="page-eyebrow">Business details</div>
                    <h2>Add business details.</h2>
                    <p>
                      Use this when there is no website, or when you want to guide FromOne manually.
                    </p>
                  </div>
                </div>

                <div className="dashboard-manual-profile-grid">
                  <label>
                    <strong>Business name</strong>
                    <input
                      className="input"
                      value={manualBusinessName}
                      onChange={(event) => setManualBusinessName(event.target.value)}
                      placeholder="Example: Baker & Co Plumbing"
                    />
                  </label>

                  <label>
                    <strong>Industry</strong>
                    <input
                      className="input"
                      value={manualIndustry}
                      onChange={(event) => setManualIndustry(event.target.value)}
                      placeholder="Example: Plumbing, beauty, signage"
                    />
                  </label>

                  <label>
                    <strong>Location</strong>
                    <input
                      className="input"
                      value={manualLocation}
                      onChange={(event) => setManualLocation(event.target.value)}
                      placeholder="Example: Manchester"
                    />
                  </label>

                  <label>
                    <strong>Tone of voice</strong>
                    <select
                      className="input"
                      value={manualTone}
                      onChange={(event) => setManualTone(event.target.value)}
                    >
                      <option>Professional</option>
                      <option>Friendly</option>
                      <option>Premium</option>
                      <option>Fun</option>
                      <option>Direct</option>
                      <option>Luxury</option>
                      <option>Trustworthy</option>
                    </select>
                  </label>

                  <label>
                    <strong>Services</strong>
                    <span>Separate with commas.</span>
                    <textarea
                      className="input"
                      value={manualServices}
                      onChange={(event) => setManualServices(event.target.value)}
                      placeholder="Emergency callouts, installations, repairs"
                    />
                  </label>

                  <label>
                    <strong>Who are the customers?</strong>
                    <span>Separate with commas.</span>
                    <textarea
                      className="input"
                      value={manualAudience}
                      onChange={(event) => setManualAudience(event.target.value)}
                      placeholder="Homeowners, landlords, small business owners"
                    />
                  </label>

                  <label>
                    <strong>Main offer or call to action</strong>
                    <textarea
                      className="input"
                      value={manualMainOffer}
                      onChange={(event) => setManualMainOffer(event.target.value)}
                      placeholder="Book a free quote today"
                    />
                  </label>

                  <label>
                    <strong>Business goals</strong>
                    <span>Separate with commas.</span>
                    <textarea
                      className="input"
                      value={manualGoals}
                      onChange={(event) => setManualGoals(event.target.value)}
                      placeholder="More enquiries, build trust, promote services"
                    />
                  </label>

                  <label>
                    <strong>What should the posts focus on?</strong>
                    <span>Separate with commas.</span>
                    <textarea
                      className="input"
                      value={manualContentPillars}
                      onChange={(event) => setManualContentPillars(event.target.value)}
                      placeholder="Helpful advice, customer trust, services, offers"
                    />
                  </label>
                </div>

                <div className="dashboard-manual-profile-actions dashboard-manual-profile-actions-clean">
                  <div>
                    <strong>Save the business details.</strong>
                    <span>Then upload photos or flyers and create the weekly posts.</span>
                  </div>

                  <button
                    type="button"
                    onClick={saveManualProfile}
                    disabled={scanning || savingManualProfile}
                  >
                    {savingManualProfile ? "Saving details..." : "Save business details"}
                  </button>
                </div>
              </section>
            )}

            <section
              className="premium-card dashboard-weekly-uploads-card"
              style={{ marginTop: 22 }}
            >
              <div className="page-eyebrow">Weekly uploads</div>
              <h2 style={{ marginTop: 0 }}>Upload this week’s photos or flyers.</h2>
              <p style={{ marginTop: 0 }}>
                Add job photos, before/after images, offer graphics, flyers, product shots, food
                photos, or salon results. The number of uploads decides the number of posts.
              </p>

              <label
                className="dashboard-primary-scan-button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  marginTop: 8,
                }}
              >
                Upload photos or flyers
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    handleWeeklyUploadFiles(event.target.files);
                    event.target.value = "";
                  }}
                  style={{ display: "none" }}
                />
              </label>

              {weeklyUploads.length > 0 ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 12,
                      marginTop: 18,
                    }}
                  >
                    {weeklyUploads.map((upload, index) => (
                      <div key={upload.id} className="card" style={{ padding: 10 }}>
                        <div
                          style={{
                            minHeight: 110,
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
                              alt={`Weekly upload ${index + 1}`}
                              style={{
                                width: "100%",
                                height: 130,
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <strong>Flyer PDF</strong>
                          )}
                        </div>

                        <strong>Post {index + 1}</strong>
                        <p
                          style={{
                            margin: "6px 0",
                            opacity: 0.76,
                            fontSize: 13,
                          }}
                        >
                          {upload.file.name}
                        </p>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => removeWeeklyUpload(upload.id)}
                          disabled={scanning}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="dashboard-scan-usage-pill" style={{ marginTop: 16 }}>
                    {weeklyUploads.length} uploads = {weeklyUploads.length} posts
                  </div>
                </>
              ) : (
                <div className="dashboard-scan-usage-pill" style={{ marginTop: 16 }}>
                  No photos yet? FromOne can still create posts from your website or business
                  details.
                </div>
              )}
            </section>

            <section
              className="premium-card dashboard-options-summary-card"
              style={{ marginTop: 22 }}
            >
              <div className="page-eyebrow">Simple plan</div>
              <h2 style={{ marginTop: 0 }}>Facebook, Instagram and TikTok.</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginTop: 14,
                }}
              >
                <div className="card" style={{ padding: 14 }}>
                  <strong>Reach</strong>
                  <p style={{ margin: "6px 0 0", opacity: 0.78 }}>
                    {marketReachDisplayLabel}
                  </p>
                </div>

                <div className="card" style={{ padding: 14 }}>
                  <strong>Posts</strong>
                  <p style={{ margin: "6px 0 0", opacity: 0.78 }}>
                    {uploadDrivenPostCount > 0
                      ? `${uploadDrivenPostCount} uploads = ${uploadDrivenPostCount} posts`
                      : `${selectedPostingFrequencyOption.title} backup`}
                  </p>
                </div>

                <div className="card" style={{ padding: 14 }}>
                  <strong>Platforms</strong>
                  <p style={{ margin: "6px 0 0", opacity: 0.78 }}>
                    {selectedPlatformSummary || "Choose platforms"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="secondary-button"
                style={{ marginTop: 16 }}
                onClick={() => setShowAdvancedOptions((current) => !current)}
              >
                {showAdvancedOptions ? "Hide options" : "Change options"}
              </button>
            </section>

            {showAdvancedOptions && (
              <>
                <section className="dashboard-platform-selector dashboard-platform-selector-full">
                  <div className="dashboard-platform-selector-header">
                    <div>
                      <div className="page-eyebrow">Choose your reach</div>
                      <h3>Who are these posts aimed at?</h3>
                      <p>
                        This helps FromOne decide whether to write with local, nationwide, or
                        online customer intent.
                      </p>
                    </div>
                  </div>

                  <div className="dashboard-platform-carousel dashboard-market-reach-grid">
                    {marketReachOptions.map((option) => {
                      const isSelected = selectedMarketReach === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={
                            isSelected
                              ? "dashboard-platform-carousel-card dashboard-market-reach-card is-selected"
                              : "dashboard-platform-carousel-card dashboard-market-reach-card"
                          }
                          onClick={() => setSelectedMarketReach(option.value)}
                          aria-pressed={isSelected}
                        >
                          <span className="dashboard-platform-check">
                            {isSelected ? "✓" : "+"}
                          </span>

                          <strong>{option.title}</strong>
                          <small className="is-visible">{option.description}</small>
                        </button>
                      );
                    })}
                  </div>

                  <div className="dashboard-selected-platforms-line">
                    <strong>Reach</strong>
                    <span>{marketReachDisplayLabel}</span>
                  </div>
                </section>

                <section className="dashboard-platform-selector dashboard-platform-selector-full">
                  <div className="dashboard-platform-selector-header">
                    <div>
                      <div className="page-eyebrow">Backup post count</div>
                      <h3>How many posts without uploads?</h3>
                      <p>
                        Uploads control the post count. This backup is only used when there are no
                        uploaded photos or flyers.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 20,
                      marginTop: 24,
                    }}
                  >
                    {postingFrequencyOptions.map((option) => {
                      const selected = selectedPostingFrequency === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedPostingFrequency(option.value)}
                          className={
                            selected
                              ? "dashboard-platform-carousel-card is-selected"
                              : "dashboard-platform-carousel-card"
                          }
                        >
                          <span className="dashboard-platform-check">
                            {selected ? "✓" : "+"}
                          </span>
                          <strong>{option.title}</strong>
                          <small className="is-visible">{option.description}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="dashboard-platform-selector dashboard-platform-selector-full">
                  <div className="dashboard-platform-selector-header">
                    <div>
                      <div className="page-eyebrow">Choose your platforms</div>
                      <h3>Where should FromOne create posts?</h3>
                      <p>FromOne currently focuses on Facebook, Instagram and TikTok.</p>
                    </div>

                    <div className="dashboard-platform-carousel-actions">
                      <button
                        type="button"
                        className="secondary-button dashboard-platform-recommend-button"
                        onClick={selectRecommendedPlatforms}
                      >
                        Use recommended
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-platform-carousel-wrap">
                    <div className="dashboard-platform-carousel" aria-label="Social platform selector">
                      {availablePlatforms.map((platform) => {
                        const isSelected = selectedPlatforms.includes(platform.name);

                        return (
                          <button
                            key={platform.name}
                            type="button"
                            className={
                              isSelected
                                ? "dashboard-platform-carousel-card is-selected"
                                : "dashboard-platform-carousel-card"
                            }
                            onClick={() => togglePlatform(platform.name)}
                            aria-pressed={isSelected}
                          >
                            <span className="dashboard-platform-check">
                              {isSelected ? "✓" : "+"}
                            </span>

                            <strong>{platform.shortName}</strong>
                            <small className="is-visible">{platform.description}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="dashboard-selected-platforms-line">
                    <strong>{selectedPlatforms.length}</strong>
                    <span>selected: {selectedPlatforms.join(", ")}</span>
                  </div>
                </section>
              </>
            )}

            <section
              className="premium-card"
              style={{
                marginTop: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="page-eyebrow">Ready</div>
                <h2 style={{ margin: "0 0 8px" }}>Create weekly posts.</h2>
                <p style={{ margin: 0 }}>
                  FromOne will create {effectivePostCount} posts for{" "}
                  {marketReachContext.toLowerCase()} using Facebook, Instagram and TikTok.
                </p>

                {(hasFacebookConnection || hasInstagramConnection || hasScheduledPost) && (
                  <p style={{ margin: "8px 0 0", opacity: 0.76 }}>
                    {hasFacebookConnection ? "Facebook connected. " : ""}
                    {hasInstagramConnection ? "Instagram connected. " : ""}
                    {hasScheduledPost ? "You already have scheduled posts." : ""}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="dashboard-platform-create-button"
                onClick={handleGeneratePosts}
                disabled={accessLocked || scanning || savingWebsite || savingManualProfile}
              >
                {scanning || savingWebsite
                  ? hasWebsite
                    ? "Saving uploads and scanning..."
                    : "Saving uploads and creating posts..."
                  : "Create weekly posts"}
              </button>
            </section>
          </section>
        </>
      )}

      {scanning && (
        <div className="fromone-loading-overlay" role="status" aria-live="polite">
          <section className="fromone-loading-card">
            <div className="fromone-loading-orb">
              <span />
              <span />
              <span />
            </div>

            <div className="page-eyebrow">
              {weeklyUploads.length > 0 ? "Saving uploads" : hasWebsite ? "Website scan" : "Creating posts"}
            </div>

            <h2>
              {weeklyUploads.length > 0
                ? "Saving your photos and creating posts."
                : hasWebsite
                  ? "Scanning your website."
                  : "Creating your weekly posts."}
            </h2>

            <p>
              FromOne is using the business profile, weekly uploads, local angle and selected
              platforms to create ready-to-review posts.
            </p>

            <div className="fromone-loading-steps">
              <span>Saving weekly uploads</span>
              <span>Reading business details</span>
              <span>Creating one post per upload</span>
              <span>Attaching media to posts</span>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
