'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

type SocialConnection = {
  id: string;
  provider: string;
  provider_user_name: string | null;
  page_id: string | null;
  page_name: string | null;
  instagram_business_account_id: string | null;
  instagram_username: string | null;
  google_account_id?: string | null;
  google_account_name?: string | null;
  google_location_id?: string | null;
  google_location_name?: string | null;
  status: string | null;
  updated_at: string | null;
};

type WeeklyProgress = {
  total: number;
  posted: number;
  remaining: number;
  nextPost: any | null;
};

type PlatformOption = {
  name: string;
  shortName: string;
  description: string;
};

const availablePlatforms: PlatformOption[] = [
  {
    name: 'Facebook',
    shortName: 'Facebook',
    description: 'Local updates, trust posts, offers, and community content.',
  },
  {
    name: 'Instagram',
    shortName: 'Instagram',
    description: 'Visual captions, reels ideas, stories, and brand-led posts.',
  },
  {
    name: 'Google',
    shortName: 'Google',
    description: 'Search-friendly updates for local visibility and enquiries.',
  },
  {
    name: 'LinkedIn',
    shortName: 'LinkedIn',
    description: 'Professional posts that build credibility and authority.',
  },
  {
    name: 'TikTok',
    shortName: 'TikTok',
    description: 'Short-form video ideas, hooks, and simple talking points.',
  },
  {
    name: 'YouTube Shorts',
    shortName: 'Shorts',
    description: 'Short video scripts and quick educational post ideas.',
  },
  {
    name: 'X / Twitter',
    shortName: 'X',
    description: 'Short tips, updates, opinions, and quick announcements.',
  },
  {
    name: 'Pinterest',
    shortName: 'Pinterest',
    description: 'Visual discovery posts for inspiration-led businesses.',
  },
];

const marketReachOptions = [
  {
    value: 'Local customers',
    title: 'Local',
    description:
      'Best for trades, local services, venues, clinics, and businesses serving one area.',
  },
  {
    value: 'Nationwide customers',
    title: 'Nationwide',
    description: 'Best for businesses that work across the UK or want broader reach.',
  },
  {
    value: 'Online customers',
    title: 'Online',
    description: 'Best for ecommerce, digital services, remote offers, and online-first brands.',
  },
];

const postingFrequencyOptions = [
  {
    value: 3,
    title: '3 days',
    description: 'A light weekly plan for businesses that want simple consistency.',
  },
  {
    value: 5,
    title: '5 days',
    description: 'A steady weekday plan for regular visibility.',
  },
  {
    value: 7,
    title: '7 days',
    description: 'A full weekly plan for maximum activity.',
  },
];

const defaultSelectedPlatforms = ['Facebook', 'Instagram', 'Google', 'LinkedIn'];
const PLATFORM_CAROUSEL_VISIBLE_COUNT = 3;

const recommendedPlatformsByIndustry: Record<string, string[]> = {
  plumbing: ['Facebook', 'Google', 'LinkedIn'],
  plumber: ['Facebook', 'Google', 'LinkedIn'],
  electrician: ['Facebook', 'Google', 'LinkedIn'],
  electrical: ['Facebook', 'Google', 'LinkedIn'],
  roofing: ['Facebook', 'Google', 'LinkedIn'],
  roofer: ['Facebook', 'Google', 'LinkedIn'],
  building: ['Facebook', 'Google', 'LinkedIn'],
  construction: ['Facebook', 'Google', 'LinkedIn'],
  landscaping: ['Facebook', 'Instagram', 'Google'],
  gardener: ['Facebook', 'Instagram', 'Google'],
  signage: ['Instagram', 'Facebook', 'LinkedIn', 'Google'],
  print: ['Instagram', 'Facebook', 'LinkedIn', 'Google'],
  beauty: ['Instagram', 'TikTok', 'Facebook', 'Pinterest'],
  hair: ['Instagram', 'TikTok', 'Facebook', 'Pinterest'],
  salon: ['Instagram', 'TikTok', 'Facebook', 'Pinterest'],
  aesthetics: ['Instagram', 'TikTok', 'Facebook', 'Pinterest'],
  fitness: ['Instagram', 'TikTok', 'YouTube Shorts', 'Facebook'],
  gym: ['Instagram', 'TikTok', 'YouTube Shorts', 'Facebook'],
  restaurant: ['Instagram', 'TikTok', 'Facebook', 'Google'],
  cafe: ['Instagram', 'TikTok', 'Facebook', 'Google'],
  food: ['Instagram', 'TikTok', 'Facebook', 'Google'],
  bakery: ['Instagram', 'TikTok', 'Facebook', 'Google'],
  estate: ['Facebook', 'LinkedIn', 'Google', 'Instagram'],
  property: ['Facebook', 'LinkedIn', 'Google', 'Instagram'],
  accounting: ['LinkedIn', 'Google', 'Facebook'],
  accountant: ['LinkedIn', 'Google', 'Facebook'],
  legal: ['LinkedIn', 'Google', 'Facebook'],
  solicitor: ['LinkedIn', 'Google', 'Facebook'],
  dental: ['Instagram', 'Facebook', 'Google'],
  dentist: ['Instagram', 'Facebook', 'Google'],
  mechanic: ['Facebook', 'Google', 'Instagram'],
  garage: ['Facebook', 'Google', 'Instagram'],
  ecommerce: ['Instagram', 'TikTok', 'Pinterest', 'Facebook'],
  shop: ['Instagram', 'TikTok', 'Pinterest', 'Facebook'],
  retail: ['Instagram', 'TikTok', 'Pinterest', 'Facebook'],
};

const platformFallback = [
  'Facebook',
  'Instagram',
  'Google',
  'LinkedIn',
  'Instagram',
  'TikTok',
  'Facebook',
];

const WEEKLY_SCAN_LIMIT = 2;
const MAX_SAVED_CAMPAIGNS = 4;
const WEBSITE_SCAN_EVENT_TYPES = ['website_scan', 'campaign_regenerate'];

const DASHBOARD_TOUR_SEEN_KEY = 'fromone_dashboard_tour_seen';

const dashboardTourSteps = [
  {
    title: 'Welcome to your dashboard',
    text:
      'This is where you create weekly posts. Set up the business, choose who you want to reach, select platforms, then create the plan.',
    target: 'header',
  },
  {
    title: 'Add the website',
    text:
      'If the business has a website, paste it here. FromOne uses it to understand the services, audience, tone, and offer.',
    target: 'website',
  },
  {
    title: 'Choose the reach',
    text:
      'Tell FromOne whether the posts should focus on local customers, nationwide customers, or online customers.',
    target: 'reach',
  },
  {
    title: 'Choose social platforms',
    text:
      'Select where you want FromOne to create posts for this week. Use the recommended platforms or choose your own.',
    target: 'platforms',
  },
  {
    title: 'Create weekly posts',
    text:
      'Once the website or business details, reach, and platforms are ready, create the right number of ready-to-use posts for the week.',
    target: 'generate',
  },
  {
    title: 'No website? Add business details',
    text:
      'If there is no website, use this section to add the business details instead.',
    target: 'manual',
  },
  {
    title: 'Review your posts',
    text:
      'After creating the weekly posts, open Posts to review, copy, publish manually, and mark posts as done.',
    target: 'posts',
  },
];

