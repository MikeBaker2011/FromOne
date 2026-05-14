'use client';

import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

const IMAGE_BUCKET = 'campaign-assets';
const POSTS_TOUR_SEEN_KEY = 'fromone_posts_tour_seen';
const MAX_SAVED_CAMPAIGNS = 4;

const REVIEW_PROMPT_DISMISSED_KEY = 'fromone_review_prompt_dismissed';
const REVIEW_PROMPT_SUBMITTED_KEY = 'fromone_review_prompt_submitted';
const REVIEW_PROMPT_POSTED_COUNT_KEY = 'fromone_review_prompt_posted_count';
const REVIEW_PROMPT_TRIGGER_COUNT = 3;

const postsTourSteps = [
  {
    title: 'Welcome to your posts',
    text:
      'This is where you review this week’s plan. Choose each post, check the wording, copy it, publish it, then mark it as done.',
    target: 'header',
  },
  {
    title: 'Choose this week’s plan',
    text: 'Choose a saved weekly plan, then click Load plan.',
    target: 'campaigns',
  },
  {
    title: 'Use the weekly calendar',
    text:
      'The calendar shows three days at a time. Click a day to review the post, or use Next day to move through the week.',
    target: 'days',
  },
  {
    title: 'Prepare and publish',
    text:
      'Read the post first, make it more specific if needed, edit the wording, use the image idea if helpful, then copy, publish, and mark it as done.',
    target: 'publish',
  },
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
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [pendingCampaignId, setPendingCampaignId] = useState('');
  const [campaign, setCampaign] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [calendarStartIndex, setCalendarStartIndex] = useState(0);

  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [renamingCampaign, setRenamingCampaign] = useState(false);
  const [loadingSelectedPlan, setLoadingSelectedPlan] = useState(false);

  const [audienceTarget, setAudienceTarget] = useState('Local customers');
  const [customAudienceTarget, setCustomAudienceTarget] = useState('');
  const [toneTarget, setToneTarget] = useState('Use current tone');
  const [rewritingPost, setRewritingPost] = useState(false);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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

  const postsHeaderRef = useRef<HTMLDivElement | null>(null);
  const postsHeaderTextRef = useRef<HTMLDivElement | null>(null);
  const campaignHistoryControlsRef = useRef<HTMLDivElement | null>(null);
  const daySelectorRef = useRef<HTMLDivElement | null>(null);
  const publishingPanelRef = useRef<HTMLElement | null>(null);

  const [postsTourRect, setPostsTourRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const [accessLocked, setAccessLocked] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');

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

  useEffect(() => {
    if (loading || posts.length === 0) return;

    const todayUnpostedPost = posts.find(
      (post) => isPostScheduledToday(post) && !post.is_posted
    );

    if (!todayUnpostedPost) return;

    const storageKey = getTodayReminderStorageKey();

    if (localStorage.getItem(storageKey) === 'true') return;

    localStorage.setItem(storageKey, 'true');
    setTodayReminderPostId(todayUnpostedPost.id);
    setShowTodayReminder(true);
  }, [loading, posts]);

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
        'Your 7-day demo has ended. You can still view and publish existing posts, but editing and making posts more specific are locked until access is extended or a subscription is active.',
    };
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

  const ensureAccessAllowed = () => {
    if (!accessLocked) return true;

    alert(accessMessage);
    return false;
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
      setCalendarStartIndex(0);
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
      setCalendarStartIndex(0);
      return;
    }

    const loadedPosts = data || [];
    const sortedLoadedPosts = sortPostsByDate(loadedPosts);

    setPosts(sortedLoadedPosts);

    if (sortedLoadedPosts.length > 0) {
      const todayUnpostedPost = sortedLoadedPosts.find(
        (post) => isPostScheduledToday(post) && !post.is_posted
      );

      const firstUnpostedPost = sortedLoadedPosts.find((post) => !post.is_posted);

      const stillExists = selectedPostId
        ? sortedLoadedPosts.some((post) => post.id === selectedPostId)
        : false;

      const nextSelectedPost =
        shouldOpenTodayPost() && todayUnpostedPost
          ? todayUnpostedPost
          : stillExists
            ? sortedLoadedPosts.find((post) => post.id === selectedPostId) || sortedLoadedPosts[0]
            : todayUnpostedPost || firstUnpostedPost || sortedLoadedPosts[0];

      const nextSelectedIndex = sortedLoadedPosts.findIndex(
        (post) => post.id === nextSelectedPost.id
      );

      setSelectedPostId(nextSelectedPost.id);
      setCalendarStartIndex(nextSelectedIndex >= 0 ? nextSelectedIndex : 0);
    } else {
      setSelectedPostId(null);
      setCalendarStartIndex(0);
    }
  };

  const sortPostsByDate = (items: any[]) => {
    return [...items].sort((firstPost, secondPost) => {
      const firstTime = firstPost.scheduled_at ? new Date(firstPost.scheduled_at).getTime() : 0;
      const secondTime = secondPost.scheduled_at ? new Date(secondPost.scheduled_at).getTime() : 0;

      return firstTime - secondTime;
    });
  };

  const switchCampaign = async (campaignId: string) => {
    const nextCampaign = campaigns.find((item) => item.id === campaignId) || null;

    setSelectedCampaignId(campaignId);
    setPendingCampaignId(campaignId);
    setCampaign(nextCampaign);
    setSelectedPostId(null);
    setCalendarStartIndex(0);
    cancelEditingPost();

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
        .select('id, image_path')
        .eq('campaign_id', campaignIdToDelete);

      if (postsLoadError) {
        alert(postsLoadError.message);
        return;
      }

      const imagePaths = campaignPosts?.map((post) => post.image_path).filter(Boolean) || [];

      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(IMAGE_BUCKET)
          .remove(imagePaths);

        if (storageError) {
          console.error('Weekly plan image delete error:', storageError.message);
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
      setCalendarStartIndex(0);
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
    const getCampaignOptionLabel = (item: any) => {
    const business =
      item.business_name ||
      item.business_type ||
      item.campaign_area ||
      item.name ||
      'Weekly plan';

    const createdDate = item.created_at ? new Date(item.created_at) : null;

    const date = createdDate
      ? createdDate.toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
        })
      : '';

    return date ? `${business} — ${date}` : business;
  };

  const copyPost = async (post: any) => {
    const caption = post.caption || '';
    const cta = post.cta ? `CTA: ${post.cta}` : '';
    const hashtags = Array.isArray(post.hashtags) ? post.hashtags.join(' ') : '';

    const textToCopy = [caption, cta, hashtags].filter(Boolean).join('\n\n').trim();

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
      return 'Use a clear visual that matches the post: finished work, product detail, team moment, venue, customer result, or a simple behind-the-scenes photo.';
    }

    return 'Choose a clear photo that supports the post, such as your work, product, team, premises, or a customer result.';
  };

  const shouldShowImageGuidance = (post: any) => {
    if (!post) return false;

    const platform = String(post.platform || '').toLowerCase();

    return Boolean(
      post.image_prompt ||
        platform.includes('instagram') ||
        platform.includes('tiktok') ||
        platform.includes('pinterest') ||
        platform.includes('shorts')
    );
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

      if (error) {
        throw error;
      }

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

  const markAsPosted = async (postId: string) => {
    const postIndex = posts.findIndex((post) => post.id === postId);

    const updatedPosts = posts.map((post) =>
      post.id === postId ? { ...post, is_posted: true, status: 'posted' } : post
    );

    const postsLeftAfterMarking = updatedPosts.filter((post) => !post.is_posted).length;

    const nextPost =
      updatedPosts.slice(postIndex + 1).find((post) => !post.is_posted) ||
      updatedPosts.find((post) => !post.is_posted) ||
      null;

    const { error } = await supabase
      .from('campaign_posts')
      .update({
        is_posted: true,
        status: 'posted',
      })
      .eq('id', postId);

    if (error) {
      alert(error.message);
      return;
    }

    setSuccessMoment({
      postsLeft: postsLeftAfterMarking,
      nextPostId: nextPost?.id || null,
    });

    maybeShowReviewPrompt();

    await loadPosts(campaign?.id || null);
  };

  const markAsScheduled = async (postId: string) => {
    const { error } = await supabase
      .from('campaign_posts')
      .update({
        is_posted: false,
        status: 'scheduled',
      })
      .eq('id', postId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPosts(campaign?.id || null);
  };

  const updatePostLocally = (postId: string, updates: any) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    );
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

  const saveEditedPost = async (post: any) => {
    if (!post?.id) return;

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
        .eq('id', post.id);

      if (error) {
        alert(error.message);
        return;
      }

      updatePostLocally(post.id, updates);
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
      alert('This post needs a caption before it can be made more specific.');
      return;
    }

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
      });

      const rewritten = response.data;

      const updates = {
        caption: rewritten.caption,
        cta: rewritten.cta,
        hashtags: Array.isArray(rewritten.hashtags) ? rewritten.hashtags : [],
        audience_target: finalAudience,
      };

      const { error } = await supabase
        .from('campaign_posts')
        .update(updates)
        .eq('id', post.id);

      if (error) {
        alert(error.message);
        return;
      }

      updatePostLocally(post.id, updates);

      if (editingPostId === post.id) {
        setEditCaption(updates.caption || '');
        setEditCta(updates.cta || '');
        setEditHashtags(hashtagsToString(updates.hashtags));
      }

      const toneMessage =
        toneTarget === 'Use current tone' ? '' : ` with a ${toneTarget.toLowerCase()} tone`;

      alert(`Post made more specific for ${finalAudience}${toneMessage}.`);
    } catch (error: any) {
      const message = getReadableError(error, 'Error making post more specific.');
      console.error('Make more specific error:', error);
      alert(message);
    } finally {
      setRewritingPost(false);
    }
  };

  const openPlatform = (platform: string) => {
    const urls: Record<string, string> = {
      Facebook: 'https://www.facebook.com',
      Instagram: 'https://www.instagram.com',
      'Google Business': 'https://business.google.com',
      Pinterest: 'https://www.pinterest.com',
      LinkedIn: 'https://www.linkedin.com',
      TikTok: 'https://www.tiktok.com',
      'YouTube Shorts': 'https://www.youtube.com',
      'X / Twitter': 'https://x.com',
    };

    window.open(urls[platform] || 'https://www.google.com', '_blank');
  };

  const openTodayReminderPost = () => {
    if (todayReminderPostId) {
      choosePost(todayReminderPostId);
    }

    setShowTodayReminder(false);

    window.setTimeout(() => {
      publishingPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);
  };

  const viewNextPostAfterSuccess = () => {
    if (!successMoment?.nextPostId) {
      setSuccessMoment(null);
      return;
    }

    choosePost(successMoment.nextPostId);
    setSuccessMoment(null);

    window.setTimeout(() => {
      daySelectorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);
  };

  const choosePost = (postId: string) => {
    const nextIndex = sortedPosts.findIndex((post) => post.id === postId);

    setSelectedPostId(postId);
    cancelEditingPost();

    if (nextIndex >= 0) {
      setCalendarStartIndex(nextIndex);
    }
  };

  const goToNextCalendarDay = () => {
    if (sortedPosts.length === 0) return;

    const selectedIndex = selectedPost
      ? sortedPosts.findIndex((post) => post.id === selectedPost.id)
      : calendarStartIndex;

    const safeSelectedIndex = selectedIndex >= 0 ? selectedIndex : calendarStartIndex;
    const nextIndex = (safeSelectedIndex + 1) % sortedPosts.length;
    const nextPost = sortedPosts[nextIndex];

    if (!nextPost) return;

    setCalendarStartIndex(nextIndex);
    setSelectedPostId(nextPost.id);
    cancelEditingPost();
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
    if (postsTourStep >= postsTourSteps.length - 1) {
      closePostsTour();
      return;
    }

    setPostsTourStep((currentStep) => currentStep + 1);
  };

  const goToPreviousPostsTourStep = () => {
    setPostsTourStep((currentStep) => Math.max(0, currentStep - 1));
  };

  const getCurrentPostsTourTarget = () => {
    const currentTarget = postsTourSteps[postsTourStep]?.target;

    if (currentTarget === 'header') return postsHeaderTextRef.current;
    if (currentTarget === 'campaigns') return campaignHistoryControlsRef.current;
    if (currentTarget === 'days') return daySelectorRef.current;
    if (currentTarget === 'publish') return publishingPanelRef.current;

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
    const estimatedCardHeight = 330;
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

  const sortedPosts = useMemo(() => {
    return sortPostsByDate(posts);
  }, [posts]);

  const selectedPost = useMemo(() => {
    return sortedPosts.find((post) => post.id === selectedPostId) || sortedPosts[0] || null;
  }, [sortedPosts, selectedPostId]);

  const visibleCalendarPosts = useMemo(() => {
    if (sortedPosts.length === 0) return [];

    const visibleCount = Math.min(3, sortedPosts.length);

    return Array.from({ length: visibleCount }).map((_, index) => {
      const postIndex = (calendarStartIndex + index) % sortedPosts.length;
      return sortedPosts[postIndex];
    });
  }, [sortedPosts, calendarStartIndex]);

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

  const activeIndustry = String(
    profile?.industry ||
      campaign?.business_type ||
      campaign?.industry ||
      ''
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

  const postedCount = posts.filter((post) => post.is_posted).length;
  const postsLeftThisWeek = Math.max((posts.length || 0) - postedCount, 0);
  const weeklyProgressPercent =
    posts.length > 0 ? Math.round((postedCount / posts.length) * 100) : 0;

  const todayReminderPost = posts.find((post) => post.id === todayReminderPostId) || null;

  const businessName =
    profile?.business_name ||
    campaign?.business_name ||
    selectedPost?.business_name ||
    'Your business';

  const brandPrimary = profile?.brand_primary_color || '#ffd43b';
  const brandSecondary = profile?.brand_secondary_color || '#101420';
  const brandAccent = profile?.brand_accent_color || '#3ddc97';

  const brandStyle = {
    '--client-primary': brandPrimary,
    '--client-secondary': brandSecondary,
    '--client-accent': brandAccent,
  } as CSSProperties;

  return (
    <div className="campaign-brand-shell simplified-posts-page" style={brandStyle}>
      <div ref={postsHeaderRef} className="campaigns-page-header simplified-posts-header">
        <div ref={postsHeaderTextRef}>
          <div className="page-eyebrow">Posts</div>
          <h1 className="page-title">Your posts are ready.</h1>
          <p className="page-description">
            Choose a day, review the post, copy it, publish it, then mark it as done.
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

            <section className="simplified-control-card">
              <div ref={campaignHistoryControlsRef} className="simplified-campaign-controls">
                <label>
                  <strong>This week’s plan</strong>
                  <select
                    className="input"
                    value={pendingCampaignId}
                    onChange={(event) => setPendingCampaignId(event.target.value)}
                    disabled={deletingCampaign || renamingCampaign || loadingSelectedPlan}
                  >
                    {campaigns.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getCampaignOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="posts-plan-usage">
                  {campaigns.length}/{MAX_SAVED_CAMPAIGNS} saved weekly plans
                </div>

                <div className="posts-plan-actions">
                  <button
                    type="button"
                    onClick={loadSelectedPlan}
                    disabled={
                      !pendingCampaignId ||
                      loadingSelectedPlan ||
                      deletingCampaign ||
                      renamingCampaign
                    }
                  >
                    {loadingSelectedPlan ? 'Loading...' : 'Load plan'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={renameSelectedCampaign}
                    disabled={
                      !campaign?.id ||
                      loadingSelectedPlan ||
                      deletingCampaign ||
                      renamingCampaign
                    }
                  >
                    {renamingCampaign ? 'Renaming...' : 'Rename'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button danger-button"
                    onClick={deleteSelectedCampaign}
                    disabled={
                      !campaign?.id ||
                      loadingSelectedPlan ||
                      deletingCampaign ||
                      renamingCampaign
                    }
                  >
                    {deletingCampaign ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </section>
          </section>

          <section className="simplified-week-section premium-week-calendar-section fromone-flow-page">
            <div className="simplified-section-heading">
              <div>
                <div className="page-eyebrow">Weekly calendar</div>
                <h2>Choose a day to review.</h2>
                <p>See three posts at a time and move through the week with one button.</p>
              </div>

              <button
                type="button"
                className="premium-next-day-button"
                onClick={goToNextCalendarDay}
              >
                Next day →
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="premium-card" style={{ marginTop: 20 }}>
                <div className="page-eyebrow">No posts found</div>
                <h2 style={{ marginTop: 0 }}>This weekly plan has no posts yet.</h2>
                <p>Go back to Dashboard and create weekly posts.</p>
              </div>
            ) : (
              <>
                <div ref={daySelectorRef} className="premium-calendar-carousel">
                  {visibleCalendarPosts.map((post) => {
                    const dateParts = getPostDateParts(post);
                    const isSelected = selectedPost?.id === post.id;
                    const isToday = isPostScheduledToday(post);

                    return (
                      <button
                        key={post.id}
                        type="button"
                        className={[
                          'premium-calendar-day-card',
                          isSelected ? 'is-selected' : '',
                          isToday && !post.is_posted ? 'is-today' : '',
                          post.is_posted ? 'is-posted' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => choosePost(post.id)}
                      >
                        <span className="premium-calendar-day-label">
                          {getPostPositionLabel(post)}
                        </span>

                        <div className="premium-calendar-date-row">
                          <span>{dateParts.weekday}</span>
                          <strong>{dateParts.day}</strong>
                          <small>{dateParts.month}</small>
                        </div>

                        <div className="premium-calendar-post-info">
                          <strong>{post.platform || 'Social post'}</strong>
                          <p>{post.title || post.scheduled_day || 'Post ready to review'}</p>
                        </div>

                        <span className="premium-calendar-status">
                          {isToday && !post.is_posted
                            ? 'Start here'
                            : post.is_posted
                              ? 'Posted'
                              : 'Ready'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedPost && (
                  <article className="fromone-post-flow">
                    <div className="selected-post-tags">
                      <span>{getPostPositionLabel(selectedPost)}</span>
                      <span>{selectedPost.platform || 'Facebook'}</span>
                      <span>{selectedPost.is_posted ? 'Posted' : 'Ready'}</span>
                      {isPostScheduledToday(selectedPost) && !selectedPost.is_posted && (
                        <span>Start here</span>
                      )}
                      {selectedPost.audience_target && (
                        <span>For {selectedPost.audience_target}</span>
                      )}
                    </div>

                    <section className="fromone-flow-preview-card">
                      <div className="fromone-flow-card-top">
                        <div>
                          <div className="page-eyebrow">Step 1 · Read the post</div>
                          <h2>{selectedPost.title || 'Social Media Post'}</h2>
                          <p>Check the post first. Then use the tools underneath only if needed.</p>
                        </div>

                        <span>{selectedPost.platform || 'Social post'}</span>
                      </div>

                      <div className="fromone-post-preview-body">
                        <p>{selectedPost.caption || 'No caption saved.'}</p>

                        {selectedPost.cta && (
                          <p>
                            <strong>CTA:</strong> {selectedPost.cta}
                          </p>
                        )}

                        {Array.isArray(selectedPost.hashtags) &&
                          selectedPost.hashtags.length > 0 && (
                            <p className="post-hashtags">{selectedPost.hashtags.join(' ')}</p>
                          )}
                      </div>
                    </section>

                    <section ref={publishingPanelRef} className="fromone-flow-tools-card">
                      <div className="fromone-flow-tools-header">
                        <div>
                          <div className="page-eyebrow">Step 2 · Prepare and publish</div>
                          <h3>Use these tools in order.</h3>
                          <p>Make it more specific if needed, edit the wording, then publish.</p>
                        </div>
                      </div>

                      <div className="fromone-flow-tools-list">
                        <section className="fromone-flow-tool-row">
                          <div className="fromone-flow-step-marker">2A</div>

                          <div className="fromone-flow-tool-copy">
                            <strong>Make it more specific</strong>
                            <p>Optional: choose who it is for and adjust the tone.</p>
                          </div>

                          <div className="fromone-flow-tool-action">
                            <select
                              className="input"
                              value={audienceTarget}
                              onChange={(event) => setAudienceTarget(event.target.value)}
                            >
                              {dynamicAudienceTargets.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>

                            {audienceTarget === 'Custom audience' && (
                              <input
                                className="input"
                                value={customAudienceTarget}
                                onChange={(event) => setCustomAudienceTarget(event.target.value)}
                                placeholder="Example: first-time homeowners"
                              />
                            )}

                            <select
                              className="input"
                              value={toneTarget}
                              onChange={(event) => setToneTarget(event.target.value)}
                            >
                              {toneOptions.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRewriteForAudience(selectedPost)}
                              disabled={accessLocked || rewritingPost}
                            >
                              {rewritingPost ? 'Making specific...' : 'Make it more specific'}
                            </button>
                          </div>
                        </section>

                        <section className="fromone-flow-tool-row">
                          <div className="fromone-flow-step-marker">2B</div>

                          <div className="fromone-flow-tool-copy">
                            <strong>Edit wording</strong>
                            <p>Change the caption, CTA, or hashtags.</p>
                          </div>

                          <div className="fromone-flow-tool-action">
                            {editingPostId === selectedPost.id ? (
                              <div className="fromone-flow-edit-box">
                                <label>
                                  <strong>Caption</strong>
                                  <textarea
                                    className="input"
                                    value={editCaption}
                                    onChange={(event) => setEditCaption(event.target.value)}
                                  />
                                </label>

                                <label>
                                  <strong>CTA</strong>
                                  <input
                                    className="input"
                                    value={editCta}
                                    onChange={(event) => setEditCta(event.target.value)}
                                  />
                                </label>

                                <label>
                                  <strong>Hashtags</strong>
                                  <input
                                    className="input"
                                    value={editHashtags}
                                    onChange={(event) => setEditHashtags(event.target.value)}
                                    placeholder="#LocalBusiness #Marketing"
                                  />
                                </label>

                                <div className="fromone-flow-inline-actions">
                                  <button
                                    type="button"
                                    onClick={() => saveEditedPost(selectedPost)}
                                    disabled={savingEdit}
                                  >
                                    {savingEdit ? 'Saving...' : 'Save changes'}
                                  </button>

                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={cancelEditingPost}
                                    disabled={savingEdit}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => startEditingPost(selectedPost)}
                                disabled={accessLocked}
                              >
                                Edit post
                              </button>
                            )}
                          </div>
                        </section>

                        <section className="fromone-flow-tool-row fromone-flow-final-row">
                          <div className="fromone-flow-step-marker">2C</div>

                          <div className="fromone-flow-tool-copy">
                            <strong>Copy and publish</strong>
                            <p>
                              Use the image idea if helpful, copy the post, publish it, then mark it
                              done.
                            </p>
                          </div>

                          <div className="fromone-flow-tool-action">
                            {shouldShowImageGuidance(selectedPost) && (
                              <div className="fromone-image-guidance-note">
                                <strong>Image idea</strong>
                                <p>{getImageGuidance(selectedPost)}</p>
                              </div>
                            )}

                            <div className="fromone-flow-publish-buttons">
                              <button onClick={() => copyPost(selectedPost)}>Copy post</button>

                              <button
                                className="secondary-button"
                                onClick={() => openPlatform(selectedPost.platform || 'Facebook')}
                              >
                                Open {selectedPost.platform || 'Facebook'}
                              </button>

                              {selectedPost.is_posted ? (
                                <button
                                  className="secondary-button"
                                  onClick={() => markAsScheduled(selectedPost.id)}
                                >
                                  Mark as not posted
                                </button>
                              ) : (
                                <button
                                  className="posted-button"
                                  onClick={() => markAsPosted(selectedPost.id)}
                                >
                                  Mark as posted
                                </button>
                              )}
                            </div>
                          </div>
                        </section>
                      </div>
                    </section>
                  </article>
                )}
              </>
            )}
          </section>
        </>
      )}

      {showTodayReminder && todayReminderPost && (
        <div className="fromone-modal-overlay" role="dialog" aria-modal="true">
          <section className="fromone-modal-card">
            <div className="fromone-modal-icon">📌</div>
            <div className="page-eyebrow">Today’s post</div>
            <h2>You have a post to make today</h2>
            <p>
              Your {todayReminderPost.platform || 'social'} post is ready. Open it, publish it,
              then mark it as posted.
            </p>

            <div className="fromone-modal-actions">
              <button type="button" onClick={openTodayReminderPost}>
                Start today’s post
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowTodayReminder(false)}
              >
                Later
              </button>
            </div>
          </section>
        </div>
      )}

      {successMoment && (
        <div className="fromone-modal-overlay" role="dialog" aria-modal="true">
          <section className="fromone-modal-card fromone-success-card">
            <div className="fromone-modal-icon">🎉</div>
            <div className="page-eyebrow">Post complete</div>
            <h2>Nice work — today’s post is done 🎉</h2>
            <p>
              {successMoment.postsLeft === 0
                ? 'That was the last post in this weekly plan.'
                : `${successMoment.postsLeft} posts left this week.`}
            </p>

            <div className="fromone-modal-actions">
              {successMoment.nextPostId && (
                <button type="button" onClick={viewNextPostAfterSuccess}>
                  View next post
                </button>
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
              >
                Back to dashboard
              </button>
            </div>
          </section>
        </div>
      )}

      {showReviewPrompt && (
        <div className="fromone-modal-overlay" role="dialog" aria-modal="true">
          <section className="fromone-modal-card">
            <div className="fromone-modal-icon">⭐</div>
            <div className="page-eyebrow">Quick favour</div>
            <h2>How are you finding FromOne?</h2>
            <p>
              A short review helps improve FromOne and helps other small businesses understand
              whether it could save them time.
            </p>

            <div className="review-star-row" onMouseLeave={() => setReviewHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= (reviewHoverRating || reviewRating);

                return (
                  <button
                    key={star}
                    type="button"
                    className={active ? 'review-star active' : 'review-star'}
                    onMouseEnter={() => setReviewHoverRating(star)}
                    onClick={() => setReviewRating(star)}
                    aria-label={`${star} star${star === 1 ? '' : 's'}`}
                  >
                    ★
                  </button>
                );
              })}
            </div>

            <textarea
              className="input"
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              placeholder="Example: FromOne made it much easier to plan my posts for the week."
              rows={5}
            />

            <div className="fromone-modal-actions">
              <button type="button" onClick={submitReviewPrompt} disabled={savingReview}>
                {savingReview ? 'Sending...' : 'Send review'}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={dismissReviewPrompt}
                disabled={savingReview}
              >
                Maybe later
              </button>
            </div>
          </section>
        </div>
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