"use client";

import "./posts.css";

import { CSSProperties, ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

import WeeklyPlanControls from "@/components/posts/WeeklyPlanControls";
import WeeklyQueue from "@/components/posts/WeeklyQueue";
import PostActionModal from "@/components/posts/PostActionModal";
import TodayReminderModal from "@/components/posts/TodayReminderModal";
import PostSuccessModal from "@/components/posts/PostSuccessModal";
import ReviewPromptModal from "@/components/posts/ReviewPromptModal";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MEDIA_BUCKET = "campaign-assets";
const MAX_SAVED_CAMPAIGNS = 4;

const REVIEW_PROMPT_DISMISSED_KEY = "fromone_review_prompt_dismissed";
const REVIEW_PROMPT_SUBMITTED_KEY = "fromone_review_prompt_submitted";
const REVIEW_PROMPT_POSTED_COUNT_KEY = "fromone_review_prompt_posted_count";
const REVIEW_PROMPT_TRIGGER_COUNT = 3;

const DEMO_WEEKLY_MEDIA_RESCAN_LIMIT = 3;
const PAID_WEEKLY_MEDIA_RESCAN_LIMIT = 10;
const DEMO_WEEKLY_VIDEO_RESCAN_LIMIT = 1;
const PAID_WEEKLY_VIDEO_RESCAN_LIMIT = 2;

const MEDIA_RESCAN_EVENT_TYPES = ["post_media_rescan", "post_image_rescan", "post_flyer_rescan"];
const VIDEO_RESCAN_EVENT_TYPES = ["post_video_rescan"];

type AccessInfo = {
  id: string;
  user_id: string;
  access_status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  extension_ends_at: string | null;
  subscription_status: string | null;
};

type MetaConnection = {
  id: string;
  provider: string;
  provider_user_name: string | null;
  page_id: string | null;
  page_name: string | null;
  instagram_business_account_id: string | null;
  instagram_username: string | null;
  expires_at: string | null;
  status: string | null;
  updated_at: string | null;
};

type SuccessMoment = {
  postsLeft: number;
  nextPostId: string | null;
};

type ImprovementNote = {
  postId: string;
  label: string;
  detail: string;
};

type PostStatus = "Ready" | "Reminder set" | "Posted" | "Failed";
type BillingPlan = "demo" | "starter";

const MAIN_POST_PLATFORMS = ["Facebook", "Instagram", "TikTok"];

const quickImproveActions = [
  { value: "make_shorter", label: "Make shorter" },
  { value: "make_more_local", label: "More local" },
  { value: "make_sales_focused", label: "More sales-focused" },
  { value: "make_less_generic", label: "Less generic" },
  { value: "different_version", label: "Different version" },
];

const defaultAudienceTargets = [
  "Local customers",
  "Small business owners",
  "Busy professionals",
  "Families",
  "Homeowners",
  "New customers",
  "Returning customers",
  "Custom audience",
];

const toneOptions = [
  "Use current tone",
  "More friendly",
  "More professional",
  "More premium",
  "More direct",
  "More fun",
  "More trustworthy",
];

const industryAudienceTargets: Record<string, string[]> = {
  plumbing: [
    "Homeowners",
    "Landlords",
    "Property managers",
    "Letting agents",
    "Small business owners",
    "Emergency callout customers",
    "Custom audience",
  ],
  electrician: [
    "Homeowners",
    "Landlords",
    "Property managers",
    "Small business owners",
    "Emergency repair customers",
    "New homeowners",
    "Custom audience",
  ],
  roofing: [
    "Homeowners",
    "Landlords",
    "Property managers",
    "Commercial property owners",
    "Storm damage customers",
    "Home sellers",
    "Custom audience",
  ],
  signage: [
    "Small business owners",
    "Retail shops",
    "Construction companies",
    "Estate agents",
    "Event organisers",
    "Local tradespeople",
    "Custom audience",
  ],
  print: [
    "Small business owners",
    "Event organisers",
    "Retail shops",
    "Startups",
    "Local organisations",
    "Marketing managers",
    "Custom audience",
  ],
  beauty: [
    "Local shoppers",
    "Brides",
    "Busy professionals",
    "Luxury buyers",
    "Regular clients",
    "New clients",
    "Custom audience",
  ],
  hair: [
    "Local clients",
    "Brides",
    "Busy professionals",
    "Regular clients",
    "New clients",
    "Style-conscious customers",
    "Custom audience",
  ],
  fitness: [
    "Beginners",
    "Busy professionals",
    "Parents",
    "Weight loss clients",
    "Strength training clients",
    "Local residents",
    "Custom audience",
  ],
  restaurant: [
    "Local diners",
    "Families",
    "Couples",
    "Office workers",
    "Weekend customers",
    "Event bookings",
    "Custom audience",
  ],
  cafe: [
    "Local shoppers",
    "Office workers",
    "Students",
    "Remote workers",
    "Families",
    "Weekend customers",
    "Custom audience",
  ],
  estate: [
    "First-time buyers",
    "Homeowners",
    "Landlords",
    "Property investors",
    "Sellers",
    "Tenants",
    "Custom audience",
  ],
  property: [
    "First-time buyers",
    "Homeowners",
    "Landlords",
    "Property investors",
    "Sellers",
    "Tenants",
    "Custom audience",
  ],
  ecommerce: [
    "Online shoppers",
    "Gift buyers",
    "Returning customers",
    "Deal seekers",
    "Luxury buyers",
    "New customers",
    "Custom audience",
  ],
  accounting: [
    "Small business owners",
    "Sole traders",
    "Startups",
    "Limited company directors",
    "Self-employed professionals",
    "Landlords",
    "Custom audience",
  ],
  legal: [
    "Small business owners",
    "Families",
    "Homeowners",
    "Landlords",
    "Employers",
    "People needing advice",
    "Custom audience",
  ],
  dental: [
    "Families",
    "Nervous patients",
    "New patients",
    "Cosmetic dentistry clients",
    "Parents",
    "Local residents",
    "Custom audience",
  ],
  mechanic: [
    "Car owners",
    "Fleet owners",
    "Commuters",
    "Families",
    "Local drivers",
    "Van owners",
    "Custom audience",
  ],
  garage: [
    "Car owners",
    "Fleet owners",
    "Commuters",
    "Families",
    "Local drivers",
    "Van owners",
    "Custom audience",
  ],
  club: [
    "Local nightlife customers",
    "Students",
    "Weekend groups",
    "Birthday groups",
    "Event bookers",
    "VIP table customers",
    "Custom audience",
  ],
  nightclub: [
    "Local nightlife customers",
    "Students",
    "Weekend groups",
    "Birthday groups",
    "Event bookers",
    "VIP table customers",
    "Custom audience",
  ],
  bar: [
    "Local nightlife customers",
    "After-work customers",
    "Weekend groups",
    "Event bookers",
    "Couples",
    "Regular customers",
    "Custom audience",
  ],
};

const normaliseMainPlatform = (platform?: string | null) => {
  const cleanPlatform = String(platform || "").toLowerCase();

  if (cleanPlatform.includes("facebook")) return "Facebook";
  if (cleanPlatform.includes("instagram")) return "Instagram";
  if (cleanPlatform.includes("tiktok")) return "TikTok";

  return "Post";
};

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [deletedPosts, setDeletedPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [metaConnections, setMetaConnections] = useState<MetaConnection[]>([]);

  const [billingPlan, setBillingPlan] = useState<BillingPlan>("demo");
  const [weeklyMediaRescansUsed, setWeeklyMediaRescansUsed] = useState(0);
  const [weeklyVideoRescansUsed, setWeeklyVideoRescansUsed] = useState(0);
  const [rescanningMediaPostId, setRescanningMediaPostId] = useState<string | null>(null);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [pendingCampaignId, setPendingCampaignId] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingSelectedPlan, setLoadingSelectedPlan] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [renamingCampaign, setRenamingCampaign] = useState(false);

  const [accessLocked, setAccessLocked] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const [audienceTarget, setAudienceTarget] = useState("Local customers");
  const [customAudienceTarget, setCustomAudienceTarget] = useState("");
  const [toneTarget, setToneTarget] = useState("Use current tone");
  const [rewritingPost, setRewritingPost] = useState(false);
  const [rewritingAction, setRewritingAction] = useState("");
  const [improvementNote, setImprovementNote] = useState<ImprovementNote | null>(null);
  const [showImproveTools, setShowImproveTools] = useState(false);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editCta, setEditCta] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [uploadingMediaPostId, setUploadingMediaPostId] = useState<string | null>(null);
  const [removingMediaPostId, setRemovingMediaPostId] = useState<string | null>(null);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [savingReminderPostId, setSavingReminderPostId] = useState<string | null>(null);
  const [reminderValue, setReminderValue] = useState("");
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [recentlyDeletedPost, setRecentlyDeletedPost] = useState<any | null>(null);

  const [showTodayReminder, setShowTodayReminder] = useState(false);
  const [todayReminderPostId, setTodayReminderPostId] = useState<string | null>(null);
  const [successMoment, setSuccessMoment] = useState<SuccessMoment | null>(null);

  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const queueRef = useRef<HTMLDivElement | null>(null);
  const postRef = useRef<HTMLElement | null>(null);
  const mediaRef = useRef<HTMLElement | null>(null);
  const publishRef = useRef<HTMLElement | null>(null);

  const sortPostsByDate = (items: any[]) => {
    return [...items].sort((firstPost, secondPost) => {
      const firstTime = firstPost.scheduled_at ? new Date(firstPost.scheduled_at).getTime() : 0;
      const secondTime = secondPost.scheduled_at ? new Date(secondPost.scheduled_at).getTime() : 0;
      return firstTime - secondTime;
    });
  };

  const isPostPosted = (post: any) => {
    return (
      post?.is_posted === true ||
      String(post?.status || "").toLowerCase() === "posted" ||
      String(post?.publish_status || "").toLowerCase() === "posted"
    );
  };

  const isPostFailed = (post: any) => {
    return String(post?.publish_status || "").toLowerCase() === "failed";
  };

  const isPostReminderSet = (post: any) => {
    if (isPostPosted(post)) return false;
    if (isPostFailed(post)) return false;

    return (
      Boolean(post?.scheduled_publish_at) ||
      String(post?.status || "").toLowerCase() === "scheduled" ||
      String(post?.publish_status || "").toLowerCase() === "scheduled"
    );
  };

  const getPostStatus = (post: any): PostStatus => {
    if (isPostFailed(post)) return "Failed";
    if (isPostPosted(post)) return "Posted";
    if (isPostReminderSet(post)) return "Reminder set";
    return "Ready";
  };

  const getStatusClass = (status: PostStatus) => {
    if (status === "Posted") return "is-posted";
    if (status === "Reminder set") return "is-scheduled";
    if (status === "Failed") return "is-failed";
    return "is-ready";
  };

  const sortedPosts = useMemo(() => sortPostsByDate(posts), [posts]);

  const selectedPost = useMemo(() => {
    if (!selectedPostId) return null;
    return sortedPosts.find((post) => post.id === selectedPostId) || null;
  }, [selectedPostId, sortedPosts]);

  const activePostForEditing = useMemo(() => {
    if (!editingPostId) return null;
    return sortedPosts.find((post) => post.id === editingPostId) || null;
  }, [editingPostId, sortedPosts]);

  const activeIndustry = String(
    profile?.industry || campaign?.business_type || campaign?.industry || "",
  ).toLowerCase();

  const dynamicAudienceTargets = useMemo(() => {
    const matchedKey = Object.keys(industryAudienceTargets).find((key) =>
      activeIndustry.includes(key),
    );

    return matchedKey ? industryAudienceTargets[matchedKey] : defaultAudienceTargets;
  }, [activeIndustry]);

  useEffect(() => {
    loadPageData();

    const params = new URLSearchParams(window.location.search);
    const metaConnected = params.get("meta_connected");
    const metaError = params.get("meta_error");

    if (metaConnected === "true") {
      alert("Facebook and Instagram connected.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (metaConnected === "false") {
      alert(metaError || "Meta connection failed.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dynamicAudienceTargets.includes(audienceTarget)) {
      setAudienceTarget(dynamicAudienceTargets[0] || "Custom audience");
    }
  }, [dynamicAudienceTargets, audienceTarget]);

  useEffect(() => {
    if (loading || posts.length === 0) return;

    const todayUnpostedPost = posts.find(
      (post) => isPostScheduledToday(post) && !isPostPosted(post),
    );

    if (!todayUnpostedPost) return;

    const storageKey = `fromone_today_post_alert_${getTodayKey()}`;

    if (localStorage.getItem(storageKey) === "true") return;

    localStorage.setItem(storageKey, "true");
    setTodayReminderPostId(todayUnpostedPost.id);
    setShowTodayReminder(true);
  }, [loading, posts]);

  useEffect(() => {
    if (!selectedPost) {
      setReminderValue("");
      return;
    }

    setReminderValue(toDateTimeInputValue(selectedPost.scheduled_publish_at || ""));
  }, [selectedPost]);

  const getTodayKey = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getSevenDaysAgoIso = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return sevenDaysAgo.toISOString();
  };

  const shouldOpenTodayPost = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("today") === "true";
  };

  const isSameDate = (firstDate: Date, secondDate: Date) => {
    return (
      firstDate.getFullYear() === secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate()
    );
  };

  const isPostScheduledToday = (post: any) => {
    if (!post?.scheduled_at) return false;
    return isSameDate(new Date(post.scheduled_at), new Date());
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
        "Your 7-day demo has ended. You can still view and publish existing posts, but editing, media upload, and improving posts are locked until access is extended or a subscription is active.",
    };
  };

  const getReadableError = (error: any, fallback = "Something went wrong.") => {
    if (!error) return fallback;
    if (typeof error === "string") return error;

    if (axios.isAxiosError(error)) {
      return (
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data?.details ||
        error.message ||
        fallback
      );
    }

    return (
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      error?.error_description ||
      error?.details ||
      fallback
    );
  };

  const ensureAccessAllowed = () => {
    if (!accessLocked) return true;
    alert(accessMessage);
    return false;
  };

  const getSignedInUserId = async () => {
    if (currentUserId) return currentUserId;

    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
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

  const loadBillingPlan = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_billing")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error loading billing plan:", error.message);
      setBillingPlan("demo");
      return "demo" as BillingPlan;
    }

    const plan = data?.plan === "starter" && data?.status === "active" ? "starter" : "demo";

    setBillingPlan(plan);
    return plan as BillingPlan;
  };

  const loadRescanUsage = async (userId: string) => {
    const since = getSevenDaysAgoIso();

    const [{ count: mediaCount, error: mediaError }, { count: videoCount, error: videoError }] =
      await Promise.all([
        supabase
          .from("usage_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("event_type", MEDIA_RESCAN_EVENT_TYPES)
          .gte("created_at", since),
        supabase
          .from("usage_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("event_type", VIDEO_RESCAN_EVENT_TYPES)
          .gte("created_at", since),
      ]);

    if (mediaError) {
      console.error("Error loading media rescan usage:", mediaError.message);
      setWeeklyMediaRescansUsed(0);
    } else {
      setWeeklyMediaRescansUsed(mediaCount || 0);
    }

    if (videoError) {
      console.error("Error loading video rescan usage:", videoError.message);
      setWeeklyVideoRescansUsed(0);
    } else {
      setWeeklyVideoRescansUsed(videoCount || 0);
    }

    return {
      mediaUsed: mediaError ? 0 : mediaCount || 0,
      videoUsed: videoError ? 0 : videoCount || 0,
    };
  };

  const recordUsageEvent = async (
    userId: string,
    eventType: string,
    metadata: Record<string, any> = {},
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

    await loadRescanUsage(userId);
  };

  const getWeeklyMediaRescanLimit = () => {
    return billingPlan === "starter" ? PAID_WEEKLY_MEDIA_RESCAN_LIMIT : DEMO_WEEKLY_MEDIA_RESCAN_LIMIT;
  };

  const getWeeklyVideoRescanLimit = () => {
    return billingPlan === "starter" ? PAID_WEEKLY_VIDEO_RESCAN_LIMIT : DEMO_WEEKLY_VIDEO_RESCAN_LIMIT;
  };

  const getMediaRescanUsageLabel = () => {
    const limit = getWeeklyMediaRescanLimit();
    const remaining = Math.max(limit - weeklyMediaRescansUsed, 0);
    return `${remaining} of ${limit} image/flyer rescans left this week`;
  };

  const getVideoRescanUsageLabel = () => {
    const limit = getWeeklyVideoRescanLimit();
    const remaining = Math.max(limit - weeklyVideoRescansUsed, 0);
    return `${remaining} of ${limit} video rescans left this week`;
  };

  const checkMediaRescanLimit = async (userId: string, mediaType: string) => {
    const admin = await isAdminUser(userId);

    if (admin) return true;

    const plan = await loadBillingPlan(userId);
    const usage = await loadRescanUsage(userId);

    const isVideo = mediaType === "video";

    const limit = isVideo
      ? plan === "starter"
        ? PAID_WEEKLY_VIDEO_RESCAN_LIMIT
        : DEMO_WEEKLY_VIDEO_RESCAN_LIMIT
      : plan === "starter"
        ? PAID_WEEKLY_MEDIA_RESCAN_LIMIT
        : DEMO_WEEKLY_MEDIA_RESCAN_LIMIT;

    const used = isVideo ? usage.videoUsed : usage.mediaUsed;

    if (used >= limit) {
      alert(
        isVideo
          ? `You have used your ${limit} video rescans for this 7-day period. You can still edit the wording manually or replace the video without rescanning.`
          : `You have used your ${limit} image/flyer rescans for this 7-day period. You can still edit the wording manually or replace the media without rescanning.`,
      );

      return false;
    }

    return true;
  };

  const loadMetaConnections = async (userId: string) => {
    try {
      const response = await axios.get("/api/social-connections", {
        params: {
          user_id: userId,
        },
      });

      setMetaConnections(response.data?.connections || []);
    } catch (error) {
      console.error("Load Meta connections error:", error);
      setMetaConnections([]);
    }
  };

  const loadAccess = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth session error:", authError.message);
      setAccessLocked(false);
      setAccessMessage("Please sign in again.");
      return;
    }

    const userId = authData.user?.id;
    if (!userId) return;

    setCurrentUserId(userId);

    await Promise.all([
      loadMetaConnections(userId),
      loadBillingPlan(userId),
      loadRescanUsage(userId),
    ]);

    const { data, error } = await supabase
      .from("user_access")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error loading user access:", error.message);
      setAccessLocked(false);
      setAccessMessage("Access check unavailable.");
      return;
    }

    const calculated = calculateAccess((data || null) as AccessInfo | null);
    setAccessLocked(calculated.locked);
    setAccessMessage(calculated.message);
  };

  const loadCampaigns = async () => {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading weekly post sets:", error.message);
      setCampaigns([]);
      setCampaign(null);
      return [];
    }

    const loadedCampaigns = data || [];
    setCampaigns(loadedCampaigns);
    return loadedCampaigns;
  };

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from("business_profiles")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error loading business details:", error.message);
      setProfile(null);
      return;
    }

    setProfile(data);
  };

  const loadPosts = async (campaignId?: string | null) => {
    if (!campaignId) {
      setPosts([]);
      setDeletedPosts([]);
      setSelectedPostId(null);
      return;
    }

    const { data, error } = await supabase
      .from("campaign_posts")
      .select("*")
      .eq("campaign_id", campaignId)
      .is("deleted_at", null)
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error("Error loading posts:", error.message);
      setPosts([]);
      setSelectedPostId(null);
      return;
    }

    const loadedPosts = sortPostsByDate(data || []);
    setPosts(loadedPosts);

    const { data: deletedData, error: deletedError } = await supabase
      .from("campaign_posts")
      .select("*")
      .eq("campaign_id", campaignId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(10);

    if (deletedError) {
      console.error("Error loading deleted posts:", deletedError.message);
      setDeletedPosts([]);
    } else {
      setDeletedPosts(deletedData || []);
    }

    if (loadedPosts.length === 0) {
      setSelectedPostId(null);
      return;
    }

    const todayUnpostedPost = loadedPosts.find(
      (post) => isPostScheduledToday(post) && !isPostPosted(post),
    );

    if (shouldOpenTodayPost() && todayUnpostedPost) {
      setSelectedPostId(todayUnpostedPost.id);
      return;
    }

    setSelectedPostId(null);
  };

  const loadPageData = async () => {
    setLoading(true);

    const loadedCampaigns = await loadCampaigns();
    const params = new URLSearchParams(window.location.search);
    const requestedCampaignId = params.get("campaign");
    const preferredCampaignId = selectedCampaignId || requestedCampaignId;

    const activeCampaign =
      loadedCampaigns.find((item) => item.id === preferredCampaignId) ||
      loadedCampaigns[0] ||
      null;

    setCampaign(activeCampaign);
    setSelectedCampaignId(activeCampaign?.id || null);
    setPendingCampaignId(activeCampaign?.id || "");

    await Promise.all([
      loadPosts(activeCampaign?.id || null),
      loadProfile(),
      loadAccess(),
    ]);

    setLoading(false);
  };

  const switchCampaign = async (campaignId: string) => {
    const nextCampaign = campaigns.find((item) => item.id === campaignId) || null;

    setSelectedCampaignId(campaignId);
    setPendingCampaignId(campaignId);
    setCampaign(nextCampaign);
    setSelectedPostId(null);
    cancelEditingPost();
    setImprovementNote(null);
    setShowImproveTools(false);

    await loadPosts(campaignId);
  };

  const loadSelectedPlan = async () => {
    if (!pendingCampaignId) {
      alert("Please choose a weekly post set first.");
      return;
    }

    setLoadingSelectedPlan(true);

    try {
      await switchCampaign(pendingCampaignId);
    } finally {
      setLoadingSelectedPlan(false);
    }
  };

  const cleanCampaignLabel = (value: any) => {
    const raw = String(value || "").trim();

    return (
      raw
        .replace(
          /\s+—\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}(?:\s+\d{1,2}:\d{2})?(?:\s+—.*)?$/g,
          "",
        )
        .replace(/\s+-\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}.*$/g, "")
        .replace(
          /\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}(?:\s+\d{1,2}:\d{2})?$/g,
          "",
        )
        .trim() || "Weekly posts"
    );
  };

  const getCampaignOptionLabel = (item: any) => {
    const label =
      item.name ||
      item.business_name ||
      item.business_type ||
      item.campaign_area ||
      item.campaign_idea ||
      "Weekly posts";

    return cleanCampaignLabel(label);
  };

  const renameSelectedCampaign = async () => {
    if (!campaign?.id) {
      alert("No weekly post set selected.");
      return;
    }

    const currentName = campaign.name || campaign.campaign_idea || "Untitled weekly posts";
    const newName = prompt("Rename weekly posts:", currentName);

    if (newName === null) return;

    const cleanName = newName.trim();

    if (!cleanName) {
      alert("Name cannot be empty.");
      return;
    }

    setRenamingCampaign(true);

    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ name: cleanName })
        .eq("id", campaign.id);

      if (error) {
        alert(error.message);
        return;
      }

      setCampaign({ ...campaign, name: cleanName });

      setCampaigns((currentCampaigns) =>
        currentCampaigns.map((item) =>
          item.id === campaign.id ? { ...item, name: cleanName } : item,
        ),
      );

      alert("Weekly posts renamed.");
    } catch (error: any) {
      const message = getReadableError(error, "Error renaming weekly posts.");
      console.error("Rename weekly posts error:", error);
      alert(message);
    } finally {
      setRenamingCampaign(false);
    }
  };

  const deleteSelectedCampaign = async () => {
    if (!campaign?.id) {
      alert("No weekly post set selected.");
      return;
    }

    const campaignName = campaign.name || campaign.campaign_idea || "Selected weekly posts";

    const confirmed = confirm(
      `Delete this weekly post set and all its posts?\n\n${campaignName}\n\nThis cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingCampaign(true);

    try {
      const campaignIdToDelete = campaign.id;

      const { data: campaignPosts, error: postsLoadError } = await supabase
        .from("campaign_posts")
        .select("id, image_path, media_path")
        .eq("campaign_id", campaignIdToDelete);

      if (postsLoadError) {
        alert(postsLoadError.message);
        return;
      }

      const storagePaths =
        campaignPosts
          ?.flatMap((post) => [post.image_path, post.media_path])
          .filter(Boolean)
          .filter((value, index, array) => array.indexOf(value) === index) || [];

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .remove(storagePaths);

        if (storageError) {
          console.error("Weekly posts media delete error:", storageError.message);
        }
      }

      const { error: campaignDeleteError } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignIdToDelete);

      if (campaignDeleteError) {
        alert(campaignDeleteError.message);
        return;
      }

      setSelectedCampaignId(null);
      setPendingCampaignId("");
      setCampaign(null);
      setPosts([]);
      setSelectedPostId(null);
      setImprovementNote(null);
      setShowImproveTools(false);
      cancelEditingPost();

      alert("Weekly posts deleted.");
      await loadPageData();
    } catch (error: any) {
      const message = getReadableError(error, "Error deleting weekly posts.");
      console.error("Delete weekly posts error:", error);
      alert(message);
    } finally {
      setDeletingCampaign(false);
    }
  };

  const updatePostLocally = (postId: string, updates: any) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) => (post.id === postId ? { ...post, ...updates } : post)),
    );
  };

  const choosePost = (postId: string) => {
    setSelectedPostId(postId);
    setImprovementNote(null);
    setShowImproveTools(false);
    cancelEditingPost();
  };

  const closePostModal = () => {
    setSelectedPostId(null);
    setImprovementNote(null);
    setShowImproveTools(false);
    cancelEditingPost();
  };

  const selectNextPost = () => {
    if (sortedPosts.length === 0) return;

    if (!selectedPost) {
      choosePost(sortedPosts[0].id);
      return;
    }

    const selectedIndex = sortedPosts.findIndex((post) => post.id === selectedPost.id);
    const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = (safeIndex + 1) % sortedPosts.length;
    const nextPost = sortedPosts[nextIndex];

    if (!nextPost) return;

    choosePost(nextPost.id);
  };

  const getPostDateParts = (post: any) => {
    const date = post?.scheduled_at ? new Date(post.scheduled_at) : new Date();

    return {
      weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
      day: date.toLocaleDateString(undefined, { day: "2-digit" }),
      month: date.toLocaleDateString(undefined, { month: "short" }),
    };
  };

  const getPostPositionLabel = (post: any) => {
    const index = sortedPosts.findIndex((item) => item.id === post?.id);
    return index >= 0 ? `Post ${index + 1}` : post?.scheduled_day || "Post";
  };

  const hashtagsToString = (hashtags: any) => {
    if (Array.isArray(hashtags)) return hashtags.join(" ");
    if (typeof hashtags === "string") return hashtags;
    return "";
  };

  const stringToHashtags = (value: string) => {
    return value
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => (item.startsWith("#") ? item : `#${item}`));
  };

  const buildPostText = (post: any) => {
    const caption = post?.caption || "";
    const cta = post?.cta ? `CTA: ${post.cta}` : "";
    const hashtags = Array.isArray(post?.hashtags) ? post.hashtags.join(" ") : "";

    return [caption, cta, hashtags].filter(Boolean).join("\n\n").trim();
  };

  const copyPost = async (post: any) => {
    const textToCopy = buildPostText(post);

    if (!textToCopy) {
      alert("There is no post text to copy yet.");
      return;
    }

    await navigator.clipboard.writeText(textToCopy);
    alert("Post copied.");
  };

  const getImageGuidance = (post: any) => {
    if (post?.image_prompt?.trim()) {
      return post.image_prompt.trim();
    }

    const platform = String(post?.platform || "").toLowerCase();

    if (platform.includes("instagram") || platform.includes("tiktok")) {
      return "Use the uploaded photo, flyer, result image, product image, offer graphic, or short clip that matches this post.";
    }

    return "Choose a clear photo or flyer that supports the post, such as finished work, a product, an offer, your team, premises, or a customer result.";
  };

  const mediaRequiredForPlatform = (platform?: string) => {
    const cleanPlatform = String(platform || "").toLowerCase();

    return cleanPlatform.includes("instagram") || cleanPlatform.includes("tiktok");
  };

  const getPlatformUrl = (platform: string) => {
    const cleanPlatform = String(platform || "").toLowerCase();

    if (cleanPlatform.includes("facebook")) return "https://www.facebook.com";
    if (cleanPlatform.includes("instagram")) return "https://www.instagram.com";
    if (cleanPlatform.includes("tiktok")) return "https://www.tiktok.com/upload";

    return "https://www.facebook.com";
  };

  const openPlatform = (platform: string) => {
    window.open(getPlatformUrl(platform), "_blank");
  };

  const getPlatformDisplayName = (post: any) => {
    return normaliseMainPlatform(post?.platform);
  };

  const hasConnectedFacebookPage = () => {
    return metaConnections.some((connection) => {
      return (
        String(connection.provider || "").toLowerCase() === "meta" &&
        String(connection.status || "").toLowerCase() === "connected" &&
        Boolean(connection.page_id)
      );
    });
  };

  const hasConnectedInstagramAccount = () => {
    return metaConnections.some((connection) => {
      return (
        String(connection.provider || "").toLowerCase() === "meta" &&
        String(connection.status || "").toLowerCase() === "connected" &&
        Boolean(connection.instagram_business_account_id)
      );
    });
  };

  const canDirectPublishToFacebook = (post: any) => {
    return (
      String(post?.platform || "").toLowerCase().includes("facebook") &&
      hasConnectedFacebookPage()
    );
  };

  const canDirectPublishToInstagram = (post: any) => {
    return (
      String(post?.platform || "").toLowerCase().includes("instagram") &&
      hasConnectedInstagramAccount()
    );
  };

  const canDemoPublishToTikTok = (_post: any) => {
    return false;
  };

  const getMediaKind = (file: File) => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type === "application/pdf") return "flyer";
    return "image";
  };

  const getPostMediaKind = (post: any) => {
    const mediaType = String(post?.media_type || "").toLowerCase();
    const mediaUrl = String(post?.media_url || "").toLowerCase();

    if (mediaType === "video" || mediaUrl.match(/\.(mp4|mov|webm|m4v)(\?|$)/)) return "video";
    if (mediaType === "flyer" || mediaType === "pdf" || mediaUrl.includes(".pdf")) return "flyer";
    return "image";
  };

  const getSafeFileName = (fileName: string) => {
    const cleanName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return cleanName || "media";
  };

  const uploadMedia = async (post: any, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !post?.id) return;

    if (!ensureAccessAllowed()) return;

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/") &&
      file.type !== "application/pdf"
    ) {
      alert("Please upload an image, video, or PDF flyer.");
      return;
    }

    setUploadingMediaPostId(post.id);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const userId = authData.user?.id || "anonymous";
      const mediaType = getMediaKind(file);
      const safeFileName = getSafeFileName(file.name);
      const path = `${userId}/posts/${post.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);

      const updates = {
        media_url: publicUrlData.publicUrl,
        media_path: path,
        media_type: mediaType,
      };

      const { error: updateError } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", post.id);

      if (updateError) throw updateError;

      updatePostLocally(post.id, updates);

      alert(
        mediaType === "video"
          ? "Video added."
          : mediaType === "flyer"
            ? "Flyer added."
            : "Image added.",
      );
    } catch (error: any) {
      const message = getReadableError(error, "Error uploading media.");
      console.error("Upload media error:", error);
      alert(message);
    } finally {
      setUploadingMediaPostId(null);
    }
  };

  const removeMedia = async (post: any) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    const confirmed = confirm("Remove this media from the post?");

    if (!confirmed) return;

    setRemovingMediaPostId(post.id);

    try {
      if (post.media_path) {
        const { error: storageError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .remove([post.media_path]);

        if (storageError) {
          console.error("Remove media storage error:", storageError.message);
        }
      }

      const updates = {
        media_url: null,
        media_path: null,
        media_type: null,
      };

      const { error } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", post.id);

      if (error) throw error;

      updatePostLocally(post.id, updates);
      alert("Media removed.");
    } catch (error: any) {
      const message = getReadableError(error, "Error removing media.");
      console.error("Remove media error:", error);
      alert(message);
    } finally {
      setRemovingMediaPostId(null);
    }
  };

  const startEditingPost = (post: any) => {
    setEditingPostId(post.id);
    setEditCaption(post.caption || "");
    setEditCta(post.cta || "");
    setEditHashtags(hashtagsToString(post.hashtags));
  };

  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditCaption("");
    setEditCta("");
    setEditHashtags("");
  };

  const saveEditedPost = async () => {
    if (!activePostForEditing?.id) return;

    if (!ensureAccessAllowed()) return;

    if (!editCaption.trim()) {
      alert("Caption cannot be empty.");
      return;
    }

    setSavingEdit(true);

    try {
      const updates = {
        caption: editCaption.trim(),
        cta: editCta.trim(),
        hashtags: stringToHashtags(editHashtags),
      };

      const { error } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", activePostForEditing.id);

      if (error) {
        alert(error.message);
        return;
      }

      updatePostLocally(activePostForEditing.id, updates);

      setImprovementNote({
        postId: activePostForEditing.id,
        label: "Wording saved",
        detail: "Review the updated post, then add media or publish when ready.",
      });

      cancelEditingPost();
      alert("Post updated.");
    } catch (error: any) {
      const message = getReadableError(error, "Error saving post changes.");
      console.error("Save edited post error:", error);
      alert(message);
    } finally {
      setSavingEdit(false);
    }
  };

  const getToneForRewrite = () => {
    const currentTone = profile?.tone_of_voice || campaign?.tone || "Professional";

    if (toneTarget === "Use current tone") {
      return currentTone;
    }

    return `${currentTone}. Adjust this rewrite to be ${toneTarget.toLowerCase()}.`;
  };

  const applyRewrittenPost = async (
    post: any,
    rewritten: any,
    extraUpdates: Record<string, any> = {},
  ) => {
    const updates = {
      caption: rewritten.caption,
      cta: rewritten.cta,
      hashtags: Array.isArray(rewritten.hashtags) ? rewritten.hashtags : [],
      image_prompt: rewritten.image_prompt || post.image_prompt || "",
      ...extraUpdates,
    };

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", post.id);

    if (error) {
      alert(error.message);
      return false;
    }

    updatePostLocally(post.id, updates);

    if (editingPostId === post.id) {
      setEditCaption(updates.caption || "");
      setEditCta(updates.cta || "");
      setEditHashtags(hashtagsToString(updates.hashtags));
    }

    return true;
  };

  const handleRewriteForAudience = async (post: any) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    const finalAudience =
      audienceTarget === "Custom audience" ? customAudienceTarget.trim() : audienceTarget.trim();

    if (!finalAudience) {
      alert("Please enter who this post is for.");
      return;
    }

    if (!post.caption?.trim()) {
      alert("This post needs a caption before it can be improved.");
      return;
    }

    setRewritingAction("audience");
    setRewritingPost(true);

    try {
      const response = await axios.post("/api/rewritePost", {
        provider: "gemini",
        audienceTarget: finalAudience,
        tone: getToneForRewrite(),
        toneAdjustment: toneTarget,
        businessName: profile?.business_name || campaign?.business_name || "the business",
        industry: profile?.industry || campaign?.business_type || "general business",
        platform: post.platform || "Facebook",
        caption: post.caption || "",
        cta: post.cta || "",
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        image_prompt: post.image_prompt || "",
      });

      const saved = await applyRewrittenPost(post, response.data, {
        audience_target: finalAudience,
      });

      if (!saved) return;

      setImprovementNote({
        postId: post.id,
        label: `Improved for ${finalAudience}`,
        detail:
          response.data.improvement_summary ||
          "Made the post more specific for the selected audience.",
      });
    } catch (error: any) {
      const message = getReadableError(error, "Error improving post.");
      console.error("Make more specific error:", error);
      alert(message);
    } finally {
      setRewritingAction("");
      setRewritingPost(false);
    }
  };

  const handleQuickImprovePost = async (post: any, improvementAction: string) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    if (!post.caption?.trim()) {
      alert("This post needs a caption before it can be improved.");
      return;
    }

    const selectedAction = quickImproveActions.find((item) => item.value === improvementAction);
    const actionLabel = selectedAction?.label || "Improve post";

    setRewritingAction(improvementAction);
    setRewritingPost(true);

    try {
      const response = await axios.post("/api/rewritePost", {
        provider: "gemini",
        improvementAction,
        tone: getToneForRewrite(),
        businessName: profile?.business_name || campaign?.business_name || "the business",
        industry: profile?.industry || campaign?.business_type || "general business",
        platform: post.platform || "Facebook",
        caption: post.caption || "",
        cta: post.cta || "",
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        image_prompt: post.image_prompt || "",
      });

      const saved = await applyRewrittenPost(post, response.data, {
        audience_target: post.audience_target || null,
      });

      if (!saved) return;

      setImprovementNote({
        postId: post.id,
        label: `Improved: ${actionLabel}`,
        detail:
          response.data.improvement_summary ||
          "Review the updated post, then add media or publish when ready.",
      });
    } catch (error: any) {
      const message = getReadableError(error, "Error improving post.");
      console.error("Improve post error:", error);
      alert(message);
    } finally {
      setRewritingAction("");
      setRewritingPost(false);
    }
  };

  const handleRescanPostMedia = async (post: any) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    if (!post.media_url) {
      alert("Add media first, then rescan this post.");
      return;
    }

    const userId = await getSignedInUserId();

    if (!userId) {
      alert("Please sign in again.");
      return;
    }

    const mediaKind = getPostMediaKind(post);
    const allowed = await checkMediaRescanLimit(userId, mediaKind);

    if (!allowed) return;

    setRescanningMediaPostId(post.id);
    setRewritingAction("media_rescan");
    setRewritingPost(true);

    try {
      const response = await axios.post("/api/generatePosts", {
        provider: "gemini",
        website: "",
        clientName: profile?.business_name || campaign?.business_name || "the business",
        industry: profile?.industry || campaign?.business_type || "general business",
        description: `