const customerReadyChecklist = [
  {
    key: 'business',
    title: 'Add business profile',
    description: 'Add a website or save the business details manually.',
  },
  {
    key: 'facebook',
    title: 'Connect Facebook',
    description: 'Connect the Facebook Page FromOne should publish to.',
  },
  {
    key: 'instagram',
    title: 'Connect Instagram',
    description: 'Connect the Instagram professional account for direct posting.',
  },
  {
    key: 'google',
    title: 'Connect Google',
    description: 'Google is connected now; publishing waits for Google API approval.',
  },
  {
    key: 'weekly_plan',
    title: 'Create first weekly plan',
    description: 'Generate the first weekly content plan.',
  },
  {
    key: 'scheduled_post',
    title: 'Schedule first post',
    description: 'Set at least one post to publish automatically.',
  },
  {
    key: 'billing',
    title: 'Choose billing plan',
    description: 'Move from demo access to a paid plan when ready.',
  },
];

export default function DashboardPage() {
  const router = useRouter();

  const [client, setClient] = useState<any>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [savingWebsite, setSavingWebsite] = useState(false);
  const [showManualProfile, setShowManualProfile] = useState(false);
  const [savingManualProfile, setSavingManualProfile] = useState(false);
  const [weeklyScansUsed, setWeeklyScansUsed] = useState(0);
  const [savedCampaignsCount, setSavedCampaignsCount] = useState(0);
  const [todayPost, setTodayPost] = useState<any>(null);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [hasScheduledPost, setHasScheduledPost] = useState(false);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(defaultSelectedPlatforms);
  const [platformCarouselStart, setPlatformCarouselStart] = useState(0);
  const [selectedMarketReach, setSelectedMarketReach] = useState('Local customers');
  const [selectedPostingFrequency, setSelectedPostingFrequency] = useState(7);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress>({
    total: 0,
    posted: 0,
    remaining: 0,
    nextPost: null,
  });

  const [showDashboardTour, setShowDashboardTour] = useState(false);
  const [dashboardTourStep, setDashboardTourStep] = useState(0);

  const dashboardHeaderRef = useRef<HTMLDivElement | null>(null);
  const websiteInputRef = useRef<HTMLDivElement | null>(null);
  const marketReachRef = useRef<HTMLDivElement | null>(null);
  const platformSelectorRef = useRef<HTMLDivElement | null>(null);
  const generateButtonRef = useRef<HTMLButtonElement | null>(null);
  const manualButtonRef = useRef<HTMLButtonElement | null>(null);
  const manualProfileSectionRef = useRef<HTMLDivElement | null>(null);
  const postsLinkRef = useRef<HTMLSpanElement | null>(null);

  const [tourRect, setTourRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [accessLocked, setAccessLocked] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');

  const [manualBusinessName, setManualBusinessName] = useState('');
  const [manualIndustry, setManualIndustry] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [manualServices, setManualServices] = useState('');
  const [manualAudience, setManualAudience] = useState('');
  const [manualTone, setManualTone] = useState('Professional');
  const [manualMainOffer, setManualMainOffer] = useState('');
  const [manualGoals, setManualGoals] = useState('');
  const [manualContentPillars, setManualContentPillars] = useState('');

  useEffect(() => {
    fetchClient();

    const tourSeen = localStorage.getItem(DASHBOARD_TOUR_SEEN_KEY) === 'true';
    const isMobile = window.innerWidth <= 760;

    if (!tourSeen && !isMobile) {
      setShowDashboardTour(true);
    }
  }, []);

  useEffect(() => {
    if (!showDashboardTour || loading) return;

    const target = getCurrentTourTarget();

    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }

    const timer = window.setTimeout(() => {
      updateTourRect();
    }, 420);

    window.addEventListener('resize', updateTourRect);
    window.addEventListener('scroll', updateTourRect, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updateTourRect);
      window.removeEventListener('scroll', updateTourRect, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDashboardTour, dashboardTourStep, loading, showManualProfile]);

  const getRecommendedPlatforms = (industryValue?: string | null) => {
    const industry = String(industryValue || '').toLowerCase();

    const matchedKey = Object.keys(recommendedPlatformsByIndustry).find((key) =>
      industry.includes(key)
    );

    return matchedKey
      ? recommendedPlatformsByIndustry[matchedKey]
      : defaultSelectedPlatforms;
  };

  const recommendedPlatforms = useMemo(() => {
    return getRecommendedPlatforms(client?.industry || manualIndustry);
  }, [client?.industry, manualIndustry]);

  const visiblePlatformCards = useMemo(() => {
    return availablePlatforms.slice(
      platformCarouselStart,
      platformCarouselStart + PLATFORM_CAROUSEL_VISIBLE_COUNT
    );
  }, [platformCarouselStart]);

  const handleShowMorePlatforms = () => {
    setPlatformCarouselStart((currentStart) => {
      const nextStart = currentStart + PLATFORM_CAROUSEL_VISIBLE_COUNT;
      return nextStart >= availablePlatforms.length ? 0 : nextStart;
    });
  };

  const togglePlatform = (platformName: string) => {
    setSelectedPlatforms((currentPlatforms) => {
      if (currentPlatforms.includes(platformName)) {
        if (currentPlatforms.length === 1) {
          alert('Please choose at least one platform.');
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

  const buildPlatformPlanText = (platforms: string[]) => {
    const safePlatforms = platforms.length > 0 ? platforms : defaultSelectedPlatforms;
    const postCount = Math.max(1, Math.min(selectedPostingFrequency, 7));

    return Array.from({ length: postCount })
      .map((_, index) => {
        const platform = safePlatforms[index % safePlatforms.length];
        return `Day ${index + 1} ${platform}`;
      })
      .join(', ');
  };

  const closeDashboardTour = () => {
    localStorage.setItem(DASHBOARD_TOUR_SEEN_KEY, 'true');
    setShowDashboardTour(false);
    setDashboardTourStep(0);
    setTourRect(null);
    setShowManualProfile(false);
  };

  const restartDashboardTour = () => {
    setDashboardTourStep(0);
    setTourRect(null);
    setShowManualProfile(false);
    setShowDashboardTour(true);
  };

  const goToNextTourStep = () => {
    if (dashboardTourStep >= dashboardTourSteps.length - 1) {
      closeDashboardTour();
      return;
    }

    const nextStep = dashboardTourStep + 1;
    const nextTarget = dashboardTourSteps[nextStep]?.target;
    const currentTarget = dashboardTourSteps[dashboardTourStep]?.target;

    if (nextTarget === 'manual') {
      setShowManualProfile(true);
    }

    if (currentTarget === 'manual' && nextTarget !== 'manual') {
      setShowManualProfile(false);
    }

    setDashboardTourStep(nextStep);
  };

  const goToPreviousTourStep = () => {
    const previousStep = Math.max(0, dashboardTourStep - 1);
    const previousTarget = dashboardTourSteps[previousStep]?.target;
    const currentTarget = dashboardTourSteps[dashboardTourStep]?.target;

    if (previousTarget === 'manual') {
      setShowManualProfile(true);
    }

    if (currentTarget === 'manual' && previousTarget !== 'manual') {
      setShowManualProfile(false);
    }

    setDashboardTourStep(previousStep);
  };

  const getCurrentTourTarget = () => {
    const currentTarget = dashboardTourSteps[dashboardTourStep]?.target;

    if (currentTarget === 'header') return dashboardHeaderRef.current;
    if (currentTarget === 'website') return websiteInputRef.current;
    if (currentTarget === 'reach') return marketReachRef.current;
    if (currentTarget === 'platforms') return platformSelectorRef.current;
    if (currentTarget === 'generate') return generateButtonRef.current;

    if (currentTarget === 'manual') {
      return manualProfileSectionRef.current || manualButtonRef.current;
    }

    if (currentTarget === 'posts') return postsLinkRef.current;

    return null;
  };

  const updateTourRect = () => {
    const target = getCurrentTourTarget();

    if (!target) {
      setTourRect(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    const padding = 10;

    setTourRect({
      top: Math.max(rect.top - padding, 12),
      left: Math.max(rect.left - padding, 12),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });
  };

  const getTourTooltipStyle = () => {
    if (!tourRect || typeof window === 'undefined') return {};

    if (window.innerWidth <= 760) {
      return {};
    }

    const cardWidth = 420;
    const estimatedCardHeight = 330;
    const gap = 42;
    const safePadding = 26;

    const spaceBelow = window.innerHeight - (tourRect.top + tourRect.height);
    const spaceAbove = tourRect.top;
    const spaceRight = window.innerWidth - (tourRect.left + tourRect.width);
    const spaceLeft = tourRect.left;

    let top = tourRect.top + tourRect.height + gap;
    let left = tourRect.left + tourRect.width / 2 - cardWidth / 2;

    if (spaceBelow >= estimatedCardHeight + gap) {
      top = tourRect.top + tourRect.height + gap;
      left = tourRect.left + tourRect.width / 2 - cardWidth / 2;
    } else if (spaceAbove >= estimatedCardHeight + gap) {
      top = tourRect.top - estimatedCardHeight - gap;
      left = tourRect.left + tourRect.width / 2 - cardWidth / 2;
    } else if (spaceRight >= cardWidth + gap) {
      top = tourRect.top;
      left = tourRect.left + tourRect.width + gap;
    } else if (spaceLeft >= cardWidth + gap) {
      top = tourRect.top;
      left = tourRect.left - cardWidth - gap;
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

  const getErrorMessage = (error: any) => {
    if (!error) return 'Unknown error.';

    if (typeof error === 'string') return error;

    if (axios.isAxiosError(error)) {
      return (
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data?.details ||
        error.message ||
        'Request failed.'
      );
    }

    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.response?.data) return JSON.stringify(error.response.data, null, 2);

    if (error?.message) return error.message;
    if (error?.error_description) return error.error_description;
    if (error?.details) return error.details;
    if (error?.hint) return error.hint;

    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return 'Unknown error creating or saving posts.';
    }
  };

  const throwSupabaseError = (error: any) => {
    throw new Error(
      error?.message ||
        error?.details ||
        error?.hint ||
        error?.code ||
        JSON.stringify(error) ||
        'Supabase error.'
    );
  };

  const isFutureDate = (value?: string | null) => {
    if (!value) return false;
    return new Date(value).getTime() > Date.now();
  };

  const isPaidSubscription = (status?: string | null) => {
    return ['active', 'paid', 'trialing'].includes(String(status || '').toLowerCase());
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

  const loadSocialConnections = async (userId: string) => {
    try {
      const params = new URLSearchParams();
      params.set('user_id', userId);

      const response = await fetch(`/api/social-connections?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Could not load connected accounts.');
      }

      setSocialConnections(result?.connections || []);
    } catch (error: any) {
      console.error('Error loading connected accounts:', error?.message || error);
      setSocialConnections([]);
    }
  };

  const loadScheduledPostStatus = async (userId: string) => {
    const { count, error } = await supabase
      .from('campaign_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('scheduled_publish_at', 'is', null)
      .neq('publish_status', 'posted');

    if (error) {
      console.error('Error loading scheduled post status:', error.message);
      setHasScheduledPost(false);
      return;
    }

    setHasScheduledPost((count || 0) > 0);
  };

  const loadWeeklyProgress = async (userId: string) => {
    const startOfWeek = getStartOfWeek();
    const endOfWeek = getEndOfWeek();

    const { data, error } = await supabase
      .from('campaign_posts')
      .select('*')
      .eq('user_id', userId)
      .gte('scheduled_at', startOfWeek.toISOString())
      .lte('scheduled_at', endOfWeek.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error loading weekly progress:', error.message);
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
      posts.find((post) => !post.is_posted && new Date(post.scheduled_at).getTime() >= Date.now()) ||
      posts.find((post) => !post.is_posted) ||
      null;

    setWeeklyProgress({
      total: posts.length,
      posted,
      remaining,
      nextPost,
    });
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
        'Your 7-day demo has ended. You can still view existing posts, but creating new weekly posts is locked until access is extended or a subscription is active.',
    };
  };

  const loadOrCreateAccess = async (userId: string) => {
    const { data: existingAccess, error: accessLoadError } = await supabase
      .from('user_access')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (accessLoadError) {
      console.error('Error loading user access:', accessLoadError.message);
      setAccessInfo(null);
      setAccessLocked(false);
      setAccessMessage('Access check unavailable.');
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
      .from('user_access')
      .upsert(
        {
          user_id: userId,
          access_status: 'trial',
          trial_started_at: trialStartedAt.toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
          subscription_status: 'none',
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (accessUpsertError) {
      console.error('Error creating user access:', accessUpsertError.message);

      const { data: fallbackAccess, error: fallbackError } = await supabase
        .from('user_access')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fallbackError || !fallbackAccess) {
        setAccessInfo(null);
        setAccessLocked(false);
        setAccessMessage('Access check unavailable.');
        return;
      }

      const access = fallbackAccess as AccessInfo;
      const calculated = calculateAccess(access);

      setAccessInfo(access);
      setAccessLocked(calculated.locked);
      setAccessMessage(calculated.message);
      return;
    }

    const access = newAccess as AccessInfo;
    const calculated = calculateAccess(access);

    setAccessInfo(access);
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
      setWeeklyScansUsed(0);
      return 0;
    }

    const used = count || 0;
    setWeeklyScansUsed(used);
    return used;
  };

  const isAdminUser = async (userId: string) => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      const message = error.message || '';

      if (
        message.includes("Could not find the table 'public.admin_users'") ||
        message.includes('admin_users') ||
        error.code === 'PGRST205'
      ) {
        return false;
      }

      console.warn('Admin check unavailable:', message);
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
        `You have used your ${WEEKLY_SCAN_LIMIT} website scans for this 7-day period. You can still create weekly posts using the business details route.`
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
      return;
    }

    await loadWeeklyScanUsage(userId);
  };

  const loadSavedCampaignCount = async (userId: string) => {
    const { count, error } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error loading weekly plan count:', error.message);
      setSavedCampaignsCount(0);
      return 0;
    }

    const total = count || 0;
    setSavedCampaignsCount(total);
    return total;
  };

  const checkSavedCampaignLimit = async (userId: string) => {
    const total = await loadSavedCampaignCount(userId);

    if (total >= MAX_SAVED_CAMPAIGNS) {
      alert(
        `You already have ${MAX_SAVED_CAMPAIGNS} saved weekly plans. Delete an old weekly plan from Posts before creating a new one.`
      );
      return false;
    }

    return true;
  };

  const loadTodayPost = async (userId: string) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('campaign_posts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_posted', false)
      .gte('scheduled_at', startOfToday.toISOString())
      .lte('scheduled_at', endOfToday.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading today post:', error.message);
      setTodayPost(null);
      return;
    }

    setTodayPost(data);
  };

  const getSafeAuthUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      const message = error.message || '';

      if (
        message.includes('Invalid Refresh Token') ||
        message.includes('Refresh Token Not Found') ||
        message.includes('refresh_token_not_found')
      ) {
        await supabase.auth.signOut({ scope: 'local' });

        if (typeof window !== 'undefined') {
          localStorage.removeItem(DASHBOARD_TOUR_SEEN_KEY);
        }

        router.replace('/login');
        return null;
      }

      console.error('Auth user error:', error.message);
      return null;
    }

    return data.user || null;
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
      loadSavedCampaignCount(userId),
      loadOrCreateAccess(userId),
      loadTodayPost(userId),
      loadWeeklyProgress(userId),
      loadSocialConnections(userId),
      loadScheduledPostStatus(userId),
    ]);

    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading business profile:', error);
      setClient(null);
      setWebsiteUrl('');
    } else {
      setClient(data);
      setWebsiteUrl(data?.website_url || '');

      if (data) {
        setManualBusinessName(data.business_name || '');
        setManualIndustry(data.industry || '');
        setManualLocation(data.location || '');
        setManualServices(Array.isArray(data.services) ? data.services.join(', ') : '');
        setManualAudience(
          Array.isArray(data.target_audience) ? data.target_audience.join(', ') : ''
        );
        setManualTone(data.tone_of_voice || 'Professional');
        setManualMainOffer(data.main_offer || '');
        setManualGoals(Array.isArray(data.business_goals) ? data.business_goals.join(', ') : '');
        setManualContentPillars(
          Array.isArray(data.content_pillars) ? data.content_pillars.join(', ') : ''
        );

        const industry = String(data.industry || '').toLowerCase();

        if (industry.includes('ecommerce') || industry.includes('online')) {
          setSelectedMarketReach('Online customers');
        } else if (data.location) {
          setSelectedMarketReach('Local customers');
        }

        const recommendedForLoadedProfile = getRecommendedPlatforms(data.industry);

        setSelectedPlatforms((currentPlatforms) => {
          const isDefaultSelection =
            currentPlatforms.length === defaultSelectedPlatforms.length &&
            defaultSelectedPlatforms.every((platform) => currentPlatforms.includes(platform));

          return isDefaultSelection ? recommendedForLoadedProfile : currentPlatforms;
        });
      }
    }

    setLoading(false);
  };

  const normaliseWebsiteUrl = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return '';

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    return `https://${trimmed}`;
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

  const getBusinessLocation = (profile?: any) => {
    return String(profile?.location || manualLocation || '').trim();
  };

  const getMarketReachContext = (profile?: any) => {
    const location = getBusinessLocation(profile);

    if (selectedMarketReach === 'Local customers' && location) {
      return `Local customers in and around ${location}`;
    }

    if (selectedMarketReach === 'Nationwide customers') {
      return 'Nationwide customers across the UK';
    }

    if (selectedMarketReach === 'Online customers') {
      return 'Online customers';
    }

    return selectedMarketReach;
  };
    const getMarketReachDisplayLabel = (profile?: any) => {
    const location = getBusinessLocation(profile);

    if (selectedMarketReach === 'Local customers' && location) {
      return `Local · ${location}`;
    }

    if (selectedMarketReach === 'Nationwide customers') {
      return 'Nationwide · UK';
    }

    if (selectedMarketReach === 'Online customers') {
      return 'Online';
    }

    return selectedMarketReach;
  };

  const buildBusinessDescription = (profile: any) => {
    const marketReachContext = getMarketReachContext(profile);
    const businessLocation = getBusinessLocation(profile);

    return `
Website URL: ${profile.website_url || ''}
Business name: ${profile.business_name || ''}
Industry: ${profile.industry || ''}
Location: ${businessLocation}
Services: ${Array.isArray(profile.services) ? profile.services.join(', ') : ''}
Target audience: ${
      Array.isArray(profile.target_audience) ? profile.target_audience.join(', ') : ''
    }
Tone of voice: ${profile.tone_of_voice || ''}
Content pillars: ${
      Array.isArray(profile.content_pillars) ? profile.content_pillars.join(', ') : ''
    }
Main offer: ${profile.main_offer || ''}
Business goals: ${
      Array.isArray(profile.business_goals) ? profile.business_goals.join(', ') : ''
    }

Market reach for this weekly plan:
${marketReachContext}

Use the market reach to shape the posts:
- Local customers: write for customers in and around the business location. Use local trust, service area wording, nearby customer needs, and location-led phrasing where useful.
- Nationwide customers: avoid over-local wording unless it is directly relevant. Make the posts suitable for a wider UK audience.
- Online customers: focus on digital buying intent, online enquiries, delivery, remote service, ecommerce, or online conversion where relevant.

Selected social media platforms for this weekly plan:
${selectedPlatforms.join(', ')}

Posting frequency for this weekly plan:
${selectedPostingFrequency} posts this week.

Only create ${selectedPostingFrequency} posts for this weekly plan.
Only create posts for the selected social media platforms above. Do not use platforms that are not selected.

When a website URL is available, scan the website and infer the business details, tone, audience, services, content pillars, CTAs, and branding from the website.

When no website URL is available, use the manual business profile above. Treat it as the main source of truth and create strong, specific content from those details.

Also detect or infer:
- brand_primary_color as a hex code
- brand_secondary_color as a hex code
- brand_accent_color as a hex code
- brand_logo_url if visible
- brand_summary
`;
  };

  const buildHashtags = (profile: any) => {
    const industry = String(profile.industry || 'business')
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');

    const locationSource =
      selectedMarketReach === 'Nationwide customers'
        ? 'UK'
        : selectedMarketReach === 'Online customers'
          ? 'Online'
          : getBusinessLocation(profile) || 'Local';

    const location = String(locationSource)
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');

    return [`#${industry}`, `#${location}`, '#SmallBusiness', '#Marketing', '#FromOne'];
  };

  const saveWebsiteToProfile = async () => {
    const cleanWebsiteUrl = normaliseWebsiteUrl(websiteUrl);

    if (!cleanWebsiteUrl) {
      alert('Please enter a website URL, or use the business details option.');
      return null;
    }

    setSavingWebsite(true);

    try {
      const user = await getSafeAuthUser();
      const userId = user?.id || null;

      if (!userId) {
        alert('Please sign in again.');
        return null;
      }

      if (client?.id) {
        const { data, error } = await supabase
          .from('business_profiles')
          .update({
            user_id: userId,
            website_url: cleanWebsiteUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', client.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throwSupabaseError(error);

        setClient(data);
        setWebsiteUrl(data.website_url || '');

        return data;
      }

      const { data, error } = await supabase
        .from('business_profiles')
        .insert({
          user_id: userId,
          website_url: cleanWebsiteUrl,
          tone_of_voice: 'Professional',
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
      setWebsiteUrl(data.website_url || '');

      return data;
    } catch (error: any) {
      const message = getErrorMessage(error);

      console.error('Error saving website profile:', error);
      console.error('Readable save website error:', message);

      alert(message);
      return null;
    } finally {
      setSavingWebsite(false);
    }
  };

  const saveManualProfile = async () => {
    if (!manualBusinessName.trim() || !manualIndustry.trim()) {
      alert('Please add at least the business name and industry.');
      return null;
    }

    setSavingManualProfile(true);

    try {
      const user = await getSafeAuthUser();
      const userId = user?.id || null;

      if (!userId) {
        alert('Please sign in again.');
        return null;
      }

      const profilePayload = {
        user_id: userId,
        business_name: manualBusinessName.trim(),
        industry: manualIndustry.trim(),
        location: manualLocation.trim(),
        services: safeArray(manualServices),
        target_audience: safeArray(manualAudience),
        tone_of_voice: manualTone.trim() || 'Professional',
        main_offer: manualMainOffer.trim(),
        business_goals: safeArray(manualGoals),
        content_pillars: safeArray(manualContentPillars),
        updated_at: new Date().toISOString(),
      };

      if (client?.id) {
        const { data, error } = await supabase
          .from('business_profiles')
          .update(profilePayload)
          .eq('id', client.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throwSupabaseError(error);

        setClient(data);
        setSelectedPlatforms(getRecommendedPlatforms(data.industry));

        return data;
      }

      const { data, error } = await supabase
        .from('business_profiles')
        .insert({
          ...profilePayload,
          website_url: '',
        })
        .select()
        .single();

      if (error) throwSupabaseError(error);

      setClient(data);
      setSelectedPlatforms(getRecommendedPlatforms(data.industry));

      return data;
    } catch (error: any) {
      const message = getErrorMessage(error);

      console.error('Error saving business details:', error);
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
      .from('business_profiles')
      .update(businessProfileUpdates)
      .eq('id', activeClient.id)
      .eq('user_id', activeClient.user_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating scanned business profile:', error);
      return;
    }

    setClient(data);

    if (data?.industry) {
      setSelectedPlatforms(getRecommendedPlatforms(data.industry));
    }
  };

  const normaliseGeneratedPost = (
    post: GeneratedPost | string,
    index: number,
    activeClient: any,
    detectedIndustry: string,
    detectedLocation: string
  ) => {
    const selectedPlatformFallback =
      selectedPlatforms[index % selectedPlatforms.length] ||
      platformFallback[index] ||
      'Facebook';

    const fallbackHashtags = buildHashtags({
      ...activeClient,
      industry: detectedIndustry,
      location:
        selectedMarketReach === 'Nationwide customers'
          ? 'UK'
          : selectedMarketReach === 'Online customers'
            ? 'Online'
            : detectedLocation,
    });

    if (typeof post === 'string') {
      return {
        day: `Day ${index + 1}`,
        platform: selectedPlatformFallback,
        title: `${selectedPlatformFallback} Post`,
        caption: post,
        cta: activeClient.main_offer || 'Contact us today to find out more.',
        hashtags: fallbackHashtags,
        image_prompt:
          'Use a clean, professional image that supports the message of this post.',
      };
    }

    const allowedPlatform = selectedPlatforms.includes(post.platform || '')
      ? post.platform
      : selectedPlatformFallback;

    return {
      day: post.day || `Day ${index + 1}`,
      platform: allowedPlatform || selectedPlatformFallback,
      title: post.title || `${allowedPlatform || selectedPlatformFallback} Post`,
      caption: post.caption || '',
      cta: post.cta || activeClient.main_offer || 'Contact us today to find out more.',
      hashtags:
        Array.isArray(post.hashtags) && post.hashtags.length > 0
          ? post.hashtags
          : fallbackHashtags,
      image_prompt:
        post.image_prompt ||
        'Use a clean, professional image that supports the message of this post.',
    };
  };

  const buildCampaignName = (businessName: string) => {
    const date = new Date().toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${businessName || 'Weekly plan'} — ${date} ${time}`;
  };

  const createCampaignFromProfile = async (
    activeClient: any,
    source: 'website_scan' | 'manual_profile'
  ) => {
    const user = await getSafeAuthUser();
    const userId = user?.id;

    if (!userId) {
      alert('You need to sign in before saving posts.');
      return;
    }

    if (selectedPlatforms.length === 0) {
      alert('Please choose at least one platform.');
      return;
    }

    const marketReachContext = getMarketReachContext(activeClient);
    const marketReachDisplayLabel = getMarketReachDisplayLabel(activeClient);

    const campaignLimitAllowed = await checkSavedCampaignLimit(userId);

    if (!campaignLimitAllowed) return;

    if (source === 'website_scan') {
      const allowed = await checkWeeklyScanLimit(userId);

      if (!allowed) return;
    }

    const response = await axios.post('/api/generatePosts', {
      website: source === 'website_scan' ? activeClient.website_url : '',
      clientName: activeClient.business_name,
      industry: activeClient.industry,
      description: buildBusinessDescription(activeClient),
      provider: 'gemini',
      platforms: selectedPlatforms,
      postingFrequency: selectedPostingFrequency,
      numberOfPosts: selectedPostingFrequency,
      marketReach: marketReachContext,
      requestedOutput: {
        posts:
          `array of ${selectedPostingFrequency} post objects with day, platform, title, caption, cta, hashtags, image_prompt. Use only the selected platforms supplied in the request. Shape posts around the supplied marketReach, including the business location when local reach is selected.`, 
        selected_platforms: selectedPlatforms,
        market_reach: marketReachContext,
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

    const posts: GeneratedPost[] = (response.data.posts || []).slice(0, selectedPostingFrequency);

    if (!posts.length) {
      alert(response.data.error || 'No posts were created.');
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
      `Weekly ${marketReachContext.toLowerCase()} weekly post plan`;

    const detectedBusinessName =
      scanData?.business_name || activeClient.business_name || 'Website Scan Weekly Plan';

    const detectedIndustry = scanData?.industry || activeClient.industry || 'General';
    const detectedLocation =
      scanData?.location ||
      activeClient.location ||
      getBusinessLocation(activeClient) ||
      marketReachContext;

    const detectedAudience = Array.isArray(scanData?.target_audience)
      ? scanData.target_audience.join(', ')
      : Array.isArray(activeClient.target_audience)
        ? activeClient.target_audience.join(', ')
        : marketReachContext;

    const detectedTone = scanData?.tone_of_voice || activeClient.tone_of_voice || 'Professional';

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
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
        assets: 0,
        posted: 0,
        launch_date: new Date().toISOString().split('T')[0],
        campaign_area: detectedLocation,
        tone: detectedTone,
        posting_frequency: `${selectedPostingFrequency} posts per week`,
        platform_plan: `${buildPlatformPlanText(selectedPlatforms)}. Market reach: ${marketReachContext}`,
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

      const { error: postError } = await supabase.from('campaign_posts').insert({
        user_id: userId,
        campaign_id: campaign.id,
        keyword: detectedIndustry || 'business',
        title: post.title,
        caption: post.caption,
        cta: post.cta,
        hashtags: post.hashtags,
        platform: post.platform,
        type: source,
        scheduled_day: post.day,
        scheduled_at: postDate.toISOString(),
        status: 'scheduled',
        is_posted: false,
        client_id: activeClient.id,
        image_prompt: post.image_prompt,
        reach: 0,
        clicks: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      });

      if (postError) throwSupabaseError(postError);
    }

    if (source === 'website_scan') {
      const admin = await isAdminUser(userId);

      if (!admin) {
        await recordUsageEvent(userId, 'website_scan', {
          website: activeClient.website_url,
          client_id: activeClient.id,
          campaign_id: campaign.id,
          platforms: selectedPlatforms,
          postingFrequency: selectedPostingFrequency,
          marketReach: marketReachContext,
          marketReachDisplayLabel,
        });
      }
    }

    localStorage.setItem('fromone_has_new_posts', 'true');
    window.dispatchEvent(new Event('fromone-new-posts-updated'));

    await Promise.all([
      loadSavedCampaignCount(userId),
      loadWeeklyProgress(userId),
      loadScheduledPostStatus(userId),
    ]);

    router.push('/posts?created=true');
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
        alert('Please enter a website URL, or add business details.');
        setScanning(false);
        return;
      }

      if (!activeClient.website_url && !activeClient.business_name) {
        alert('Please enter a website URL, or add business details.');
        setScanning(false);
        return;
      }

      const source =
        activeClient.website_url && websiteUrl.trim() ? 'website_scan' : 'manual_profile';

      await createCampaignFromProfile(activeClient, source);
    } catch (error: any) {
      const message = getErrorMessage(error);

      console.error('Readable weekly posts error:', message);

      if (axios.isAxiosError(error)) {
        console.error('API response:', error.response?.data);
        console.error('API status:', error.response?.status);
      } else {
        console.error('Non-Axios weekly posts error:', error);
      }

      alert(message);
    } finally {
      setScanning(false);
    }
  };

  const handleSaveWebsiteOnly = async () => {
    if (!ensureAccessAllowed()) return;

    if (!websiteUrl.trim()) {
      alert('Please enter a website URL first.');
      return;
    }

    const savedClient = await saveWebsiteToProfile();

    if (savedClient) {
      alert('Website saved. Now choose who you want to reach and create weekly posts below.');
    }
  };

  const hasManualProfile = Boolean(client?.business_name && client?.industry);
  const hasWebsite = Boolean(websiteUrl.trim());
  const weeklyScansRemaining = Math.max(WEEKLY_SCAN_LIMIT - weeklyScansUsed, 0);
  const weeklyProgressPercent =
    weeklyProgress.total > 0
      ? Math.min(100, Math.round((weeklyProgress.posted / weeklyProgress.total) * 100))
      : 0;

  const businessName = client?.business_name || 'your business';
  const businessInitial = String(businessName).trim().charAt(0).toUpperCase() || 'F';
  const businessLogoUrl = client?.brand_logo_url || '';
  const marketReachDisplayLabel = getMarketReachDisplayLabel(client);
  const marketReachContext = getMarketReachContext(client);
  const selectedPostingFrequencyOption =
    postingFrequencyOptions.find((option) => option.value === selectedPostingFrequency) ||
    postingFrequencyOptions[postingFrequencyOptions.length - 1];

  const selectedPlatformSummary =
    selectedPlatforms.length > 3
      ? `${selectedPlatforms.slice(0, 3).join(', ')} +${selectedPlatforms.length - 3} more`
      : selectedPlatforms.join(', ');

  const hasBusinessSetup = Boolean(hasWebsite || hasManualProfile);
  const hasCreatedPosts = weeklyProgress.total > 0 || savedCampaignsCount > 0;

  const primaryMetaConnection =
    socialConnections.find((connection) => connection.provider === 'meta') || null;
  const primaryGoogleConnection =
    socialConnections.find((connection) => connection.provider === 'google') || null;

  const hasFacebookConnection = Boolean(primaryMetaConnection?.page_id);
  const hasInstagramConnection = Boolean(
    primaryMetaConnection?.instagram_business_account_id
  );
  const hasGoogleConnection = Boolean(primaryGoogleConnection);
  const googleLocationReady = Boolean(primaryGoogleConnection?.google_location_id);
  const hasPaidPlan = isPaidSubscription(accessInfo?.subscription_status);

  const customerReadyChecklistState = customerReadyChecklist.map((item) => {
    const complete =
      item.key === 'business'
        ? hasBusinessSetup
        : item.key === 'facebook'
          ? hasFacebookConnection
          : item.key === 'instagram'
            ? hasInstagramConnection
            : item.key === 'google'
              ? hasGoogleConnection
              : item.key === 'weekly_plan'
                ? hasCreatedPosts
                : item.key === 'scheduled_post'
                  ? hasScheduledPost
                  : item.key === 'billing'
                    ? hasPaidPlan
                    : false;

    const pending =
      item.key === 'google' && hasGoogleConnection && !googleLocationReady
        ? 'API approval pending'
        : item.key === 'billing' && !hasPaidPlan && !accessLocked
          ? 'Demo active'
          : '';

    return {
      ...item,
      complete,
      pending,
    };
  });

  const completedCustomerReadySteps = customerReadyChecklistState.filter(
    (item) => item.complete
  ).length;

  const commandCentreReadySteps = [
    hasBusinessSetup,
    hasFacebookConnection,
    hasInstagramConnection,
    hasGoogleConnection,
    !accessLocked,
  ].filter(Boolean).length;

  const commandCentreTotalSteps = 5;

  const showCustomerReadyChecklist =
    completedCustomerReadySteps < customerReadyChecklistState.length;

  return (
    <>
      <style jsx>{`
        @media (max-width: 980px) {
          .dashboard-platform-selector-full > div[style*='repeat(3'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div ref={dashboardHeaderRef} className="page-header dashboard-simple-header">
        <div className="page-eyebrow">FromOne Dashboard</div>
        <h1 className="page-title">Create this week’s posts.</h1>
        <p className="page-description">
          Add the business website, or use business details if there is no website. FromOne will
          create the right number of ready-to-use posts for the week.
        </p>

        <div className="dashboard-header-actions-row">
          <button
            type="button"
            className="secondary-button dashboard-tour-restart-button"
            onClick={restartDashboardTour}
          >
            Show me around
          </button>

          {!loading && (
            <section
              className={
                accessLocked
                  ? 'access-status-card access-status-locked dashboard-access-pill'
                  : 'access-status-card dashboard-access-pill'
              }
            >
              <div>
                <div className="page-eyebrow">
                  {accessLocked ? 'Demo Ended' : 'Access Active'}
                </div>
                <h2>
                  {accessLocked
                    ? 'Creating weekly posts is currently locked.'
                    : 'Your demo access is active.'}
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
                    {showCustomerReadyChecklist && (
            <section className="dashboard-first-run-card" style={{ marginBottom: 24 }}>
              <div className="dashboard-first-run-heading">
                <div>
                  <div className="page-eyebrow">Setup</div>
                  <h2>
                    {hasBusinessSetup
                      ? hasCreatedPosts
                        ? 'Ready to create and publish.'
                        : 'Create your first weekly plan.'
                      : 'Start by adding the business.'}
                  </h2>
                  <p>
                    {hasBusinessSetup
                      ? 'Your options are saved below. You can change them before creating posts.'
                      : 'Add a website or business details, then FromOne can create the weekly posts.'}
                  </p>
                </div>

                <span>
                  {commandCentreReadySteps}/{commandCentreTotalSteps} ready
                </span>
              </div>

              <div className="button-row" style={{ marginTop: 16, gap: 12, flexWrap: 'wrap' }}>
                {!hasBusinessSetup && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = websiteInputRef.current;
                      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    Add business
                  </button>
                )}

                {hasCreatedPosts && (
                  <Link href="/posts" className="dashboard-profile-link">
                    Review posts
                  </Link>
                )}

                <Link href="/settings" className="dashboard-profile-link">
                  Connections
                </Link>

                {!hasPaidPlan && (
                  <Link href="/subscription" className="dashboard-profile-link">
                    Billing
                  </Link>
                )}
              </div>
            </section>
          )}

          <section className="dashboard-top-grid">
            <section
              className="dashboard-weekly-progress-card"
              style={{
                gridColumn: '1 / -1',
              }}
            >
              <div className="dashboard-weekly-progress-header">
                <div>
                  <div className="page-eyebrow">Weekly status</div>
                  <h2>
                    {weeklyProgress.total > 0
                      ? `${weeklyProgress.posted} of ${weeklyProgress.total} posts done`
                      : 'No weekly posts yet'}
                  </h2>
                </div>

                <span className="dashboard-weekly-progress-count">
                  {weeklyProgress.remaining} left
                </span>
              </div>

              <div className="dashboard-weekly-progress-track">
                <span style={{ width: `${weeklyProgressPercent}%` }} />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                  marginTop: 22,
                }}
              >
                <div className="card" style={{ padding: 16 }}>
                  <strong>Today</strong>
                  {todayPost ? (
                    <p style={{ margin: '6px 0 0', opacity: 0.78 }}>
                      Review your {todayPost.platform || 'social'} post:{' '}
                      {todayPost.title || todayPost.scheduled_day || 'today’s post'}.
                    </p>
                  ) : (
                    <p style={{ margin: '6px 0 0', opacity: 0.78 }}>
                      No post is due today.
                    </p>
                  )}
                </div>

                <div className="card" style={{ padding: 16 }}>
                  <strong>Next up</strong>
                  <p style={{ margin: '6px 0 0', opacity: 0.78 }}>
                    {weeklyProgress.total > 0
                      ? weeklyProgress.remaining === 0
                        ? 'This week’s posts are complete.'
                        : weeklyProgress.nextPost
                          ? weeklyProgress.nextPost.title ||
                            weeklyProgress.nextPost.scheduled_day ||
                            'Your next post'
                          : 'Open Posts to finish the remaining items.'
                      : 'Create weekly posts to start tracking progress.'}
                  </p>
                </div>

                <div className="card" style={{ padding: 16 }}>
                  <strong>Business</strong>
                  <p style={{ margin: '6px 0 0', opacity: 0.78 }}>
                    {businessName}
                  </p>
                </div>
              </div>

              <div className="button-row" style={{ marginTop: 22 }}>
                <button
                  type="button"
                  className="secondary-button dashboard-weekly-progress-button"
                  onClick={() => router.push(todayPost ? '/posts?today=true' : '/posts')}
                >
                  {todayPost ? `Review ${todayPost.platform || 'post'}` : 'View this week'}
                </button>
              </div>
            </section>
          </section>

          <section className="dashboard-simple-shell dashboard-simple-shell-stacked">
            <div className="dashboard-create-card">
              <div className="page-eyebrow">Create weekly posts</div>

              <h2>
                {hasWebsite
                  ? 'Scan this website and create the week.'
                  : hasManualProfile
                    ? 'Use the saved business details or add a website.'
                    : 'Enter a website, or add business details.'}
              </h2>

              <p>
                Add a website or use saved business details first. Then choose who the posts should
                reach and select the platforms for this week.
              </p>

              <div ref={websiteInputRef} className="dashboard-tour-target-wrap">
                <label>
                  <strong>Business website URL</strong>
                  <span>
                    Website scans are limited to {WEEKLY_SCAN_LIMIT} every 7 days. You can save up
                    to {MAX_SAVED_CAMPAIGNS} weekly plans.
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
                {weeklyScansRemaining} of {WEEKLY_SCAN_LIMIT} website scans remaining this week
              </div>

              <div className="dashboard-create-action-row">
                <button
                  type="button"
                  className="dashboard-primary-scan-button"
                  onClick={handleSaveWebsiteOnly}
                  disabled={accessLocked || scanning || savingWebsite || savingManualProfile}
                >
                  {savingWebsite ? 'Saving website...' : 'Save Website'}
                </button>

                <button
                  ref={manualButtonRef}
                  type="button"
                  className="secondary-button dashboard-manual-toggle-button"
                  onClick={() => setShowManualProfile(!showManualProfile)}
                  disabled={scanning || savingWebsite || savingManualProfile}
                >
                  {showManualProfile
                    ? 'Hide business details'
                    : hasManualProfile
                      ? 'Edit business details'
                      : 'No website? Add business details'}
                </button>

                <span
                  ref={postsLinkRef}
                  className="dashboard-tour-link-target dashboard-view-posts-action"
                >
                  <Link href="/posts" className="dashboard-profile-link">
                    View posts
                  </Link>
                </span>
              </div>
            </div>

            {showManualProfile && (
              <section
                ref={manualProfileSectionRef}
                className="dashboard-manual-profile-card dashboard-manual-profile-card-inline"
              >
                <div className="dashboard-manual-profile-header">
                  <div>
                    <div className="page-eyebrow">Business Details</div>
                    <h2>Add the business details.</h2>
                    <p>
                      Add enough detail for FromOne to understand the business when there is no
                      website to scan.
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
                    <strong>Save these business details first.</strong>
                    <span>
                      Then choose the reach and platforms below before creating the weekly posts.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={saveManualProfile}
                    disabled={scanning || savingManualProfile}
                  >
                    {savingManualProfile ? 'Saving details...' : 'Save business details'}
                  </button>
                </div>
              </section>
            )}

                        <section className="premium-card dashboard-options-summary-card" style={{ marginTop: 22 }}>
              <div className="page-eyebrow">Post options</div>
              <h2 style={{ marginTop: 0 }}>Use these settings for this week.</h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                  marginTop: 14,
                }}
              >
                <div className="card" style={{ padding: 14 }}>
                  <strong>Reach</strong>
                  <p style={{ margin: '6px 0 0', opacity: 0.78 }}>{marketReachDisplayLabel}</p>
                </div>

                <div className="card" style={{ padding: 14 }}>
                  <strong>Frequency</strong>
                  <p style={{ margin: '6px 0 0', opacity: 0.78 }}>
                    {selectedPostingFrequencyOption.title} per week
                  </p>
                </div>

                <div className="card" style={{ padding: 14 }}>
                  <strong>Platforms</strong>
                  <p style={{ margin: '6px 0 0', opacity: 0.78 }}>
                    {selectedPlatformSummary || 'Choose platforms'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="secondary-button"
                style={{ marginTop: 16 }}
                onClick={() => setShowAdvancedOptions((current) => !current)}
              >
                {showAdvancedOptions ? 'Hide options' : 'Change options'}
              </button>
            </section>

            {showAdvancedOptions && (
              <>
<section
              ref={marketReachRef}
              className="dashboard-platform-selector dashboard-platform-selector-full"
            >
              <div className="dashboard-platform-selector-header">
                <div>
                  <div className="page-eyebrow">Choose your reach</div>
                  <h3>Who are these posts aimed at?</h3>
                  <p>
                    This helps FromOne decide whether to write with local, nationwide, or online
                    customer intent.
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
                          ? 'dashboard-platform-carousel-card dashboard-market-reach-card is-selected'
                          : 'dashboard-platform-carousel-card dashboard-market-reach-card'
                      }
                      onClick={() => setSelectedMarketReach(option.value)}
                      aria-pressed={isSelected}
                    >
                      <span className="dashboard-platform-check">
                        {isSelected ? '✓' : '+'}
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


                                                <section
              className="dashboard-platform-selector dashboard-platform-selector-full"
              style={{
                overflow: 'hidden',
              }}
            >
              <div className="dashboard-platform-selector-header">
                <div>
                  <div className="page-eyebrow">Posting frequency</div>
                  <h3>How many posts this week?</h3>
                  <p>
                    Choose how often FromOne should create posts for this weekly plan.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
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
                      style={{
                        width: '100%',
                        minHeight: 168,
                        padding: '24px',
                        borderRadius: 24,
                        border: selected
                          ? '1px solid rgba(255, 212, 59, 0.82)'
                          : '1px solid rgba(255, 255, 255, 0.13)',
                        background: selected
                          ? 'radial-gradient(circle at top right, rgba(255, 212, 59, 0.22), rgba(255, 255, 255, 0.06) 42%, rgba(15, 23, 42, 0.86))'
                          : 'radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), rgba(255, 255, 255, 0.05) 45%, rgba(15, 23, 42, 0.82))',
                        color: '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 16,
                        boxShadow: selected ? '0 18px 50px rgba(255, 212, 59, 0.14)' : 'none',
                      }}
                    >
                      <span
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 999,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: selected
                            ? 'rgba(61, 220, 151, 0.2)'
                            : 'rgba(255, 212, 59, 0.12)',
                          border: selected
                            ? '1px solid rgba(61, 220, 151, 0.55)'
                            : '1px solid rgba(255, 212, 59, 0.48)',
                          color: selected ? '#3ddc97' : '#ffd43b',
                          fontWeight: 950,
                          fontSize: 18,
                          flex: '0 0 auto',
                        }}
                      >
                        {selected ? '✓' : '+'}
                      </span>

                      <div style={{ display: 'grid', gap: 8 }}>
                        <strong
                          style={{
                            display: 'block',
                            fontSize: 26,
                            lineHeight: 1,
                            letterSpacing: '-0.03em',
                          }}
                        >
                          {option.title}
                        </strong>

                        <span
                          style={{
                            display: 'block',
                            fontSize: 14,
                            lineHeight: 1.35,
                            fontWeight: 800,
                            color: 'rgba(255, 255, 255, 0.72)',
                          }}
                        >
                          {option.description}
                        </span>
                      </div>

                      {selected && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            minHeight: 24,
                            padding: '5px 10px',
                            borderRadius: 999,
                            background: 'rgba(255, 212, 59, 0.16)',
                            color: '#ffd43b',
                            fontSize: 11,
                            fontWeight: 950,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p
                style={{
                  margin: '16px 0 0',
                  color: 'rgba(255, 255, 255, 0.72)',
                  fontWeight: 800,
                }}
              >
                Selected frequency: <strong>{selectedPostingFrequencyOption.title} per week</strong>
              </p>
            </section>

            <div
              ref={platformSelectorRef}
              className="dashboard-platform-selector dashboard-platform-selector-full"
            >
              <div className="dashboard-platform-selector-header">
                <div>
                  <div className="page-eyebrow">Choose your platforms</div>
                  <h3>Where should we create posts for?</h3>
                  <p>
                    Click a card to add or remove that platform. Use More to cycle through the
                    social cards.
                  </p>
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
                  {visiblePlatformCards.map((platform) => {
                    const isSelected = selectedPlatforms.includes(platform.name);
                    const isRecommended = recommendedPlatforms.includes(platform.name);

                    return (
                      <button
                        key={platform.name}
                        type="button"
                        className={
                          isSelected
                            ? 'dashboard-platform-carousel-card is-selected'
                            : 'dashboard-platform-carousel-card'
                        }
                        onClick={() => togglePlatform(platform.name)}
                        aria-pressed={isSelected}
                      >
                        <span className="dashboard-platform-check">
                          {isSelected ? '✓' : '+'}
                        </span>

                        <strong>{platform.shortName}</strong>

                        <small className={isRecommended ? 'is-visible' : 'is-hidden'}>
                          Recommended
                        </small>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="dashboard-platform-more-button"
                  onClick={handleShowMorePlatforms}
                  aria-label="Show more social platforms"
                >
                  <span>More</span>
                  <b>›</b>
                </button>
              </div>

              <div className="dashboard-selected-platforms-line">
                <strong>{selectedPlatforms.length}</strong>
                <span>selected: {selectedPlatforms.join(', ')}</span>
                <small>
                  Showing {platformCarouselStart + 1}–
                  {Math.min(
                    platformCarouselStart + PLATFORM_CAROUSEL_VISIBLE_COUNT,
                    availablePlatforms.length
                  )}{' '}
                  of {availablePlatforms.length}
                </small>
              </div>


            </div>

              </>
            )}

            <section
              className="premium-card"
              style={{
                marginTop: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div className="page-eyebrow">Ready to create?</div>
                <h2 style={{ margin: '0 0 8px' }}>
                  Create this week’s posts.
                </h2>
                <p style={{ margin: 0 }}>
                  FromOne will create {selectedPostingFrequency} posts
                  for {marketReachContext.toLowerCase()} using {selectedPlatformSummary || 'the selected platforms'}.
                </p>
              </div>

              <button
                ref={generateButtonRef}
                type="button"
                className="dashboard-platform-create-button"
                onClick={handleGeneratePosts}
                disabled={accessLocked || scanning || savingWebsite || savingManualProfile}
              >
                {scanning || savingWebsite
                  ? hasWebsite
                    ? 'Scanning website...'
                    : 'Creating posts from business details...'
                  : hasWebsite
                    ? 'Scan Website & Create Weekly Posts'
                    : hasManualProfile
                      ? 'Create Posts From Business Details'
                      : 'Create Weekly Posts'}
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
              {hasWebsite ? 'Website scan in progress' : 'Creating weekly posts'}
            </div>

            <h2>{hasWebsite ? 'Scanning your website.' : 'Creating your weekly plan.'}</h2>

            <p>
              FromOne is reading the business details, understanding the audience, and creating
              seven ready-to-use posts for the week.
            </p>

            <div className="fromone-loading-steps">
              <span>Scanning business details</span>
              <span>Finding services and audience</span>
              <span>Planning platform content</span>
              <span>Writing seven posts</span>
            </div>
          </section>
        </div>
      )}

      {showDashboardTour && !loading && (
        <div className="dashboard-spotlight-tour">
          {tourRect && (
            <>
              <div
                className="dashboard-tour-shade"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  height: tourRect.top,
                }}
              />

              <div
                className="dashboard-tour-shade"
                style={{
                  top: tourRect.top,
                  left: 0,
                  width: tourRect.left,
                  height: tourRect.height,
                }}
              />

              <div
                className="dashboard-tour-shade"
                style={{
                  top: tourRect.top,
                  left: tourRect.left + tourRect.width,
                  right: 0,
                  height: tourRect.height,
                }}
              />

              <div
                className="dashboard-tour-shade"
                style={{
                  top: tourRect.top + tourRect.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />

              <div
                className="dashboard-tour-highlight"
                style={{
                  top: tourRect.top,
                  left: tourRect.left,
                  width: tourRect.width,
                  height: tourRect.height,
                }}
              />
            </>
          )}

          {!tourRect && <div className="dashboard-tour-full-shade" />}

          <section className="dashboard-tour-tooltip" style={getTourTooltipStyle()}>
            <div className="dashboard-tour-progress">
              Step {dashboardTourStep + 1} of {dashboardTourSteps.length}
            </div>

            <h2>{dashboardTourSteps[dashboardTourStep].title}</h2>
            <p>{dashboardTourSteps[dashboardTourStep].text}</p>

            <div className="dashboard-tour-actions">
              <button type="button" className="secondary-button" onClick={closeDashboardTour}>
                Skip
              </button>

              <div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={goToPreviousTourStep}
                  disabled={dashboardTourStep === 0}
                >
                  Back
                </button>

                <button type="button" onClick={goToNextTourStep}>
                  {dashboardTourStep === dashboardTourSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}