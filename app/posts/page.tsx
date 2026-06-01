"use client";

import "./posts.css";

import {
  CSSProperties,
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabaseBrowser as supabase } from "../../lib/supabase/browser";
import axios from "axios";
import { useToast } from "@/app/components/ToastProvider";

import WeeklyPlanControls from "@/components/posts/WeeklyPlanControls";
import WeeklyQueue from "@/components/posts/WeeklyQueue";
import TodayReminderModal from "@/components/posts/TodayReminderModal";
import PostSuccessModal from "@/components/posts/PostSuccessModal";
import ReviewPromptModal from "@/components/posts/ReviewPromptModal";

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

const MEDIA_RESCAN_EVENT_TYPES = [
  "post_media_rescan",
  "post_image_rescan",
  "post_flyer_rescan",
];
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
  { value: "make_more_premium", label: "More premium" },
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
  const { showToast } = useToast();

  const notify = (
    message: any,
    type: "success" | "error" | "info" | "warning" = "info",
    title?: string,
  ) => {
    const cleanMessage = String(message || "").trim();

    if (!cleanMessage) return;

    const defaultTitle =
      title ||
      (type === "success"
        ? "Done"
        : type === "error"
          ? "Something went wrong"
          : type === "warning"
            ? "Please check"
            : "FromOne");

    showToast({
      type,
      title: defaultTitle,
      message: cleanMessage,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  const getCampaignDisplayName = () => {
    return campaign?.name || campaign?.campaign_idea || "Selected weekly posts";
  };

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
  const [rescanningMediaPostId, setRescanningMediaPostId] = useState<
    string | null
  >(null);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [pendingCampaignId, setPendingCampaignId] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [createdReviewActive, setCreatedReviewActive] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingSelectedPlan, setLoadingSelectedPlan] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [renamingCampaign, setRenamingCampaign] = useState(false);

  const [accessLocked, setAccessLocked] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const [audienceTarget, setAudienceTarget] = useState("Local customers");
  const [customAudienceTarget, setCustomAudienceTarget] = useState("");
  const [marketReachTarget, setMarketReachTarget] = useState("Local customers");
  const [toneTarget, setToneTarget] = useState("Use current tone");
  const [rewritingPost, setRewritingPost] = useState(false);
  const [rewritingAction, setRewritingAction] = useState("");
  const [improvementNote, setImprovementNote] =
    useState<ImprovementNote | null>(null);
  const [showImproveTools, setShowImproveTools] = useState(false);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editCta, setEditCta] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [uploadingMediaPostId, setUploadingMediaPostId] = useState<
    string | null
  >(null);
  const [removingMediaPostId, setRemovingMediaPostId] = useState<string | null>(
    null,
  );
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [savingReminderPostId, setSavingReminderPostId] = useState<
    string | null
  >(null);
  const [reminderValue, setReminderValue] = useState("");
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [recentlyDeletedPost, setRecentlyDeletedPost] = useState<any | null>(
    null,
  );

  const [showTodayReminder, setShowTodayReminder] = useState(false);
  const [todayReminderPostId, setTodayReminderPostId] = useState<string | null>(
    null,
  );
  const [successMoment, setSuccessMoment] = useState<SuccessMoment | null>(
    null,
  );

  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    type: "deleteCampaign" | "removeMedia" | "deletePost";
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    post?: any;
  } | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameCampaignValue, setRenameCampaignValue] = useState("");
  const [showSavedWeekControls, setShowSavedWeekControls] = useState(false);

  const queueRef = useRef<HTMLDivElement | null>(null);
  const postRef = useRef<HTMLElement | null>(null);
  const mediaRef = useRef<HTMLElement | null>(null);
  const publishRef = useRef<HTMLElement | null>(null);

  const getPostDisplayScheduleValue = (post: any) => {
    return post?.scheduled_at || post?.created_at || null;
  };

  const sortPostsByDate = (items: any[]) => {
    return [...items].sort((firstPost, secondPost) => {
      const firstSchedule = getPostDisplayScheduleValue(firstPost);
      const secondSchedule = getPostDisplayScheduleValue(secondPost);
      const firstTime = firstSchedule ? new Date(firstSchedule).getTime() : 0;
      const secondTime = secondSchedule ? new Date(secondSchedule).getTime() : 0;
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

  const selectedPostPosition = useMemo(() => {
    if (!selectedPost) return 0;
    const index = sortedPosts.findIndex((post) => post.id === selectedPost.id);
    return index >= 0 ? index + 1 : 0;
  }, [selectedPost, sortedPosts]);

  const activeIndustry = String(
    profile?.industry || campaign?.business_type || campaign?.industry || "",
  ).toLowerCase();

  const dynamicAudienceTargets = useMemo(() => {
    const matchedKey = Object.keys(industryAudienceTargets).find((key) =>
      activeIndustry.includes(key),
    );

    return matchedKey
      ? industryAudienceTargets[matchedKey]
      : defaultAudienceTargets;
  }, [activeIndustry]);

  useEffect(() => {
    loadPageData();

    const params = new URLSearchParams(window.location.search);
    const metaConnected = params.get("meta_connected");
    const metaError = params.get("meta_error");

    if (metaConnected === "true") {
      notify(
        "Facebook and Instagram connected.",
        "success",
        "Accounts connected",
      );
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (metaConnected === "false") {
      notify(
        metaError || "Meta connection failed.",
        "error",
        "Connection failed",
      );
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

    setReminderValue("");
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

  const shouldOpenCreatedPostForReview = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("created") === "true" || params.get("review") === "true";
  };

  const isSameDate = (firstDate: Date, secondDate: Date) => {
    return (
      firstDate.getFullYear() === secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate()
    );
  };

  const isPostScheduledToday = (post: any) => {
    const displaySchedule = getPostDisplayScheduleValue(post);
    if (!displaySchedule) return false;
    return isSameDate(new Date(displaySchedule), new Date());
  };

  const isFutureDate = (value?: string | null) => {
    if (!value) return false;
    return new Date(value).getTime() > Date.now();
  };

  const isPaidSubscription = (status?: string | null) => {
    return ["active", "paid", "trialing"].includes(
      String(status || "").toLowerCase(),
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
      const date = new Date(
        access.extension_ends_at as string,
      ).toLocaleDateString(undefined, {
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
      const date = new Date(access.trial_ends_at as string).toLocaleDateString(
        undefined,
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
      );

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
    notify(accessMessage, "warning", "Access locked");
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

    const plan =
      data?.plan === "starter" && data?.status === "active"
        ? "starter"
        : "demo";

    setBillingPlan(plan);
    return plan as BillingPlan;
  };

  const loadRescanUsage = async (userId: string) => {
    const since = getSevenDaysAgoIso();

    const [
      { count: mediaCount, error: mediaError },
      { count: videoCount, error: videoError },
    ] = await Promise.all([
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
    return billingPlan === "starter"
      ? PAID_WEEKLY_MEDIA_RESCAN_LIMIT
      : DEMO_WEEKLY_MEDIA_RESCAN_LIMIT;
  };

  const getWeeklyVideoRescanLimit = () => {
    return billingPlan === "starter"
      ? PAID_WEEKLY_VIDEO_RESCAN_LIMIT
      : DEMO_WEEKLY_VIDEO_RESCAN_LIMIT;
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
      notify(
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
      choosePost(todayUnpostedPost.id);
      return;
    }

    if (shouldOpenCreatedPostForReview()) {
      setCreatedReviewActive(true);

      const cleanParams = new URLSearchParams();
      if (campaignId) {
        cleanParams.set("campaign", campaignId);
      }

      const cleanQuery = cleanParams.toString();
      window.history.replaceState(
        {},
        "",
        cleanQuery ? `${window.location.pathname}?${cleanQuery}` : window.location.pathname,
      );
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
    const nextCampaign =
      campaigns.find((item) => item.id === campaignId) || null;

    setSelectedCampaignId(campaignId);
    setPendingCampaignId(campaignId);
    setCampaign(nextCampaign);
    setSelectedPostId(null);
    setCreatedReviewActive(false);
    cancelEditingPost();
    setImprovementNote(null);
    setShowImproveTools(false);

    await loadPosts(campaignId);
  };

  const loadSelectedPlan = async () => {
    if (!pendingCampaignId) {
      notify(
        "Please choose a weekly post set first.",
        "warning",
        "Choose a weekly set",
      );
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
      notify(
        "No weekly post set selected.",
        "warning",
        "No weekly set selected",
      );
      return;
    }

    const currentName =
      campaign.name || campaign.campaign_idea || "Untitled weekly posts";
    setRenameCampaignValue(currentName);
    setRenameDialogOpen(true);
  };

  const confirmRenameSelectedCampaign = async () => {
    if (!campaign?.id) {
      notify(
        "No weekly post set selected.",
        "warning",
        "No weekly set selected",
      );
      setRenameDialogOpen(false);
      return;
    }

    const cleanName = renameCampaignValue.trim();

    if (!cleanName) {
      notify("Name cannot be empty.", "warning", "Name needed");
      return;
    }

    setRenamingCampaign(true);

    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ name: cleanName })
        .eq("id", campaign.id);

      if (error) {
        notify(error.message, "error");
        return;
      }

      setCampaign({ ...campaign, name: cleanName });

      setCampaigns((currentCampaigns) =>
        currentCampaigns.map((item) =>
          item.id === campaign.id ? { ...item, name: cleanName } : item,
        ),
      );

      setRenameDialogOpen(false);
      notify("Weekly posts renamed.", "success", "Weekly set renamed");
    } catch (error: any) {
      const message = getReadableError(error, "Error renaming weekly posts.");
      console.error("Rename weekly posts error:", error);
      notify(message, "error");
    } finally {
      setRenamingCampaign(false);
    }
  };

  const deleteSelectedCampaign = async () => {
    if (!campaign?.id) {
      notify(
        "No weekly post set selected.",
        "warning",
        "No weekly set selected",
      );
      return;
    }

    setConfirmDialog({
      type: "deleteCampaign",
      title:
        posts.length === 0
          ? "Delete empty weekly set?"
          : "Delete this weekly set?",
      message:
        posts.length === 0
          ? `${getCampaignDisplayName()} has no posts. Deleting it will free up a saved weekly set slot.`
          : `This will delete ${getCampaignDisplayName()} and all posts inside it. This cannot be undone.`,
      confirmLabel:
        posts.length === 0 ? "Delete empty set" : "Delete weekly set",
      danger: true,
    });
  };

  const confirmDeleteSelectedCampaign = async () => {
    if (!campaign?.id) {
      notify(
        "No weekly post set selected.",
        "warning",
        "No weekly set selected",
      );
      closeConfirmDialog();
      return;
    }

    setDeletingCampaign(true);

    try {
      const campaignIdToDelete = campaign.id;

      const { data: campaignPosts, error: postsLoadError } = await supabase
        .from("campaign_posts")
        .select("id, image_path, media_path")
        .eq("campaign_id", campaignIdToDelete);

      if (postsLoadError) {
        notify(postsLoadError.message, "error");
        return;
      }

      const storagePaths =
        campaignPosts
          ?.flatMap((post) => [post.image_path, post.media_path])
          .filter(Boolean)
          .filter((value, index, array) => array.indexOf(value) === index) ||
        [];

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .remove(storagePaths);

        if (storageError) {
          console.error(
            "Weekly posts media delete error:",
            storageError.message,
          );
        }
      }

      const { error: campaignDeleteError } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignIdToDelete);

      if (campaignDeleteError) {
        notify(campaignDeleteError.message, "error");
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
      closeConfirmDialog();

      notify("Weekly posts deleted.", "success", "Weekly set deleted");
      await loadPageData();
    } catch (error: any) {
      const message = getReadableError(error, "Error deleting weekly posts.");
      console.error("Delete weekly posts error:", error);
      notify(message, "error");
    } finally {
      setDeletingCampaign(false);
    }
  };

  const updatePostLocally = (postId: string, updates: any) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId ? { ...post, ...updates } : post,
      ),
    );
  };

  const choosePost = (postId: string) => {
    const params = new URLSearchParams();

    if (selectedCampaignId) {
      params.set("campaign", selectedCampaignId);
    }

    const queryString = params.toString();

    window.location.href = queryString
      ? `/posts/${encodeURIComponent(postId)}?${queryString}`
      : `/posts/${encodeURIComponent(postId)}`;
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

    const selectedIndex = sortedPosts.findIndex(
      (post) => post.id === selectedPost.id,
    );
    const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = (safeIndex + 1) % sortedPosts.length;
    const nextPost = sortedPosts[nextIndex];

    if (!nextPost) return;

    choosePost(nextPost.id);
  };

  const getPostPositionLabel = (post: any) => {
    const index = sortedPosts.findIndex((item) => item.id === post?.id);
    return index >= 0 ? `Post ${index + 1}` : post?.scheduled_day || "Post";
  };

  const isGenericPostTitle = (value: any) => {
    const cleanTitle = String(value || "").trim().toLowerCase();

    if (!cleanTitle) return true;

    return (
      /^(facebook|instagram|tiktok|post)\s*post\s*\d*$/i.test(cleanTitle) ||
      /^post\s*\d+$/i.test(cleanTitle) ||
      cleanTitle === "review post" ||
      cleanTitle === "untitled post"
    );
  };

  const cleanGeneratedTitle = (value: any) => {
    return String(value || "")
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/#[\w-]+/g, "")
      .replace(/\bCTA\s*:/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const makeTitleFromCaption = (caption: any) => {
    const cleanCaption = cleanGeneratedTitle(caption);

    if (!cleanCaption) return "";

    const firstSentence =
      cleanCaption.split(/[.!?]/).find((part) => part.trim().length >= 12)?.trim() ||
      cleanCaption;

    if (firstSentence.length <= 58) return firstSentence;

    return `${firstSentence.slice(0, 55).trim()}...`;
  };

  const getDisplayPostTitle = (post: any, index?: number) => {
    const platformName = getPlatformDisplayName(post);
    const cleanTitle = cleanGeneratedTitle(post?.title);

    if (!isGenericPostTitle(cleanTitle)) {
      return cleanTitle;
    }

    const captionTitle = makeTitleFromCaption(post?.caption);

    if (captionTitle) return captionTitle;

    return `${platformName} Post ${typeof index === "number" ? index + 1 : ""}`.trim();
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
    const hashtags = Array.isArray(post?.hashtags)
      ? post.hashtags.join(" ")
      : "";

    return [caption, cta, hashtags].filter(Boolean).join("\n\n").trim();
  };

  const copyPost = async (post: any) => {
    const textToCopy = buildPostText(post);

    if (!textToCopy) {
      notify(
        "There is no post text to copy yet.",
        "warning",
        "Nothing to copy",
      );
      return;
    }

    await navigator.clipboard.writeText(textToCopy);
    notify("Post copied.", "success", "Copied");
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

    return (
      cleanPlatform.includes("instagram") || cleanPlatform.includes("tiktok")
    );
  };

  const getPlatformUrl = (platform: string) => {
    const cleanPlatform = String(platform || "").toLowerCase();

    if (cleanPlatform.includes("facebook")) return "https://www.facebook.com";
    if (cleanPlatform.includes("instagram")) return "https://www.instagram.com";
    if (cleanPlatform.includes("tiktok"))
      return "https://www.tiktok.com/upload";

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
      String(post?.platform || "")
        .toLowerCase()
        .includes("facebook") && hasConnectedFacebookPage()
    );
  };

  const canDirectPublishToInstagram = (post: any) => {
    return (
      String(post?.platform || "")
        .toLowerCase()
        .includes("instagram") && hasConnectedInstagramAccount()
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
    const mediaUrlWithoutQuery = mediaUrl.split("?")[0];

    if (mediaType === "video" || mediaUrl.match(/\.(mp4|mov|webm|m4v)(\?|$)/)) {
      return "video";
    }

    if (mediaType === "image" || mediaType.startsWith("image/")) {
      return "image";
    }

    if (
      mediaType === "flyer" ||
      mediaType === "pdf" ||
      (!mediaType && mediaUrlWithoutQuery.endsWith(".pdf"))
    ) {
      return "flyer";
    }

    return "image";
  };

  const getPostMediaMimeType = (post: any, mediaKind: string) => {
    const mediaType = String(post?.media_type || "").toLowerCase();
    const mediaUrl = String(post?.media_url || post?.media_path || "").toLowerCase();

    if (mediaType.startsWith("video/")) return mediaType;
    if (mediaType.startsWith("image/")) return mediaType;
    if (mediaType === "application/pdf") return "application/pdf";

    if (mediaKind === "video") {
      if (mediaUrl.includes(".webm")) return "video/webm";
      if (mediaUrl.includes(".mov")) return "video/quicktime";
      if (mediaUrl.includes(".m4v")) return "video/x-m4v";
      return "video/mp4";
    }

    if (mediaKind === "flyer") return "application/pdf";

    if (mediaUrl.includes(".png")) return "image/png";
    if (mediaUrl.includes(".webp")) return "image/webp";

    return "image/jpeg";
  };

  const buildPostMediaRescanContext = (post: any, mediaKind: string) => {
    const platform = post.platform || "Facebook";
    const businessName = profile?.business_name || campaign?.business_name || "the business";
    const industry = profile?.industry || campaign?.business_type || "general business";
    const currentCaption = String(post.caption || "").trim();
    const currentTitle = String(post.title || "").trim();
    const mediaName = post.media_path || post.title || "Post media";

    const baseContext = [
      `Existing post media rescan`,
      `Business: ${businessName}`,
      `Industry: ${industry}`,
      `Platform: ${platform}`,
      `Media name/path: ${mediaName}`,
      currentTitle ? `Current title: ${currentTitle}` : "",
      currentCaption ? `Current caption: ${currentCaption}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    if (mediaKind === "video") {
      return `${baseContext}. This is a video-led rewrite. Analyse the actual video footage if it is available to Gemini. The new caption must relate to what the clip shows: the scene, action, movement, atmosphere, people/activity, product, service, event, job progress, result, behind-the-scenes moment, offer, or booking/enquiry opportunity. Use the current caption only as background. Do not write a generic business post. If the video cannot be inspected because it is too large, inaccessible or unsupported, use the current caption, media name and business profile carefully without pretending to have seen exact details.`;
    }

    if (mediaKind === "flyer") {
      return `${baseContext}. This is a flyer/PDF rewrite. Rescan the flyer where possible and rebuild the post around the event, offer, date, price, service, location, booking instruction or CTA. Make it natural for social media, not a copied flyer transcript.`;
    }

    return `${baseContext}. This is an image-led rewrite. Analyse the image where possible and rebuild the post around the visible subject. Use the business profile for tone, local relevance and CTA.`;
  };

  const getSafeFileName = (fileName: string) => {
    const cleanName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return cleanName || "media";
  };

  const uploadMedia = async (
    post: any,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !post?.id) return;

    if (!ensureAccessAllowed()) return;

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/") &&
      file.type !== "application/pdf"
    ) {
      notify(
        "Please upload an image, video, or PDF flyer.",
        "warning",
        "Unsupported file type",
      );
      return;
    }

    setUploadingMediaPostId(post.id);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

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

      const { data: publicUrlData } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(path);

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

      notify(
        mediaType === "video"
          ? "Video added."
          : mediaType === "flyer"
            ? "Flyer added."
            : "Image added.",
      );
    } catch (error: any) {
      const message = getReadableError(error, "Error uploading media.");
      console.error("Upload media error:", error);
      notify(message, "error");
    } finally {
      setUploadingMediaPostId(null);
    }
  };

  const removeMedia = async (post: any) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    setConfirmDialog({
      type: "removeMedia",
      title: "Remove this media?",
      message:
        "The post wording will stay saved, but the image, video or flyer will be removed from this post.",
      confirmLabel: "Remove media",
      danger: true,
      post,
    });
  };

  const confirmRemoveMedia = async (post: any) => {
    if (!post?.id) return;

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
      closeConfirmDialog();
      notify("Media removed.", "success", "Media removed");
    } catch (error: any) {
      const message = getReadableError(error, "Error removing media.");
      console.error("Remove media error:", error);
      notify(message, "error");
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
      notify("Caption cannot be empty.", "warning", "Caption needed");
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
        notify(error.message, "error");
        return;
      }

      updatePostLocally(activePostForEditing.id, updates);

      setImprovementNote({
        postId: activePostForEditing.id,
        label: "Wording saved",
        detail:
          "Review the updated post, then add media or publish when ready.",
      });

      cancelEditingPost();
      notify("Post updated.", "success", "Post saved");
    } catch (error: any) {
      const message = getReadableError(error, "Error saving post changes.");
      console.error("Save edited post error:", error);
      notify(message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const getToneForRewrite = () => {
    const currentTone =
      profile?.tone_of_voice || campaign?.tone || "Professional";

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
      notify(error.message, "error");
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
      audienceTarget === "Custom audience"
        ? customAudienceTarget.trim()
        : audienceTarget.trim();

    if (!finalAudience) {
      notify(
        "Please enter who this post is for.",
        "warning",
        "Audience needed",
      );
      return;
    }

    if (!post.caption?.trim()) {
      notify(
        "This post needs a caption before it can be improved.",
        "warning",
        "Caption needed",
      );
      return;
    }

    setRewritingAction("audience");
    setRewritingPost(true);

    try {
      const response = await axios.post("/api/rewritePost", {
        provider: "gemini",
        audienceTarget: finalAudience,
        marketReach: marketReachTarget,
        tone: getToneForRewrite(),
        toneAdjustment: toneTarget,
        businessName:
          profile?.business_name || campaign?.business_name || "the business",
        industry:
          profile?.industry || campaign?.business_type || "general business",
        platform: post.platform || "Facebook",
        caption: post.caption || "",
        cta: post.cta || "",
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        image_prompt: post.image_prompt || "",
        rewriteQualityInstructions: `Rewrite this as a high-quality, industry-specific social post. Use the selected audience, market reach and tone as hard guidance. Keep the business context, platform, CTA and media prompt aligned. Avoid generic filler. Make it sound like a real ${profile?.industry || campaign?.business_type || "business"} post for ${finalAudience}.`,
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
      notify(message, "error");
    } finally {
      setRewritingAction("");
      setRewritingPost(false);
    }
  };

  const handleQuickImprovePost = async (
    post: any,
    improvementAction: string,
  ) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    if (!post.caption?.trim()) {
      notify(
        "This post needs a caption before it can be improved.",
        "warning",
        "Caption needed",
      );
      return;
    }

    const selectedAction = quickImproveActions.find(
      (item) => item.value === improvementAction,
    );
    const actionLabel = selectedAction?.label || "Improve post";
    const finalAudience =
      audienceTarget === "Custom audience"
        ? customAudienceTarget.trim()
        : audienceTarget.trim();
    const selectedReach = marketReachTarget || "Local customers";
    const selectedTone = getToneForRewrite();

    setRewritingAction(improvementAction);
    setRewritingPost(true);

    try {
      const response = await axios.post("/api/rewritePost", {
        provider: "gemini",
        improvementAction,
        audienceTarget:
          finalAudience || post.audience_target || "Current audience",
        marketReach: selectedReach,
        tone: selectedTone,
        toneAdjustment: toneTarget,
        businessName:
          profile?.business_name || campaign?.business_name || "the business",
        industry:
          profile?.industry || campaign?.business_type || "general business",
        platform: post.platform || "Facebook",
        caption: post.caption || "",
        cta: post.cta || "",
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        image_prompt: post.image_prompt || "",
        rewriteQualityInstructions: `Rewrite this as a high-quality, industry-specific social post. Use the selected improvement action as hard guidance. The selected audience is ${finalAudience || post.audience_target || "the current target audience"}, the selected reach is ${selectedReach}, and the tone guidance is ${selectedTone}. Keep the result useful, specific to ${profile?.industry || campaign?.business_type || "the business industry"}, platform-appropriate, and likely to generate enquiries, bookings, visits, orders or messages. Do not use generic wording. Do not make it local unless the reach selection asks for local customers.`,
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
      notify(message, "error");
    } finally {
      setRewritingAction("");
      setRewritingPost(false);
    }
  };

  const handleRescanPostMedia = async (post: any) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    if (!post.media_url) {
      notify(
        "Add media first, then rescan this post.",
        "warning",
        "Media needed",
      );
      return;
    }

    const userId = await getSignedInUserId();

    if (!userId) {
      notify("Please sign in again.", "warning", "Sign in needed");
      return;
    }

    const mediaKind = getPostMediaKind(post);
    const mediaMimeType = getPostMediaMimeType(post, mediaKind);
    const mediaRescanContext = buildPostMediaRescanContext(post, mediaKind);
    const allowed = await checkMediaRescanLimit(userId, mediaKind);

    if (!allowed) return;

    setRescanningMediaPostId(post.id);
    setRewritingAction("media_rescan");
    setRewritingPost(true);

    try {
      const response = await axios.post("/api/generatePosts", {
        provider: "gemini",
        website: "",
        clientName:
          profile?.business_name || campaign?.business_name || "the business",
        industry:
          profile?.industry || campaign?.business_type || "general business",
        description: `
Rewrite this single existing post after rescanning its attached media.

Business name: ${profile?.business_name || campaign?.business_name || "the business"}
Industry: ${profile?.industry || campaign?.business_type || "general business"}
Location: ${profile?.location || campaign?.location || campaign?.campaign_area || ""}
Tone: ${profile?.tone_of_voice || campaign?.tone || "Professional"}
Main offer: ${profile?.main_offer || ""}
Services: ${Array.isArray(profile?.services) ? profile.services.join(", ") : ""}
Target audience: ${
          Array.isArray(profile?.target_audience)
            ? profile.target_audience.join(", ")
            : ""
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
- If the media is a video and Gemini can inspect the footage, the caption must be about what the video actually shows.
- For video, connect the first sentence to the visible moment: scene, action, atmosphere, event, product, service, job progress, result, offer or behind-the-scenes activity.
- If the video cannot be inspected, do not pretend to have seen it. Use the current caption, media path/name and business details cautiously.
- If this is a club night, event, venue, restaurant, bar, product demo, job photo, flyer, or live video, write around what that media shows or strongly supports.
- Make the post more useful and more likely to generate enquiries, bookings, visits, orders, or messages.
- Keep the same platform unless there is a strong reason not to.
- Do not mention that AI rescanned the media.
- Do not use generic filler.
- If the existing post was previously marked as posted, still create a fresh editable version for the app.
`,
        platforms: [post.platform || "Facebook"],
        selectedPlatforms: [post.platform || "Facebook"],
        postingFrequency: 1,
        numberOfPosts: 1,
        postCount: 1,
        marketReach: profile?.location
          ? `Local customers in and around ${profile.location}`
          : "Local customers",
        mediaItems: [
          {
            id: post.id,
            name: post.media_path || post.title || "Post media",
            type: mediaMimeType,
            mimeType: mediaMimeType,
            media_type: mediaKind,
            url: post.media_url,
            description: String(post.caption || ""),
            context: mediaRescanContext,
            topic_hint: mediaRescanContext,
            extractedText: "",
          },
        ],
        uploads: [
          {
            id: post.id,
            name: post.media_path || post.title || "Post media",
            type: mediaMimeType,
            mimeType: mediaMimeType,
            media_type: mediaKind,
            url: post.media_url,
            description: String(post.caption || ""),
            context: mediaRescanContext,
            topic_hint: mediaRescanContext,
            extractedText: "",
          },
        ],
        requestedOutput: {
          posts: "Return exactly one improved post. If this is video, analyse the footage when possible and make the post about the visible video moment.",
          media_analysis_rule:
            mediaKind === "video"
              ? "Video rescan must be specific to the footage. Do not write a generic business caption."
              : "Rescan the attached media and make the post specific to the visible/supplied media.",
        },
      });

      const rewrittenPost = response.data?.posts?.[0];
      const inlineVideoMediaUsed = Number(response.data?.inlineVideoMediaUsed || 0);
      const inlineImageMediaUsed = Number(response.data?.inlineImageMediaUsed || response.data?.visionMediaUsed || 0);

      if (!rewrittenPost?.caption) {
        notify(
          "The media rescan did not return a new post. Please try again.",
          "error",
          "Rescan failed",
        );
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
          media_mime_type: mediaMimeType,
          platform: post.platform || null,
          inlineVideoMediaUsed,
          inlineImageMediaUsed,
          media_url: post.media_url || null,
          media_path: post.media_path || null,
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

      if (mediaKind === "video" && inlineVideoMediaUsed === 0) {
        notify(
          "Post rewritten. This video may have been too large or unsupported for full footage analysis, so FromOne used the available context carefully.",
          "info",
          "Video rewritten"
        );
      } else {
        notify("Post rescanned and rewritten.", "success", "Post improved");
      }
    } catch (error: any) {
      const message = getReadableError(error, "Error rescanning media.");
      console.error("Media rescan error:", error);
      notify(message, "error");
    } finally {
      setRescanningMediaPostId(null);
      setRewritingAction("");
      setRewritingPost(false);
    }
  };

  const maybeShowReviewPrompt = () => {
    if (typeof window === "undefined") return;

    const hasSubmitted =
      localStorage.getItem(REVIEW_PROMPT_SUBMITTED_KEY) === "true";
    const hasDismissed =
      localStorage.getItem(REVIEW_PROMPT_DISMISSED_KEY) === "true";

    if (hasSubmitted || hasDismissed) return;

    const currentCount = Number(
      localStorage.getItem(REVIEW_PROMPT_POSTED_COUNT_KEY) || "0",
    );
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
    const postsLeftAfterPublishing = updatedPosts.filter(
      (item) => !isPostPosted(item),
    ).length;
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
      notify(
        "This post needs wording before it can be published.",
        "warning",
        "Wording needed",
      );
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
      notify(message, "error");
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
      notify(
        "This post needs wording before it can be published.",
        "warning",
        "Wording needed",
      );
      return;
    }

    if (!post.media_url || !post.media_type || post.media_type === "flyer") {
      notify(
        "Instagram needs an image or video before publishing.",
        "warning",
        "Media needed",
      );
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
      notify(message, "error");
    } finally {
      setPublishingPostId(null);
    }
  };

  const publishToTikTokDemo = async (_post: any) => {
    notify(
      "TikTok is manual for now. Copy the post and open TikTok to publish it.",
      "info",
      "TikTok manual",
    );
  };

  const markAsPosted = async (postId: string) => {
    const updates = {
      is_posted: true,
      status: "posted",
      publish_status: "posted",
      publish_error: null,
      published_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", postId);

    if (error) {
      notify(error.message, "error");
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

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", postId);

    if (error) {
      notify(error.message, "error");
      return;
    }

    updatePostLocally(postId, updates);
  };

  const saveReminder = async (_post: any) => {
    notify(
      "Scheduling is paused for beta. Use Post manually or Autopost now instead.",
      "info",
      "Scheduling paused",
    );
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
      notify("Schedule cleared.", "success", "Schedule cleared");
    } catch (error: any) {
      const message = getReadableError(error, "Error clearing schedule.");
      console.error("Clear reminder error:", error);
      notify(message, "error");
    } finally {
      setSavingReminderPostId(null);
    }
  };

  const deletePostWithUndo = async (post: any) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    const posted = isPostPosted(post);

    setConfirmDialog({
      type: "deletePost",
      title: posted ? "Archive this posted item?" : "Delete this post?",
      message: posted
        ? "This removes it from the weekly queue, but the publish history will stay saved."
        : "This removes it from the weekly queue. You can undo this straight after deleting.",
      confirmLabel: posted ? "Archive item" : "Delete post",
      danger: true,
      post,
    });
  };

  const confirmDeletePostWithUndo = async (post: any) => {
    if (!post?.id) return;

    const posted = isPostPosted(post);

    setDeletingPostId(post.id);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id || currentUserId || null;

      const updates = {
        deleted_at: new Date().toISOString(),
        deleted_by: authUserId,
        delete_reason: posted
          ? "archived_from_posts_page"
          : "deleted_from_posts_page",
        scheduled_publish_at: posted ? post.scheduled_publish_at || null : null,
        publish_status: posted ? post.publish_status || "posted" : null,
        status: posted ? post.status || "posted" : "deleted",
      };

      const { error } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", post.id);

      if (error) throw error;

      const deletedPost = { ...post, ...updates };

      setRecentlyDeletedPost(deletedPost);
      setDeletedPosts((currentDeletedPosts) => [
        deletedPost,
        ...currentDeletedPosts.filter((item) => item.id !== post.id),
      ]);
      setPosts((currentPosts) =>
        currentPosts.filter((item) => item.id !== post.id),
      );
      setSelectedPostId(null);
      setImprovementNote(null);
      setShowImproveTools(false);
      cancelEditingPost();
      closeConfirmDialog();

      notify(
        "Use Undo delete at the top of the page, or restore it later from Deleted posts.",
        "success",
        "Post deleted",
      );

      window.setTimeout(() => {
        setRecentlyDeletedPost((current: any | null) =>
          current?.id === post.id ? null : current,
        );
      }, 12000);
    } catch (error: any) {
      const message = getReadableError(error, "Error deleting post.");
      console.error("Delete post error:", error);
      notify(message, "error");
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
      await loadPosts(
        selectedCampaignId || campaign?.id || postToRestore.campaign_id || null,
      );
      setSelectedPostId(postToRestore.id);
    } catch (error: any) {
      const message = getReadableError(error, "Error restoring post.");
      console.error("Undo delete post error:", error);
      notify(message, "error");
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

      const { error } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", post.id);

      if (error) throw error;

      setRecentlyDeletedPost(null);
      setDeletedPosts((currentDeletedPosts) =>
        currentDeletedPosts.filter((item) => item.id !== post.id),
      );

      await loadPosts(
        selectedCampaignId || campaign?.id || post.campaign_id || null,
      );
      setSelectedPostId(post.id);
    } catch (error: any) {
      const message = getReadableError(error, "Error restoring post.");
      console.error("Restore deleted post error:", error);
      notify(message, "error");
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

  const submitReviewPrompt = async () => {
    if (!reviewText.trim()) {
      notify("Please write a short review.", "warning", "Review needed");
      return;
    }

    setSavingReview(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      if (!userId) {
        notify("Please sign in before leaving a review.");
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

      notify("Thank you — your review has been sent.");
    } catch (error: any) {
      notify(error?.message || "Error submitting review.");
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

  const todayReminderPost =
    posts.find((post) => post.id === todayReminderPostId) || null;

  const activeImprovementNote =
    selectedPost && improvementNote?.postId === selectedPost.id
      ? improvementNote
      : null;

  const brandPrimary = profile?.brand_primary_color || "#ffd43b";
  const brandSecondary = profile?.brand_secondary_color || "#101420";
  const brandAccent = profile?.brand_accent_color || "#3ddc97";

  const brandStyle = {
    "--client-primary": brandPrimary,
    "--client-secondary": brandSecondary,
    "--client-accent": brandAccent,
    width: "100%",
    maxWidth: 1120,
    margin: "0 auto 56px",
    minHeight: "auto",
    height: "auto",
    maxHeight: "none",
    overflow: "visible",
  } as CSSProperties;

  return (
    <div
      className="campaign-brand-shell simplified-posts-page"
      style={brandStyle}
    >
      {loading ? null : campaigns.length === 0 ? (
        <section
          className="premium-card"
          style={{
            textAlign: "center",
            padding: "clamp(28px, 5vw, 56px)",
            borderRadius: 34,
            border: "1px solid rgba(255, 212, 59, 0.24)",
            background:
              "radial-gradient(circle at top, rgba(255, 212, 59, 0.16), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.032))",
            boxShadow: "0 30px 96px rgba(0,0,0,0.34)",
          }}
        >
          <div className="page-eyebrow">Posts</div>
          <h1 className="page-title" style={{ margin: "8px 0 12px" }}>
            This week’s posts.
          </h1>
          <p
            className="page-description"
            style={{ margin: "0 auto 28px", maxWidth: 760 }}
          >
            Review each post, then publish Facebook and Instagram or copy/open
            TikTok.
          </p>

          <div className="page-eyebrow">No posts yet</div>
          <h2 style={{ marginTop: 0 }}>Create this week’s posts first.</h2>
          <p style={{ maxWidth: 680, margin: "0 auto 22px" }}>
            Go to Dashboard, upload photos, videos or flyers, then FromOne will
            create posts ready to review here.
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

          {campaigns.length > 0 && (
            <section
              className="premium-card fromone-posts-hero-card"
              style={{
                marginBottom: 22,
                display: "grid",
                gap: 18,
                border: "1px solid rgba(255, 212, 59, 0.24)",
                borderRadius: 36,
                background:
                  "radial-gradient(circle at top right, rgba(255, 212, 59, 0.18), transparent 34%), radial-gradient(circle at bottom left, rgba(61, 220, 151, 0.09), transparent 28%), linear-gradient(145deg, rgba(255,255,255,0.086), rgba(255,255,255,0.032))",
                boxShadow: "0 34px 110px rgba(0,0,0,0.34)",
                overflow: "hidden",
              }}
            >
              <div
                className="fromone-posts-hero-layout"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  gap: 24,
                  alignItems: "center",
                }}
              >
                <div className="fromone-posts-hero-copy" style={{ minWidth: 0 }}>
                  <div className="page-eyebrow">Posts</div>
                  <h1
                    className="page-title"
                    style={{
                      margin: "8px 0 12px",
                      fontSize: "clamp(2.35rem, 5vw, 4.7rem)",
                      lineHeight: 0.92,
                      letterSpacing: "-0.06em",
                    }}
                  >
                    This week’s posts.
                  </h1>
                  <p
                    className="page-description"
                    style={{ margin: 0, maxWidth: 760 }}
                  >
                    Review, edit or delete each post. Nothing publishes until
                    you choose the next action.
                  </p>
                </div>

                <div
                  className="fromone-posts-hero-actions"
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    minWidth: 220,
                  }}
                >
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setShowSavedWeekControls((current) => !current)
                    }
                    style={{ minHeight: 52, borderRadius: 16, width: "100%" }}
                  >
                    {showSavedWeekControls ? "Hide weeks" : "Manage weeks"}
                  </button>

                  {sortedPosts.length > 0 && sortedPosts.length < 7 && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        window.location.href = campaign?.id
                          ? `/dashboard?addToCampaign=${encodeURIComponent(campaign.id)}`
                          : "/dashboard";
                      }}
                      style={{ minHeight: 52, borderRadius: 16, width: "100%" }}
                    >
                      + Add media
                    </button>
                  )}
                </div>
              </div>

              {showSavedWeekControls && (
                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    paddingTop: 18,
                    borderTop: "1px solid rgba(255,255,255,0.09)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div className="page-eyebrow">Saved weeks</div>
                      <h2 style={{ margin: "0 0 6px" }}>
                        Switch or manage saved weeks.
                      </h2>
                      <p style={{ margin: 0, color: "var(--muted)" }}>
                        Advanced controls for saved weekly post sets.
                      </p>
                    </div>

                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 11px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.055)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(248,250,252,0.78)",
                        fontSize: 13,
                        fontWeight: 900,
                      }}
                    >
                      {campaigns.length} saved set
                      {campaigns.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto auto auto",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={pendingCampaignId}
                      onChange={(event) =>
                        setPendingCampaignId(event.target.value)
                      }
                      style={{
                        minHeight: 50,
                        borderRadius: 16,
                        padding: "0 14px",
                        background: "rgba(15, 23, 42, 0.76)",
                        color: "#f8fafc",
                        border: "1px solid rgba(255,255,255,0.14)",
                        fontWeight: 850,
                        minWidth: 0,
                      }}
                    >
                      {campaigns.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getCampaignOptionLabel(item)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={loadSelectedPlan}
                      disabled={loadingSelectedPlan || !pendingCampaignId}
                      style={{ minHeight: 50, borderRadius: 16 }}
                    >
                      {loadingSelectedPlan ? "Loading..." : "Load"}
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={renameSelectedCampaign}
                      disabled={!campaign?.id || renamingCampaign}
                      style={{ minHeight: 50, borderRadius: 16 }}
                    >
                      {renamingCampaign ? "Renaming..." : "Rename"}
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={deleteSelectedCampaign}
                      disabled={!campaign?.id || deletingCampaign}
                      style={{
                        minHeight: 50,
                        borderRadius: 16,
                        borderColor: "rgba(255, 95, 109, 0.34)",
                        color: "rgba(255, 215, 220, 0.95)",
                      }}
                    >
                      {deletingCampaign
                        ? "Deleting..."
                        : posts.length === 0
                          ? "Delete empty set"
                          : "Delete set"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          <section
            className="premium-card"
            style={{
              display: "grid",
              gap: 20,
              border: "1px solid rgba(255, 212, 59, 0.22)",
              borderRadius: 34,
              background:
                "radial-gradient(circle at top left, rgba(255, 212, 59, 0.12), transparent 30%), linear-gradient(145deg, rgba(255,255,255,0.072), rgba(255,255,255,0.028))",
              boxShadow: "0 30px 96px rgba(0,0,0,0.3)",
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
                <h2
                  style={{
                    margin: "0 0 8px",
                    fontSize: "clamp(1.65rem, 3vw, 2.45rem)",
                  }}
                >
                  {posts.length || 0} post{posts.length === 1 ? "" : "s"} ready
                  to review.
                </h2>
                <p style={{ margin: 0, color: "var(--muted)" }}>
                  A clean review board for this week. The full editing tools
                  open inside each post.
                </p>
              </div>
            </div>

            {sortedPosts.length === 0 && (
              <div
                style={{
                  padding: 22,
                  borderRadius: 24,
                  background:
                    "radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 34%), rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255, 212, 59, 0.18)",
                  display: "grid",
                  gap: 14,
                }}
              >
                <div>
                  <div className="page-eyebrow">Empty weekly set</div>
                  <h3 style={{ margin: "4px 0 8px", fontSize: 26 }}>
                    This saved week has no posts.
                  </h3>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    This can happen if a test run was interrupted. Delete this
                    empty set, or create a new week from Dashboard.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={deleteSelectedCampaign}
                    disabled={!campaign?.id || deletingCampaign}
                    style={{
                      minHeight: 46,
                      borderRadius: 15,
                      borderColor: "rgba(255, 95, 109, 0.34)",
                      color: "rgba(255, 215, 220, 0.95)",
                    }}
                  >
                    {deletingCampaign ? "Deleting..." : "Delete empty set"}
                  </button>

                  <a
                    href="/dashboard"
                    className="dashboard-platform-create-button"
                    style={{
                      minHeight: 46,
                      borderRadius: 15,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 18px",
                    }}
                  >
                    Create posts
                  </a>
                </div>
              </div>
            )}

            {createdReviewActive && sortedPosts.length > 0 && (
              <section
                style={{
                  marginBottom: 18,
                  padding: "18px 20px",
                  borderRadius: 26,
                  background:
                    "radial-gradient(circle at top left, rgba(61, 220, 151, 0.16), transparent 34%), rgba(255,255,255,0.065)",
                  border: "1px solid rgba(61, 220, 151, 0.22)",
                  boxShadow: "0 18px 52px rgba(0,0,0,0.2)",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div>
                  <div className="page-eyebrow">Posts created</div>
                  <h2
                    style={{
                      margin: "6px 0 6px",
                      color: "#ffffff",
                      fontSize: "clamp(1.45rem, 3vw, 2.2rem)",
                      letterSpacing: "-0.04em",
                    }}
                  >
                    Review your new posts.
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: "rgba(248,250,252,0.72)",
                      lineHeight: 1.5,
                      fontWeight: 760,
                    }}
                  >
                    Start with Post 1 of {sortedPosts.length}. Edit the wording,
                    publish now, schedule later, post manually or delete anything you do not need.
                  </p>
                </div>

                <button
                  type="button"
                  className="dashboard-platform-create-button"
                  onClick={() => choosePost(sortedPosts[0].id)}
                  style={{
                    minHeight: 52,
                    borderRadius: 18,
                    padding: "0 18px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Start review
                </button>
              </section>
            )}

            {sortedPosts.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(250px, 320px))",
                  gap: 16,
                  alignItems: "stretch",
                  justifyContent: "start",
                }}
              >
                {sortedPosts.map((post: any, index: number) => {
                  const status = getPostStatus(post);
                  const platformName = getPlatformDisplayName(post);
                  const captionPreview = String(post.caption || "").slice(
                    0,
                    132,
                  );
                  const dateValue =
                    getPostDisplayScheduleValue(post) ||
                    new Date().toISOString();
                  const postDate = new Date(dateValue);
                  const safeDate = Number.isNaN(postDate.getTime())
                    ? new Date()
                    : postDate;
                  const weekday = safeDate
                    .toLocaleDateString(undefined, { weekday: "short" })
                    .toUpperCase();
                  const day = safeDate.toLocaleDateString(undefined, {
                    day: "2-digit",
                  });
                  const month = safeDate
                    .toLocaleDateString(undefined, { month: "short" })
                    .toUpperCase();
                  const time = safeDate.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const isPosted = status === "Posted";
                  const isFailed = status === "Failed";
                  const isPlanned = status === "Reminder set";
                  const mediaType = String(post.media_type || "").toLowerCase();
                  const mediaKind = getPostMediaKind(post);
                  const statusLabel = isPlanned ? "Planned" : status;

                  return (
                    <article
                      key={post.id}
                      className="fromone-premium-calendar-review-card"
                      style={{
                        position: "relative",
                        minHeight: 520,
                        maxWidth: 320,
                        display: "grid",
                        gridTemplateRows: "220px minmax(0, 1fr)",
                        overflow: "hidden",
                        borderRadius: 30,
                        background: isPosted
                          ? "radial-gradient(circle at top right, rgba(61, 220, 151, 0.18), transparent 32%), linear-gradient(145deg, rgba(255,255,255,0.088), rgba(255,255,255,0.036))"
                          : "radial-gradient(circle at top right, rgba(255, 212, 59, 0.16), transparent 30%), linear-gradient(145deg, rgba(255,255,255,0.088), rgba(255,255,255,0.036))",
                        border: isPosted
                          ? "1px solid rgba(61, 220, 151, 0.28)"
                          : isFailed
                            ? "1px solid rgba(248, 113, 113, 0.28)"
                            : "1px solid rgba(255, 212, 59, 0.18)",
                        boxShadow: "0 24px 72px rgba(0,0,0,0.28)",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          zIndex: 3,
                          top: 14,
                          left: 14,
                          width: 68,
                          borderRadius: 20,
                          overflow: "hidden",
                          background: "rgba(2, 6, 23, 0.72)",
                          border: "1px solid rgba(255,255,255,0.14)",
                          boxShadow: "0 16px 38px rgba(0,0,0,0.28)",
                          textAlign: "center",
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        <div
                          style={{
                            background: "#ffd43b",
                            color: "#101420",
                            fontSize: 10,
                            fontWeight: 950,
                            letterSpacing: "0.08em",
                            padding: "5px 4px",
                          }}
                        >
                          {weekday}
                        </div>
                        <strong
                          style={{
                            display: "block",
                            color: "#fff",
                            fontSize: 24,
                            paddingTop: 7,
                          }}
                        >
                          {day}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            color: "rgba(248,250,252,0.72)",
                            fontSize: 10,
                            fontWeight: 900,
                            padding: "0 4px 8px",
                          }}
                        >
                          {month}
                        </span>
                      </div>

                      <div
                        style={{
                          background: "#020617",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          padding: 14,
                        }}
                      >
                        {post.media_url ? (
                          mediaKind === "video" ? (
                            <video
                              src={post.media_url}
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
                          ) : mediaKind === "flyer" ? (
                            <div style={{ textAlign: "center", padding: 20 }}>
                              <strong style={{ color: "#fff" }}>
                                PDF flyer
                              </strong>
                              <p
                                style={{
                                  margin: "6px 0 0",
                                  color: "var(--muted)",
                                }}
                              >
                                Open to review.
                              </p>
                            </div>
                          ) : (
                            <img
                              src={post.media_url}
                              alt={getDisplayPostTitle(post, index) || "Post media"}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                objectPosition: "center",
                                background: "#020617",
                              }}
                            />
                          )
                        ) : (
                          <div style={{ textAlign: "center", padding: 20 }}>
                            <strong style={{ color: "#fff" }}>
                              No media yet
                            </strong>
                            <p
                              style={{
                                margin: "6px 0 0",
                                color: "var(--muted)",
                              }}
                            >
                              Add media in review.
                            </p>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          padding: 16,
                          display: "grid",
                          gridTemplateRows: "auto auto minmax(58px, 1fr) auto",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 7,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                minHeight: 28,
                                padding: "5px 10px",
                                borderRadius: 999,
                                background: "rgba(255, 212, 59, 0.12)",
                                border: "1px solid rgba(255, 212, 59, 0.2)",
                                color: "#ffe58a",
                                fontSize: 11,
                                fontWeight: 950,
                              }}
                            >
                              {platformName}
                            </span>

                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                minHeight: 28,
                                padding: "5px 10px",
                                borderRadius: 999,
                                background: isPosted
                                  ? "rgba(61, 220, 151, 0.12)"
                                  : isFailed
                                    ? "rgba(248, 113, 113, 0.12)"
                                    : "rgba(255,255,255,0.07)",
                                border: isPosted
                                  ? "1px solid rgba(61, 220, 151, 0.24)"
                                  : isFailed
                                    ? "1px solid rgba(248, 113, 113, 0.24)"
                                    : "1px solid rgba(255,255,255,0.1)",
                                color: isPosted
                                  ? "#a7f3d0"
                                  : isFailed
                                    ? "#fecaca"
                                    : "rgba(248,250,252,0.78)",
                                fontSize: 11,
                                fontWeight: 950,
                              }}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          <span
                            style={{
                              color: "rgba(248,250,252,0.55)",
                              fontSize: 12,
                              fontWeight: 900,
                            }}
                          >
                            {time}
                          </span>
                        </div>

                        <div>
                          <div
                            className="page-eyebrow"
                            style={{ marginBottom: 7 }}
                          >
                            Post {index + 1} of {sortedPosts.length}
                          </div>
                          <h3
                            style={{
                              margin: 0,
                              color: "#fff",
                              fontSize: "1.05rem",
                              lineHeight: 1.12,
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {getDisplayPostTitle(post, index)}
                          </h3>
                        </div>

                        <p
                          style={{
                            margin: 0,
                            color: "rgba(248,250,252,0.74)",
                            lineHeight: 1.48,
                            fontSize: "0.94rem",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {captionPreview ||
                            "Open to add or review the wording."}
                          {captionPreview.length >= 132 ? "..." : ""}
                        </p>

                        <div
                          className="fromone-post-card-actions"
                          style={{
                            width: "100%",
                            minWidth: 0,
                            display: "grid",
                            gridTemplateColumns: "1fr",
                            gap: 10,
                            marginTop: 4,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => choosePost(post.id)}
                            className="dashboard-platform-create-button"
                            style={{
                              width: "100%",
                              minWidth: 0,
                              minHeight: 46,
                              borderRadius: 16,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              textAlign: "center",
                            }}
                          >
                            Review / edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deletePostWithUndo(post)}
                            disabled={deletingPostId === post.id}
                            aria-label={`Delete ${getPostPositionLabel(post)}`}
                            style={{
                              width: "100%",
                              minWidth: 0,
                              minHeight: 46,
                              borderRadius: 16,
                              border: "1px solid rgba(248, 113, 113, 0.3)",
                              background: "rgba(248, 113, 113, 0.1)",
                              color: "#fecaca",
                              fontWeight: 950,
                              cursor:
                                deletingPostId === post.id ? "not-allowed" : "pointer",
                            }}
                          >
                            {deletingPostId === post.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
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
                      <strong>
                        {post.title || post.platform || "Deleted post"}
                      </strong>
                      <p style={{ margin: "4px 0 0", opacity: 0.78 }}>
                        {post.platform || "Post"} · deleted{" "}
                        {post.deleted_at
                          ? getReadableDateTime(post.deleted_at)
                          : "recently"}
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

      {renameDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-weekly-set-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(2, 6, 23, 0.72)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            className="premium-card"
            style={{
              width: "min(520px, 100%)",
              borderRadius: 30,
              border: "1px solid rgba(255, 212, 59, 0.26)",
              boxShadow: "0 34px 110px rgba(0,0,0,0.48)",
            }}
          >
            <div className="page-eyebrow">Rename weekly set</div>
            <h2 id="rename-weekly-set-title" style={{ margin: "4px 0 10px" }}>
              Give this week a clearer name.
            </h2>
            <p style={{ margin: "0 0 16px", color: "var(--muted)" }}>
              This only changes the saved set name. Your posts and schedules
              stay the same.
            </p>

            <input
              className="input"
              value={renameCampaignValue}
              onChange={(event) => setRenameCampaignValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  confirmRenameSelectedCampaign();
                }

                if (event.key === "Escape") {
                  setRenameDialogOpen(false);
                }
              }}
              autoFocus
              style={{
                width: "100%",
                minHeight: 52,
                borderRadius: 16,
                marginBottom: 16,
              }}
            />

            <div
              className="button-row"
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() => setRenameDialogOpen(false)}
                disabled={renamingCampaign}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRenameSelectedCampaign}
                disabled={renamingCampaign}
              >
                {renamingCampaign ? "Saving..." : "Save name"}
              </button>
            </div>
          </div>
        </div>
      )}


      <style jsx global>{`
        .fromone-post-card-actions {
          grid-template-columns: 1fr !important;
        }

        .fromone-post-card-actions button {
          width: 100% !important;
          min-width: 0 !important;
        }

        .fromone-premium-calendar-review-card {
          max-width: 320px !important;
        }

        @media (max-width: 760px) {
          .fromone-premium-calendar-review-card {
            max-width: 100% !important;
          }
        }
      `}</style>

      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-action-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(2, 6, 23, 0.72)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            className="premium-card"
            style={{
              width: "min(520px, 100%)",
              borderRadius: 30,
              border: confirmDialog.danger
                ? "1px solid rgba(255, 95, 109, 0.34)"
                : "1px solid rgba(255, 212, 59, 0.26)",
              boxShadow: "0 34px 110px rgba(0,0,0,0.48)",
            }}
          >
            <div className="page-eyebrow">
              {confirmDialog.danger ? "Please confirm" : "Confirm action"}
            </div>
            <h2 id="confirm-action-title" style={{ margin: "4px 0 10px" }}>
              {confirmDialog.title}
            </h2>
            <p
              style={{
                margin: "0 0 20px",
                color: "var(--muted)",
                lineHeight: 1.55,
              }}
            >
              {confirmDialog.message}
            </p>

            <div
              className="button-row"
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={closeConfirmDialog}
                disabled={
                  deletingCampaign ||
                  deletingPostId === confirmDialog.post?.id ||
                  removingMediaPostId === confirmDialog.post?.id
                }
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  confirmDialog.danger
                    ? "secondary-button danger-button"
                    : undefined
                }
                onClick={() => {
                  if (confirmDialog.type === "deleteCampaign") {
                    confirmDeleteSelectedCampaign();
                    return;
                  }

                  if (confirmDialog.type === "removeMedia") {
                    confirmRemoveMedia(confirmDialog.post);
                    return;
                  }

                  if (confirmDialog.type === "deletePost") {
                    confirmDeletePostWithUndo(confirmDialog.post);
                  }
                }}
                disabled={
                  deletingCampaign ||
                  deletingPostId === confirmDialog.post?.id ||
                  removingMediaPostId === confirmDialog.post?.id
                }
              >
                {deletingCampaign ||
                deletingPostId === confirmDialog.post?.id ||
                removingMediaPostId === confirmDialog.post?.id
                  ? "Working..."
                  : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
