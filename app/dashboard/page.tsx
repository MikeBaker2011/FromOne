'use client';

import { useEffect, useState } from 'react';
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

const platformFallback = [
  'Facebook',
  'Instagram',
  'Google Business',
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
    title: 'Welcome to FromOne',
    text:
      'This dashboard is where you create your weekly content. Set up your business once, then generate fresh posts whenever you need them.',
  },
  {
    title: 'Add your website',
    text:
      'If the business has a website, paste it here. FromOne will use it to understand the business, services, audience, tone, and offer.',
  },
  {
    title: 'No website? Use a manual profile',
    text:
      'If there is no website, create a manual business profile instead. Once saved, FromOne can use it again for future campaigns.',
  },
  {
    title: 'Generate your weekly campaign',
    text:
      'When you are ready, click the generate button. FromOne will create seven ready-to-use posts for the week.',
  },
  {
    title: 'Review your posts',
    text:
      'After generating, go to Posts to review, edit, copy, publish manually, and mark posts as done.',
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

  const [showDashboardTour, setShowDashboardTour] = useState(false);
  const [dashboardTourStep, setDashboardTourStep] = useState(0);

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

    if (!tourSeen) {
      setShowDashboardTour(true);
    }
  }, []);

  const closeDashboardTour = () => {
    localStorage.setItem(DASHBOARD_TOUR_SEEN_KEY, 'true');
    setShowDashboardTour(false);
    setDashboardTourStep(0);
  };

  const restartDashboardTour = () => {
    setDashboardTourStep(0);
    setShowDashboardTour(true);
  };

  const goToNextTourStep = () => {
    if (dashboardTourStep >= dashboardTourSteps.length - 1) {
      closeDashboardTour();
      return;
    }

    setDashboardTourStep((currentStep) => currentStep + 1);
  };

  const goToPreviousTourStep = () => {
    setDashboardTourStep((currentStep) => Math.max(0, currentStep - 1));
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
      return 'Unknown error generating or saving posts.';
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
        'Your 7-day demo has ended. You can still view existing posts, but creating new campaigns is locked until access is extended or a subscription is active.',
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

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const { data: newAccess, error: accessInsertError } = await supabase
      .from('user_access')
      .insert({
        user_id: userId,
        access_status: 'trial',
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        subscription_status: 'none',
      })
      .select()
      .single();

    if (accessInsertError) {
      console.error('Error creating user access:', accessInsertError.message);
      setAccessInfo(null);
      setAccessLocked(false);
      setAccessMessage('Access check unavailable.');
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

  const checkWeeklyScanLimit = async (userId: string) => {
    const used = await loadWeeklyScanUsage(userId);

    if (used >= WEEKLY_SCAN_LIMIT) {
      alert(
        `You have used your ${WEEKLY_SCAN_LIMIT} website scans for this 7-day period. You can still generate campaigns using the manual profile route.`
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
      console.error('Error loading campaign count:', error.message);
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
        `You already have ${MAX_SAVED_CAMPAIGNS} saved campaigns. Delete an old campaign from Posts before creating a new one.`
      );
      return false;
    }

    return true;
  };

  const fetchClient = async () => {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (userId) {
      await Promise.all([
        loadWeeklyScanUsage(userId),
        loadSavedCampaignCount(userId),
        loadOrCreateAccess(userId),
      ]);
    }

    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
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

  const buildBusinessDescription = (profile: any) => {
    return `
Website URL: ${profile.website_url || ''}
Business name: ${profile.business_name || ''}
Industry: ${profile.industry || ''}
Location: ${profile.location || ''}
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

    const location = String(profile.location || 'local')
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');

    return [`#${industry}`, `#${location}`, '#SmallBusiness', '#Marketing', '#FromOne'];
  };

  const saveWebsiteToProfile = async () => {
    const cleanWebsiteUrl = normaliseWebsiteUrl(websiteUrl);

    if (!cleanWebsiteUrl) {
      alert('Please enter a website URL, or use the manual profile option.');
      return null;
    }

    setSavingWebsite(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      if (client?.id) {
        const { data, error } = await supabase
          .from('business_profiles')
          .update({
            user_id: userId,
            website_url: cleanWebsiteUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', client.id)
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
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

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
          .select()
          .single();

        if (error) throwSupabaseError(error);

        setClient(data);
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
      return data;
    } catch (error: any) {
      const message = getErrorMessage(error);

      console.error('Error saving manual profile:', error);
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
      .select()
      .single();

    if (error) {
      console.error('Error updating scanned business profile:', error);
      return;
    }

    setClient(data);
  };

  const normaliseGeneratedPost = (
    post: GeneratedPost | string,
    index: number,
    activeClient: any,
    detectedIndustry: string,
    detectedLocation: string
  ) => {
    const fallbackPlatform = platformFallback[index] || 'Facebook';
    const fallbackHashtags = buildHashtags({
      ...activeClient,
      industry: detectedIndustry,
      location: detectedLocation,
    });

    if (typeof post === 'string') {
      return {
        day: `Day ${index + 1}`,
        platform: fallbackPlatform,
        title: `${fallbackPlatform} Post`,
        caption: post,
        cta: activeClient.main_offer || 'Contact us today to find out more.',
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

    return `${businessName || 'Campaign'} — ${date} ${time}`;
  };

  const createCampaignFromProfile = async (
    activeClient: any,
    source: 'website_scan' | 'manual_profile'
  ) => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      alert('You need to sign in before saving posts.');
      return;
    }

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

    const posts: GeneratedPost[] = response.data.posts || [];

    if (!posts.length) {
      alert(response.data.error || 'No posts were generated.');
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
      'Seven-day mixed-platform content campaign';

    const detectedBusinessName =
      scanData?.business_name || activeClient.business_name || 'Website Scan Campaign';

    const detectedIndustry = scanData?.industry || activeClient.industry || 'General';
    const detectedLocation = scanData?.location || activeClient.location || 'Online';

    const detectedAudience = Array.isArray(scanData?.target_audience)
      ? scanData.target_audience.join(', ')
      : Array.isArray(activeClient.target_audience)
        ? activeClient.target_audience.join(', ')
        : '';

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
        posting_frequency: 'Daily',
        platform_plan:
          'Day 1 Facebook, Day 2 Instagram, Day 3 Google Business, Day 4 LinkedIn, Day 5 Instagram, Day 6 TikTok, Day 7 Facebook',
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
      await recordUsageEvent(userId, 'website_scan', {
        website: activeClient.website_url,
        client_id: activeClient.id,
        campaign_id: campaign.id,
      });
    }

    await loadSavedCampaignCount(userId);

    alert('Your weekly campaign has been generated and saved.');
    router.push('/posts');
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
        alert('Please enter a website URL, or create a manual profile.');
        setScanning(false);
        return;
      }

      if (!activeClient.website_url && !activeClient.business_name) {
        alert('Please enter a website URL, or create a manual profile.');
        setScanning(false);
        return;
      }

      const source =
        activeClient.website_url && websiteUrl.trim() ? 'website_scan' : 'manual_profile';

      await createCampaignFromProfile(activeClient, source);
    } catch (error: any) {
      const message = getErrorMessage(error);

      console.error('Readable campaign error:', message);

      if (axios.isAxiosError(error)) {
        console.error('API response:', error.response?.data);
        console.error('API status:', error.response?.status);
      } else {
        console.error('Non-Axios campaign error:', error);
      }

      alert(message);
    } finally {
      setScanning(false);
    }
  };

  const handleSaveManualAndGenerate = async () => {
    setScanning(true);

    if (!ensureAccessAllowed()) {
      setScanning(false);
      return;
    }

    try {
      const savedProfile = await saveManualProfile();

      if (!savedProfile) {
        setScanning(false);
        return;
      }

      await createCampaignFromProfile(savedProfile, 'manual_profile');
    } catch (error: any) {
      const message = getErrorMessage(error);

      console.error('Manual generate error:', error);
      alert(message);
    } finally {
      setScanning(false);
    }
  };

  const hasManualProfile = Boolean(client?.business_name && client?.industry);
  const hasWebsite = Boolean(websiteUrl.trim());
  const weeklyScansRemaining = Math.max(WEEKLY_SCAN_LIMIT - weeklyScansUsed, 0);

  return (
    <>
      <div className="page-header dashboard-simple-header">
        <div className="page-eyebrow">FromOne Dashboard</div>
        <h1 className="page-title">Start a weekly campaign.</h1>
        <p className="page-description">
          Add the client website to scan it, or create a manual profile if they do not
          have a website. FromOne will create seven ready-to-use posts.
        </p>

        <button
          type="button"
          className="secondary-button dashboard-tour-restart-button"
          onClick={restartDashboardTour}
        >
          Show me around
        </button>
      </div>

      {loading ? (
        <div className="premium-card">
          <p>Loading client profile...</p>
        </div>
      ) : (
        <>
          <section
            className={
              accessLocked ? 'access-status-card access-status-locked' : 'access-status-card'
            }
          >
            <div>
              <div className="page-eyebrow">{accessLocked ? 'Demo Ended' : 'Access Active'}</div>
              <h2>
                {accessLocked
                  ? 'Campaign creation is currently locked.'
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

          <section className="dashboard-simple-shell">
            <div className="dashboard-create-card">
              <div className="page-eyebrow">Create Campaign</div>

              <h2>
                {hasWebsite
                  ? 'Scan this website and generate the week.'
                  : hasManualProfile
                    ? 'Use the saved profile or add a website.'
                    : 'Enter a website, or create a manual profile.'}
              </h2>

              <p>
                Choose the route that fits the business. A website scan gives richer brand
                context, while a strong manual profile still creates useful, targeted posts.
              </p>

              <label>
                <strong>Client Website URL</strong>
                <span>
                  Paste the website URL. Website scans are limited to {WEEKLY_SCAN_LIMIT} every 7
                  days. You can save up to {MAX_SAVED_CAMPAIGNS} campaigns.
                </span>
              </label>

              <input
                className="input"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://example.com"
              />

              <div className="dashboard-scan-usage-pill">
                {weeklyScansRemaining} of {WEEKLY_SCAN_LIMIT} website scans remaining this week
              </div>

              <button
                className="dashboard-primary-scan-button"
                onClick={handleGeneratePosts}
                disabled={accessLocked || scanning || savingWebsite || savingManualProfile}
              >
                {scanning || savingWebsite
                  ? hasWebsite
                    ? 'Scanning website...'
                    : 'Generating campaign...'
                  : hasWebsite
                    ? 'Scan Website & Generate Campaign'
                    : hasManualProfile
                      ? 'Generate from Saved Profile'
                      : 'Save Website & Generate Campaign'}
              </button>

              <div className="dashboard-simple-actions">
                <button
                  type="button"
                  className="secondary-button dashboard-manual-toggle-button"
                  onClick={() => setShowManualProfile(!showManualProfile)}
                  disabled={scanning || savingWebsite || savingManualProfile}
                >
                  {showManualProfile
                    ? 'Hide manual profile'
                    : hasManualProfile
                      ? 'Edit manual profile'
                      : 'No website? Create manual profile'}
                </button>

                <Link href="/posts" className="dashboard-profile-link">
                  View posts
                </Link>
              </div>
            </div>

            <aside className="dashboard-status-card">
              <div className="page-eyebrow">Current Client</div>

              <div className="dashboard-status-list">
                <p>
                  <strong>Business</strong>
                  <span>{client?.business_name || 'Detected after scan'}</span>
                </p>

                <p>
                  <strong>Industry</strong>
                  <span>{client?.industry || 'Detected after scan'}</span>
                </p>

                <p>
                  <strong>Location</strong>
                  <span>{client?.location || 'Detected if available'}</span>
                </p>

                <p>
                  <strong>Website</strong>
                  <span>{websiteUrl || 'Not added yet'}</span>
                </p>

                <p>
                  <strong>Website scans</strong>
                  <span>
                    {weeklyScansUsed}/{WEEKLY_SCAN_LIMIT} used in the last 7 days
                  </span>
                </p>

                <p>
                  <strong>Saved campaigns</strong>
                  <span>
                    {savedCampaignsCount}/{MAX_SAVED_CAMPAIGNS} monthly campaign slots used
                  </span>
                </p>

                <p>
                  <strong>Profile source</strong>
                  <span>
                    {hasWebsite
                      ? 'Website scan'
                      : hasManualProfile
                        ? 'Manual profile'
                        : 'Not set up'}
                  </span>
                </p>
              </div>
            </aside>
          </section>

          {showManualProfile && (
            <section className="dashboard-manual-profile-card">
              <div className="dashboard-manual-profile-header">
                <div>
                  <div className="page-eyebrow">No Website Route</div>
                  <h2>Create a manual business profile.</h2>
                  <p>
                    Add enough detail for FromOne to understand the business. This profile
                    saves automatically and can be edited later in Settings.
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
                  <strong>Target audience</strong>
                  <span>Separate with commas.</span>
                  <textarea
                    className="input"
                    value={manualAudience}
                    onChange={(event) => setManualAudience(event.target.value)}
                    placeholder="Homeowners, landlords, small business owners"
                  />
                </label>

                <label>
                  <strong>Main offer or CTA</strong>
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
                  <strong>Content pillars</strong>
                  <span>Separate with commas.</span>
                  <textarea
                    className="input"
                    value={manualContentPillars}
                    onChange={(event) => setManualContentPillars(event.target.value)}
                    placeholder="Helpful advice, customer trust, services, offers"
                  />
                </label>
              </div>

              <div className="dashboard-manual-profile-actions">
                <button
                  onClick={handleSaveManualAndGenerate}
                  disabled={accessLocked || scanning || savingManualProfile}
                >
                  {scanning || savingManualProfile
                    ? 'Generating from profile...'
                    : 'Save Profile & Generate Campaign'}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={saveManualProfile}
                  disabled={scanning || savingManualProfile}
                >
                  {savingManualProfile ? 'Saving...' : 'Save profile only'}
                </button>
              </div>
            </section>
          )}

          <section className="dashboard-simple-steps">
            <div>
              <span>1</span>
              <strong>Add website or profile</strong>
              <p>Scan a client website, or create a manual profile if they do not have one.</p>
            </div>

            <div>
              <span>2</span>
              <strong>Generate campaign</strong>
              <p>FromOne creates seven clean posts with platform recommendations.</p>
            </div>

            <div>
              <span>3</span>
              <strong>Review in Posts</strong>
              <p>Upload images, copy content, open platforms, and track publishing.</p>
            </div>
          </section>
        </>
      )}

      {showDashboardTour && (
        <div className="dashboard-tour-overlay">
          <div className="dashboard-tour-backdrop" onClick={closeDashboardTour} />

          <section className="dashboard-tour-card">
            <div className="dashboard-tour-progress">
              Step {dashboardTourStep + 1} of {dashboardTourSteps.length}
            </div>

            <h2>{dashboardTourSteps[dashboardTourStep].title}</h2>
            <p>{dashboardTourSteps[dashboardTourStep].text}</p>

            <div className="dashboard-tour-pointer">
              {dashboardTourStep === 0 && 'Start here — this is your campaign dashboard.'}
              {dashboardTourStep === 1 && 'Look for the website input box on the campaign card.'}
              {dashboardTourStep === 2 && 'Use the manual profile button if there is no website.'}
              {dashboardTourStep === 3 && 'Use the main generate button to create the week.'}
              {dashboardTourStep === 4 && 'After generating, open Posts to review everything.'}
            </div>

            <div className="dashboard-tour-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeDashboardTour}
              >
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