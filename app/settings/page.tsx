'use client';

import { useEffect, useMemo, useState } from 'react';
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

  const metaConnections = socialConnections.filter((connection) => connection.provider === 'meta');
  const primaryMetaConnection = metaConnections[0] || null;

  const hasMetaConnection = Boolean(primaryMetaConnection);
  const hasFacebookConnection = Boolean(primaryMetaConnection?.page_id);
  const hasInstagramConnection = Boolean(primaryMetaConnection?.instagram_business_account_id);
  const metaConnectionBusy =
    disconnectingConnectionId === primaryMetaConnection?.id ||
    disconnectingConnectionId === 'all';

  const businessProfileReady = Boolean(businessName.trim() && industry.trim());
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

      if (setup === 'business') {
        setShowBusinessDetails(false);
        notify('You can now connect Facebook and Instagram, or continue to Dashboard.', 'success', 'Business Profile saved');
        await loadBusinessProfile();
        return;
      }

      notify('Business Profile saved.', 'success', 'Profile saved');
      await loadBusinessProfile();
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
      <div className="page-header" style={{ maxWidth: 920, margin: '0 auto 24px', textAlign: 'center' }}>
        <div className="page-eyebrow">Settings</div>
        <h1 className="page-title">Business Profile</h1>
        <p className="page-description">
          Set this up once. FromOne uses it with every upload to create posts that sound like the business.
        </p>
      </div>

      {loading ? (
        <div className="premium-card">
          <p>Loading Business Profile...</p>
        </div>
      ) : (
        <>
          <section
            className="premium-card"
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
                <div className="page-eyebrow">Business Profile</div>
                <h2 style={{ marginTop: 0, fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 0.95 }}>
                  {businessName || 'Set up once. Create better posts every week.'}
                </h2>
                <p style={{ maxWidth: 820 }}>
                  {businessName
                    ? `${businessName}${industry ? ` is saved as a ${industry} business` : ''}${
                        location ? ` serving ${location}` : ''
                      }. Dashboard will use this profile when creating posts from uploads.`
                    : 'Scan a website or add the business details manually. Dashboard then uses this profile every time posts are created from uploaded media.'}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 12,
                    marginTop: 18,
                  }}
                >
                  <div className="card" style={{ padding: 14 }}>
                    <strong>Industry</strong>
                    <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
                      {industry || 'Not added yet'}
                    </p>
                  </div>

                  <div className="card" style={{ padding: 14 }}>
                    <strong>Location</strong>
                    <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
                      {location || 'Not added yet'}
                    </p>
                  </div>

                  <div className="card" style={{ padding: 14 }}>
                    <strong>Customers</strong>
                    <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
                      {targetAudience || 'Not added yet'}
                    </p>
                  </div>
                </div>

                <div className="button-row" style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={() => setShowBusinessDetails((current) => !current)}
                  >
                    {showBusinessDetails ? 'Close profile editor' : businessName ? 'Edit profile' : 'Set up profile'}
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 26,
                  background: 'rgba(5, 10, 24, 0.34)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div className="page-eyebrow">Profile strength</div>
                <h3 style={{ margin: '6px 0 8px' }}>{profileCompletionPercent}% ready</h3>

                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.1)',
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: `${profileCompletionPercent}%`,
                      height: '100%',
                      background: '#ffd43b',
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
                        gap: 12,
                        padding: '8px 10px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.05)',
                        color: item.ready ? '#a7f3d0' : 'rgba(255,255,255,0.68)',
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

              <section className="manual-collapse-card manual-open-card" style={{ maxWidth: 1120, margin: '0 auto 22px' }}>
                <div className="manual-collapse-content manual-visible-content">
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
                        className="input"
                        value={industry}
                        onChange={(event) => setIndustry(event.target.value)}
                        placeholder="Example: Roofing, Beauty, Fitness"
                      />

                      <label>
                        <strong>Location or service area</strong>
                        <span>Where does the business operate?</span>
                      </label>
                      <input
                        className="input"
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
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
            className="premium-card"
            style={{
              maxWidth: 1120,
              margin: '0 auto 22px',
              borderRadius: 34,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="page-eyebrow">Social accounts</div>
            <h2 style={{ marginTop: 0 }}>Connect publishing channels</h2>
            <p style={{ maxWidth: 820 }}>
              Connect Meta once for Facebook and Instagram autoposting. TikTok stays simple with copy/open manual posting.
            </p>

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
                      ? `Ready as @${primaryMetaConnection?.instagram_username || 'Instagram'}.`
                      : hasMetaConnection
                        ? 'Link a professional Instagram account in Meta.'
                        : 'Connect Meta to enable Instagram publishing.'}
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
