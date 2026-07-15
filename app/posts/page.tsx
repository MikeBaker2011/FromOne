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


function getMobilePostState(post: any) {
  const safeText = (value: unknown) => String(value || "").trim();

  const approvalStatus = safeText(post?.approval_status).toLowerCase();
  const publishStatus = safeText(post?.publish_status).toLowerCase();
  const status = safeText(post?.status).toLowerCase();

  const isPosted =
    Boolean(post?.is_posted) ||
    status === "posted" ||
    publishStatus === "posted" ||
    publishStatus === "published" ||
    approvalStatus === "posted";

  if (isPosted) {
    return {
      label: "Posted",
      className: "is-posted",
      reviewLabel: "View post",
    };
  }

  if (
    approvalStatus === "scheduled" ||
    publishStatus === "scheduled" ||
    status === "scheduled"
  ) {
    return {
      label: "Autoscheduled",
      className: "is-autoscheduled",
      reviewLabel: "View post",
    };
  }

  return {
    label: "Manual",
    className: "is-manual",
    reviewLabel: "Review",
  };
}





function MobileMethodPill({ post }: { post: any }) {
  const mobilePostState = getMobilePostState(post);

  return (
    <span className={`fromone-mobile-method-pill ${mobilePostState.className}`}>
      {mobilePostState.label}
    </span>
  );
}


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
      const secondTime = secondSchedule
        ? new Date(secondSchedule).getTime()
        : 0;
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
        cleanQuery
          ? `${window.location.pathname}?${cleanQuery}`
          : window.location.pathname,
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
          : `This will remove ${getCampaignDisplayName()} and its posts from FromOne. Shared images used by Smilez will be kept. This cannot be undone.`,
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

      /*
       * Do not delete campaign media from Supabase Storage here.
       *
       * Smilez offers and events can continue referencing the same uploaded
       * image after the FromOne weekly set has been removed. Deleting the
       * storage object would leave those public records with a broken URL.
       *
       * This action therefore deletes only the FromOne campaign/database
       * records. Shared media remains available until a separate, reference-
       * aware cleanup process confirms that nothing still uses it.
       */

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

      notify(
        "Weekly posts deleted from FromOne. Shared Smilez images were kept.",
        "success",
        "Weekly set deleted",
      );
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
    const cleanTitle = String(value || "")
      .trim()
      .toLowerCase();

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
      cleanCaption
        .split(/[.!?]/)
        .find((part) => part.trim().length >= 12)
        ?.trim() || cleanCaption;

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

  const getCreatedFromUploadLabel = (post: any) => {
    const mediaKind = getPostMediaKind(post);

    if (post?.media_url) {
      if (mediaKind === "video") return "Created from video";
      if (mediaKind === "flyer") return "Created from flyer";
      return "Created from image";
    }

    return "Profile-only draft";
  };

  const getPostScheduleLabel = (post: any) => {
    const scheduleValue = post?.scheduled_at || post?.scheduled_publish_at;

    if (!scheduleValue) return "Suggested time not set";

    const date = new Date(scheduleValue);

    if (Number.isNaN(date.getTime())) return "Suggested time not set";

    return date.toLocaleString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    const mediaUrl = String(
      post?.media_url || post?.media_path || "",
    ).toLowerCase();

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
    const businessName =
      profile?.business_name || campaign?.business_name || "the business";
    const industry =
      profile?.industry || campaign?.business_type || "general business";
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
          posts:
            "Return exactly one improved post. If this is video, analyse the footage when possible and make the post about the visible video moment.",
          media_analysis_rule:
            mediaKind === "video"
              ? "Video rescan must be specific to the footage. Do not write a generic business caption."
              : "Rescan the attached media and make the post specific to the visible/supplied media.",
        },
      });

      const rewrittenPost = response.data?.posts?.[0];
      const inlineVideoMediaUsed = Number(
        response.data?.inlineVideoMediaUsed || 0,
      );
      const inlineImageMediaUsed = Number(
        response.data?.inlineImageMediaUsed ||
          response.data?.visionMediaUsed ||
          0,
      );

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
          "Video rewritten",
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

  const mobileReviewPosts = sortedPosts;
  const activeSuccessMoment = successMoment;
  const activeConfirmDialog = confirmDialog;

  const getSimplePostDestination = (post: any) => {
    const platform = String(post?.platform || "").toLowerCase();

    if (platform.includes("smiles")) return "Smiles";
    if (platform.includes("instagram")) return "Instagram";
    if (platform.includes("facebook")) return "Facebook";

    return post?.platform || "Post";
  };

  const getSimplePostStatus = (post: any) => {
    const publishedTo = String(post?.published_to || post?.publishedTo || "").trim();

    if (publishedTo) return `Published to ${publishedTo}`;
    if (post?.smiles_status === "sent") return "Sent to Smiles";
    if (isPostPosted(post)) return "Published";
    if (isPostFailed(post)) return "Needs checking";
    if (isPostReminderSet(post)) return "Scheduled";

    return "Ready to review";
  };

  const getSimpleStatusClass = (post: any) => {
    if (post?.published_to || post?.publishedTo || post?.smiles_status === "sent" || isPostPosted(post)) {
      return "is-done";
    }

    if (isPostFailed(post)) return "is-problem";
    if (isPostReminderSet(post)) return "is-planned";

    return "is-ready";
  };

  return (
    <main className="fromone-posts-page posts-simple-page">
      <section id="fromone-standard-shell" className="posts-simple-card">
        <header className="posts-simple-hero">
          <span>Posts</span>
          <h1>Your posts are ready.<br />Keep it simple.</h1>
          <p>Open a post, check it, then publish or send it where it needs to go.</p>
        </header>

        <div className="posts-simple-actions">
          <a href="/dashboard">Create more posts</a>
        </div>

        {loading ? (
          <section className="posts-simple-empty">
            <strong>Loading posts...</strong>
            <p>One moment while FromOne gets your review queue.</p>
          </section>
        ) : sortedPosts.length === 0 ? (
          <section className="posts-simple-empty">
            <strong>No posts to review.</strong>
            <p>Create a post first, then it will appear here.</p>
            <a href="/dashboard">Create a post</a>
          </section>
        ) : (
          <section className="posts-simple-list" aria-label="Posts ready to review">
            {sortedPosts.map((post: any, index: number) => {
              const mediaKind = getPostMediaKind(post);
              const title = getDisplayPostTitle(post, index);
              const captionPreview = String(post?.caption || "").trim();
              const destination = getSimplePostDestination(post);
              const status = getSimplePostStatus(post);
              const statusClass = getSimpleStatusClass(post);

              return (
                <article key={post.id} className="posts-simple-item">
                  <div className="posts-simple-media">
                    {post?.media_url ? (
                      mediaKind === "video" ? (
                        <video src={post.media_url} muted playsInline preload="metadata" />
                      ) : mediaKind === "flyer" ? (
                        <div className="posts-simple-media-empty">
                          <strong>Flyer</strong>
                        </div>
                      ) : (
                        <img src={post.media_url} alt={title || "Post media"} />
                      )
                    ) : (
                      <div className="posts-simple-media-empty">
                        <strong>No media</strong>
                      </div>
                    )}
                  </div>

                  <div className="posts-simple-copy">
                    <div className="posts-simple-meta">
                      <span>{destination}</span>
                      <span className={statusClass}>{status}</span>
                    </div>

                    <h2>{title}</h2>

                    <p>
                      {captionPreview ||
                        "Open this post to check the wording before anything is published."}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="posts-simple-review"
                    onClick={() => choosePost(post.id)}
                  >
                    Review
                  </button>
                </article>
              );
            })}
          </section>
        )}
      </section>

      <style jsx global>{`
        body:has(.posts-simple-page),
        body:has(.posts-simple-page) * {
          font-family:
            var(--font-main),
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif !important;
          letter-spacing: -0.01em !important;
        }

        body:has(.posts-simple-page) .app-shell,
        body:has(.posts-simple-page) .main-content {
          background: #f4f7fb !important;
        }

        .posts-simple-page {
          min-height: 100vh;
          padding: 28px 18px 96px;
          background: #f4f7fb;
          color: #071b49;
          font-weight: 500;
        }

        .posts-simple-card {
          width: min(100%, 920px);
          display: grid;
          gap: 24px;
          margin: 0 auto;
          padding: clamp(28px, 4vw, 46px);
          border: 1.5px solid #dfe5f1;
          border-radius: 32px;
          background: #ffffff;
          box-shadow: 0 26px 80px rgba(7, 27, 73, 0.10);
        }

        .posts-simple-hero {
          display: grid;
          gap: 10px;
        }

        .posts-simple-hero span {
          color: #f72585;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.06em !important;
          text-transform: uppercase;
        }

        .posts-simple-hero h1 {
          max-width: 760px;
          margin: 0;
          color: #071b49;
          font-size: clamp(3rem, 5.4vw, 4.45rem);
          font-weight: 800;
          line-height: 0.96;
          letter-spacing: -0.055em !important;
        }

        .posts-simple-hero p {
          max-width: 650px;
          margin: 0;
          color: #52617d;
          font-size: clamp(1.05rem, 2vw, 1.18rem);
          font-weight: 500;
          line-height: 1.48;
        }

        .posts-simple-actions {
          display: flex;
          justify-content: flex-start;
        }

        .posts-simple-actions a,
        .posts-simple-empty a,
        .posts-simple-review {
          min-height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #f72585;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff;
          padding: 0 24px;
          font-size: 1rem;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 16px 34px rgba(247, 37, 133, 0.18);
          cursor: pointer;
        }

        .posts-simple-list {
          display: grid;
          gap: 12px;
        }

        .posts-simple-item {
          display: grid;
          grid-template-columns: 118px minmax(0, 1fr) 132px;
          gap: 18px;
          align-items: center;
          padding: 14px;
          border: 1.5px solid #dfe5f1;
          border-radius: 24px;
          background: #fbfcff;
        }

        .posts-simple-media {
          width: 118px;
          height: 104px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 18px;
          background: #071026;
        }

        .posts-simple-media img,
        .posts-simple-media video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .posts-simple-media-empty {
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
          color: #ffffff;
          font-weight: 800;
        }

        .posts-simple-copy {
          min-width: 0;
          display: grid;
          gap: 8px;
        }

        .posts-simple-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .posts-simple-meta span {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          border: 1.5px solid #ffd4e8;
          border-radius: 999px;
          background: #ffffff;
          color: #071b49;
          padding: 0 11px;
          font-size: 0.78rem;
          font-weight: 800;
        }

        .posts-simple-meta .is-done {
          border-color: #ccefdc;
          background: #f2fff7;
        }

        .posts-simple-meta .is-problem {
          border-color: #ffd2d2;
          background: #fff5f5;
        }

        .posts-simple-meta .is-planned {
          border-color: #ffe8ad;
          background: #fffaf0;
        }

        .posts-simple-copy h2 {
          margin: 0;
          color: #071b49;
          font-size: clamp(1.18rem, 2.2vw, 1.42rem);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -0.035em !important;
        }

        .posts-simple-copy p {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 0;
          color: #52617d;
          font-size: 0.98rem;
          font-weight: 500;
          line-height: 1.42;
        }

        .posts-simple-review {
          width: 100%;
          min-height: 50px;
          border-radius: 999px;
        }

        .posts-simple-empty {
          display: grid;
          gap: 12px;
          padding: 24px;
          border: 1.5px solid #ffd4e8;
          border-radius: 24px;
          background: #fff6fb;
        }

        .posts-simple-empty strong {
          color: #071b49;
          font-size: 1.45rem;
          font-weight: 800;
          letter-spacing: -0.035em !important;
        }

        .posts-simple-empty p {
          margin: 0;
          color: #52617d;
          font-weight: 500;
          line-height: 1.45;
        }

        @media (max-width: 780px) {
          .posts-simple-page {
            padding: 14px 14px 104px;
          }

          .posts-simple-card {
            gap: 22px;
            padding: 22px;
            border-radius: 24px;
          }

          .posts-simple-hero h1 {
            font-size: clamp(2.55rem, 12vw, 3.5rem);
            line-height: 1;
          }

          .posts-simple-item {
            grid-template-columns: 1fr;
            padding: 14px;
          }

          .posts-simple-media {
            width: 100%;
            height: 210px;
          }

          .posts-simple-review {
            min-height: 54px;
          }
        }

        /* EXACT AGENCY WIDTH LOCK — rendered inside the active Posts return */
        body:has(.fromone-posts-page) {
          background: #f5f7fb !important;
          overflow-x: hidden !important;
        }

        body:has(.fromone-posts-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-posts-page) .app-shell,
        body:has(.fromone-posts-page) .main-content {
          background: #f5f7fb !important;
        }

        body:has(.fromone-posts-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .fromone-posts-page {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 32px 16px 72px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
          background: #f5f7fb !important;
          color: #071b49 !important;
        }

        .fromone-posts-page #fromone-standard-shell {
          width: 1040px !important;
          max-width: calc(100% - 32px) !important;
          min-width: 0 !important;
          min-height: 620px !important;
          display: grid !important;
          gap: 24px !important;
          margin: 0 auto !important;
          padding: clamp(30px, 4vw, 48px) !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 32px !important;
          background: #ffffff !important;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.10) !important;
        }

        @media (max-width: 780px) {
          .fromone-posts-page {
            padding: 24px 16px 112px !important;
          }

          .fromone-posts-page #fromone-standard-shell {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 22px !important;
            border-radius: 26px !important;
          }
        }



        /* -------------------------------------------------------------- */
        /* POSTS BUTTON POLISH                                             */
        /* -------------------------------------------------------------- */
        .fromone-posts-page .posts-simple-actions {
          display: flex !important;
          justify-content: flex-start !important;
          width: 100% !important;
          margin: 0 0 24px !important;
          padding: 0 !important;
        }

        .fromone-posts-page .posts-simple-actions a {
          width: auto !important;
          min-width: 190px !important;
          max-width: 220px !important;
          min-height: 52px !important;
          padding: 0 24px !important;
          border-radius: 999px !important;
          font-size: 0.98rem !important;
          font-weight: 800 !important;
          line-height: 1 !important;
          box-shadow: 0 14px 30px rgba(247, 37, 133, 0.22) !important;
        }

        @media (max-width: 760px) {
          .fromone-posts-page .posts-simple-actions a {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 56px !important;
          }
        }


        /* -------------------------------------------------------------- */
        /* POSTS MOBILE GAP ONLY — match Dashboard mobile                  */
        /* Desktop spacing untouched                                      */
        /* -------------------------------------------------------------- */
        @media (max-width: 760px) {
          body:has(.fromone-posts-page) .main-content {
            padding-top: 0 !important;
          }

          .fromone-posts-page {
            padding-top: 24px !important;
          }

          .fromone-posts-page #fromone-standard-shell,
          .fromone-posts-page .posts-simple-shell,
          .fromone-posts-page .posts-simple-page-card {
            margin-top: 0 !important;
          }
        }

      `}</style>
    </main>
  );

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
      <style jsx global>{`
        @media (min-width: 901px) {
          .fromone-mobile-ready-flow {
            display: none !important;
          }
        }

        @media (max-width: 900px) {
          body:has(.fromone-mobile-ready-flow) .mobile-topbar {
            display: none !important;
          }

          body:has(.fromone-mobile-ready-flow) .app-shell {
            padding-top: 0 !important;
          }

          body:has(.fromone-mobile-ready-flow) .main-content {
            padding-top: 0 !important;
          }

          .simplified-posts-page {
            max-width: 430px !important;
            min-height: 100dvh !important;
            margin: 0 auto !important;
            padding: 20px 18px 118px !important;
            background:
              radial-gradient(
                circle at 0% 0%,
                rgba(255, 212, 59, 0.14),
                transparent 32%
              ),
              radial-gradient(
                circle at 100% 8%,
                rgba(236, 72, 153, 0.17),
                transparent 30%
              ),
              linear-gradient(180deg, #050b18 0%, #071832 52%, #020713 100%) !important;
          }

          .simplified-posts-page
            > section:not(.fromone-mobile-ready-flow):not(.access-status-card),
          .simplified-posts-page
            > .premium-card:not(.fromone-mobile-ready-flow) {
            display: none !important;
          }

          .fromone-mobile-ready-flow {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            width: 100% !important;
            max-width: 360px !important;
            margin: 0 auto !important;
            color: #ffffff !important;
          }

          .fromone-mobile-ready-brand {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin: 0 0 18px;
          }

          .fromone-mobile-ready-brand img {
            width: 30px;
            height: 30px;
            border-radius: 9px;
          }

          .fromone-mobile-ready-brand span {
            color: #ffffff;
            font-size: 1.05rem;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .fromone-mobile-ready-flow h1 {
            margin: 0 0 18px;
            color: #ffffff;
            font-size: clamp(1.85rem, 8.2vw, 2.35rem);
            line-height: 1.02;
            letter-spacing: -0.06em;
            font-weight: 950;
            text-align: left;
          }

          .fromone-mobile-phone-card {
            overflow: hidden;
            border-radius: 24px;
            background: #f8fafc;
            color: #071225;
            box-shadow:
              0 28px 72px rgba(0, 0, 0, 0.48),
              0 0 0 1px rgba(255, 255, 255, 0.18);
          }

          .fromone-mobile-media-wrap {
            width: 100%;
            height: 232px;
            background: #ffffff;
            overflow: hidden;
          }

          .fromone-mobile-media-wrap img,
          .fromone-mobile-media-wrap video {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #ffffff;
          }

          .fromone-mobile-flyer-placeholder {
            display: grid;
            place-items: center;
            align-content: center;
            gap: 8px;
            width: 100%;
            height: 100%;
            padding: 24px;
            color: #071225;
            text-align: center;
            background:
              radial-gradient(
                circle at top,
                rgba(255, 212, 59, 0.35),
                transparent 36%
              ),
              #eef2ff;
          }

          .fromone-mobile-flyer-placeholder strong {
            font-size: 1.25rem;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .fromone-mobile-flyer-placeholder span {
            color: #475569;
            font-size: 0.92rem;
            font-weight: 750;
            line-height: 1.35;
          }

          .fromone-mobile-card-body {
            padding: 17px 18px 18px;
          }

          .fromone-mobile-card-count {
            margin: 0 0 8px;
            color: #d9a900;
            font-size: 0.72rem;
            font-weight: 950;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .fromone-mobile-card-body h2 {
            margin: 0 0 8px;
            color: #071225;
            font-size: 1.28rem;
            line-height: 1.05;
            letter-spacing: -0.045em;
            font-weight: 950;
          }

          .fromone-mobile-caption {
            margin: 0;
            color: #1f2937;
            font-size: 0.94rem;
            line-height: 1.42;
            font-weight: 650;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .fromone-mobile-hashtags {
            margin: 10px 0 0;
            color: #1d4ed8;
            font-size: 0.9rem;
            line-height: 1.35;
            font-weight: 850;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .fromone-mobile-card-list {
            display: grid;
            grid-template-columns: 1fr;
            gap: 18px;
            width: 100%;
          }

          .fromone-mobile-ready-subtitle {
            margin: -8px 0 20px;
            color: rgba(255,255,255,0.72);
            font-size: 0.98rem;
            line-height: 1.45;
            font-weight: 800;
            text-align: left;
          }

          .fromone-mobile-actions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0;
            margin-top: 0;
            padding: 0 18px 18px;
          }

          .fromone-mobile-actions button {
            min-height: 58px;
            border-radius: 18px;
            font-size: 1.02rem;
            font-weight: 950;
            cursor: pointer;
          }

          .fromone-mobile-review-button {
            border: 0;
            background: linear-gradient(180deg, #ffd43b, #ffb703);
            color: #061225;
            box-shadow: 0 16px 34px rgba(255, 183, 3, 0.3);
          }

          .fromone-mobile-card-meta-row,
          .fromone-mobile-status-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 14px;
            color: rgba(255,255,255,0.72);
            font-size: 0.72rem;
            font-weight: 900;
          }

          .fromone-mobile-card-meta-row span,
          .fromone-mobile-status-row span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .fromone-mobile-safe-note {
            margin: 14px 0 0;
            color: rgba(255, 255, 255, 0.68);
            font-size: 0.9rem;
            font-weight: 800;
            line-height: 1.35;
            text-align: center;
          }

          @media (max-width: 380px) {
            .fromone-mobile-ready-flow {
              max-width: 334px !important;
            }

            .fromone-mobile-media-wrap {
              height: 214px;
            }

            .fromone-mobile-card-body h2 {
              font-size: 1.18rem;
            }

            .fromone-mobile-caption {
              font-size: 0.88rem;
            }

            .fromone-mobile-actions button {
              min-height: 54px;
            }
          }
        }
      `}</style>

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
            Your posts are ready.
          </h1>
          <p
            className="page-description"
            style={{ margin: "0 auto 28px", maxWidth: 760 }}
          >
            Upload photos, videos or flyers. FromOne turns each one into a
            scheduled post for you to review.
          </p>

          <div className="page-eyebrow">No posts yet</div>
          <h2 style={{ marginTop: 0 }}>Create this week’s posts first.</h2>
          <p style={{ maxWidth: 680, margin: "0 auto 22px" }}>
            Go to Create, upload photos, videos or flyers, then FromOne will
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

          {mobileReviewPosts.length > 0 && (
            <section
              className="fromone-mobile-ready-flow"
              aria-label="Posts ready to review"
            >
              <div className="fromone-mobile-ready-brand">
                <img src="/fromone-logo.png" alt="FromOne logo" />
                <span>FromOne</span>
              </div>

              <h1>Your posts are ready! ✨</h1>

              <p className="fromone-mobile-ready-subtitle">
                {mobileReviewPosts.length} scheduled{" "}
                {mobileReviewPosts.length === 1 ? "post" : "posts"} created.
                Review each one before anything publishes.
              </p>

              <div className="fromone-mobile-card-list">
                {mobileReviewPosts.map((post, index) => {
              const mobilePostState = getMobilePostState(post);
                  const mediaKind = getPostMediaKind(post);
                  const title = getDisplayPostTitle(post, index);
                  const captionPreview = String(post?.caption || "").trim();
                  const hashtags = Array.isArray(post?.hashtags)
                    ? post.hashtags.join(" ")
                    : String(post?.hashtags || "");
                  const scheduleLabel = getPostScheduleLabel(post);
                  const createdFromLabel = getCreatedFromUploadLabel(post);
                  const status = getPostStatus(post);

                  return (
                    <article
                      key={post.id}
                      className="fromone-mobile-phone-card"
                    >
                      <div className="fromone-mobile-media-wrap">
                        {post?.media_url ? (
                          mediaKind === "video" ? (
                            <video
                              src={post.media_url}
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : mediaKind === "flyer" ? (
                            <div className="fromone-mobile-flyer-placeholder">
                              <strong>PDF flyer</strong>
                              <span>Open to review this scheduled post.</span>
                            </div>
                          ) : (
                            <img
                              src={post.media_url}
                              alt={title || "Post media"}
                            />
                          )
                        ) : (
                          <div className="fromone-mobile-flyer-placeholder">
                            <strong>No media yet</strong>
                            <span>Open to add or review the post.</span>
                          </div>
                        )}
                      </div>

                      <div className="fromone-mobile-card-body">
                        <div className="fromone-mobile-card-meta-row">
                          <span>{createdFromLabel}</span>
                          <span>{scheduleLabel}</span>
                        </div>

                        <p className="fromone-mobile-card-count">
                          Post {index + 1} of {mobileReviewPosts.length}
                        </p>

                        <h2>{title}</h2>

                        <p className="fromone-mobile-caption">
                          {captionPreview ||
                            "Open to check the wording, media and scheduled time."}
                        </p>

                        {hashtags && (
                          <p className="fromone-mobile-hashtags">{hashtags}</p>
                        )}

                        <div className="fromone-mobile-status-row">
                          <span>{status}</span>
                        </div>
                      </div>

                      <div className="fromone-mobile-method-row">
                    <MobileMethodPill post={post} />
                  </div>

                  <div className="fromone-mobile-actions">
                        <button
                          type="button"
                          className="fromone-mobile-review-button"
                          onClick={() => choosePost(post.id)}
                        >
                          Review
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <p className="fromone-mobile-safe-note">
                Nothing publishes until you approve each post.
              </p>
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
                <div
                  className="fromone-posts-hero-copy"
                  style={{ minWidth: 0 }}
                >
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
                    Your posts are ready.
                  </h1>
                  <p
                    className="page-description"
                    style={{ margin: 0, maxWidth: 760 }}
                  >
                    Here is your review queue. Open a post, check it, approve
                    it, then move to the next one.
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
                ></div>
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

          <section className="premium-card posts-onboarding-helper-card posts-upload-flow-helper-card">
            <div className="page-eyebrow">Created from your uploads</div>
            <h2>Review your scheduled posts.</h2>
            <p>
              FromOne creates one scheduled post for each photo, video or flyer
              you upload. Nothing publishes until you approve it.
            </p>
          </section>

          <section
            className="premium-card posts-weekly-review-section"
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
                <div className="page-eyebrow">Review queue</div>
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
                  Open each post to check the wording, media and suggested time.
                  Nothing publishes until approved.
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
                    No posts waiting for review.
                  </h3>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    This can happen if a test run was interrupted. Delete this
                    empty set, or create a new week from Create.
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
                    Your new posts are ready.
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: "rgba(248,250,252,0.72)",
                      lineHeight: 1.5,
                      fontWeight: 760,
                    }}
                  >
                    Start with Post 1 of {sortedPosts.length}. Review it,
                    approve it, then move to the next one.
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
                  Review first post
                </button>
              </section>
            )}

            {sortedPosts.length > 0 && (
              <div
                className="posts-weekly-card-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(250px, 320px))",
                  gap: 16,
                  alignItems: "stretch",
                  justifyContent: "center",
                  justifyItems: "center",
                  width: "100%",
                }}
              >
                {sortedPosts.map((post: any, index: number) => {
              const mobilePostState = getMobilePostState(post);
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
                          top: 18,
                          left: 18,
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
                        className="fromone-premium-calendar-media-frame"
                        style={{
                          background: "#020617",
                          display: "grid",
                          placeItems: "center",
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
                                display: "block",
                                width: "auto",
                                height: "auto",
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                                objectPosition: "center center",
                                background: "#020617",
                                margin: "0 auto",
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
                              alt={
                                getDisplayPostTitle(post, index) || "Post media"
                              }
                              style={{
                                display: "block",
                                width: "auto",
                                height: "auto",
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                                objectPosition: "center center",
                                background: "#020617",
                                margin: "0 auto",
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
                            Review
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
                                deletingPostId === post.id
                                  ? "not-allowed"
                                  : "pointer",
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

      {activeSuccessMoment && (
        <PostSuccessModal
          postsLeft={activeSuccessMoment!.postsLeft}
          nextPostId={activeSuccessMoment!.nextPostId}
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

      {activeConfirmDialog && (
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
              border: activeConfirmDialog!.danger
                ? "1px solid rgba(255, 95, 109, 0.34)"
                : "1px solid rgba(255, 212, 59, 0.26)",
              boxShadow: "0 34px 110px rgba(0,0,0,0.48)",
            }}
          >
            <div className="page-eyebrow">
              {activeConfirmDialog!.danger ? "Please confirm" : "Confirm action"}
            </div>
            <h2 id="confirm-action-title" style={{ margin: "4px 0 10px" }}>
              {activeConfirmDialog!.title}
            </h2>
            <p
              style={{
                margin: "0 0 20px",
                color: "var(--muted)",
                lineHeight: 1.55,
              }}
            >
              {activeConfirmDialog!.message}
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
                  deletingPostId === activeConfirmDialog!.post?.id ||
                  removingMediaPostId === activeConfirmDialog!.post?.id
                }
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  activeConfirmDialog!.danger
                    ? "secondary-button danger-button"
                    : undefined
                }
                onClick={() => {
                  if (activeConfirmDialog!.type === "deleteCampaign") {
                    confirmDeleteSelectedCampaign();
                    return;
                  }

                  if (activeConfirmDialog!.type === "removeMedia") {
                    confirmRemoveMedia(activeConfirmDialog!.post);
                    return;
                  }

                  if (activeConfirmDialog!.type === "deletePost") {
                    confirmDeletePostWithUndo(activeConfirmDialog!.post);
                  }
                }}
                disabled={
                  deletingCampaign ||
                  deletingPostId === activeConfirmDialog!.post?.id ||
                  removingMediaPostId === activeConfirmDialog!.post?.id
                }
              >
                {deletingCampaign ||
                deletingPostId === activeConfirmDialog!.post?.id ||
                removingMediaPostId === activeConfirmDialog!.post?.id
                  ? "Working..."
                  : activeConfirmDialog!.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        /* FromOne simple mobile post-review flow */
        .simplified-posts-page {
          background:
            radial-gradient(
              circle at 15% 0%,
              rgba(255, 212, 59, 0.12),
              transparent 28%
            ),
            linear-gradient(180deg, #07162f 0%, #020617 58%, #020617 100%) !important;
        }

        .fromone-posts-hero-card,
        .posts-weekly-review-section,
        .posts-onboarding-helper-card {
          isolation: isolate !important;
        }

        @media (max-width: 900px) {
          .simplified-posts-page {
            padding: 14px 14px 118px !important;
          }

          .fromone-posts-hero-card {
            margin: 0 0 14px !important;
            padding: 18px !important;
            border-radius: 28px !important;
            text-align: center !important;
            background:
              radial-gradient(
                circle at top,
                rgba(255, 212, 59, 0.18),
                transparent 36%
              ),
              linear-gradient(
                180deg,
                rgba(255, 255, 255, 0.08),
                rgba(255, 255, 255, 0.03)
              ) !important;
          }

          .fromone-posts-hero-layout {
            display: block !important;
          }

          .fromone-posts-hero-copy .page-title {
            font-size: clamp(2rem, 11vw, 3.15rem) !important;
            line-height: 0.94 !important;
            letter-spacing: -0.065em !important;
            margin-bottom: 10px !important;
          }

          .fromone-posts-hero-copy .page-description {
            margin: 0 auto !important;
            max-width: 320px !important;
            font-size: 0.98rem !important;
            line-height: 1.45 !important;
            color: rgba(248, 250, 252, 0.76) !important;
          }

          .posts-onboarding-helper-card {
            display: none !important;
          }

          .posts-weekly-review-section {
            padding: 16px !important;
            border-radius: 30px !important;
            gap: 16px !important;
            border-color: rgba(255, 212, 59, 0.24) !important;
            background:
              radial-gradient(
                circle at top,
                rgba(255, 212, 59, 0.12),
                transparent 32%
              ),
              linear-gradient(
                180deg,
                rgba(255, 255, 255, 0.075),
                rgba(255, 255, 255, 0.028)
              ) !important;
          }

          .posts-weekly-review-section > div:first-child {
            text-align: center !important;
            justify-content: center !important;
          }

          .posts-weekly-review-section > div:first-child h2 {
            font-size: clamp(1.75rem, 8vw, 2.45rem) !important;
            line-height: 0.98 !important;
            letter-spacing: -0.055em !important;
          }

          .posts-weekly-review-section > div:first-child p {
            max-width: 320px !important;
            margin: 0 auto !important;
            font-size: 0.94rem !important;
          }

          .posts-weekly-card-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            justify-items: center !important;
            gap: 18px !important;
          }

          .fromone-premium-calendar-review-card {
            width: min(100%, 356px) !important;
            max-width: 356px !important;
            min-height: 0 !important;
            grid-template-rows: minmax(245px, 54vw) auto !important;
            border-radius: 34px !important;
            box-shadow:
              0 28px 90px rgba(0, 0, 0, 0.44),
              inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
          }

          .fromone-premium-calendar-review-card:nth-of-type(n + 2) {
            opacity: 0.92 !important;
          }

          .fromone-premium-calendar-media-frame {
            padding: 12px !important;
          }

          .fromone-premium-calendar-review-card h3 {
            font-size: 1.12rem !important;
          }

          .fromone-premium-calendar-review-card p {
            font-size: 0.94rem !important;
          }

          .fromone-post-card-actions {
            grid-template-columns: 1fr !important;
          }

          .fromone-post-card-actions .dashboard-platform-create-button {
            min-height: 52px !important;
            border-radius: 18px !important;
            font-size: 1rem !important;
            font-weight: 1000 !important;
          }

          .fromone-post-card-actions button[aria-label^="Delete"] {
            min-height: 44px !important;
            opacity: 0.72 !important;
          }
        }

        @media (max-width: 430px) {
          .simplified-posts-page {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .fromone-premium-calendar-review-card {
            width: 100% !important;
            border-radius: 30px !important;
            grid-template-rows: 238px auto !important;
          }
        }

        /* Premium post card media centering fix */
        .fromone-premium-calendar-media-frame {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          display: grid !important;
          place-items: center !important;
          text-align: center !important;
          overflow: hidden !important;
          isolation: isolate !important;
        }

        .fromone-premium-calendar-media-frame img,
        .fromone-premium-calendar-media-frame video {
          display: block !important;
          width: auto !important;
          height: auto !important;
          max-width: 100% !important;
          max-height: 100% !important;
          object-fit: contain !important;
          object-position: center center !important;
          margin: auto !important;
          flex: none !important;
          transform: none !important;
        }

        .fromone-premium-calendar-media-frame > img,
        .fromone-premium-calendar-media-frame > video {
          justify-self: center !important;
          align-self: center !important;
        }

        .posts-media-preview,
        .post-media,
        .weekly-post-media,
        .queue-post-media,
        .fromone-upload-preview,
        .upload-preview,
        .media-preview,
        .post-media-preview {
          display: grid !important;
          place-items: center !important;
          text-align: center !important;
        }

        .posts-media-preview img,
        .posts-media-preview video,
        .post-media img,
        .post-media video,
        .weekly-post-media img,
        .weekly-post-media video,
        .queue-post-media img,
        .queue-post-media video,
        .fromone-upload-preview img,
        .fromone-upload-preview video,
        .upload-preview img,
        .upload-preview video,
        .media-preview img,
        .media-preview video,
        .post-media-preview img,
        .post-media-preview video {
          display: block !important;
          width: auto !important;
          height: auto !important;
          max-width: 100% !important;
          max-height: 260px !important;
          object-fit: contain !important;
          object-position: center center !important;
          margin: auto !important;
          transform: none !important;
        }

        /* Phase 9 UI polish — Posts list */
        .posts-page,
        .posts-shell,
        .posts-wrap {
          width: min(100%, 1180px) !important;
          margin-inline: auto !important;
        }

        .posts-page {
          padding-bottom: 56px !important;
        }

        .posts-shell,
        .posts-wrap {
          padding-inline: clamp(14px, 2vw, 24px) !important;
        }

        .posts-hero,
        .posts-header,
        .posts-top-card {
          border-radius: 32px !important;
          padding: clamp(22px, 3vw, 34px) !important;
          margin-bottom: 18px !important;
          border: 1px solid rgba(255, 212, 59, 0.16) !important;
          background:
            radial-gradient(
              circle at top right,
              rgba(255, 212, 59, 0.12),
              transparent 34%
            ),
            rgba(15, 23, 42, 0.84) !important;
        }

        .posts-hero h1,
        .posts-header h1,
        .posts-top-card h1 {
          margin: 6px 0 10px !important;
          color: #ffffff !important;
          font-size: clamp(2.35rem, 5vw, 4.2rem) !important;
          line-height: 0.92 !important;
          letter-spacing: -0.06em !important;
        }

        .posts-hero p,
        .posts-header p,
        .posts-top-card p {
          max-width: 760px !important;
          color: rgba(248, 250, 252, 0.72) !important;
          line-height: 1.55 !important;
        }

        .posts-layout,
        .posts-grid,
        .posts-main-layout {
          gap: clamp(16px, 2.2vw, 24px) !important;
          align-items: start !important;
        }

        .posts-card,
        .posts-panel,
        .posts-week-card,
        .posts-detail-card,
        .posts-empty-card {
          border-radius: 28px !important;
          padding: clamp(18px, 2.4vw, 26px) !important;
          border: 1px solid rgba(255, 255, 255, 0.09) !important;
          background:
            radial-gradient(
              circle at top right,
              rgba(255, 212, 59, 0.055),
              transparent 34%
            ),
            rgba(15, 23, 42, 0.82) !important;
        }

        .posts-card + .posts-card,
        .posts-panel + .posts-panel,
        .posts-week-card + .posts-week-card {
          margin-top: 14px !important;
        }

        .posts-controls,
        .posts-toolbar,
        .posts-filter-row,
        .posts-actions,
        .posts-button-row,
        .posts-card-actions {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 10px !important;
        }

        .posts-controls,
        .posts-toolbar,
        .posts-filter-row {
          margin-bottom: 16px !important;
        }

        .posts-controls select,
        .posts-controls input,
        .posts-toolbar select,
        .posts-toolbar input,
        .posts-filter-row select,
        .posts-filter-row input,
        .posts-card select,
        .posts-card input,
        .posts-card textarea,
        .posts-panel select,
        .posts-panel input,
        .posts-panel textarea {
          min-height: 44px !important;
          border-radius: 15px !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          background: rgba(2, 6, 23, 0.42) !important;
          color: #ffffff !important;
          padding: 0 13px !important;
          outline: none !important;
        }

        .posts-card textarea,
        .posts-panel textarea {
          min-height: 120px !important;
          padding-block: 12px !important;
          line-height: 1.45 !important;
          resize: vertical !important;
        }

        .posts-controls select:focus,
        .posts-controls input:focus,
        .posts-toolbar select:focus,
        .posts-toolbar input:focus,
        .posts-card select:focus,
        .posts-card input:focus,
        .posts-card textarea:focus,
        .posts-panel select:focus,
        .posts-panel input:focus,
        .posts-panel textarea:focus {
          border-color: rgba(255, 212, 59, 0.46) !important;
          box-shadow: 0 0 0 3px rgba(255, 212, 59, 0.1) !important;
        }

        .posts-card label,
        .posts-panel label {
          color: rgba(248, 250, 252, 0.76) !important;
          font-size: 0.78rem !important;
          font-weight: 950 !important;
          letter-spacing: 0.05em !important;
          text-transform: uppercase !important;
        }

        .posts-list,
        .posts-queue,
        .weekly-queue,
        .weekly-post-list {
          display: grid !important;
          gap: 14px !important;
        }

        .post-card,
        .posts-post-card,
        .weekly-post-card,
        .queue-post-card {
          border-radius: 24px !important;
          padding: 16px !important;
          border: 1px solid rgba(255, 255, 255, 0.09) !important;
          background: rgba(2, 6, 23, 0.32) !important;
          overflow: hidden !important;
        }

        .post-card:hover,
        .posts-post-card:hover,
        .weekly-post-card:hover,
        .queue-post-card:hover {
          border-color: rgba(255, 212, 59, 0.18) !important;
          background: rgba(2, 6, 23, 0.42) !important;
        }

        .post-card h2,
        .post-card h3,
        .posts-post-card h2,
        .posts-post-card h3,
        .weekly-post-card h2,
        .weekly-post-card h3,
        .queue-post-card h2,
        .queue-post-card h3 {
          margin: 8px 0 8px !important;
          color: #ffffff !important;
          font-size: clamp(1.1rem, 2vw, 1.35rem) !important;
          line-height: 1.12 !important;
          letter-spacing: -0.035em !important;
        }

        .post-card p,
        .posts-post-card p,
        .weekly-post-card p,
        .queue-post-card p {
          color: rgba(248, 250, 252, 0.67) !important;
          line-height: 1.48 !important;
        }

        .post-status,
        .posts-status,
        .status-pill,
        .weekly-status-pill {
          min-height: 28px !important;
          display: inline-flex !important;
          align-items: center !important;
          width: fit-content !important;
          padding: 0 10px !important;
          border-radius: 999px !important;
          font-size: 0.72rem !important;
          font-weight: 1000 !important;
          letter-spacing: 0.06em !important;
          text-transform: uppercase !important;
        }

        .is-posted,
        .status-posted {
          background: rgba(34, 197, 94, 0.14) !important;
          color: #bbf7d0 !important;
          border-color: rgba(34, 197, 94, 0.28) !important;
        }

        .is-scheduled,
        .status-scheduled {
          background: rgba(59, 130, 246, 0.13) !important;
          color: #bfdbfe !important;
          border-color: rgba(59, 130, 246, 0.28) !important;
        }

        .is-failed,
        .status-failed {
          background: rgba(248, 113, 113, 0.13) !important;
          color: #fecaca !important;
          border-color: rgba(248, 113, 113, 0.28) !important;
        }

        .is-ready,
        .status-ready {
          background: rgba(255, 212, 59, 0.13) !important;
          color: #ffe58a !important;
          border-color: rgba(255, 212, 59, 0.24) !important;
        }

        .posts-media-preview,
        .post-media,
        .weekly-post-media,
        .queue-post-media {
          border-radius: 18px !important;
          overflow: hidden !important;
          background: rgba(2, 6, 23, 0.72) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .posts-media-preview img,
        .posts-media-preview video,
        .post-media img,
        .post-media video,
        .weekly-post-media img,
        .weekly-post-media video,
        .queue-post-media img,
        .queue-post-media video {
          width: 100% !important;
          max-height: 260px !important;
          object-fit: contain !important;
          background: #020617 !important;
        }

        .posts-btn,
        .posts-card button,
        .posts-panel button,
        .posts-toolbar button,
        .posts-actions button,
        .post-card button,
        .posts-post-card button,
        .weekly-post-card button,
        .queue-post-card button {
          min-height: 42px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          padding: 0 14px !important;
          border-radius: 15px !important;
          font-family: inherit !important;
          font-weight: 950 !important;
          line-height: 1 !important;
          text-decoration: none !important;
          cursor: pointer !important;
          appearance: none !important;
        }

        .posts-btn-primary,
        .posts-card button.posts-btn-primary,
        .posts-panel button.posts-btn-primary,
        .post-card button.posts-btn-primary,
        .weekly-post-card button.posts-btn-primary,
        .queue-post-card button.posts-btn-primary {
          background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
          color: #101420 !important;
          border: 1px solid rgba(255, 212, 59, 0.5) !important;
          box-shadow: 0 12px 28px rgba(255, 212, 59, 0.13) !important;
        }

        .posts-btn-secondary,
        .posts-btn-ghost,
        .posts-card button:not(.posts-btn-primary),
        .posts-panel button:not(.posts-btn-primary),
        .posts-toolbar button:not(.posts-btn-primary),
        .post-card button:not(.posts-btn-primary),
        .weekly-post-card button:not(.posts-btn-primary),
        .queue-post-card button:not(.posts-btn-primary) {
          background: rgba(255, 255, 255, 0.075) !important;
          color: rgba(248, 250, 252, 0.93) !important;
          border: 1px solid rgba(255, 255, 255, 0.13) !important;
          box-shadow: none !important;
        }

        .posts-btn-danger,
        .posts-card button.posts-btn-danger,
        .posts-panel button.posts-btn-danger,
        .post-card button.posts-btn-danger {
          background: rgba(248, 113, 113, 0.12) !important;
          color: #fecaca !important;
          border-color: rgba(248, 113, 113, 0.28) !important;
        }

        .posts-card button:disabled,
        .posts-panel button:disabled,
        .posts-toolbar button:disabled,
        .post-card button:disabled,
        .weekly-post-card button:disabled,
        .queue-post-card button:disabled {
          opacity: 0.62 !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
        }

        .posts-empty-state,
        .posts-empty-card {
          text-align: center !important;
          padding: clamp(26px, 4vw, 44px) !important;
        }

        .posts-empty-state h2,
        .posts-empty-card h2 {
          color: #ffffff !important;
          font-size: clamp(1.65rem, 3vw, 2.45rem) !important;
          line-height: 1 !important;
          letter-spacing: -0.05em !important;
        }

        .posts-empty-state p,
        .posts-empty-card p {
          max-width: 620px !important;
          margin-inline: auto !important;
        }

        .posts-modal,
        .posts-dialog,
        .confirm-dialog,
        .review-modal {
          border-radius: 28px !important;
        }

        .posts-modal button,
        .posts-dialog button,
        .confirm-dialog button,
        .review-modal button {
          min-height: 44px !important;
          border-radius: 15px !important;
          font-weight: 950 !important;
        }

        @media (max-width: 980px) {
          .posts-layout,
          .posts-grid,
          .posts-main-layout {
            grid-template-columns: 1fr !important;
          }

          .posts-controls,
          .posts-toolbar,
          .posts-filter-row {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .posts-controls select,
          .posts-controls input,
          .posts-toolbar select,
          .posts-toolbar input,
          .posts-filter-row select,
          .posts-filter-row input {
            width: 100% !important;
          }
        }

        @media (max-width: 640px) {
          .posts-shell,
          .posts-wrap {
            padding-inline: 12px !important;
          }

          .posts-hero,
          .posts-header,
          .posts-top-card,
          .posts-card,
          .posts-panel,
          .posts-week-card,
          .posts-detail-card {
            border-radius: 24px !important;
            padding: 17px !important;
          }

          .posts-hero h1,
          .posts-header h1,
          .posts-top-card h1 {
            font-size: 2.35rem !important;
          }

          .posts-actions,
          .posts-button-row,
          .posts-card-actions,
          .posts-card button,
          .posts-panel button,
          .post-card button,
          .weekly-post-card button,
          .queue-post-card button {
            width: 100% !important;
          }

          .posts-actions,
          .posts-button-row,
          .posts-card-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .posts-media-preview img,
          .posts-media-preview video,
          .post-media img,
          .post-media video,
          .weekly-post-media img,
          .weekly-post-media video,
          .queue-post-media img,
          .queue-post-media video {
            max-height: 230px !important;
          }
        }

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

        /* Final posts onboarding polish */
        .posts-onboarding-helper-card {
          margin: 0 0 22px !important;
          padding: clamp(20px, 3vw, 28px) !important;
          border-radius: 28px !important;
          border: 1px solid rgba(255, 212, 59, 0.16) !important;
          background:
            radial-gradient(
              circle at top right,
              rgba(255, 212, 59, 0.08),
              transparent 34%
            ),
            rgba(15, 23, 42, 0.84) !important;
          box-shadow: 0 22px 66px rgba(0, 0, 0, 0.2) !important;
        }

        .posts-onboarding-helper-card h2 {
          margin: 8px 0 10px !important;
          color: #ffffff !important;
          font-size: clamp(1.7rem, 3vw, 2.6rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.055em !important;
        }

        .posts-onboarding-helper-card p {
          max-width: 780px !important;
          margin: 0 !important;
          color: rgba(248, 250, 252, 0.72) !important;
          line-height: 1.58 !important;
          font-weight: 760 !important;
        }

        .fromone-premium-calendar-media-frame {
          border-radius: 20px 20px 0 0 !important;
        }

        @media (max-width: 640px) {
          .posts-onboarding-helper-card {
            border-radius: 24px !important;
          }

          .posts-onboarding-helper-card p {
            font-size: 0.92rem !important;
          }
        }

        /* Final posts true mobile centering */
        .posts-weekly-card-grid {
          justify-content: center !important;
          justify-items: center !important;
          width: 100% !important;
        }

        @media (max-width: 760px) {
          .posts-weekly-review-section {
            width: min(100%, calc(100vw - 24px)) !important;
            max-width: calc(100vw - 24px) !important;
            margin-left: auto !important;
            margin-right: auto !important;
            padding-left: 18px !important;
            padding-right: 18px !important;
            text-align: center !important;
            justify-items: center !important;
            overflow: hidden !important;
          }

          .posts-weekly-review-section > div:first-child {
            justify-content: center !important;
            justify-items: center !important;
            text-align: center !important;
          }

          .posts-weekly-review-section > div:first-child > div {
            width: 100% !important;
            text-align: center !important;
          }

          .posts-weekly-review-section .page-eyebrow,
          .posts-weekly-review-section h2,
          .posts-weekly-review-section p {
            text-align: center !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .posts-weekly-card-grid {
            grid-template-columns: minmax(0, min(100%, 380px)) !important;
            justify-content: center !important;
            justify-items: center !important;
            align-items: stretch !important;
            width: 100% !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .posts-weekly-card-grid .fromone-premium-calendar-review-card {
            width: 100% !important;
            max-width: 380px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            text-align: left !important;
          }
        }

        @media (max-width: 430px) {
          .posts-weekly-review-section {
            width: min(100%, calc(100vw - 20px)) !important;
            max-width: calc(100vw - 20px) !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .posts-weekly-card-grid {
            grid-template-columns: minmax(0, min(100%, 360px)) !important;
          }

          .posts-weekly-card-grid .fromone-premium-calendar-review-card {
            max-width: 360px !important;
          }
        }

        /* Upload-count review flow polish */
        .posts-upload-flow-helper-card {
          margin: 0 0 22px !important;
          padding: clamp(20px, 3vw, 28px) !important;
          border-radius: 28px !important;
          border: 1px solid rgba(255, 212, 59, 0.16) !important;
          background:
            radial-gradient(
              circle at top right,
              rgba(255, 212, 59, 0.08),
              transparent 34%
            ),
            rgba(15, 23, 42, 0.84) !important;
          box-shadow: 0 22px 66px rgba(0, 0, 0, 0.2) !important;
        }

        .posts-upload-flow-helper-card h2 {
          margin: 8px 0 10px !important;
          color: #ffffff !important;
          font-size: clamp(1.7rem, 3vw, 2.6rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.055em !important;
        }

        .posts-upload-flow-helper-card p {
          max-width: 780px !important;
          margin: 0 !important;
          color: rgba(248, 250, 252, 0.72) !important;
          line-height: 1.58 !important;
          font-weight: 760 !important;
        }

        .posts-created-from-upload-badge,
        .posts-suggested-time-badge {
          display: inline-flex !important;
          width: fit-content !important;
          min-height: 26px !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 10px !important;
          border-radius: 999px !important;
          font-size: 0.68rem !important;
          font-weight: 1000 !important;
          letter-spacing: 0.06em !important;
          text-transform: uppercase !important;
          line-height: 1 !important;
          margin: 4px 5px 0 0 !important;
        }

        .posts-created-from-upload-badge {
          background: rgba(255, 212, 59, 0.1) !important;
          border: 1px solid rgba(255, 212, 59, 0.18) !important;
          color: #ffe58a !important;
        }

        .posts-suggested-time-badge {
          background: rgba(255, 255, 255, 0.07) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: rgba(248, 250, 252, 0.76) !important;
        }

        @media (max-width: 640px) {
          .posts-upload-flow-helper-card {
            text-align: center !important;
            border-radius: 24px !important;
          }

          .posts-upload-flow-helper-card p {
            font-size: 0.92rem !important;
          }
        }
      `}</style>
    </div>
  );
}