'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/app/components/ToastProvider';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const authUserId = authData.user?.id || null;

    if (authError) {
      console.error('Auth error:', authError.message);
      setLoading(false);
      return;
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
    const { data: authData } = await supabase.auth.getUser();
    const authUserId = authData.user?.id || userId || null;

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
    setShowBusinessDetails(false);
    setShowBrandDetails(false);
  };

  const handleDeleteProfile = async () => {
    if (!profileId) {
      handleResetForm();
      return;
    }

    if (!userId) {
      notify('Please sign in again before deleting this profile.', 'warning', 'Sign in needed');
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
      return;
    }

    if (!userId) {
      notify('Please sign in again before deleting this profile.', 'warning', 'Sign in needed');
      closeConfirmDialog();
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('business_profiles')
        .delete()
        .eq('id', profileId)
        .eq('user_id', userId);

      if (error) throw error;

      setProfileId(null);
      handleResetForm();
      closeConfirmDialog();
      notify('Business Profile deleted.', 'success', 'Profile deleted');
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
                Follow the setup sequence below. Complete the Business Profile first, connect publishing
                channels second, then create weekly posts from the Dashboard.
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
              Follow these steps in order.
            </h2>
            <p style={{ maxWidth: 850, margin: 0 }}>
              Start with the Business Profile. Once that is saved, connect Facebook and Instagram
              for autoposting, then go to the Dashboard to create posts from uploaded media.
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
            className="premium-card settings-numbered-section"
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 24,
                alignItems: 'start',
              }}
            >
              <div>
                <div className="settings-live-step-label">
                  <span>1</span>
                  <strong>Business Profile</strong>
                </div>
                <h2 style={{ marginTop: 0, fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 0.95 }}>
                  {businessName || 'Set up once. Create better posts every week.'}
                </h2>
                <p style={{ maxWidth: 820 }}>
                  {businessName
                    ? 'Your Business Profile is saved. FromOne will use these details whenever you upload media and create weekly posts.'
                    : 'Scan a website or add the business details manually. FromOne will use this profile every time posts are created from uploaded media.'}
                </p>

                <div className="button-row" style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (showBusinessDetails) {
                        setShowBusinessDetails(false);
                        return;
                      }

                      openProfileEditor();
                    }}
                  >
                    {showBusinessDetails ? 'Close profile editor' : businessName ? 'Edit profile' : 'Set up profile'}
                  </button>
                </div>
              </div>

              <div
                className="settings-profile-strength-card"
                style={{
                  padding: 24,
                  borderRadius: 30,
                  background:
                    'radial-gradient(circle at top right, rgba(255, 212, 59, 0.14), transparent 34%), rgba(5, 10, 24, 0.42)',
                  border: '1px solid rgba(255, 212, 59, 0.18)',
                  boxShadow: '0 24px 70px rgba(0,0,0,0.24)',
                }}
              >
                <div className="page-eyebrow">Profile strength</div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 16,
                    marginBottom: 12,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 'clamp(2.4rem, 6vw, 4rem)',
                      lineHeight: 0.9,
                      letterSpacing: '-0.07em',
                    }}
                  >
                    {profileCompletionPercent}%
                  </h3>

                  <span
                    className="status-pill"
                    style={{
                      marginBottom: 4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {profileCompletionPercent >= 80 ? 'Ready' : 'Needs details'}
                  </span>
                </div>

                <p
                  style={{
                    margin: '0 0 16px',
                    color: 'var(--muted-strong)',
                    lineHeight: 1.55,
                  }}
                >
                  Complete the essentials so FromOne can create better posts for this business.
                </p>

                <div
                  style={{
                    height: 12,
                    borderRadius: 999,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.1)',
                    marginBottom: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: `${profileCompletionPercent}%`,
                      height: '100%',
                      background: 'linear-gradient(135deg, #ffd43b, #f7b733)',
                      boxShadow: '0 0 22px rgba(255, 212, 59, 0.28)',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  {profileCompletionItems.map((item) => (
                    <span
                      key={item.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 16,
                        background: item.ready
                          ? 'rgba(61, 220, 151, 0.09)'
                          : 'rgba(255,255,255,0.055)',
                        border: item.ready
                          ? '1px solid rgba(61, 220, 151, 0.18)'
                          : '1px solid rgba(255,255,255,0.08)',
                        color: item.ready ? '#a7f3d0' : 'rgba(255,255,255,0.7)',
                        fontWeight: 850,
                      }}
                    >
                      {item.label}
                      <strong>{item.ready ? '✓' : '•'}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {showBusinessDetails && (
            <>
              <section className="scan-feature-card settings-simple-scan" style={{ maxWidth: 1120, margin: '0 auto 22px' }}>
                <div className="scan-feature-content">
                  <div>
                    <div className="page-eyebrow">Website scan</div>
                    <h2>Scan the website</h2>
                    <p>
                      FromOne can fill the Business Profile from a website. Review the details,
                      edit anything, then save.
                    </p>
                  </div>
                </div>

                <div className="scan-feature-form">
                  <label>
                    <strong>Website URL</strong>
                    <span>Used to detect business details, services, tone and brand style.</span>
                  </label>

                  <input
                    className="input"
                    value={websiteUrl}
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                    placeholder="https://example.com"
                  />

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

                  {scanMessage && (
                    <p style={{ margin: '4px 0 0', color: '#ffe58a', fontWeight: 850 }}>
                      {scanMessage}
                    </p>
                  )}
                </div>
              </section>

              <section
                ref={profileEditorRef}
                id="business-profile-editor"
                className="manual-collapse-card manual-open-card settings-profile-editor-card"
                style={{
                  scrollMarginTop: 96,
                  maxWidth: 1120,
                  margin: '0 auto 22px',
                  position: 'relative',
                  zIndex: 5,
                  overflow: 'visible',
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                }}
              >
                <div
                  className="manual-collapse-content manual-visible-content settings-profile-editor-content"
                  style={{
                    position: 'relative',
                    zIndex: 6,
                    overflow: 'visible',
                    pointerEvents: 'auto',
                    touchAction: 'manipulation',
                  }}
                >
                  <div className="page-eyebrow">Edit Business Profile</div>
                  <h2>Business details</h2>
                  <p>
                    These details give every generated post the right tone, location, services and CTA.
                  </p>

                  <div className="manual-backup-grid">
                    <div>
                      <label>
                        <strong>Business name</strong>
                        <span>Who are we creating posts for?</span>
                      </label>
                      <input
                        className="input"
                        value={businessName}
                        onChange={(event) => setBusinessName(event.target.value)}
                        placeholder="Example: Baker Roofing"
                      />

                      <label>
                        <strong>Industry</strong>
                        <span>What type of business is it?</span>
                      </label>
                      <input
                        className="input settings-mobile-editable-input"
                        value={industry}
                        onChange={(event) => setIndustry(event.target.value)}
                        autoComplete="organization-title"
                        inputMode="text"
                        style={{
                          position: 'relative',
                          zIndex: 20,
                          pointerEvents: 'auto',
                          touchAction: 'manipulation',
                          WebkitUserSelect: 'text',
                          userSelect: 'text',
                        }}
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
                        style={{
                          position: 'relative',
                          zIndex: 20,
                          pointerEvents: 'auto',
                          touchAction: 'manipulation',
                          WebkitUserSelect: 'text',
                          userSelect: 'text',
                        }}
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
                    </div>

                    <div>
                      <label>
                        <strong>Target customers</strong>
                        <span>Who should the posts speak to?</span>
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

                      <label>
                        <strong>Content themes</strong>
                        <span>Separate each theme with a comma.</span>
                      </label>
                      <textarea
                        className="input"
                        value={contentPillars}
                        onChange={(event) => setContentPillars(event.target.value)}
                        placeholder="Example: Tips, reviews, offers, before and afters"
                        rows={4}
                      />

                      <label>
                        <strong>Business goals</strong>
                        <span>Separate each goal with a comma.</span>
                      </label>
                      <textarea
                        className="input"
                        value={businessGoals}
                        onChange={(event) => setBusinessGoals(event.target.value)}
                        placeholder="Example: More calls, more bookings, more enquiries"
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="button-row" style={{ marginTop: 20 }}>
                    <button type="button" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Business Profile'}
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setShowBrandDetails((current) => !current)}
                    >
                      {showBrandDetails ? 'Hide brand details' : 'Edit brand details'}
                    </button>
                  </div>

                  {showBrandDetails && (
                    <div
                      style={{
                        display: 'grid',
                        gap: 18,
                        marginTop: 18,
                        paddingTop: 18,
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div>
                        <div className="page-eyebrow">Brand style</div>
                        <h2 style={{ marginTop: 0 }}>Colours and logo.</h2>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: 14,
                        }}
                      >
                        <label>
                          <strong>Primary colour</strong>
                          <input
                            className="input"
                            value={brandPrimaryColor}
                            onChange={(event) => setBrandPrimaryColor(event.target.value)}
                            placeholder="#ffd43b"
                          />
                        </label>

                        <label>
                          <strong>Secondary colour</strong>
                          <input
                            className="input"
                            value={brandSecondaryColor}
                            onChange={(event) => setBrandSecondaryColor(event.target.value)}
                            placeholder="#101420"
                          />
                        </label>

                        <label>
                          <strong>Accent colour</strong>
                          <input
                            className="input"
                            value={brandAccentColor}
                            onChange={(event) => setBrandAccentColor(event.target.value)}
                            placeholder="#3ddc97"
                          />
                        </label>
                      </div>

                      <label>
                        <strong>Logo URL</strong>
                        <input
                          className="input"
                          value={brandLogoUrl}
                          onChange={(event) => setBrandLogoUrl(event.target.value)}
                          placeholder="https://example.com/logo.png"
                        />
                      </label>

                      <label>
                        <strong>Brand summary</strong>
                        <textarea
                          className="input"
                          value={brandSummary}
                          onChange={(event) => setBrandSummary(event.target.value)}
                          placeholder="Example: Premium dark brand with yellow accent and practical local tone."
                          rows={4}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </section>
            </>
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
            className={`premium-card settings-numbered-section settings-connections-section ${connectionsReady ? "settings-step-ready-pulse" : ""}`}
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
              className="card"
              style={{
                padding: 20,
                borderRadius: 24,
                marginTop: 18,
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                border: '1px solid rgba(255, 212, 59, 0.18)',
              }}
            >
              <div className="page-eyebrow">Publishing rules</div>
              <h3 style={{ margin: '6px 0 10px', fontSize: 24 }}>
                What FromOne can publish
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                  marginTop: 14,
                }}
              >
                <div>
                  <strong>Facebook</strong>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.5 }}>
                    Facebook autoposting is available after Meta is connected. FromOne can publish
                    to your connected Facebook Page, or you can copy posts manually.
                  </p>
                </div>

                <div>
                  <strong>Instagram</strong>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.5 }}>
                    Instagram autoposting is available after Meta is connected, but Instagram needs
                    an image or video. PDF flyers cannot be autoposted directly to Instagram.
                    FromOne will help create Instagram-safe image sizing where possible.
                  </p>
                </div>

                <div>
                  <strong>TikTok</strong>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.5 }}>
                    TikTok is manual for now. FromOne creates TikTok-ready wording, then you copy
                    the caption and open TikTok yourself. Future TikTok autoposting will only happen
                    after the user reviews and approves the post.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div>
                  <strong>Split platforms</strong>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.5 }}>
                    Posts are divided across the platforms you choose.
                  </p>
                </div>

                <div>
                  <strong>Every platform</strong>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.5 }}>
                    Each upload or post gets versions for every selected platform.
                  </p>
                </div>
              </div>

              <p
                style={{
                  margin: '16px 0 0',
                  color: '#ffe58a',
                  fontWeight: 850,
                  lineHeight: 1.5,
                }}
              >
                You always review posts before publishing, copying or scheduling.
              </p>
            </div>

            {loadingConnections ? (
              <p>Checking connected accounts...</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <section className="card" style={{ padding: 20, borderRadius: 24 }}>
                  <div className="page-eyebrow">Facebook</div>
                  <h3 style={{ margin: '6px 0 8px', fontSize: 24 }}>
                    {hasFacebookConnection ? 'Connected ✓' : 'Not connected'}
                  </h3>
                  <p style={{ color: 'var(--muted)', minHeight: 54 }}>
                    {hasFacebookConnection
                      ? `Ready to publish to ${primaryMetaConnection?.page_name || 'your Facebook Page'}.`
                      : 'Connect Meta to enable Facebook Page publishing.'}
                  </p>
                  <button
                    type="button"
                    className={hasMetaConnection ? 'secondary-button' : undefined}
                    onClick={connectMetaAccount}
                    disabled={metaConnectionBusy}
                    style={{ width: '100%' }}
                  >
                    {hasMetaConnection ? 'Manage Meta' : 'Connect'}
                  </button>
                </section>

                <section className="card" style={{ padding: 20, borderRadius: 24 }}>
                  <div className="page-eyebrow">Instagram</div>
                  <h3 style={{ margin: '6px 0 8px', fontSize: 24 }}>
                    {hasInstagramConnection ? 'Connected ✓' : 'Not connected'}
                  </h3>
                  <p style={{ color: 'var(--muted)', minHeight: 54 }}>
                    {hasInstagramConnection
                      ? `Ready as @${primaryMetaConnection?.instagram_username || 'Instagram'}. Instagram posts need an image or video.`
                      : hasMetaConnection
                        ? 'Link a professional Instagram account in Meta.'
                        : 'Connect Meta to enable Instagram publishing. Instagram needs an image or video, not a PDF flyer.'}
                  </p>
                  <button
                    type="button"
                    className={hasMetaConnection ? 'secondary-button' : undefined}
                    onClick={connectMetaAccount}
                    disabled={metaConnectionBusy}
                    style={{ width: '100%' }}
                  >
                    {hasInstagramConnection ? 'Manage Meta' : 'Connect'}
                  </button>
                </section>

                <section className="card" style={{ padding: 20, borderRadius: 24 }}>
                  <div className="page-eyebrow">TikTok</div>
                  <h3 style={{ margin: '6px 0 8px', fontSize: 24 }}>Manual</h3>
                  <p style={{ color: 'var(--muted)', minHeight: 54 }}>
                    FromOne creates the wording. The user copies it and opens TikTok manually.
                  </p>
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
              <div className="button-row" style={{ marginTop: 18 }}>
                <button
                  type="button"
                  className="secondary-button danger-button"
                  onClick={() => disconnectMetaAccount(primaryMetaConnection?.id)}
                  disabled={metaConnectionBusy}
                >
                  {metaConnectionBusy ? 'Disconnecting...' : 'Disconnect Meta'}
                </button>
              </div>
            )}
          </section>

          <section
            className={`premium-card settings-numbered-section settings-create-posts-section ${createPostsReady ? "settings-step-ready-pulse" : ""}`}
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
                  Create your first weekly posts.
                </h2>
                <p style={{ maxWidth: 820, margin: 0 }}>
                  Your Business Profile is saved. Upload photos, videos or flyers on the
                  Dashboard and FromOne will turn them into ready-to-review social posts.
                  Facebook can use connected autoposting, Instagram needs image or video media,
                  and TikTok is copy/open manually for now.
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
                  className={createPostsReady ? 'settings-create-posts-button-pulse' : undefined}
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
                    Reset clears the form on this page. Delete removes the saved Business Profile
                    from Supabase.
                  </p>

                  <div className="button-row">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleResetForm}
                      disabled={saving}
                    >
                      Reset form
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

        @media (prefers-reduced-motion: reduce) {
          .settings-step-ready-pulse,
          .settings-create-posts-button-pulse {
            animation: none !important;
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
              className="button-row"
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
