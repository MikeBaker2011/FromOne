'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  const [brandPrimaryColor, setBrandPrimaryColor] = useState('');
  const [brandSecondaryColor, setBrandSecondaryColor] = useState('');
  const [brandAccentColor, setBrandAccentColor] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandSummary, setBrandSummary] = useState('');

  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [showBrandDetails, setShowBrandDetails] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBusinessProfile();
  }, []);

  const normaliseWebsiteUrl = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return '';

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    return `https://${trimmed}`;
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

      setBrandPrimaryColor(data.brand_primary_color || '');
      setBrandSecondaryColor(data.brand_secondary_color || '');
      setBrandAccentColor(data.brand_accent_color || '');
      setBrandLogoUrl(data.brand_logo_url || '');
      setBrandSummary(data.brand_summary || '');

      if (data.business_name || data.industry || data.location || data.services?.length) {
        setShowBusinessDetails(true);
      }

      if (
        data.brand_primary_color ||
        data.brand_secondary_color ||
        data.brand_accent_color ||
        data.brand_logo_url ||
        data.brand_summary
      ) {
        setShowBrandDetails(true);
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

    setBrandPrimaryColor('');
    setBrandSecondaryColor('');
    setBrandAccentColor('');
    setBrandLogoUrl('');
    setBrandSummary('');

    setShowBusinessDetails(false);
    setShowBrandDetails(false);
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
        <div className="page-eyebrow">Settings · Business Profile</div>
        <h1 className="page-title">Business profile settings.</h1>
        <p className="page-description">
          Edit the saved business details FromOne uses to create weekly posts.
        </p>
      </div>

      {loading ? (
        <div className="premium-card">
          <p>Loading business profile...</p>
        </div>
      ) : (
        <>
          <section className="scan-feature-card settings-simple-scan">
            <div className="scan-feature-content">
              <div>
                <div className="page-eyebrow">Business Website</div>
                <h2>Website details.</h2>
                <p>
                  Add or update the website FromOne uses when creating weekly posts. The
                  Dashboard still controls when a website scan happens.
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

              <button
                type="button"
                className="manual-open-button"
                onClick={() => setShowBrandDetails(!showBrandDetails)}
              >
                {showBrandDetails ? 'Hide brand details' : 'Edit brand details'}
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

          {showBrandDetails && (
            <section className="manual-collapse-card manual-open-card">
              <div className="manual-collapse-content manual-visible-content">
                <div className="page-eyebrow">Brand Details</div>
                <h2>Adjust the brand details.</h2>
                <p>
                  These are usually detected during the website scan. You can correct them here
                  if needed.
                </p>

                <div className="manual-backup-grid">
                  <div>
                    <label>
                      <strong>Primary Brand Colour</strong>
                      <span>Hex code used for campaign highlights.</span>
                    </label>
                    <input
                      className="input"
                      value={brandPrimaryColor}
                      onChange={(event) => setBrandPrimaryColor(event.target.value)}
                      placeholder="#ffd43b"
                    />

                    <label>
                      <strong>Secondary Brand Colour</strong>
                      <span>Usually a dark, light, or supporting colour.</span>
                    </label>
                    <input
                      className="input"
                      value={brandSecondaryColor}
                      onChange={(event) => setBrandSecondaryColor(event.target.value)}
                      placeholder="#101420"
                    />

                    <label>
                      <strong>Accent Brand Colour</strong>
                      <span>Used for smaller highlights and labels.</span>
                    </label>
                    <input
                      className="input"
                      value={brandAccentColor}
                      onChange={(event) => setBrandAccentColor(event.target.value)}
                      placeholder="#3ddc97"
                    />
                  </div>

                  <div>
                    <label>
                      <strong>Logo URL</strong>
                      <span>Optional detected logo URL.</span>
                    </label>
                    <input
                      className="input"
                      value={brandLogoUrl}
                      onChange={(event) => setBrandLogoUrl(event.target.value)}
                      placeholder="https://example.com/logo.png"
                    />

                    <label>
                      <strong>Brand Summary</strong>
                      <span>Short description of the visual style and tone.</span>
                    </label>
                    <textarea
                      className="input"
                      value={brandSummary}
                      onChange={(event) => setBrandSummary(event.target.value)}
                      placeholder="Example: Clean, professional, service-led brand with blue and white colours."
                      rows={6}
                    />
                  </div>
                </div>

                <button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Brand Details'}
                </button>
              </div>
            </section>
          )}

          <section className="settings-save-bar">
            <div>
              <div className="page-eyebrow">Next Step</div>
              <h2>Create weekly posts from Dashboard.</h2>
              <p>
                Settings stores the business profile. Dashboard uses this profile to scan,
                generate, and save weekly posts.
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
                    Reset clears the form on this page. Delete removes the saved business
                    profile from Supabase.
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