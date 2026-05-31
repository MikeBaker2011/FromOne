'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/app/components/ToastProvider';
import { supabaseBrowser as supabase } from '@/lib/supabase/browser';

type SocialConnection = {
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

type ScannedBusinessProfile = {
  business_name?: string;
  industry?: string;
  location?: string;
  services?: string[];
  target_audience?: string[];
  tone_of_voice?: string;
  content_pillars?: string[];
  main_offer?: string;
  business_goals?: string[];
  brand_primary_color?: string;
  brand_secondary_color?: string;
  brand_accent_color?: string;
  brand_logo_url?: string | null;
  brand_summary?: string;
  campaign_idea?: string;
};

const toneOptions = [
  'Professional',
  'Friendly',
  'Premium',
  'Direct',
  'Helpful',
  'Fun',
  'Local and trustworthy',
];

export default function SettingsPage() {
  const { showToast } = useToast();

  const notify = (
    message: any,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    title?: string,
  ) => {
    const cleanMessage = String(message || '').trim();

    if (!cleanMessage) return;

    const defaultTitle =
      title ||
      (type === 'success'
        ? 'Done'
        : type === 'error'
          ? 'Something went wrong'
          : type === 'warning'
            ? 'Please check'
            : 'FromOne');

    showToast({
      type,
      title: defaultTitle,
      message: cleanMessage,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [services, setServices] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('Professional');
  const [mainOffer, setMainOffer] = useState('');
  const [contentPillars, setContentPillars] = useState('');
  const [businessGoals, setBusinessGoals] = useState('');

  const [brandPrimaryColor, setBrandPrimaryColor] = useState('#ffd43b');
  const [brandSecondaryColor, setBrandSecondaryColor] = useState('#101420');
  const [brandAccentColor, setBrandAccentColor] = useState('#3ddc97');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandSummary, setBrandSummary] = useState('');

  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [disconnectingConnectionId, setDisconnectingConnectionId] = useState<string | null>(null);

  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [showBrandDetails, setShowBrandDetails] = useState(false);
  const [showPublishingRules, setShowPublishingRules] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [isOnboardingSetup, setIsOnboardingSetup] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanningWebsite, setScanningWebsite] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'disconnectMeta' | 'deleteProfile';
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    connectionId?: string | null;
  } | null>(null);

  const profileEditorRef = useRef<HTMLElement | null>(null);
  const socialConnectionsRef = useRef<HTMLElement | null>(null);

  const openProfileEditor = () => {
    setShowBusinessDetails(true);

    window.setTimeout(() => {
      profileEditorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);
  };

  const scrollToSocialConnections = () => {
    window.setTimeout(() => {
      socialConnectionsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 180);
  };

  const metaConnections = socialConnections.filter((connection) => connection.provider === 'meta');
  const primaryMetaConnection = metaConnections[0] || null;

  const hasMetaConnection = Boolean(primaryMetaConnection);
  const hasFacebookConnection = Boolean(primaryMetaConnection?.page_id);
  const hasInstagramConnection = Boolean(primaryMetaConnection?.instagram_business_account_id);
  const metaConnectionBusy =
    disconnectingConnectionId === primaryMetaConnection?.id ||
    disconnectingConnectionId === 'all';

  const getConnectionStatusLabel = (ready: boolean) => {
    if (loadingConnections) return 'Checking';
    return ready ? 'Connected' : 'Needs connection';
  };

  const getConnectionStatusStyle = (ready: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'fit-content',
    minHeight: 32,
    padding: '7px 12px',
    borderRadius: 999,
    background: ready
      ? 'linear-gradient(135deg, rgba(61, 220, 151, 0.16), rgba(61, 220, 151, 0.08))'
      : 'linear-gradient(135deg, rgba(255, 212, 59, 0.16), rgba(255, 212, 59, 0.07))',
    border: ready
      ? '1px solid rgba(61, 220, 151, 0.28)'
      : '1px solid rgba(255, 212, 59, 0.26)',
    color: ready ? '#a7f3d0' : '#ffe58a',
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: '0.055em',
    textTransform: 'uppercase',
    boxShadow: ready
      ? '0 10px 24px rgba(61, 220, 151, 0.08)'
      : '0 10px 24px rgba(255, 212, 59, 0.08)',
  });

  const getMetaUpdatedLabel = () => {
    if (!primaryMetaConnection?.updated_at) return 'Not checked yet';

    try {
      return new Date(primaryMetaConnection.updated_at).toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently checked';
    }
  };

  const getMetaExpiryLabel = () => {
    if (!primaryMetaConnection?.expires_at) return 'No expiry date shown';

    try {
      return new Date(primaryMetaConnection.expires_at).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Expiry date unavailable';
    }
  };

  const businessProfileReady = Boolean(businessName.trim() && industry.trim());
  const connectionsReady = businessProfileReady;
  const createPostsReady = businessProfileReady;
  const showOnboardingNextStep = isOnboardingSetup && businessProfileReady;

  const profileHasStarted = Boolean(
    websiteUrl.trim() ||
      businessName.trim() ||
      industry.trim() ||
      location.trim() ||
      services.trim() ||
      targetAudience.trim() ||
      mainOffer.trim()
  );

  const profileCompletionItems = useMemo(
    () => [
      {
        label: 'Website or business details',
        ready: Boolean(websiteUrl.trim() || businessName.trim()),
      },
      { label: 'Business name', ready: Boolean(businessName.trim()) },
      { label: 'Industry', ready: Boolean(industry.trim()) },
      { label: 'Location', ready: Boolean(location.trim()) },
      { label: 'Services', ready: Boolean(services.trim()) },
      { label: 'Customers', ready: Boolean(targetAudience.trim()) },
    ],
    [websiteUrl, businessName, industry, location, services, targetAudience]
  );

  const completedProfileItems = profileHasStarted
    ? profileCompletionItems.filter((item) => item.ready).length
    : 0;

  const profileCompletionPercent = profileHasStarted
    ? Math.round((completedProfileItems / profileCompletionItems.length) * 100)
    : 0;

  useEffect(() => {
    loadBusinessProfile();

    const params = new URLSearchParams(window.location.search);
    const setup = params.get('setup');
    const metaConnected = params.get('meta_connected');
    const metaError = params.get('meta_error');

    if (setup === 'business') {
      setIsOnboardingSetup(true);
      setShowBusinessDetails(true);
    }

    if (metaConnected === 'true') {
      notify('Facebook and Instagram connected.', 'success', 'Accounts connected');

      if (setup === 'business') {
        setIsOnboardingSetup(true);
        setShowBusinessDetails(false);
        window.history.replaceState({}, '', '/settings?setup=business');
      } else {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    if (metaConnected === 'false') {
      notify(metaError || 'Meta connection failed.', 'error', 'Connection failed');

      if (setup === 'business') {
        setIsOnboardingSetup(true);
        window.history.replaceState({}, '', '/settings?setup=business');
      } else {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTikTok = () => {
    window.open('https://www.tiktok.com/upload', '_blank', 'noopener,noreferrer');
  };

  const normaliseWebsiteUrl = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return '';

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    return `https://${trimmed}`;
  };

  const splitList = (value: string) => {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const joinList = (value: any) => {
    return Array.isArray(value) ? value.join(', ') : '';
  };

  const loadSocialConnections = async (authUserId: string) => {
    setLoadingConnections(true);

    try {
      const params = new URLSearchParams();
      params.set('user_id', authUserId);

      const response = await fetch(`/api/social-connections?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Could not load connected accounts.');
      }

      setSocialConnections(result?.connections || []);
    } catch (error: any) {
      console.error('Load connected accounts error:', error?.message || error);
      setSocialConnections([]);
    } finally {
      setLoadingConnections(false);
    }
  };

  const connectMetaAccount = async () => {
    let authUserId = userId;

    if (!authUserId) {
      const { data } = await supabase.auth.getUser();
      authUserId = data.user?.id || null;
    }

    if (!authUserId) {
      notify('Please sign in before connecting Facebook and Instagram.', 'warning', 'Sign in needed');
      return;
    }

    const params = new URLSearchParams();
    params.set('user_id', authUserId);
    params.set('return_to', isOnboardingSetup ? '/settings?setup=business' : '/settings');

    window.location.href = `/api/auth/meta/start?${params.toString()}`;
  };

  const disconnectMetaAccount = async (connectionId?: string | null) => {
    if (!userId) {
      notify('Please sign in again before disconnecting.', 'warning', 'Sign in needed');
      return;
    }

    setConfirmDialog({
      type: 'disconnectMeta',
      title: 'Disconnect Facebook and Instagram?',
      message:
        'Existing posts will stay saved, but FromOne will not be able to publish through this connection until you reconnect.',
      confirmLabel: 'Disconnect Meta',
      danger: true,
      connectionId: connectionId || null,
    });
  };

  const confirmDisconnectMetaAccount = async (connectionId?: string | null) => {
    if (!userId) {
      notify('Please sign in again before disconnecting.', 'warning', 'Sign in needed');
      closeConfirmDialog();
      return;
    }

    setDisconnectingConnectionId(connectionId || 'all');

    try {
      const response = await fetch('/api/social-connections/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          connection_id: connectionId || undefined,
          provider: 'meta',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Could not disconnect account.');
      }

      await loadSocialConnections(userId);
      closeConfirmDialog();
      notify('Facebook and Instagram disconnected.', 'success', 'Accounts disconnected');
    } catch (error: any) {
      console.error('Disconnect Meta account error:', error?.message || error);
      notify(error?.message || 'Could not disconnect account.', 'error', 'Disconnect failed');
    } finally {
      setDisconnectingConnectionId(null);
    }
  };

  const applyScannedProfile = (profile: ScannedBusinessProfile) => {
    if (profile.business_name) setBusinessName(profile.business_name);
    if (profile.industry) setIndustry(profile.industry);
    if (profile.location) setLocation(profile.location);
    if (Array.isArray(profile.services)) setServices(profile.services.join(', '));
    if (Array.isArray(profile.target_audience)) {
      setTargetAudience(profile.target_audience.join(', '));
    }
    if (profile.tone_of_voice) setToneOfVoice(profile.tone_of_voice);
    if (profile.main_offer) setMainOffer(profile.main_offer);
    if (Array.isArray(profile.content_pillars)) {
      setContentPillars(profile.content_pillars.join(', '));
    }
    if (Array.isArray(profile.business_goals)) {
      setBusinessGoals(profile.business_goals.join(', '));
    }
    if (profile.brand_primary_color) setBrandPrimaryColor(profile.brand_primary_color);
    if (profile.brand_secondary_color) setBrandSecondaryColor(profile.brand_secondary_color);
    if (profile.brand_accent_color) setBrandAccentColor(profile.brand_accent_color);
    if (profile.brand_logo_url) setBrandLogoUrl(profile.brand_logo_url);
    if (profile.brand_summary) setBrandSummary(profile.brand_summary);

    setShowBusinessDetails(true);
    setShowBrandDetails(false);
  };

  const handleScanWebsite = async () => {
    const website = normaliseWebsiteUrl(websiteUrl);

    if (!website) {
      notify('Add a website URL first.', 'warning', 'Website needed');
      return;
    }

    setWebsiteUrl(website);
    setScanningWebsite(true);
    setScanMessage('Scanning website...');

    try {
      const response = await fetch('/api/generatePosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'gemini',
          website,
          clientName: businessName || 'the business',
          industry: industry || 'general business',
          description:
            'Scan this website and return a business profile only. The posts can be ignored on this settings page.',
          selectedPlatforms: ['Facebook'],
          platforms: ['Facebook'],
          marketReach: location ? `Local customers in and around ${location}` : 'Local customers',
          numberOfPosts: 1,
          postCount: 1,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Could not scan the website.');
      }

      if (!result?.businessProfile) {
        throw new Error('The scan finished, but no business profile was returned.');
      }

      applyScannedProfile(result.businessProfile);
      setScanMessage('Website scanned. Review the details, then save your Business Profile.');
    } catch (error: any) {
      console.error('Website scan error:', error?.message || error);
      setScanMessage('');
      notify(error?.message || 'Could not scan the website.', 'error', 'Website scan failed');
    } finally {
      setScanningWebsite(false);
    }
  };

  const loadBusinessProfile = async () => {
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    let authUserId = authData.user?.id || null;

    if (authError) {
      const message = String(authError.message || '').toLowerCase();

      const isMissingSession =
        message.includes('auth session missing') ||
        authError.name === 'AuthSessionMissingError';

      if (!isMissingSession) {
        console.error('Auth error:', authError.message);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      authUserId = sessionData.session?.user?.id || null;
    }

    if (!authUserId) {
      setUserId(null);
      setLoading(false);
      return;
    }

    setUserId(authUserId);
    await loadSocialConnections(authUserId);

    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', authUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading business profile:', error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setProfileId(data.id || null);
      setWebsiteUrl(data.website_url || '');
      setBusinessName(data.business_name || '');
      setIndustry(data.industry || '');
      setLocation(data.location || '');
      setServices(joinList(data.services));
      setTargetAudience(joinList(data.target_audience));
      setToneOfVoice(data.tone_of_voice || 'Professional');
      setMainOffer(data.main_offer || '');
      setContentPillars(joinList(data.content_pillars));
      setBusinessGoals(joinList(data.business_goals));
      setBrandPrimaryColor(data.brand_primary_color || '#ffd43b');
      setBrandSecondaryColor(data.brand_secondary_color || '#101420');
      setBrandAccentColor(data.brand_accent_color || '#3ddc97');
      setBrandLogoUrl(data.brand_logo_url || '');
      setBrandSummary(data.brand_summary || '');
    }

    const params = new URLSearchParams(window.location.search);
    const setup = params.get('setup');
    const setupActive = setup === 'business';

    setIsOnboardingSetup(setupActive);
    setShowBusinessDetails(setupActive && !data);
    setShowBrandDetails(false);
    setLoading(false);
  };

  const buildPayload = async () => {
    const authUserId = await getFreshAuthUserId();

    return {
      user_id: authUserId,
      website_url: normaliseWebsiteUrl(websiteUrl) || null,
      business_name: businessName.trim() || null,
      industry: industry.trim() || null,
      location: location.trim() || null,
      services: splitList(services),
      target_audience: splitList(targetAudience),
      tone_of_voice: toneOfVoice,
      main_offer: mainOffer.trim() || null,
      content_pillars: splitList(contentPillars),
      business_goals: splitList(businessGoals),
      brand_primary_color: brandPrimaryColor.trim() || null,
      brand_secondary_color: brandSecondaryColor.trim() || null,
      brand_accent_color: brandAccentColor.trim() || null,
      brand_logo_url: brandLogoUrl.trim() || null,
      brand_summary: brandSummary.trim() || null,
      updated_at: new Date().toISOString(),
    };
  };

  const saveProfile = async () => {
    const payload = await buildPayload();

    if (!payload.user_id) {
      throw new Error('Please sign in again before saving settings.');
    }

    if (profileId) {
      const { error } = await supabase
        .from('business_profiles')
        .update(payload)
        .eq('id', profileId)
        .eq('user_id', payload.user_id);

      if (error) throw error;

      return profileId;
    }

    const { data, error } = await supabase
      .from('business_profiles')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    setProfileId(data.id);
    return data.id;
  };

  const handleSaveProfile = async () => {
    const hasWebsite = Boolean(websiteUrl.trim());
    const hasBusinessDetails = Boolean(businessName.trim() && industry.trim());

    if (!hasWebsite && !hasBusinessDetails) {
      notify('Please add a website URL, or add at least a business name and industry.', 'warning', 'Profile details needed');
      return;
    }

    setSaving(true);

    try {
      await saveProfile();

      const params = new URLSearchParams(window.location.search);
      const setup = params.get('setup');

      setShowBusinessDetails(false);
      setShowBrandDetails(false);

      if (setup === 'business') {
        notify('You can now connect Facebook and Instagram, or continue to Dashboard.', 'success', 'Business Profile saved');
        await loadBusinessProfile();
        scrollToSocialConnections();
        return;
      }

      notify('Business Profile saved.', 'success', 'Profile saved');
      await loadBusinessProfile();
      scrollToSocialConnections();
    } catch (error: any) {
      console.error('Error saving business profile:', error?.message || error);
      notify(error?.message || 'Error saving Business Profile.', 'error', 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const getFreshAuthUserId = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (!error && data.user?.id) {
      return data.user.id;
    }

    if (error) {
      const message = String(error.message || '').toLowerCase();
      const isMissingSession =
        message.includes('auth session missing') ||
        error.name === 'AuthSessionMissingError';

      if (!isMissingSession) {
        console.error('Auth refresh error:', error.message);
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();

    return sessionData.session?.user?.id || userId || null;
  };

  const handleResetForm = () => {
    setWebsiteUrl('');
    setBusinessName('');
    setIndustry('');
    setLocation('');
    setServices('');
    setTargetAudience('');
    setToneOfVoice('Professional');
    setMainOffer('');
    setContentPillars('');
    setBusinessGoals('');
    setBrandPrimaryColor('#ffd43b');
    setBrandSecondaryColor('#101420');
    setBrandAccentColor('#3ddc97');
    setBrandLogoUrl('');
    setBrandSummary('');
    setScanMessage('');
    setShowBusinessDetails(true);
    setShowBrandDetails(false);

    window.setTimeout(() => {
      profileEditorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  };

  const handleDeleteProfile = async () => {
    const freshUserId = await getFreshAuthUserId();

    if (!freshUserId) {
      notify('Please sign in again before deleting this profile.', 'warning', 'Sign in needed');
      return;
    }

    setUserId(freshUserId);

    if (!profileId) {
      handleResetForm();
      notify('There is no saved Business Profile to delete. The form has been cleared.', 'info', 'No saved profile');
      return;
    }

    setConfirmDialog({
      type: 'deleteProfile',
      title: 'Delete Business Profile?',
      message:
        'This removes the saved Business Profile from Supabase. Existing weekly posts will not be deleted.',
      confirmLabel: 'Delete Business Profile',
      danger: true,
    });
  };

  const confirmDeleteProfile = async () => {
    if (!profileId) {
      handleResetForm();
      closeConfirmDialog();
      notify('There is no saved Business Profile to delete. The form has been cleared.', 'info', 'No saved profile');
      return;
    }

    const freshUserId = await getFreshAuthUserId();

    if (!freshUserId) {
      notify('Please sign in again before deleting this profile.', 'warning', 'Sign in needed');
      closeConfirmDialog();
      return;
    }

    setUserId(freshUserId);
    setSaving(true);

    try {
      const { error } = await supabase
        .from('business_profiles')
        .delete()
        .eq('id', profileId)
        .eq('user_id', freshUserId);

      if (error) throw error;

      setProfileId(null);
      handleResetForm();
      closeConfirmDialog();
      notify('Business Profile deleted. You can add new details now.', 'success', 'Profile deleted');
    } catch (error: any) {
      console.error('Error deleting business profile:', error?.message || error);
      notify(error?.message || 'Error deleting Business Profile.', 'error', 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {loading ? (
        <div className="premium-card">
          <p>Loading Business Profile...</p>
        </div>
      ) : (
        <>
          <section
            className="premium-card settings-setup-guide"
            style={{
              maxWidth: 1120,
              margin: '0 auto 22px',
              borderRadius: 34,
              border: '1px solid rgba(255, 212, 59, 0.24)',
              background:
                'radial-gradient(circle at top, rgba(255, 212, 59, 0.16), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.032))',
              boxShadow: '0 30px 96px rgba(0,0,0,0.34)',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: 860, margin: '0 auto 28px' }}>
              <div className="page-eyebrow">Settings</div>
              <h1
                className="page-title"
                style={{
                  margin: '8px 0 12px',
                  fontSize: 'clamp(2.4rem, 5.2vw, 4.8rem)',
                  lineHeight: 0.92,
                  letterSpacing: '-0.06em',
                }}
              >
                Business setup
              </h1>
              <p className="page-description" style={{ margin: '0 auto', maxWidth: 760 }}>
                Set up the business profile, connect publishing channels, then create weekly posts from uploaded media.
              </p>
            </div>

            <div className="page-eyebrow">Setup guide</div>
            <h2
              style={{
                margin: '0 0 10px',
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                lineHeight: 0.98,
                letterSpacing: '-0.06em',
              }}
            >
              Set up FromOne in three steps.
            </h2>
            <p style={{ maxWidth: 850, margin: 0 }}>
              Complete the profile once, connect Meta when you want autoposting, then create posts from Dashboard.
            </p>

            <div
              className="settings-setup-step-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 14,
                marginTop: 22,
              }}
            >
              <article
                className="card settings-setup-step-card"
                style={{
                  padding: 18,
                  borderRadius: 24,
                  background:
                    'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                }}
              >
                <span className="status-pill">Step 1</span>
                <h3 style={{ margin: '14px 0 8px', fontSize: 24 }}>Set up profile</h3>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  Add the business name, industry, location, services and customers.
                </p>
              </article>

              <article
                className="card settings-setup-step-card"
                style={{
                  padding: 18,
                  borderRadius: 24,
                  background:
                    'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                }}
              >
                <span className="status-pill">Step 2</span>
                <h3 style={{ margin: '14px 0 8px', fontSize: 24 }}>Connect channels</h3>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  Connect Facebook and Instagram for autoposting. TikTok can stay manual.
                </p>
              </article>

              <article
                className="card settings-setup-step-card"
                style={{
                  padding: 18,
                  borderRadius: 24,
                  background:
                    'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                }}
              >
                <span className="status-pill">Step 3</span>
                <h3 style={{ margin: '14px 0 8px', fontSize: 24 }}>Create posts</h3>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  Go to Dashboard, upload photos, videos or flyers, and create the weekly post plan.
                </p>
              </article>
            </div>
          </section>

          <section
            className="premium-card settings-numbered-section settings-profile-start-card"
            style={{
              maxWidth: 1120,
              margin: '0 auto 22px',
              borderRadius: 34,
              border: '1px solid rgba(255, 212, 59, 0.24)',
              background:
                'radial-gradient(circle at top right, rgba(255, 212, 59, 0.16), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))',
              boxShadow: '0 26px 84px rgba(0,0,0,0.28)',
            }}
          >
            <div className="settings-profile-start-layout">
              <div className="settings-profile-start-copy">
                <div className="settings-live-step-label">
                  <span>1</span>
                  <strong>Business Profile</strong>
                </div>

                <h2>
                  {businessName ? `${businessName} is ready to improve.` : 'Tell FromOne about the business.'}
                </h2>

                <p>
                  This is the most important setup step. FromOne uses these details to write posts
                  that sound relevant to the business, the services, the location and the customer.
                </p>

                <div className="settings-profile-choice-grid">
                  <button
                    type="button"
                    className="settings-profile-choice-card"
                    onClick={() => {
                      setShowBusinessDetails(true);
                      window.setTimeout(() => {
                        document.getElementById('website-setup-card')?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }, 80);
                    }}
                  >
                    <span>Fastest</span>
                    <strong>Scan a website</strong>
                    <small>Add the website and FromOne will try to fill the profile for you.</small>
                  </button>

                  <button
                    type="button"
                    className={
                      !showBusinessDetails && profileCompletionPercent < 100
                        ? 'settings-profile-choice-card settings-setup-profile-button-pulse'
                        : 'settings-profile-choice-card'
                    }
                    onClick={openProfileEditor}
                  >
                    <span>No website?</span>
                    <strong>Enter details manually</strong>
                    <small>Add the business name, services, customers and tone yourself.</small>
                  </button>
                </div>

                {profileCompletionPercent < 100 && !showBusinessDetails && (
                  <p className="settings-profile-incomplete-hint settings-profile-soft-hint">
                    Finish the Business Profile first so FromOne can create better posts.
                  </p>
                )}
              </div>

              <div className="settings-profile-strength-card settings-profile-simple-progress">
                <div className="page-eyebrow">Profile progress</div>

                <div className="settings-profile-progress-head">
                  <h3>{profileCompletionPercent}%</h3>
                  <span className="status-pill">
                    {profileCompletionPercent >= 100
                      ? 'Complete'
                      : profileCompletionPercent >= 80
                        ? 'Nearly there'
                        : 'Needs details'}
                  </span>
                </div>

                <div className="settings-profile-progress-bar" aria-hidden="true">
                  <span style={{ width: `${profileCompletionPercent}%` }} />
                </div>

                <p>
                  Complete the simple checklist below. More detail helps FromOne create more useful
                  captions, calls to action and post ideas.
                </p>

                <div className="settings-profile-checklist">
                  {profileCompletionItems.map((item) => (
                    <span key={item.label} className={item.ready ? 'is-ready' : undefined}>
                      <strong>{item.ready ? '✓' : '•'}</strong>
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {showBusinessDetails && (
            <section
              ref={profileEditorRef}
              id="business-profile-editor"
              className="premium-card settings-profile-wizard-card"
              style={{
                scrollMarginTop: 96,
                maxWidth: 1120,
                margin: '0 auto 22px',
                borderRadius: 34,
                border: '1px solid rgba(255, 212, 59, 0.22)',
                background:
                  'radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.032))',
                boxShadow: '0 26px 84px rgba(0,0,0,0.28)',
              }}
            >
              <div className="settings-profile-wizard-head">
                <div>
                  <div className="page-eyebrow">Business Profile setup</div>
                  <h2>Start simple. You can improve it later.</h2>
                  <p>
                    Use the website scan if you have a website, or fill in the simple fields manually.
                    The required fields are marked clearly.
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowBusinessDetails(false)}
                >
                  Close setup
                </button>
              </div>

              <div id="website-setup-card" className="settings-simple-setup-grid">
                <section className="settings-simple-setup-card">
                  <span className="settings-simple-step">Option 1</span>
                  <h3>Scan the website</h3>
                  <p>
                    Add the website URL and FromOne will try to detect the business name, services,
                    tone and useful profile details. You can edit anything before saving.
                  </p>

                  <label>
                    <strong>Website URL</strong>
                    <span>Example: https://yourbusiness.co.uk</span>
                  </label>

                  <input
                    className="input"
                    value={websiteUrl}
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                    placeholder="https://example.com"
                  />

                  <div className="button-row settings-simple-button-row">
                    <button
                      type="button"
                      onClick={handleScanWebsite}
                      disabled={scanningWebsite || saving}
                    >
                      {scanningWebsite ? 'Scanning...' : 'Scan website'}
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save profile'}
                    </button>
                  </div>

                  {scanMessage && (
                    <p className="settings-scan-message">
                      {scanMessage}
                    </p>
                  )}
                </section>

                <section className="settings-simple-setup-card">
                  <span className="settings-simple-step">Option 2</span>
                  <h3>Enter the basics manually</h3>
                  <p>
                    No website? No problem. Add the main business details below. Simple, clear
                    answers are enough to get started.
                  </p>

                  <div className="settings-required-note">
                    Required to start: <strong>Business name</strong> and <strong>Industry</strong>.
                    The rest makes the posts better.
                  </div>
                </section>
              </div>

              <div className="settings-simple-form-grid">
                <section className="settings-form-panel">
                  <div className="settings-form-panel-head">
                    <span>Required basics</span>
                    <strong>Who is the business?</strong>
                  </div>

                  <label>
                    <strong>Business name *</strong>
                    <span>The name customers know.</span>
                  </label>
                  <input
                    className="input"
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="Example: Baker Roofing"
                  />

                  <label>
                    <strong>Industry *</strong>
                    <span>What type of business is it?</span>
                  </label>
                  <input
                    className="input settings-mobile-editable-input"
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                    autoComplete="organization-title"
                    inputMode="text"
                    placeholder="Example: Roofing, Beauty, Fitness"
                  />

                  <label>
                    <strong>Location or service area</strong>
                    <span>Where does the business operate?</span>
                  </label>
                  <input
                    className="input settings-mobile-editable-input"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    autoComplete="address-level2"
                    inputMode="text"
                    placeholder="Example: Manchester, UK"
                  />

                  <label>
                    <strong>Services</strong>
                    <span>Separate each service with a comma.</span>
                  </label>
                  <textarea
                    className="input"
                    value={services}
                    onChange={(event) => setServices(event.target.value)}
                    placeholder="Example: Roof repairs, gutter cleaning, emergency callouts"
                    rows={5}
                  />
                </section>

                <section className="settings-form-panel">
                  <div className="settings-form-panel-head">
                    <span>Helpful details</span>
                    <strong>Who should the posts speak to?</strong>
                  </div>

                  <label>
                    <strong>Target customers</strong>
                    <span>Who should the posts be written for?</span>
                  </label>
                  <textarea
                    className="input"
                    value={targetAudience}
                    onChange={(event) => setTargetAudience(event.target.value)}
                    placeholder="Example: Homeowners, landlords, local businesses"
                    rows={5}
                  />

                  <label>
                    <strong>Tone of voice</strong>
                    <span>How should the content sound?</span>
                  </label>
                  <select
                    className="input"
                    value={toneOfVoice}
                    onChange={(event) => setToneOfVoice(event.target.value)}
                  >
                    {toneOptions.map((tone) => (
                      <option key={tone} value={tone}>
                        {tone}
                      </option>
                    ))}
                  </select>

                  <label>
                    <strong>Main offer or CTA</strong>
                    <span>Optional offer, service, or action to promote.</span>
                  </label>
                  <textarea
                    className="input"
                    value={mainOffer}
                    onChange={(event) => setMainOffer(event.target.value)}
                    placeholder="Example: Book a free quote this month"
                    rows={4}
                  />

                  <div className="settings-optional-details">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setShowBrandDetails((current) => !current)}
                    >
                      {showBrandDetails ? 'Hide extra details' : 'Add content themes'}
                    </button>
                  </div>
                </section>
              </div>

              {showBrandDetails && (
                <section className="settings-extra-details-card">
                  <div>
                    <div className="page-eyebrow">Optional extras</div>
                    <h3>Content themes and goals</h3>
                    <p>
                      These are optional. Add them if you want FromOne to understand what the
                      business talks about and what results you want from the posts.
                    </p>
                  </div>

                  <div className="settings-simple-form-grid settings-content-themes-grid">
                    <label>
                      <strong>Content themes</strong>
                      <span>Separate each theme with a comma.</span>
                      <textarea
                        className="input"
                        value={contentPillars}
                        onChange={(event) => setContentPillars(event.target.value)}
                        placeholder="Example: Tips, reviews, offers, before and afters"
                        rows={4}
                      />
                    </label>

                    <label>
                      <strong>Business goals</strong>
                      <span>Separate each goal with a comma.</span>
                      <textarea
                        className="input"
                        value={businessGoals}
                        onChange={(event) => setBusinessGoals(event.target.value)}
                        placeholder="Example: More calls, more bookings, more enquiries"
                        rows={4}
                      />
                    </label>
                  </div>
                </section>
              )}

              <div className="settings-save-strip">
                <div>
                  <strong>Ready?</strong>
                  <span>Save the Business Profile before creating posts.</span>
                </div>

                <button type="button" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Business Profile'}
                </button>
              </div>
            </section>
          )}

          {showOnboardingNextStep && (
            <section
              className="premium-card"
              style={{
                maxWidth: 1120,
                margin: '0 auto 22px',
                borderRadius: 34,
                border: '1px solid rgba(255, 212, 59, 0.26)',
                background:
                  'radial-gradient(circle at top right, rgba(255, 212, 59, 0.16), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.035))',
              }}
            >
              <div className="page-eyebrow">Next step</div>
              <h2 style={{ marginTop: 0 }}>
                {hasMetaConnection ? 'Ready for the Dashboard.' : 'Ready for the Dashboard'}
              </h2>
              <p style={{ maxWidth: 820 }}>
                {hasMetaConnection
                  ? 'Your Business Profile is saved and your publishing channels are connected. Continue to Dashboard to upload media and create your first scheduled posts.'
                  : 'Your Business Profile is saved. Connect Facebook and Instagram using the cards below for autoposting, or continue to Dashboard and connect later.'}
              </p>

              <div className="button-row" style={{ marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/dashboard';
                  }}
                >
                  Continue to Dashboard
                </button>
              </div>

              {!hasMetaConnection && (
                <p style={{ margin: '14px 0 0', color: 'var(--muted)', fontSize: 14 }}>
                  The Facebook and Instagram connection cards are directly below this section.
                </p>
              )}
            </section>
          )}

          <section
            ref={socialConnectionsRef}
            id="publishing-connections"
            className={`premium-card settings-numbered-section settings-connections-section`}
            style={{
              scrollMarginTop: 96,
              maxWidth: 1120,
              margin: '0 auto 22px',
              borderRadius: 34,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="settings-live-step-label">
              <span>2</span>
              <strong>Connect publishing channels</strong>
            </div>
            <h2 style={{ marginTop: 0 }}>Connect publishing channels</h2>
            <p style={{ maxWidth: 820 }}>
              Connect Meta once for Facebook and Instagram autoposting. TikTok stays simple with copy/open manual posting.
            </p>

            <div
              className="settings-meta-account-note"
              style={{
                marginTop: 14,
                padding: '13px 15px',
                borderRadius: 20,
                background: 'rgba(255, 212, 59, 0.085)',
                border: '1px solid rgba(255, 212, 59, 0.16)',
                color: '#ffe58a',
                fontWeight: 850,
                lineHeight: 1.45,
              }}
            >
              Personal accounts can still use FromOne to create, edit and prepare posts.
              Direct publishing and automatic scheduling through Meta are only available
              for connected business/professional accounts, such as a Facebook Page or
              Instagram professional account. Personal accounts can use manual posting.
            </div>

            <div
              className="card settings-publishing-rules-compact"
              style={{
                padding: 18,
                borderRadius: 24,
                marginTop: 18,
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))',
                border: '1px solid rgba(255, 212, 59, 0.14)',
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowPublishingRules((current) => !current)}
                aria-expanded={showPublishingRules}
                aria-controls="publishing-rules-panel"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  padding: '16px 18px',
                  borderRadius: 20,
                  textAlign: 'left',
                  background: 'rgba(255,255,255,0.045)',
                }}
              >
                <span style={{ display: 'grid', gap: 4 }}>
                  <span className="page-eyebrow" style={{ margin: 0 }}>Publishing rules</span>
                  <strong style={{ color: '#fff', fontSize: 18 }}>
                    What can autopost, what needs media, and what is manual
                  </strong>
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    flex: '0 0 auto',
                    width: 34,
                    height: 34,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 999,
                    background: 'rgba(255, 212, 59, 0.12)',
                    color: '#ffe58a',
                    fontSize: 22,
                    lineHeight: 1,
                  }}
                >
                  {showPublishingRules ? '−' : '+'}
                </span>
              </button>

              {showPublishingRules && (
                <div
                  id="publishing-rules-panel"
                  style={{
                    display: 'grid',
                    gap: 14,
                    marginTop: 16,
                    padding: '2px 2px 0',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 18,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <strong>Facebook</strong>
                      <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.45 }}>
                        Can autopost to a connected Facebook Page after Meta is connected. Personal Facebook profiles can still use manual posting.
                      </p>
                    </div>

                    <div
                      style={{
                        padding: 14,
                        borderRadius: 18,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <strong>Instagram</strong>
                      <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.45 }}>
                        Can autopost to an Instagram professional account connected through Meta, but needs an image or video. Personal Instagram accounts can still use manual posting.
                      </p>
                    </div>

                    <div
                      style={{
                        padding: 14,
                        borderRadius: 18,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <strong>TikTok</strong>
                      <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.45 }}>
                        Manual for now. FromOne creates the caption, then you copy it and open TikTok yourself.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                      gap: 12,
                      paddingTop: 2,
                    }}
                  >
                    <div>
                      <strong>Split platforms</strong>
                      <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.45 }}>
                        Posts are divided across the platforms you choose.
                      </p>
                    </div>

                    <div>
                      <strong>Every platform</strong>
                      <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.45 }}>
                        Each upload gets versions for every selected platform.
                      </p>
                    </div>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      padding: '12px 14px',
                      borderRadius: 18,
                      background: 'rgba(255, 212, 59, 0.09)',
                      border: '1px solid rgba(255, 212, 59, 0.14)',
                      color: '#ffe58a',
                      fontWeight: 850,
                      lineHeight: 1.45,
                    }}
                  >
                    You always review posts before publishing, copying or scheduling. Manual posting is available for personal accounts and any platform connection that needs attention.
                  </p>
                </div>
              )}
            </div>

            {loadingConnections ? (
              <p>Checking connected accounts...</p>
            ) : (
              <div
                className="settings-channel-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 16,
                  marginTop: 20,
                  alignItems: 'stretch',
                }}
              >
                <section
                  className="card settings-channel-card settings-channel-card-premium settings-channel-card-compact settings-channel-card-clean settings-channel-card-short"
                  style={{
                    padding: 20,
                    borderRadius: 24,
                    background:
                      hasFacebookConnection
                        ? 'radial-gradient(circle at top right, rgba(61, 220, 151, 0.13), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.03))'
                        : 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))',
                    border: hasFacebookConnection
                      ? '1px solid rgba(61, 220, 151, 0.24)'
                      : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div>
                    <div className="settings-channel-card-head">
                      <div>
                        <div className="page-eyebrow">Facebook</div>
                        <h3 style={{ margin: '6px 0 8px', fontSize: 24 }}>
                          Facebook Page
                        </h3>
                      </div>


                    </div>

                    <div className="settings-connected-account-box">
                      <span>Destination</span>
                      <strong>
                        {hasFacebookConnection
                          ? primaryMetaConnection?.page_name || 'Connected Facebook Page'
                          : 'Facebook not connected'}
                      </strong>
                      <small>
                        {hasFacebookConnection
                          ? `Page ID: ${primaryMetaConnection?.page_id || 'Connected'}`
                          : 'Connect Meta to enable direct publishing.'}
                      </small>
                    </div>


                  </div>

                  <button
                    type="button"
                    className={hasMetaConnection ? 'secondary-button' : undefined}
                    onClick={connectMetaAccount}
                    disabled={metaConnectionBusy}
                    style={{ width: '100%' }}
                  >
                    {hasFacebookConnection ? 'Reconnect / manage' : 'Connect Facebook'}
                  </button>
                </section>

                <section
                  className="card settings-channel-card settings-channel-card-premium settings-channel-card-compact settings-channel-card-clean settings-channel-card-short"
                  style={{
                    padding: 20,
                    borderRadius: 24,
                    background:
                      hasInstagramConnection
                        ? 'radial-gradient(circle at top right, rgba(61, 220, 151, 0.13), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.03))'
                        : 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))',
                    border: hasInstagramConnection
                      ? '1px solid rgba(61, 220, 151, 0.24)'
                      : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div>
                    <div className="settings-channel-card-head">
                      <div>
                        <div className="page-eyebrow">Instagram</div>
                        <h3 style={{ margin: '6px 0 8px', fontSize: 24 }}>
                          Instagram Account
                        </h3>
                      </div>


                    </div>

                    <div className="settings-connected-account-box">
                      <span>Account</span>
                      <strong>
                        {hasInstagramConnection
                          ? `@${primaryMetaConnection?.instagram_username || 'Instagram'}`
                          : 'Instagram not connected'}
                      </strong>
                      <small>
                        {hasInstagramConnection
                          ? 'Image and video posts can be autoposted after review.'
                          : hasMetaConnection
                            ? 'Meta is connected, but Instagram is not linked yet.'
                            : 'Connect through Meta for direct publishing.'}
                      </small>
                    </div>


                  </div>

                  <button
                    type="button"
                    className={hasMetaConnection ? 'secondary-button' : undefined}
                    onClick={connectMetaAccount}
                    disabled={metaConnectionBusy}
                    style={{ width: '100%' }}
                  >
                    {hasInstagramConnection ? 'Reconnect / manage' : 'Connect Instagram'}
                  </button>
                </section>

                <section
                  className="card settings-channel-card settings-channel-card-premium settings-channel-card-compact settings-channel-card-clean settings-channel-card-short"
                  style={{
                    padding: 20,
                    borderRadius: 24,
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div>
                    <div className="settings-channel-card-head">
                      <div>
                        <div className="page-eyebrow">TikTok</div>
                        <h3 style={{ margin: '6px 0 8px', fontSize: 24 }}>
                          Manual posting
                        </h3>
                      </div>


                    </div>

                    <div className="settings-connected-account-box">
                      <span>Method</span>
                      <strong>Copy and open TikTok</strong>
                      <small>FromOne creates the caption. You publish manually.</small>
                    </div>


                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={openTikTok}
                    style={{ width: '100%' }}
                  >
                    Open TikTok
                  </button>
                </section>
              </div>
            )}

            {hasMetaConnection && (
              <div
                className="settings-meta-summary-card"
                style={{
                  marginTop: 18,
                  padding: 18,
                  borderRadius: 24,
                  background:
                    'radial-gradient(circle at top left, rgba(61, 220, 151, 0.12), transparent 34%), rgba(255,255,255,0.055)',
                  border: '1px solid rgba(61, 220, 151, 0.18)',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 14,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div className="page-eyebrow">Meta connection</div>
                  <h3 style={{ margin: '6px 0 8px', color: '#fff' }}>
                    Facebook and Instagram are managed through Meta.
                  </h3>
                  <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.5 }}>
                    Last checked: {getMetaUpdatedLabel()} · Token expiry: {getMetaExpiryLabel()}
                  </p>
                </div>

                <div className="button-row" style={{ justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={connectMetaAccount}
                    disabled={metaConnectionBusy}
                  >
                    Reconnect
                  </button>

                  <button
                    type="button"
                    className="secondary-button danger-button"
                    onClick={() => disconnectMetaAccount(primaryMetaConnection?.id)}
                    disabled={metaConnectionBusy}
                  >
                    {metaConnectionBusy ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>
            )}

          </section>

          <section
            className={`premium-card settings-numbered-section settings-create-posts-section`}
            style={{
              maxWidth: 1120,
              margin: '0 auto 22px',
              borderRadius: 34,
              border: '1px solid rgba(255, 212, 59, 0.26)',
              background:
                'radial-gradient(circle at top right, rgba(255, 212, 59, 0.16), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.035))',
              boxShadow: '0 26px 84px rgba(0,0,0,0.28)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 320px)',
                gap: 22,
                alignItems: 'center',
              }}
            >
              <div>
                <div className="settings-live-step-label">
                  <span>3</span>
                  <strong>Create posts</strong>
                </div>
                <h2
                  style={{
                    margin: '0 0 10px',
                    fontSize: 'clamp(2rem, 4vw, 3.4rem)',
                    lineHeight: 0.96,
                    letterSpacing: '-0.06em',
                  }}
                >
                  Create weekly posts.
                </h2>
                <p style={{ maxWidth: 820, margin: 0 }}>
                  Your Business Profile is saved. Upload photos, videos or flyers on the
                  Dashboard and FromOne will turn them into ready-to-review social posts.
                  Personal accounts can create and prepare posts. Direct publishing and automatic
                  scheduling through Meta require a connected Facebook Page or Instagram professional
                  account; TikTok stays copy/open manually for now.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  padding: 18,
                  borderRadius: 24,
                  background: 'rgba(5, 10, 24, 0.34)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <button
                  type="button"
                  className={undefined}
                  onClick={() => {
                    window.location.href = '/dashboard';
                  }}
                  style={{ width: '100%' }}
                >
                  Create posts
                </button>

                <p
                  style={{
                    margin: 0,
                    color: 'var(--muted)',
                    fontSize: 14,
                    lineHeight: 1.45,
                    textAlign: 'center',
                  }}
                >
                  You can connect or manage publishing channels later from this page.
                </p>
              </div>
            </div>
          </section>

          <section className="manual-collapse-card manual-open-card" style={{ maxWidth: 1120, margin: '0 auto 22px', opacity: showDangerZone ? 1 : 0.72 }}>
            <div className="manual-collapse-content manual-visible-content">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowDangerZone(!showDangerZone)}
              >
                {showDangerZone ? 'Hide advanced options' : 'Advanced options'}
              </button>

              {showDangerZone && (
                <div style={{ marginTop: '18px' }}>
                  <div className="page-eyebrow">Advanced options</div>
                  <h2>Reset or delete profile data.</h2>
                  <p>
                    Clear form only clears what you see on this screen. Delete saved profile removes
                    the saved Business Profile from Supabase after confirmation.
                  </p>

                  <div className="button-row">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        handleResetForm();
                        notify('The form has been cleared on screen. Save only if you want to keep these changes.', 'info', 'Form cleared');
                      }}
                      disabled={saving}
                    >
                      Clear form
                    </button>

                    <button
                      type="button"
                      className="secondary-button danger-button"
                      onClick={handleDeleteProfile}
                      disabled={saving}
                    >
                      Delete Business Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <style jsx global>{`
        .settings-profile-start-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
          gap: 24px;
          align-items: stretch;
        }

        .settings-profile-start-copy h2,
        .settings-profile-wizard-head h2 {
          margin: 0 0 12px;
          font-size: clamp(2rem, 4vw, 3.4rem);
          line-height: 0.95;
          letter-spacing: -0.06em;
        }

        .settings-profile-start-copy p,
        .settings-profile-wizard-head p {
          max-width: 780px;
          color: rgba(248,250,252,0.74);
          line-height: 1.6;
        }

        .settings-profile-choice-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 20px;
        }

        .settings-profile-choice-card {
          appearance: none;
          width: 100%;
          min-height: 154px;
          display: grid;
          gap: 8px;
          align-content: start;
          text-align: left;
          padding: 18px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.1);
          background:
            radial-gradient(circle at top left, rgba(255, 212, 59, 0.09), transparent 34%),
            linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.028));
          color: #ffffff;
          cursor: pointer;
        }

        .settings-profile-choice-card span,
        .settings-simple-step,
        .settings-form-panel-head span {
          width: fit-content;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.11);
          border: 1px solid rgba(255, 212, 59, 0.18);
          color: #ffe58a;
          font-size: 0.75rem;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .settings-profile-choice-card strong {
          font-size: 1.22rem;
          line-height: 1.1;
        }

        .settings-profile-choice-card small {
          color: rgba(248,250,252,0.64);
          font-size: 0.92rem;
          line-height: 1.45;
          font-weight: 760;
        }

        .settings-profile-soft-hint {
          margin-top: 14px !important;
        }

        .settings-profile-simple-progress {
          display: grid;
          align-content: start;
          gap: 12px;
          padding: 22px !important;
        }

        .settings-profile-progress-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
        }

        .settings-profile-progress-head h3 {
          margin: 0;
          font-size: clamp(2.7rem, 6vw, 4.2rem);
          line-height: 0.9;
          letter-spacing: -0.07em;
        }

        .settings-profile-progress-bar {
          height: 12px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .settings-profile-progress-bar span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(135deg, #ffd43b, #f7b733);
          box-shadow: 0 0 22px rgba(255, 212, 59, 0.28);
        }

        .settings-profile-simple-progress p {
          margin: 0;
          color: rgba(248,250,252,0.7);
          line-height: 1.5;
        }

        .settings-profile-checklist {
          display: grid;
          gap: 8px;
        }

        .settings-profile-checklist span {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr);
          gap: 9px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.7);
          font-weight: 850;
        }

        .settings-profile-checklist span.is-ready {
          background: rgba(61, 220, 151, 0.09);
          border-color: rgba(61, 220, 151, 0.18);
          color: #a7f3d0;
        }

        .settings-profile-wizard-card {
          overflow: hidden;
        }

        .settings-profile-wizard-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: start;
          margin-bottom: 22px;
        }

        .settings-simple-setup-grid,
        .settings-simple-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .settings-simple-setup-grid {
          margin-bottom: 18px;
        }

        .settings-simple-setup-card,
        .settings-form-panel,
        .settings-extra-details-card {
          padding: 18px;
          border-radius: 26px;
          background: rgba(5, 10, 24, 0.34);
          border: 1px solid rgba(255,255,255,0.09);
        }

        .settings-simple-setup-card h3,
        .settings-form-panel h3,
        .settings-extra-details-card h3 {
          margin: 12px 0 8px;
          font-size: 1.45rem;
          line-height: 1.1;
        }

        .settings-simple-setup-card p,
        .settings-extra-details-card p {
          color: rgba(248,250,252,0.68);
          line-height: 1.55;
        }

        .settings-simple-setup-card label,
        .settings-form-panel label,
        .settings-extra-details-card label {
          display: grid;
          gap: 6px;
          margin-top: 14px;
        }

        .settings-simple-setup-card label strong,
        .settings-form-panel label strong,
        .settings-extra-details-card label strong {
          color: #ffffff;
        }

        .settings-simple-setup-card label span,
        .settings-form-panel label span,
        .settings-extra-details-card label span {
          color: rgba(248,250,252,0.64);
          line-height: 1.4;
        }

        .settings-simple-button-row {
          margin-top: 14px;
        }

        .settings-scan-message,
        .settings-required-note {
          margin: 14px 0 0;
          padding: 12px 14px;
          border-radius: 18px;
          background: rgba(255, 212, 59, 0.09);
          border: 1px solid rgba(255, 212, 59, 0.16);
          color: #ffe58a;
          font-weight: 850;
          line-height: 1.45;
        }

        .settings-form-panel-head {
          display: grid;
          gap: 10px;
          margin-bottom: 4px;
        }

        .settings-form-panel-head strong {
          color: #ffffff;
          font-size: 1.25rem;
          line-height: 1.2;
        }

        .settings-optional-details {
          margin-top: 16px;
        }

        .settings-extra-details-card {
          margin-top: 18px;
        }

        .settings-content-themes-grid {
          align-items: start;
        }

        .settings-save-strip {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          margin-top: 18px;
          padding: 16px;
          border-radius: 24px;
          background: rgba(255, 212, 59, 0.085);
          border: 1px solid rgba(255, 212, 59, 0.16);
        }

        .settings-save-strip strong {
          display: block;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .settings-save-strip span {
          color: rgba(248,250,252,0.68);
          font-weight: 760;
        }

        
        .settings-channel-card-compact {
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          gap: 14px;
          min-height: 0 !important;
        }

        .settings-channel-card-compact .settings-channel-card-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          align-items: start;
        }

        .settings-channel-card-compact .settings-channel-card-head h3 {
          font-size: clamp(1.15rem, 2vw, 1.45rem) !important;
          line-height: 1.05 !important;
        }

        .settings-channel-card-compact .settings-connected-account-box {
          padding: 14px 16px !important;
          border-radius: 22px !important;
          min-height: 0 !important;
        }

        .settings-channel-card-compact .settings-connected-account-box span {
          font-size: 0.74rem !important;
          letter-spacing: 0.09em !important;
        }

        .settings-channel-card-compact .settings-connected-account-box strong {
          display: block;
          margin-top: 5px;
          font-size: clamp(1rem, 1.8vw, 1.22rem) !important;
          line-height: 1.12 !important;
        }

        .settings-channel-card-compact .settings-connected-account-box small {
          display: block;
          margin-top: 7px;
          color: rgba(248, 250, 252, 0.62) !important;
          font-size: 0.86rem !important;
          line-height: 1.35 !important;
        }

        .settings-channel-compact-copy {
          margin: 14px 0 0 !important;
          color: var(--muted);
          min-height: 0 !important;
          line-height: 1.45 !important;
          font-size: 0.95rem !important;
        }

        .settings-channel-card-compact > div:first-child {
          display: grid;
          align-content: start;
        }

        
        .settings-channel-card-compact .settings-channel-card-head {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 12px !important;
          align-items: start !important;
        }

        .settings-channel-card-compact .settings-channel-card-head > div {
          min-width: 0 !important;
        }

        .settings-channel-card-compact .settings-channel-card-head .page-eyebrow {
          display: block !important;
          margin-bottom: 7px !important;
          line-height: 1.1 !important;
          white-space: normal !important;
        }

        .settings-channel-card-compact .settings-channel-card-head h3 {
          margin: 0 !important;
          font-size: clamp(1.18rem, 2vw, 1.45rem) !important;
          line-height: 1.08 !important;
          letter-spacing: -0.025em !important;
        }

        .settings-channel-card-compact .settings-channel-card-head > span {
          justify-self: start !important;
          position: static !important;
          margin: 0 !important;
          transform: none !important;
        }

        .settings-channel-card-compact .settings-connected-account-box {
          margin-top: 14px !important;
        }

        @media (max-width: 1040px) {
          .settings-channel-grid {
            grid-template-columns: 1fr !important;
          }

          .settings-channel-card-compact {
            min-height: auto !important;
          }
        }

        
        .settings-channel-card-clean {
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          gap: 14px;
          min-height: 0 !important;
          overflow: hidden;
        }

        .settings-channel-card-clean .settings-channel-card-head {
          display: block !important;
          margin-bottom: 14px !important;
        }

        .settings-channel-card-clean .settings-channel-card-head .page-eyebrow {
          display: block !important;
          margin: 0 0 8px !important;
          line-height: 1.1 !important;
          white-space: normal !important;
        }

        .settings-channel-card-clean .settings-channel-card-head h3 {
          margin: 0 !important;
          font-size: clamp(1.18rem, 2vw, 1.45rem) !important;
          line-height: 1.08 !important;
          letter-spacing: -0.025em !important;
        }

        .settings-channel-card-clean .settings-connected-account-box {
          position: relative !important;
          margin-top: 0 !important;
          padding: 16px 18px !important;
          border-radius: 22px !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        .settings-channel-card-clean .settings-connected-account-box span {
          display: block !important;
          width: fit-content !important;
          margin: 0 0 8px !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          color: rgba(248, 250, 252, 0.58) !important;
          font-size: 0.76rem !important;
          font-weight: 950 !important;
          letter-spacing: 0.09em !important;
          line-height: 1.1 !important;
          text-transform: uppercase !important;
          box-shadow: none !important;
        }

        .settings-channel-card-clean .settings-connected-account-box strong {
          display: block !important;
          margin: 0 0 8px !important;
          color: #ffffff !important;
          font-size: clamp(1.05rem, 1.8vw, 1.26rem) !important;
          line-height: 1.12 !important;
        }

        .settings-channel-card-clean .settings-connected-account-box small {
          display: block !important;
          margin: 0 !important;
          color: rgba(248, 250, 252, 0.62) !important;
          font-size: 0.86rem !important;
          line-height: 1.35 !important;
        }

        .settings-channel-card-clean .settings-channel-compact-copy {
          margin: 14px 0 0 !important;
          color: var(--muted);
          min-height: 0 !important;
          line-height: 1.45 !important;
          font-size: 0.95rem !important;
        }

        @media (max-width: 1040px) {
          .settings-channel-grid {
            grid-template-columns: 1fr !important;
          }
        }

        
        .settings-channel-card-clean {
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          gap: 14px;
          min-height: 0 !important;
          overflow: hidden;
        }

        .settings-channel-card-clean > div:first-child {
          display: grid;
          align-content: start;
          gap: 0;
        }

        .settings-channel-card-clean .settings-channel-card-head {
          display: block !important;
          margin-bottom: 14px !important;
        }

        .settings-channel-card-clean .settings-channel-card-head .page-eyebrow {
          display: block !important;
          margin: 0 0 8px !important;
          line-height: 1.1 !important;
          white-space: normal !important;
        }

        .settings-channel-card-clean .settings-channel-card-head h3 {
          margin: 0 !important;
          font-size: clamp(1.18rem, 2vw, 1.45rem) !important;
          line-height: 1.08 !important;
          letter-spacing: -0.025em !important;
        }

        .settings-channel-card-clean .settings-connected-account-box {
          position: relative !important;
          margin-top: 0 !important;
          padding: 16px 18px !important;
          border-radius: 22px !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        .settings-channel-card-clean .settings-connected-account-box span {
          display: block !important;
          width: fit-content !important;
          margin: 0 0 8px !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          color: rgba(248, 250, 252, 0.58) !important;
          font-size: 0.76rem !important;
          font-weight: 950 !important;
          letter-spacing: 0.09em !important;
          line-height: 1.1 !important;
          text-transform: uppercase !important;
          box-shadow: none !important;
        }

        .settings-channel-card-clean .settings-connected-account-box strong {
          display: block !important;
          margin: 0 0 8px !important;
          color: #ffffff !important;
          font-size: clamp(1.05rem, 1.8vw, 1.26rem) !important;
          line-height: 1.12 !important;
        }

        .settings-channel-card-clean .settings-connected-account-box small {
          display: block !important;
          margin: 0 !important;
          color: rgba(248, 250, 252, 0.62) !important;
          font-size: 0.86rem !important;
          line-height: 1.35 !important;
        }

        @media (max-width: 1040px) {
          .settings-channel-grid {
            grid-template-columns: 1fr !important;
          }
        }

        
        .settings-channel-card-short {
          min-height: 0 !important;
          max-height: none !important;
          padding: 20px !important;
          display: grid !important;
          grid-template-rows: auto auto !important;
          align-content: start !important;
          gap: 16px !important;
        }

        .settings-channel-card-short > div:first-child {
          display: grid !important;
          gap: 14px !important;
          align-content: start !important;
        }

        .settings-channel-card-short .settings-channel-card-head {
          margin: 0 !important;
        }

        .settings-channel-card-short .settings-connected-account-box {
          margin: 0 !important;
        }

        .settings-channel-card-short button {
          margin-top: 0 !important;
          align-self: start !important;
        }

        .settings-channel-card-short .settings-channel-compact-copy {
          display: none !important;
        }

        @media (min-width: 1041px) {
          .settings-channel-grid {
            align-items: start !important;
          }

          .settings-channel-card-short {
            height: auto !important;
            min-height: 0 !important;
          }
        }

        @media (max-width: 1040px) {
          .settings-channel-card-short {
            min-height: 0 !important;
          }
        }

        @media (max-width: 900px) {
          .settings-profile-start-layout,
          .settings-profile-wizard-head,
          .settings-simple-setup-grid,
          .settings-simple-form-grid,
          .settings-save-strip {
            grid-template-columns: 1fr;
          }

          .settings-profile-choice-grid,
          .settings-colour-grid {
            grid-template-columns: 1fr;
          }

          .settings-profile-wizard-head,
          .settings-save-strip {
            text-align: center;
            justify-items: center;
          }
        }

        @media (max-width: 760px) {
          .settings-profile-start-card,
          .settings-profile-wizard-card {
            width: min(100%, calc(100vw - 24px)) !important;
            margin-left: auto !important;
            margin-right: auto !important;
            border-radius: 26px !important;
            padding: 20px !important;
          }

          .settings-meta-account-note {
            text-align: center !important;
          }

          .settings-profile-start-copy,
          .settings-profile-simple-progress,
          .settings-simple-setup-card,
          .settings-form-panel,
          .settings-extra-details-card {
            text-align: center;
          }

          .settings-profile-choice-card {
            text-align: center;
            justify-items: center;
            min-height: 0;
          }

          .settings-profile-checklist span {
            grid-template-columns: 1fr;
            justify-items: center;
          }

          .settings-form-panel-head {
            justify-items: center;
          }
        }

        /* Fix publishing cards height final */

        .settings-channel-grid {
          align-items: start !important;
        }

        .settings-channel-card,
        .settings-channel-card-premium,
        .settings-channel-card-clean,
        .settings-channel-card-short {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
        }

        .settings-channel-card-short {
          padding: 20px !important;
          display: grid !important;
          grid-template-rows: auto auto !important;
          align-content: start !important;
          gap: 16px !important;
        }

        .settings-channel-card-short > div:first-child {
          display: grid !important;
          gap: 14px !important;
          align-content: start !important;
        }

        .settings-channel-card-short .settings-channel-card-head {
          margin: 0 !important;
        }

        .settings-channel-card-short .settings-connected-account-box {
          margin: 0 !important;
        }

        .settings-channel-card-short button {
          margin-top: 0 !important;
          align-self: start !important;
        }

      `}</style>


      <style jsx global>{`
        @media (max-width: 720px) {
          .settings-profile-editor-card,
          .settings-profile-editor-content,
          .settings-profile-editor-content .manual-backup-grid,
          .settings-profile-editor-content label {
            position: relative !important;
            z-index: 10 !important;
            overflow: visible !important;
            pointer-events: auto !important;
            touch-action: manipulation !important;
          }

          .settings-profile-editor-content .manual-backup-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .settings-profile-editor-content input,
          .settings-profile-editor-content textarea,
          .settings-profile-editor-content select,
          .settings-mobile-editable-input {
            position: relative !important;
            z-index: 30 !important;
            display: block !important;
            width: 100% !important;
            min-height: 50px !important;
            pointer-events: auto !important;
            touch-action: manipulation !important;
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-appearance: auto !important;
            appearance: auto !important;
            opacity: 1 !important;
            visibility: visible !important;
          }

          .settings-profile-editor-content textarea {
            min-height: 120px !important;
          }
        }
      `}</style>

      <style jsx global>{`
        @media (max-width: 720px) {
          .settings-profile-strength-card {
            padding: 20px !important;
            border-radius: 24px !important;
          }
        }
      `}</style>

      <style jsx global>{`
        @media (max-width: 720px) {
          .settings-profile-strength-card {
            padding: 20px !important;
            border-radius: 24px !important;
          }
        }

        @media (max-width: 760px) {
          .premium-card div[style*="minmax(240px, 320px)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <style jsx global>{`
        .settings-live-step-label {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
          color: var(--gold);
          font-size: 13px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          line-height: 1;
          white-space: normal;
        }

        .settings-live-step-label span {
          flex: 0 0 auto;
          width: 38px;
          height: 38px;
          display: inline-grid;
          place-items: center;
          border-radius: 14px;
          color: #101420;
          background: linear-gradient(135deg, var(--gold), #f7b733);
          box-shadow: 0 14px 30px rgba(255, 212, 59, 0.18);
          font-size: 16px;
          letter-spacing: 0;
          line-height: 1;
        }

        .settings-live-step-label strong {
          display: inline-block;
          color: var(--gold);
          letter-spacing: 0.12em;
          line-height: 1.15;
        }

        .settings-numbered-section {
          position: relative;
        }

        .settings-step-ready-pulse {
          animation: settingsReadyGlow 2.4s ease-in-out infinite;
        }

        .settings-create-posts-button-pulse {
          animation: settingsButtonPulse 1.65s ease-in-out infinite;
        }

        .settings-setup-profile-button-pulse {
          position: relative;
          animation: settingsSetupProfilePulse 1.55s ease-in-out infinite;
          box-shadow:
            0 16px 38px rgba(255, 212, 59, 0.22),
            0 0 0 0 rgba(255, 212, 59, 0.24);
        }

        .settings-profile-incomplete-hint {
          animation: settingsHintFade 2.2s ease-in-out infinite;
        }

        @keyframes settingsReadyGlow {
          0%, 100% {
            border-color: rgba(255, 212, 59, 0.24);
            box-shadow: 0 26px 84px rgba(0,0,0,0.28);
          }
          50% {
            border-color: rgba(255, 212, 59, 0.58);
            box-shadow:
              0 26px 84px rgba(0,0,0,0.28),
              0 0 0 4px rgba(255, 212, 59, 0.08),
              0 0 46px rgba(255, 212, 59, 0.12);
          }
        }

        @keyframes settingsButtonPulse {
          0%, 100% {
            transform: translateY(0) scale(1);
            box-shadow: 0 14px 34px rgba(255, 212, 59, 0.18);
          }
          50% {
            transform: translateY(-1px) scale(1.025);
            box-shadow: 0 22px 54px rgba(255, 212, 59, 0.34);
          }
        }

        @keyframes settingsSetupProfilePulse {
          0%, 100% {
            transform: translateY(0) scale(1);
            box-shadow:
              0 16px 38px rgba(255, 212, 59, 0.2),
              0 0 0 0 rgba(255, 212, 59, 0.22);
          }
          50% {
            transform: translateY(-1px) scale(1.03);
            box-shadow:
              0 22px 58px rgba(255, 212, 59, 0.42),
              0 0 0 7px rgba(255, 212, 59, 0.08);
          }
        }

        @keyframes settingsHintFade {
          0%, 100% {
            opacity: 0.72;
          }
          50% {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .settings-step-ready-pulse,
          .settings-create-posts-button-pulse,
          .settings-setup-profile-button-pulse,
          .settings-profile-incomplete-hint {
            animation: none !important;
          }
        }

        .settings-channel-card {
          display: grid !important;
          grid-template-rows: auto 1fr auto !important;
          min-height: 316px !important;
          height: 100% !important;
          align-content: stretch !important;
        }

        .settings-channel-card-premium {
          gap: 14px !important;
        }

        .settings-channel-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .settings-connected-account-box {
          display: grid;
          gap: 5px;
          margin: 14px 0;
          padding: 13px 14px;
          border-radius: 18px;
          background: rgba(2, 6, 23, 0.28);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .settings-connected-account-box span {
          color: rgba(248,250,252,0.56);
          font-size: 0.74rem;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .settings-connected-account-box strong {
          color: #ffffff;
          line-height: 1.2;
        }

        .settings-connected-account-box small {
          color: rgba(248,250,252,0.62);
          line-height: 1.4;
          font-weight: 760;
        }

        .settings-channel-card-premium > div:first-child {
          display: grid;
          grid-template-rows: 86px 136px minmax(96px, auto);
          gap: 0;
        }

        .settings-channel-card-head {
          min-height: 86px;
          align-items: flex-start;
        }

        .settings-channel-card-head h3 {
          min-height: 58px !important;
          margin-bottom: 0 !important;
        }

        .settings-connected-account-box {
          min-height: 112px;
          align-content: center;
        }

        .settings-channel-card-premium > div:first-child > p {
          min-height: 96px !important;
          margin: 0 !important;
          display: flex;
          align-items: flex-start;
        }

        .settings-channel-card-premium > button {
          align-self: end;
          min-height: 52px;
        }

        .settings-meta-summary-card .button-row {
          margin: 0;
        }


        @media (max-width: 900px) {
          .settings-connections-section div[style*="repeat(3, minmax(0, 1fr))"] {
            grid-template-columns: 1fr !important;
          }

          .settings-meta-summary-card {
            grid-template-columns: 1fr !important;
            text-align: center;
          }

          .settings-meta-summary-card .button-row {
            justify-content: center !important;
          }

          .settings-channel-card-head {
            align-items: center;
          }

          .settings-channel-card-head > span {
            flex-shrink: 0;
          }

          .settings-channel-card {
            min-height: auto !important;
            display: grid !important;
            grid-template-rows: auto !important;
          }

          .settings-channel-card-premium > div:first-child {
            grid-template-rows: auto !important;
            gap: 12px !important;
          }

          .settings-channel-card-head,
          .settings-channel-card-head h3,
          .settings-connected-account-box,
          .settings-channel-card-premium > div:first-child > p {
            min-height: 0 !important;
          }

          .settings-channel-card-premium > div:first-child > p {
            display: block !important;
          }
        }

        @media (max-width: 760px) {
          .settings-live-step-label {
            margin-bottom: 12px;
            gap: 10px;
            font-size: 12px;
          }

          .settings-live-step-label span {
            width: 34px;
            height: 34px;
            border-radius: 12px;
          }

          .settings-setup-guide {
            padding: 20px !important;
            border-radius: 24px !important;
          }

          .settings-setup-step-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          .settings-setup-step-card {
            padding: 16px !important;
            border-radius: 20px !important;
          }

          .settings-profile-strength-card {
            padding: 20px !important;
            border-radius: 24px !important;
          }

          .premium-card div[style*="minmax(240px, 320px)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>


      <style jsx global>{`
        /* SETTINGS FINAL RELEASE POLISH */
        .settings-setup-guide,
        .settings-numbered-section,
        .settings-connections-section,
        .settings-create-posts-section {
          overflow: hidden;
        }

        .settings-setup-guide {
          padding: clamp(22px, 3vw, 34px) !important;
        }

        .settings-setup-guide > div:first-child {
          margin-bottom: 22px !important;
        }

        .settings-setup-guide .page-title {
          font-size: clamp(2.2rem, 4.8vw, 4.35rem) !important;
        }

        .settings-setup-guide h2 {
          font-size: clamp(1.65rem, 3vw, 2.45rem) !important;
          letter-spacing: -0.045em !important;
        }

        .settings-setup-guide > p,
        .settings-numbered-section > p,
        .settings-connections-section > p {
          color: rgba(248, 250, 252, 0.74) !important;
          line-height: 1.55 !important;
        }

        .settings-setup-step-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 12px !important;
        }

        .settings-setup-step-card {
          min-height: 172px !important;
          border: 1px solid rgba(255, 255, 255, 0.09) !important;
        }

        .settings-setup-step-card h3 {
          line-height: 1.08 !important;
        }

        .settings-profile-strength-card {
          align-self: stretch !important;
        }

        .settings-numbered-section {
          padding: clamp(22px, 3vw, 34px) !important;
        }

        .settings-channel-card {
          background:
            radial-gradient(circle at top left, rgba(255, 212, 59, 0.08), transparent 30%),
            linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.032)) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 20px 58px rgba(0,0,0,0.18) !important;
        }

        .settings-channel-card .page-eyebrow {
          margin-bottom: 4px !important;
        }

        .settings-channel-card button {
          min-height: 50px !important;
          border-radius: 16px !important;
        }

        .settings-publishing-rules-compact {
          box-shadow: none !important;
        }

        .settings-publishing-rules-compact button[aria-controls="publishing-rules-panel"] {
          min-height: 74px !important;
        }

        .settings-profile-editor-card,
        .settings-simple-scan {
          border-radius: 30px !important;
          border: 1px solid rgba(255, 255, 255, 0.11) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 32%),
            linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.032)) !important;
        }

        .settings-profile-editor-content label strong,
        .settings-simple-scan label strong {
          color: #ffffff !important;
        }

        .settings-profile-editor-content label span,
        .settings-simple-scan label span {
          color: rgba(248, 250, 252, 0.64) !important;
          line-height: 1.4 !important;
        }

        .settings-profile-editor-content .input,
        .settings-simple-scan .input {
          min-height: 52px !important;
          border-radius: 16px !important;
        }

        .settings-profile-editor-content textarea.input {
          min-height: 132px !important;
        }

        .settings-step-ready-pulse,
        .settings-create-posts-button-pulse {
          animation: none !important;
        }

        .settings-create-posts-section button {
          min-height: 54px !important;
          border-radius: 18px !important;
        }

        @media (max-width: 900px) {
          .settings-setup-step-grid {
            grid-template-columns: 1fr !important;
          }

          .settings-setup-step-card {
            min-height: 0 !important;
            display: grid !important;
            grid-template-columns: auto minmax(0, 1fr) !important;
            gap: 12px !important;
            align-items: start !important;
          }

          .settings-setup-step-card .status-pill {
            grid-row: span 2 !important;
            align-self: start !important;
            margin-top: 1px !important;
          }

          .settings-setup-step-card h3 {
            margin: 0 0 5px !important;
            font-size: 1.15rem !important;
          }

          .settings-setup-step-card p {
            margin: 0 !important;
          }
        }

        @media (max-width: 760px) {
          .settings-setup-guide,
          .settings-numbered-section,
          .settings-connections-section,
          .settings-create-posts-section,
          .settings-profile-editor-card,
          .settings-simple-scan {
            width: min(100%, calc(100vw - 24px)) !important;
            margin-left: auto !important;
            margin-right: auto !important;
            border-radius: 26px !important;
          }

          .settings-setup-guide {
            padding: 20px !important;
          }

          .settings-setup-guide .page-title {
            font-size: clamp(2rem, 12vw, 3.2rem) !important;
            line-height: 0.96 !important;
          }

          .settings-setup-guide .page-description {
            font-size: 0.95rem !important;
            line-height: 1.5 !important;
          }

          .settings-setup-guide h2 {
            font-size: 1.55rem !important;
            line-height: 1.02 !important;
          }

          .settings-numbered-section {
            padding: 20px !important;
          }

          .settings-numbered-section h2,
          .settings-connections-section h2,
          .settings-create-posts-section h2 {
            font-size: clamp(1.85rem, 8vw, 2.6rem) !important;
            line-height: 1 !important;
          }

          .settings-profile-strength-card h3 {
            font-size: clamp(2.2rem, 15vw, 3.4rem) !important;
          }

          .settings-channel-card {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .settings-publishing-rules-compact button[aria-controls="publishing-rules-panel"] {
            padding: 14px !important;
            align-items: center !important;
          }

          .settings-publishing-rules-compact button[aria-controls="publishing-rules-panel"] strong {
            font-size: 1rem !important;
            line-height: 1.2 !important;
          }

          .settings-profile-editor-content .manual-backup-grid {
            gap: 18px !important;
          }

          .settings-profile-editor-content label {
            margin-bottom: 12px !important;
          }

          .settings-profile-editor-content textarea.input {
            min-height: 112px !important;
          }

          .settings-create-posts-section div[style*="minmax(240px, 320px)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>


      <style jsx global>{`
        /* SETTINGS CHANNEL CARD FINAL RESPONSIVE FIX */
        .settings-channel-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 16px !important;
          align-items: stretch !important;
        }

        .settings-channel-card {
          min-width: 0 !important;
          overflow: hidden !important;
        }

        .settings-channel-card h3 {
          word-break: normal !important;
          overflow-wrap: normal !important;
        }

        .settings-channel-card p {
          overflow-wrap: normal !important;
          word-break: normal !important;
        }

        @media (max-width: 980px) {
          .settings-channel-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .settings-channel-card {
            min-height: 0 !important;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(128px, 168px) !important;
            gap: 16px !important;
            align-items: center !important;
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .settings-channel-card > div {
            min-width: 0 !important;
          }

          .settings-channel-card h3 {
            min-height: 0 !important;
            margin: 4px 0 8px !important;
            font-size: clamp(1.45rem, 5.2vw, 2.05rem) !important;
            line-height: 1.02 !important;
          }

          .settings-channel-card p {
            min-height: 0 !important;
            margin: 0 !important;
            max-width: 560px !important;
            font-size: 0.98rem !important;
            line-height: 1.45 !important;
          }

          .settings-channel-card button {
            width: 100% !important;
            min-height: 48px !important;
            margin-top: 0 !important;
            align-self: center !important;
          }
        }

        @media (max-width: 560px) {
          .settings-channel-grid {
            gap: 12px !important;
          }

          .settings-channel-card {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
            padding: 18px !important;
          }

          .settings-channel-card h3 {
            font-size: 1.7rem !important;
          }

          .settings-channel-card p {
            font-size: 0.96rem !important;
          }

          .settings-channel-card button {
            width: 100% !important;
          }
        }

        /* Final override: compact publishing destination cards */
        .settings-channel-grid {
          align-items: start !important;
        }

        .settings-channel-grid > .settings-channel-card,
        .settings-channel-grid > .settings-channel-card-premium,
        .settings-channel-grid > .settings-channel-card-clean,
        .settings-channel-grid > .settings-channel-card-short {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          display: grid !important;
          grid-template-rows: auto auto !important;
          align-content: start !important;
          align-self: start !important;
          gap: 16px !important;
          padding: 20px !important;
        }

        .settings-channel-grid > .settings-channel-card > div:first-child,
        .settings-channel-grid > .settings-channel-card-premium > div:first-child,
        .settings-channel-grid > .settings-channel-card-clean > div:first-child,
        .settings-channel-grid > .settings-channel-card-short > div:first-child {
          display: grid !important;
          grid-template-rows: none !important;
          gap: 14px !important;
          align-content: start !important;
          min-height: 0 !important;
        }

        .settings-channel-grid .settings-channel-card-head {
          min-height: 0 !important;
          margin: 0 !important;
          display: block !important;
          align-items: initial !important;
        }

        .settings-channel-grid .settings-channel-card-head h3 {
          min-height: 0 !important;
          margin: 4px 0 0 !important;
        }

        .settings-channel-grid .settings-connected-account-box {
          min-height: 0 !important;
          margin: 0 !important;
        }

        .settings-channel-grid > .settings-channel-card > div:first-child > p,
        .settings-channel-grid > .settings-channel-card-premium > div:first-child > p {
          display: none !important;
          min-height: 0 !important;
          margin: 0 !important;
        }

        .settings-channel-grid > .settings-channel-card > button,
        .settings-channel-grid > .settings-channel-card-premium > button {
          margin-top: 0 !important;
          align-self: start !important;
          min-height: 52px !important;
        }


        .settings-confirm-actions button {
          min-height: 48px !important;
          border-radius: 16px !important;
        }

        @media (max-width: 560px) {
          .settings-confirm-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .settings-confirm-actions button {
            width: 100% !important;
          }
        }

      `}</style>

      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-confirm-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'grid',
            placeItems: 'center',
            padding: 18,
            background: 'rgba(2, 6, 23, 0.72)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <div
            className="premium-card"
            style={{
              width: 'min(520px, 100%)',
              borderRadius: 30,
              border: confirmDialog.danger
                ? '1px solid rgba(255, 95, 109, 0.34)'
                : '1px solid rgba(255, 212, 59, 0.26)',
              boxShadow: '0 34px 110px rgba(0,0,0,0.48)',
            }}
          >
            <div className="page-eyebrow">
              {confirmDialog.danger ? 'Please confirm' : 'Confirm action'}
            </div>
            <h2 id="settings-confirm-title" style={{ margin: '4px 0 10px' }}>
              {confirmDialog.title}
            </h2>
            <p style={{ margin: '0 0 20px', color: 'var(--muted)', lineHeight: 1.55 }}>
              {confirmDialog.message}
            </p>

            <div
              className="button-row settings-confirm-actions"
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={closeConfirmDialog}
                disabled={saving || metaConnectionBusy}
              >
                Cancel
              </button>

              <button
                type="button"
                className={confirmDialog.danger ? 'secondary-button danger-button' : undefined}
                onClick={() => {
                  if (confirmDialog.type === 'disconnectMeta') {
                    confirmDisconnectMetaAccount(confirmDialog.connectionId);
                    return;
                  }

                  if (confirmDialog.type === 'deleteProfile') {
                    confirmDeleteProfile();
                  }
                }}
                disabled={saving || metaConnectionBusy}
              >
                {saving || metaConnectionBusy ? 'Working...' : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/*
  NOTE: Final-release polish marker.
  The active style overrides are injected above in the component global CSS blocks.
*/
