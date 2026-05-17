'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

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
  google_account_id?: string | null;
  google_account_name?: string | null;
  google_location_id?: string | null;
  google_location_name?: string | null;
  expires_at: string | null;
  status: string | null;
  updated_at: string | null;
};

type GoogleLocationOption = {
  accountId: string;
  accountName: string;
  locationId: string;
  locationName: string;
  address?: string;
};

type AccountPillProps = {
  platform: string;
  status: 'connected' | 'not_connected' | 'coming_soon';
  detail: string;
  onConnect?: () => void;
  onManage?: () => void;
  onDisconnect?: () => void;
  busy?: boolean;
};

function AccountPill({
  platform,
  status,
  detail,
  onConnect,
  onManage,
  onDisconnect,
  busy = false,
}: AccountPillProps) {
  const statusLabel =
    status === 'connected' ? 'Connected' : status === 'coming_soon' ? 'Coming soon' : 'Not connected';

  return (
    <div
      className="premium-card"
      style={{
        padding: 16,
        display: 'grid',
        gap: 12,
        alignContent: 'space-between',
        minHeight: 154,
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <strong>{platform}</strong>
          <span
            style={{
              borderRadius: 999,
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 800,
              background:
                status === 'connected'
                  ? 'rgba(61, 220, 151, 0.14)'
                  : status === 'coming_soon'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 212, 59, 0.16)',
              color:
                status === 'connected'
                  ? '#3ddc97'
                  : status === 'coming_soon'
                    ? 'rgba(255,255,255,0.72)'
                    : '#ffd43b',
            }}
          >
            {statusLabel}
          </span>
        </div>

        <p style={{ marginBottom: 0 }}>{detail}</p>
      </div>

      {status === 'connected' ? (
        <div className="button-row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="secondary-button" onClick={onManage} disabled={busy}>
            Manage
          </button>
          <button
            type="button"
            className="secondary-button danger-button"
            onClick={onDisconnect}
            disabled={busy}
          >
            {busy ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      ) : status === 'not_connected' ? (
        <button type="button" onClick={onConnect} disabled={busy}>
          Connect
        </button>
      ) : (
        <button type="button" className="secondary-button" disabled>
          Coming soon
        </button>
      )}
    </div>
  );
}

export default function SettingsPage() {
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

  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [disconnectingConnectionId, setDisconnectingConnectionId] = useState<string | null>(null);

  const [googleLocations, setGoogleLocations] = useState<GoogleLocationOption[]>([]);
  const [selectedGoogleLocationId, setSelectedGoogleLocationId] = useState('');
  const [loadingGoogleLocations, setLoadingGoogleLocations] = useState(false);
  const [savingGoogleLocation, setSavingGoogleLocation] = useState(false);
  const [showGoogleLocationPicker, setShowGoogleLocationPicker] = useState(false);

  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const metaConnections = socialConnections.filter((connection) => connection.provider === 'meta');
  const googleConnections = socialConnections.filter((connection) => connection.provider === 'google');

  const primaryMetaConnection = metaConnections[0] || null;
  const primaryGoogleConnection = googleConnections[0] || null;

  const hasMetaConnection = Boolean(primaryMetaConnection);
  const hasInstagramConnection = Boolean(primaryMetaConnection?.instagram_business_account_id);
  const hasGoogleConnection = Boolean(primaryGoogleConnection);

  useEffect(() => {
    loadBusinessProfile();

    const params = new URLSearchParams(window.location.search);
    const metaConnected = params.get('meta_connected');
    const metaError = params.get('meta_error');
    const googleConnected = params.get('google_connected');
    const googleError = params.get('google_error');

    if (metaConnected === 'true') {
      alert('Facebook and Instagram connected.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (metaConnected === 'false') {
      alert(metaError || 'Meta connection failed.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (googleConnected === 'true') {
      alert('Google connected.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (googleConnected === 'false') {
      alert(googleError || 'Google connection failed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const normaliseWebsiteUrl = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return '';

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    return `https://${trimmed}`;
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
      alert('Please sign in before connecting Facebook and Instagram.');
      return;
    }

    const params = new URLSearchParams();
    params.set('user_id', authUserId);
    params.set('return_to', '/settings');

    window.location.href = `/api/auth/meta/start?${params.toString()}`;
  };

  const connectGoogleAccount = async () => {
    let authUserId = userId;

    if (!authUserId) {
      const { data } = await supabase.auth.getUser();
      authUserId = data.user?.id || null;
    }

    if (!authUserId) {
      alert('Please sign in before connecting Google.');
      return;
    }

    const params = new URLSearchParams();
    params.set('user_id', authUserId);
    params.set('return_to', '/settings');

    window.location.href = `/api/auth/google/start?${params.toString()}`;
  };

  const loadGoogleLocations = async () => {
    if (!userId) {
      alert('Please sign in again before loading Google locations.');
      return;
    }

    setLoadingGoogleLocations(true);

    try {
      const params = new URLSearchParams();
      params.set('user_id', userId);

      const response = await fetch(`/api/google/locations?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Could not load Google locations.');
      }

      const locations = Array.isArray(result?.locations) ? result.locations : [];

      setGoogleLocations(locations);
      setSelectedGoogleLocationId(
        result?.selectedLocationId ||
          primaryGoogleConnection?.google_location_id ||
          locations[0]?.locationId ||
          ''
      );
      setShowGoogleLocationPicker(true);

      if (locations.length === 0) {
        alert('No Google business locations were found for this Google account.');
      }
    } catch (error: any) {
      console.error('Load Google locations error:', error?.message || error);
      alert(error?.message || 'Could not load Google locations.');
    } finally {
      setLoadingGoogleLocations(false);
    }
  };

  const saveGoogleLocation = async () => {
    if (!userId) {
      alert('Please sign in again before saving the Google location.');
      return;
    }

    const selectedLocation = googleLocations.find(
      (location) => location.locationId === selectedGoogleLocationId
    );

    if (!selectedLocation) {
      alert('Choose a Google location first.');
      return;
    }

    setSavingGoogleLocation(true);

    try {
      const response = await fetch('/api/google/select-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          google_account_id: selectedLocation.accountId,
          google_account_name: selectedLocation.accountName,
          google_location_id: selectedLocation.locationId,
          google_location_name: selectedLocation.locationName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Could not save Google location.');
      }

      await loadSocialConnections(userId);
      setShowGoogleLocationPicker(false);
      alert('Google location saved.');
    } catch (error: any) {
      console.error('Save Google location error:', error?.message || error);
      alert(error?.message || 'Could not save Google location.');
    } finally {
      setSavingGoogleLocation(false);
    }
  };

  const handleManageGoogleConnection = () => {
    if (!hasGoogleConnection) {
      connectGoogleAccount();
      return;
    }

    loadGoogleLocations();
  };

  const disconnectMetaAccount = async (connectionId?: string | null) => {
    if (!userId) {
      alert('Please sign in again before disconnecting.');
      return;
    }

    const confirmed = confirm(
      'Disconnect Facebook and Instagram from FromOne? Existing posts will stay saved, but FromOne will not be able to publish through this connection until you reconnect.'
    );

    if (!confirmed) return;

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
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Could not disconnect account.');
      }

      await loadSocialConnections(userId);
      alert('Facebook and Instagram disconnected.');
    } catch (error: any) {
      console.error('Disconnect Meta account error:', error?.message || error);
      alert(error?.message || 'Could not disconnect account.');
    } finally {
      setDisconnectingConnectionId(null);
    }
  };

  const disconnectGoogleAccount = async (connectionId?: string | null) => {
    if (!userId) {
      alert('Please sign in again before disconnecting.');
      return;
    }

    const confirmed = confirm(
      'Disconnect Google from FromOne? Existing posts will stay saved, but FromOne will not be able to publish through this Google connection until you reconnect.'
    );

    if (!confirmed) return;

    setDisconnectingConnectionId(connectionId || 'google');

    try {
      const response = await fetch('/api/social-connections/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          connection_id: connectionId || undefined,
          provider: 'google',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Could not disconnect Google.');
      }

      await loadSocialConnections(userId);
      setGoogleLocations([]);
      setSelectedGoogleLocationId('');
      setShowGoogleLocationPicker(false);

      alert('Google disconnected.');
    } catch (error: any) {
      console.error('Disconnect Google account error:', error?.message || error);
      alert(error?.message || 'Could not disconnect Google.');
    } finally {
      setDisconnectingConnectionId(null);
    }
  };

  const handleManageMetaConnection = () => {
    connectMetaAccount();
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
      setServices(Array.isArray(data.services) ? data.services.join(', ') : '');
      setTargetAudience(
        Array.isArray(data.target_audience) ? data.target_audience.join(', ') : ''
      );
      setToneOfVoice(data.tone_of_voice || 'Professional');
      setMainOffer(data.main_offer || '');
      setContentPillars(
        Array.isArray(data.content_pillars) ? data.content_pillars.join(', ') : ''
      );
      setBusinessGoals(
        Array.isArray(data.business_goals) ? data.business_goals.join(', ') : ''
      );

      if (data.business_name || data.industry || data.location || data.services?.length) {
        setShowBusinessDetails(true);
      }

    }

    setLoading(false);
  };

  const splitList = (value: string) => {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
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
      alert('Please add a website URL, or add at least a business name and industry.');
      return;
    }

    setSaving(true);

    try {
      await saveProfile();
      alert('Business profile saved.');
      await loadBusinessProfile();
    } catch (error: any) {
      console.error('Error saving business profile:', error?.message || error);
      alert(error?.message || 'Error saving business profile.');
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

    setShowBusinessDetails(false);
  };

  const handleDeleteProfile = async () => {
    if (!profileId) {
      handleResetForm();
      return;
    }

    if (!userId) {
      alert('Please sign in again before deleting this profile.');
      return;
    }

    const confirmed = confirm(
      'Delete this business profile? This removes the saved profile settings. Existing weekly posts will not be deleted.'
    );

    if (!confirmed) return;

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
      alert('Business profile deleted.');
    } catch (error: any) {
      console.error('Error deleting business profile:', error?.message || error);
      alert(error?.message || 'Error deleting business profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">Settings</div>
        <h1 className="page-title">Settings.</h1>
        <p className="page-description">
          Manage business details and the accounts FromOne can publish to.
        </p>
      </div>

      {loading ? (
        <div className="premium-card">
          <p>Loading settings...</p>
        </div>
      ) : (
        <>
          <section className="premium-card" style={{ marginBottom: 24 }}>
            <div className="page-eyebrow">Connected accounts</div>
            <h2 style={{ marginTop: 0 }}>Where FromOne can publish.</h2>
            <p>
              Connect the accounts you want FromOne to publish to. Facebook and Instagram are ready
              now. More platforms can be added later.
            </p>

            {loadingConnections ? (
              <p>Checking connected accounts...</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                  gap: 14,
                  marginTop: 18,
                }}
              >
                <AccountPill
                  platform="Facebook"
                  status={hasMetaConnection ? 'connected' : 'not_connected'}
                  detail={
                    hasMetaConnection
                      ? `Connected to ${primaryMetaConnection?.page_name || 'Facebook Page'}.`
                      : 'Connect your Facebook Page for direct publishing and scheduling.'
                  }
                  onConnect={connectMetaAccount}
                  onManage={handleManageMetaConnection}
                  onDisconnect={() => disconnectMetaAccount(primaryMetaConnection?.id)}
                  busy={disconnectingConnectionId === primaryMetaConnection?.id}
                />

                <AccountPill
                  platform="Instagram"
                  status={hasInstagramConnection ? 'connected' : hasMetaConnection ? 'not_connected' : 'not_connected'}
                  detail={
                    hasInstagramConnection
                      ? `Connected @${primaryMetaConnection?.instagram_username || 'Instagram'}.`
                      : hasMetaConnection
                        ? 'No linked Instagram professional account was found for this Page.'
                        : 'Connect Meta to publish Instagram posts with image or video.'
                  }
                  onConnect={connectMetaAccount}
                  onManage={handleManageMetaConnection}
                  onDisconnect={() => disconnectMetaAccount(primaryMetaConnection?.id)}
                  busy={disconnectingConnectionId === primaryMetaConnection?.id}
                />

                <AccountPill
                  platform="Google"
                  status={hasGoogleConnection ? 'connected' : 'not_connected'}
                  detail={
                    hasGoogleConnection
                      ? primaryGoogleConnection?.google_location_name
                        ? `Publishing location: ${primaryGoogleConnection.google_location_name}.`
                        : `Connected to ${
                            primaryGoogleConnection?.google_account_name ||
                            primaryGoogleConnection?.provider_user_name ||
                            'Google'
                          }. Choose a location next.`
                      : 'Connect Google so FromOne can prepare Google publishing next.'
                  }
                  onConnect={connectGoogleAccount}
                  onManage={handleManageGoogleConnection}
                  onDisconnect={() => disconnectGoogleAccount(primaryGoogleConnection?.id)}
                  busy={
                    disconnectingConnectionId === primaryGoogleConnection?.id ||
                    loadingGoogleLocations ||
                    savingGoogleLocation
                  }
                />

                <AccountPill
                  platform="LinkedIn"
                  status="coming_soon"
                  detail="Keep using copy/open until LinkedIn posting permissions are ready."
                />

                <AccountPill
                  platform="TikTok"
                  status="coming_soon"
                  detail="Video publishing can be added once the app approval is usable."
                />
              </div>
            )}
          </section>

          {hasGoogleConnection && showGoogleLocationPicker && (
            <section className="manual-collapse-card manual-open-card" style={{ marginBottom: 24 }}>
              <div className="manual-collapse-content manual-visible-content">
                <div className="page-eyebrow">Google location</div>
                <h2>Choose where Google posts should publish.</h2>
                <p>
                  Pick the Google business location FromOne should use for future Google posts.
                </p>

                {loadingGoogleLocations ? (
                  <p>Loading Google locations...</p>
                ) : googleLocations.length > 0 ? (
                  <>
                    <label>
                      <strong>Google location</strong>
                      <span>Select the business profile location to use.</span>
                    </label>

                    <select
                      className="input"
                      value={selectedGoogleLocationId}
                      onChange={(event) => setSelectedGoogleLocationId(event.target.value)}
                    >
                      {googleLocations.map((location) => (
                        <option key={location.locationId} value={location.locationId}>
                          {location.locationName}
                          {location.address ? ` — ${location.address}` : ''}
                        </option>
                      ))}
                    </select>

                    <div className="button-row" style={{ marginTop: 14 }}>
                      <button
                        type="button"
                        onClick={saveGoogleLocation}
                        disabled={savingGoogleLocation}
                      >
                        {savingGoogleLocation ? 'Saving...' : 'Save Google location'}
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setShowGoogleLocationPicker(false)}
                        disabled={savingGoogleLocation}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>No Google business locations were found for this account.</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setShowGoogleLocationPicker(false)}
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          <section className="scan-feature-card settings-simple-scan">
            <div className="scan-feature-content">
              <div>
                <div className="page-eyebrow">Business Website</div>
                <h2>Website details.</h2>
                <p>
                  Add or update the website FromOne uses when creating weekly posts. The Dashboard
                  still controls when a website scan happens.
                </p>
              </div>
            </div>

            <div className="scan-feature-form">
              <label>
                <strong>Website URL</strong>
                <span>Used when generating new weekly posts from Dashboard.</span>
              </label>

              <input
                className="input"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://example.com"
              />

              <button onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>

              <button
                type="button"
                className="manual-open-button"
                onClick={() => setShowBusinessDetails(!showBusinessDetails)}
              >
                {showBusinessDetails ? 'Hide business details' : 'Edit business details'}
              </button>

            </div>
          </section>

          {showBusinessDetails && (
            <section className="manual-collapse-card manual-open-card">
              <div className="manual-collapse-content manual-visible-content">
                <div className="page-eyebrow">Business Details</div>
                <h2>Tell FromOne about the business.</h2>
                <p>
                  These details help FromOne create better posts, especially when there is no
                  website or the website does not explain everything clearly.
                </p>

                <div className="manual-backup-grid">
                  <div>
                    <label>
                      <strong>Business Name</strong>
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
                      <strong>Location</strong>
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
                      <strong>Target Audience</strong>
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
                      <strong>Tone of Voice</strong>
                      <span>How should the content sound by default?</span>
                    </label>
                    <select
                      className="input"
                      value={toneOfVoice}
                      onChange={(event) => setToneOfVoice(event.target.value)}
                    >
                      <option value="Professional">Professional</option>
                      <option value="Friendly">Friendly</option>
                      <option value="Premium">Premium</option>
                      <option value="Direct">Direct</option>
                      <option value="Helpful">Helpful</option>
                      <option value="Fun">Fun</option>
                      <option value="Local and trustworthy">Local and trustworthy</option>
                    </select>

                    <label>
                      <strong>Main Offer or CTA</strong>
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
                      <strong>Content Themes</strong>
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
                      <strong>Business Goals</strong>
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

                <button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Business Details'}
                </button>
              </div>
            </section>
          )}

          <section className="settings-save-bar">
            <div>
              <div className="page-eyebrow">Next Step</div>
              <h2>Create weekly posts from Dashboard.</h2>
              <p>
                Settings stores the business profile and connected accounts. Dashboard uses the
                profile to scan, generate, and save weekly posts.
              </p>
            </div>

            <button onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save All Settings'}
            </button>
          </section>

          <section className="manual-collapse-card manual-open-card" style={{ marginTop: '24px' }}>
            <div className="manual-collapse-content manual-visible-content">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowDangerZone(!showDangerZone)}
              >
                {showDangerZone ? 'Hide danger zone' : 'Show danger zone'}
              </button>

              {showDangerZone && (
                <div style={{ marginTop: '18px' }}>
                  <div className="page-eyebrow">Danger Zone</div>
                  <h2>Reset or delete profile data.</h2>
                  <p>
                    Reset clears the form on this page. Delete removes the saved business profile
                    from Supabase.
                  </p>

                  <div className="button-row">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleResetForm}
                      disabled={saving}
                    >
                      Reset Form
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
    </>
  );
}