Rewrite this single existing post after rescanning its attached media.

Business name: ${profile?.business_name || campaign?.business_name || "the business"}
Industry: ${profile?.industry || campaign?.business_type || "general business"}
Location: ${profile?.location || campaign?.location || campaign?.campaign_area || ""}
Tone: ${profile?.tone_of_voice || campaign?.tone || "Professional"}
Main offer: ${profile?.main_offer || ""}
Services: ${Array.isArray(profile?.services) ? profile.services.join(", ") : ""}
Target audience: ${
          Array.isArray(profile?.target_audience) ? profile.target_audience.join(", ") : ""
        }

Current post:
Platform: ${post.platform || "Facebook"}
Title: ${post.title || ""}
Caption: ${post.caption || ""}
CTA: ${post.cta || ""}
Hashtags: ${Array.isArray(post.hashtags) ? post.hashtags.join(" ") : ""}

Important:
- Create one improved post only.
- Use the attached media as the main topic.
- If this is a club night, event, venue, restaurant, bar, product demo, job photo, flyer, or live video, write around what that media is likely showing.
- Make the post more useful and more likely to generate enquiries, bookings, visits, orders, or messages.
- Keep the same platform unless there is a strong reason not to.
- Do not mention that AI rescanned the media.
- If the existing post was previously marked as posted, still create a fresh editable version for the app.
`,
        platforms: [post.platform || "Facebook"],
        selectedPlatforms: [post.platform || "Facebook"],
        postingFrequency: 1,
        numberOfPosts: 1,
        postCount: 1,
        marketReach: profile?.location ? `Local customers in and around ${profile.location}` : "Local customers",
        mediaItems: [
          {
            id: post.id,
            name: post.media_path || post.title || "Post media",
            type: mediaKind,
            url: post.media_url,
            context:
              mediaKind === "video"
                ? "Video attached to an existing post. Rescan it and rewrite the caption around the live footage, activity, atmosphere, event, offer, or product shown."
                : mediaKind === "flyer"
                  ? "Flyer or PDF attached to an existing post. Rescan it and rewrite the caption around the event, offer, date, service, price, or call to action."
                  : "Image attached to an existing post. Rescan it and rewrite the caption around the subject shown.",
            extractedText: "",
          },
        ],
        uploads: [
          {
            id: post.id,
            name: post.media_path || post.title || "Post media",
            type: mediaKind,
            url: post.media_url,
            context:
              mediaKind === "video"
                ? "Video attached to an existing post. Rescan it and rewrite the caption around the live footage, activity, atmosphere, event, offer, or product shown."
                : mediaKind === "flyer"
                  ? "Flyer or PDF attached to an existing post. Rescan it and rewrite the caption around the event, offer, date, service, price, or call to action."
                  : "Image attached to an existing post. Rescan it and rewrite the caption around the subject shown.",
            extractedText: "",
          },
        ],
      });

      const rewrittenPost = response.data?.posts?.[0];

      if (!rewrittenPost?.caption) {
        alert("The media rescan did not return a new post. Please try again.");
        return;
      }

      const saved = await applyRewrittenPost(post, rewrittenPost, {
        title: rewrittenPost.title || post.title,
        status: "ready",
        publish_status: null,
        publish_error: null,
        media_rescanned_at: new Date().toISOString(),
        media_rescan_type: mediaKind,
      });

      if (!saved) return;

      const eventType =
        mediaKind === "video"
          ? "post_video_rescan"
          : mediaKind === "flyer"
            ? "post_flyer_rescan"
            : "post_image_rescan";

      const admin = await isAdminUser(userId);

      if (!admin) {
        await recordUsageEvent(userId, eventType, {
          post_id: post.id,
          campaign_id: post.campaign_id,
          media_type: mediaKind,
          platform: post.platform || null,
        });
      }

      setImprovementNote({
        postId: post.id,
        label:
          mediaKind === "video"
            ? "Video rescanned"
            : mediaKind === "flyer"
              ? "Flyer rescanned"
              : "Image rescanned",
        detail:
          mediaKind === "video"
            ? "The post wording has been rebuilt around the attached video."
            : mediaKind === "flyer"
              ? "The post wording has been rebuilt around the attached flyer."
              : "The post wording has been rebuilt around the attached image.",
      });

      alert("Post rescanned and rewritten.");
    } catch (error: any) {
      const message = getReadableError(error, "Error rescanning media.");
      console.error("Media rescan error:", error);
      alert(message);
    } finally {
      setRescanningMediaPostId(null);
      setRewritingAction("");
      setRewritingPost(false);
    }
  };

  const maybeShowReviewPrompt = () => {
    if (typeof window === "undefined") return;

    const hasSubmitted = localStorage.getItem(REVIEW_PROMPT_SUBMITTED_KEY) === "true";
    const hasDismissed = localStorage.getItem(REVIEW_PROMPT_DISMISSED_KEY) === "true";

    if (hasSubmitted || hasDismissed) return;

    const currentCount = Number(localStorage.getItem(REVIEW_PROMPT_POSTED_COUNT_KEY) || "0");
    const nextCount = currentCount + 1;

    localStorage.setItem(REVIEW_PROMPT_POSTED_COUNT_KEY, String(nextCount));

    if (nextCount >= REVIEW_PROMPT_TRIGGER_COUNT) {
      setShowReviewPrompt(true);
    }
  };

  const showPostSuccess = (postId: string, updates: any) => {
    const postIndex = sortedPosts.findIndex((item) => item.id === postId);
    const updatedPosts = sortedPosts.map((item) =>
      item.id === postId ? { ...item, ...updates } : item,
    );
    const postsLeftAfterPublishing = updatedPosts.filter((item) => !isPostPosted(item)).length;
    const nextPost =
      updatedPosts.slice(postIndex + 1).find((item) => !isPostPosted(item)) ||
      updatedPosts.find((item) => !isPostPosted(item)) ||
      null;

    setSuccessMoment({
      postsLeft: postsLeftAfterPublishing,
      nextPostId: nextPost?.id || null,
    });
  };

  const publishToFacebook = async (post: any) => {
    if (!post?.id) return;

    if (!canDirectPublishToFacebook(post)) {
      window.location.href = "/settings?setup=business";
      return;
    }

    const text = buildPostText(post);

    if (!text) {
      alert("This post needs wording before it can be published.");
      return;
    }

    setPublishingPostId(post.id);

    try {
      const response = await axios.post("/api/facebook/publish", {
        postId: post.id,
        campaignPostId: post.id,
        campaign_id: post.campaign_id,
        platform: post.platform || "Facebook",
        message: text,
        text,
        caption: post.caption || "",
        cta: post.cta || "",
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        media_url: post.media_url || null,
        mediaUrl: post.media_url || null,
        media_type: post.media_type || null,
        mediaType: post.media_type || null,
      });

      const facebookPostId =
        response.data?.facebook_post_id ||
        response.data?.post_id ||
        response.data?.id ||
        response.data?.result?.id ||
        null;

      const updates = {
        is_posted: true,
        status: "posted",
        publish_status: "posted",
        publish_error: null,
        published_to: "Facebook",
        published_at: new Date().toISOString(),
        facebook_post_id: facebookPostId,
      };

      await supabase.from("campaign_posts").update(updates).eq("id", post.id);

      updatePostLocally(post.id, updates);
      maybeShowReviewPrompt();
      showPostSuccess(post.id, updates);
    } catch (error: any) {
      const message = getReadableError(error, "Facebook publishing failed.");

      const updates = {
        publish_status: "failed",
        publish_error: message,
        status: "failed",
      };

      await supabase.from("campaign_posts").update(updates).eq("id", post.id);
      updatePostLocally(post.id, updates);

      if (
        message.toLowerCase().includes("connection has expired") ||
        message.toLowerCase().includes("reconnect facebook")
      ) {
        const userId = await getSignedInUserId();
        if (userId) await loadMetaConnections(userId);
      }

      console.error("Facebook publish error:", error);
      alert(message);
    } finally {
      setPublishingPostId(null);
    }
  };

  const publishToInstagram = async (post: any) => {
    if (!post?.id) return;

    if (!canDirectPublishToInstagram(post)) {
      window.location.href = "/settings?setup=business";
      return;
    }

    const text = buildPostText(post);

    if (!text) {
      alert("This post needs wording before it can be published.");
      return;
    }

    if (!post.media_url || !post.media_type || post.media_type === "flyer") {
      alert("Instagram needs an image or video before publishing.");
      return;
    }

    setPublishingPostId(post.id);

    try {
      const response = await axios.post("/api/instagram/publish", {
        postId: post.id,
        campaignPostId: post.id,
        campaign_id: post.campaign_id,
        platform: post.platform || "Instagram",
        message: text,
        text,
        caption: post.caption || "",
        cta: post.cta || "",
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        media_url: post.media_url || null,
        mediaUrl: post.media_url || null,
        media_type: post.media_type || null,
        mediaType: post.media_type || null,
      });

      const instagramPostId =
        response.data?.instagram_post_id ||
        response.data?.instagramPostId ||
        response.data?.postId ||
        response.data?.post_id ||
        response.data?.id ||
        response.data?.result?.id ||
        null;

      const updates = {
        is_posted: true,
        status: "posted",
        publish_status: "posted",
        publish_error: null,
        published_to: "Instagram",
        published_at: new Date().toISOString(),
        instagram_post_id: instagramPostId,
      };

      await supabase.from("campaign_posts").update(updates).eq("id", post.id);

      updatePostLocally(post.id, updates);
      maybeShowReviewPrompt();
      showPostSuccess(post.id, updates);
    } catch (error: any) {
      const message = getReadableError(error, "Instagram publishing failed.");

      const updates = {
        publish_status: "failed",
        publish_error: message,
        status: "failed",
      };

      await supabase.from("campaign_posts").update(updates).eq("id", post.id);
      updatePostLocally(post.id, updates);

      if (
        message.toLowerCase().includes("connection has expired") ||
        message.toLowerCase().includes("reconnect facebook") ||
        message.toLowerCase().includes("reconnect instagram")
      ) {
        const userId = await getSignedInUserId();
        if (userId) await loadMetaConnections(userId);
      }

      console.error("Instagram publish error:", error);
      alert(message);
    } finally {
      setPublishingPostId(null);
    }
  };

  const publishToTikTokDemo = async (_post: any) => {
    alert("TikTok is manual for now. Copy the post and open TikTok to publish it.");
  };

  const markAsPosted = async (postId: string) => {
    const updates = {
      is_posted: true,
      status: "posted",
      publish_status: "posted",
      publish_error: null,
      published_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("campaign_posts").update(updates).eq("id", postId);

    if (error) {
      alert(error.message);
      return;
    }

    updatePostLocally(postId, updates);
    setSelectedPostId(null);
    showPostSuccess(postId, updates);
    maybeShowReviewPrompt();
  };

  const markAsNotPosted = async (postId: string) => {
    const updates = {
      is_posted: false,
      status: "ready",
      publish_status: null,
      publish_error: null,
      published_at: null,
      published_to: null,
      facebook_post_id: null,
      instagram_post_id: null,
      tiktok_post_id: null,
      publish_source: null,
    };

    const { error } = await supabase.from("campaign_posts").update(updates).eq("id", postId);

    if (error) {
      alert(error.message);
      return;
    }

    updatePostLocally(postId, updates);
  };

  const saveReminder = async (post: any) => {
    if (!post?.id) return;

    if (!reminderValue) {
      alert("Choose a date and time first.");
      return;
    }

    setSavingReminderPostId(post.id);

    try {
      const scheduledIso = new Date(reminderValue).toISOString();

      const updates = {
        scheduled_publish_at: scheduledIso,
        status: "scheduled",
        publish_status: "scheduled",
        publish_error: null,
        is_posted: false,
      };

      const { error } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", post.id);

      if (error) throw error;

      updatePostLocally(post.id, updates);
      alert("Schedule time saved.");
    } catch (error: any) {
      const message = getReadableError(error, "Error saving schedule time.");
      console.error("Save reminder error:", error);
      alert(message);
    } finally {
      setSavingReminderPostId(null);
    }
  };

  const clearReminder = async (post: any) => {
    if (!post?.id) return;

    setSavingReminderPostId(post.id);

    try {
      const updates = {
        scheduled_publish_at: null,
        status: "ready",
        publish_status: null,
        publish_error: null,
      };

      const { error } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", post.id);

      if (error) throw error;

      updatePostLocally(post.id, updates);
      setReminderValue("");
      alert("Schedule cleared.");
    } catch (error: any) {
      const message = getReadableError(error, "Error clearing schedule.");
      console.error("Clear reminder error:", error);
      alert(message);
    } finally {
      setSavingReminderPostId(null);
    }
  };

  const deletePostWithUndo = async (post: any) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    const posted = isPostPosted(post);

    const confirmMessage = posted
      ? "Archive this posted item from the weekly queue? Publish history will stay saved."
      : "Delete this post from the weekly queue? You can undo this straight after deleting.";

    const confirmed = confirm(confirmMessage);

    if (!confirmed) return;

    setDeletingPostId(post.id);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id || currentUserId || null;

      const updates = {
        deleted_at: new Date().toISOString(),
        deleted_by: authUserId,
        delete_reason: posted ? "archived_from_posts_page" : "deleted_from_posts_page",
        scheduled_publish_at: posted ? post.scheduled_publish_at || null : null,
        publish_status: posted ? post.publish_status || "posted" : null,
        status: posted ? post.status || "posted" : "deleted",
      };

      const { error } = await supabase.from("campaign_posts").update(updates).eq("id", post.id);

      if (error) throw error;

      const deletedPost = { ...post, ...updates };

      setRecentlyDeletedPost(deletedPost);
      setDeletedPosts((currentDeletedPosts) => [
        deletedPost,
        ...currentDeletedPosts.filter((item) => item.id !== post.id),
      ]);
      setPosts((currentPosts) => currentPosts.filter((item) => item.id !== post.id));
      setSelectedPostId(null);
      setImprovementNote(null);
      setShowImproveTools(false);
      cancelEditingPost();

      alert("Post deleted. Use Undo delete at the top of the page, or restore it later from Deleted posts.");

      window.setTimeout(() => {
        setRecentlyDeletedPost((current: any | null) =>
          current?.id === post.id ? null : current,
        );
      }, 12000);
    } catch (error: any) {
      const message = getReadableError(error, "Error deleting post.");
      console.error("Delete post error:", error);
      alert(message);
    } finally {
      setDeletingPostId(null);
    }
  };

  const undoDeletePost = async () => {
    if (!recentlyDeletedPost?.id) return;

    const postToRestore = recentlyDeletedPost;

    setDeletingPostId(postToRestore.id);

    try {
      const updates = {
        deleted_at: null,
        deleted_by: null,
        delete_reason: null,
        status:
          postToRestore.publish_status === "posted" || postToRestore.is_posted
            ? "posted"
            : postToRestore.scheduled_publish_at
              ? "scheduled"
              : "ready",
        publish_status:
          postToRestore.publish_status === "posted"
            ? "posted"
            : postToRestore.scheduled_publish_at
              ? "scheduled"
              : null,
      };

      const { error } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", postToRestore.id);

      if (error) throw error;

      setRecentlyDeletedPost(null);
      await loadPosts(selectedCampaignId || campaign?.id || postToRestore.campaign_id || null);
      setSelectedPostId(postToRestore.id);
    } catch (error: any) {
      const message = getReadableError(error, "Error restoring post.");
      console.error("Undo delete post error:", error);
      alert(message);
    } finally {
      setDeletingPostId(null);
    }
  };

  const restoreDeletedPost = async (post: any) => {
    if (!post?.id) return;

    setDeletingPostId(post.id);

    try {
      const updates = {
        deleted_at: null,
        deleted_by: null,
        delete_reason: null,
        status:
          post.publish_status === "posted" || post.is_posted
            ? "posted"
            : post.scheduled_publish_at
              ? "scheduled"
              : "ready",
        publish_status:
          post.publish_status === "posted"
            ? "posted"
            : post.scheduled_publish_at
              ? "scheduled"
              : null,
      };

      const { error } = await supabase.from("campaign_posts").update(updates).eq("id", post.id);

      if (error) throw error;

      setRecentlyDeletedPost(null);
      setDeletedPosts((currentDeletedPosts) =>
        currentDeletedPosts.filter((item) => item.id !== post.id),
      );

      await loadPosts(selectedCampaignId || campaign?.id || post.campaign_id || null);
      setSelectedPostId(post.id);
    } catch (error: any) {
      const message = getReadableError(error, "Error restoring post.");
      console.error("Restore deleted post error:", error);
      alert(message);
    } finally {
      setDeletingPostId(null);
    }
  };

  const toDateTimeInputValue = (value?: string | null) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(date.getTime() - offsetMs);

    return localDate.toISOString().slice(0, 16);
  };

  const getReadableDateTime = (value?: string | null) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getShortScheduledTime = (value?: string | null) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCardScheduleLabel = (post: any) => {
    const scheduledValue = post?.scheduled_publish_at || post?.scheduled_at;
    const time = getShortScheduledTime(scheduledValue);

    if (!time) return "";

    if (isPostPosted(post)) {
      return post?.published_at ? `Posted ${getReadableDateTime(post.published_at)}` : "Posted";
    }

    if (isPostFailed(post)) return `Needs attention · ${time}`;

    return `Autopost · ${time}`;
  };

  const submitReviewPrompt = async () => {
    if (!reviewText.trim()) {
      alert("Please write a short review.");
      return;
    }

    setSavingReview(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      if (!userId) {
        alert("Please sign in before leaving a review.");
        return;
      }

      const { error } = await supabase.from("user_reviews").insert({
        user_id: userId,
        rating: reviewRating,
        review_text: reviewText.trim(),
        status: "new",
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      localStorage.setItem(REVIEW_PROMPT_SUBMITTED_KEY, "true");

      setShowReviewPrompt(false);
      setReviewRating(5);
      setReviewHoverRating(0);
      setReviewText("");

      alert("Thank you — your review has been sent.");
    } catch (error: any) {
      alert(error?.message || "Error submitting review.");
    } finally {
      setSavingReview(false);
    }
  };

  const dismissReviewPrompt = () => {
    localStorage.setItem(REVIEW_PROMPT_DISMISSED_KEY, "true");
    setShowReviewPrompt(false);
  };

  const openTodayReminderPost = () => {
    if (todayReminderPostId) {
      choosePost(todayReminderPostId);
    }

    setShowTodayReminder(false);
  };

  const viewNextPostAfterSuccess = () => {
    if (!successMoment?.nextPostId) {
      setSuccessMoment(null);
      return;
    }

    choosePost(successMoment.nextPostId);
    setSuccessMoment(null);
  };

  const businessName =
    profile?.business_name ||
    campaign?.business_name ||
    selectedPost?.business_name ||
    "Your business";

  const postedCount = posts.filter((post) => isPostPosted(post)).length;
  const postsLeftThisWeek = Math.max((posts.length || 0) - postedCount, 0);
  const weeklyProgressPercent =
    posts.length > 0 ? Math.round((postedCount / posts.length) * 100) : 0;

  const todayReminderPost = posts.find((post) => post.id === todayReminderPostId) || null;

  const activeImprovementNote =
    selectedPost && improvementNote?.postId === selectedPost.id ? improvementNote : null;

  const brandPrimary = profile?.brand_primary_color || "#ffd43b";
  const brandSecondary = profile?.brand_secondary_color || "#101420";
  const brandAccent = profile?.brand_accent_color || "#3ddc97";

  const brandStyle = {
    "--client-primary": brandPrimary,
    "--client-secondary": brandSecondary,
    "--client-accent": brandAccent,
  } as CSSProperties;

  const primaryMetaConnection = metaConnections[0] || null;
  const facebookConnected = Boolean(primaryMetaConnection?.page_id);
  const instagramConnected = Boolean(primaryMetaConnection?.instagram_business_account_id);

  return (
    <div className="campaign-brand-shell simplified-posts-page" style={brandStyle}>
      <div className="campaigns-page-header simplified-posts-header">
        <div>
          <div className="page-eyebrow">Posts</div>
          <h1 className="page-title">This week’s posts.</h1>
          <p className="page-description">
            Review each post, then publish Facebook and Instagram or copy/open TikTok.
          </p>

          <div className="simplified-posts-meta">
            <span>{businessName}</span>
            <span>
              {postedCount}/{posts.length || 0} posted
            </span>
            {facebookConnected && <span>Facebook connected</span>}
            {instagramConnected && <span>Instagram connected</span>}
          </div>
        </div>

        <button className="secondary-button refresh-button" onClick={loadPageData}>
          Refresh
        </button>
      </div>

      {loading ? (
        <section className="premium-card">
          <p>Loading posts...</p>
        </section>
      ) : campaigns.length === 0 ? (
        <section
          className="premium-card"
          style={{
            textAlign: "center",
            padding: "clamp(28px, 5vw, 56px)",
            borderRadius: 34,
          }}
        >
          <div className="page-eyebrow">No posts yet</div>
          <h2 style={{ marginTop: 0 }}>Create this week’s posts first.</h2>
          <p style={{ maxWidth: 680, margin: "0 auto 22px" }}>
            Go to Dashboard, upload photos, videos or flyers, then FromOne will create posts ready
            to review here.
          </p>

          <a href="/dashboard" className="dashboard-platform-create-button">
            Upload and create posts
          </a>
        </section>
      ) : (
        <>
          {accessLocked && (
            <section className="access-status-card access-status-locked">
              <div>
                <div className="page-eyebrow">Demo ended</div>
                <h2>Some post actions are locked.</h2>
                <p>{accessMessage}</p>
              </div>

              <a href="/subscription" className="dashboard-profile-link">
                View subscription options
              </a>
            </section>
          )}

          <section
            className="premium-card"
            style={{
              display: "grid",
              gap: 18,
              border: "1px solid rgba(255, 212, 59, 0.24)",
              borderRadius: 30,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="page-eyebrow">Weekly calendar</div>
                <h2 style={{ margin: "0 0 8px" }}>Review your posts.</h2>
                <p style={{ margin: 0, color: "var(--muted)" }}>
                  Open a card, check the media and wording, then publish or copy.
                </p>
              </div>

              <div
                style={{
                  minWidth: 180,
                  padding: 14,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <strong>
                  {postedCount} of {posts.length || 0} done
                </strong>
                <div className="weekly-progress-bar" aria-label="Weekly post progress">
                  <span style={{ width: `${weeklyProgressPercent}%` }} />
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 320px))",
                justifyContent: "center",
                alignItems: "stretch",
                gap: 16,
              }}
            >
              {sortedPosts.map((post: any) => {
                const dateParts = getPostDateParts(post);
                const status = getPostStatus(post);
                const platformName = getPlatformDisplayName(post);
                const hasMedia = Boolean(post.media_url);
                const captionPreview = String(post.caption || "").slice(0, 120);
                const cardScheduleLabel = getCardScheduleLabel(post);
                const scheduledTime = getShortScheduledTime(
                  post.scheduled_publish_at || post.scheduled_at,
                );
                const statusDisplay =
                  status === "Reminder set"
                    ? scheduledTime
                      ? `Planned · ${scheduledTime}`
                      : "Planned"
                    : status === "Ready" && scheduledTime
                      ? `Ready · ${scheduledTime}`
                      : status;

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => choosePost(post.id)}
                    className="fromone-simple-post-card"
                    style={{
                      minHeight: 560,
                      textAlign: "left",
                      borderRadius: 26,
                      padding: 0,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      background:
                        "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))",
                      border:
                        status === "Posted"
                          ? "1px solid rgba(61, 220, 151, 0.28)"
                          : "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        minHeight: 158,
                        background: "rgba(15,23,42,0.72)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {post.media_url ? (
                        String(post.media_type || "").toLowerCase() === "video" ? (
                          <video
                            src={post.media_url}
                            muted
                            playsInline
                            style={{
                              width: "100%",
                              height: 180,
                              objectFit: "cover",
                            }}
                          />
                        ) : String(post.media_type || "").toLowerCase() === "flyer" ? (
                          <strong>PDF flyer</strong>
                        ) : (
                          <img
                            src={post.media_url}
                            alt={post.title || "Post media"}
                            style={{
                              width: "100%",
                              height: 180,
                              objectFit: "cover",
                            }}
                          />
                        )
                      ) : (
                        <div style={{ textAlign: "center", padding: 20 }}>
                          <strong>No media yet</strong>
                          <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                            Add media in review.
                          </p>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: 18, display: "grid", gap: 12, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            className="page-eyebrow"
                            style={{
                              display: "block",
                              marginBottom: 8,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {dateParts.weekday} {dateParts.day} {dateParts.month}
                          </div>

                          <strong
                            style={{
                              display: "block",
                              fontSize: "1.05rem",
                              color: "#fff",
                              lineHeight: 1.18,
                              wordBreak: "normal",
                            }}
                          >
                            {post.title || `${platformName} post`}
                          </strong>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gap: 6,
                            justifyItems: "end",
                            flex: "0 0 auto",
                          }}
                        >
                          <span
                            className={`premium-calendar-status ${getStatusClass(status)}`}
                            style={{ flex: "0 0 auto" }}
                          >
                            {status === "Reminder set" ? "Planned" : status}
                          </span>

                          {scheduledTime && status !== "Posted" && (
                            <small
                              style={{
                                color: "rgba(248, 250, 252, 0.72)",
                                fontWeight: 900,
                                fontSize: 12,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {scheduledTime}
                            </small>
                          )}
                        </div>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          color: "rgba(248,250,252,0.76)",
                          lineHeight: 1.45,
                          minHeight: 52,
                        }}
                      >
                        {captionPreview || "Open to add or review the wording."}
                        {captionPreview.length >= 120 ? "..." : ""}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            minHeight: 24,
                            padding: "4px 9px",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.055)",
                            border: "1px solid rgba(255,255,255,0.09)",
                            color: "rgba(248,250,252,0.78)",
                            fontSize: 11,
                            fontWeight: 850,
                            lineHeight: 1,
                            letterSpacing: "0.01em",
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 999,
                              background: "#ffd43b",
                              boxShadow: "0 0 12px rgba(255, 212, 59, 0.34)",
                            }}
                          />
                          {platformName}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            minHeight: 24,
                            padding: "4px 9px",
                            borderRadius: 10,
                            background: hasMedia
                              ? "rgba(61, 220, 151, 0.08)"
                              : "rgba(255, 212, 59, 0.075)",
                            border: hasMedia
                              ? "1px solid rgba(61, 220, 151, 0.14)"
                              : "1px solid rgba(255, 212, 59, 0.14)",
                            color: "rgba(248,250,252,0.78)",
                            fontSize: 11,
                            fontWeight: 850,
                            lineHeight: 1,
                            letterSpacing: "0.01em",
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 999,
                              background: hasMedia ? "#3ddc97" : "#ffd43b",
                              boxShadow: hasMedia
                                ? "0 0 12px rgba(61, 220, 151, 0.28)"
                                : "0 0 12px rgba(255, 212, 59, 0.28)",
                            }}
                          />
                          {hasMedia ? "Media ready" : "Needs media"}
                        </span>
                      </div>

                      <span
                        className="dashboard-platform-create-button"
                        style={{
                          minHeight: 46,
                          borderRadius: 16,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "100%",
                          marginTop: "auto",
                        }}
                      >
                        Review post
                      </span>
                    </div>
                  </button>
                );
              })}

              {sortedPosts.length > 0 && sortedPosts.length < 7 && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = campaign?.id
                      ? `/dashboard?addToCampaign=${encodeURIComponent(campaign.id)}`
                      : "/dashboard";
                  }}
                  className="fromone-simple-post-card"
                  style={{
                    minHeight: 560,
                    textAlign: "left",
                    borderRadius: 26,
                    padding: 0,
                    overflow: "hidden",
                    background:
                      "radial-gradient(circle at top right, rgba(255, 212, 59, 0.14), transparent 36%), linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))",
                    border: "1px solid rgba(255, 212, 59, 0.24)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        height: 180,
                        background:
                          "radial-gradient(circle at center, rgba(255, 212, 59, 0.18), rgba(15,23,42,0.72))",
                        display: "grid",
                        placeItems: "center",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          width: 66,
                          height: 66,
                          borderRadius: 22,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(255, 212, 59, 0.16)",
                          border: "1px solid rgba(255, 212, 59, 0.28)",
                          color: "#ffd43b",
                          fontSize: 36,
                          fontWeight: 950,
                        }}
                      >
                        +
                      </span>
                    </div>

                    <div style={{ padding: 18, display: "grid", gap: 12 }}>
                      <div className="page-eyebrow">Add more</div>
                      <h3 style={{ margin: 0, fontSize: 24, color: "#fff" }}>
                        Create more posts
                      </h3>
                      <p style={{ margin: 0, color: "rgba(248,250,252,0.76)", lineHeight: 1.45 }}>
                        Add another content day to this same weekly set. FromOne can create Facebook, Instagram and TikTok versions with staggered times.
                      </p>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            minHeight: 24,
                            padding: "4px 9px",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.055)",
                            border: "1px solid rgba(255,255,255,0.09)",
                            color: "rgba(248,250,252,0.74)",
                            fontSize: 11,
                            fontWeight: 850,
                            lineHeight: 1,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 999,
                              background: "#ffd43b",
                            }}
                          />
                          Same weekly set
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            minHeight: 24,
                            padding: "4px 9px",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.055)",
                            border: "1px solid rgba(255,255,255,0.09)",
                            color: "rgba(248,250,252,0.74)",
                            fontSize: 11,
                            fontWeight: 850,
                            lineHeight: 1,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 999,
                              background: "#ffd43b",
                            }}
                          />
                          Staggered times
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "0 18px 18px", marginTop: "auto" }}>
                    <span
                      className="dashboard-platform-create-button"
                      style={{
                        minHeight: 46,
                        borderRadius: 16,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                      }}
                    >
                      Add media
                    </span>
                  </div>
                </button>
              )}
            </div>
          </section>

          {deletedPosts.length > 0 && (
            <section className="premium-card" style={{ marginTop: 22 }}>
              <div className="page-eyebrow">Deleted posts</div>
              <h2 style={{ marginTop: 0 }}>Restore a deleted post.</h2>

              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {deletedPosts.map((post) => (
                  <div
                    key={post.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 16,
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong>{post.title || post.platform || "Deleted post"}</strong>
                      <p style={{ margin: "4px 0 0", opacity: 0.78 }}>
                        {post.platform || "Post"} · deleted{" "}
                        {post.deleted_at ? getReadableDateTime(post.deleted_at) : "recently"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => restoreDeletedPost(post)}
                      disabled={deletingPostId === post.id}
                    >
                      {deletingPostId === post.id ? "Restoring..." : "Restore"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {selectedPost && (
        <PostActionModal
          selectedPost={selectedPost}
          editingPostId={editingPostId}
          editCaption={editCaption}
          editCta={editCta}
          editHashtags={editHashtags}
          savingEdit={savingEdit}
          accessLocked={accessLocked}
          rewritingPost={rewritingPost}
          rewritingAction={rewritingAction}
          showImproveTools={showImproveTools}
          quickImproveActions={quickImproveActions}
          dynamicAudienceTargets={dynamicAudienceTargets}
          audienceTarget={audienceTarget}
          customAudienceTarget={customAudienceTarget}
          toneTarget={toneTarget}
          toneOptions={toneOptions}
          activeImprovementNote={activeImprovementNote}
          uploadingMediaPostId={uploadingMediaPostId}
          removingMediaPostId={removingMediaPostId}
          publishingPostId={publishingPostId}
          savingReminderPostId={savingReminderPostId}
          reminderValue={reminderValue}
          deletingPostId={deletingPostId}
          rescanningMediaPostId={rescanningMediaPostId}
          mediaRescanUsageLabel={getMediaRescanUsageLabel()}
          videoRescanUsageLabel={getVideoRescanUsageLabel()}
          postRef={postRef}
          mediaRef={mediaRef}
          publishRef={publishRef}
          getPostPositionLabel={getPostPositionLabel}
          getPlatformDisplayName={getPlatformDisplayName}
          getPostStatus={getPostStatus}
          getImageGuidance={getImageGuidance}
          getReadableDateTime={getReadableDateTime}
          mediaRequiredForPlatform={mediaRequiredForPlatform}
          canDirectPublishToFacebook={canDirectPublishToFacebook}
          canDirectPublishToInstagram={canDirectPublishToInstagram}
          canDemoPublishToTikTok={canDemoPublishToTikTok}
          isPostPosted={isPostPosted}
          isPostScheduledToday={isPostScheduledToday}
          onClose={closePostModal}
          onStartEditingPost={startEditingPost}
          onCancelEditingPost={cancelEditingPost}
          onSaveEditedPost={saveEditedPost}
          onSetEditCaption={setEditCaption}
          onSetEditCta={setEditCta}
          onSetEditHashtags={setEditHashtags}
          onToggleImproveTools={() => setShowImproveTools(!showImproveTools)}
          onQuickImprovePost={handleQuickImprovePost}
          onRewriteForAudience={handleRewriteForAudience}
          onRescanPostMedia={handleRescanPostMedia}
          onSetAudienceTarget={setAudienceTarget}
          onSetCustomAudienceTarget={setCustomAudienceTarget}
          onSetToneTarget={setToneTarget}
          onUploadMedia={uploadMedia}
          onRemoveMedia={removeMedia}
          onPublishToFacebook={publishToFacebook}
          onPublishToInstagram={publishToInstagram}
          onPublishToTikTokDemo={publishToTikTokDemo}
          onCopyPost={copyPost}
          onOpenPlatform={openPlatform}
          onMarkAsPosted={markAsPosted}
          onMarkAsNotPosted={markAsNotPosted}
          onSetReminderValue={setReminderValue}
          onSaveReminder={saveReminder}
          onClearReminder={clearReminder}
          onDeletePost={deletePostWithUndo}
        />
      )}

      {showTodayReminder && todayReminderPost && (
        <TodayReminderModal
          post={todayReminderPost}
          onStartTodayPost={openTodayReminderPost}
          onClose={() => setShowTodayReminder(false)}
        />
      )}

      {successMoment && (
        <PostSuccessModal
          postsLeft={successMoment.postsLeft}
          nextPostId={successMoment.nextPostId}
          onViewNextPost={viewNextPostAfterSuccess}
          onBackToDashboard={() => {
            window.location.href = "/dashboard";
          }}
        />
      )}

      {showReviewPrompt && (
        <ReviewPromptModal
          reviewRating={reviewRating}
          reviewHoverRating={reviewHoverRating}
          reviewText={reviewText}
          savingReview={savingReview}
          onSetReviewRating={setReviewRating}
          onSetReviewHoverRating={setReviewHoverRating}
          onSetReviewText={setReviewText}
          onSubmitReview={submitReviewPrompt}
          onDismissReview={dismissReviewPrompt}
        />
      )}
    </div>
  );
}