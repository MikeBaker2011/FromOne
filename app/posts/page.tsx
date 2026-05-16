'use client';

import './posts.css';

import { CSSProperties, ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

import WeeklyPlanControls from '@/components/posts/WeeklyPlanControls';
import WeeklyQueue from '@/components/posts/WeeklyQueue';
import PostActionModal from '@/components/posts/PostActionModal';
import TodayReminderModal from '@/components/posts/TodayReminderModal';
import PostSuccessModal from '@/components/posts/PostSuccessModal';
import ReviewPromptModal from '@/components/posts/ReviewPromptModal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MEDIA_BUCKET = 'campaign-assets';
const MAX_SAVED_CAMPAIGNS = 4;

const POSTS_TOUR_SEEN_KEY = 'fromone_posts_tour_seen';
const REVIEW_PROMPT_DISMISSED_KEY = 'fromone_review_prompt_dismissed';
const REVIEW_PROMPT_SUBMITTED_KEY = 'fromone_review_prompt_submitted';
const REVIEW_PROMPT_POSTED_COUNT_KEY = 'fromone_review_prompt_posted_count';
const REVIEW_PROMPT_TRIGGER_COUNT = 3;

type AccessInfo = {
  id: string;
  user_id: string;
  access_status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  extension_ends_at: string | null;
  subscription_status: string | null;
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

type PostStatus = 'Ready' | 'Reminder set' | 'Posted' | 'Failed';

const postsTourSteps = [
  {
    title: 'Choose today’s post',
    text: 'Start with the weekly queue. Pick the post you want to work on.',
    target: 'queue',
  },
  {
    title: 'Check the wording',
    text: 'Click a card to open the post window. Review the wording first.',
    target: 'post',
  },
  {
    title: 'Add media',
    text: 'Add an image or video when the post needs one.',
    target: 'media',
  },
  {
    title: 'Publish',
    text: 'Publish to Facebook directly, or copy and open the platform when direct publishing is not ready yet.',
    target: 'publish',
  },
];

const quickImproveActions = [
  { value: 'make_shorter', label: 'Make shorter' },
  { value: 'make_more_local', label: 'More local' },
  { value: 'make_sales_focused', label: 'More sales-focused' },
  { value: 'make_less_generic', label: 'Less generic' },
  { value: 'different_version', label: 'Different version' },
];

const defaultAudienceTargets = [
  'Local customers',
  'Small business owners',
  'Busy professionals',
  'Families',
  'Homeowners',
  'New customers',
  'Returning customers',
  'Custom audience',
];

const toneOptions = [
  'Use current tone',
  'More friendly',
  'More professional',
  'More premium',
  'More direct',
  'More fun',
  'More trustworthy',
];

const industryAudienceTargets: Record<string, string[]> = {
  plumbing: [
    'Homeowners',
    'Landlords',
    'Property managers',
    'Letting agents',
    'Small business owners',
    'Emergency callout customers',
    'Custom audience',
  ],
  electrician: [
    'Homeowners',
    'Landlords',
    'Property managers',
    'Small business owners',
    'Emergency repair customers',
    'New homeowners',
    'Custom audience',
  ],
  roofing: [
    'Homeowners',
    'Landlords',
    'Property managers',
    'Commercial property owners',
    'Storm damage customers',
    'Home sellers',
    'Custom audience',
  ],
  signage: [
    'Small business owners',
    'Retail shops',
    'Construction companies',
    'Estate agents',
    'Event organisers',
    'Local tradespeople',
    'Custom audience',
  ],
  print: [
    'Small business owners',
    'Event organisers',
    'Retail shops',
    'Startups',
    'Local organisations',
    'Marketing managers',
    'Custom audience',
  ],
  beauty: [
    'Local shoppers',
    'Brides',
    'Busy professionals',
    'Luxury buyers',
    'Regular clients',
    'New clients',
    'Custom audience',
  ],
  hair: [
    'Local clients',
    'Brides',
    'Busy professionals',
    'Regular clients',
    'New clients',
    'Style-conscious customers',
    'Custom audience',
  ],
  fitness: [
    'Beginners',
    'Busy professionals',
    'Parents',
    'Weight loss clients',
    'Strength training clients',
    'Local residents',
    'Custom audience',
  ],
  restaurant: [
    'Local diners',
    'Families',
    'Couples',
    'Office workers',
    'Weekend customers',
    'Event bookings',
    'Custom audience',
  ],
  cafe: [
    'Local shoppers',
    'Office workers',
    'Students',
    'Remote workers',
    'Families',
    'Weekend customers',
    'Custom audience',
  ],
  estate: [
    'First-time buyers',
    'Homeowners',
    'Landlords',
    'Property investors',
    'Sellers',
    'Tenants',
    'Custom audience',
  ],
  property: [
    'First-time buyers',
    'Homeowners',
    'Landlords',
    'Property investors',
    'Sellers',
    'Tenants',
    'Custom audience',
  ],
  ecommerce: [
    'Online shoppers',
    'Gift buyers',
    'Returning customers',
    'Deal seekers',
    'Luxury buyers',
    'New customers',
    'Custom audience',
  ],
  accounting: [
    'Small business owners',
    'Sole traders',
    'Startups',
    'Limited company directors',
    'Self-employed professionals',
    'Landlords',
    'Custom audience',
  ],
  legal: [
    'Small business owners',
    'Families',
    'Homeowners',
    'Landlords',
    'Employers',
    'People needing advice',
    'Custom audience',
  ],
  dental: [
    'Families',
    'Nervous patients',
    'New patients',
    'Cosmetic dentistry clients',
    'Parents',
    'Local residents',
    'Custom audience',
  ],
  mechanic: [
    'Car owners',
    'Fleet owners',
    'Commuters',
    'Families',
    'Local drivers',
    'Van owners',
    'Custom audience',
  ],
  garage: [
    'Car owners',
    'Fleet owners',
    'Commuters',
    'Families',
    'Local drivers',
    'Van owners',
    'Custom audience',
  ],
};

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [pendingCampaignId, setPendingCampaignId] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingSelectedPlan, setLoadingSelectedPlan] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [renamingCampaign, setRenamingCampaign] = useState(false);

  const [accessLocked, setAccessLocked] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');

  const [audienceTarget, setAudienceTarget] = useState('Local customers');
  const [customAudienceTarget, setCustomAudienceTarget] = useState('');
  const [toneTarget, setToneTarget] = useState('Use current tone');
  const [rewritingPost, setRewritingPost] = useState(false);
  const [rewritingAction, setRewritingAction] = useState('');
  const [improvementNote, setImprovementNote] = useState<ImprovementNote | null>(null);
  const [showImproveTools, setShowImproveTools] = useState(false);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [uploadingMediaPostId, setUploadingMediaPostId] = useState<string | null>(null);
  const [removingMediaPostId, setRemovingMediaPostId] = useState<string | null>(null);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [savingReminderPostId, setSavingReminderPostId] = useState<string | null>(null);
  const [reminderValue, setReminderValue] = useState('');

  const [showTodayReminder, setShowTodayReminder] = useState(false);
  const [todayReminderPostId, setTodayReminderPostId] = useState<string | null>(null);
  const [successMoment, setSuccessMoment] = useState<SuccessMoment | null>(null);

  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const [showPostsTour, setShowPostsTour] = useState(false);
  const [postsTourStep, setPostsTourStep] = useState(0);
  const [postsTourRect, setPostsTourRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const queueRef = useRef<HTMLDivElement | null>(null);
  const postRef = useRef<HTMLElement | null>(null);
  const mediaRef = useRef<HTMLElement | null>(null);
  const publishRef = useRef<HTMLElement | null>(null);

  function sortPostsByDate(items: any[]) {
    return [...items].sort((firstPost, secondPost) => {
      const firstTime = firstPost.scheduled_at ? new Date(firstPost.scheduled_at).getTime() : 0;
      const secondTime = secondPost.scheduled_at ? new Date(secondPost.scheduled_at).getTime() : 0;
      return firstTime - secondTime;
    });
  }

  function isPostPosted(post: any) {
    return (
      post?.is_posted === true ||
      String(post?.status || '').toLowerCase() === 'posted' ||
      String(post?.publish_status || '').toLowerCase() === 'posted'
    );
  }

  function isPostFailed(post: any) {
    return String(post?.publish_status || '').toLowerCase() === 'failed';
  }

  function isPostReminderSet(post: any) {
    if (isPostPosted(post)) return false;
    if (isPostFailed(post)) return false;

    return (
      Boolean(post?.scheduled_publish_at) ||
      String(post?.status || '').toLowerCase() === 'scheduled' ||
      String(post?.publish_status || '').toLowerCase() === 'scheduled'
    );
  }

  function getPostStatus(post: any): PostStatus {
    if (isPostFailed(post)) return 'Failed';
    if (isPostPosted(post)) return 'Posted';
    if (isPostReminderSet(post)) return 'Reminder set';
    return 'Ready';
  }

  function getStatusClass(status: PostStatus) {
    if (status === 'Posted') return 'is-posted';
    if (status === 'Reminder set') return 'is-scheduled';
    if (status === 'Failed') return 'is-failed';
    return 'is-ready';
  }

  const sortedPosts = useMemo(() => sortPostsByDate(posts), [posts]);

  const selectedPost = useMemo(() => {
    if (!selectedPostId) return null;
    return sortedPosts.find((post) => post.id === selectedPostId) || null;
  }, [selectedPostId, sortedPosts]);

  const activePostForEditing = useMemo(() => {
    if (!editingPostId) return null;
    return sortedPosts.find((post) => post.id === editingPostId) || null;
  }, [editingPostId, sortedPosts]);

  useEffect(() => {
    loadPageData();

    const tourSeen = localStorage.getItem(POSTS_TOUR_SEEN_KEY) === 'true';
    const isMobile = window.innerWidth <= 760;

    if (!tourSeen && !isMobile) {
      setShowPostsTour(true);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading || posts.length === 0) return;

    const todayUnpostedPost = posts.find(
      (post) => isPostScheduledToday(post) && !isPostPosted(post)
    );

    if (!todayUnpostedPost) return;

    const storageKey = getTodayReminderStorageKey();

    if (localStorage.getItem(storageKey) === 'true') return;

    localStorage.setItem(storageKey, 'true');
    setTodayReminderPostId(todayUnpostedPost.id);
    setShowTodayReminder(true);
  }, [loading, posts]);

  useEffect(() => {
    if (!selectedPost) {
      setReminderValue('');
      return;
    }

    setReminderValue(toDateTimeInputValue(selectedPost.scheduled_publish_at || ''));
  }, [selectedPost]);

  useEffect(() => {
    if (!showPostsTour || loading) return;

    const target = getCurrentPostsTourTarget();

    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }

    const timer = window.setTimeout(() => {
      updatePostsTourRect();
    }, 420);

    window.addEventListener('resize', updatePostsTourRect);
    window.addEventListener('scroll', updatePostsTourRect, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updatePostsTourRect);
      window.removeEventListener('scroll', updatePostsTourRect, true);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPostsTour, postsTourStep, loading, selectedPostId, posts.length]);

  const getTodayKey = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayReminderStorageKey = () => {
    return `fromone_today_post_alert_${getTodayKey()}`;
  };

  const shouldOpenTodayPost = () => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('today') === 'true';
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
    return ['active', 'paid', 'trialing'].includes(String(status || '').toLowerCase());
  };

  const calculateAccess = (access: AccessInfo | null) => {
    if (!access) {
      return {
        locked: false,
        message: 'Demo access is being prepared.',
      };
    }

    if (isPaidSubscription(access.subscription_status)) {
      return {
        locked: false,
        message: 'Subscription active.',
      };
    }

    if (isFutureDate(access.extension_ends_at)) {
      const date = new Date(access.extension_ends_at as string).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      return {
        locked: false,
        message: `Manual extension active until ${date}.`,
      };
    }

    if (isFutureDate(access.trial_ends_at)) {
      const date = new Date(access.trial_ends_at as string).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      return {
        locked: false,
        message: `Demo active until ${date}.`,
      };
    }

    return {
      locked: true,
      message:
        'Your 7-day demo has ended. You can still view and publish existing posts, but editing, media upload, and improving posts are locked until access is extended or a subscription is active.',
    };
  };

  const getReadableError = (error: any, fallback = 'Something went wrong.') => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;

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

  const loadAccess = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth session error:', authError.message);
      setAccessLocked(false);
      setAccessMessage('Please sign in again.');
      return;
    }

    const userId = authData.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_access')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading user access:', error.message);
      setAccessLocked(false);
      setAccessMessage('Access check unavailable.');
      return;
    }

    const calculated = calculateAccess((data || null) as AccessInfo | null);
    setAccessLocked(calculated.locked);
    setAccessMessage(calculated.message);
  };

  const loadPageData = async () => {
    setLoading(true);

    const loadedCampaigns = await loadCampaigns();

    const activeCampaign =
      loadedCampaigns.find((item) => item.id === selectedCampaignId) ||
      loadedCampaigns[0] ||
      null;

    setCampaign(activeCampaign);
    setSelectedCampaignId(activeCampaign?.id || null);
    setPendingCampaignId(activeCampaign?.id || '');

    await Promise.all([loadPosts(activeCampaign?.id || null), loadProfile(), loadAccess()]);

    setLoading(false);
  };

  const loadCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading weekly plans:', error.message);
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
      .from('business_profiles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading business details:', error.message);
      setProfile(null);
      return;
    }

    setProfile(data);
  };

  const loadPosts = async (campaignId?: string | null) => {
    if (!campaignId) {
      setPosts([]);
      setSelectedPostId(null);
      return;
    }

    const { data, error } = await supabase
      .from('campaign_posts')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error loading posts:', error.message);
      setPosts([]);
      setSelectedPostId(null);
      return;
    }

    const loadedPosts = sortPostsByDate(data || []);
    setPosts(loadedPosts);

    if (loadedPosts.length === 0) {
      setSelectedPostId(null);
      return;
    }

    const todayUnpostedPost = loadedPosts.find(
      (post) => isPostScheduledToday(post) && !isPostPosted(post)
    );

    if (shouldOpenTodayPost() && todayUnpostedPost) {
      setSelectedPostId(todayUnpostedPost.id);
      return;
    }

    setSelectedPostId(null);
  };

  const businessName =
    profile?.business_name ||
    campaign?.business_name ||
    selectedPost?.business_name ||
    'Your business';

  const activeIndustry = String(
    profile?.industry || campaign?.business_type || campaign?.industry || ''
  ).toLowerCase();

  const dynamicAudienceTargets = useMemo(() => {
    const matchedKey = Object.keys(industryAudienceTargets).find((key) =>
      activeIndustry.includes(key)
    );

    return matchedKey ? industryAudienceTargets[matchedKey] : defaultAudienceTargets;
  }, [activeIndustry]);

  useEffect(() => {
    if (!dynamicAudienceTargets.includes(audienceTarget)) {
      setAudienceTarget(dynamicAudienceTargets[0] || 'Custom audience');
    }
  }, [dynamicAudienceTargets, audienceTarget]);

  const postedCount = posts.filter((post) => isPostPosted(post)).length;
  const postsLeftThisWeek = Math.max((posts.length || 0) - postedCount, 0);
  const weeklyProgressPercent =
    posts.length > 0 ? Math.round((postedCount / posts.length) * 100) : 0;

  const todayReminderPost = posts.find((post) => post.id === todayReminderPostId) || null;

  const activeImprovementNote =
    selectedPost && improvementNote?.postId === selectedPost.id ? improvementNote : null;

  const brandPrimary = profile?.brand_primary_color || '#ffd43b';
  const brandSecondary = profile?.brand_secondary_color || '#101420';
  const brandAccent = profile?.brand_accent_color || '#3ddc97';

  const brandStyle = {
    '--client-primary': brandPrimary,
    '--client-secondary': brandSecondary,
    '--client-accent': brandAccent,
  } as CSSProperties;

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
      alert('Please choose a weekly plan first.');
      return;
    }

    setLoadingSelectedPlan(true);

    try {
      await switchCampaign(pendingCampaignId);
    } finally {
      setLoadingSelectedPlan(false);
    }
  };

  const renameSelectedCampaign = async () => {
    if (!campaign?.id) {
      alert('No weekly plan selected.');
      return;
    }

    const currentName = campaign.name || campaign.campaign_idea || 'Untitled weekly plan';
    const newName = prompt('Rename weekly plan:', currentName);

    if (newName === null) return;

    const cleanName = newName.trim();

    if (!cleanName) {
      alert('Weekly plan name cannot be empty.');
      return;
    }

    setRenamingCampaign(true);

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ name: cleanName })
        .eq('id', campaign.id);

      if (error) {
        alert(error.message);
        return;
      }

      setCampaign({ ...campaign, name: cleanName });

      setCampaigns((currentCampaigns) =>
        currentCampaigns.map((item) =>
          item.id === campaign.id ? { ...item, name: cleanName } : item
        )
      );

      alert('Weekly plan renamed.');
    } catch (error: any) {
      const message = getReadableError(error, 'Error renaming weekly plan.');
      console.error('Rename weekly plan error:', error);
      alert(message);
    } finally {
      setRenamingCampaign(false);
    }
  };

  const deleteSelectedCampaign = async () => {
    if (!campaign?.id) {
      alert('No weekly plan selected.');
      return;
    }

    const campaignName = campaign.name || campaign.campaign_idea || 'Selected weekly plan';

    const confirmed = confirm(
      `Delete this weekly plan and all its posts?\n\n${campaignName}\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingCampaign(true);

    try {
      const campaignIdToDelete = campaign.id;

      const { data: campaignPosts, error: postsLoadError } = await supabase
        .from('campaign_posts')
        .select('id, image_path, media_path')
        .eq('campaign_id', campaignIdToDelete);

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
          console.error('Weekly plan media delete error:', storageError.message);
        }
      }

      const { error: campaignDeleteError } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignIdToDelete);

      if (campaignDeleteError) {
        alert(campaignDeleteError.message);
        return;
      }

      setSelectedCampaignId(null);
      setPendingCampaignId('');
      setCampaign(null);
      setPosts([]);
      setSelectedPostId(null);
      setImprovementNote(null);
      setShowImproveTools(false);
      cancelEditingPost();

      alert('Weekly plan deleted.');
      await loadPageData();
    } catch (error: any) {
      const message = getReadableError(error, 'Error deleting weekly plan.');
      console.error('Delete weekly plan error:', error);
      alert(message);
    } finally {
      setDeletingCampaign(false);
    }
  };

  const cleanCampaignLabel = (value: any) => {
    const raw = String(value || '').trim();

    return (
      raw
        .replace(/\s+—\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}(?:\s+\d{1,2}:\d{2})?(?:\s+—.*)?$/g, '')
        .replace(/\s+-\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}.*$/g, '')
        .replace(/\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}(?:\s+\d{1,2}:\d{2})?$/g, '')
        .trim() || 'Weekly plan'
    );
  };

  const getCampaignOptionLabel = (item: any) => {
    const label =
      item.name ||
      item.business_name ||
      item.business_type ||
      item.campaign_area ||
      item.campaign_idea ||
      'Weekly plan';

    return cleanCampaignLabel(label);
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
      weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
      day: date.toLocaleDateString(undefined, { day: '2-digit' }),
      month: date.toLocaleDateString(undefined, { month: 'short' }),
    };
  };

  const getPostPositionLabel = (post: any) => {
    const index = sortedPosts.findIndex((item) => item.id === post?.id);
    return index >= 0 ? `Day ${index + 1}` : post?.scheduled_day || 'Day';
  };

  const hashtagsToString = (hashtags: any) => {
    if (Array.isArray(hashtags)) return hashtags.join(' ');
    if (typeof hashtags === 'string') return hashtags;
    return '';
  };

  const stringToHashtags = (value: string) => {
    return value
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => (item.startsWith('#') ? item : `#${item}`));
  };

  const buildPostText = (post: any) => {
    const caption = post?.caption || '';
    const cta = post?.cta ? `CTA: ${post.cta}` : '';
    const hashtags = Array.isArray(post?.hashtags) ? post.hashtags.join(' ') : '';

    return [caption, cta, hashtags].filter(Boolean).join('\n\n').trim();
  };

  const copyPost = async (post: any) => {
    const textToCopy = buildPostText(post);

    if (!textToCopy) {
      alert('There is no post text to copy yet.');
      return;
    }

    await navigator.clipboard.writeText(textToCopy);
    alert('Post copied.');
  };

  const getImageGuidance = (post: any) => {
    if (post?.image_prompt?.trim()) {
      return post.image_prompt.trim();
    }

    const platform = String(post?.platform || '').toLowerCase();

    if (
      platform.includes('instagram') ||
      platform.includes('tiktok') ||
      platform.includes('pinterest') ||
      platform.includes('shorts')
    ) {
      return 'Use a clear image or video that matches the post: finished work, product detail, team moment, venue, customer result, or behind-the-scenes clip.';
    }

    return 'Choose a clear photo or short video that supports the post, such as your work, product, team, premises, or a customer result.';
  };

  const mediaRequiredForPlatform = (platform?: string) => {
    const cleanPlatform = String(platform || '').toLowerCase();

    return (
      cleanPlatform.includes('instagram') ||
      cleanPlatform.includes('tiktok') ||
      cleanPlatform.includes('pinterest') ||
      cleanPlatform.includes('shorts')
    );
  };

  const getPlatformUrl = (platform: string) => {
    const cleanPlatform = String(platform || '').toLowerCase();

    if (cleanPlatform.includes('facebook')) return 'https://www.facebook.com';
    if (cleanPlatform.includes('instagram')) return 'https://www.instagram.com';
    if (cleanPlatform.includes('google')) return 'https://business.google.com';
    if (cleanPlatform.includes('pinterest')) return 'https://www.pinterest.com';
    if (cleanPlatform.includes('linkedin')) return 'https://www.linkedin.com';
    if (cleanPlatform.includes('tiktok')) return 'https://www.tiktok.com';
    if (cleanPlatform.includes('youtube')) return 'https://www.youtube.com';
    if (cleanPlatform.includes('twitter') || cleanPlatform.includes('x')) return 'https://x.com';

    return 'https://www.google.com';
  };

  const openPlatform = (platform: string) => {
    window.open(getPlatformUrl(platform), '_blank');
  };

  const getPlatformDisplayName = (post: any) => {
    return post?.platform || 'Facebook';
  };

  const canDirectPublishToFacebook = (post: any) => {
    return String(post?.platform || '').toLowerCase().includes('facebook');
  };

  const getMediaKind = (file: File) => {
    if (file.type.startsWith('video/')) return 'video';
    return 'image';
  };

  const getSafeFileName = (fileName: string) => {
    const cleanName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return cleanName || 'media';
  };

  const uploadMedia = async (post: any, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file || !post?.id) return;

    if (!ensureAccessAllowed()) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please upload an image or video file.');
      return;
    }

    setUploadingMediaPostId(post.id);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const userId = authData.user?.id || 'anonymous';
      const mediaType = getMediaKind(file);
      const safeFileName = getSafeFileName(file.name);
      const path = `${userId}/posts/${post.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
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
        .from('campaign_posts')
        .update(updates)
        .eq('id', post.id);

      if (updateError) throw updateError;

      updatePostLocally(post.id, updates);
      alert(`${mediaType === 'video' ? 'Video' : 'Image'} added.`);
    } catch (error: any) {
      const message = getReadableError(error, 'Error uploading media.');
      console.error('Upload media error:', error);
      alert(message);
    } finally {
      setUploadingMediaPostId(null);
    }
  };

  const removeMedia = async (post: any) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    const confirmed = confirm('Remove this media from the post?');

    if (!confirmed) return;

    setRemovingMediaPostId(post.id);

    try {
      if (post.media_path) {
        const { error: storageError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .remove([post.media_path]);

        if (storageError) {
          console.error('Remove media storage error:', storageError.message);
        }
      }

      const updates = {
        media_url: null,
        media_path: null,
        media_type: null,
      };

      const { error } = await supabase
        .from('campaign_posts')
        .update(updates)
        .eq('id', post.id);

      if (error) throw error;

      updatePostLocally(post.id, updates);
      alert('Media removed.');
    } catch (error: any) {
      const message = getReadableError(error, 'Error removing media.');
      console.error('Remove media error:', error);
      alert(message);
    } finally {
      setRemovingMediaPostId(null);
    }
  };

  const updatePostLocally = (postId: string, updates: any) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    );
  };

  const startEditingPost = (post: any) => {
    setEditingPostId(post.id);
    setEditCaption(post.caption || '');
    setEditCta(post.cta || '');
    setEditHashtags(hashtagsToString(post.hashtags));
  };

  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditCaption('');
    setEditCta('');
    setEditHashtags('');
  };

  const saveEditedPost = async () => {
    if (!activePostForEditing?.id) return;

    if (!ensureAccessAllowed()) return;

    if (!editCaption.trim()) {
      alert('Caption cannot be empty.');
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
        .from('campaign_posts')
        .update(updates)
        .eq('id', activePostForEditing.id);

      if (error) {
        alert(error.message);
        return;
      }

      updatePostLocally(activePostForEditing.id, updates);

      setImprovementNote({
        postId: activePostForEditing.id,
        label: 'Wording saved',
        detail: 'Review the updated post, then add media or publish when ready.',
      });

      cancelEditingPost();
      alert('Post updated.');
    } catch (error: any) {
      const message = getReadableError(error, 'Error saving post changes.');
      console.error('Save edited post error:', error);
      alert(message);
    } finally {
      setSavingEdit(false);
    }
  };

  const getToneForRewrite = () => {
    const currentTone = profile?.tone_of_voice || campaign?.tone || 'Professional';

    if (toneTarget === 'Use current tone') {
      return currentTone;
    }

    return `${currentTone}. Adjust this rewrite to be ${toneTarget.toLowerCase()}.`;
  };

  const applyRewrittenPost = async (
    post: any,
    rewritten: any,
    extraUpdates: Record<string, any> = {}
  ) => {
    const updates = {
      caption: rewritten.caption,
      cta: rewritten.cta,
      hashtags: Array.isArray(rewritten.hashtags) ? rewritten.hashtags : [],
      image_prompt: rewritten.image_prompt || post.image_prompt || '',
      ...extraUpdates,
    };

    const { error } = await supabase
      .from('campaign_posts')
      .update(updates)
      .eq('id', post.id);

    if (error) {
      alert(error.message);
      return false;
    }

    updatePostLocally(post.id, updates);

    if (editingPostId === post.id) {
      setEditCaption(updates.caption || '');
      setEditCta(updates.cta || '');
      setEditHashtags(hashtagsToString(updates.hashtags));
    }

    return true;
  };

  const handleRewriteForAudience = async (post: any) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    const finalAudience =
      audienceTarget === 'Custom audience'
        ? customAudienceTarget.trim()
        : audienceTarget.trim();

    if (!finalAudience) {
      alert('Please enter who this post is for.');
      return;
    }

    if (!post.caption?.trim()) {
      alert('This post needs a caption before it can be improved.');
      return;
    }

    setRewritingAction('audience');
    setRewritingPost(true);

    try {
      const response = await axios.post('/api/rewritePost', {
        provider: 'gemini',
        audienceTarget: finalAudience,
        tone: getToneForRewrite(),
        toneAdjustment: toneTarget,
        businessName: profile?.business_name || campaign?.business_name || 'the business',
        industry: profile?.industry || campaign?.business_type || 'general business',
        platform: post.platform || 'Facebook',
        caption: post.caption || '',
        cta: post.cta || '',
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        image_prompt: post.image_prompt || '',
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
          'Made the post more specific for the selected audience.',
      });
    } catch (error: any) {
      const message = getReadableError(error, 'Error improving post.');
      console.error('Make more specific error:', error);
      alert(message);
    } finally {
      setRewritingAction('');
      setRewritingPost(false);
    }
  };

  const handleQuickImprovePost = async (post: any, improvementAction: string) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    if (!post.caption?.trim()) {
      alert('This post needs a caption before it can be improved.');
      return;
    }

    const selectedAction = quickImproveActions.find((item) => item.value === improvementAction);
    const actionLabel = selectedAction?.label || 'Improve post';

    setRewritingAction(improvementAction);
    setRewritingPost(true);

    try {
      const response = await axios.post('/api/rewritePost', {
        provider: 'gemini',
        improvementAction,
        tone: getToneForRewrite(),
        businessName: profile?.business_name || campaign?.business_name || 'the business',
        industry: profile?.industry || campaign?.business_type || 'general business',
        platform: post.platform || 'Facebook',
        caption: post.caption || '',
        cta: post.cta || '',
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        image_prompt: post.image_prompt || '',
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
          'Review the updated post, then add media or publish when ready.',
      });
    } catch (error: any) {
      const message = getReadableError(error, 'Error improving post.');
      console.error('Improve post error:', error);
      alert(message);
    } finally {
      setRewritingAction('');
      setRewritingPost(false);
    }
  };

  const publishToFacebook = async (post: any) => {
    if (!post?.id) return;

    if (!canDirectPublishToFacebook(post)) {
      alert('Direct publishing is currently only available for Facebook.');
      return;
    }

    const text = buildPostText(post);

    if (!text) {
      alert('This post needs wording before it can be published.');
      return;
    }

    setPublishingPostId(post.id);

    try {
      const response = await axios.post('/api/facebook/publish', {
        postId: post.id,
        campaignPostId: post.id,
        campaign_id: post.campaign_id,
        platform: post.platform || 'Facebook',
        message: text,
        text,
        caption: post.caption || '',
        cta: post.cta || '',
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
        status: 'posted',
        publish_status: 'posted',
        publish_error: null,
        published_to: 'Facebook',
        published_at: new Date().toISOString(),
        facebook_post_id: facebookPostId,
      };

      await supabase.from('campaign_posts').update(updates).eq('id', post.id);

      updatePostLocally(post.id, updates);
      maybeShowReviewPrompt();

      const postIndex = sortedPosts.findIndex((item) => item.id === post.id);
      const updatedPosts = sortedPosts.map((item) =>
        item.id === post.id ? { ...item, ...updates } : item
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
    } catch (error: any) {
      const message = getReadableError(error, 'Facebook publishing failed.');

      const updates = {
        publish_status: 'failed',
        publish_error: message,
        status: 'failed',
      };

      await supabase.from('campaign_posts').update(updates).eq('id', post.id);
      updatePostLocally(post.id, updates);

      console.error('Facebook publish error:', error);
      alert(message);
    } finally {
      setPublishingPostId(null);
    }
  };

  const markAsPosted = async (postId: string) => {
    const postIndex = sortedPosts.findIndex((post) => post.id === postId);

    const updates = {
      is_posted: true,
      status: 'posted',
      publish_status: 'posted',
      publish_error: null,
      published_at: new Date().toISOString(),
    };

    const updatedPosts = sortedPosts.map((post) =>
      post.id === postId ? { ...post, ...updates } : post
    );

    const postsLeftAfterMarking = updatedPosts.filter((post) => !isPostPosted(post)).length;

    const nextPost =
      updatedPosts.slice(postIndex + 1).find((post) => !isPostPosted(post)) ||
      updatedPosts.find((post) => !isPostPosted(post)) ||
      null;

    const { error } = await supabase.from('campaign_posts').update(updates).eq('id', postId);

    if (error) {
      alert(error.message);
      return;
    }

    updatePostLocally(postId, updates);

    setSuccessMoment({
      postsLeft: postsLeftAfterMarking,
      nextPostId: nextPost?.id || null,
    });

    maybeShowReviewPrompt();
  };

  const markAsNotPosted = async (postId: string) => {
    const updates = {
      is_posted: false,
      status: 'ready',
      publish_status: null,
      publish_error: null,
      published_at: null,
      published_to: null,
      facebook_post_id: null,
    };

    const { error } = await supabase.from('campaign_posts').update(updates).eq('id', postId);

    if (error) {
      alert(error.message);
      return;
    }

    updatePostLocally(postId, updates);
  };

  const saveReminder = async (post: any) => {
    if (!post?.id) return;

    if (!reminderValue) {
      alert('Choose a date and time first.');
      return;
    }

    setSavingReminderPostId(post.id);

    try {
      const scheduledIso = new Date(reminderValue).toISOString();

      const updates = {
        scheduled_publish_at: scheduledIso,
        status: 'scheduled',
        publish_status: 'scheduled',
        publish_error: null,
        is_posted: false,
      };

      const { error } = await supabase
        .from('campaign_posts')
        .update(updates)
        .eq('id', post.id);

      if (error) throw error;

      updatePostLocally(post.id, updates);
      alert('Reminder time saved.');
    } catch (error: any) {
      const message = getReadableError(error, 'Error saving reminder time.');
      console.error('Save reminder error:', error);
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
        status: 'ready',
        publish_status: null,
        publish_error: null,
      };

      const { error } = await supabase
        .from('campaign_posts')
        .update(updates)
        .eq('id', post.id);

      if (error) throw error;

      updatePostLocally(post.id, updates);
      setReminderValue('');
      alert('Reminder removed.');
    } catch (error: any) {
      const message = getReadableError(error, 'Error clearing reminder.');
      console.error('Clear reminder error:', error);
      alert(message);
    } finally {
      setSavingReminderPostId(null);
    }
  };

  const toDateTimeInputValue = (value?: string | null) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(date.getTime() - offsetMs);

    return localDate.toISOString().slice(0, 16);
  };

  const getReadableDateTime = (value?: string | null) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const maybeShowReviewPrompt = () => {
    if (typeof window === 'undefined') return;

    const hasSubmitted = localStorage.getItem(REVIEW_PROMPT_SUBMITTED_KEY) === 'true';
    const hasDismissed = localStorage.getItem(REVIEW_PROMPT_DISMISSED_KEY) === 'true';

    if (hasSubmitted || hasDismissed) return;

    const currentCount = Number(localStorage.getItem(REVIEW_PROMPT_POSTED_COUNT_KEY) || '0');
    const nextCount = currentCount + 1;

    localStorage.setItem(REVIEW_PROMPT_POSTED_COUNT_KEY, String(nextCount));

    if (nextCount >= REVIEW_PROMPT_TRIGGER_COUNT) {
      setShowReviewPrompt(true);
    }
  };

  const submitReviewPrompt = async () => {
    if (!reviewText.trim()) {
      alert('Please write a short review.');
      return;
    }

    setSavingReview(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      if (!userId) {
        alert('Please sign in before leaving a review.');
        return;
      }

      const { error } = await supabase.from('user_reviews').insert({
        user_id: userId,
        rating: reviewRating,
        review_text: reviewText.trim(),
        status: 'new',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      localStorage.setItem(REVIEW_PROMPT_SUBMITTED_KEY, 'true');

      setShowReviewPrompt(false);
      setReviewRating(5);
      setReviewHoverRating(0);
      setReviewText('');

      alert('Thank you — your review has been sent.');
    } catch (error: any) {
      alert(error?.message || 'Error submitting review.');
    } finally {
      setSavingReview(false);
    }
  };

  const dismissReviewPrompt = () => {
    localStorage.setItem(REVIEW_PROMPT_DISMISSED_KEY, 'true');
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

  const closePostsTour = () => {
    localStorage.setItem(POSTS_TOUR_SEEN_KEY, 'true');
    setShowPostsTour(false);
    setPostsTourStep(0);
    setPostsTourRect(null);
  };

  const restartPostsTour = () => {
    setPostsTourStep(0);
    setPostsTourRect(null);
    setShowPostsTour(true);
  };

  const goToNextPostsTourStep = () => {
    const nextStep = postsTourStep + 1;

    if (postsTourStep >= postsTourSteps.length - 1) {
      closePostsTour();
      return;
    }

    if (nextStep > 0 && !selectedPost && sortedPosts[0]) {
      setSelectedPostId(sortedPosts[0].id);
    }

    setPostsTourStep(nextStep);
  };

  const goToPreviousPostsTourStep = () => {
    setPostsTourStep((currentStep) => Math.max(0, currentStep - 1));
  };

  const getCurrentPostsTourTarget = () => {
    const currentTarget = postsTourSteps[postsTourStep]?.target;

    if (currentTarget === 'queue') return queueRef.current;
    if (currentTarget === 'post') return postRef.current || queueRef.current;
    if (currentTarget === 'media') return mediaRef.current || postRef.current || queueRef.current;
    if (currentTarget === 'publish') return publishRef.current || postRef.current || queueRef.current;

    return null;
  };

  const updatePostsTourRect = () => {
    const target = getCurrentPostsTourTarget();

    if (!target) {
      setPostsTourRect(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    const padding = 10;

    setPostsTourRect({
      top: Math.max(rect.top - padding, 12),
      left: Math.max(rect.left - padding, 12),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });
  };

  const getPostsTourTooltipStyle = () => {
    if (!postsTourRect || typeof window === 'undefined') return {};

    if (window.innerWidth <= 760) {
      const mobilePadding = 12;
      const mobileCardWidth = window.innerWidth - mobilePadding * 2;

      return {
        left: `${mobilePadding}px`,
        right: `${mobilePadding}px`,
        bottom: '14px',
        width: `${mobileCardWidth}px`,
        top: 'auto',
      };
    }

    const cardWidth = 420;
    const estimatedCardHeight = 300;
    const gap = 42;
    const safePadding = 26;

    const spaceBelow = window.innerHeight - (postsTourRect.top + postsTourRect.height);
    const spaceAbove = postsTourRect.top;
    const spaceRight = window.innerWidth - (postsTourRect.left + postsTourRect.width);
    const spaceLeft = postsTourRect.left;

    let top = postsTourRect.top + postsTourRect.height + gap;
    let left = postsTourRect.left + postsTourRect.width / 2 - cardWidth / 2;

    if (spaceBelow >= estimatedCardHeight + gap) {
      top = postsTourRect.top + postsTourRect.height + gap;
      left = postsTourRect.left + postsTourRect.width / 2 - cardWidth / 2;
    } else if (spaceAbove >= estimatedCardHeight + gap) {
      top = postsTourRect.top - estimatedCardHeight - gap;
      left = postsTourRect.left + postsTourRect.width / 2 - cardWidth / 2;
    } else if (spaceRight >= cardWidth + gap) {
      top = postsTourRect.top;
      left = postsTourRect.left + postsTourRect.width + gap;
    } else if (spaceLeft >= cardWidth + gap) {
      top = postsTourRect.top;
      left = postsTourRect.left - cardWidth - gap;
    }

    left = Math.max(safePadding, Math.min(left, window.innerWidth - cardWidth - safePadding));
    top = Math.max(
      safePadding,
      Math.min(top, window.innerHeight - estimatedCardHeight - safePadding)
    );

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
    };
  };

  return (
    <div className="campaign-brand-shell simplified-posts-page" style={brandStyle}>
      <div className="campaigns-page-header simplified-posts-header">
        <div>
          <div className="page-eyebrow">Posts</div>
          <h1 className="page-title">Choose today’s post.</h1>
          <p className="page-description">
            Pick a card from the weekly queue. The post opens in a simple window.
          </p>

          <div className="simplified-posts-meta">
            <span>{businessName}</span>
            <span>
              {postedCount}/{posts.length || 0} posted
            </span>
            {!accessLocked && accessMessage && <span>{accessMessage}</span>}
          </div>
        </div>

        <div className="posts-header-actions">
          <button
            type="button"
            className="secondary-button posts-tour-restart-button"
            onClick={restartPostsTour}
          >
            Show me around
          </button>

          <button className="secondary-button refresh-button" onClick={loadPageData}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="premium-card">
          <p>Loading weekly plan...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="premium-card">
          <div className="page-eyebrow">No weekly plan yet</div>
          <h2 style={{ marginTop: 0 }}>Create your weekly posts first.</h2>
          <p>
            Go to Dashboard, scan the website or add business details, then create weekly posts.
            They will appear here ready to publish.
          </p>
        </div>
      ) : (
        <>
          {accessLocked && (
            <section className="access-status-card access-status-locked">
              <div>
                <div className="page-eyebrow">Demo ended</div>
                <h2>Some weekly plan actions are currently locked.</h2>
                <p>{accessMessage}</p>
              </div>

              <a href="/subscription" className="dashboard-profile-link">
                View subscription options
              </a>
            </section>
          )}

          <section className="posts-progress-plan-grid">
            <section className="weekly-progress-card">
              <div>
                <div className="page-eyebrow">This week</div>
                <h3>
                  {postedCount} of {posts.length || 0} posts done
                </h3>
                <p>
                  {posts.length > 0 && postedCount === posts.length
                    ? 'Nice work — this week is complete 🎉'
                    : `${postsLeftThisWeek} posts left this week.`}
                </p>
              </div>

              <div className="weekly-progress-bar" aria-label="Weekly post progress">
                <span style={{ width: `${weeklyProgressPercent}%` }} />
              </div>
            </section>

            <WeeklyPlanControls
              campaigns={campaigns}
              pendingCampaignId={pendingCampaignId}
              campaignId={campaign?.id || null}
              maxSavedCampaigns={MAX_SAVED_CAMPAIGNS}
              loadingSelectedPlan={loadingSelectedPlan}
              deletingCampaign={deletingCampaign}
              renamingCampaign={renamingCampaign}
              onPendingCampaignChange={setPendingCampaignId}
              onLoadSelectedPlan={loadSelectedPlan}
              onRenameSelectedCampaign={renameSelectedCampaign}
              onDeleteSelectedCampaign={deleteSelectedCampaign}
              getCampaignOptionLabel={getCampaignOptionLabel}
            />
          </section>

          <WeeklyQueue
            posts={sortedPosts}
            selectedPostId={selectedPost?.id || null}
            onChoosePost={choosePost}
            onSelectNextPost={selectNextPost}
            getPostDateParts={getPostDateParts}
            getPostPositionLabel={getPostPositionLabel}
            getPlatformDisplayName={getPlatformDisplayName}
            getPostStatus={getPostStatus}
            getStatusClass={getStatusClass}
            isPostScheduledToday={isPostScheduledToday}
            isPostPosted={isPostPosted}
            queueRef={queueRef}
          />

          {posts.length > 0 && (
            <section className="premium-card" style={{ marginTop: 22 }}>
              <div className="page-eyebrow">Simple workflow</div>
              <h2 style={{ marginTop: 0 }}>Choose a card to start.</h2>
              <p>
                The post, media, and publishing tools stay inside the post window so this page stays
                clean.
              </p>
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
          onSetAudienceTarget={setAudienceTarget}
          onSetCustomAudienceTarget={setCustomAudienceTarget}
          onSetToneTarget={setToneTarget}
          onUploadMedia={uploadMedia}
          onRemoveMedia={removeMedia}
          onPublishToFacebook={publishToFacebook}
          onCopyPost={copyPost}
          onOpenPlatform={openPlatform}
          onMarkAsPosted={markAsPosted}
          onMarkAsNotPosted={markAsNotPosted}
          onSetReminderValue={setReminderValue}
          onSaveReminder={saveReminder}
          onClearReminder={clearReminder}
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
            window.location.href = '/dashboard';
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

      {showPostsTour && !loading && campaigns.length > 0 && (
        <div className="dashboard-spotlight-tour">
          {postsTourRect && (
            <>
              <div
                className="dashboard-tour-shade"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  height: postsTourRect.top,
                }}
              />

              <div
                className="dashboard-tour-shade"
                style={{
                  top: postsTourRect.top,
                  left: 0,
                  width: postsTourRect.left,
                  height: postsTourRect.height,
                }}
              />

              <div
                className="dashboard-tour-shade"
                style={{
                  top: postsTourRect.top,
                  left: postsTourRect.left + postsTourRect.width,
                  right: 0,
                  height: postsTourRect.height,
                }}
              />

              <div
                className="dashboard-tour-shade"
                style={{
                  top: postsTourRect.top + postsTourRect.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />

              <div
                className="dashboard-tour-highlight"
                style={{
                  top: postsTourRect.top,
                  left: postsTourRect.left,
                  width: postsTourRect.width,
                  height: postsTourRect.height,
                }}
              />
            </>
          )}

          {!postsTourRect && <div className="dashboard-tour-full-shade" />}

          <section className="dashboard-tour-tooltip" style={getPostsTourTooltipStyle()}>
            <div className="dashboard-tour-progress">
              Step {postsTourStep + 1} of {postsTourSteps.length}
            </div>

            <h2>{postsTourSteps[postsTourStep].title}</h2>
            <p>{postsTourSteps[postsTourStep].text}</p>

            <div className="dashboard-tour-actions">
              <button type="button" className="secondary-button" onClick={closePostsTour}>
                Skip
              </button>

              <div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={goToPreviousPostsTourStep}
                  disabled={postsTourStep === 0}
                >
                  Back
                </button>

                <button type="button" onClick={goToNextPostsTourStep}>
                  {postsTourStep === postsTourSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}