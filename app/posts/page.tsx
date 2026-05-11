'use client';

import {
  ChangeEvent,
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type PostFilter = 'all' | 'today' | 'scheduled' | 'posted';

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

const IMAGE_BUCKET = 'campaign-assets';

const POSTS_TOUR_SEEN_KEY = 'fromone_posts_tour_seen';

const postsTourSteps = [
  {
    title: 'Welcome to your posts',
    text:
      'This is where you review the weekly campaign FromOne created for you. Choose each post, check the wording, add an image, copy it, publish it manually, then mark it as done.',
    target: 'header',
  },
  {
    title: 'Choose a campaign',
    text:
      'Use the campaign dropdown to switch between saved weeks. The manage button keeps extra campaign actions out of the way.',
    target: 'campaigns',
  },
  {
    title: 'Choose a post',
    text:
      'Each card is one post from your weekly campaign. Select a day to review the full post below.',
    target: 'days',
  },
  {
    title: 'Tailor the post',
    text:
      'Use the audience tool if you want this post rewritten for a specific customer type.',
    target: 'audience',
  },
  {
    title: 'Edit the post',
    text:
      'You can edit the caption, CTA, hashtags, and image idea before publishing.',
    target: 'edit',
  },
  {
    title: 'Publish manually',
    text:
      'Upload your image, copy the post, open the platform, publish manually, then mark it as posted.',
    target: 'publish',
  },
];

const WEEKLY_SCAN_LIMIT = 2;
const MAX_SAVED_CAMPAIGNS = 4;
const WEBSITE_SCAN_EVENT_TYPES = ['website_scan', 'campaign_regenerate'];

const platformFallback = [
  'Facebook',
  'Instagram',
  'Google Business',
  'LinkedIn',
  'Instagram',
  'TikTok',
  'Facebook',
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
  const [campaign, setCampaign] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PostFilter>('all');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [regeneratingCampaign, setRegeneratingCampaign] = useState(false);
  const [duplicatingCampaign, setDuplicatingCampaign] = useState(false);
  const [renamingCampaign, setRenamingCampaign] = useState(false);
  const [audienceTarget, setAudienceTarget] = useState('Local customers');
  const [customAudienceTarget, setCustomAudienceTarget] = useState('');
  const [rewritingPost, setRewritingPost] = useState(false);

  const [showPostsTour, setShowPostsTour] = useState(false);
  const [postsTourStep, setPostsTourStep] = useState(0);

  const postsHeaderRef = useRef<HTMLDivElement | null>(null);
  const postsHeaderTextRef = useRef<HTMLDivElement | null>(null);
  const campaignHistoryControlsRef = useRef<HTMLDivElement | null>(null);
  const daySelectorRef = useRef<HTMLDivElement | null>(null);
  const audienceToolRef = useRef<HTMLDivElement | null>(null);
  const editPostRef = useRef<HTMLButtonElement | null>(null);
  const publishingPanelRef = useRef<HTMLElement | null>(null);

  const [postsTourRect, setPostsTourRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [editImagePrompt, setEditImagePrompt] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [accessLocked, setAccessLocked] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');

  useEffect(() => {
    loadPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const tourSeen = localStorage.getItem(POSTS_TOUR_SEEN_KEY) === 'true';
    const isMobile = window.innerWidth <= 760;

    if (!tourSeen && !isMobile) {
      setShowPostsTour(true);
    }
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

  const shouldOpenTodayPost = () => {
    if (typeof window === 'undefined') return false;

    const params = new URLSearchParams(window.location.search);
    return params.get('today') === 'true';
  };

  const isPostScheduledToday = (post: any) => {
    if (!post?.scheduled_at) return false;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const scheduledTime = new Date(post.scheduled_at).getTime();

    return (
      scheduledTime >= startOfToday.getTime() &&
      scheduledTime <= endOfToday.getTime()
    );
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
    if (currentTarget === 'audience') return audienceToolRef.current;
    if (currentTarget === 'edit') return editPostRef.current;
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
        message: 'Trial access is being prepared.',
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
        'Your 7-day demo has ended. You can still view and use existing posts, but campaign regeneration, duplication, and audience rewrites are locked until access is extended or a subscription is active.',
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

    if (!data) {
      setAccessLocked(false);
      setAccessMessage('Trial access is being prepared.');
      return;
    }

    const access = data as AccessInfo;
    const calculated = calculateAccess(access);

    setAccessLocked(calculated.locked);
    setAccessMessage(calculated.message);
  };

  const ensureAccessAllowed = () => {
    if (!accessLocked) return true;

    alert(accessMessage);
    return false;
  };

  const getSevenDaysAgoIso = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return sevenDaysAgo.toISOString();
  };

  const loadWeeklyScanUsage = async (userId: string) => {
    const { count, error } = await supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('event_type', WEBSITE_SCAN_EVENT_TYPES)
      .gte('created_at', getSevenDaysAgoIso());

    if (error) {
      console.error('Error loading scan usage:', error.message);
      return 0;
    }

    return count || 0;
  };

  const isAdminUser = async (userId: string) => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Admin check error:', error.message);
      return false;
    }

    return Boolean(data);
  };

  const checkWeeklyScanLimit = async (userId: string) => {
    const admin = await isAdminUser(userId);

    if (admin) {
      return true;
    }

    const used = await loadWeeklyScanUsage(userId);

    if (used >= WEEKLY_SCAN_LIMIT) {
      alert(
        `You have used your ${WEEKLY_SCAN_LIMIT} website scans for this 7-day period. You can still regenerate campaigns from a manual profile.`
      );
      return false;
    }

    return true;
  };

  const recordUsageEvent = async (
    userId: string,
    eventType: 'website_scan' | 'campaign_regenerate',
    metadata: Record<string, any> = {}
  ) => {
    const { error } = await supabase.from('usage_events').insert({
      user_id: userId,
      event_type: eventType,
      metadata,
    });

    if (error) {
      console.error('Error recording usage event:', error.message);
    }
  };

  const loadSavedCampaignCount = async (userId: string) => {
    const { count, error } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error loading campaign count:', error.message);
      return 0;
    }

    return count || 0;
  };

  const checkSavedCampaignLimit = async (userId: string) => {
    const total = await loadSavedCampaignCount(userId);

    if (total >= MAX_SAVED_CAMPAIGNS) {
      alert(
        `You already have ${MAX_SAVED_CAMPAIGNS} saved campaigns. Delete an old campaign before duplicating this one.`
      );
      return false;
    }

    return true;
  };

  const safeArray = (value: any) => {
    if (Array.isArray(value)) return value;

    if (typeof value === 'string' && value.trim()) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  const buildBusinessDescription = (businessProfile: any) => {
    return `
Website URL: ${businessProfile?.website_url || ''}
Business name: ${businessProfile?.business_name || ''}
Industry: ${businessProfile?.industry || ''}
Location: ${businessProfile?.location || ''}
Services: ${Array.isArray(businessProfile?.services) ? businessProfile.services.join(', ') : ''}
Target audience: ${
      Array.isArray(businessProfile?.target_audience)
        ? businessProfile.target_audience.join(', ')
        : ''
    }
Tone of voice: ${businessProfile?.tone_of_voice || ''}
Content pillars: ${
      Array.isArray(businessProfile?.content_pillars)
        ? businessProfile.content_pillars.join(', ')
        : ''
    }
Main offer: ${businessProfile?.main_offer || ''}
Business goals: ${
      Array.isArray(businessProfile?.business_goals)
        ? businessProfile.business_goals.join(', ')
        : ''
    }

Create a fresh 7-day mixed-platform campaign. Keep the posts clean, useful, and specific to the business.
`;
  };

  const buildHashtags = (businessProfile: any) => {
    const industry = String(businessProfile?.industry || 'business')
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');

    const location = String(businessProfile?.location || 'local')
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');

    return [`#${industry}`, `#${location}`, '#SmallBusiness', '#Marketing', '#FromOne'];
  };

  const getCampaignOptionLabel = (item: any) => {
    const business =
      item.business_name ||
      item.business_type ||
      item.campaign_area ||
      item.name ||
      'Campaign';

    const createdDate = item.created_at ? new Date(item.created_at) : null;

    const date = createdDate
      ? createdDate.toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
        })
      : '';

    return date ? `${business} — ${date}` : business;
  };

  const buildCampaignCopyName = (item: any) => {
    const business =
      item.business_name ||
      profile?.business_name ||
      item.business_type ||
      'Campaign';

    const date = new Date().toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${business} — Copy ${date} ${time}`;
  };

  const normaliseGeneratedPost = (
    post: GeneratedPost | string,
    index: number,
    businessProfile: any,
    detectedIndustry: string,
    detectedLocation: string
  ) => {
    const fallbackPlatform = platformFallback[index] || 'Facebook';
    const fallbackHashtags = buildHashtags({
      ...businessProfile,
      industry: detectedIndustry,
      location: detectedLocation,
    });

    if (typeof post === 'string') {
      return {
        day: `Day ${index + 1}`,
        platform: fallbackPlatform,
        title: `${fallbackPlatform} Post`,
        caption: post,
        cta: businessProfile?.main_offer || 'Contact us today to find out more.',
        hashtags: fallbackHashtags,
        image_prompt:
          'Use a clean, professional image that supports the message of this post.',
      };
    }

    return {
      day: post.day || `Day ${index + 1}`,
      platform: post.platform || fallbackPlatform,
      title: post.title || `${post.platform || fallbackPlatform} Post`,
      caption: post.caption || '',
      cta: post.cta || businessProfile?.main_offer || 'Contact us today to find out more.',
      hashtags:
        Array.isArray(post.hashtags) && post.hashtags.length > 0
          ? post.hashtags
          : fallbackHashtags,
      image_prompt:
        post.image_prompt ||
        'Use a clean, professional image that supports the message of this post.',
    };
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

    await Promise.all([loadPosts(activeCampaign?.id || null), loadProfile(), loadAccess()]);

    setLoading(false);
  };

  const loadCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading campaigns:', error.message);
      setCampaigns([]);
      setCampaign(null);
      return [];
    }

    const loadedCampaigns = data || [];
    setCampaigns(loadedCampaigns);

    return loadedCampaigns;
  };

  const loadPosts = async (campaignId?: string | null) => {
    if (!campaignId) {
      setPosts([]);
      setSelectedPostId(null);
      return;
    }

    let query = supabase
      .from('campaign_posts')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('scheduled_at', { ascending: true });

    if (filter === 'scheduled') {
      query = query.eq('is_posted', false);
    }

    if (filter === 'posted') {
      query = query.eq('is_posted', true);
    }

    if (filter === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      query = query
        .gte('scheduled_at', startOfToday.toISOString())
        .lte('scheduled_at', endOfToday.toISOString())
        .eq('is_posted', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading posts:', error.message);
      setPosts([]);
      setSelectedPostId(null);
      return;
    }

    const loadedPosts = data || [];
    setPosts(loadedPosts);

    if (loadedPosts.length > 0) {
      const todayUnpostedPost = loadedPosts.find(
        (post) => isPostScheduledToday(post) && !post.is_posted
      );

      const firstUnpostedPost = loadedPosts.find((post) => !post.is_posted);

      const stillExists = selectedPostId
        ? loadedPosts.some((post) => post.id === selectedPostId)
        : false;

      if (shouldOpenTodayPost() && todayUnpostedPost) {
        setSelectedPostId(todayUnpostedPost.id);
      } else if (!stillExists) {
        setSelectedPostId(todayUnpostedPost?.id || firstUnpostedPost?.id || loadedPosts[0].id);
      }
    } else {
      setSelectedPostId(null);
    }
  };
    const switchCampaign = async (campaignId: string) => {
    const nextCampaign = campaigns.find((item) => item.id === campaignId) || null;

    setSelectedCampaignId(campaignId);
    setCampaign(nextCampaign);
    setSelectedPostId(null);
    cancelEditingPost();

    await loadPosts(campaignId);
  };

  const deleteSelectedCampaign = async () => {
    if (!campaign?.id) {
      alert('No campaign selected.');
      return;
    }

    const campaignName = campaign.name || campaign.campaign_idea || 'Selected campaign';

    const confirmed = confirm(
      `Delete this campaign and all its posts?\n\n${campaignName}\n\nThis cannot be undone.`
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
          console.error('Campaign image delete error:', storageError.message);
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
      setCampaign(null);
      setPosts([]);
      setSelectedPostId(null);
      cancelEditingPost();

      alert('Campaign deleted.');
      await loadPageData();
    } catch (error: any) {
      const message = getReadableError(error, 'Error deleting campaign.');
      console.error('Delete campaign error:', error);
      alert(message);
    } finally {
      setDeletingCampaign(false);
    }
  };

  const duplicateSelectedCampaign = async () => {
    if (!campaign?.id) {
      alert('No campaign selected.');
      return;
    }

    if (!ensureAccessAllowed()) return;

    const confirmed = confirm(
      `Duplicate this campaign?\n\n${
        campaign.name || campaign.campaign_idea || 'Selected campaign'
      }\n\nThis will create a new campaign with copied posts. Uploaded images will not be copied.`
    );

    if (!confirmed) return;

    setDuplicatingCampaign(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        alert('You need to sign in before duplicating a campaign.');
        return;
      }

      const campaignLimitAllowed = await checkSavedCampaignLimit(userId);
      if (!campaignLimitAllowed) return;

      const { data: sourcePosts, error: sourcePostsError } = await supabase
        .from('campaign_posts')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('scheduled_at', { ascending: true });

      if (sourcePostsError) {
        alert(sourcePostsError.message);
        return;
      }

      if (!sourcePosts?.length) {
        alert('This campaign has no posts to duplicate.');
        return;
      }

      const { data: newCampaign, error: campaignCopyError } = await supabase
        .from('campaigns')
        .insert({
          user_id: userId,
          name: buildCampaignCopyName(campaign),
          business_type: campaign.business_type,
          location: campaign.location,
          is_active: true,
          keywords: campaign.keywords || [],
          selected_keywords: campaign.selected_keywords || [],
          client_id: campaign.client_id,
          business_name: campaign.business_name,
          target_audience: campaign.target_audience,
          campaign_idea: campaign.campaign_idea,
          audience: campaign.audience,
          drafts: sourcePosts.length,
          scheduled: sourcePosts.length,
          assets: 0,
          posted: 0,
          launch_date: new Date().toISOString().split('T')[0],
          campaign_area: campaign.campaign_area,
          tone: campaign.tone,
          posting_frequency: campaign.posting_frequency || 'Daily',
          platform_plan: campaign.platform_plan,
        })
        .select()
        .single();

      if (campaignCopyError) {
        alert(campaignCopyError.message);
        return;
      }

      const today = new Date();

      const copiedPosts = sourcePosts.map((post: any, index: number) => {
        const postDate = new Date(today);
        postDate.setDate(today.getDate() + index);
        postDate.setHours(9, 0, 0, 0);

        return {
          user_id: userId,
          campaign_id: newCampaign.id,
          keyword: post.keyword,
          title: post.title,
          caption: post.caption,
          cta: post.cta,
          hashtags: post.hashtags,
          platform: post.platform,
          type: post.type,
          scheduled_day: post.scheduled_day || `Day ${index + 1}`,
          scheduled_at: postDate.toISOString(),
          status: 'scheduled',
          is_posted: false,
          client_id: post.client_id,
          image_prompt: post.image_prompt,
          audience_target: post.audience_target || null,
          image_url: null,
          image_path: null,
          reach: 0,
          clicks: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
        };
      });

      const { error: postsCopyError } = await supabase
        .from('campaign_posts')
        .insert(copiedPosts);

      if (postsCopyError) {
        alert(postsCopyError.message);
        return;
      }

      await loadCampaigns();

      setCampaign(newCampaign);
      setSelectedCampaignId(newCampaign.id);
      setSelectedPostId(null);
      cancelEditingPost();

      await loadPosts(newCampaign.id);

      alert('Campaign duplicated.');
    } catch (error: any) {
      const message = getReadableError(error, 'Error duplicating campaign.');
      console.error('Duplicate campaign error:', error);
      alert(message);
    } finally {
      setDuplicatingCampaign(false);
    }
  };

  const renameSelectedCampaign = async () => {
    if (!campaign?.id) {
      alert('No campaign selected.');
      return;
    }

    const currentName = campaign.name || campaign.campaign_idea || 'Untitled campaign';
    const newName = prompt('Rename campaign:', currentName);

    if (newName === null) return;

    const cleanName = newName.trim();

    if (!cleanName) {
      alert('Campaign name cannot be empty.');
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

      alert('Campaign renamed.');
    } catch (error: any) {
      const message = getReadableError(error, 'Error renaming campaign.');
      console.error('Rename campaign error:', error);
      alert(message);
    } finally {
      setRenamingCampaign(false);
    }
  };

  const regenerateSelectedCampaign = async () => {
    if (!campaign?.id) {
      alert('No campaign selected.');
      return;
    }

    if (!profile?.id && !campaign?.business_name) {
      alert('No business profile found. Go to Dashboard or Settings first.');
      return;
    }

    if (!ensureAccessAllowed()) return;

    const campaignName = campaign.name || campaign.campaign_idea || 'Selected campaign';

    const confirmed = confirm(
      `Regenerate this campaign?\n\n${campaignName}\n\nThis will delete this campaign’s current posts and saved images, then create a fresh 7-day plan.`
    );

    if (!confirmed) return;

    setRegeneratingCampaign(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        alert('You need to sign in before regenerating a campaign.');
        return;
      }

      const activeProfile = profile || {};
      const regenerateUsesWebsiteScan = Boolean(activeProfile.website_url);

      if (regenerateUsesWebsiteScan) {
        const allowed = await checkWeeklyScanLimit(userId);
        if (!allowed) return;
      }

      const { data: oldPosts, error: oldPostsError } = await supabase
        .from('campaign_posts')
        .select('id, image_path')
        .eq('campaign_id', campaign.id);

      if (oldPostsError) {
        alert(oldPostsError.message);
        return;
      }

      const imagePaths = oldPosts?.map((post) => post.image_path).filter(Boolean) || [];

      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(IMAGE_BUCKET)
          .remove(imagePaths);

        if (storageError) {
          console.error('Regenerate image delete error:', storageError.message);
        }
      }

      const { error: deletePostsError } = await supabase
        .from('campaign_posts')
        .delete()
        .eq('campaign_id', campaign.id);

      if (deletePostsError) {
        alert(deletePostsError.message);
        return;
      }

      const response = await axios.post('/api/generatePosts', {
        website: activeProfile.website_url || '',
        clientName: activeProfile.business_name || campaign.business_name || '',
        industry: activeProfile.industry || campaign.business_type || '',
        description: buildBusinessDescription(activeProfile),
        provider: 'gemini',
        requestedOutput: {
          posts:
            'array of 7 post objects with day, platform, title, caption, cta, hashtags, image_prompt',
          business_name: 'detected business name',
          industry: 'detected industry',
          location: 'detected location',
          services: 'array',
          target_audience: 'array',
          tone_of_voice: 'detected tone',
          content_pillars: 'array',
          main_offer: 'main offer or CTA',
          business_goals: 'array',
          brand_primary_color: 'hex code',
          brand_secondary_color: 'hex code',
          brand_accent_color: 'hex code',
          brand_logo_url: 'logo URL or null',
          brand_summary: 'short brand style summary',
        },
      });

      const generatedPosts: GeneratedPost[] = response.data.posts || [];

      if (!generatedPosts.length) {
        alert(response.data.error || 'No posts were generated.');
        return;
      }

      const scanData =
        response.data.businessProfile ||
        response.data.scan ||
        response.data.brief ||
        response.data ||
        {};

      const detectedIndustry =
        scanData?.industry || activeProfile.industry || campaign.business_type || 'General';

      const detectedLocation =
        scanData?.location || activeProfile.location || campaign.location || 'Online';

      const detectedAudience = Array.isArray(scanData?.target_audience)
        ? scanData.target_audience.join(', ')
        : Array.isArray(activeProfile.target_audience)
          ? activeProfile.target_audience.join(', ')
          : campaign.target_audience || '';

      const detectedTone =
        scanData?.tone_of_voice ||
        activeProfile.tone_of_voice ||
        campaign.tone ||
        'Professional';

      const campaignIdea =
        scanData?.campaign_idea ||
        scanData?.brand_summary ||
        campaign.campaign_idea ||
        'Seven-day mixed-platform content campaign';

      const regeneratedName = `${
        activeProfile.business_name || campaign.business_name || 'Campaign'
      } — Regenerated ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

      const { error: campaignUpdateError } = await supabase
        .from('campaigns')
        .update({
          name: regeneratedName,
          business_type: detectedIndustry,
          location: detectedLocation,
          target_audience: detectedAudience,
          campaign_idea: campaignIdea,
          audience: detectedAudience,
          drafts: generatedPosts.length,
          scheduled: generatedPosts.length,
          posted: 0,
          campaign_area: detectedLocation,
          tone: detectedTone,
          posting_frequency: 'Daily',
          platform_plan:
            'Day 1 Facebook, Day 2 Instagram, Day 3 Google Business, Day 4 LinkedIn, Day 5 Instagram, Day 6 TikTok, Day 7 Facebook',
        })
        .eq('id', campaign.id);

      if (campaignUpdateError) {
        alert(campaignUpdateError.message);
        return;
      }

      const today = new Date();

      for (let i = 0; i < generatedPosts.length; i++) {
        const postDate = new Date(today);
        postDate.setDate(today.getDate() + i);
        postDate.setHours(9, 0, 0, 0);

        const post = normaliseGeneratedPost(
          generatedPosts[i],
          i,
          activeProfile,
          detectedIndustry,
          detectedLocation
        );

        const { error: insertPostError } = await supabase.from('campaign_posts').insert({
          user_id: userId,
          campaign_id: campaign.id,
          keyword: detectedIndustry || 'business',
          title: post.title,
          caption: post.caption,
          cta: post.cta,
          hashtags: post.hashtags,
          platform: post.platform,
          type: activeProfile.website_url ? 'website_scan' : 'manual_profile',
          scheduled_day: post.day,
          scheduled_at: postDate.toISOString(),
          status: 'scheduled',
          is_posted: false,
          client_id: campaign.client_id || activeProfile.id || null,
          image_prompt: post.image_prompt,
          reach: 0,
          clicks: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
        });

        if (insertPostError) {
          alert(insertPostError.message);
          return;
        }
      }

      cancelEditingPost();
      setSelectedPostId(null);

      const refreshedCampaigns = await loadCampaigns();
      const refreshedCampaign = refreshedCampaigns.find((item) => item.id === campaign.id) || null;

      setCampaign(refreshedCampaign);
      setSelectedCampaignId(campaign.id);

      await loadPosts(campaign.id);

      if (regenerateUsesWebsiteScan) {
        const admin = await isAdminUser(userId);

        if (!admin) {
          await recordUsageEvent(userId, 'campaign_regenerate', {
            website: activeProfile.website_url,
            client_id: campaign.client_id || activeProfile.id || null,
            campaign_id: campaign.id,
          });
        }
      }

      alert('Campaign regenerated.');
    } catch (error: any) {
      const message = getReadableError(error, 'Error regenerating campaign.');

      if (axios.isAxiosError(error)) {
        console.error('Regenerate campaign readable error:', message);
        console.error('Regenerate campaign status:', error.response?.status);
        console.error('Regenerate campaign response data:', error.response?.data);
      } else {
        console.error('Regenerate campaign error:', error);
      }

      alert(message);
    } finally {
      setRegeneratingCampaign(false);
    }
  };

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error.message);
      setProfile(null);
      return;
    }

    setProfile(data);
  };

  const copyPost = async (post: any) => {
    const caption = post.caption || '';
    const cta = post.cta ? `CTA: ${post.cta}` : '';
    const hashtags = Array.isArray(post.hashtags) ? post.hashtags.join(' ') : '';

    const textToCopy = [caption, cta, hashtags].filter(Boolean).join('\n\n').trim();

    await navigator.clipboard.writeText(textToCopy);
    alert('Post copied.');
  };

  const markAsPosted = async (postId: string) => {
    const { error } = await supabase
      .from('campaign_posts')
      .update({
        is_posted: true,
        status: 'posted',
        posted_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPosts(campaign?.id || null);
  };

  const markAsScheduled = async (postId: string) => {
    const { error } = await supabase
      .from('campaign_posts')
      .update({
        is_posted: false,
        status: 'scheduled',
        posted_at: null,
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
    setEditImagePrompt(post.image_prompt || '');
  };

  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditCaption('');
    setEditCta('');
    setEditHashtags('');
    setEditImagePrompt('');
  };

  const saveEditedPost = async (post: any) => {
    if (!post?.id) return;

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
        image_prompt: editImagePrompt.trim(),
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

  const handleRewriteForAudience = async (post: any) => {
    if (!post?.id) return;

    if (!ensureAccessAllowed()) return;

    const finalAudience =
      audienceTarget === 'Custom audience'
        ? customAudienceTarget.trim()
        : audienceTarget.trim();

    if (!finalAudience) {
      alert('Please enter a custom audience.');
      return;
    }

    if (!post.caption?.trim()) {
      alert('This post needs a caption before it can be rewritten.');
      return;
    }

    setRewritingPost(true);

    try {
      const response = await axios.post('/api/rewritePost', {
        provider: 'gemini',
        audienceTarget: finalAudience,
        businessName: profile?.business_name || campaign?.business_name || 'the business',
        industry: profile?.industry || campaign?.business_type || 'general business',
        platform: post.platform || 'Facebook',
        tone: profile?.tone_of_voice || campaign?.tone || 'Professional',
        caption: post.caption || '',
        cta: post.cta || '',
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        image_prompt: post.image_prompt || '',
      });

      const rewritten = response.data;

      const updates = {
        caption: rewritten.caption,
        cta: rewritten.cta,
        hashtags: Array.isArray(rewritten.hashtags) ? rewritten.hashtags : [],
        image_prompt: rewritten.image_prompt,
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
        setEditImagePrompt(updates.image_prompt || '');
      }

      alert(`Post rewritten for ${finalAudience}.`);
    } catch (error: any) {
      const message = getReadableError(error, 'Error rewriting post.');

      if (axios.isAxiosError(error)) {
        console.error('Audience rewrite readable error:', message);
        console.error('Audience rewrite status:', error.response?.status);
        console.error('Audience rewrite response data:', error.response?.data);
      } else {
        console.error('Audience rewrite non-Axios error:', error);
      }

      alert(message);
    } finally {
      setRewritingPost(false);
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>, post: any) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file || !post?.id) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }

    setUploadingImage(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        alert('You need to sign in before uploading images.');
        return;
      }

      if (post.image_path) {
        await supabase.storage.from(IMAGE_BUCKET).remove([post.image_path]);
      }

      const extension = file.name.split('.').pop() || 'jpg';
      const safePlatform = String(post.platform || 'post')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');

      const imagePath = `${userId}/${post.id}/${safePlatform}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(imagePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        alert(uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(IMAGE_BUCKET)
        .getPublicUrl(imagePath);

      const imageUrl = publicUrlData.publicUrl;

      const updates = {
        image_url: imageUrl,
        image_path: imagePath,
      };

      const { error: updateError } = await supabase
        .from('campaign_posts')
        .update(updates)
        .eq('id', post.id);

      if (updateError) {
        alert(updateError.message);
        return;
      }

      updatePostLocally(post.id, updates);
      alert('Image uploaded.');
    } catch (error: any) {
      const message = getReadableError(error, 'Error uploading image.');
      console.error('Image upload error:', error);
      alert(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const deletePostImage = async (post: any) => {
    if (!post?.id) return;

    if (!post.image_path && !post.image_url) {
      alert('No image saved for this post.');
      return;
    }

    const confirmed = confirm('Delete the saved image for this post?');

    if (!confirmed) return;

    setUploadingImage(true);

    try {
      if (post.image_path) {
        const { error: storageError } = await supabase.storage
          .from(IMAGE_BUCKET)
          .remove([post.image_path]);

        if (storageError) {
          console.error('Storage delete error:', storageError.message);
        }
      }

      const updates = {
        image_url: null,
        image_path: null,
      };

      const { error: updateError } = await supabase
        .from('campaign_posts')
        .update(updates)
        .eq('id', post.id);

      if (updateError) {
        alert(updateError.message);
        return;
      }

      updatePostLocally(post.id, updates);
      alert('Image deleted.');
    } catch (error: any) {
      const message = getReadableError(error, 'Error deleting image.');
      console.error('Delete image error:', error);
      alert(message);
    } finally {
      setUploadingImage(false);
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
    };

    window.open(urls[platform] || 'https://www.google.com', '_blank');
  };

  const selectedPost = useMemo(() => {
    return posts.find((post) => post.id === selectedPostId) || posts[0] || null;
  }, [posts, selectedPostId]);

  const postedCount = posts.filter((post) => post.is_posted).length;

  const businessName =
    profile?.business_name ||
    campaign?.business_name ||
    selectedPost?.business_name ||
    'Your business';

  const services = Array.isArray(profile?.services) ? profile.services : [];
  const contentPillars = Array.isArray(profile?.content_pillars) ? profile.content_pillars : [];
  const audience = Array.isArray(profile?.target_audience) ? profile.target_audience : [];
  const goals = Array.isArray(profile?.business_goals) ? profile.business_goals : [];

  const brandPrimary = profile?.brand_primary_color || '#ffd43b';
  const brandSecondary = profile?.brand_secondary_color || '#101420';
  const brandAccent = profile?.brand_accent_color || '#3ddc97';

  const brandStyle = {
    '--client-primary': brandPrimary,
    '--client-secondary': brandSecondary,
    '--client-accent': brandAccent,
  } as CSSProperties;

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

  const filterButtons: { label: string; value: PostFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Ready', value: 'scheduled' },
    { label: 'Posted', value: 'posted' },
  ];

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
          <p>Loading campaign...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="premium-card">
          <div className="page-eyebrow">No Campaign Yet</div>
          <h2 style={{ marginTop: 0 }}>Generate your weekly campaign first.</h2>
          <p>
            Go to Dashboard, scan the website, and generate the week. Your campaign will
            then appear here ready to publish manually.
          </p>
        </div>
      ) : (
        <>
          {accessLocked && (
            <section className="access-status-card access-status-locked">
              <div>
                <div className="page-eyebrow">Demo Ended</div>
                <h2>Some campaign actions are currently locked.</h2>
                <p>{accessMessage}</p>
              </div>

              <a href="/subscription" className="dashboard-profile-link">
                View subscription options
              </a>
            </section>
          )}

          <section className="simplified-control-card">
            <div ref={campaignHistoryControlsRef} className="simplified-campaign-controls">
              <label>
                <strong>Campaign week</strong>
                <select
                  className="input"
                  value={selectedCampaignId || ''}
                  onChange={(event) => switchCampaign(event.target.value)}
                  disabled={
                    deletingCampaign ||
                    regeneratingCampaign ||
                    duplicatingCampaign ||
                    renamingCampaign
                  }
                >
                  {campaigns.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getCampaignOptionLabel(item)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="manage-campaign-wrap">
                <strong className="campaign-control-label">&nbsp;</strong>

                <details className="manage-campaign-details">
                  <summary>Manage campaign</summary>

                  <div className="manage-campaign-actions">
                    <span>
                      {campaigns.length}/{MAX_SAVED_CAMPAIGNS} campaigns saved
                    </span>

                    <button
                      className="secondary-button rename-campaign-button"
                      onClick={renameSelectedCampaign}
                      disabled={
                        !campaign?.id ||
                        renamingCampaign ||
                        duplicatingCampaign ||
                        regeneratingCampaign ||
                        deletingCampaign
                      }
                    >
                      {renamingCampaign ? 'Renaming...' : 'Rename'}
                    </button>

                    <button
                      className="secondary-button duplicate-campaign-button"
                      onClick={duplicateSelectedCampaign}
                      disabled={
                        accessLocked ||
                        !campaign?.id ||
                        duplicatingCampaign ||
                        renamingCampaign ||
                        regeneratingCampaign ||
                        deletingCampaign
                      }
                    >
                      {duplicatingCampaign ? 'Duplicating...' : 'Duplicate'}
                    </button>

                    <button
                      className="secondary-button regenerate-campaign-button"
                      onClick={regenerateSelectedCampaign}
                      disabled={
                        accessLocked ||
                        !campaign?.id ||
                        regeneratingCampaign ||
                        duplicatingCampaign ||
                        renamingCampaign ||
                        deletingCampaign
                      }
                    >
                      {regeneratingCampaign ? 'Regenerating...' : 'Regenerate'}
                    </button>

                    <button
                      className="secondary-button danger-button delete-campaign-button"
                      onClick={deleteSelectedCampaign}
                      disabled={
                        !campaign?.id ||
                        deletingCampaign ||
                        duplicatingCampaign ||
                        renamingCampaign ||
                        regeneratingCampaign
                      }
                    >
                      {deletingCampaign ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </details>
              </div>
            </div>

            <details className="business-details-collapsed branded-business-details">
              <summary>
                <span className="branded-business-summary-left">
                  {profile?.brand_logo_url ? (
                    <img src={profile.brand_logo_url} alt={`${businessName} logo`} />
                  ) : (
                    <b>{businessName.charAt(0).toUpperCase()}</b>
                  )}

                  <span>
                    <strong>{businessName}</strong>
                    <small>Business details</small>
                  </span>
                </span>
              </summary>

              <div className="business-details-simple-grid">
                <div>
                  <strong>Services</strong>
                  {services.length > 0 ? (
                    services.map((item: string) => <span key={item}>• {item}</span>)
                  ) : (
                    <span>• Based on saved profile</span>
                  )}
                </div>

                <div>
                  <strong>Content ideas</strong>
                  {contentPillars.length > 0 ? (
                    contentPillars.map((item: string) => <span key={item}>• {item}</span>)
                  ) : (
                    <span>• Trust, expertise, useful advice, offers</span>
                  )}
                </div>

                <div>
                  <strong>Audience</strong>
                  {audience.length > 0 ? (
                    audience.map((item: string) => <span key={item}>• {item}</span>)
                  ) : (
                    <span>• Website target audience</span>
                  )}
                </div>

                <div>
                  <strong>Goals</strong>
                  {goals.length > 0 ? (
                    goals.map((item: string) => <span key={item}>• {item}</span>)
                  ) : (
                    <span>• Contact, bookings, enquiries</span>
                  )}
                </div>
              </div>
            </details>
          </section>

          <section className="simplified-week-section">
            <div className="simplified-section-heading">
              <div>
                <div className="page-eyebrow">Weekly posts</div>
                <h2>Choose a day to review.</h2>
              </div>

              <div className="posts-filter-row campaign-filter-row">
                {filterButtons.map((item) => (
                  <button
                    key={item.value}
                    className={filter === item.value ? 'posts-filter-active' : 'secondary-button'}
                    onClick={() => setFilter(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {posts.length === 0 ? (
              <div className="premium-card" style={{ marginTop: 20 }}>
                <div className="page-eyebrow">No Posts Found</div>
                <h2 style={{ marginTop: 0 }}>This campaign has no posts for this filter.</h2>
                <p>Try switching the filter back to All or Ready.</p>
              </div>
            ) : (
              <>
                <div
                  ref={daySelectorRef}
                  className="day-carousel-wrap no-more-days simplified-day-wrap"
                >
                  <div className="day-carousel-track no-scroll-carousel">
                    {posts.map((post, index) => (
                      <button
                        key={post.id}
                        type="button"
                        className={
                          selectedPost?.id === post.id
                            ? 'day-select-button carousel-day-card active'
                            : 'day-select-button carousel-day-card'
                        }
                        onClick={() => {
                          setSelectedPostId(post.id);
                          cancelEditingPost();
                        }}
                      >
                        <span>{post.scheduled_day || `Day ${index + 1}`}</span>
                        <strong>{post.platform || 'Facebook'}</strong>
                        <small>
                          {isPostScheduledToday(post) && !post.is_posted
                            ? 'Start here'
                            : post.audience_target
                              ? `For ${post.audience_target}`
                              : post.is_posted
                                ? 'Posted'
                                : 'Ready'}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPost && (
                  <article className="selected-post-panel clean-selected-post simplified-selected-post">
                    <div className="selected-post-main">
                      <div className="selected-post-tags">
                        <span>{selectedPost.scheduled_day || 'Day 1'}</span>
                        <span>{selectedPost.platform || 'Facebook'}</span>
                        <span>{selectedPost.is_posted ? 'Posted' : 'Ready'}</span>
                        {isPostScheduledToday(selectedPost) && !selectedPost.is_posted && (
                          <span>Start here</span>
                        )}
                        {selectedPost.audience_target && (
                          <span>For {selectedPost.audience_target}</span>
                        )}
                      </div>

                      <h2>{selectedPost.title || 'Social Media Post'}</h2>

                      <div className="publish-checklist-card">
                        <div>
                          <div className="page-eyebrow">Simple steps</div>
                          <h3>Publish this post</h3>
                          <p>Follow these steps in order. No guessing needed.</p>
                        </div>

                        <ol className="publish-checklist">
                          <li className="is-complete">
                            <span>1</span>
                            <strong>Read the post</strong>
                          </li>

                          <li className={selectedPost.image_url ? 'is-complete' : ''}>
                            <span>2</span>
                            <strong>Add image</strong>
                          </li>

                          <li>
                            <span>3</span>
                            <strong>Copy post</strong>
                          </li>

                          <li>
                            <span>4</span>
                            <strong>Open {selectedPost.platform || 'platform'}</strong>
                          </li>

                          <li className={selectedPost.is_posted ? 'is-complete' : ''}>
                            <span>5</span>
                            <strong>Mark as posted</strong>
                          </li>
                        </ol>
                      </div>

                      <div
                        ref={audienceToolRef}
                        className="audience-rewrite-panel simplified-audience-panel"
                      >
                        <div>
                          <div className="page-eyebrow">Optional</div>
                          <h3>Rewrite for a customer type</h3>
                          <p>
                            Use this only if you want the post to speak to a specific audience.
                          </p>
                        </div>

                        <div className="audience-rewrite-controls">
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

                          <button
                            onClick={() => handleRewriteForAudience(selectedPost)}
                            disabled={accessLocked || rewritingPost}
                          >
                            {rewritingPost ? 'Rewriting...' : 'Rewrite'}
                          </button>
                        </div>
                      </div>

                      {editingPostId === selectedPost.id ? (
                        <div className="post-edit-panel">
                          <div className="post-edit-panel-header">
                            <div>
                              <div className="page-eyebrow">Edit Post</div>
                              <h3>Fine-tune the post before publishing.</h3>
                              <p>
                                Adjust the wording, CTA, hashtags, and image idea. These
                                changes save back to this post.
                              </p>
                            </div>
                          </div>

                          <div className="post-edit-grid">
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
                              <span>Separate with spaces or commas.</span>
                              <input
                                className="input"
                                value={editHashtags}
                                onChange={(event) => setEditHashtags(event.target.value)}
                                placeholder="#LocalBusiness #Marketing"
                              />
                            </label>

                            <label>
                              <strong>Image prompt</strong>
                              <textarea
                                className="input"
                                value={editImagePrompt}
                                onChange={(event) => setEditImagePrompt(event.target.value)}
                              />
                            </label>
                          </div>

                          <div className="post-edit-actions">
                            <button
                              className="save-edit-button"
                              onClick={() => saveEditedPost(selectedPost)}
                              disabled={savingEdit}
                            >
                              {savingEdit ? 'Saving...' : 'Save changes'}
                            </button>

                            <button
                              className="cancel-edit-button"
                              onClick={cancelEditingPost}
                              disabled={savingEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          ref={editPostRef}
                          className="edit-post-button"
                          onClick={() => startEditingPost(selectedPost)}
                        >
                          Edit post
                        </button>
                      )}

                      <div className="selected-post-copy">
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

                      <details className="suggested-image-details">
                        <summary>Suggested image</summary>
                        <p>
                          {selectedPost.image_prompt ||
                            'Use a clean, professional image that supports the message of this post.'}
                        </p>
                      </details>
                    </div>

                    <aside
                      ref={publishingPanelRef}
                      className="manual-publishing-panel simplified-publishing-panel"
                    >
                      <div className="page-eyebrow">Publish this post</div>

                      <div className="manual-image-placeholder uploaded-image-box">
                        {selectedPost.image_url ? (
                          <img src={selectedPost.image_url} alt="Uploaded post image" />
                        ) : (
                          <>
                            <strong>No image uploaded</strong>
                            <p>Upload the image you want to use for this post.</p>
                          </>
                        )}
                      </div>

                      <label className="upload-image-button">
                        ⇪ Upload image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleImageUpload(event, selectedPost)}
                          disabled={uploadingImage}
                        />
                      </label>

                      <button
                        className="secondary-button danger-button"
                        onClick={() => deletePostImage(selectedPost)}
                        disabled={
                          uploadingImage ||
                          (!selectedPost.image_url && !selectedPost.image_path)
                        }
                      >
                        Delete image
                      </button>

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
                    </aside>
                  </article>
                )}
              </>
            )}
          </section>
        </>
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
              <button
                type="button"
                className="secondary-button"
                onClick={closePostsTour}
              >
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