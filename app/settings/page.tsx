'use client';


import BackToDashboardButton from "@/app/components/BackToDashboardButton";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/app/components/ToastProvider';
import '../posts/posts-companion-shared.css';
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

type SavedWeeklySet = {
  id: string;
  name: string | null;
  campaign_idea: string | null;
  business_name: string | null;
  created_at: string | null;
  campaign_posts?: {
    id: string;
    media_url?: string | null;
    media_type?: string | null;
    image_url?: string | null;
    title?: string | null;
  }[];
};

type WeeklyBookingHour = {
  day_of_week: number;
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

type BookingSettings = {
  slot_interval_minutes: number;
  max_covers_per_slot: number;
  max_party_size: number;
  minimum_notice_minutes: number;
  advance_booking_days: number;
};

type BookingBlock = {
  id: string;
  block_date: string;
  is_full_day: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

type ResolvedVenueLocation = {
  postcode: string;
  latitude: number;
  longitude: number;
  source: string;
  accuracy: string;
  verifiedAt: string;
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
  customer_pain_points?: string[];
  content_style?: string;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  brand_accent_color?: string;
  brand_logo_url?: string | null;
  brand_summary?: string;
  campaign_idea?: string;
};

const dayLabels = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const shortDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const defaultBookingSettings: BookingSettings = {
  slot_interval_minutes: 30,
  max_covers_per_slot: 20,
  max_party_size: 9,
  minimum_notice_minutes: 60,
  advance_booking_days: 14,
};

const defaultBookingHours: WeeklyBookingHour[] = [
  { day_of_week: 0, is_closed: true, opens_at: null, closes_at: null },
  { day_of_week: 1, is_closed: false, opens_at: '12:00', closes_at: '21:00' },
  { day_of_week: 2, is_closed: false, opens_at: '12:00', closes_at: '21:00' },
  { day_of_week: 3, is_closed: false, opens_at: '12:00', closes_at: '21:00' },
  { day_of_week: 4, is_closed: false, opens_at: '12:00', closes_at: '22:00' },
  { day_of_week: 5, is_closed: false, opens_at: '12:00', closes_at: '23:00' },
  { day_of_week: 6, is_closed: false, opens_at: '10:00', closes_at: '23:00' },
];

const toneOptions = [
  'Professional',
  'Friendly',
  'Premium',
  'Direct',
  'Helpful',
  'Fun',
  'Local and trustworthy',
];

const businessImageBucket = 'campaign-assets';
const maxBusinessImageSize = 5 * 1024 * 1024;
const allowedBusinessImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [geoAccuracy, setGeoAccuracy] = useState('');
  const [geoSource, setGeoSource] = useState('');
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState('5');
  const [geoUpdatedAt, setGeoUpdatedAt] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [parkingInfo, setParkingInfo] = useState('');
  const [accessibilityInfo, setAccessibilityInfo] = useState('');
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>([]);
  const [acceptsBookings, setAcceptsBookings] = useState(false);
  const [bookingUrl, setBookingUrl] = useState('');
  const [bookingHours, setBookingHours] =
    useState<WeeklyBookingHour[]>(defaultBookingHours);
  const [selectedBookingDay, setSelectedBookingDay] = useState(1);
  const [bookingSettings, setBookingSettings] =
    useState<BookingSettings>(defaultBookingSettings);
  const [bookingBlocks, setBookingBlocks] = useState<BookingBlock[]>([]);
  const [newBookingBlock, setNewBookingBlock] = useState({
    blockDate: '',
    isFullDay: false,
    startTime: '18:00',
    endTime: '20:00',
    reason: '',
  });
  const [services, setServices] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('Professional');
  const [mainOffer, setMainOffer] = useState('');
  const [contentPillars, setContentPillars] = useState('');
  const [businessGoals, setBusinessGoals] = useState('');
  const [customerPainPoints, setCustomerPainPoints] = useState('');
  const [contentStyle, setContentStyle] = useState('');

  const [brandPrimaryColor, setBrandPrimaryColor] = useState('#ffd43b');
  const [brandSecondaryColor, setBrandSecondaryColor] = useState('#101420');
  const [brandAccentColor, setBrandAccentColor] = useState('#3ddc97');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandSummary, setBrandSummary] = useState('');
  const [smilesListingStatus, setSmilesListingStatus] = useState('');
  const [smilesListingSubmissionId, setSmilesListingSubmissionId] = useState('');
  const [smilesListingVenueId, setSmilesListingVenueId] = useState('');

  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [disconnectingConnectionId, setDisconnectingConnectionId] = useState<string | null>(null);

  const [savedWeeklySets, setSavedWeeklySets] = useState<SavedWeeklySet[]>([]);
  const [loadingSavedWeeklySets, setLoadingSavedWeeklySets] = useState(false);
  const [deletingWeeklySetId, setDeletingWeeklySetId] = useState<string | null>(null);

  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [showSavedPostSets, setShowSavedPostSets] = useState(false);
  const [showSocialSettings, setShowSocialSettings] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [openExtraSection, setOpenExtraSection] = useState<
    "bookings" | "smiles" | null
  >(null);
  const [showBrandDetails, setShowBrandDetails] = useState(false);
  const [showPublishingRules, setShowPublishingRules] = useState(false);
  const [showOptionalProfileModal, setShowOptionalProfileModal] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [isOnboardingSetup, setIsOnboardingSetup] = useState(false);
  const [settingsMode, setSettingsMode] = useState<'simple' | 'advanced'>('simple');
  const [activeImageTab, setActiveImageTab] = useState<'main' | 'gallery'>('main');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'business' | 'smilez'>('business');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanningWebsite, setScanningWebsite] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [sendingSmilesListing, setSendingSmilesListing] = useState(false);
  const [smilesListingSent, setSmilesListingSent] = useState(false);
  const [uploadingBusinessImage, setUploadingBusinessImage] = useState(false);
  const [uploadingGalleryImages, setUploadingGalleryImages] = useState(false);
  const [isLookingUpLocation, setIsLookingUpLocation] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');

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
  const createPostsRef = useRef<HTMLElement | null>(null);
  const businessImageInputRef = useRef<HTMLInputElement | null>(null);
  const galleryImageInputRef = useRef<HTMLInputElement | null>(null);
  const lastResolvedPostcodeRef = useRef('');

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

  const scrollToCreatePosts = () => {
    window.setTimeout(() => {
      createPostsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);
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
  const setupProfileComplete = Boolean(businessName.trim() && industry.trim() && location.trim() && services.trim());
  const setupChannelsComplete = hasMetaConnection;
  const setupCreatePostsReady = businessProfileReady;
  const hasLinkedSmilesListing = Boolean(smilesListingVenueId.trim());

  const getSmilesListingStatusLabel = () => {
    if (sendingSmilesListing) {
      return 'Sending to Smiles...';
    }

    if (
      hasLinkedSmilesListing ||
      smilesListingStatus === 'published' ||
      smilesListingStatus === 'live'
    ) {
      return 'Live on Smilez · updates sync automatically';
    }

    if (smilesListingStatus === 'approved_not_live') {
      return 'Approved by Smiles, waiting to go live';
    }

    if (smilesListingStatus === 'needs_changes') {
      return 'Smiles needs changes';
    }

    if (smilesListingStatus === 'rejected') {
      return 'Not approved for Smiles';
    }

    if (
      smilesListingStatus === 'sent' ||
      smilesListingStatus === 'pending' ||
      smilesListingStatus === 'pending_review' ||
      smilesListingSent
    ) {
      return 'Waiting for Smiles admin';
    }

    if (smilesListingStatus === 'failed') {
      return 'Could not send to Smiles';
    }

    return 'Will send automatically when saved';
  };

  const getSmilesListingStatusTone = () => {
    if (
      hasLinkedSmilesListing ||
      smilesListingStatus === 'published' ||
      smilesListingStatus === 'live'
    ) {
      return 'live';
    }

    if (smilesListingStatus === 'failed') {
      return 'failed';
    }

    if (
      smilesListingStatus === 'needs_changes' ||
      smilesListingStatus === 'rejected'
    ) {
      return 'failed';
    }

    if (
      sendingSmilesListing ||
      smilesListingStatus === 'sent' ||
      smilesListingStatus === 'pending' ||
      smilesListingStatus === 'pending_review' ||
      smilesListingStatus === 'approved_not_live' ||
      smilesListingSent
    ) {
      return 'waiting';
    }

    return 'ready';
  };

  const smilesListingStatusTone = getSmilesListingStatusTone();

  const profileHasStarted = Boolean(
    websiteUrl.trim() ||
      businessName.trim() ||
      industry.trim() ||
      location.trim() ||
      services.trim() ||
      targetAudience.trim() ||
      mainOffer.trim() ||
      customerPainPoints.trim() ||
      contentStyle.trim()
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
      { label: 'Tone', ready: Boolean(toneOfVoice.trim()) },
    ],
    [websiteUrl, businessName, industry, location, services, targetAudience, toneOfVoice]
  );

  const completedProfileItems = profileHasStarted
    ? profileCompletionItems.filter((item) => item.ready).length
    : 0;

  const profileCompletionPercent = profileHasStarted
    ? Math.round((completedProfileItems / profileCompletionItems.length) * 100)
    : 0;

  const simpleProfileSteps = useMemo(
    () => [
      { label: 'Business name', ready: Boolean(businessName.trim()) },
      { label: 'Business type', ready: Boolean(industry.trim()) },
      { label: 'Location', ready: Boolean(location.trim()) },
      { label: 'Services', ready: Boolean(services.trim()) },
      { label: 'Audience', ready: Boolean(targetAudience.trim()) },
      { label: 'Tone', ready: Boolean(toneOfVoice.trim()) },
    ],
    [businessName, industry, location, services, targetAudience, toneOfVoice]
  );

  const completedSimpleSteps = simpleProfileSteps.filter((item) => item.ready).length;
  const totalSimpleSteps = simpleProfileSteps.length;
  const simpleProfilePercent = Math.round((completedSimpleSteps / totalSimpleSteps) * 100);
  const simpleProfileComplete = completedSimpleSteps === totalSimpleSteps;
  const currentSimpleStep = Math.min(totalSimpleSteps, completedSimpleSteps + 1);


  useEffect(() => {
    loadBusinessProfile();

    const params = new URLSearchParams(window.location.search);
    const setup = params.get('setup');
    const requestedView = params.get('view');
    const metaConnected = params.get('meta_connected');

    setSettingsMode('simple');
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

  const normalisePostcode = (value: string) => {
    return value.replace(/\s+/g, ' ').trim().toUpperCase();
  };

  const getPostcodePrefix = (value: string) => {
    const cleanPostcode = normalisePostcode(value).replace(/\s+/g, '');

    if (cleanPostcode.length <= 3) {
      return cleanPostcode;
    }

    return cleanPostcode.slice(0, -3);
  };

  const isValidPostcodePrefix = (value: string) => {
    if (!value.trim()) {
      return true;
    }

    return /^[A-Z]{1,2}\d[A-Z\d]?$/.test(getPostcodePrefix(value));
  };

  const normaliseTime = (value: string | null | undefined) =>
    String(value || '').slice(0, 5);

  const formatDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayDateValue = () => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return formatDateValue(date);
  };

  const getTomorrowDateValue = () => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + 1);
    return formatDateValue(date);
  };

  const getNextSaturdayDateValue = () => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7));
    return formatDateValue(date);
  };

  const getNextDateForDay = (dayOfWeek: number) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + ((dayOfWeek - date.getDay() + 7) % 7));

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  const formatBookingHourDisplay = (row: WeeklyBookingHour) => {
    if (row.is_closed) return 'Closed';

    const opensAt = normaliseTime(row.opens_at);
    const closesAt = normaliseTime(row.closes_at);

    return opensAt && closesAt ? `${opensAt}-${closesAt}` : 'Not set';
  };

  const formatBookingBlockDate = (value: string) => {
    const parsed = new Date(`${value}T12:00:00`);

    if (Number.isNaN(parsed.getTime())) return 'Date not set';

    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(parsed);
  };

  const formatBookingBlockDisplay = (block: BookingBlock) => {
    if (block.is_full_day) return 'Closed all day';

    const startsAt = normaliseTime(block.start_time);
    const endsAt = normaliseTime(block.end_time);

    return startsAt && endsAt ? `${startsAt}-${endsAt}` : 'Time not set';
  };

  const updateBookingSetting = (
    field: keyof BookingSettings,
    value: number,
  ) => {
    setBookingSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateNewBookingBlock = (
    field: keyof typeof newBookingBlock,
    value: string | boolean,
  ) => {
    setNewBookingBlock((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addBookingBlock = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newBookingBlock.blockDate)) {
      notify('Choose a valid date to block.', 'warning', 'Blocked date needed');
      return;
    }

    if (
      !newBookingBlock.isFullDay &&
      (!newBookingBlock.startTime ||
        !newBookingBlock.endTime ||
        newBookingBlock.startTime >= newBookingBlock.endTime)
    ) {
      notify(
        'The blocked time must have a valid start and end time.',
        'warning',
        'Blocked time needed',
      );
      return;
    }

    const nextBlock: BookingBlock = {
      id: `new-${crypto.randomUUID()}`,
      block_date: newBookingBlock.blockDate,
      is_full_day: newBookingBlock.isFullDay,
      start_time: newBookingBlock.isFullDay
        ? null
        : newBookingBlock.startTime,
      end_time: newBookingBlock.isFullDay ? null : newBookingBlock.endTime,
      reason: newBookingBlock.reason.trim() || null,
    };

    setBookingBlocks((current) =>
      [...current, nextBlock].sort((first, second) => {
        if (first.block_date === second.block_date) {
          return normaliseTime(first.start_time).localeCompare(
            normaliseTime(second.start_time),
          );
        }

        return first.block_date.localeCompare(second.block_date);
      }),
    );

    setNewBookingBlock({
      blockDate: '',
      isFullDay: false,
      startTime: '18:00',
      endTime: '20:00',
      reason: '',
    });
  };

  const removeBookingBlock = (blockId: string) => {
    setBookingBlocks((current) =>
      current.filter((block) => block.id !== blockId),
    );
  };

  const updateBookingHour = (
    dayOfWeek: number,
    field: 'is_closed' | 'opens_at' | 'closes_at',
    value: boolean | string,
  ) => {
    setBookingHours((current) =>
      current.map((row) => {
        if (row.day_of_week !== dayOfWeek) return row;

        if (field === 'is_closed') {
          const isClosed = Boolean(value);

          return {
            ...row,
            is_closed: isClosed,
            opens_at: isClosed ? null : row.opens_at || '12:00',
            closes_at: isClosed ? null : row.closes_at || '21:00',
          };
        }

        return {
          ...row,
          [field]: String(value),
        };
      }),
    );
  };

  const resolvePostcodeCoordinates = async (
    options: { silent?: boolean } = {},
  ): Promise<ResolvedVenueLocation | null> => {
    const postcodeValue = normalisePostcode(postcode);

    if (!postcodeValue) {
      if (!options.silent) {
        notify(
          'Add the venue postcode before finding its location.',
          'warning',
          'Postcode needed',
        );
      }
      return null;
    }

    setIsLookingUpLocation(true);
    setGeoMessage('');

    try {
      const response = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(postcodeValue)}`,
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? 'That postcode could not be found.'
            : 'The postcode lookup is temporarily unavailable.',
        );
      }

      const payload = (await response.json()) as {
        result?: {
          postcode?: string;
          latitude?: number;
          longitude?: number;
        } | null;
      };
      const result = payload.result;

      if (
        !result ||
        typeof result.latitude !== 'number' ||
        typeof result.longitude !== 'number'
      ) {
        throw new Error(
          'That postcode did not return a usable map location.',
        );
      }

      const resolved: ResolvedVenueLocation = {
        postcode: normalisePostcode(result.postcode || postcodeValue),
        latitude: result.latitude,
        longitude: result.longitude,
        source: 'postcodes.io',
        accuracy: 'postcode',
        verifiedAt: new Date().toISOString(),
      };

      lastResolvedPostcodeRef.current = resolved.postcode;
      setPostcode(resolved.postcode);
      setLatitude(String(resolved.latitude));
      setLongitude(String(resolved.longitude));
      setGeoEnabled(true);
      setGeoAccuracy(resolved.accuracy);
      setGeoSource(resolved.source);
      setGeoUpdatedAt(resolved.verifiedAt);
      setGeoMessage(
        'Map location filled automatically from the venue postcode.',
      );

      if (!options.silent) {
        notify(
          'Map location filled automatically from the venue postcode.',
          'success',
          'Smilez map location ready',
        );
      }

      return resolved;
    } catch (error: any) {
      if (!options.silent) {
        notify(
          error?.message || 'We could not confirm this postcode.',
          'error',
          'Location not confirmed',
        );
      }
      return null;
    } finally {
      setIsLookingUpLocation(false);
    }
  };

  const lookupPostcodeCoordinates = async () => {
    await resolvePostcodeCoordinates();
  };

  const ensurePostcodeCoordinates = async () => {
    const cleanPostcode = normalisePostcode(postcode);
    const currentLatitude = latitude.trim() ? Number(latitude) : null;
    const currentLongitude = longitude.trim() ? Number(longitude) : null;
    const hasCurrentCoordinates =
      currentLatitude !== null &&
      currentLongitude !== null &&
      Number.isFinite(currentLatitude) &&
      Number.isFinite(currentLongitude) &&
      lastResolvedPostcodeRef.current === cleanPostcode;

    if (!cleanPostcode) {
      return null;
    }

    if (hasCurrentCoordinates) {
      return {
        postcode: cleanPostcode,
        latitude: currentLatitude,
        longitude: currentLongitude,
        source: geoSource || 'postcodes.io',
        accuracy: geoAccuracy || 'postcode',
        verifiedAt: geoUpdatedAt || new Date().toISOString(),
      } satisfies ResolvedVenueLocation;
    }

    return resolvePostcodeCoordinates({ silent: true });
  };

  const handlePostcodeChange = (value: string) => {
    const nextPostcode = value.toUpperCase();
    const normalisedNextPostcode = normalisePostcode(nextPostcode);

    setPostcode(nextPostcode);

    if (
      lastResolvedPostcodeRef.current &&
      normalisedNextPostcode !== lastResolvedPostcodeRef.current
    ) {
      setLatitude('');
      setLongitude('');
      setGeoEnabled(false);
      setGeoAccuracy('');
      setGeoSource('');
      setGeoUpdatedAt('');
      setGeoMessage('Postcode changed. The map location will refresh automatically.');
    }
  };

  const handlePostcodeBlur = () => {
    const cleanPostcode = normalisePostcode(postcode);

    if (
      cleanPostcode &&
      cleanPostcode !== lastResolvedPostcodeRef.current &&
      !isLookingUpLocation
    ) {
      void resolvePostcodeCoordinates({ silent: true });
    }
  };

  const formatGeoUpdatedAt = (value: string) => {
    if (!value) return 'Not confirmed';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Not confirmed';
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(parsed);
  };

  const splitList = (value: string) => {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const getSafeStorageSegment = (value: string) => {
    return value
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const getBusinessImageExtension = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) {
      return extension;
    }

    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    if (file.type === 'image/gif') return 'gif';

    return 'jpg';
  };

  const handleBusinessImageUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!allowedBusinessImageTypes.includes(file.type)) {
      notify('Upload a JPG, PNG, WEBP or GIF image.', 'warning', 'Image type needed');
      return;
    }

    if (file.size > maxBusinessImageSize) {
      notify('Upload an image under 5MB.', 'warning', 'Image too large');
      return;
    }

    setUploadingBusinessImage(true);

    try {
      const freshUserId = await getFreshAuthUserId();

      if (!freshUserId) {
        throw new Error('Please sign in again before uploading an image.');
      }

      const safeUserId = getSafeStorageSegment(freshUserId);
      const extension = getBusinessImageExtension(file);
      const filePath = `business-profiles/${safeUserId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(businessImageBucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(businessImageBucket)
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      if (!publicUrl) {
        throw new Error('The image uploaded, but no public URL was returned.');
      }

      setBrandLogoUrl(publicUrl);
      notify(
        'Image uploaded. Save the Business Profile to sync it to Smiles.',
        'success',
        'Image ready'
      );
    } catch (error: any) {
      console.error('Business image upload error:', error?.message || error);
      notify(error?.message || 'Could not upload this image.', 'error', 'Upload failed');
    } finally {
      setUploadingBusinessImage(false);
    }
  };

  const removeBusinessImage = () => {
    setBrandLogoUrl('');
    notify(
      'Image removed from the profile. Save the Business Profile to sync this to Smiles.',
      'info',
      'Image removed'
    );
  };

  const uploadBusinessProfileFile = async (file: File, folder: string) => {
    if (!allowedBusinessImageTypes.includes(file.type)) {
      throw new Error('Upload JPG, PNG, WEBP or GIF images only.');
    }

    if (file.size > maxBusinessImageSize) {
      throw new Error('Each image must be under 5MB.');
    }

    const freshUserId = await getFreshAuthUserId();

    if (!freshUserId) {
      throw new Error('Please sign in again before uploading images.');
    }

    const safeUserId = getSafeStorageSegment(freshUserId);
    const extension = getBusinessImageExtension(file);
    const filePath = `business-profiles/${safeUserId}/${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(businessImageBucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(businessImageBucket)
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error('The image uploaded, but no public URL was returned.');
    }

    return data.publicUrl;
  };

  const handleGalleryImagesUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) return;

    const remainingSlots = Math.max(0, 6 - galleryImageUrls.length);

    if (remainingSlots === 0) {
      notify('You can add up to 6 gallery images.', 'warning', 'Gallery full');
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    setUploadingGalleryImages(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        uploadedUrls.push(await uploadBusinessProfileFile(file, 'gallery'));
      }

      setGalleryImageUrls((current) => [...current, ...uploadedUrls].slice(0, 6));
      notify(
        `${uploadedUrls.length} gallery ${uploadedUrls.length === 1 ? 'image' : 'images'} uploaded. Save the Business Profile to sync to Smilez.`,
        'success',
        'Gallery updated'
      );
    } catch (error: any) {
      console.error('Gallery image upload error:', error?.message || error);
      notify(error?.message || 'Could not upload the gallery images.', 'error', 'Upload failed');
    } finally {
      setUploadingGalleryImages(false);
    }
  };

  const removeGalleryImage = (imageUrl: string) => {
    setGalleryImageUrls((current) => current.filter((item) => item !== imageUrl));
  };

  const joinList = (value: any) => {
    return Array.isArray(value) ? value.join(', ') : '';
  };

  const getSavedWeeklySetName = (set: SavedWeeklySet) => {
    return (
      String(set.name || set.campaign_idea || set.business_name || "Weekly posts")
        .replace(/\s+—\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}.*$/g, "")
        .replace(/\s+-\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}.*$/g, "")
        .trim() || "Weekly posts"
    );
  };

  const formatSavedWeeklySetDate = (value?: string | null) => {
    if (!value) return "Date not shown";

    try {
      return new Date(value).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Date not shown";
    }
  };

  const getSavedWeeklySetPostCount = (set: SavedWeeklySet) => {
    return Array.isArray(set.campaign_posts) ? set.campaign_posts.length : 0;
  };

  const getSavedWeeklySetPreviewPosts = (set: SavedWeeklySet) => {
    return Array.isArray(set.campaign_posts)
      ? set.campaign_posts.filter(
          (post) => Boolean(post?.media_url || post?.image_url),
        ).slice(0, 4)
      : [];
  };

  const loadSavedWeeklySets = async (authUserId: string) => {
    setLoadingSavedWeeklySets(true);

    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          "id,name,campaign_idea,business_name,created_at,campaign_posts(id,media_url,media_type,image_url,title)",
        )
        .eq("user_id", authUserId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      setSavedWeeklySets((data || []) as SavedWeeklySet[]);
    } catch (error: any) {
      console.error("Load saved weekly sets error:", error?.message || error);
      setSavedWeeklySets([]);
    } finally {
      setLoadingSavedWeeklySets(false);
    }
  };

  const deleteSavedWeeklySet = async (set: SavedWeeklySet) => {
    if (!userId || !set?.id) {
      notify("Please sign in again before deleting a saved weekly set.", "warning", "Sign in needed");
      return;
    }

    const setName = getSavedWeeklySetName(set);
    const confirmed = window.confirm(
      `Delete "${setName}"?\n\nThis removes the saved weekly set and its posts. This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingWeeklySetId(set.id);

    try {
      /*
       * Delete the FromOne rows only.
       *
       * Do not remove campaign media from Supabase Storage here because
       * Stockport Smilez offers and events may still use the same public URLs.
       */
      const { error: postsDeleteError } = await supabase
        .from("campaign_posts")
        .delete()
        .eq("campaign_id", set.id);

      if (postsDeleteError) {
        throw postsDeleteError;
      }

      const { error: campaignDeleteError } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", set.id)
        .eq("user_id", userId);

      if (campaignDeleteError) {
        throw campaignDeleteError;
      }

      setSavedWeeklySets((current) => current.filter((item) => item.id !== set.id));
      notify("Saved weekly set deleted. You can now create a new weekly post set.", "success", "Weekly set deleted");
    } catch (error: any) {
      console.error("Delete saved weekly set error:", error?.message || error);
      notify(error?.message || "Could not delete this saved weekly set.", "error", "Delete failed");
    } finally {
      setDeletingWeeklySetId(null);
    }
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
    if (Array.isArray(profile.customer_pain_points)) {
      setCustomerPainPoints(profile.customer_pain_points.join(', '));
    }
    if (profile.content_style) setContentStyle(profile.content_style);
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

  const syncSmilesListingStatus = async (businessProfileId: string) => {
    if (!businessProfileId) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token || '';

      const response = await fetch('/api/smiles/sync-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          businessProfileId,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.ok === false || result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Could not check Smiles listing status.',
        );
      }

      if (result?.status) {
        setSmilesListingStatus(result.status);
      }
    } catch (error: any) {
      console.error('Sync Smiles listing status error:', error?.message || error);
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
    await Promise.all([loadSocialConnections(authUserId), loadSavedWeeklySets(authUserId)]);

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
      setAddress(data.address || '');
      setPostcode(data.postcode || '');
      setLatitude(typeof data.latitude === 'number' && Number.isFinite(data.latitude) ? String(data.latitude) : '');
      setLongitude(typeof data.longitude === 'number' && Number.isFinite(data.longitude) ? String(data.longitude) : '');
      setGeoEnabled(Boolean(data.geo_enabled));
      setGeoAccuracy(data.geo_accuracy || '');
      setGeoSource(data.geo_source || '');
      setServiceRadiusMiles(typeof data.service_radius_miles === 'number' ? String(data.service_radius_miles) : '5');
      setGeoUpdatedAt(data.geo_updated_at || '');
      lastResolvedPostcodeRef.current =
        data.geo_enabled &&
        typeof data.latitude === 'number' &&
        typeof data.longitude === 'number'
          ? normalisePostcode(data.postcode || '')
          : '';
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setOpeningHours(data.opening_hours || '');
      setParkingInfo(data.parking_info || '');
      setAccessibilityInfo(data.accessibility_info || '');
      setGalleryImageUrls(
        Array.isArray(data.gallery_image_urls) ? data.gallery_image_urls.filter(Boolean) : [],
      );
      setAcceptsBookings(Boolean(data.accepts_bookings));
      setBookingUrl(data.booking_url || '');
      setBookingHours(
        Array.isArray(data.booking_hours) && data.booking_hours.length > 0
          ? data.booking_hours
          : defaultBookingHours,
      );
      setBookingSettings({
        slot_interval_minutes:
          Number(data.booking_settings?.slot_interval_minutes) ||
          defaultBookingSettings.slot_interval_minutes,
        max_covers_per_slot:
          Number(data.booking_settings?.max_covers_per_slot) ||
          defaultBookingSettings.max_covers_per_slot,
        max_party_size:
          Number(data.booking_settings?.max_party_size) ||
          defaultBookingSettings.max_party_size,
        minimum_notice_minutes:
          Number(data.booking_settings?.minimum_notice_minutes) ||
          defaultBookingSettings.minimum_notice_minutes,
        advance_booking_days:
          Number(data.booking_settings?.advance_booking_days) ||
          defaultBookingSettings.advance_booking_days,
      });
      setBookingBlocks(
        Array.isArray(data.booking_blocks) ? data.booking_blocks : [],
      );
      setServices(joinList(data.services));
      setTargetAudience(joinList(data.target_audience));
      setToneOfVoice(data.tone_of_voice || 'Professional');
      setMainOffer(data.main_offer || '');
      setContentPillars(joinList(data.content_pillars));
      setBusinessGoals(joinList(data.business_goals));
      setCustomerPainPoints(joinList(data.customer_pain_points));
      setContentStyle(data.content_style || '');
      setBrandPrimaryColor(data.brand_primary_color || '#ffd43b');
      setBrandSecondaryColor(data.brand_secondary_color || '#101420');
      setBrandAccentColor(data.brand_accent_color || '#3ddc97');
      setBrandLogoUrl(data.brand_logo_url || '');
      setBrandSummary(data.brand_summary || '');
      setSmilesListingStatus(data.smiles_listing_status || '');
      setSmilesListingSubmissionId(data.smiles_listing_submission_id || '');
      setSmilesListingVenueId(data.smiles_listing_venue_id || '');

      if (
        data.id &&
        data.smiles_listing_submission_id &&
        data.smiles_listing_status !== 'live' &&
        data.smiles_listing_status !== 'published'
      ) {
        await syncSmilesListingStatus(data.id);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const setup = params.get('setup');
    const setupActive = setup === 'business';

    setIsOnboardingSetup(setupActive);
    setShowBusinessDetails(setupActive && !data);
    setShowBrandDetails(false);
    setLoading(false);
  };

  const buildPayload = async (resolvedLocation?: ResolvedVenueLocation | null) => {
    const authUserId = await getFreshAuthUserId();
    const cleanPostcode = normalisePostcode(
      resolvedLocation?.postcode || postcode,
    );
    const postcodePrefix = getPostcodePrefix(cleanPostcode);
    const parsedLatitude = resolvedLocation
      ? resolvedLocation.latitude
      : latitude.trim()
        ? Number(latitude)
        : null;
    const parsedLongitude = resolvedLocation
      ? resolvedLocation.longitude
      : longitude.trim()
        ? Number(longitude)
        : null;
    const parsedServiceRadius = Number(serviceRadiusMiles || '5');

    if (parsedLatitude !== null && (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90)) {
      throw new Error('Latitude must be a number between -90 and 90.');
    }
    if (parsedLongitude !== null && (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180)) {
      throw new Error('Longitude must be a number between -180 and 180.');
    }
    if (!Number.isFinite(parsedServiceRadius) || parsedServiceRadius < 0.5 || parsedServiceRadius > 50) {
      throw new Error('Nearby discovery radius must be between 0.5 and 50 miles.');
    }
    if (geoEnabled && (parsedLatitude === null || parsedLongitude === null)) {
      throw new Error('Confirm the venue location before enabling nearby discovery.');
    }

    return {
      user_id: authUserId,
      website_url: normaliseWebsiteUrl(websiteUrl) || null,
      business_name: businessName.trim() || null,
      industry: industry.trim() || null,
      location: location.trim() || null,
      address: address.trim() || null,
      postcode: cleanPostcode || null,
      postcode_prefix: postcodePrefix || null,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      geo_enabled: resolvedLocation ? true : geoEnabled,
      geo_accuracy:
        resolvedLocation?.accuracy || geoAccuracy.trim() || null,
      geo_source:
        resolvedLocation?.source || geoSource.trim() || null,
      service_radius_miles: parsedServiceRadius,
      geo_updated_at:
        resolvedLocation?.verifiedAt || geoUpdatedAt || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      opening_hours: openingHours.trim() || null,
      parking_info: parkingInfo.trim() || null,
      accessibility_info: accessibilityInfo.trim() || null,
      gallery_image_urls: galleryImageUrls,
      accepts_bookings: acceptsBookings,
      booking_url:
        acceptsBookings && bookingUrl.trim()
          ? normaliseWebsiteUrl(bookingUrl)
          : null,
      booking_hours: bookingHours,
      booking_settings: bookingSettings,
      booking_blocks: bookingBlocks,
      services: splitList(services),
      target_audience: splitList(targetAudience),
      tone_of_voice: toneOfVoice,
      main_offer: mainOffer.trim() || null,
      content_pillars: splitList(contentPillars),
      business_goals: splitList(businessGoals),
      customer_pain_points: splitList(customerPainPoints),
      content_style: contentStyle.trim() || null,
      brand_primary_color: brandPrimaryColor.trim() || null,
      brand_secondary_color: brandSecondaryColor.trim() || null,
      brand_accent_color: brandAccentColor.trim() || null,
      brand_logo_url: brandLogoUrl.trim() || null,
      brand_summary: brandSummary.trim() || null,
      updated_at: new Date().toISOString(),
    };
  };

  const saveProfile = async (resolvedLocation?: ResolvedVenueLocation | null) => {
    const payload = await buildPayload(resolvedLocation);

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


  const saveProfileAndContinue = async () => {
    const savedSuccessfully = await handleSaveProfile();

    if (!savedSuccessfully) {
      return;
    }

    window.location.href = '/dashboard';
  };

  const handleSaveProfile = async () => {
    const hasWebsite = Boolean(websiteUrl.trim());
    const hasBusinessDetails = Boolean(businessName.trim() && industry.trim());

    if (!hasWebsite && !hasBusinessDetails) {
      notify('Please add a website URL, or add at least a business name and industry.', 'warning', 'Profile details needed');
      return false;
    }

    if (postcode.trim() && !isValidPostcodePrefix(postcode)) {
      notify('Postcode must start with a valid UK postcode area, like SK1.', 'warning', 'Postcode needed');
      return false;
    }

    if (acceptsBookings && bookingUrl.trim()) {
      const safeBookingUrl = normaliseWebsiteUrl(bookingUrl);

      try {
        new URL(safeBookingUrl);
      } catch {
        notify(
          'Booking URL must be a valid full web address.',
          'warning',
          'Booking URL needed',
        );
        return false;
      }
    }

    if (acceptsBookings && !bookingUrl.trim()) {
      for (const row of bookingHours) {
        if (
          !row.is_closed &&
          (!row.opens_at ||
            !row.closes_at ||
            row.opens_at >= row.closes_at)
        ) {
          notify(
            `${dayLabels[row.day_of_week]} must have a valid opening and closing time.`,
            'warning',
            'Opening hours needed',
          );
          return false;
        }
      }

      if (
        bookingSettings.max_party_size < 1 ||
        bookingSettings.max_party_size >
          bookingSettings.max_covers_per_slot
      ) {
        notify(
          'Maximum party size must be between 1 and the covers available per slot.',
          'warning',
          'Booking capacity needed',
        );
        return false;
      }
    }

    setSaving(true);

    try {
      const resolvedLocation = postcode.trim()
        ? await ensurePostcodeCoordinates()
        : null;

      if (postcode.trim() && !resolvedLocation) {
        notify(
          'The postcode could not be converted into a map location. Check it and try again.',
          'error',
          'Map location needed',
        );
        return false;
      }

      const savedProfileId = await saveProfile(resolvedLocation);

      const { data: latestProfile } = await supabase
        .from('business_profiles')
        .select(
          'smiles_listing_status, smiles_listing_submission_id, smiles_listing_venue_id'
        )
        .eq('id', savedProfileId)
        .maybeSingle();

      const latestSmilesStatus = String(
        latestProfile?.smiles_listing_status || smilesListingStatus || ''
      ).trim();

      const latestSubmissionId = String(
        latestProfile?.smiles_listing_submission_id || smilesListingSubmissionId || ''
      ).trim();

      const latestVenueId = String(
        latestProfile?.smiles_listing_venue_id || smilesListingVenueId || ''
      ).trim();

      const isLiveOnSmiles =
        latestSmilesStatus === 'live' ||
        latestSmilesStatus === 'published' ||
        Boolean(latestVenueId);

      const shouldSendOrSyncSmiles =
        isLiveOnSmiles ||
        (!latestSubmissionId && latestSmilesStatus !== 'sent');

      if (shouldSendOrSyncSmiles) {
        const smilesSyncSucceeded =
          await sendBusinessListingToSmiles(savedProfileId, resolvedLocation);

        if (!smilesSyncSucceeded) {
          return false;
        }
      }

      const params = new URLSearchParams(window.location.search);
      const setup = params.get('setup');

      setShowBusinessDetails(false);
      setShowBrandDetails(false);

      if (setup === 'business') {
        notify('Business Profile saved. You can connect Facebook and Instagram now, or go to Dashboard and create posts.', 'success', 'Business Profile saved');
        await loadBusinessProfile();
        scrollToSocialConnections();
        return false;
      }

      notify('Business Profile saved. Next: go to Dashboard and upload your first photo, video or flyer.', 'success', 'Profile saved');
      await loadBusinessProfile();
      scrollToSocialConnections();
      return true;
    } catch (error: any) {
      console.error('Error saving business profile:', error?.message || error);
      notify(error?.message || 'Error saving Business Profile.', 'error', 'Save failed');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const sendBusinessListingToSmiles = async (
    savedProfileId: string,
    resolvedLocation?: ResolvedVenueLocation | null,
  ) => {
    const hasBusinessDetails = Boolean(businessName.trim() && industry.trim());

    if (!hasBusinessDetails) {
      notify(
        'Please add at least a company name and business type first.',
        'warning',
        'Business details needed',
      );
      openProfileEditor();
      return false;
    }

    setSendingSmilesListing(true);

    try {
      const freshUserId = await getFreshAuthUserId();
      const description =
        brandSummary.trim() ||
        services.trim() ||
        mainOffer.trim() ||
        `${businessName.trim()} is a local ${industry.trim()} business.`;

      const response = await fetch('/api/smiles/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftType: 'venue',
          businessProfileId: savedProfileId,
          smilesVenueId: smilesListingVenueId || undefined,
          smiles_venue_id: smilesListingVenueId || undefined,
          userId: freshUserId,
          user_id: freshUserId,
          title: businessName.trim(),
          name: businessName.trim(),
          description,
          shortDescription: description.slice(0, 150),
          locationName: businessName.trim(),
          locationArea: location.trim(),
          address: address.trim(),
          postcode: normalisePostcode(postcode),
          postcodePrefix: getPostcodePrefix(postcode),
          postcode_prefix: getPostcodePrefix(postcode),
          latitude: latitude.trim() ? Number(latitude) : null,
          longitude: longitude.trim() ? Number(longitude) : null,
          geoEnabled,
          geo_enabled: geoEnabled,
          geoAccuracy,
          geo_accuracy: geoAccuracy,
          geoSource,
          geo_source: geoSource,
          serviceRadiusMiles: Number(serviceRadiusMiles || '5'),
          service_radius_miles: Number(serviceRadiusMiles || '5'),
          geoUpdatedAt: geoUpdatedAt || null,
          geo_updated_at: geoUpdatedAt || null,
          phone: phone.trim(),
          email: email.trim(),
          openingHours: openingHours.trim(),
          opening_hours: openingHours.trim(),
          parkingInfo: parkingInfo.trim(),
          parking_info: parkingInfo.trim(),
          accessibilityInfo: accessibilityInfo.trim(),
          accessibility_info: accessibilityInfo.trim(),
          galleryImageUrls,
          gallery_image_urls: galleryImageUrls,
          logoUrl: brandLogoUrl.trim() || null,
          logo_url: brandLogoUrl.trim() || null,
          acceptsBookings,
          accepts_bookings: acceptsBookings,
          bookingUrl:
            acceptsBookings && bookingUrl.trim()
              ? normaliseWebsiteUrl(bookingUrl)
              : '',
          booking_url:
            acceptsBookings && bookingUrl.trim()
              ? normaliseWebsiteUrl(bookingUrl)
              : '',
          bookingHours,
          booking_hours: bookingHours,
          bookingSettings,
          booking_settings: bookingSettings,
          bookingBlocks,
          booking_blocks: bookingBlocks,
          venueType: industry.trim(),
          websiteUrl: normaliseWebsiteUrl(websiteUrl) || '',
          mediaUrl:
            brandLogoUrl.trim() ||
            galleryImageUrls[0]?.trim() ||
            null,
          media_url:
            brandLogoUrl.trim() ||
            galleryImageUrls[0]?.trim() ||
            null,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.ok === false || result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Could not send this listing to Smiles.',
        );
      }

      const nextSmilesStatus =
        result?.status ||
        (result?.isPublished || result?.directSync ? 'live' : 'pending_review');

      const nextSubmissionId =
        result?.smilesDraftId || smilesListingSubmissionId || null;

      const nextVenueId =
        result?.smilesVenueId || smilesListingVenueId || null;

      const updates = {
        smiles_listing_status: nextSmilesStatus,
        smiles_listing_submission_id: nextSubmissionId,
        smiles_listing_venue_id: nextVenueId,
        smiles_listing_sent_at: new Date().toISOString(),
        smiles_listing_error: null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('business_profiles')
        .update(updates)
        .eq('id', savedProfileId);

      if (updateError) throw updateError;

      setSmilesListingStatus(nextSmilesStatus);
      setSmilesListingSubmissionId(nextSubmissionId || '');
      setSmilesListingVenueId(nextVenueId || '');
      setSmilesListingSent(true);
      notify(
        result?.directSync
          ? 'Live Smilez business profile updated automatically.'
          : 'New Smilez business listing sent for admin approval.',
        'success',
        result?.directSync ? 'Smilez profile updated' : 'Sent for approval',
      );
      await loadBusinessProfile();
      return true;
    } catch (error: any) {
      console.error('Send Smiles listing error:', error?.message || error);
      if (savedProfileId) {
        await supabase
          .from('business_profiles')
          .update({
            smiles_listing_status: 'failed',
            smiles_listing_error:
              error?.message || 'Could not send this listing to Smiles.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', savedProfileId);
        setSmilesListingStatus('failed');
      }

      notify(
        error?.message || 'Could not send this listing to Smilez.',
        'error',
        'Smilez sync failed',
      );
      return false;
    } finally {
      setSendingSmilesListing(false);
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
    setAddress('');
    setPostcode('');
    setLatitude('');
    setLongitude('');
    setGeoEnabled(false);
    setGeoAccuracy('');
    setGeoSource('');
    setServiceRadiusMiles('5');
    setGeoUpdatedAt('');
    setGeoMessage('');
    setPhone('');
    setEmail('');
    setOpeningHours('');
    setAcceptsBookings(false);
    setBookingUrl('');
    setBookingHours(defaultBookingHours);
    setSelectedBookingDay(1);
    setBookingSettings(defaultBookingSettings);
    setBookingBlocks([]);
    setNewBookingBlock({
      blockDate: '',
      isFullDay: false,
      startTime: '18:00',
      endTime: '20:00',
      reason: '',
    });
    setServices('');
    setTargetAudience('');
    setToneOfVoice('Professional');
    setMainOffer('');
    setContentPillars('');
    setBusinessGoals('');
    setCustomerPainPoints('');
    setContentStyle('');
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
      title: 'Delete saved profile?',
      message:
        'This removes the saved Business Profile from Supabase. Existing weekly posts will not be deleted.',
      confirmLabel: 'Delete saved profile',
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

  if (loading) {
    return (
      <main className="fromone-posts-page fromone-settings-page settings-create-style-page">
      <BackToDashboardButton />
        <section id="fromone-standard-shell" className="settings-create-style-card settings-loading-card" aria-label="Settings loading">
          <span className="posts-create-eyebrow settings-create-eyebrow">Settings</span>
          <h1>Loading settings.</h1>
          <p>Checking your business profile and social connections.</p>
        </section>
      </main>
    );
  }

  if (settingsMode === 'simple') {
    return (
      <main
        className="fromone-posts-page fromone-settings-page settings-simple-business-page"
        data-settings-page="simple-business-v1"
      >
      <BackToDashboardButton />
        <section id="fromone-standard-shell" className="settings-simple-business-shell">
          <header className="settings-simple-business-header">
            <span className="posts-create-eyebrow">Settings</span>
            <h1>Your business</h1>
            <p>
              Add the details customers need. Smilez uses this same information
              automatically, so nothing needs entering twice.
            </p>
          </header>

          <section className="settings-simple-card settings-simple-scan-card">
            <div className="settings-simple-card-heading">
              <div>
                <span>Quick setup</span>
                <h2>Scan your website</h2>
              </div>
              <small>Automatically fills the business profile</small>
            </div>

            <div className="settings-simple-scan-row">
              <label>
                <strong>Website address</strong>
                <input
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://yourbusiness.co.uk"
                />
              </label>

              <button
                type="button"
                className="settings-simple-primary"
                onClick={handleScanWebsite}
                disabled={scanningWebsite}
              >
                {scanningWebsite ? 'Scanning...' : 'Scan website'}
              </button>
            </div>

            {scanMessage ? (
              <p className="settings-simple-scan-message">{scanMessage}</p>
            ) : null}
          </section>

          <section className="settings-simple-card">
            <div className="settings-simple-card-heading">
              <div>
                <span>Business profile</span>
                <h2>Main details</h2>
              </div>
              <small>Used across FromOne and Smilez</small>
            </div>

            <div className="settings-simple-grid">
              <label>
                <strong>Business name</strong>
                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Your business name"
                />
              </label>

              <label>
                <strong>Business type</strong>
                <input
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  placeholder="Cafe, salon, retailer..."
                />
              </label>

              <label className="settings-simple-wide">
                <strong>Website</strong>
                <input
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label className="settings-simple-wide">
                <strong>Address</strong>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Street and venue address"
                />
              </label>

              <label>
                <strong>Postcode</strong>
                <input
                  value={postcode}
                  onChange={(event) => handlePostcodeChange(event.target.value)}
                  onBlur={handlePostcodeBlur}
                  placeholder="SK1 1AA"
                />
                <small>
                  {isLookingUpLocation
                    ? 'Finding the map location...'
                    : geoMessage || 'Map location is found automatically from the postcode.'}
                </small>
              </label>

              <label>
                <strong>Town or area</strong>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Stockport"
                />
              </label>

              <div className="settings-simple-geo-card settings-simple-wide">
                <div className="settings-simple-geo-heading">
                  <div>
                    <strong>Map location</strong>
                    <span>
                      Entering a postcode automatically finds these coordinates.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="settings-simple-secondary settings-simple-full-width-button"
                    onClick={lookupPostcodeCoordinates}
                    disabled={isLookingUpLocation || !postcode.trim()}
                  >
                    {isLookingUpLocation ? 'Finding...' : 'Refresh location'}
                  </button>
                </div>

                <div className="settings-simple-geo-values">
                  <label>
                    <strong>Latitude</strong>
                    <input
                      value={latitude}
                      readOnly
                      placeholder="Found automatically"
                    />
                  </label>

                  <label>
                    <strong>Longitude</strong>
                    <input
                      value={longitude}
                      readOnly
                      placeholder="Found automatically"
                    />
                  </label>
                </div>
              </div>

              <label>
                <strong>Phone</strong>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Customer contact number"
                />
              </label>

              <label>
                <strong>Email</strong>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Customer contact email"
                />
              </label>

              <label className="settings-simple-wide">
                <strong>What do you offer?</strong>
                <textarea
                  value={services}
                  onChange={(event) => setServices(event.target.value)}
                  placeholder="Coffee, lunches, haircuts, private events..."
                  rows={3}
                />
              </label>

              <label className="settings-simple-wide">
                <strong>Opening hours</strong>
                <textarea
                  value={openingHours}
                  onChange={(event) => setOpeningHours(event.target.value)}
                  placeholder="Mon-Fri 9am-5pm, Sat 10am-4pm"
                  rows={3}
                />
              </label>
            </div>
          </section>

          <section className="settings-simple-card">
            <div className="settings-simple-card-heading">
              <div>
                <span>Business images</span>
                <h2>Main image and gallery</h2>
              </div>
              <small>Used on Smilez venue cards and business pages</small>
            </div>

            <div className="settings-image-tabs" role="tablist" aria-label="Business images">
              <button
                type="button"
                role="tab"
                aria-selected={activeImageTab === 'main'}
                className={activeImageTab === 'main' ? 'is-active' : ''}
                onClick={() => setActiveImageTab('main')}
              >
                Main image
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeImageTab === 'gallery'}
                className={activeImageTab === 'gallery' ? 'is-active' : ''}
                onClick={() => setActiveImageTab('gallery')}
              >
                Gallery
                {galleryImageUrls.length > 0 ? ` (${galleryImageUrls.length})` : ''}
              </button>
            </div>

            <input
              ref={businessImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleBusinessImageUpload}
              hidden
            />

            <input
              ref={galleryImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleGalleryImagesUpload}
              hidden
            />

            {activeImageTab === 'main' ? (
              brandLogoUrl ? (
                <div className="settings-simple-image-row">
                  <img src={brandLogoUrl} alt="Main business image preview" />
                  <div>
                    <strong>Main image ready</strong>
                    <span>Shown first on Smilez venue cards and the venue page.</span>
                  </div>
                  <div className="settings-image-actions">
                    <button
                      type="button"
                      className="settings-simple-secondary"
                      onClick={() => businessImageInputRef.current?.click()}
                      disabled={uploadingBusinessImage}
                    >
                      {uploadingBusinessImage ? 'Uploading...' : 'Change image'}
                    </button>
                    <button
                      type="button"
                      className="settings-simple-secondary"
                      onClick={removeBusinessImage}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="settings-simple-upload"
                  onClick={() => businessImageInputRef.current?.click()}
                  disabled={uploadingBusinessImage}
                >
                  {uploadingBusinessImage ? 'Uploading image...' : 'Upload main business image'}
                </button>
              )
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                <p className="settings-simple-help" style={{ margin: 0 }}>
                  Add up to 6 additional venue photos. These appear in the Gallery tab
                  on the Smilez business page.
                </p>

                {galleryImageUrls.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {galleryImageUrls.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index}`}
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          minHeight: 120,
                          aspectRatio: '4 / 3',
                          border: '1px solid #dfe7f2',
                          borderRadius: 16,
                          background: '#f8fafc',
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt={`${businessName || 'Business'} gallery image ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            objectFit: 'cover',
                          }}
                        />
                        <button
                          type="button"
                          className="settings-simple-secondary"
                          onClick={() => removeGalleryImage(imageUrl)}
                          disabled={uploadingGalleryImages}
                          aria-label={`Remove gallery image ${index + 1}`}
                          style={{
                            position: 'absolute',
                            right: 8,
                            bottom: 8,
                            minHeight: 34,
                            padding: '0 12px',
                            background: 'rgba(255,255,255,0.94)',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="settings-simple-help">
                    No gallery photos uploaded yet.
                  </div>
                )}

                <button
                  type="button"
                  className="settings-simple-upload"
                  onClick={() => galleryImageInputRef.current?.click()}
                  disabled={uploadingGalleryImages || galleryImageUrls.length >= 6}
                >
                  {uploadingGalleryImages
                    ? 'Uploading photos...'
                    : galleryImageUrls.length >= 6
                      ? 'Gallery full'
                      : galleryImageUrls.length > 0
                        ? 'Add gallery photos'
                        : 'Upload gallery photos'}
                </button>
              </div>
            )}
          </section>

          <section className="settings-simple-card">
            <div className="settings-simple-card-heading">
              <div>
                <span>Smilez</span>
                <h2>Bookings</h2>
              </div>
              <small>{getSmilesListingStatusLabel()}</small>
            </div>

            <p className="settings-simple-help">
              Smilez automatically uses the business details above. Only choose
              whether customers can book.
            </p>

            <label className="settings-simple-toggle">
              <input
                type="checkbox"
                checked={acceptsBookings}
                onChange={(event) => setAcceptsBookings(event.target.checked)}
              />
              <span>
                <strong>Accept bookings</strong>
                <small>Customers will see booking information on your Smilez listing.</small>
              </span>
            </label>

            {acceptsBookings ? (
              <>
                <label className="settings-simple-booking-link">
                  <strong>Booking link <small>Optional</small></strong>
                  <input
                    value={bookingUrl}
                    onChange={(event) => setBookingUrl(event.target.value)}
                    placeholder="https://..."
                  />
                  <span className="settings-field-help">
                    Leave this blank to use Smilez booking requests and set your weekly booking times below.
                  </span>
                </label>

                {!bookingUrl.trim() ? (
                  <section
                    className="settings-smilez-booking-editor settings-smilez-hours-card settings-simple-booking-hours"
                    style={{
                      display: 'grid',
                      gap: 18,
                      marginTop: 18,
                      padding: 22,
                      border: '1px solid #dfe5f1',
                      borderRadius: 20,
                      background: '#f8faff',
                    }}
                  >
                    <div
                      className="settings-smilez-card-head"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <span>Booking request hours</span>
                        <h4>Set your weekly availability</h4>
                      </div>
                      <strong>
                        {bookingSettings.slot_interval_minutes}-minute slots
                      </strong>
                    </div>

                    <div
                      className="settings-smilez-day-cards"
                      role="list"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                        gap: 10,
                        width: '100%',
                      }}
                    >
                      {bookingHours.map((row) => {
                        const selected =
                          row.day_of_week === selectedBookingDay;

                        return (
                          <button
                            type="button"
                            key={row.day_of_week}
                            className={`${selected ? 'is-selected' : ''} ${
                              row.is_closed ? 'is-closed' : ''
                            }`}
                            style={{
                              display: 'grid',
                              gap: 5,
                              minHeight: 86,
                              padding: '13px 10px',
                              border: selected
                                ? '1px solid #f72585'
                                : '1px solid #dfe5f1',
                              borderRadius: 15,
                              background: selected ? '#fff3f8' : '#ffffff',
                              color: '#071b49',
                              textAlign: 'center',
                              opacity: row.is_closed ? 0.65 : 1,
                              cursor: 'pointer',
                            }}
                            onClick={() =>
                              setSelectedBookingDay(row.day_of_week)
                            }
                          >
                            <strong>{shortDayLabels[row.day_of_week]}</strong>
                            <em>{getNextDateForDay(row.day_of_week)}</em>
                            <span>{formatBookingHourDisplay(row)}</span>
                          </button>
                        );
                      })}
                    </div>

                    {(() => {
                      const selected =
                        bookingHours.find(
                          (row) => row.day_of_week === selectedBookingDay,
                        ) || bookingHours[0];

                      if (!selected) return null;

                      return (
                        <div
                          className="settings-smilez-selected-day"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(170px, 0.8fr) minmax(180px, auto) minmax(420px, 1.6fr)',
                            alignItems: 'center',
                            gap: 16,
                            padding: 18,
                            border: '1px solid #dfe5f1',
                            borderRadius: 18,
                            background: '#ffffff',
                          }}
                        >
                          <div>
                            <span>Editing</span>
                            <h5>{dayLabels[selected.day_of_week]}</h5>
                          </div>

                          <label className="settings-smilez-closed-toggle">
                            <input
                              type="checkbox"
                              checked={selected.is_closed}
                              onChange={(event) =>
                                updateBookingHour(
                                  selected.day_of_week,
                                  'is_closed',
                                  event.target.checked,
                                )
                              }
                            />
                            Closed this day
                          </label>

                          {!selected.is_closed ? (
                            <div
                              className="settings-smilez-selected-times"
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))',
                                gap: 16,
                                alignItems: 'end',
                              }}
                            >
                              <label>
                                <span>Opens</span>
                                <input
                                  className="settings-simple-input"
                                  style={{
                                    width: '100%',
                                    minHeight: 46,
                                    padding: '10px 12px',
                                    border: '1px solid #dfe5f1',
                                    borderRadius: 12,
                                    background: '#ffffff',
                                    color: '#071b49',
                                  }}
                                  type="time"
                                  value={selected.opens_at || ''}
                                  onChange={(event) =>
                                    updateBookingHour(
                                      selected.day_of_week,
                                      'opens_at',
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>

                              <label>
                                <span>Closes</span>
                                <input
                                  className="settings-simple-input"
                                  style={{
                                    width: '100%',
                                    minHeight: 46,
                                    padding: '10px 12px',
                                    border: '1px solid #dfe5f1',
                                    borderRadius: 12,
                                    background: '#ffffff',
                                    color: '#071b49',
                                  }}
                                  type="time"
                                  value={selected.closes_at || ''}
                                  onChange={(event) =>
                                    updateBookingHour(
                                      selected.day_of_week,
                                      'closes_at',
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                            </div>
                          ) : (
                            <p className="settings-field-help">
                              This day will not show any customer booking request slots.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </section>
                ) : null}
              </>
            ) : null}
          </section>

          <section className="settings-simple-card settings-simple-connect-card">
            <div>
              <span>Social accounts</span>
              <h2>Facebook and Instagram</h2>
              <p>Connect once to publish directly from FromOne.</p>
            </div>

            {hasMetaConnection ? (
              <button
                type="button"
                className="settings-simple-secondary settings-simple-full-width-button"
                onClick={() => disconnectMetaAccount(primaryMetaConnection?.id)}
                disabled={metaConnectionBusy}
              >
                {metaConnectionBusy ? 'Working...' : 'Disconnect accounts'}
              </button>
            ) : (
              <button
                type="button"
                className="settings-simple-primary"
                onClick={connectMetaAccount}
              >
                Connect accounts
              </button>
            )}
          </section>

          <div className="settings-simple-save-bar">
            <div>
              <strong>One profile, used everywhere</strong>
              <span>Postcode lookup, map coordinates and Smilez syncing happen automatically.</span>
            </div>
            <button
              type="button"
              className="settings-simple-primary"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </section>

        {confirmDialog &&
          (() => {
            const activeConfirmDialog = confirmDialog!;

            return (
              <div
                className="settings-confirm-backdrop"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-confirm-title"
              >
                <section className="settings-confirm-card">
                  <div className="settings-create-eyebrow">Please confirm</div>
                  <h2 id="settings-confirm-title">{activeConfirmDialog.title}</h2>
                  <p>{activeConfirmDialog.message}</p>

                  <div className="settings-action-row">
                    <button
                      type="button"
                      className="settings-secondary-action"
                      onClick={closeConfirmDialog}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="settings-primary-action"
                      onClick={() =>
                        activeConfirmDialog.type === 'disconnectMeta' &&
                        confirmDisconnectMetaAccount(activeConfirmDialog.connectionId)
                      }
                      disabled={metaConnectionBusy}
                    >
                      {metaConnectionBusy
                        ? 'Working...'
                        : activeConfirmDialog.confirmLabel}
                    </button>
                  </div>
                </section>
              </div>
            );
          })()}

        <style jsx global>{`
          body:has(.settings-simple-business-page),
          body:has(.settings-simple-business-page) .app-shell,
          body:has(.settings-simple-business-page) .main-content,
          body:has(.settings-simple-business-page) .main-content.fromone-mobile-bottom-safe,
          body:has(.settings-simple-business-page) .fromone-universal-mobile-page-frame,
          .settings-simple-business-page {
            background: #ffffff !important;
            background-image: none !important;
          }

          body:has(.settings-simple-business-page) .main-content {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 38px clamp(20px, 4vw, 54px) 110px !important;
          }

          .settings-simple-business-shell {
            width: 100%;
            max-width: 940px;
            margin: 0 auto;
            display: grid;
            gap: 24px;
            color: #071b49;
          }

          .settings-simple-business-header h1 {
            margin: 8px 0 10px;
            color: #071b49;
            font-size: clamp(2.5rem, 5vw, 4.1rem);
            line-height: 0.96;
            letter-spacing: -0.06em;
          }

          .settings-simple-business-header p {
            max-width: 680px;
            margin: 0;
            color: #52617a;
            line-height: 1.55;
          }

          .settings-simple-card {
            padding: 19px;
            border: 1px solid #dfe7f2;
            border-radius: 20px;
            background: #ffffff;
            box-shadow: 0 10px 28px rgba(7, 27, 73, 0.05);
          }

          .settings-simple-card-heading {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 18px;
            margin-bottom: 15px;
          }

          .settings-simple-card-heading span,
          .settings-simple-connect-card > div > span {
            display: block;
            color: #f72585;
            font-size: 0.68rem;
            font-weight: 900;
            letter-spacing: 0.11em;
            text-transform: uppercase;
          }

          .settings-simple-card-heading h2,
          .settings-simple-connect-card h2 {
            margin: 5px 0 0;
            color: #071b49;
            font-size: 1.35rem;
            line-height: 1.05;
          }

          .settings-simple-card-heading small {
            max-width: 310px;
            color: #68758c;
            font-weight: 800;
            text-align: right;
          }

          .settings-simple-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .settings-simple-grid label,
          .settings-simple-booking-link {
            display: grid;
            gap: 6px;
            color: #071b49;
            font-size: 0.86rem;
          }

          .settings-simple-grid input,
          .settings-simple-grid textarea,
          .settings-simple-booking-link input {
            width: 100%;
            min-height: 44px;
            padding: 10px 12px;
            border: 1px solid #dfe7f2;
            border-radius: 12px;
            background: #ffffff;
            color: #071b49;
            font: inherit;
            box-sizing: border-box;
            resize: vertical;
          }

          .settings-simple-grid label small {
            color: #68758c;
            font-size: 0.76rem;
            font-weight: 700;
          }

          .settings-simple-wide {
            grid-column: 1 / -1;
          }

          .settings-simple-scan-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: end;
            gap: 12px;
          }

          .settings-simple-scan-row label {
            display: grid;
            gap: 6px;
            color: #071b49;
            font-size: 0.86rem;
          }

          .settings-simple-scan-row input {
            width: 100%;
            height: 46px;
            min-height: 46px;
            padding: 10px 12px;
            border: 1px solid #dfe7f2;
            border-radius: 12px;
            background: #ffffff;
            color: #071b49;
            font: inherit;
            box-sizing: border-box;
          }

          .settings-simple-scan-row > button {
            align-self: end;
            height: 46px;
            min-height: 46px;
            border-radius: 12px;
            box-sizing: border-box;
            position: relative;
            top: -8px;
          }

          .settings-simple-scan-message {
            margin: 12px 0 0;
            color: #52617a;
            font-size: 0.86rem;
            font-weight: 700;
          }

          .settings-simple-geo-card {
            padding: 14px;
            border: 1px solid #dfe7f2;
            border-radius: 15px;
            background: #f8fafc;
          }

          .settings-simple-geo-heading {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 12px;
          }

          .settings-simple-geo-heading > div {
            display: grid;
            gap: 4px;
          }

          .settings-simple-geo-heading span {
            color: #68758c;
            font-size: 0.78rem;
          }

          .settings-simple-geo-values {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .settings-simple-geo-values input[readonly] {
            background: #ffffff;
            color: #52617a;
          }

          .settings-image-tabs {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-bottom: 14px;
            padding: 5px;
            border: 1px solid #dfe7f2;
            border-radius: 14px;
            background: #f8fafc;
          }

          .settings-image-tabs button {
            min-height: 42px;
            border: 1px solid transparent;
            border-radius: 10px;
            background: transparent;
            color: #68758c;
            font: inherit;
            font-weight: 900;
            cursor: pointer;
          }

          .settings-image-tabs button.is-active {
            border-color: #ffd2e5;
            background: #ffffff;
            color: #c71363;
          }

          .settings-simple-image-row {
            display: grid;
            grid-template-columns: 72px minmax(0, 1fr) auto;
            align-items: center;
            gap: 14px;
          }

          .settings-image-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 8px;
          }

          .settings-simple-image-row img {
            width: 72px;
            height: 72px;
            border-radius: 16px;
            object-fit: cover;
            border: 1px solid #dfe7f2;
          }

          .settings-simple-image-row div {
            display: grid;
            gap: 4px;
          }

          .settings-simple-image-row span,
          .settings-simple-help,
          .settings-simple-connect-card p,
          .settings-simple-save-bar span {
            color: #68758c;
            line-height: 1.45;
          }

          .settings-simple-upload {
            width: 100%;
            min-height: 92px;
            border: 1px dashed #cbd5e1;
            border-radius: 16px;
            background: #f8fafc;
            color: #071b49;
            font: inherit;
            font-weight: 900;
            cursor: pointer;
          }

          .settings-simple-help {
            margin: -2px 0 14px;
          }

          .settings-simple-toggle {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px;
            border: 1px solid #e4eaf3;
            border-radius: 14px;
            background: #f8fafc;
          }

          .settings-simple-toggle input {
            width: 21px;
            height: 21px;
          }

          .settings-simple-toggle span {
            display: grid;
            gap: 3px;
          }

          .settings-simple-toggle small {
            color: #68758c;
          }

          .settings-simple-booking-link {
            margin-top: 13px;
          }

          .settings-simple-connect-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 22px;
            padding-top: 22px;
            padding-bottom: 22px;
          }

          .settings-simple-connect-card p {
            margin: 8px 0 0;
          }

          .settings-simple-primary,
          .settings-simple-secondary {
            min-height: 46px;
            padding: 0 17px;
            border-radius: 14px;
            font: inherit;
            font-size: 0.86rem;
            font-weight: 900;
            cursor: pointer;
          }

          .settings-simple-primary {
            border: 0;
            background: #f72585;
            color: #ffffff;
            box-shadow: 0 10px 24px rgba(247, 37, 133, 0.18);
          }

          .settings-simple-secondary {
            border: 1px solid #dfe7f2;
            background: #ffffff;
            color: #071b49;
          }

          .settings-simple-full-width-button {
            width: auto;
          }

          .settings-simple-save-bar {
            position: sticky;
            bottom: 18px;
            margin-top: 4px;
            z-index: 5;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 18px;
            padding: 14px 16px;
            border: 1px solid #dfe7f2;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 14px 38px rgba(7, 27, 73, 0.12);
            backdrop-filter: blur(12px);
          }

          .settings-simple-save-bar > div {
            display: grid;
            gap: 3px;
          }

          @media (max-width: 720px) {
            body:has(.settings-simple-business-page) .main-content {
              padding: 24px 14px 110px !important;
            }

            .settings-simple-grid,
            .settings-simple-scan-row,
            .settings-simple-geo-values {
              grid-template-columns: 1fr;
            }

            .settings-simple-scan-row button,
            .settings-simple-geo-heading button {
              width: 100%;
            }

            .settings-simple-scan-row > button {
              position: static;
              top: auto;
            }

            .settings-simple-geo-heading {
              display: grid;
              align-items: start;
            }

            .settings-simple-card-heading,
            .settings-simple-connect-card,
            .settings-simple-save-bar {
              display: grid;
              align-items: start;
            }

            .settings-simple-card-heading small {
              text-align: left;
            }

            .settings-simple-image-row {
              grid-template-columns: 64px minmax(0, 1fr);
            }

            .settings-simple-image-row img {
              width: 64px;
              height: 64px;
            }

            .settings-image-actions {
              grid-column: 1 / -1;
              display: grid;
              grid-template-columns: 1fr;
            }

            .settings-simple-image-row button {
              width: 100%;
            }

            .settings-simple-connect-card button,
            .settings-simple-save-bar button,
            .settings-simple-full-width-button {
              width: 100%;
            }

            .settings-simple-business-shell {
              gap: 18px;
            }

            .settings-simple-save-bar {
              bottom: 12px;
              margin-top: 2px;
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="fromone-posts-page fromone-settings-page settings-create-style-page" data-settings-page="create-style-v1">
      <BackToDashboardButton />
      <section id="fromone-standard-shell" className="settings-create-style-card">
        <header className="posts-create-hero settings-create-hero">
          <span className="posts-create-eyebrow settings-create-eyebrow">Settings</span>
          <h1>Everything is in one place.</h1>
          <p>
            Choose what you need to update. The detailed options stay hidden until you open them.
          </p>
        </header>

        <section className="settings-client-status" aria-label="Business setup status">
          <div className="settings-client-status-copy">
            <span className="settings-create-eyebrow">Your setup</span>
            <h2>{businessName ? `${businessName} is ready` : 'Complete your business setup'}</h2>
            <p>Most clients only need the first button. Everything else can stay closed.</p>
          </div>

          <div className="settings-client-status-grid">
            <div>
              <span>Business profile</span>
              <strong>{businessProfileReady ? 'Ready' : 'Needs details'}</strong>
            </div>
            <div>
              <span>Facebook</span>
              <strong>{hasFacebookConnection ? 'Connected' : 'Not connected'}</strong>
            </div>
            <div>
              <span>Instagram</span>
              <strong>{hasInstagramConnection ? 'Connected' : 'Not connected'}</strong>
            </div>
            <div>
              <span>Smilez listing</span>
              <strong>{hasLinkedSmilesListing ? 'Live' : 'Not live yet'}</strong>
            </div>
            <div>
              <span>Bookings</span>
              <strong>{acceptsBookings ? 'On' : 'Off'}</strong>
            </div>
          </div>
        </section>

        <section className="settings-task-chooser" aria-label="Choose what to change">
          <div className="settings-task-chooser-heading">
            <span>Choose one</span>
            <h2>What would you like to do?</h2>
            <p>Only the section you choose will open.</p>
          </div>

          <div className="settings-task-grid settings-client-task-grid">
            <button
              type="button"
              className={openExtraSection === "smiles" && showBusinessDetails ? "settings-task-card is-active" : "settings-task-card"}
              onClick={() => {
                setOpenExtraSection("smiles");
                setShowBusinessDetails(true);
                setShowSocialSettings(false);
                setShowAccountSettings(false);
              }}
            >
              <span>01</span>
              <strong>Business details and Smilez page</strong>
              <small>Name, address, contact details, photos and visitor information</small>
            </button>

            <button
              type="button"
              className={openExtraSection === "bookings" && showBusinessDetails ? "settings-task-card is-active" : "settings-task-card"}
              onClick={() => {
                setOpenExtraSection("bookings");
                setShowBusinessDetails(true);
                setShowSocialSettings(false);
                setShowAccountSettings(false);
              }}
            >
              <span>02</span>
              <strong>Manage bookings</strong>
              <small>Booking link, hours and availability</small>
            </button>

            <button
              type="button"
              className={showSocialSettings ? "settings-task-card is-active" : "settings-task-card"}
              onClick={() => {
                setShowBusinessDetails(false);
                setShowSocialSettings(true);
                setShowAccountSettings(false);
              }}
            >
              <span>03</span>
              <strong>Connect social accounts</strong>
              <small>Facebook and Instagram connection</small>
            </button>

            <button
              type="button"
              className={showAccountSettings ? "settings-task-card is-active" : "settings-task-card"}
              onClick={() => {
                setShowBusinessDetails(false);
                setShowSocialSettings(false);
                setShowAccountSettings(true);
              }}
            >
              <span>04</span>
              <strong>Account and saved posts</strong>
              <small>Saved post sets and account controls</small>
            </button>
          </div>
        </section>

        <section
          data-settings-mode={openExtraSection || "business"}
          className={showBusinessDetails ? "settings-simple-panel settings-editor-panel is-open" : "settings-simple-panel settings-editor-panel is-collapsed"}
          style={{ display: showBusinessDetails ? undefined : 'none' }}
        >
          <div className="settings-panel-head">
            <span className="settings-step-badge">01</span>
            <div>
              <h2>
                {openExtraSection === "bookings"
                  ? "Manage bookings"
                  : "Business details and Smilez page"}
              </h2>
              <p>
                {openExtraSection === "bookings"
                  ? "Set the booking link, opening hours and availability. Advanced controls are lower down."
                  : "Update the business name, description, contact details, location, photos and visitor information."}
              </p>
            </div>

            <button
              type="button"
              className="settings-panel-toggle"
              onClick={() => setShowBusinessDetails(false)}
              aria-expanded={showBusinessDetails}
            >
              Close
            </button>
          </div>

          {!showBusinessDetails ? (
            <div className="settings-profile-summary">
              <div>
                <span>Business</span>
                <strong>{businessName || "Not added yet"}</strong>
              </div>
              <div>
                <span>Type</span>
                <strong>{industry || "Not added yet"}</strong>
              </div>
              <div>
                <span>Location</span>
                <strong>{location || postcode || "Not added yet"}</strong>
              </div>
              <div>
                <span>Contact</span>
                <strong>{email || phone || "Not added yet"}</strong>
              </div>
            </div>
          ) : (
            <>
          <div className="settings-website-scan-card">
            <div>
              <span className="settings-create-eyebrow">Auto setup</span>
              <h3>Scan website</h3>
              <p>
                Paste a website and FromOne will fill what it can.
              </p>
            </div>

            <div className="settings-website-scan-row">
              <input
                className="settings-simple-input"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://example.com"
              />

              <button
                type="button"
                className="settings-secondary-action"
                onClick={handleScanWebsite}
                disabled={scanningWebsite || saving}
              >
                {scanningWebsite ? 'Scanning...' : 'Scan website'}
              </button>
            </div>

            {scanMessage && <p className="settings-scan-message">{scanMessage}</p>}
          </div>

          <div className="settings-profile-section-heading">
            <span>1</span>
            <div>
              <h3>Basic information</h3>
              <p>Business name, type, description, contact details and location.</p>
            </div>
          </div>

          <div className="settings-form-grid">
            <label>
              <strong>Business name</strong>
              <input
                className="settings-simple-input"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Example: Stockport Flowers"
              />
            </label>

            <label>
              <strong>Business type</strong>
              <input
                className="settings-simple-input"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                placeholder="Example: Florist, cafe, gym"
              />
            </label>

            <label>
              <strong>Location</strong>
              <input
                className="settings-simple-input"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Example: Stockport"
              />
            </label>

            <label>
              <strong>Address</strong>
              <input
                className="settings-simple-input"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Business address"
              />
            </label>

            <label>
              <strong>Postcode</strong>
              <input
                className="settings-simple-input"
                value={postcode}
                onChange={(event) => handlePostcodeChange(event.target.value)}
                onBlur={handlePostcodeBlur}
                placeholder="Example: SK1 1AA"
              />
            </label>

            <label>
              <strong>Phone</strong>
              <input
                className="settings-simple-input"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
              />
            </label>

            <label>
              <strong>Email</strong>
              <input
                className="settings-simple-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="hello@example.com"
              />
            </label>

            <label>
              <strong>Website</strong>
              <input
                className="settings-simple-input"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </label>

            <label className="settings-wide-field">
              <strong>About your business</strong>
              <span className="settings-field-help">
                Write a short introduction for customers. This appears in the About section of your Smilez venue page.
              </span>
              <textarea
                className="settings-simple-input"
                value={brandSummary}
                onChange={(event) => setBrandSummary(event.target.value)}
                placeholder="Example: Ember & Thyme is a relaxed modern British restaurant serving seasonal dishes in the heart of Stockport."
                rows={4}
                maxLength={800}
              />
            </label>

            <label className="settings-wide-field">
              <strong>Opening hours note</strong>
              <textarea
                className="settings-simple-input"
                value={openingHours}
                onChange={(event) => setOpeningHours(event.target.value)}
                placeholder="Example: Kitchen closes 30 minutes earlier. Bank holiday hours may vary."
                rows={3}
              />
              <span className="settings-field-help">
                Optional customer-facing note shown underneath the weekly opening hours on Smilez.
              </span>
            </label>

            {openExtraSection === "bookings" ? (
              <section className="settings-smilez-booking-editor settings-wide-field">
              <div className="settings-smilez-booking-header">
                <div>
                  <span className="settings-create-eyebrow">Bookings</span>
                  <h3>Booking options</h3>
                  <p>
                    Mirrored from the Smilez business portal so both systems
                    use the same controls and booking rules.
                  </p>
                </div>

                <span className="settings-smilez-booking-status">
                  {acceptsBookings
                    ? bookingUrl.trim()
                      ? 'External booking link'
                      : 'Booking requests enabled'
                    : 'Not enabled'}
                </span>
              </div>

              <div className="settings-smilez-booking-options">
                <label>
                  <strong>Accept booking requests?</strong>
                  <select
                    className="settings-simple-input"
                    value={acceptsBookings ? 'yes' : 'no'}
                    onChange={(event) =>
                      setAcceptsBookings(event.target.value === 'yes')
                    }
                  >
                    <option value="no">No, do not show booking options</option>
                    <option value="yes">Yes, show booking options</option>
                  </select>
                </label>

                {acceptsBookings ? (
                  <label>
                    <strong>External booking URL optional</strong>
                    <input
                      className="settings-simple-input"
                      type="url"
                      value={bookingUrl}
                      onChange={(event) => setBookingUrl(event.target.value)}
                      placeholder="https://your-booking-page.com"
                    />
                  </label>
                ) : null}
              </div>

              {acceptsBookings && !bookingUrl.trim() ? (
                <>
                  <section className="settings-smilez-capacity-card">
                    <div className="settings-smilez-card-head">
                      <div>
                        <span>Booking capacity</span>
                        <h4>Control slots, notice and covers</h4>
                      </div>
                      <strong>Prevent overbooking</strong>
                    </div>

                    <div className="settings-smilez-capacity-grid">
                      <label>
                        <span>Slot length</span>
                        <select
                          className="settings-simple-input"
                          value={bookingSettings.slot_interval_minutes}
                          onChange={(event) =>
                            updateBookingSetting(
                              'slot_interval_minutes',
                              Number(event.target.value),
                            )
                          }
                        >
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={45}>45 minutes</option>
                          <option value={60}>60 minutes</option>
                        </select>
                      </label>

                      <label>
                        <span>Maximum covers per slot</span>
                        <input
                          className="settings-simple-input"
                          type="number"
                          min={1}
                          max={200}
                          value={bookingSettings.max_covers_per_slot}
                          onChange={(event) =>
                            updateBookingSetting(
                              'max_covers_per_slot',
                              Number(event.target.value),
                            )
                          }
                        />
                      </label>

                      <label>
                        <span>Maximum party size</span>
                        <input
                          className="settings-simple-input"
                          type="number"
                          min={1}
                          max={30}
                          value={bookingSettings.max_party_size}
                          onChange={(event) =>
                            updateBookingSetting(
                              'max_party_size',
                              Number(event.target.value),
                            )
                          }
                        />
                      </label>

                      <label>
                        <span>Minimum notice</span>
                        <select
                          className="settings-simple-input"
                          value={bookingSettings.minimum_notice_minutes}
                          onChange={(event) =>
                            updateBookingSetting(
                              'minimum_notice_minutes',
                              Number(event.target.value),
                            )
                          }
                        >
                          <option value={0}>No minimum</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={120}>2 hours</option>
                          <option value={240}>4 hours</option>
                          <option value={720}>12 hours</option>
                          <option value={1440}>24 hours</option>
                          <option value={2880}>48 hours</option>
                        </select>
                      </label>

                      <label>
                        <span>Booking window</span>
                        <select
                          className="settings-simple-input"
                          value={bookingSettings.advance_booking_days}
                          onChange={(event) =>
                            updateBookingSetting(
                              'advance_booking_days',
                              Number(event.target.value),
                            )
                          }
                        >
                          <option value={7}>7 days ahead</option>
                          <option value={14}>14 days ahead</option>
                          <option value={30}>30 days ahead</option>
                          <option value={60}>60 days ahead</option>
                          <option value={90}>90 days ahead</option>
                        </select>
                      </label>
                    </div>

                    <p className="settings-field-help">
                      Covers are counted across active requests and confirmed
                      bookings in the same time slot.
                    </p>
                  </section>

                  <section className="settings-smilez-hours-card">
                    <div className="settings-smilez-card-head">
                      <div>
                        <span>Booking request hours</span>
                        <h4>Set your weekly availability</h4>
                      </div>
                      <strong>
                        {bookingSettings.slot_interval_minutes}-minute slots
                      </strong>
                    </div>

                    <div className="settings-smilez-day-cards" role="list">
                      {bookingHours.map((row) => {
                        const selected =
                          row.day_of_week === selectedBookingDay;

                        return (
                          <button
                            type="button"
                            key={row.day_of_week}
                            className={`${selected ? 'is-selected' : ''} ${
                              row.is_closed ? 'is-closed' : ''
                            }`}
                            onClick={() =>
                              setSelectedBookingDay(row.day_of_week)
                            }
                          >
                            <strong>{shortDayLabels[row.day_of_week]}</strong>
                            <em>{getNextDateForDay(row.day_of_week)}</em>
                            <span>{formatBookingHourDisplay(row)}</span>
                          </button>
                        );
                      })}
                    </div>

                    {(() => {
                      const selected =
                        bookingHours.find(
                          (row) => row.day_of_week === selectedBookingDay,
                        ) || bookingHours[0];

                      if (!selected) return null;

                      return (
                        <div className="settings-smilez-selected-day">
                          <div>
                            <span>Editing</span>
                            <h5>{dayLabels[selected.day_of_week]}</h5>
                          </div>

                          <label className="settings-smilez-closed-toggle">
                            <input
                              type="checkbox"
                              checked={selected.is_closed}
                              onChange={(event) =>
                                updateBookingHour(
                                  selected.day_of_week,
                                  'is_closed',
                                  event.target.checked,
                                )
                              }
                            />
                            Closed this day
                          </label>

                          {!selected.is_closed ? (
                            <div className="settings-smilez-selected-times">
                              <label>
                                <span>Opens</span>
                                <input
                                  className="settings-simple-input"
                                  type="time"
                                  value={selected.opens_at || ''}
                                  onChange={(event) =>
                                    updateBookingHour(
                                      selected.day_of_week,
                                      'opens_at',
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>

                              <label>
                                <span>Closes</span>
                                <input
                                  className="settings-simple-input"
                                  type="time"
                                  value={selected.closes_at || ''}
                                  onChange={(event) =>
                                    updateBookingHour(
                                      selected.day_of_week,
                                      'closes_at',
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                            </div>
                          ) : (
                            <p className="settings-field-help">
                              This day will not show any customer booking
                              request slots.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </section>

                  <section className="settings-smilez-blocks-card">
                    <div className="settings-smilez-card-head">
                      <div>
                        <span>Blocked dates &amp; times</span>
                        <h4>Unavailable slots</h4>
                      </div>
                      <strong>Optional</strong>
                    </div>

                    <div className="settings-smilez-quick-dates">
                      <button
                        type="button"
                        onClick={() =>
                          updateNewBookingBlock(
                            'blockDate',
                            getTodayDateValue(),
                          )
                        }
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateNewBookingBlock(
                            'blockDate',
                            getTomorrowDateValue(),
                          )
                        }
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateNewBookingBlock(
                            'blockDate',
                            getNextSaturdayDateValue(),
                          )
                        }
                      >
                        Saturday
                      </button>
                    </div>

                    <div className="settings-smilez-block-form">
                      <label>
                        <span>Date</span>
                        <input
                          className="settings-simple-input"
                          type="date"
                          value={newBookingBlock.blockDate}
                          onChange={(event) =>
                            updateNewBookingBlock(
                              'blockDate',
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label>
                        <span>Full day?</span>
                        <select
                          className="settings-simple-input"
                          value={
                            newBookingBlock.isFullDay ? 'yes' : 'no'
                          }
                          onChange={(event) =>
                            updateNewBookingBlock(
                              'isFullDay',
                              event.target.value === 'yes',
                            )
                          }
                        >
                          <option value="no">No, block times</option>
                          <option value="yes">Yes, full day</option>
                        </select>
                      </label>

                      {!newBookingBlock.isFullDay ? (
                        <>
                          <label>
                            <span>Start</span>
                            <input
                              className="settings-simple-input"
                              type="time"
                              value={newBookingBlock.startTime}
                              onChange={(event) =>
                                updateNewBookingBlock(
                                  'startTime',
                                  event.target.value,
                                )
                              }
                            />
                          </label>

                          <label>
                            <span>End</span>
                            <input
                              className="settings-simple-input"
                              type="time"
                              value={newBookingBlock.endTime}
                              onChange={(event) =>
                                updateNewBookingBlock(
                                  'endTime',
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                        </>
                      ) : null}

                      <label className="is-wide">
                        <span>Reason optional</span>
                        <input
                          className="settings-simple-input"
                          value={newBookingBlock.reason}
                          onChange={(event) =>
                            updateNewBookingBlock(
                              'reason',
                              event.target.value,
                            )
                          }
                          placeholder="Example: Private party"
                        />
                      </label>

                      <button type="button" onClick={addBookingBlock}>
                        Add block
                      </button>
                    </div>

                    {bookingBlocks.length > 0 ? (
                      <div className="settings-smilez-block-list">
                        {bookingBlocks.map((block) => (
                          <article key={block.id}>
                            <div>
                              <strong>
                                {formatBookingBlockDate(block.block_date)}
                              </strong>
                              <span>
                                {formatBookingBlockDisplay(block)}
                              </span>
                              {block.reason ? <em>{block.reason}</em> : null}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeBookingBlock(block.id)}
                              aria-label="Remove booking block"
                            >
                              Remove
                            </button>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="settings-field-help">
                        No blocked dates or times added yet.
                      </p>
                    )}
                  </section>
                </>
              ) : null}

              <p className="settings-field-help">
                Adding a booking URL sends visitors there. Without a URL,
                Smilez uses the capacity, weekly hours and blocked slots above.
              </p>
            </section>
            ) : null}

            {openExtraSection === "smiles" ? (
              <>
            <div className="settings-profile-section-heading settings-wide-field">
              <span>2</span>
              <div>
                <h3>Photos and visitor details</h3>
                <p>Profile image, gallery, parking, accessibility, audience and tone.</p>
              </div>
            </div>

            <div className="settings-business-image-field settings-wide-field">
              <div className="settings-business-image-copy">
                <strong>Profile image</strong>
                <span>
                  This appears on Smiles as the venue image after you save the
                  Business Profile.
                </span>
              </div>

              <div className="settings-business-image-card">
                {brandLogoUrl.trim() ? (
                  <img src={brandLogoUrl.trim()} alt={`${businessName || 'Business'} profile`} />
                ) : (
                  <div className="settings-business-image-empty">
                    <span>No image yet</span>
                    <small>Upload a clear venue, logo or brand image.</small>
                  </div>
                )}
              </div>

              <div className="settings-business-image-actions">
                <button
                  type="button"
                  className="settings-image-utility-button"
                  style={{
                    width: 140,
                    minWidth: 140,
                    maxWidth: 140,
                    height: 38,
                    minHeight: 38,
                    padding: '0 14px',
                    borderRadius: 12,
                    boxSizing: 'border-box',
                    display: 'inline-flex',
                    position: 'relative',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    lineHeight: 1,
                    boxShadow: 'none',
                    border: '1px solid #f72585',
                    background: '#f72585',
                    color: '#ffffff',
                  }}
                  onClick={() => businessImageInputRef.current?.click()}
                  disabled={uploadingBusinessImage || saving}
                >
                  {uploadingBusinessImage ? 'Uploading...' : brandLogoUrl.trim() ? 'Change image' : 'Upload image'}
                </button>
                <input
                  ref={businessImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleBusinessImageUpload}
                  disabled={uploadingBusinessImage || saving}
                  style={{ display: 'none' }}
                />

                {brandLogoUrl.trim() ? (
                  <button
                    type="button"
                    className="settings-image-utility-button"
                    style={{
                      width: 140,
                      minWidth: 140,
                      maxWidth: 140,
                      height: 38,
                      minHeight: 38,
                      padding: '0 14px',
                      borderRadius: 12,
                      boxSizing: 'border-box',
                      display: 'inline-flex',
                      position: 'relative',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      lineHeight: 1,
                      boxShadow: 'none',
                      border: '1px solid #ffd0e4',
                      background: '#fff7fb',
                      color: '#f72585',
                    }}
                    onClick={removeBusinessImage}
                    disabled={uploadingBusinessImage || saving}
                  >
                    Remove image
                  </button>
                ) : null}
              </div>
            </div>

            <div className="settings-wide-field">
              <strong>Venue gallery</strong>
              <p className="settings-field-help" style={{ marginTop: 6 }}>
                Add up to 6 clear photos. These appear on the Stockport Smilez business page.
              </p>

              {galleryImageUrls.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: 12,
                    marginTop: 14,
                  }}
                >
                  {galleryImageUrls.map((imageUrl, index) => (
                    <div
                      key={`${imageUrl}-${index}`}
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: 16,
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        background: '#f8fafc',
                        aspectRatio: '4 / 3',
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={`${businessName || 'Business'} gallery ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(imageUrl)}
                        disabled={uploadingGalleryImages || saving}
                        aria-label={`Remove gallery image ${index + 1}`}
                        title="Remove image"
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          border: 0,
                          background: 'transparent',
                          color: '#ffffff',
                          fontSize: 12,
                          lineHeight: 1,
                          fontWeight: 900,
                          textShadow: '0 2px 8px rgba(0,0,0,0.85)',
                          cursor:
                            uploadingGalleryImages || saving
                              ? 'not-allowed'
                              : 'pointer',
                          opacity:
                            uploadingGalleryImages || saving
                              ? 0.55
                              : 1,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="settings-business-image-empty"
                  style={{
                    marginTop: 14,
                    minHeight: 170,
                    height: 'auto',
                    border: '1px dashed #d7e0ee',
                    borderRadius: 18,
                    background: '#ffffff',
                  }}
                >
                  <span>No gallery images yet</span>
                  <small>Add venue, food, product, team or interior photos.</small>

                  <button
                    type="button"
                    className="settings-image-utility-button"
                    onClick={() => galleryImageInputRef.current?.click()}
                    disabled={uploadingGalleryImages || saving}
                    style={{
                      width: 'fit-content',
                      minWidth: 180,
                      minHeight: 44,
                      margin: '12px auto 0',
                      padding: '0 18px',
                      borderRadius: 12,
                      border: '1px solid #f72585',
                      background: '#f72585',
                      color: '#fff',
                      fontWeight: 900,
                      cursor: uploadingGalleryImages || saving ? 'not-allowed' : 'pointer',
                      opacity: uploadingGalleryImages || saving ? 0.65 : 1,
                    }}
                  >
                    {uploadingGalleryImages ? 'Uploading...' : 'Add gallery images'}
                  </button>

                  <small>{galleryImageUrls.length}/6 images</small>
                </div>
              )}

              {galleryImageUrls.length > 0 ? (
                <div className="settings-business-image-actions" style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="settings-image-utility-button"
                    onClick={() => galleryImageInputRef.current?.click()}
                    disabled={
                      uploadingGalleryImages ||
                      saving ||
                      galleryImageUrls.length >= 6
                    }
                    style={{
                      minHeight: 42,
                      padding: '0 16px',
                      borderRadius: 12,
                      border: '1px solid #f72585',
                      background: '#f72585',
                      color: '#fff',
                      fontWeight: 900,
                    }}
                  >
                    {uploadingGalleryImages
                      ? 'Uploading...'
                      : galleryImageUrls.length >= 6
                        ? 'Gallery full'
                        : 'Add more images'}
                  </button>
                  <span className="settings-field-help">
                    {galleryImageUrls.length}/6 images
                  </span>
                </div>
              ) : null}

              <input
                ref={galleryImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleGalleryImagesUpload}
                disabled={uploadingGalleryImages || saving}
                style={{ display: 'none' }}
              />
            </div>

            <label className="settings-wide-field">
              <strong>Parking information</strong>
              <textarea
                className="settings-simple-input"
                value={parkingInfo}
                onChange={(event) => setParkingInfo(event.target.value)}
                rows={3}
                placeholder="Example: Free customer parking behind the venue. Two accessible bays near the entrance."
              />
              <span className="settings-field-help">
                Include nearby car parks, on-street parking, charges and accessible bays.
              </span>
            </label>

            <label className="settings-wide-field">
              <strong>Accessibility information</strong>
              <textarea
                className="settings-simple-input"
                value={accessibilityInfo}
                onChange={(event) => setAccessibilityInfo(event.target.value)}
                rows={3}
                placeholder="Example: Step-free entrance, accessible toilet and space for wheelchairs."
              />
              <span className="settings-field-help">
                Add only accurate details confirmed by the business.
              </span>
            </label>

            <label className="settings-wide-field">
              <strong>What do they offer?</strong>
              <textarea
                className="settings-simple-input"
                value={services}
                onChange={(event) => setServices(event.target.value)}
                placeholder="Example: Fresh flowers, same-day bouquets, wedding flowers, funeral flowers"
                rows={3}
              />
            </label>

            <label className="settings-wide-field">
              <strong>Who are the customers?</strong>
              <textarea
                className="settings-simple-input"
                value={targetAudience}
                onChange={(event) => setTargetAudience(event.target.value)}
                placeholder="Example: Local families, office workers, event organisers"
                rows={3}
              />
            </label>

            <label className="settings-wide-field">
              <strong>Tone of voice</strong>
              <select
                className="settings-simple-input"
                value={toneOfVoice}
                onChange={(event) => setToneOfVoice(event.target.value)}
              >
                {toneOptions.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </select>
            </label>
              </>
            ) : null}
          </div>

          {openExtraSection === "smiles" ? (
            <>
            <div className="settings-profile-section-heading">
              <span>3</span>
              <div>
                <h3>Nearby discovery</h3>
                <p>Confirm the venue location and choose the nearby search radius.</p>
              </div>
            </div>
            <section className="settings-geo-card" aria-labelledby="settings-geo-heading">
            <div className="settings-geo-head">
              <div>
                <span className="settings-create-eyebrow">Smart geo-booking</span>
                <h3 id="settings-geo-heading">Nearby discovery</h3>
                <p>Confirm the venue location and choose how it appears in nearby Smilez searches.</p>
              </div>
              <span className={`settings-geo-status ${geoEnabled ? 'is-live' : ''}`}>
                {geoEnabled ? 'Nearby discovery enabled' : 'Nearby discovery disabled'}
              </span>
            </div>

            <div className="settings-geo-grid">
              <label className="settings-wide-field">
                <strong>Show this venue in nearby searches?</strong>
                <select className="settings-simple-input" value={geoEnabled ? 'yes' : 'no'} onChange={(event) => setGeoEnabled(event.target.value === 'yes')}>
                  <option value="no">No, keep nearby discovery off</option>
                  <option value="yes">Yes, show this venue nearby</option>
                </select>
              </label>

              <div className="settings-geo-lookup settings-wide-field">
                <div>
                  <strong>Confirm venue location</strong>
                  <span>Uses the postcode above to place the venue on the Smilez map. Customers never see these coordinates.</span>
                </div>
                <button type="button" className="settings-geo-lookup-button" onClick={lookupPostcodeCoordinates} disabled={isLookingUpLocation || !postcode.trim() || saving}>
                  {isLookingUpLocation ? 'Checking postcode...' : 'Find location from postcode'}
                </button>
              </div>

              <label>
                <strong>Latitude</strong>
                <input className="settings-simple-input" inputMode="decimal" value={latitude} onChange={(event) => { setLatitude(event.target.value); setGeoMessage(''); }} placeholder="Example: 53.4106" />
              </label>
              <label>
                <strong>Longitude</strong>
                <input className="settings-simple-input" inputMode="decimal" value={longitude} onChange={(event) => { setLongitude(event.target.value); setGeoMessage(''); }} placeholder="Example: -2.1575" />
              </label>
              <label className="settings-wide-field">
                <strong>Nearby discovery radius</strong>
                <select className="settings-simple-input" value={serviceRadiusMiles} onChange={(event) => setServiceRadiusMiles(event.target.value)}>
                  <option value="0.5">0.5 miles</option><option value="1">1 mile</option><option value="2">2 miles</option><option value="3">3 miles</option><option value="5">5 miles</option><option value="10">10 miles</option><option value="15">15 miles</option><option value="25">25 miles</option><option value="50">50 miles</option>
                </select>
              </label>
            </div>

            <div className="settings-geo-summary">
              <div><span>Confirmed location</span><strong>{latitude.trim() && longitude.trim() ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}` : 'Not confirmed'}</strong></div>
              <div><span>Search radius</span><strong>{serviceRadiusMiles || '5'} miles</strong></div>
              <div><span>Last confirmed</span><strong>{formatGeoUpdatedAt(geoUpdatedAt)}</strong></div>
            </div>
            {geoMessage ? <p className="settings-geo-message">{geoMessage}</p> : null}
            </section>
            </>
          ) : null}

          <button
            type="button"
            className="settings-primary-action"
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : openExtraSection === "bookings"
                ? 'Save booking settings'
                : openExtraSection === "smiles"
                  ? 'Save Smilez profile'
                  : 'Save business details'}
          </button>

          <p className="settings-simple-note">
            When you are finished, save this section and close it.
          </p>
            </>
          )}
        </section>

        <section className="settings-smiles-strip settings-smiles-status-panel" style={{ display: showBusinessDetails ? undefined : 'none' }}>
          <div>
            <span className="settings-create-eyebrow">04 · Smilez status</span>
            <h2>Stockport Smilez connection</h2>
            <p>
              Your linked business profile updates automatically. New venue details are sent for approval.
            </p>
          </div>
          <span className="settings-smiles-status">{getSmilesListingStatusLabel()}</span>
        </section>

        <section className="settings-simple-panel" style={{ display: showSocialSettings ? undefined : 'none' }}>
          <div className="settings-panel-head">
            <span className="settings-step-badge">03</span>
            <div>
              <h2>Facebook and Instagram</h2>
              <p>Optional. Connect Meta for direct publishing.</p>
            </div>
          </div>

          <div className="settings-social-grid">
            <article className={hasFacebookConnection ? 'settings-social-card is-connected' : 'settings-social-card'}>
              <span>Facebook</span>
              <strong>{hasFacebookConnection ? 'Connected' : 'Not connected'}</strong>
              <p>{primaryMetaConnection?.page_name || 'Connect a Facebook Page for publishing.'}</p>
            </article>

            <article className={hasInstagramConnection ? 'settings-social-card is-connected' : 'settings-social-card'}>
              <span>Instagram</span>
              <strong>{hasInstagramConnection ? 'Connected' : 'Not connected'}</strong>
              <p>
                {primaryMetaConnection?.instagram_username
                  ? `@${primaryMetaConnection.instagram_username}`
                  : 'Connect an Instagram business account through Meta.'}
              </p>
            </article>
          </div>

          <div className="settings-action-row">
            <button
              type="button"
              className="settings-primary-action"
              onClick={connectMetaAccount}
              disabled={loadingConnections || metaConnectionBusy}
            >
              {hasMetaConnection ? 'Reconnect Meta' : 'Connect Facebook and Instagram'}
            </button>

            {hasMetaConnection && (
              <button
                type="button"
                className="settings-secondary-action"
                onClick={() => disconnectMetaAccount(primaryMetaConnection?.id)}
                disabled={metaConnectionBusy}
              >
                {metaConnectionBusy ? 'Disconnecting...' : 'Disconnect'}
              </button>
            )}
          </div>

          <p className="settings-simple-note">
            Settings updates your business profile and Smiles venue details. Social publishing happens from the post review page.
          </p>
        </section>

        <section className={`settings-simple-panel settings-weekly-sets-panel ${showAccountSettings ? "" : "settings-force-hidden"}`}>
          <div className="settings-panel-head settings-weekly-panel-head">
            <span className="settings-step-badge">04</span>
            <div>
              <h2>Saved post sets</h2>
              <p>
                {savedWeeklySets.length} saved set
                {savedWeeklySets.length === 1 ? "" : "s"} using your storage.
              </p>
            </div>

            <button
              type="button"
              className="settings-panel-toggle settings-weekly-toggle"
              onClick={() => setShowSavedPostSets((current) => !current)}
              aria-expanded={showSavedPostSets}
            >
              {showSavedPostSets ? "Hide saved sets" : "View saved sets"}
            </button>
          </div>

          {showSavedPostSets ? (
            <div className="settings-weekly-collapsible">
          <div className="settings-weekly-overview">
            <div className="settings-weekly-overview-copy">
              <span className="settings-weekly-kicker">Content storage</span>
              <strong>
                {savedWeeklySets.length} of 4 weekly sets used
              </strong>
              <p>
                {savedWeeklySets.length >= 4
                  ? 'Delete one set below to create a new content week.'
                  : `${Math.max(4 - savedWeeklySets.length, 0)} space${
                      Math.max(4 - savedWeeklySets.length, 0) === 1 ? '' : 's'
                    } remaining.`}
              </p>
            </div>

            <div
              className="settings-weekly-meter"
              aria-label={`${savedWeeklySets.length} of 4 saved weekly sets used`}
            >
              <span
                style={{
                  width: `${Math.min((savedWeeklySets.length / 4) * 100, 100)}%`,
                }}
              />
            </div>

          </div>

          {loadingSavedWeeklySets ? (
            <div className="settings-weekly-empty">
              <strong>Loading saved sets</strong>
              <span>Checking your FromOne content weeks...</span>
            </div>
          ) : savedWeeklySets.length === 0 ? (
            <div className="settings-weekly-empty">
              <strong>No saved weekly sets</strong>
              <span>Your next generated week will appear here.</span>
            </div>
          ) : (
            <div className="settings-weekly-list">
              {savedWeeklySets.map((set, index) => {
                const postCount = getSavedWeeklySetPostCount(set);
                const previewPosts = getSavedWeeklySetPreviewPosts(set);
                const titledPosts = Array.isArray(set.campaign_posts)
                  ? set.campaign_posts
                      .filter((post) => Boolean(post?.title?.trim()))
                      .slice(0, 2)
                  : [];

                return (
                  <article key={set.id} className="settings-weekly-row">
                    <div className="settings-weekly-index">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="settings-weekly-row-copy">
                      <div className="settings-weekly-title-line">
                        <strong>{getSavedWeeklySetName(set)}</strong>
                        <span className="settings-weekly-status">Saved week</span>
                      </div>

                      <p className="settings-weekly-summary">
                        {postCount === 1
                          ? '1 ready-to-manage post in this weekly set.'
                          : `${postCount} ready-to-manage posts in this weekly set.`}
                      </p>

                      {titledPosts.length > 0 && (
                        <div className="settings-weekly-post-titles">
                          {titledPosts.map((post, titleIndex) => (
                            <span key={post.id}>
                              <b>{String(titleIndex + 1).padStart(2, '0')}</b>
                              {post.title}
                            </span>
                          ))}
                          {postCount > titledPosts.length && (
                            <span className="settings-weekly-post-more">
                              +{postCount - titledPosts.length} more post
                              {postCount - titledPosts.length === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="settings-weekly-meta">
                        <span>
                          <b>Created</b>
                          {formatSavedWeeklySetDate(set.created_at)}
                        </span>
                        <span>
                          <b>Content</b>
                          {postCount} post{postCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    <div
                      className="settings-weekly-thumbnails"
                      aria-label="Saved post thumbnails"
                    >
                      {previewPosts.length > 0 ? (
                        previewPosts.map((post, previewIndex) => {
                          const previewUrl = String(
                            post.media_url || post.image_url || '',
                          );
                          const isVideo =
                            String(post.media_type || '')
                              .toLowerCase()
                              .includes('video') ||
                            /\.(mp4|mov|webm|m4v)(\?|$)/i.test(previewUrl);

                          return (
                            <div
                              key={post.id}
                              className="settings-weekly-thumbnail"
                              title={post.title || `Post ${previewIndex + 1}`}
                            >
                              {isVideo ? (
                                <video
                                  src={previewUrl}
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <img
                                  src={previewUrl}
                                  alt=""
                                  loading="lazy"
                                />
                              )}

                              <span className="settings-weekly-thumbnail-number">
                                {String(previewIndex + 1).padStart(2, '0')}
                              </span>

                              {previewIndex === 3 && postCount > 4 && (
                                <span className="settings-weekly-thumbnail-more">
                                  +{postCount - 4}
                                </span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <span className="settings-weekly-no-thumbnails">
                          No previews available
                        </span>
                      )}
                    </div>

                    <div className="settings-weekly-actions">
                      <a href="/posts" className="settings-weekly-view">
                        View posts
                      </a>

                      <button
                        type="button"
                        className="settings-weekly-delete"
                        onClick={() => deleteSavedWeeklySet(set)}
                        disabled={deletingWeeklySetId === set.id}
                      >
                        {deletingWeeklySetId === set.id
                          ? 'Deleting...'
                          : 'Delete set'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="settings-weekly-safety-note">
            <strong>FromOne only</strong>
            <span>
              Deleting a set removes its generated FromOne posts. Your business
              profile and all Smilez venue, offer and event listings stay untouched.
            </span>
          </div>
            </div>
          ) : (
            <div className="settings-weekly-collapsed-summary">
              <span>Storage used</span>
              <strong>{savedWeeklySets.length} of 4 sets</strong>
              <p>
                Select “View saved sets” to manage or delete an existing set.
              </p>
            </div>
          )}
        </section>

      </section>

      {confirmDialog && (() => {
        const activeConfirmDialog = confirmDialog!;

        return (
          <div className="settings-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-confirm-title">
            <section className="settings-confirm-card">
              <div className="settings-create-eyebrow">
                {activeConfirmDialog.danger ? 'Please confirm' : 'Confirm'}
              </div>
              <h2 id="settings-confirm-title">{activeConfirmDialog.title}</h2>
              <p>{activeConfirmDialog.message}</p>
              <div className="settings-action-row">
                <button type="button" className="settings-secondary-action" onClick={closeConfirmDialog}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="settings-primary-action"
                  onClick={() => {
                    if (activeConfirmDialog.type === 'disconnectMeta') {
                      confirmDisconnectMetaAccount(activeConfirmDialog.connectionId);
                      return;
                    }

                    if (activeConfirmDialog.type === 'deleteProfile') {
                      confirmDeleteProfile();
                    }
                  }}
                  disabled={saving || metaConnectionBusy}
                >
                  {saving || metaConnectionBusy ? 'Working...' : activeConfirmDialog.confirmLabel}
                </button>
              </div>
            </section>
          </div>
        );
      })()}

      <style jsx global>{`
        /* -------------------------------------------------------------- */
        /* FROMONE SETTINGS — CLEAN APPROVED STANDARD                      */
        /* Desktop: main-content 38px + shell margin-top 28px              */
        /* Mobile: same fixed width/gap as the finished mobile pages        */
        /* -------------------------------------------------------------- */
        body:has(.fromone-settings-page) {
          background: #f5f7fb !important;
          overflow-x: hidden !important;
        }

        body:has(.fromone-settings-page)::before {
          display: none !important;
          content: none !important;
        }

        body:has(.fromone-settings-page) .app-shell,
        body:has(.fromone-settings-page) .main-content {
          background: #f5f7fb !important;
        }

        body:has(.fromone-settings-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding-top: 38px !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        .fromone-settings-page.settings-create-style-page {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 16px 104px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
          background: #f5f7fb !important;
          color: #071b49 !important;
          font-family:
            var(--font-main),
            "Plus Jakarta Sans",
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif !important;
          font-weight: 500 !important;
          letter-spacing: -0.01em !important;
        }

        .fromone-settings-page #fromone-standard-shell.settings-create-style-card {
          width: 1040px !important;
          max-width: calc(100% - 32px) !important;
          min-width: 0 !important;
          min-height: 620px !important;
          margin: 28px auto 0 !important;
          padding: clamp(30px, 4vw, 48px) !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          display: block !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 32px !important;
          background: #ffffff !important;
          box-shadow: 0 24px 70px rgba(7, 27, 73, 0.10) !important;
          color: #071b49 !important;
          backdrop-filter: none !important;
        }

        .fromone-settings-page .settings-loading-card {
          min-height: 320px !important;
          display: grid !important;
          align-content: center !important;
        }

        .fromone-settings-page .settings-create-hero {
          width: 100% !important;
          max-width: 760px !important;
          margin: 0 0 26px !important;
          padding: 0 !important;
          text-align: left !important;
        }

        .fromone-settings-page .settings-create-eyebrow {
          color: #f72585 !important;
          font-size: 0.78rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .fromone-settings-page .settings-create-hero h1,
        .fromone-settings-page .settings-create-style-card h1 {
          max-width: 760px !important;
          margin: 12px 0 14px !important;
          color: #071b49 !important;
          font-size: clamp(3rem, 5.2vw, 4.45rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.055em !important;
          font-weight: 800 !important;
          text-align: left !important;
          overflow: visible !important;
        }

        .fromone-settings-page .settings-create-hero p,
        .fromone-settings-page .settings-create-style-card p {
          max-width: 720px !important;
          margin: 0 !important;
          color: #52617a !important;
          font-size: 1.02rem !important;
          line-height: 1.5 !important;
          font-weight: 600 !important;
        }

        .fromone-settings-page .settings-simple-panel,
        .fromone-settings-page .settings-smiles-strip {
          width: 100% !important;
          max-width: 100% !important;
          margin-top: 18px !important;
          padding: clamp(20px, 3vw, 30px) !important;
          box-sizing: border-box !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 24px !important;
          background: #f7f9fd !important;
        }

        .fromone-settings-page .settings-panel-head {
          display: flex !important;
          gap: 12px !important;
          align-items: flex-start !important;
          margin-bottom: 18px !important;
        }

        .fromone-settings-page .settings-step-badge {
          display: inline-flex !important;
          width: 34px !important;
          height: 34px !important;
          flex: 0 0 34px !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 50% !important;
          background: #f72585 !important;
          color: #ffffff !important;
          font-size: 0.78rem !important;
          font-weight: 800 !important;
          box-shadow: 0 12px 26px rgba(247, 37, 133, 0.18) !important;
        }

        .fromone-settings-page .settings-panel-head h2,
        .fromone-settings-page .settings-smiles-strip h2,
        .fromone-settings-page .settings-confirm-card h2 {
          margin: 0 0 6px !important;
          color: #071b49 !important;
          font-size: clamp(1.65rem, 3.4vw, 2.15rem) !important;
          font-weight: 800 !important;
          line-height: 1.05 !important;
          letter-spacing: -0.045em !important;
        }

        .fromone-settings-page .settings-form-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 12px !important;
        }

        .fromone-settings-page .settings-form-grid label {
          display: grid !important;
          gap: 8px !important;
        }

        .fromone-settings-page .settings-form-grid label strong {
          color: #071b49 !important;
          font-size: 0.86rem !important;
          font-weight: 800 !important;
          letter-spacing: -0.01em !important;
        }

        .fromone-settings-page .settings-wide-field {
          grid-column: 1 / -1 !important;
        }

        .fromone-settings-page .settings-website-scan-card {
          display: grid !important;
          gap: 12px !important;
          margin: 0 0 18px !important;
          padding: 16px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 20px !important;
          background: #ffffff !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
        }

        .fromone-settings-page .settings-website-scan-card h3 {
          margin: 7px 0 6px !important;
          color: #071b49 !important;
          font-size: clamp(1.35rem, 2.6vw, 1.65rem) !important;
          font-weight: 800 !important;
          line-height: 1.05 !important;
          letter-spacing: -0.035em !important;
        }

        .fromone-settings-page .settings-website-scan-row {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 180px !important;
          gap: 10px !important;
          align-items: center !important;
        }

        .fromone-settings-page .settings-simple-input {
          width: 100% !important;
          min-height: 52px !important;
          padding: 12px 15px !important;
          border: 1px solid #d7e0ee !important;
          border-radius: 18px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          box-sizing: border-box !important;
          font: inherit !important;
          font-weight: 600 !important;
          outline: none !important;
        }

        .fromone-settings-page textarea.settings-simple-input {
          min-height: 92px !important;
          resize: vertical !important;
        }

        .fromone-settings-page .settings-simple-input:focus {
          border-color: #f72585 !important;
          box-shadow: 0 0 0 4px rgba(247, 37, 133, 0.11) !important;
        }

        .fromone-settings-page .settings-business-image-field {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 180px !important;
          gap: 14px !important;
          align-items: center !important;
          padding: 14px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 20px !important;
          background: #ffffff !important;
        }

        .fromone-settings-page .settings-business-image-copy {
          display: grid !important;
          gap: 6px !important;
        }

        .fromone-settings-page .settings-business-image-copy strong {
          color: #071b49 !important;
          font-size: 0.92rem !important;
          font-weight: 900 !important;
        }

        .fromone-settings-page .settings-business-image-copy span {
          max-width: 560px !important;
          color: #52617a !important;
          font-size: 0.9rem !important;
          font-weight: 650 !important;
          line-height: 1.45 !important;
        }

        .fromone-settings-page .settings-business-image-card {
          width: 180px !important;
          aspect-ratio: 16 / 10 !important;
          overflow: hidden !important;
          border: 1px solid #d7e0ee !important;
          border-radius: 18px !important;
          background: #f7f9fd !important;
        }

        .fromone-settings-page .settings-business-image-card img {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          object-fit: cover !important;
        }

        .fromone-settings-page .settings-business-image-empty {
          width: 100% !important;
          height: 100% !important;
          display: grid !important;
          place-content: center !important;
          gap: 4px !important;
          padding: 12px !important;
          text-align: center !important;
          color: #52617a !important;
        }

        .fromone-settings-page .settings-business-image-empty span {
          color: #071b49 !important;
          font-size: 0.9rem !important;
          font-weight: 900 !important;
        }

        .fromone-settings-page .settings-business-image-empty small {
          color: #66738b !important;
          font-size: 0.78rem !important;
          font-weight: 650 !important;
          line-height: 1.25 !important;
        }

        .fromone-settings-page .settings-business-image-actions {
          grid-column: 1 / -1 !important;
          display: grid !important;
          grid-template-columns: repeat(2, 152px) !important;
          gap: 10px !important;
          justify-content: start !important;
          align-items: stretch !important;
        }

        .fromone-settings-page .settings-upload-action,
        .fromone-settings-page .settings-light-action {
          width: 100% !important;
          min-height: 42px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 999px !important;
          padding: 0 16px !important;
          font: inherit !important;
          font-size: 0.84rem !important;
          font-weight: 900 !important;
          cursor: pointer !important;
          white-space: nowrap !important;
          box-sizing: border-box !important;
        }

        .fromone-settings-page .settings-upload-action {
          position: relative !important;
          overflow: hidden !important;
          border: 1px solid #f72585 !important;
          background: #f72585 !important;
          color: #ffffff !important;
        }

        .fromone-settings-page .settings-upload-action input {
          position: absolute !important;
          inset: 0 !important;
          opacity: 0 !important;
          cursor: pointer !important;
        }

        .fromone-settings-page .settings-light-action {
          border: 1px solid #ffd0e4 !important;
          background: #fff7fb !important;
          color: #f72585 !important;
        }

        .fromone-settings-page .settings-upload-action:has(input:disabled),
        .fromone-settings-page .settings-light-action:disabled {
          cursor: not-allowed !important;
          opacity: 0.65 !important;
        }

        .fromone-settings-page .settings-primary-action,
        .fromone-settings-page .settings-secondary-action {
          min-height: 54px !important;
          padding: 0 22px !important;
          border-radius: 999px !important;
          font: inherit !important;
          font-weight: 800 !important;
          cursor: pointer !important;
        }

        .fromone-settings-page .settings-primary-action {
          width: 100% !important;
          margin-top: 16px !important;
          border: 1px solid #f72585 !important;
          background: #f72585 !important;
          color: #ffffff !important;
          box-shadow: 0 18px 38px rgba(247, 37, 133, 0.24) !important;
        }

        .fromone-settings-page .settings-secondary-action {
          border: 1px solid #ffd2e5 !important;
          background: #ffffff !important;
          color: #071b49 !important;
          box-shadow: 0 10px 24px rgba(7, 27, 73, 0.06) !important;
        }

        .fromone-settings-page .settings-primary-action:disabled,
        .fromone-settings-page .settings-secondary-action:disabled {
          cursor: not-allowed !important;
          opacity: 0.65 !important;
        }


        .fromone-settings-page .settings-field-help {
          display: block;
          margin-top: 8px;
          color: #6d7b91;
          font-size: 0.8rem;
          font-weight: 650;
          line-height: 1.45;
        }

        .fromone-settings-page .settings-smilez-booking-editor {
          display: grid;
          gap: 18px;
          padding: clamp(18px, 3vw, 26px);
          border: 1px solid #dfe5f1;
          border-radius: 24px;
          background: #fff;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045);
        }

        .fromone-settings-page .settings-smilez-booking-header,
        .fromone-settings-page .settings-smilez-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .fromone-settings-page .settings-smilez-booking-header h3 {
          margin: 7px 0;
          color: #071b49;
          font-size: clamp(1.55rem, 3vw, 2rem);
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 800;
        }

        .fromone-settings-page .settings-smilez-booking-header p {
          max-width: 620px !important;
          margin: 0 !important;
          font-size: 0.94rem !important;
        }

        .fromone-settings-page .settings-smilez-booking-status,
        .fromone-settings-page .settings-smilez-card-head > strong {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 13px;
          border: 1px solid #dfe5f1;
          border-radius: 999px;
          background: #f7f9fd;
          color: #52617a;
          font-size: 0.74rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .fromone-settings-page .settings-smilez-booking-options,
        .fromone-settings-page .settings-smilez-capacity-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .fromone-settings-page .settings-smilez-booking-options label,
        .fromone-settings-page .settings-smilez-capacity-grid label,
        .fromone-settings-page .settings-smilez-selected-times label,
        .fromone-settings-page .settings-smilez-block-form label {
          display: grid;
          gap: 7px;
        }

        .fromone-settings-page .settings-smilez-booking-options label > strong,
        .fromone-settings-page .settings-smilez-capacity-grid label > span,
        .fromone-settings-page .settings-smilez-selected-times label > span,
        .fromone-settings-page .settings-smilez-block-form label > span {
          color: #071b49;
          font-size: 0.78rem;
          font-weight: 850;
        }

        .fromone-settings-page .settings-smilez-capacity-card,
        .fromone-settings-page .settings-smilez-hours-card,
        .fromone-settings-page .settings-smilez-blocks-card {
          display: grid;
          gap: 16px;
          padding: 20px;
          border: 1px solid #dfe5f1;
          border-radius: 20px;
          background: #f9fbfe;
        }

        .fromone-settings-page .settings-smilez-card-head span {
          display: block;
          margin-bottom: 5px;
          color: #f72585;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .fromone-settings-page .settings-smilez-card-head h4 {
          margin: 0;
          color: #071b49;
          font-size: 1.2rem;
          letter-spacing: -0.025em;
        }

        .fromone-settings-page .settings-smilez-day-cards {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
        }

        .fromone-settings-page .settings-smilez-day-cards button {
          min-width: 0;
          display: grid;
          gap: 4px;
          padding: 13px 8px;
          border: 1px solid #dfe5f1;
          border-radius: 15px;
          background: #fff;
          color: #071b49;
          text-align: center;
          cursor: pointer;
        }

        .fromone-settings-page .settings-smilez-day-cards button strong {
          font-size: 0.78rem;
          font-weight: 950;
        }

        .fromone-settings-page .settings-smilez-day-cards button em {
          color: #667085;
          font-size: 0.66rem;
          font-style: normal;
          font-weight: 750;
        }

        .fromone-settings-page .settings-smilez-day-cards button span {
          overflow: hidden;
          color: #52617a;
          font-size: 0.65rem;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .fromone-settings-page .settings-smilez-day-cards button.is-selected {
          border-color: #f72585;
          background: #fff3f8;
          box-shadow: 0 10px 24px rgba(247, 37, 133, 0.12);
        }

        .fromone-settings-page .settings-smilez-day-cards button.is-closed {
          opacity: 0.62;
        }

        .fromone-settings-page .settings-smilez-selected-day {
          display: grid;
          grid-template-columns: minmax(130px, 0.7fr) auto minmax(260px, 1.3fr);
          gap: 16px;
          align-items: center;
          padding: 17px;
          border: 1px solid #dfe5f1;
          border-radius: 18px;
          background: #fff;
        }

        .fromone-settings-page .settings-smilez-selected-day > div > span {
          color: #f72585;
          font-size: 0.68rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .fromone-settings-page .settings-smilez-selected-day h5 {
          margin: 4px 0 0;
          color: #071b49;
          font-size: 1rem;
        }

        .fromone-settings-page .settings-smilez-closed-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #52617a;
          font-size: 0.8rem;
          font-weight: 850;
        }

        .fromone-settings-page .settings-smilez-closed-toggle input {
          width: 18px;
          height: 18px;
          accent-color: #f72585;
        }

        .fromone-settings-page .settings-smilez-selected-times {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .fromone-settings-page .settings-smilez-quick-dates {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .fromone-settings-page .settings-smilez-quick-dates button,
        .fromone-settings-page .settings-smilez-block-form > button {
          min-height: 38px;
          padding: 0 14px;
          border: 1px solid #ffd0e4;
          border-radius: 999px;
          background: #fff7fb;
          color: #f72585;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 900;
          cursor: pointer;
        }

        .fromone-settings-page .settings-smilez-block-form {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          align-items: end;
        }

        .fromone-settings-page .settings-smilez-block-form .is-wide {
          grid-column: span 3;
        }

        .fromone-settings-page .settings-smilez-block-list {
          display: grid;
          gap: 9px;
        }

        .fromone-settings-page .settings-smilez-block-list article {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 13px 14px;
          border: 1px solid #dfe5f1;
          border-radius: 15px;
          background: #fff;
        }

        .fromone-settings-page .settings-smilez-block-list article > div {
          display: grid;
          gap: 3px;
        }

        .fromone-settings-page .settings-smilez-block-list strong {
          color: #071b49;
          font-size: 0.85rem;
        }

        .fromone-settings-page .settings-smilez-block-list span,
        .fromone-settings-page .settings-smilez-block-list em {
          color: #667085;
          font-size: 0.76rem;
          font-style: normal;
          font-weight: 700;
        }

        .fromone-settings-page .settings-smilez-block-list button {
          border: 0;
          background: transparent;
          color: #b42318;
          font: inherit;
          font-size: 0.75rem;
          font-weight: 900;
          cursor: pointer;
        }

        .fromone-settings-page .settings-geo-card { display:grid!important; gap:18px!important; margin:18px 0 0!important; padding:clamp(18px,3vw,26px)!important; border:1px solid #dfe5f1!important; border-radius:24px!important; background:#fff!important; box-shadow:0 8px 22px rgba(7,27,73,.045)!important; }
        .fromone-settings-page .settings-geo-head { display:flex!important; gap:18px!important; align-items:flex-start!important; justify-content:space-between!important; }
        .fromone-settings-page .settings-geo-head h3 { margin:7px 0!important; color:#071b49!important; font-size:clamp(1.55rem,3vw,2rem)!important; line-height:1!important; letter-spacing:-.04em!important; font-weight:800!important; }
        .fromone-settings-page .settings-geo-head p { max-width:620px!important; margin:0!important; font-size:.94rem!important; }
        .fromone-settings-page .settings-geo-status { min-height:38px!important; display:inline-flex!important; align-items:center!important; justify-content:center!important; padding:0 14px!important; border:1px solid #dfe5f1!important; border-radius:999px!important; background:#f7f9fd!important; color:#52617a!important; font-size:.78rem!important; font-weight:900!important; white-space:nowrap!important; }
        .fromone-settings-page .settings-geo-status.is-live { border-color:rgba(4,120,87,.22)!important; background:rgba(16,185,129,.09)!important; color:#047857!important; }
        .fromone-settings-page .settings-geo-grid { display:grid!important; grid-template-columns:repeat(2,minmax(0,1fr))!important; gap:12px!important; }
        .fromone-settings-page .settings-geo-grid label { display:grid!important; gap:8px!important; }
        .fromone-settings-page .settings-geo-grid label strong, .fromone-settings-page .settings-geo-lookup strong { color:#071b49!important; font-size:.86rem!important; font-weight:800!important; }
        .fromone-settings-page .settings-geo-lookup { display:grid!important; grid-template-columns:minmax(0,1fr) minmax(220px,280px)!important; gap:16px!important; align-items:center!important; padding:15px!important; border:1px solid #dfe5f1!important; border-radius:18px!important; background:#f7f9fd!important; overflow:hidden!important; }
        .fromone-settings-page .settings-geo-lookup>div { display:grid!important; gap:5px!important; }
        .fromone-settings-page .settings-geo-lookup span { color:#52617a!important; font-size:.88rem!important; font-weight:650!important; line-height:1.4!important; }
        .fromone-settings-page .settings-geo-lookup-button { width:100%!important; max-width:280px!important; min-width:0!important; min-height:46px!important; display:inline-flex!important; align-items:center!important; justify-content:center!important; justify-self:end!important; padding:10px 18px!important; border:0!important; border-radius:999px!important; background:#071b49!important; color:#fff!important; font:inherit!important; font-size:.9rem!important; line-height:1.15!important; font-weight:900!important; text-align:center!important; cursor:pointer!important; white-space:normal!important; overflow-wrap:anywhere!important; }
        .fromone-settings-page .settings-geo-lookup-button:disabled { cursor:not-allowed!important; opacity:.55!important; }
        .fromone-settings-page .settings-geo-summary { display:grid!important; grid-template-columns:repeat(3,minmax(0,1fr))!important; gap:10px!important; }
        .fromone-settings-page .settings-geo-summary>div { display:grid!important; gap:5px!important; padding:14px!important; border:1px solid #dfe5f1!important; border-radius:18px!important; background:#f7f9fd!important; }
        .fromone-settings-page .settings-geo-summary span { color:#f72585!important; font-size:.72rem!important; font-weight:900!important; letter-spacing:.08em!important; text-transform:uppercase!important; }
        .fromone-settings-page .settings-geo-summary strong { color:#071b49!important; font-size:.92rem!important; font-weight:850!important; overflow-wrap:anywhere!important; }
        .fromone-settings-page .settings-geo-message { margin:0!important; color:#047857!important; font-size:.9rem!important; font-weight:800!important; }
        @media (max-width:900px) {
          .fromone-settings-page .settings-geo-lookup {
            grid-template-columns:minmax(0,1fr)!important;
          }
          .fromone-settings-page .settings-geo-lookup-button {
            max-width:none!important;
            justify-self:stretch!important;
          }
        }
        @media (max-width:760px) {
          .fromone-settings-page .settings-geo-head { display:grid!important; }
          .fromone-settings-page .settings-geo-grid, .fromone-settings-page .settings-geo-summary { grid-template-columns:1fr!important; }
          .fromone-settings-page .settings-geo-status, .fromone-settings-page .settings-geo-lookup-button { width:100%!important; }
        }

        .fromone-settings-page .settings-simple-note {
          margin: 14px 0 0 !important;
          text-align: center !important;
          color: #52617d !important;
          font-size: 0.95rem !important;
          font-weight: 600 !important;
        }

        .fromone-settings-page .settings-create-style-card p.settings-simple-note {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 14px auto 0 !important;
          text-align: center !important;
        }

        .fromone-settings-page .settings-social-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 14px !important;
        }

        .fromone-settings-page .settings-social-card {
          padding: 18px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 22px !important;
          background: #ffffff !important;
          box-shadow: 0 8px 22px rgba(7, 27, 73, 0.045) !important;
        }

        .fromone-settings-page .settings-social-card.is-connected {
          border-color: rgba(20, 184, 116, 0.42) !important;
          background: linear-gradient(145deg, rgba(20, 184, 116, 0.10), #ffffff) !important;
        }

        .fromone-settings-page .settings-social-card span {
          color: #f72585 !important;
          font-size: 0.78rem !important;
          font-weight: 800 !important;
          letter-spacing: 0.06em !important;
          text-transform: uppercase !important;
        }

        .fromone-settings-page .settings-social-card strong {
          display: block !important;
          margin-top: 8px !important;
          color: #071b49 !important;
          font-size: 1.35rem !important;
          font-weight: 800 !important;
          letter-spacing: -0.03em !important;
        }

        .fromone-settings-page .settings-action-row {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }

        .fromone-settings-page .settings-action-row .settings-primary-action {
          margin-top: 18px !important;
        }

        .fromone-settings-page .settings-action-row .settings-secondary-action {
          width: 100% !important;
        }

        .fromone-settings-page .settings-smiles-strip {
          display: flex !important;
          gap: 18px !important;
          align-items: center !important;
          justify-content: space-between !important;
          background:
            linear-gradient(135deg, rgba(247, 37, 133, 0.045), transparent 46%),
            #fff8fc !important;
          border-color: #ffd2e5 !important;
        }

        .fromone-settings-page .settings-smiles-status {
          display: inline-flex !important;
          min-height: 44px !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 10px 16px !important;
          border: 1px solid #ffd0e6 !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          font-weight: 800 !important;
          white-space: nowrap !important;
          box-shadow: 0 10px 24px rgba(7, 27, 73, 0.06) !important;
        }

        .settings-confirm-backdrop {
          position: fixed !important;
          inset: 0 !important;
          z-index: 10000 !important;
          display: grid !important;
          place-items: center !important;
          padding: 18px !important;
          background: rgba(7, 27, 73, 0.42) !important;
          backdrop-filter: blur(10px) !important;
        }

        .settings-confirm-card {
          width: min(520px, 100%) !important;
          padding: 26px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 26px !important;
          background: #ffffff !important;
          box-shadow: 0 28px 80px rgba(7, 27, 73, 0.22) !important;
        }

        @media (max-width: 760px) {
          .fromone-settings-page .settings-smilez-booking-header,
          .fromone-settings-page .settings-smilez-card-head {
            display: grid;
          }

          .fromone-settings-page .settings-smilez-booking-options,
          .fromone-settings-page .settings-smilez-capacity-grid,
          .fromone-settings-page .settings-smilez-selected-times,
          .fromone-settings-page .settings-smilez-block-form {
            grid-template-columns: 1fr;
          }

          .fromone-settings-page .settings-smilez-day-cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .fromone-settings-page .settings-smilez-selected-day {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .fromone-settings-page .settings-smilez-block-form .is-wide {
            grid-column: auto;
          }

          .fromone-settings-page .settings-hours-row {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .fromone-settings-page .settings-hours-row > strong {
            padding-bottom: 2px;
          }

          body:has(.fromone-settings-page) .main-content {
            padding-top: 0 !important;
          }

          .fromone-settings-page.settings-create-style-page {
            padding: 0 0 112px !important;
          }

          .fromone-settings-page #fromone-standard-shell.settings-create-style-card {
            width: calc(100% - 72px) !important;
            max-width: 468px !important;
            min-height: auto !important;
            margin: 24px auto 0 !important;
            padding: 28px 26px 26px !important;
            border-radius: 26px !important;
          }

          .fromone-settings-page .settings-create-hero {
            margin-bottom: 32px !important;
          }

          .fromone-settings-page .settings-create-hero h1,
          .fromone-settings-page .settings-create-style-card h1 {
            margin: 14px 0 18px !important;
            font-size: clamp(2.75rem, 11vw, 3.6rem) !important;
            line-height: 0.94 !important;
            letter-spacing: -0.058em !important;
          }

          .fromone-settings-page .settings-create-hero p,
          .fromone-settings-page .settings-create-style-card p {
            font-size: 1rem !important;
            line-height: 1.45 !important;
          }

          .fromone-settings-page .settings-business-image-field {
            grid-template-columns: 1fr !important;
          }

          .fromone-settings-page .settings-business-image-card {
            width: 100% !important;
          }

          .fromone-settings-page .settings-business-image-actions {
            grid-template-columns: 1fr !important;
          }

          .fromone-settings-page .settings-simple-panel,
          .fromone-settings-page .settings-smiles-strip {
            margin-top: 18px !important;
            padding: 20px !important;
            border-radius: 24px !important;
          }

          .fromone-settings-page .settings-panel-head {
            margin-bottom: 22px !important;
          }

          .fromone-settings-page .settings-panel-head h2,
          .fromone-settings-page .settings-smiles-strip h2,
          .fromone-settings-page .settings-confirm-card h2 {
            font-size: clamp(1.75rem, 7vw, 2.15rem) !important;
            line-height: 0.98 !important;
          }

          .fromone-settings-page .settings-form-grid,
          .fromone-settings-page .settings-social-grid,
          .fromone-settings-page .settings-website-scan-row {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          .fromone-settings-page .settings-smiles-strip {
            display: grid !important;
          }

          .fromone-settings-page .settings-smiles-status {
            width: 100% !important;
            white-space: normal !important;
            text-align: center !important;
          }
        }

        @media (max-width: 420px) {
          .fromone-settings-page #fromone-standard-shell.settings-create-style-card {
            width: calc(100% - 48px) !important;
            padding: 26px 22px 24px !important;
          }
        }
        .fromone-settings-page .settings-weekly-sets-panel {
          display: grid !important;
          gap: 20px !important;
          overflow: hidden !important;
          background:
            radial-gradient(circle at top right, rgba(247, 37, 133, 0.07), transparent 34%),
            #f7f9fd !important;
        }

        .fromone-settings-page .settings-weekly-overview {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px 24px;
          align-items: center;
          padding: 22px;
          border: 1px solid #dfe5f1;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 18px 44px rgba(7, 27, 73, 0.07);
        }

        .fromone-settings-page .settings-weekly-overview-copy {
          min-width: 0;
          display: grid;
          gap: 5px;
        }

        .fromone-settings-page .settings-weekly-kicker {
          color: #f72585;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .fromone-settings-page .settings-weekly-overview-copy strong {
          color: #071b49;
          font-size: clamp(1.15rem, 2vw, 1.45rem);
          line-height: 1.15;
          letter-spacing: -0.025em;
        }

        .fromone-settings-page .settings-weekly-overview-copy p {
          color: #637089 !important;
          font-size: 0.92rem !important;
          font-weight: 650 !important;
        }

        .fromone-settings-page .settings-weekly-meter {
          grid-column: 1 / -1;
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: #e9edf5;
        }

        .fromone-settings-page .settings-weekly-meter span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #f72585, #ffba08);
          box-shadow: 0 0 18px rgba(247, 37, 133, 0.25);
          transition: width 180ms ease;
        }

        .fromone-settings-page .settings-weekly-posts-link {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border: 1px solid #d6deed;
          border-radius: 999px;
          background: #f7f9fd;
          color: #071b49;
          font-size: 0.88rem;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .fromone-settings-page .settings-weekly-posts-link:hover {
          transform: translateY(-1px);
          border-color: #f72585;
          background: #ffffff;
        }

        .fromone-settings-page .settings-weekly-list {
          display: grid;
          gap: 16px;
        }

        .fromone-settings-page .settings-weekly-row {
          position: relative;
          display: grid;
          grid-template-columns: 58px minmax(250px, 1.35fr) minmax(260px, auto) auto;
          align-items: center;
          gap: 20px;
          padding: 20px;
          overflow: hidden;
          border: 1px solid rgba(7, 27, 73, 0.1);
          border-radius: 26px;
          background:
            radial-gradient(circle at 0% 0%, rgba(255, 212, 59, 0.12), transparent 34%),
            linear-gradient(145deg, #ffffff 0%, #fbfcff 100%);
          box-shadow:
            0 24px 60px rgba(7, 27, 73, 0.08),
            0 2px 8px rgba(7, 27, 73, 0.035);
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease;
        }

        .fromone-settings-page .settings-weekly-row::before {
          content: '';
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: linear-gradient(180deg, #ffd43b 0%, #f72585 100%);
          opacity: 0.9;
        }

        .fromone-settings-page .settings-weekly-row:hover {
          transform: translateY(-3px);
          border-color: rgba(7, 27, 73, 0.18);
          box-shadow:
            0 30px 74px rgba(7, 27, 73, 0.12),
            0 4px 14px rgba(7, 27, 73, 0.045);
        }

        .fromone-settings-page .settings-weekly-index {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border-radius: 19px;
          background:
            linear-gradient(145deg, #0c2b68 0%, #071b49 68%, #041334 100%);
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 1000;
          letter-spacing: 0.11em;
          box-shadow:
            0 14px 30px rgba(7, 27, 73, 0.22),
            inset 0 1px 0 rgba(255,255,255,0.15);
        }

        .fromone-settings-page .settings-weekly-row-copy {
          min-width: 0;
          display: grid;
          gap: 10px;
        }

        .fromone-settings-page .settings-weekly-title-line {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .fromone-settings-page .settings-weekly-title-line > strong {
          color: #071b49;
          font-size: clamp(1rem, 1.6vw, 1.15rem);
          font-weight: 1000;
          line-height: 1.2;
          letter-spacing: -0.02em;
          overflow-wrap: anywhere;
        }

        .fromone-settings-page .settings-weekly-status {
          display: inline-flex;
          align-items: center;
          min-height: 25px;
          padding: 4px 9px;
          border: 1px solid rgba(61, 220, 151, 0.24);
          border-radius: 999px;
          background: rgba(61, 220, 151, 0.1);
          color: #0b6b48;
          font-size: 0.68rem;
          font-weight: 1000;
          letter-spacing: 0.055em;
          text-transform: uppercase;
        }

        .fromone-settings-page .settings-weekly-summary {
          margin: 0;
          color: #627087;
          font-size: 0.82rem;
          font-weight: 700;
          line-height: 1.45;
        }

        .fromone-settings-page .settings-weekly-post-titles {
          display: grid;
          gap: 6px;
        }

        .fromone-settings-page .settings-weekly-post-titles span {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          color: #34445f;
          font-size: 0.78rem;
          font-weight: 800;
          line-height: 1.35;
        }

        .fromone-settings-page .settings-weekly-post-titles span b {
          flex: 0 0 auto;
          display: inline-grid;
          place-items: center;
          width: 24px;
          height: 24px;
          border-radius: 8px;
          background: #eef3fb;
          color: #071b49;
          font-size: 0.65rem;
          letter-spacing: 0.06em;
        }

        .fromone-settings-page .settings-weekly-post-more {
          color: #7a879a !important;
          font-size: 0.73rem !important;
          padding-left: 32px;
        }

        .fromone-settings-page .settings-weekly-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .fromone-settings-page .settings-weekly-meta span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 30px;
          padding: 5px 11px;
          border: 1px solid rgba(7, 27, 73, 0.1);
          border-radius: 999px;
          background: rgba(238, 243, 251, 0.78);
          color: #52617a;
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.01em;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
        }

        .fromone-settings-page .settings-weekly-meta span b {
          color: #071b49;
          font-size: 0.67rem;
          font-weight: 1000;
          letter-spacing: 0.045em;
          text-transform: uppercase;
        }

        .fromone-settings-page .settings-weekly-thumbnails {
          display: grid;
          grid-template-columns: repeat(4, 64px);
          gap: 8px;
          align-items: center;
          padding: 8px;
          border: 1px solid rgba(7, 27, 73, 0.08);
          border-radius: 18px;
          background: rgba(238, 243, 251, 0.72);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.85);
        }

        .fromone-settings-page .settings-weekly-thumbnail {
          position: relative;
          width: 64px;
          height: 64px;
          overflow: hidden;
          border: 2px solid #ffffff;
          border-radius: 15px;
          background: #e8edf6;
          box-shadow: 0 8px 18px rgba(7, 27, 73, 0.13);
        }

        .fromone-settings-page .settings-weekly-thumbnail img,
        .fromone-settings-page .settings-weekly-thumbnail video {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 200ms ease;
        }

        .fromone-settings-page .settings-weekly-row:hover .settings-weekly-thumbnail img,
        .fromone-settings-page .settings-weekly-row:hover .settings-weekly-thumbnail video {
          transform: scale(1.045);
        }

        .fromone-settings-page .settings-weekly-thumbnail-number {
          position: absolute;
          left: 6px;
          bottom: 6px;
          display: inline-grid;
          place-items: center;
          min-width: 24px;
          height: 22px;
          padding: 0 6px;
          border-radius: 8px;
          background: rgba(7, 27, 73, 0.82);
          color: #ffffff;
          font-size: 0.62rem;
          font-weight: 1000;
          letter-spacing: 0.06em;
          box-shadow: 0 5px 12px rgba(7, 27, 73, 0.2);
          backdrop-filter: blur(4px);
        }

        .fromone-settings-page .settings-weekly-thumbnail-more {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background: rgba(7, 27, 73, 0.72);
          color: #ffffff;
          font-size: 0.86rem;
          font-weight: 1000;
          backdrop-filter: blur(2px);
        }

        .fromone-settings-page .settings-weekly-no-thumbnails {
          grid-column: 1 / -1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 64px;
          padding: 0 18px;
          color: #718096;
          font-size: 0.78rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .fromone-settings-page .settings-weekly-actions {
          display: grid;
          gap: 9px;
          min-width: 118px;
        }

        .fromone-settings-page .settings-weekly-view,
        .fromone-settings-page .settings-weekly-delete {
          min-height: 44px;
          padding: 0 18px;
          border-radius: 14px;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 1000;
          white-space: nowrap;
          transition:
            transform 160ms ease,
            background 160ms ease,
            color 160ms ease,
            box-shadow 160ms ease;
        }

        .fromone-settings-page .settings-weekly-view {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(7, 27, 73, 0.12);
          background: #071b49;
          color: #ffffff;
          text-decoration: none;
          box-shadow: 0 10px 22px rgba(7, 27, 73, 0.14);
        }

        .fromone-settings-page .settings-weekly-view:hover {
          transform: translateY(-2px);
          background: #0d2b66;
          box-shadow: 0 14px 28px rgba(7, 27, 73, 0.2);
        }

        .fromone-settings-page .settings-weekly-delete {
          border: 1px solid rgba(180, 35, 61, 0.18);
          background: rgba(255, 247, 248, 0.9);
          color: #a61f38;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(180, 35, 61, 0.06);
        }

        .fromone-settings-page .settings-weekly-delete:hover:not(:disabled) {
          transform: translateY(-2px);
          background: #a61f38;
          color: #ffffff;
          box-shadow: 0 12px 26px rgba(166, 31, 56, 0.2);
        }

        .fromone-settings-page .settings-weekly-delete:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }

        .fromone-settings-page .settings-weekly-empty {
          display: grid;
          gap: 5px;
          padding: 24px;
          border: 1px dashed #ccd5e5;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.72);
          text-align: center;
        }

        .fromone-settings-page .settings-weekly-empty strong {
          color: #071b49;
          font-size: 1rem;
        }

        .fromone-settings-page .settings-weekly-empty span {
          color: #68758c;
          font-size: 0.9rem;
          font-weight: 650;
        }

        .fromone-settings-page .settings-weekly-safety-note {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 10px 14px;
          align-items: start;
          padding: 15px 16px;
          border-radius: 18px;
          background: #eef3fb;
          color: #52617a;
          font-size: 0.86rem;
          line-height: 1.5;
        }

        .fromone-settings-page .settings-weekly-safety-note strong {
          color: #071b49;
          white-space: nowrap;
        }

        /* Final responsive hardening for the FromOne settings workspace. */
        .fromone-settings-page,
        .fromone-settings-page *,
        .fromone-settings-page *::before,
        .fromone-settings-page *::after {
          box-sizing: border-box;
        }

        .fromone-settings-page img,
        .fromone-settings-page video,
        .fromone-settings-page canvas {
          max-width: 100%;
        }

        .fromone-settings-page input,
        .fromone-settings-page select,
        .fromone-settings-page textarea,
        .fromone-settings-page button {
          min-width: 0;
        }

        .fromone-settings-page .settings-simple-panel,
        .fromone-settings-page .settings-profile-editor,
        .fromone-settings-page .settings-smilez-booking-editor,
        .fromone-settings-page .settings-geo-card,
        .fromone-settings-page .settings-business-image-field,
        .fromone-settings-page .settings-website-scan-card {
          min-width: 0 !important;
          max-width: 100% !important;
          overflow-wrap: anywhere;
        }

        .fromone-settings-page .settings-simple-input,
        .fromone-settings-page .input {
          width: 100% !important;
          max-width: 100% !important;
        }

        .fromone-settings-page textarea.settings-simple-input,
        .fromone-settings-page textarea.input {
          resize: vertical;
        }

        .fromone-settings-page .settings-business-image-card {
          width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }

        .fromone-settings-page .settings-business-image-card img {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          object-fit: cover !important;
        }

        .fromone-settings-page .settings-smilez-block-list article,
        .fromone-settings-page .settings-geo-summary article {
          min-width: 0 !important;
        }

        @media (max-width: 760px) {
          .fromone-settings-page #fromone-standard-shell.settings-create-style-card {
            width: calc(100% - 20px) !important;
            max-width: calc(100% - 20px) !important;
            margin: 10px auto 0 !important;
            padding: 20px 14px 28px !important;
            border-radius: 24px !important;
            overflow: hidden !important;
          }

          .fromone-settings-page .settings-create-hero {
            margin-bottom: 20px !important;
          }

          .fromone-settings-page .settings-create-hero h1,
          .fromone-settings-page .settings-create-style-card h1 {
            font-size: clamp(2.25rem, 12vw, 3.15rem) !important;
            line-height: 0.98 !important;
            overflow-wrap: normal !important;
            word-break: normal !important;
          }

          .fromone-settings-page .settings-simple-panel,
          .fromone-settings-page .settings-profile-editor,
          .fromone-settings-page .settings-smilez-booking-editor,
          .fromone-settings-page .settings-geo-card,
          .fromone-settings-page .settings-website-scan-card {
            padding: 16px !important;
            border-radius: 22px !important;
          }

          .fromone-settings-page .settings-panel-head,
          .fromone-settings-page .settings-smilez-booking-header,
          .fromone-settings-page .settings-geo-head {
            align-items: flex-start !important;
          }

          .fromone-settings-page .settings-simple-grid,
          .fromone-settings-page .settings-profile-grid,
          .fromone-settings-page .settings-smilez-booking-options,
          .fromone-settings-page .settings-smilez-hours-grid,
          .fromone-settings-page .settings-smilez-capacity-grid,
          .fromone-settings-page .settings-smilez-block-form,
          .fromone-settings-page .settings-geo-grid,
          .fromone-settings-page .settings-geo-summary {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .fromone-settings-page .settings-wide-field,
          .fromone-settings-page .is-wide {
            grid-column: 1 !important;
          }

          .fromone-settings-page input,
          .fromone-settings-page select,
          .fromone-settings-page textarea {
            font-size: 16px !important;
          }

          .fromone-settings-page .settings-smilez-block-list article {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 12px !important;
            align-items: stretch !important;
          }

          .fromone-settings-page .settings-smilez-block-list article button {
            width: 100% !important;
          }

          .fromone-settings-page .settings-business-image-card {
            aspect-ratio: 16 / 10 !important;
            min-height: 190px !important;
          }

          .fromone-settings-page .settings-business-image-actions {
            width: 100% !important;
          }

          .fromone-settings-page .settings-weekly-overview {
            grid-template-columns: 1fr;
            padding: 18px;
          }

          .fromone-settings-page .settings-weekly-posts-link {
            width: 100%;
          }

          .fromone-settings-page .settings-weekly-row {
            grid-template-columns: 48px minmax(0, 1fr);
            gap: 14px;
            padding: 16px;
            border-radius: 22px;
          }

          .fromone-settings-page .settings-weekly-index {
            width: 48px;
            height: 48px;
            border-radius: 16px;
          }

          .fromone-settings-page .settings-weekly-thumbnails {
            grid-column: 1 / -1;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            width: 100%;
          }

          .fromone-settings-page .settings-weekly-thumbnail {
            width: 100%;
            height: auto;
            aspect-ratio: 1 / 1;
          }

          .fromone-settings-page .settings-weekly-actions {
            grid-column: 1 / -1;
            grid-template-columns: 1fr 1fr;
            width: 100%;
          }

          .fromone-settings-page .settings-weekly-view,
          .fromone-settings-page .settings-weekly-delete {
            width: 100%;
            min-height: 46px;
          }

          .fromone-settings-page .settings-weekly-safety-note {
            grid-template-columns: 1fr;
          }

        }

        @media (max-width: 420px) {
          .fromone-settings-page #fromone-standard-shell.settings-create-style-card {
            width: calc(100% - 12px) !important;
            max-width: calc(100% - 12px) !important;
            padding-inline: 12px !important;
          }

          .fromone-settings-page .settings-simple-panel,
          .fromone-settings-page .settings-profile-editor,
          .fromone-settings-page .settings-smilez-booking-editor,
          .fromone-settings-page .settings-geo-card,
          .fromone-settings-page .settings-website-scan-card {
            padding: 14px !important;
            border-radius: 20px !important;
          }
        }


        /* Granny-proof settings layout */
        .fromone-settings-page .settings-create-hero {
          margin-bottom: 18px !important;
        }

        .fromone-settings-page .settings-simple-panel {
          padding: 22px !important;
          border-radius: 20px !important;
        }

        .fromone-settings-page .settings-panel-head {
          margin-bottom: 16px !important;
        }

        .fromone-settings-page .settings-form-grid {
          gap: 12px !important;
        }

        .fromone-settings-page .settings-website-scan-card {
          padding: 16px !important;
          border-radius: 16px !important;
        }

        .fromone-settings-page .settings-advanced-toggle {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          align-items: center !important;
          gap: 18px !important;
          margin-top: 6px !important;
          padding: 18px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 18px !important;
          background: #f8fafc !important;
        }

        .fromone-settings-page .settings-advanced-toggle h3 {
          margin: 5px 0 5px !important;
          color: #071b49 !important;
          font-size: 1.15rem !important;
          line-height: 1.15 !important;
          font-weight: 800 !important;
          letter-spacing: -0.035em !important;
        }

        .fromone-settings-page .settings-advanced-toggle p {
          margin: 0 !important;
          max-width: 640px !important;
          color: #52617a !important;
          font-size: 0.9rem !important;
          line-height: 1.45 !important;
          font-weight: 600 !important;
        }

        .fromone-settings-page .settings-advanced-toggle-button {
          min-width: 180px !important;
          border-radius: 999px !important;
          white-space: nowrap !important;
        }

        .fromone-settings-page .settings-primary-action {
          border-radius: 999px !important;
        }

        .fromone-settings-page .settings-social-grid {
          gap: 10px !important;
        }

        .fromone-settings-page .settings-weekly-sets-panel {
          padding-bottom: 20px !important;
        }

        .fromone-settings-page .settings-smiles-strip {
          padding: 18px !important;
          border-radius: 18px !important;
        }

        @media (max-width: 760px) {
          .fromone-settings-page .settings-advanced-toggle {
            grid-template-columns: 1fr !important;
          }

          .fromone-settings-page .settings-advanced-toggle-button {
            width: 100% !important;
            min-width: 0 !important;
          }
        }


        /* Simple summary-first settings experience */
        .fromone-settings-page .settings-panel-head {
          grid-template-columns: auto minmax(0, 1fr) auto !important;
          align-items: center !important;
        }

        .fromone-settings-page .settings-panel-toggle {
          min-height: 44px !important;
          padding: 0 18px !important;
          border: 1px solid #f72585 !important;
          border-radius: 999px !important;
          background: #f72585 !important;
          color: #ffffff !important;
          font: inherit !important;
          font-size: 0.88rem !important;
          font-weight: 800 !important;
          cursor: pointer !important;
          box-shadow: 0 10px 22px rgba(247, 37, 133, 0.18) !important;
        }

        .fromone-settings-page .settings-panel-toggle:hover {
          background: #e91e79 !important;
          border-color: #e91e79 !important;
        }

        .fromone-settings-page .settings-profile-summary {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 10px !important;
          padding: 14px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 16px !important;
          background: #f8fafc !important;
        }

        .fromone-settings-page .settings-profile-summary > div {
          display: grid !important;
          gap: 4px !important;
          min-width: 0 !important;
        }

        .fromone-settings-page .settings-profile-summary span {
          color: #f72585 !important;
          font-size: 0.68rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: 0.1em !important;
          text-transform: uppercase !important;
        }

        .fromone-settings-page .settings-profile-summary strong {
          overflow: hidden !important;
          color: #071b49 !important;
          font-size: 0.9rem !important;
          line-height: 1.3 !important;
          font-weight: 800 !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .fromone-settings-page .settings-simple-panel.is-collapsed {
          padding-bottom: 18px !important;
        }

        .fromone-settings-page .settings-simple-panel.is-collapsed .settings-panel-head {
          margin-bottom: 12px !important;
        }

        @media (max-width: 900px) {
          .fromone-settings-page .settings-profile-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 620px) {
          .fromone-settings-page .settings-panel-head {
            grid-template-columns: auto minmax(0, 1fr) !important;
          }

          .fromone-settings-page .settings-panel-toggle {
            grid-column: 1 / -1 !important;
            width: 100% !important;
          }

          .fromone-settings-page .settings-profile-summary {
            grid-template-columns: 1fr !important;
          }
        }


        /* Easy-flow settings: one task at a time */
        .fromone-settings-page .settings-extra-choice-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 12px !important;
          margin-top: 8px !important;
        }

        .fromone-settings-page .settings-extra-choice {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          align-items: center !important;
          gap: 16px !important;
          padding: 16px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 18px !important;
          background: #f8fafc !important;
        }

        .fromone-settings-page .settings-extra-choice.is-open {
          border-color: #ffd2e5 !important;
          background: #fff8fc !important;
        }

        .fromone-settings-page .settings-extra-choice h3 {
          margin: 5px 0 4px !important;
          color: #071b49 !important;
          font-size: 1.08rem !important;
          line-height: 1.15 !important;
          font-weight: 800 !important;
          letter-spacing: -0.035em !important;
        }

        .fromone-settings-page .settings-extra-choice p {
          margin: 0 !important;
          color: #52617a !important;
          font-size: 0.86rem !important;
          line-height: 1.4 !important;
          font-weight: 600 !important;
        }

        .fromone-settings-page .settings-extra-choice .settings-panel-toggle {
          min-width: 150px !important;
          white-space: nowrap !important;
        }

        .fromone-settings-page .settings-smilez-booking-editor,
        .fromone-settings-page .settings-business-image-field,
        .fromone-settings-page .settings-geo-card {
          margin-top: 14px !important;
        }

        @media (max-width: 900px) {
          .fromone-settings-page .settings-extra-choice-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 620px) {
          .fromone-settings-page .settings-extra-choice {
            grid-template-columns: 1fr !important;
          }

          .fromone-settings-page .settings-extra-choice .settings-panel-toggle {
            width: 100% !important;
            min-width: 0 !important;
          }
        }


        /* Task-first, granny-proof settings flow */
        .fromone-settings-page .settings-task-chooser {
          display: grid !important;
          gap: 14px !important;
          margin-bottom: 16px !important;
          padding: 20px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 20px !important;
          background: #ffffff !important;
        }

        .fromone-settings-page .settings-task-chooser-heading {
          display: grid !important;
          gap: 5px !important;
        }

        .fromone-settings-page .settings-task-chooser-heading > span {
          color: #f72585 !important;
          font-size: 0.7rem !important;
          font-weight: 800 !important;
          letter-spacing: 0.12em !important;
          text-transform: uppercase !important;
        }

        .fromone-settings-page .settings-task-chooser-heading h2 {
          margin: 0 !important;
          color: #071b49 !important;
          font-size: 1.45rem !important;
          line-height: 1.1 !important;
          font-weight: 800 !important;
          letter-spacing: -0.04em !important;
        }

        .fromone-settings-page .settings-task-chooser-heading p {
          margin: 0 !important;
          color: #52617a !important;
          font-size: 0.9rem !important;
          line-height: 1.45 !important;
          font-weight: 600 !important;
        }

        .fromone-settings-page .settings-task-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .fromone-settings-page .settings-task-card {
          display: grid !important;
          grid-template-columns: 32px minmax(0, 1fr) !important;
          align-items: center !important;
          gap: 3px 10px !important;
          min-height: 88px !important;
          padding: 14px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 16px !important;
          background: #f8fafc !important;
          color: #071b49 !important;
          text-align: left !important;
          cursor: pointer !important;
        }

        .fromone-settings-page .settings-task-card:hover,
        .fromone-settings-page .settings-task-card.is-active {
          border-color: #ffd2e5 !important;
          background: #fff8fc !important;
        }

        .fromone-settings-page .settings-task-card > span {
          grid-row: 1 / span 2 !important;
          display: grid !important;
          place-items: center !important;
          width: 32px !important;
          height: 32px !important;
          border-radius: 999px !important;
          background: #f72585 !important;
          color: #ffffff !important;
          font-size: 0.68rem !important;
          font-weight: 800 !important;
        }

        .fromone-settings-page .settings-task-card strong {
          font-size: 0.95rem !important;
          line-height: 1.15 !important;
          font-weight: 800 !important;
        }

        .fromone-settings-page .settings-task-card small {
          color: #64748b !important;
          font-size: 0.76rem !important;
          line-height: 1.3 !important;
          font-weight: 700 !important;
        }

        .fromone-settings-page .settings-editor-panel.is-collapsed {
          display: none !important;
        }

        .fromone-settings-page .settings-editor-panel[data-settings-mode="bookings"] .settings-website-scan-card {
          display: none !important;
        }

        .fromone-settings-page .settings-editor-panel[data-settings-mode="bookings"] .settings-form-grid > label:nth-of-type(-n+10) {
          display: none !important;
        }

        .fromone-settings-page .settings-editor-panel[data-settings-mode="business"] .settings-geo-card {
          display: none !important;
        }

        .fromone-settings-page .settings-editor-panel .settings-panel-toggle {
          min-width: 92px !important;
        }

        @media (max-width: 900px) {
          .fromone-settings-page .settings-task-grid {
            grid-template-columns: 1fr !important;
          }
        }


        /* Corrected Settings flow */
        .fromone-settings-page .settings-smiles-status-panel {
          margin-top: 0 !important;
          margin-bottom: 16px !important;
        }

        .fromone-settings-page .settings-weekly-sets-panel {
          margin-top: 16px !important;
        }


        /* Saved sets already have their own View posts buttons */
        .fromone-settings-page .settings-weekly-posts-link {
          display: none !important;
        }


        .settings-client-status {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.6fr);
          gap: 20px;
          margin: 22px 0;
          padding: 22px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 22px;
          background: #ffffff;
        }

        .settings-client-status-copy h2 {
          margin: 6px 0 8px;
          color: #0f172a;
          font-size: clamp(1.35rem, 3vw, 2rem);
          line-height: 1.08;
        }

        .settings-client-status-copy p {
          margin: 0;
          color: #64748b;
          font-weight: 700;
          line-height: 1.55;
        }

        .settings-client-status-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .settings-client-status-grid > div {
          display: grid;
          gap: 4px;
          min-height: 72px;
          padding: 14px;
          border: 1px solid #e7edf5;
          border-radius: 16px;
          background: #f8fafc;
        }

        .settings-client-status-grid span {
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
        }

        .settings-client-status-grid strong {
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
        }

        .settings-client-task-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        @media (max-width: 760px) {
          .settings-client-status {
            grid-template-columns: 1fr;
            padding: 18px;
          }

          .settings-client-status-grid,
          .settings-client-task-grid {
            grid-template-columns: 1fr;
          }

          .settings-client-status-grid > div {
            min-height: 62px;
          }
        }

        .fromone-settings-page .settings-force-hidden {
          display: none !important;
        }

        .settings-profile-section-heading {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 18px 0 14px;
          padding: 14px 16px;
          border: 1px solid #e4eaf3;
          border-radius: 16px;
          background: #ffffff;
        }

        .settings-profile-section-heading > span {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          border-radius: 999px;
          background: #f72585;
          color: #ffffff;
          font-weight: 950;
        }

        .settings-profile-section-heading h3 {
          margin: 0;
          color: #0f2454;
          font-size: 1.05rem;
        }

        .settings-profile-section-heading p {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 0.82rem;
          font-weight: 700;
        }

        /* Collapsible Saved post sets */
        .fromone-settings-page .settings-weekly-panel-head {
          grid-template-columns: auto minmax(0, 1fr) auto !important;
          align-items: center !important;
        }

        .fromone-settings-page .settings-weekly-toggle {
          min-width: 150px !important;
          white-space: nowrap !important;
        }

        .fromone-settings-page .settings-weekly-collapsible {
          display: grid !important;
          gap: 16px !important;
        }

        .fromone-settings-page .settings-weekly-collapsed-summary {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          align-items: center !important;
          gap: 4px 16px !important;
          padding: 16px 18px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 16px !important;
          background: #f8fafc !important;
        }

        .fromone-settings-page .settings-weekly-collapsed-summary span {
          color: #f72585 !important;
          font-size: 0.7rem !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          letter-spacing: 0.1em !important;
          text-transform: uppercase !important;
        }

        .fromone-settings-page .settings-weekly-collapsed-summary strong {
          grid-column: 2 !important;
          grid-row: 1 / span 2 !important;
          color: #071b49 !important;
          font-size: 1rem !important;
          font-weight: 800 !important;
        }

        .fromone-settings-page .settings-weekly-collapsed-summary p {
          margin: 0 !important;
          color: #64748b !important;
          font-size: 0.86rem !important;
          line-height: 1.4 !important;
          font-weight: 600 !important;
        }

        @media (max-width: 700px) {
          .fromone-settings-page .settings-weekly-panel-head {
            grid-template-columns: auto minmax(0, 1fr) !important;
          }

          .fromone-settings-page .settings-weekly-toggle {
            grid-column: 1 / -1 !important;
            width: 100% !important;
            min-width: 0 !important;
          }

          .fromone-settings-page .settings-weekly-collapsed-summary {
            grid-template-columns: 1fr !important;
          }

          .fromone-settings-page .settings-weekly-collapsed-summary strong {
            grid-column: auto !important;
            grid-row: auto !important;
          }
        }


        /* EXACT SHARED PAGE SHELL — POSTS / BOOKINGS / REPORTS */
        body:has(.fromone-settings-page) {
          background: var(--posts-bg) !important;
        }

        body:has(.fromone-settings-page) .main-content {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 38px clamp(24px, 4vw, 54px) 90px !important;
          background: var(--posts-bg) !important;
          overflow-x: hidden !important;
        }

        .fromone-settings-page.settings-create-style-page {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          overflow: visible !important;
        }

        .fromone-settings-page #fromone-standard-shell.settings-create-style-card {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          overflow: visible !important;
        }

        .fromone-settings-page .settings-create-hero {
          width: 100% !important;
          max-width: 790px !important;
          margin: 0 0 28px !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          text-align: left !important;
        }

        .fromone-settings-page .settings-create-hero h1 {
          max-width: 760px !important;
          margin: 0 0 12px !important;
          color: var(--posts-navy) !important;
          font-size: clamp(2.6rem, 5vw, 4.45rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.06em !important;
          text-align: left !important;
        }

        .fromone-settings-page .settings-create-hero p {
          max-width: 720px !important;
          margin: 0 !important;
          color: var(--posts-muted) !important;
          font-size: 1.03rem !important;
          line-height: 1.56 !important;
          text-align: left !important;
        }

        .fromone-settings-page .settings-create-eyebrow {
          display: block !important;
          margin: 0 0 10px !important;
          color: var(--posts-pink) !important;
          font-size: 0.74rem !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: 0.14em !important;
          text-transform: uppercase !important;
          text-align: left !important;
        }

        .fromone-settings-page .settings-client-status,
        .fromone-settings-page .settings-task-chooser,
        .fromone-settings-page .settings-smiles-status-card {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 0 22px !important;
          padding: 22px !important;
          border: 1px solid var(--posts-border) !important;
          border-radius: 26px !important;
          background: rgba(255, 255, 255, 0.84) !important;
          box-shadow: var(--posts-shadow) !important;
          backdrop-filter: blur(10px) !important;
        }

        @media (max-width: 700px) {
          body:has(.fromone-settings-page) .main-content {
            padding: 24px 16px 100px !important;
          }

          .fromone-settings-page .settings-create-hero h1 {
            font-size: clamp(2.25rem, 11vw, 3rem) !important;
          }

          .fromone-settings-page .settings-create-hero p {
            font-size: 0.95rem !important;
          }

          .fromone-settings-page .settings-client-status,
          .fromone-settings-page .settings-task-chooser,
          .fromone-settings-page .settings-smiles-status-card {
            padding: 17px !important;
            border-radius: 21px !important;
          }
        }



        /* SETTINGS — FULL PILL ACTION BUTTONS */
        .fromone-settings-page button:not([role="switch"]),
        .fromone-settings-page a[class*="button"],
        .fromone-settings-page a[class*="action"],
        .fromone-settings-page .button-row a,
        .fromone-settings-page .settings-social-button-row a {
          border-radius: 999px !important;
        }

      `}</style>
    </main>
  );

  return (
    <>
      {loading ? (
        <div
          className="premium-card"
          aria-label="Settings loading"
          style={{
            maxWidth: 1120,
            margin: '0 auto 22px',
            borderRadius: 34,
            border: '1px solid rgba(255, 212, 59, 0.22)',
            background:
              'radial-gradient(circle at top, rgba(255, 212, 59, 0.12), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.028))',
            boxShadow: '0 30px 96px rgba(0,0,0,0.28)',
            padding: 'clamp(22px, 3.5vw, 38px)',
          }}
        >
          <div className="page-eyebrow">Settings</div>
          <div
            style={{
              width: 'min(520px, 100%)',
              height: 42,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.08)',
              margin: '10px 0 18px',
            }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                typeof window !== 'undefined' && window.innerWidth <= 760
                  ? '1fr'
                  : 'repeat(2, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {[1, 2].map((item) => (
              <div
                key={item}
                style={{
                  minHeight: 150,
                  borderRadius: 24,
                  background: 'rgba(255,255,255,0.055)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </div>
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
                Add your business details once, connect publishing when you are ready, then create posts from the Dashboard.
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
              Complete your business profile, connect Meta when you want autoposting, then create posts from your Dashboard.
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
              <button
                type="button"
                className={`card settings-setup-step-card settings-setup-clickable-card ${
                  setupProfileComplete ? 'is-complete' : ''
                }`}
                onClick={openProfileEditor}
                aria-label="Go to Business Profile setup"
                style={{
                  padding: 18,
                  borderRadius: 24,
                  background: setupProfileComplete
                    ? 'linear-gradient(145deg, rgba(61, 220, 151, 0.18), rgba(61, 220, 151, 0.07))'
                    : 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                }}
              >
                <span className="status-pill">Step 1</span>
                {setupProfileComplete && (
                  <span className="settings-step-complete-mark" aria-hidden="true">✓</span>
                )}
                <h3 style={{ margin: '14px 0 8px', fontSize: 24 }}>Set up profile</h3>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  Add the business name, industry, location, services and customers.
                </p>
              </button>

              <button
                type="button"
                className={`card settings-setup-step-card settings-setup-clickable-card ${
                  setupChannelsComplete ? 'is-complete' : ''
                }`}
                onClick={scrollToSocialConnections}
                aria-label="Go to social media connection section"
                style={{
                  padding: 18,
                  borderRadius: 24,
                  background: setupChannelsComplete
                    ? 'linear-gradient(145deg, rgba(61, 220, 151, 0.18), rgba(61, 220, 151, 0.07))'
                    : 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                }}
              >
                <span className="status-pill">Step 2</span>
                {setupChannelsComplete && (
                  <span className="settings-step-complete-mark" aria-hidden="true">✓</span>
                )}
                <h3 style={{ margin: '14px 0 8px', fontSize: 24 }}>Connect channels</h3>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  Connect Facebook and Instagram for autoposting. TikTok can stay manual.
                </p>
              </button>

              <button
                type="button"
                className={`card settings-setup-step-card settings-setup-clickable-card ${
                  setupCreatePostsReady ? 'is-complete' : ''
                }`}
                onClick={scrollToCreatePosts}
                aria-label="Go to create posts section"
                style={{
                  padding: 18,
                  borderRadius: 24,
                  background: setupCreatePostsReady
                    ? 'linear-gradient(145deg, rgba(61, 220, 151, 0.18), rgba(61, 220, 151, 0.07))'
                    : 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                }}
              >
                <span className="status-pill">Step 3</span>
                {setupCreatePostsReady && (
                  <span className="settings-step-complete-mark" aria-hidden="true">✓</span>
                )}
                <h3 style={{ margin: '14px 0 8px', fontSize: 24 }}>Create posts</h3>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  Upload photos, videos or flyers from the Dashboard. You’ll review everything before publishing.
                </p>
              </button>
            </div>
          </section>

          <section
            className="premium-card settings-numbered-section settings-quick-profile-card"
            style={{
              maxWidth: 1120,
              margin: '0 auto 22px',
              borderRadius: 34,
              border: '1px solid rgba(255, 212, 59, 0.22)',
              background:
                'radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))',
              boxShadow: '0 26px 84px rgba(0,0,0,0.28)',
              padding: 28,
            }}
          >
            <div className="settings-quick-profile-layout">
              <div className="settings-quick-profile-copy">
                <div className="settings-live-step-label">
                  <span>1</span>
                  <strong>Business Profile</strong>
                </div>

                <h2>
                  {simpleProfileComplete
                    ? `${businessName || 'Your business'} is ready.`
                    : 'Set up your business profile.'}
                </h2>

                <p>
                  {simpleProfileComplete
                    ? 'Your business profile is saved. You can edit it here whenever details change.'
                    : 'Add these details once so FromOne knows what you offer, who you want to reach and how your posts should sound.'}
                </p>

                <div className="settings-quick-profile-actions">
                  {simpleProfileComplete ? (
                    <>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={openProfileEditor}
                      >
                        Edit profile
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={
                          !simpleProfileComplete
                            ? 'primary-button settings-setup-profile-button-pulse'
                            : 'primary-button'
                        }
                        onClick={openProfileEditor}
                      >
                        {completedSimpleSteps > 0 ? 'Continue setup' : 'Set up profile'}
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setShowBusinessDetails(true);
                          window.setTimeout(() => {
                            document.getElementById('website-scan-optional')?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                          }, 80);
                        }}
                      >
                        Scan website instead
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="settings-quick-profile-progress">
                <div className="settings-quick-progress-topline">
                  <span className="page-eyebrow">Step {currentSimpleStep} of {totalSimpleSteps}</span>
                  <strong>{simpleProfilePercent}%</strong>
                </div>

                <div className="settings-quick-progress-bar" aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.max(simpleProfilePercent, completedSimpleSteps ? 12 : 0)}%`,
                    }}
                  />
                </div>

                <div className="settings-quick-step-list">
                  {simpleProfileSteps.map((item, index) => (
                    <div
                      key={item.label}
                      className={item.ready ? 'is-ready' : undefined}
                    >
                      <span>{index + 1}</span>
                      <strong>{item.label}</strong>
                      <small>{item.ready ? 'Complete' : 'Next'}</small>
                    </div>
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
                  <div className="page-eyebrow">Quick setup</div>
                  <h2>One simple card.</h2>
                  <p>
                    Add the details once, then continue straight to the Dashboard.
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

              <div id="website-setup-card" className="settings-client-simple-profile">
                <section
                  className={
                    !simpleProfileComplete
                      ? 'settings-one-card-setup settings-profile-card-pulse'
                      : 'settings-one-card-setup'
                  }
                >
                  <div className="settings-one-card-head settings-guided-profile-head">
                    <div>
                      <span className="settings-simple-step">Quick setup</span>
                      <h3>Business details</h3>
                      <p>
                        Start with the basics, then add audience and tone so FromOne can create less generic posts.
                      </p>
                    </div>


                  </div>

                  <div className="settings-guided-profile-intro">
                    <strong>Fill this in once.</strong>
                    <span>
                      FromOne uses these details every time it creates posts for this business.
                    </span>
                  </div>

                  <div className="settings-one-card-website settings-guided-website-card settings-website-simple-card">
                    <div className="settings-website-simple-head">
                      <div>
                        <span>Optional</span>
                        <strong>Use your website to help fill this in</strong>
                      </div>

                      <p>
                        Paste a website if you want FromOne to scan it. Otherwise, just fill the steps below.
                      </p>
                    </div>

                    <div className="settings-website-simple-row">
                      <label>
                        <strong>Website</strong>
                        <input
                          className="input"
                          value={websiteUrl}
                          onChange={(event) => setWebsiteUrl(event.target.value)}
                          placeholder="https://example.com"
                        />
                      </label>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={handleScanWebsite}
                        disabled={scanningWebsite || saving}
                      >
                        {scanningWebsite ? 'Scanning...' : 'Scan website'}
                      </button>
                    </div>
                  </div>

                  {scanMessage && (
                    <p className="settings-scan-message">
                      {scanMessage}
                    </p>
                  )}

                  <div className="settings-one-card-fields settings-guided-profile-fields">
                    <section className="settings-profile-step">
                      <div className="settings-profile-step-marker">1</div>
                      <div className="settings-profile-step-content">
                        <div className="settings-profile-step-copy">
                          <strong>The business</strong>
                          <span>Tell FromOne who the business is and where it works.</span>
                        </div>

                        <div className="settings-profile-step-fields">
                          <label>
                            <strong>Business name *</strong>
                            <span>What customers call the business.</span>
                            <input
                              className="input"
                              value={businessName}
                              onChange={(event) => setBusinessName(event.target.value)}
                              placeholder="Example: Baker Roofing"
                            />
                          </label>

                          <label>
                            <strong>Type of business *</strong>
                            <span>What does the business do?</span>
                            <input
                              className="input settings-mobile-editable-input"
                              value={industry}
                              onChange={(event) => setIndustry(event.target.value)}
                              autoComplete="organization-title"
                              inputMode="text"
                              placeholder="Example: Roofing, Beauty, Fitness"
                            />
                          </label>

                          <label>
                            <strong>Location</strong>
                            <span>Town, city or service area.</span>
                            <input
                              className="input settings-mobile-editable-input"
                              value={location}
                              onChange={(event) => setLocation(event.target.value)}
                              autoComplete="address-level2"
                              inputMode="text"
                              placeholder="Example: Manchester"
                            />
                          </label>

                          <label>
                            <strong>Address</strong>
                            <span>Business address for the Smiles listing.</span>
                            <input
                              className="input settings-mobile-editable-input"
                              value={address}
                              onChange={(event) => setAddress(event.target.value)}
                              autoComplete="street-address"
                              inputMode="text"
                              placeholder="Example: 1 Market Place, Stockport"
                            />
                          </label>

                          <label>
                            <strong>Postcode</strong>
                            <span>Used by Stockport Smilez for postcode search and local filtering.</span>
                            <input
                              className="input settings-mobile-editable-input"
                              value={postcode}
                              onChange={(event) => handlePostcodeChange(event.target.value)}
                onBlur={handlePostcodeBlur}
                              autoComplete="postal-code"
                              inputMode="text"
                              placeholder="Example: SK1 1AA"
                            />
                          </label>

                          <label>
                            <strong>Telephone</strong>
                            <span>Customer phone number.</span>
                            <input
                              className="input settings-mobile-editable-input"
                              value={phone}
                              onChange={(event) => setPhone(event.target.value)}
                              autoComplete="tel"
                              inputMode="tel"
                              placeholder="Example: 0161 123 4567"
                            />
                          </label>

                          <label>
                            <strong>Email</strong>
                            <span>Customer email address.</span>
                            <input
                              className="input settings-mobile-editable-input"
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              autoComplete="email"
                              inputMode="email"
                              placeholder="Example: hello@example.com"
                            />
                          </label>
                        </div>
                      </div>
                    </section>

                    <section className="settings-profile-step">
                      <div className="settings-profile-step-marker">2</div>
                      <div className="settings-profile-step-content">
                        <div className="settings-profile-step-copy">
                          <strong>What you offer</strong>
                          <span>This helps FromOne write posts around real services instead of generic captions.</span>
                        </div>

                        <div className="settings-profile-step-fields">
                          <label>
                            <strong>Services</strong>
                            <span>A few words is enough.</span>
                            <textarea
                              className="input"
                              value={services}
                              onChange={(event) => setServices(event.target.value)}
                              placeholder="Example: Roof repairs, gutter cleaning, emergency callouts"
                              rows={3}
                            />
                          </label>

                          <label>
                            <strong>Main offer or CTA</strong>
                            <span>What should posts usually encourage people to do?</span>
                            <textarea
                              className="input"
                              value={mainOffer}
                              onChange={(event) => setMainOffer(event.target.value)}
                              placeholder="Example: Request a quote, book a consultation, visit the showroom"
                              rows={3}
                            />
                          </label>

                          <label className="settings-wide-field">
                            <strong>About your business</strong>
                            <span>
                              Add a welcoming customer introduction for the About section of your Smilez venue page.
                            </span>
                            <textarea
                              className="input"
                              value={brandSummary}
                              onChange={(event) => setBrandSummary(event.target.value)}
                              placeholder="Example: Ember & Thyme is a relaxed modern British restaurant serving seasonal dishes in the heart of Stockport."
                              rows={4}
                              maxLength={800}
                            />
                          </label>
                        </div>
                      </div>
                    </section>

                    <section className="settings-profile-step">
                      <div className="settings-profile-step-marker">3</div>
                      <div className="settings-profile-step-content">
                        <div className="settings-profile-step-copy">
                          <strong>Who you want to reach</strong>
                          <span>Audience and customer problems make posts more specific and useful.</span>
                        </div>

                        <div className="settings-profile-step-fields">
                          <label>
                            <strong>Target audience</strong>
                            <span>Who should the posts speak to?</span>
                            <textarea
                              className="input"
                              value={targetAudience}
                              onChange={(event) => setTargetAudience(event.target.value)}
                              placeholder="Example: Local homeowners, landlords, shop owners, event organisers"
                              rows={3}
                            />
                          </label>

                          <label>
                            <strong>Customer pain points</strong>
                            <span>What problems do customers need solving?</span>
                            <textarea
                              className="input"
                              value={customerPainPoints}
                              onChange={(event) => setCustomerPainPoints(event.target.value)}
                              placeholder="Example: Needs it fast, wants a professional finish, unsure what size or material to choose"
                              rows={3}
                            />
                          </label>
                        </div>
                      </div>
                    </section>

                    <section className="settings-profile-step">
                      <div className="settings-profile-step-marker">4</div>
                      <div className="settings-profile-step-content">
                        <div className="settings-profile-step-copy">
                          <strong>How posts should sound</strong>
                          <span>Set the voice and style so FromOne creates content that feels on-brand.</span>
                        </div>

                        <div className="settings-profile-step-fields">
                          <label>
                            <strong>Tone of voice</strong>
                            <span>How should the posts sound?</span>
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
                          </label>

                          <label>
                            <strong>Content style</strong>
                            <span>What type of posts should FromOne create?</span>
                            <textarea
                              className="input"
                              value={contentStyle}
                              onChange={(event) => setContentStyle(event.target.value)}
                              placeholder="Example: Project showcases, before and afters, tips, offers, local business support"
                              rows={3}
                            />
                          </label>
                        </div>
                      </div>
                    </section>
                  </div>
                  <div className="settings-client-quick-save settings-one-card-save">
                    <button type="button" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? 'Saving...' : 'Save profile'}
                    </button>

                    <span>
                      Step 3 below will take you to the Dashboard when you are ready to create posts.
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      padding: 16,
                      borderRadius: 22,
                      border: '1px solid rgba(255, 212, 59, 0.22)',
                      background:
                        'linear-gradient(145deg, rgba(255, 212, 59, 0.095), rgba(255,255,255,0.045))',
                      display: 'grid',
                      gap: 12,
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          display: 'block',
                          color: '#ffffff',
                          fontSize: 18,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        Create your Smiles listing
                      </strong>
                      <span
                        style={{
                          display: 'block',
                          marginTop: 5,
                          color: 'rgba(248,250,252,0.72)',
                          lineHeight: 1.45,
                          fontWeight: 750,
                        }}
                      >
                        When you save, FromOne updates an existing linked
                        Smilez profile immediately. Only a brand-new listing is
                        sent to Smilez admin before it appears publicly.
                      </span>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        width: 'fit-content',
                        minHeight: 34,
                        alignItems: 'center',
                        padding: '7px 12px',
                        borderRadius: 999,
                        background:
                          smilesListingStatusTone === 'live'
                            ? 'rgba(61, 220, 151, 0.14)'
                            : smilesListingStatusTone === 'failed'
                              ? 'rgba(248, 113, 113, 0.14)'
                            : 'rgba(255, 212, 59, 0.12)',
                        border:
                          smilesListingStatusTone === 'live'
                            ? '1px solid rgba(61, 220, 151, 0.28)'
                            : smilesListingStatusTone === 'failed'
                              ? '1px solid rgba(248, 113, 113, 0.3)'
                            : '1px solid rgba(255, 212, 59, 0.24)',
                        color:
                          smilesListingStatusTone === 'live'
                            ? '#a7f3d0'
                            : smilesListingStatusTone === 'failed'
                              ? '#fecaca'
                              : '#ffe58a',
                        fontSize: 12,
                        fontWeight: 1000,
                      }}
                    >
                      {getSmilesListingStatusLabel()}
                    </span>
                  </div>
                </section>
              </div>
            </section>
          )}

          <section
            ref={socialConnectionsRef}
            id="publishing-connections"
            className="premium-card settings-numbered-section settings-social-simple-section"
            style={{
              scrollMarginTop: 96,
              maxWidth: 1120,
              margin: '0 auto 22px',
              borderRadius: 34,
              border: '1px solid rgba(255, 212, 59, 0.18)',
              background:
                'radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.032))',
              boxShadow: '0 26px 84px rgba(0,0,0,0.24)',
            }}
          >
            <div className="settings-social-simple-head">
              <div>
                <div className="settings-live-step-label">
                  <span>2</span>
                  <strong>Social media</strong>
                </div>

                <h2>Connect social media.</h2>
                <p>
                  Optional. Connect Meta for Facebook and Instagram autoposting, or skip this and post manually.
                </p>
              </div>

              <button
                type="button"
                className="settings-social-info-button"
                onClick={() => setShowPublishingRules((current) => !current)}
              >
                {showPublishingRules ? 'Hide info' : 'What can connect?'}
              </button>
            </div>

            {showPublishingRules && (
              <div className="settings-social-info-popover">
                <strong>Quick note</strong>
                <p>
                  Facebook and Instagram direct publishing need a connected business/professional Meta account.
                  Personal accounts can still use FromOne to create, edit, copy and manually publish posts.
                  TikTok stays manual for now.
                </p>
              </div>
            )}

            <div className="settings-social-simple-grid">
              <article className="settings-social-connect-card">
                <div>
                  <span className="page-eyebrow">Facebook & Instagram</span>
                  <h3>
                    {hasMetaConnection ? 'Meta connected' : 'Connect Meta'}
                  </h3>
                  <p>
                    {hasMetaConnection
                      ? 'Autoposting is available for connected Facebook and Instagram accounts.'
                      : 'Connect once if you want FromOne to autopost to Facebook or Instagram.'}
                  </p>
                </div>

                {hasMetaConnection && (
                  <div className="settings-social-account-summary">
                    <div>
                      <strong>Facebook</strong>
                      <span>{primaryMetaConnection?.page_name || 'Page connected'}</span>
                    </div>

                    <div>
                      <strong>Instagram</strong>
                      <span>
                        {primaryMetaConnection?.instagram_username
                          ? `@${primaryMetaConnection.instagram_username}`
                          : hasInstagramConnection
                            ? 'Account connected'
                            : 'Not connected'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="settings-social-button-row">
                  <button
                    type="button"
                    onClick={connectMetaAccount}
                    disabled={loadingConnections || metaConnectionBusy}
                  >
                    {hasMetaConnection ? 'Reconnect / manage' : 'Connect Meta'}
                  </button>

                  {hasMetaConnection && (
                    <button
                      type="button"
                      className="secondary-button danger-button"
                      onClick={() => disconnectMetaAccount(primaryMetaConnection?.id)}
                      disabled={metaConnectionBusy}
                    >
                      {metaConnectionBusy ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  )}
                </div>
              </article>

              <article className="settings-social-connect-card is-manual">
                <div>
                  <span className="page-eyebrow">Manual option</span>
                  <h3>TikTok and personal accounts</h3>
                  <p>
                    FromOne still creates the caption and prepared media. The client copies/opens the social app and posts manually.
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section
            ref={createPostsRef}
            id="create-posts-section"
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
                  Create your first posts.
                </h2>
                <p style={{ maxWidth: 820, margin: 0 }}>
                  Go to Dashboard to upload photos, videos or flyers. FromOne will create posts for you to review before anything is published.
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
                  You’ll review everything before anything is published.
                </p>
              </div>
            </div>
          </section>

          <section
            className="premium-card settings-numbered-section settings-saved-weekly-sets-section"
            style={{
              maxWidth: 1120,
              margin: '0 auto 22px',
              borderRadius: 34,
              border: '1px solid rgba(255, 212, 59, 0.18)',
              background:
                'radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.032))',
              boxShadow: '0 26px 84px rgba(0,0,0,0.24)',
            }}
          >
            <div className="settings-saved-sets-head">
              <div>
                <div className="settings-live-step-label">
                  <span>4</span>
                  <strong>Saved weekly sets</strong>
                </div>

                <h2>Manage saved weekly sets.</h2>
                <p>
                  FromOne keeps up to 4 saved weekly post sets. Delete old tests or empty sets here
                  when you need space to create a new one.
                </p>
              </div>

              <a href="/posts" className="secondary-button">
                View Posts
              </a>
            </div>

            <div className="settings-saved-sets-limit-card">
              <strong>{savedWeeklySets.length} of 4 saved sets used</strong>
              <span>
                {savedWeeklySets.length >= 4
                  ? 'Limit reached. Delete one old or empty set to create another.'
                  : 'You still have space to create another weekly post set.'}
              </span>
            </div>

            {loadingSavedWeeklySets ? (
              <div className="settings-saved-sets-empty">
                Checking saved weekly sets...
              </div>
            ) : savedWeeklySets.length === 0 ? (
              <div className="settings-saved-sets-empty">
                No saved weekly post sets yet.
              </div>
            ) : (
              <div className="settings-saved-sets-list">
                {savedWeeklySets.map((set) => {
                  const postCount = getSavedWeeklySetPostCount(set);

                  return (
                    <article key={set.id} className="settings-saved-set-row">
                      <div>
                        <strong>{getSavedWeeklySetName(set)}</strong>
                        <span>
                          {formatSavedWeeklySetDate(set.created_at)} · {postCount} post{postCount === 1 ? '' : 's'}
                        </span>

                        <div
                          aria-label="Saved post thumbnails"
                          style={{
                            display: 'flex',
                            gap: 6,
                            flexWrap: 'wrap',
                            marginTop: 10,
                          }}
                        >
                          {getSavedWeeklySetPreviewPosts(set).map((post) => {
                            const previewUrl = String(
                              post.media_url || post.image_url || '',
                            );
                            const isVideo =
                              String(post.media_type || '')
                                .toLowerCase()
                                .includes('video') ||
                              /\.(mp4|mov|webm|m4v)(\?|$)/i.test(previewUrl);

                            return (
                              <div
                                key={post.id}
                                style={{
                                  width: 46,
                                  height: 46,
                                  overflow: 'hidden',
                                  borderRadius: 10,
                                  border: '1px solid rgba(7, 27, 73, 0.12)',
                                  background: 'rgba(7, 27, 73, 0.05)',
                                }}
                              >
                                {isVideo ? (
                                  <video
                                    src={previewUrl}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      display: 'block',
                                    }}
                                  />
                                ) : (
                                  <img
                                    src={previewUrl}
                                    alt=""
                                    loading="lazy"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      display: 'block',
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="secondary-button danger-button"
                        onClick={() => deleteSavedWeeklySet(set)}
                        disabled={deletingWeeklySetId === set.id}
                      >
                        {deletingWeeklySetId === set.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </article>
                  );
                })}
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
                      Delete saved profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <style jsx global>{`

        .settings-one-card-fields {
          align-items: start;
        }

        .settings-one-card-fields label {
          min-width: 0;
        }

        .settings-one-card-fields textarea.input {
          resize: vertical;
        }

        .settings-one-card-fields label:nth-child(n + 5) {
          border: 1px solid rgba(255, 212, 59, 0.12);
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.055), transparent 34%),
            rgba(255,255,255,0.025);
          border-radius: 22px;
          padding: 14px;
        }

        .settings-one-card-fields label:nth-child(5)::before,
        .settings-one-card-fields label:nth-child(6)::before,
        .settings-one-card-fields label:nth-child(7)::before,
        .settings-one-card-fields label:nth-child(8)::before,
        .settings-one-card-fields label:nth-child(9)::before {
          display: inline-flex;
          width: fit-content;
          margin-bottom: 8px;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.16);
          color: #ffe58a;
          font-size: 0.68rem;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .settings-one-card-fields label:nth-child(5)::before {
          content: "Recommended";
        }

        .settings-one-card-fields label:nth-child(6)::before,
        .settings-one-card-fields label:nth-child(7)::before {
          content: "Improves posts";
        }

        .settings-one-card-fields label:nth-child(8)::before,
        .settings-one-card-fields label:nth-child(9)::before {
          content: "Less generic";
        }



        /* Mobile settings simplification: keep desktop advanced, make phone view client-simple */
        @media (max-width: 760px) {
          .settings-setup-guide {
            display: none !important;
          }

          .settings-quick-profile-card,
          .settings-profile-wizard-card,
          .settings-social-simple-section,
          .settings-saved-weekly-sets-section,
          .settings-create-posts-section,
          .manual-collapse-card {
            width: min(100%, 430px) !important;
            margin: 0 auto 16px !important;
            border-radius: 28px !important;
            padding: 18px !important;
          }

          .settings-quick-profile-card {
            margin-top: 0 !important;
          }

          .settings-quick-profile-layout {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .settings-quick-profile-copy {
            text-align: center !important;
            display: grid !important;
            justify-items: center !important;
          }

          .settings-live-step-label {
            justify-content: center !important;
            margin-inline: auto !important;
          }

          .settings-quick-profile-copy h2,
          .settings-social-simple-head h2,
          .settings-create-posts-section h2,
          .settings-saved-sets-head h2 {
            text-align: center !important;
            font-size: clamp(1.9rem, 9vw, 2.45rem) !important;
            line-height: 0.96 !important;
            letter-spacing: -0.055em !important;
            margin: 10px auto 8px !important;
          }

          .settings-quick-profile-copy p,
          .settings-social-simple-head p,
          .settings-create-posts-section p,
          .settings-saved-sets-head p {
            text-align: center !important;
            max-width: 330px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            font-size: 0.92rem !important;
            line-height: 1.45 !important;
          }

          .settings-quick-profile-progress {
            display: none !important;
          }

          .settings-quick-profile-actions {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 10px !important;
            margin-top: 16px !important;
          }

          .settings-quick-profile-actions .primary-button,
          .settings-quick-profile-actions .secondary-button,
          .settings-quick-profile-actions button,
          .settings-quick-profile-actions a {
            width: 100% !important;
            min-height: 46px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
          }

          .settings-profile-wizard-head {
            display: grid !important;
            grid-template-columns: 1fr !important;
            justify-items: center !important;
            text-align: center !important;
            gap: 14px !important;
          }

          .settings-profile-wizard-head h2 {
            font-size: clamp(1.9rem, 9vw, 2.55rem) !important;
            line-height: 0.96 !important;
            letter-spacing: -0.055em !important;
            margin: 8px 0 !important;
          }

          .settings-profile-wizard-head p {
            max-width: 330px !important;
            margin-inline: auto !important;
            line-height: 1.45 !important;
          }

          .settings-one-card-setup {
            padding: 18px !important;
            border-radius: 26px !important;
          }

          .settings-one-card-head {
            display: grid !important;
            grid-template-columns: 1fr !important;
            justify-items: center !important;
            text-align: center !important;
            gap: 18px !important;
            margin-bottom: 22px !important;
          }

          .settings-one-card-head > div {
            display: grid !important;
            justify-items: center !important;
            gap: 10px !important;
          }

          .settings-one-card-head h3 {
            margin: 4px 0 2px !important;
            font-size: clamp(1.8rem, 9vw, 2.4rem) !important;
            line-height: 0.98 !important;
          }

          .settings-one-card-head p {
            margin: 0 0 6px !important;
            max-width: 320px !important;
          }

          .settings-one-card-head .secondary-button {
            width: 100% !important;
            min-height: 46px !important;
            margin-top: 8px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .settings-one-card-website {
            margin-top: 22px !important;
            padding: 16px !important;
            border-radius: 24px !important;
          }

          .settings-one-card-fields {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }


          .settings-one-card-fields label:nth-child(n + 5) {
            padding: 14px !important;
            border-radius: 22px !important;
            text-align: left !important;
          }

          .settings-one-card-fields label:nth-child(n + 5) strong,
          .settings-one-card-fields label:nth-child(n + 5) span {
            text-align: left !important;
          }



          .settings-client-quick-save,
          .settings-one-card-save {
            padding: 14px !important;
            border-radius: 22px !important;
          }

          .settings-client-quick-save button,
          .settings-one-card-save button {
            min-height: 48px !important;
            border-radius: 16px !important;
          }

          .settings-client-quick-save span,
          .settings-one-card-save span {
            text-align: center !important;
            display: block !important;
            margin-top: 10px !important;
          }

          .settings-social-simple-head {
            display: grid !important;
            grid-template-columns: 1fr !important;
            justify-items: center !important;
            text-align: center !important;
            gap: 12px !important;
          }

          .settings-social-info-button {
            width: 100% !important;
            min-height: 42px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .settings-social-info-popover {
            margin-top: 14px !important;
            text-align: center !important;
          }

          .settings-social-simple-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            margin-top: 16px !important;
          }

          .settings-social-connect-card {
            padding: 16px !important;
            border-radius: 24px !important;
            text-align: center !important;
          }

          .settings-social-connect-card h3 {
            font-size: 1.35rem !important;
            line-height: 1.08 !important;
            margin: 8px 0 !important;
          }

          .settings-social-account-summary {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 10px !important;
            margin: 14px 0 !important;
          }

          .settings-social-button-row {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          .settings-social-button-row button,
          .settings-social-button-row a {
            width: 100% !important;
            min-height: 46px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .settings-create-posts-section > div {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            text-align: center !important;
          }

          .settings-create-posts-section > div > div:first-child {
            display: grid !important;
            justify-items: center !important;
          }

          .settings-create-posts-section > div > div:last-child {
            width: 100% !important;
            padding: 14px !important;
          }

          .settings-create-posts-section button {
            min-height: 48px !important;
            border-radius: 16px !important;
          }

          .settings-saved-sets-head {
            display: grid !important;
            grid-template-columns: 1fr !important;
            justify-items: center !important;
            text-align: center !important;
            gap: 14px !important;
          }

          .settings-saved-sets-head .secondary-button {
            width: 100% !important;
            min-height: 44px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .settings-saved-sets-limit-card {
            text-align: center !important;
            margin-top: 14px !important;
            border-radius: 22px !important;
          }

          .settings-saved-sets-list {
            display: grid !important;
            gap: 10px !important;
          }

          .settings-saved-set-row {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            text-align: center !important;
            justify-items: center !important;
            padding: 14px !important;
            border-radius: 22px !important;
          }

          .settings-saved-set-row .danger-button {
            width: 100% !important;
            min-height: 42px !important;
          }

          .manual-collapse-card {
            opacity: 0.78 !important;
          }

          .manual-collapse-card .manual-collapse-content {
            text-align: center !important;
          }

          .manual-collapse-card .secondary-button {
            width: 100% !important;
            min-height: 44px !important;
          }

          .settings-profile-modal {
            width: min(100% - 22px, 430px) !important;
            max-height: min(86vh, 760px) !important;
            overflow: auto !important;
            border-radius: 28px !important;
            padding: 18px !important;
          }

          .settings-profile-modal-head {
            display: grid !important;
            grid-template-columns: 1fr !important;
            justify-items: center !important;
            text-align: center !important;
            gap: 12px !important;
          }

          .settings-profile-modal-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          .settings-profile-modal-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          .settings-profile-modal-actions button {
            width: 100% !important;
            min-height: 46px !important;
          }
        }



        /* Mobile spacing polish: give Business details more breathing room */
        @media (max-width: 760px) {
          .settings-one-card-head {
            gap: 18px !important;
            margin-bottom: 22px !important;
          }

          .settings-one-card-head > div {
            display: grid !important;
            gap: 10px !important;
          }

          .settings-one-card-head h3 {
            margin: 4px 0 2px !important;
          }

          .settings-one-card-head p {
            margin: 0 0 6px !important;
          }

          .settings-one-card-head .secondary-button {
            margin-top: 8px !important;
          }

          .settings-one-card-website {
            margin-top: 22px !important;
          }
        }








        /* Final mobile setup-card layout fix */
        .settings-setup-step-card {
          overflow: hidden !important;
        }

        .settings-step-complete-mark {
          position: static !important;
          inset: auto !important;
          transform: none !important;
          flex: none !important;
          z-index: 1 !important;
        }

        @media (max-width: 760px) {
          .settings-setup-step-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          .settings-setup-step-card,
          .settings-setup-step-card.card,
          button.settings-setup-step-card {
            width: 100% !important;
            min-height: auto !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            justify-items: center !important;
            align-items: start !important;
            align-content: start !important;
            gap: 10px !important;
            padding: 22px 18px !important;
            text-align: center !important;
            overflow: hidden !important;
          }

          .settings-setup-step-card .status-pill {
            grid-column: 1 !important;
            justify-self: center !important;
            margin: 0 auto !important;
          }

          .settings-setup-step-card .settings-step-complete-mark {
            grid-column: 1 !important;
            justify-self: center !important;
            margin: 8px auto 4px !important;
            width: 50px !important;
            height: 50px !important;
            font-size: 1.45rem !important;
          }

          .settings-setup-step-card h3 {
            grid-column: 1 !important;
            width: 100% !important;
            max-width: 280px !important;
            margin: 6px auto 2px !important;
            text-align: center !important;
            font-size: clamp(1.25rem, 6vw, 1.65rem) !important;
            line-height: 1.05 !important;
            overflow-wrap: normal !important;
          }

          .settings-setup-step-card p {
            grid-column: 1 !important;
            width: 100% !important;
            max-width: 320px !important;
            margin: 0 auto !important;
            text-align: center !important;
            line-height: 1.45 !important;
            overflow-wrap: normal !important;
          }

          .settings-setup-card-topline {
            display: contents !important;
          }

          .settings-setup-check {
            display: none !important;
          }
        }


        /* Force completed setup ticks under the pill, not beside it */
        .settings-setup-step-card {
          text-align: center !important;
          justify-items: center !important;
          align-content: start !important;
        }

        .settings-setup-card-topline {
          display: contents !important;
        }

        .settings-setup-check {
          display: none !important;
        }

        .settings-setup-step-card .status-pill {
          margin: 0 auto !important;
        }

        .settings-step-complete-mark {
          width: 58px !important;
          height: 58px !important;
          display: inline-grid !important;
          place-items: center !important;
          margin: 13px auto 4px !important;
          border-radius: 999px !important;
          background:
            radial-gradient(circle at 35% 24%, rgba(255, 255, 255, 0.55), transparent 25%),
            linear-gradient(135deg, #ffd43b, #f7b733) !important;
          color: #101420 !important;
          border: 1px solid rgba(255, 212, 59, 0.58) !important;
          box-shadow:
            0 18px 42px rgba(255, 212, 59, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.38) !important;
          font-size: 1.7rem !important;
          font-weight: 1000 !important;
          line-height: 1 !important;
        }

        .settings-setup-step-card:not(.is-complete) .settings-step-complete-mark {
          display: none !important;
        }


        /* Final setup-card tick polish */
        .settings-setup-step-card {
          text-align: center !important;
          justify-items: center !important;
          position: relative !important;
        }

        .settings-setup-step-card .status-pill {
          margin-inline: auto !important;
        }

        .settings-setup-step-card.is-complete .status-pill,
        .settings-setup-step-card[data-complete="true"] .status-pill {
          background: rgba(255, 212, 59, 0.14) !important;
          border-color: rgba(255, 212, 59, 0.34) !important;
          color: #ffe58a !important;
          box-shadow: 0 12px 28px rgba(255, 212, 59, 0.1) !important;
        }

        .settings-setup-step-card.is-complete .status-pill::after,
        .settings-setup-step-card[data-complete="true"] .status-pill::after {
          content: none !important;
          display: none !important;
        }

        .settings-setup-step-card .settings-step-complete-mark {
          width: 54px !important;
          height: 54px !important;
          display: inline-grid !important;
          place-items: center !important;
          margin: 12px auto 2px !important;
          border-radius: 999px !important;
          background:
            radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.52), transparent 24%),
            linear-gradient(135deg, #ffd43b, #f7b733) !important;
          color: #101420 !important;
          border: 1px solid rgba(255, 212, 59, 0.55) !important;
          box-shadow:
            0 18px 42px rgba(255, 212, 59, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
          font-size: 1.55rem !important;
          font-weight: 1000 !important;
          line-height: 1 !important;
        }

        .settings-setup-step-card:not(.is-complete):not([data-complete="true"]) .settings-step-complete-mark {
          display: none !important;
        }

        .settings-setup-step-card h3 {
          text-align: center !important;
        }

        .settings-setup-step-card p {
          text-align: center !important;
        }


        /* Phase 9 UI polish — Settings / Connections */
        .settings-setup-guide,
        .settings-quick-profile-card,
        .settings-profile-wizard-card,
        .settings-social-simple-section,
        .settings-create-posts-section,
        .manual-collapse-card,
        .premium-card {
          max-width: 1120px !important;
          margin-inline: auto !important;
        }

        .settings-setup-guide,
        .settings-quick-profile-card,
        .settings-profile-wizard-card,
        .settings-social-simple-section,
        .settings-create-posts-section {
          padding: clamp(22px, 3vw, 34px) !important;
          border-radius: 34px !important;
        }

        .settings-setup-guide .page-title {
          margin-bottom: 14px !important;
        }

        .settings-setup-guide .page-description,
        .settings-setup-guide p,
        .settings-quick-profile-copy p,
        .settings-social-simple-head p,
        .settings-create-posts-section p {
          color: rgba(248, 250, 252, 0.72) !important;
          line-height: 1.58 !important;
        }

        .settings-setup-step-grid {
          gap: 14px !important;
          margin-top: 22px !important;
        }

        .settings-setup-step-card {
          min-height: 164px !important;
          padding: 18px !important;
          border-radius: 24px !important;
          display: grid !important;
          align-content: start !important;
          gap: 8px !important;
        }

        .settings-setup-step-card h3 {
          margin: 10px 0 4px !important;
          line-height: 1.08 !important;
          letter-spacing: -0.035em !important;
        }

        .settings-quick-profile-layout {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 420px) !important;
          gap: clamp(18px, 2.4vw, 28px) !important;
          align-items: stretch !important;
        }

        .settings-quick-profile-copy,
        .settings-quick-profile-progress {
          min-width: 0 !important;
        }

        .settings-live-step-label {
          min-height: 34px !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 10px !important;
          margin-bottom: 14px !important;
          padding: 6px 10px !important;
          border-radius: 999px !important;
          background: rgba(255, 212, 59, 0.1) !important;
          border: 1px solid rgba(255, 212, 59, 0.18) !important;
          color: #ffe58a !important;
        }

        .settings-live-step-label span {
          width: 22px !important;
          height: 22px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 999px !important;
          background: rgba(255, 212, 59, 0.92) !important;
          color: #101420 !important;
          font-weight: 1000 !important;
        }

        .settings-live-step-label strong {
          font-size: 0.78rem !important;
          font-weight: 1000 !important;
          letter-spacing: 0.06em !important;
          text-transform: uppercase !important;
        }

        .settings-quick-profile-copy h2,
        .settings-social-simple-head h2,
        .settings-profile-wizard-head h2,
        .settings-create-posts-section h2 {
          margin-top: 0 !important;
          margin-bottom: 10px !important;
          color: #ffffff !important;
          line-height: 0.96 !important;
          letter-spacing: -0.06em !important;
        }

        .settings-quick-profile-actions,
        .settings-social-button-row,
        .settings-profile-modal-actions,
        .button-row,
        .settings-client-quick-save {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 10px !important;
        }

        .settings-quick-profile-actions {
          margin-top: 18px !important;
        }

        .primary-button,
        .secondary-button,
        .danger-button,
        .settings-social-info-button,
        .settings-social-button-row a,
        .settings-social-button-row button,
        .settings-save-strip button,
        .settings-client-quick-save button,
        .settings-profile-modal-actions button,
        .button-row button,
        .settings-create-posts-section button {
          min-height: 46px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          padding: 0 16px !important;
          border-radius: 15px !important;
          font-family: inherit !important;
          font-weight: 950 !important;
          line-height: 1 !important;
          text-decoration: none !important;
          cursor: pointer !important;
          appearance: none !important;
        }

        .primary-button,
        .settings-save-strip button,
        .settings-client-quick-save button,
        .settings-profile-modal-actions button:first-child,
        .settings-social-button-row button:first-child,
        .settings-create-posts-section button {
          background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
          color: #101420 !important;
          border: 1px solid rgba(255, 212, 59, 0.5) !important;
          box-shadow: 0 14px 30px rgba(255, 212, 59, 0.14) !important;
        }

        .secondary-button,
        .settings-social-info-button,
        .settings-social-button-row a,
        .settings-social-button-row button.secondary-button,
        .settings-profile-modal-actions button.secondary-button,
        .button-row button.secondary-button {
          background: rgba(255, 255, 255, 0.075) !important;
          color: rgba(248, 250, 252, 0.93) !important;
          border: 1px solid rgba(255, 255, 255, 0.13) !important;
          box-shadow: none !important;
        }

        .danger-button,
        .settings-social-button-row button.danger-button,
        .button-row button.danger-button {
          background: rgba(248, 113, 113, 0.12) !important;
          color: #fecaca !important;
          border-color: rgba(248, 113, 113, 0.28) !important;
        }

        button:disabled,
        .primary-button:disabled,
        .secondary-button:disabled {
          opacity: 0.62 !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
        }

        .settings-quick-profile-progress {
          display: grid !important;
          align-content: start !important;
          gap: 14px !important;
          padding: 18px !important;
          border-radius: 26px !important;
          background: rgba(2, 6, 23, 0.28) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .settings-quick-progress-topline {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 12px !important;
        }

        .settings-quick-progress-topline strong {
          color: #ffffff !important;
          font-size: 1.55rem !important;
          line-height: 1 !important;
        }

        .settings-quick-progress-bar {
          height: 12px !important;
          border-radius: 999px !important;
          overflow: hidden !important;
          background: rgba(255, 255, 255, 0.09) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .settings-quick-progress-bar span {
          display: block !important;
          height: 100% !important;
          border-radius: inherit !important;
          background: linear-gradient(135deg, #ffd43b, #f7b733) !important;
        }

        .settings-quick-step-list {
          display: grid !important;
          gap: 8px !important;
        }

        .settings-quick-step-list div {
          display: grid !important;
          grid-template-columns: 30px minmax(0, 1fr) auto !important;
          gap: 10px !important;
          align-items: center !important;
          padding: 11px 12px !important;
          border-radius: 16px !important;
          background: rgba(255, 255, 255, 0.055) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .settings-quick-step-list div.is-ready {
          background: rgba(61, 220, 151, 0.09) !important;
          border-color: rgba(61, 220, 151, 0.18) !important;
        }

        .settings-quick-step-list div span {
          width: 28px !important;
          height: 28px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 999px !important;
          background: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
          font-weight: 950 !important;
        }

        .settings-quick-step-list div.is-ready span {
          background: rgba(61, 220, 151, 0.18) !important;
          color: #a7f3d0 !important;
        }

        .settings-profile-wizard-head,
        .settings-social-simple-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 18px !important;
          align-items: start !important;
          margin-bottom: 20px !important;
        }

        .settings-one-card-setup,
        .settings-social-connect-card,
        .settings-profile-modal,
        .manual-collapse-card {
          border-radius: 28px !important;
          border: 1px solid rgba(255, 255, 255, 0.09) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.055), transparent 34%),
            rgba(15, 23, 42, 0.82) !important;
        }

        .settings-one-card-setup {
          padding: clamp(18px, 2.4vw, 26px) !important;
        }

        .settings-one-card-head,
        .settings-profile-modal-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 16px !important;
          align-items: start !important;
          margin-bottom: 18px !important;
        }

        .settings-one-card-head h3,
        .settings-profile-modal-head h3,
        .settings-social-connect-card h3 {
          margin: 8px 0 8px !important;
          color: #ffffff !important;
          line-height: 1.05 !important;
          letter-spacing: -0.04em !important;
        }

        .settings-one-card-fields,
        .settings-profile-modal-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 14px !important;
        }

        .settings-one-card-website {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 12px !important;
          align-items: end !important;
          margin-bottom: 14px !important;
          padding: 14px !important;
          border-radius: 22px !important;
          background: rgba(2, 6, 23, 0.26) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .settings-one-card-fields label,
        .settings-one-card-website label,
        .settings-profile-modal-grid label {
          display: grid !important;
          gap: 7px !important;
        }

        .settings-one-card-fields label strong,
        .settings-one-card-website label strong,
        .settings-profile-modal-grid label strong {
          color: #ffffff !important;
          font-weight: 950 !important;
        }

        .settings-one-card-fields label span,
        .settings-one-card-website label span,
        .settings-profile-modal-grid label span {
          color: rgba(248, 250, 252, 0.62) !important;
          line-height: 1.4 !important;
        }

        .input,
        .settings-one-card-fields input,
        .settings-one-card-fields textarea,
        .settings-one-card-website input,
        .settings-profile-modal-grid input,
        .settings-profile-modal-grid textarea,
        .settings-profile-modal-grid select {
          width: 100% !important;
          min-height: 46px !important;
          border-radius: 16px !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          background: rgba(2, 6, 23, 0.42) !important;
          color: #ffffff !important;
          padding: 12px 13px !important;
          line-height: 1.45 !important;
          outline: none !important;
        }

        textarea.input,
        .settings-one-card-fields textarea,
        .settings-profile-modal-grid textarea {
          min-height: 104px !important;
          resize: vertical !important;
        }

        .input:focus,
        .settings-one-card-fields input:focus,
        .settings-one-card-fields textarea:focus,
        .settings-one-card-website input:focus,
        .settings-profile-modal-grid input:focus,
        .settings-profile-modal-grid textarea:focus,
        .settings-profile-modal-grid select:focus {
          border-color: rgba(255, 212, 59, 0.46) !important;
          box-shadow: 0 0 0 3px rgba(255, 212, 59, 0.1) !important;
        }

        .settings-client-quick-save,
        .settings-save-strip {
          margin-top: 16px !important;
          padding: 15px !important;
          border-radius: 22px !important;
          background: rgba(255, 212, 59, 0.085) !important;
          border: 1px solid rgba(255, 212, 59, 0.16) !important;
        }

        .settings-client-quick-save span,
        .settings-save-strip span {
          color: rgba(248, 250, 252, 0.7) !important;
          line-height: 1.45 !important;
        }

        .settings-social-info-popover,
        .settings-scan-message {
          margin: 14px 0 0 !important;
          padding: 13px 15px !important;
          border-radius: 18px !important;
          background: rgba(255, 212, 59, 0.09) !important;
          border: 1px solid rgba(255, 212, 59, 0.16) !important;
          color: #ffe58a !important;
          line-height: 1.45 !important;
        }

        .settings-social-simple-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 14px !important;
          margin-top: 18px !important;
        }

        .settings-social-connect-card {
          display: grid !important;
          align-content: space-between !important;
          gap: 16px !important;
          min-height: 260px !important;
          padding: 20px !important;
        }

        .settings-social-account-summary {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 10px !important;
          margin-top: 4px !important;
        }

        .settings-social-account-summary div {
          display: grid !important;
          gap: 5px !important;
          padding: 13px !important;
          border-radius: 16px !important;
          background: rgba(2, 6, 23, 0.28) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .settings-social-account-summary strong {
          color: #ffffff !important;
          font-size: 0.88rem !important;
        }

        .settings-social-account-summary span {
          color: rgba(248, 250, 252, 0.68) !important;
          line-height: 1.35 !important;
          overflow-wrap: anywhere !important;
        }

        .settings-create-posts-section > div {
          grid-template-columns: minmax(0, 1fr) minmax(240px, 320px) !important;
        }

        .manual-collapse-card {
          padding: 18px !important;
        }

        .settings-profile-modal-backdrop {
          padding: 18px !important;
          backdrop-filter: blur(14px) !important;
        }

        .settings-profile-modal {
          width: min(100%, 920px) !important;
          max-height: min(88vh, 820px) !important;
          overflow: auto !important;
          padding: clamp(20px, 3vw, 30px) !important;
        }

        @media (max-width: 920px) {
          .settings-setup-step-grid,
          .settings-quick-profile-layout,
          .settings-social-simple-grid,
          .settings-create-posts-section > div,
          .settings-one-card-fields,
          .settings-profile-modal-grid,
          .settings-social-account-summary {
            grid-template-columns: 1fr !important;
          }

          .settings-profile-wizard-head,
          .settings-social-simple-head,
          .settings-one-card-head,
          .settings-profile-modal-head,
          .settings-one-card-website,
          .settings-save-strip {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .settings-setup-guide,
          .settings-quick-profile-card,
          .settings-profile-wizard-card,
          .settings-social-simple-section,
          .settings-create-posts-section,
          .manual-collapse-card,
          .premium-card {
            border-radius: 24px !important;
            padding: 17px !important;
          }

          .settings-setup-guide .page-title {
            font-size: 2.35rem !important;
          }

          .settings-quick-profile-copy h2,
          .settings-social-simple-head h2,
          .settings-profile-wizard-head h2,
          .settings-create-posts-section h2 {
            font-size: 2.05rem !important;
          }

          .settings-quick-profile-actions,
          .settings-social-button-row,
          .settings-profile-modal-actions,
          .button-row,
          .settings-client-quick-save {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .primary-button,
          .secondary-button,
          .danger-button,
          .settings-social-info-button,
          .settings-social-button-row a,
          .settings-social-button-row button,
          .settings-save-strip button,
          .settings-client-quick-save button,
          .settings-profile-modal-actions button,
          .button-row button,
          .settings-create-posts-section button {
            width: 100% !important;
          }

          .settings-social-connect-card {
            min-height: 0 !important;
          }
        }


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


        /* FINAL: flat FromOne-yellow setup completion tick */
        .settings-setup-step-card .settings-step-complete-mark,
        .settings-step-complete-mark {
          all: unset !important;
          display: block !important;
          width: fit-content !important;
          min-width: 0 !important;
          height: auto !important;
          min-height: 0 !important;
          margin: 8px auto 0 !important;
          padding: 0 !important;
          color: #ffd43b !important;
          font-family: inherit !important;
          font-size: 1.9rem !important;
          font-weight: 1000 !important;
          line-height: 1 !important;
          text-align: center !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          border: 0 !important;
          border-radius: 0 !important;
          outline: 0 !important;
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
          -webkit-filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          opacity: 1 !important;
        }

        .settings-setup-step-card .settings-step-complete-mark::before,
        .settings-setup-step-card .settings-step-complete-mark::after,
        .settings-step-complete-mark::before,
        .settings-step-complete-mark::after {
          content: none !important;
          display: none !important;
          background: transparent !important;
          background-image: none !important;
          border: 0 !important;
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
        }

        .settings-step-complete-mark > span,
        .settings-step-complete-mark > strong {
          display: none !important;
        }

        @media (max-width: 760px) {
          .settings-setup-step-card .settings-step-complete-mark,
          .settings-step-complete-mark {
            all: unset !important;
            display: block !important;
            width: fit-content !important;
            margin: 8px auto 0 !important;
            padding: 0 !important;
            color: #ffd43b !important;
            font-family: inherit !important;
            font-size: 1.8rem !important;
            font-weight: 1000 !important;
            line-height: 1 !important;
            text-align: center !important;
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
            -webkit-filter: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
        }


        /* Final onboarding polish for Settings */
        .settings-setup-guide .page-description {
          max-width: 720px !important;
        }

        .settings-setup-step-card p {
          font-size: 0.92rem !important;
        }

        .settings-create-posts-section p {
          max-width: 760px !important;
        }

        .settings-create-posts-section button,
        .settings-client-quick-save button,
        .settings-save-strip button,
        .primary-button {
          background: #ffd43b !important;
          background-image: none !important;
          color: #101420 !important;
          box-shadow: none !important;
          border-color: rgba(255, 212, 59, 0.48) !important;
        }

        .settings-setup-step-card .settings-step-complete-mark,
        .settings-step-complete-mark {
          all: unset !important;
          display: block !important;
          width: fit-content !important;
          height: auto !important;
          margin: 8px auto 0 !important;
          padding: 0 !important;
          color: #ffd43b !important;
          background: transparent !important;
          background-image: none !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
          -webkit-filter: none !important;
          font-family: inherit !important;
          font-size: 1.9rem !important;
          font-weight: 1000 !important;
          line-height: 1 !important;
          text-align: center !important;
        }

        .settings-step-complete-mark::before,
        .settings-step-complete-mark::after {
          content: none !important;
          display: none !important;
        }

        .settings-setup-step-card:not(.is-complete):not([data-complete="true"]) .settings-step-complete-mark {
          display: none !important;
        }

        @media (max-width: 760px) {
          .settings-setup-guide {
            padding: 20px 16px !important;
          }

          .settings-setup-step-card .settings-step-complete-mark,
          .settings-step-complete-mark {
            all: unset !important;
            display: block !important;
            width: fit-content !important;
            margin: 8px auto 0 !important;
            color: #ffd43b !important;
            background: transparent !important;
            background-image: none !important;
            border: 0 !important;
            box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
            font-size: 1.75rem !important;
            font-weight: 1000 !important;
            line-height: 1 !important;
            text-align: center !important;
          }
        }


        /* Final setup card completion badge: overlay tick, no layout shift */
        .settings-setup-step-card {
          position: relative !important;
          overflow: hidden !important;
          padding-top: 18px !important;
        }

        .settings-setup-step-card .settings-step-complete-mark,
        .settings-step-complete-mark {
          all: unset !important;
          position: absolute !important;
          top: 14px !important;
          right: 14px !important;
          z-index: 3 !important;
          width: 34px !important;
          height: 34px !important;
          display: inline-grid !important;
          place-items: center !important;
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 999px !important;
          background: #ffd43b !important;
          background-image: none !important;
          color: #101420 !important;
          border: 1px solid rgba(255, 212, 59, 0.5) !important;
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
          -webkit-filter: none !important;
          font-family: inherit !important;
          font-size: 1.18rem !important;
          font-weight: 1000 !important;
          line-height: 1 !important;
          text-align: center !important;
        }

        .settings-step-complete-mark::before,
        .settings-step-complete-mark::after {
          content: none !important;
          display: none !important;
        }

        .settings-setup-step-card:not(.is-complete):not([data-complete="true"]) .settings-step-complete-mark {
          display: none !important;
        }

        .settings-setup-step-card.is-complete h3,
        .settings-setup-step-card.is-complete p {
          transform: none !important;
        }

        @media (max-width: 760px) {
          .settings-setup-step-card {
            padding-top: 22px !important;
          }

          .settings-setup-step-card .settings-step-complete-mark,
          .settings-step-complete-mark {
            all: unset !important;
            position: absolute !important;
            top: 14px !important;
            right: 14px !important;
            z-index: 3 !important;
            width: 32px !important;
            height: 32px !important;
            display: inline-grid !important;
            place-items: center !important;
            margin: 0 !important;
            border-radius: 999px !important;
            background: #ffd43b !important;
            background-image: none !important;
            color: #101420 !important;
            border: 1px solid rgba(255, 212, 59, 0.5) !important;
            box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
            font-size: 1.1rem !important;
            font-weight: 1000 !important;
            line-height: 1 !important;
            text-align: center !important;
          }

          .settings-setup-step-card .status-pill {
            margin: 0 auto !important;
          }
        }


        /* Saved weekly sets management */
        .settings-saved-weekly-sets-section {
          padding: clamp(22px, 3vw, 34px) !important;
          border-radius: 34px !important;
        }

        .settings-saved-sets-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 18px !important;
          align-items: start !important;
          margin-bottom: 18px !important;
        }

        .settings-saved-sets-head h2 {
          margin: 0 0 10px !important;
          color: #ffffff !important;
          font-size: clamp(2rem, 4vw, 3.2rem) !important;
          line-height: 0.96 !important;
          letter-spacing: -0.06em !important;
        }

        .settings-saved-sets-head p {
          max-width: 760px !important;
          margin: 0 !important;
          color: rgba(248, 250, 252, 0.72) !important;
          line-height: 1.58 !important;
          font-weight: 760 !important;
        }

        .settings-saved-sets-limit-card {
          display: grid !important;
          gap: 6px !important;
          margin-bottom: 14px !important;
          padding: 16px 18px !important;
          border-radius: 20px !important;
          background: rgba(255, 212, 59, 0.08) !important;
          border: 1px solid rgba(255, 212, 59, 0.16) !important;
        }

        .settings-saved-sets-limit-card strong {
          color: #ffffff !important;
          font-size: 1rem !important;
        }

        .settings-saved-sets-limit-card span,
        .settings-saved-sets-empty {
          color: rgba(248, 250, 252, 0.68) !important;
          line-height: 1.45 !important;
          font-weight: 760 !important;
        }

        .settings-saved-sets-empty {
          padding: 16px !important;
          border-radius: 18px !important;
          background: rgba(255, 255, 255, 0.055) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .settings-saved-sets-list {
          display: grid !important;
          gap: 10px !important;
        }

        .settings-saved-set-row {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 14px !important;
          align-items: center !important;
          padding: 14px !important;
          border-radius: 20px !important;
          background: rgba(2, 6, 23, 0.28) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .settings-saved-set-row strong {
          display: block !important;
          color: #ffffff !important;
          font-size: 1rem !important;
          line-height: 1.2 !important;
        }

        .settings-saved-set-row span {
          display: block !important;
          margin-top: 5px !important;
          color: rgba(248, 250, 252, 0.58) !important;
          font-size: 0.86rem !important;
          font-weight: 800 !important;
          line-height: 1.35 !important;
        }

        @media (max-width: 760px) {
          .settings-saved-sets-head,
          .settings-saved-set-row {
            grid-template-columns: 1fr !important;
          }

          .settings-saved-sets-head .secondary-button,
          .settings-saved-set-row button {
            width: 100% !important;
          }
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


        /* Settings final clean polish pass */
        .settings-setup-guide,
        .settings-profile-start-card,
        .settings-profile-wizard-card,
        .settings-connections-section,
        .settings-create-posts-section,
        .manual-collapse-card {
          width: min(100%, 1120px) !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        .settings-setup-guide,
        .settings-profile-start-card,
        .settings-profile-wizard-card,
        .settings-connections-section,
        .settings-create-posts-section {
          overflow: hidden !important;
        }

        .settings-setup-guide .page-description,
        .settings-profile-start-card p,
        .settings-connections-section p,
        .settings-create-posts-section p {
          line-height: 1.55 !important;
        }

        .settings-profile-choice-card,
        .settings-simple-setup-card,
        .settings-form-panel,
        .settings-channel-card,
        .settings-connected-account-box,
        .settings-meta-summary-card,
        .settings-publishing-rules-compact {
          min-width: 0 !important;
        }

        .settings-channel-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          align-items: start !important;
          gap: 16px !important;
        }

        .settings-channel-grid > .settings-channel-card {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          display: grid !important;
          grid-template-rows: auto auto !important;
          align-content: start !important;
          align-self: start !important;
          gap: 16px !important;
          padding: 20px !important;
          border-radius: 24px !important;
        }

        .settings-channel-grid > .settings-channel-card > div:first-child {
          display: grid !important;
          grid-template-rows: none !important;
          gap: 14px !important;
          min-height: 0 !important;
          align-content: start !important;
        }

        .settings-channel-card-head {
          display: block !important;
          min-height: 0 !important;
          margin: 0 !important;
        }

        .settings-channel-card-head .page-eyebrow {
          display: block !important;
          margin: 0 0 8px !important;
          line-height: 1.1 !important;
        }

        .settings-channel-card-head h3 {
          min-height: 0 !important;
          margin: 0 !important;
          font-size: clamp(1.2rem, 2vw, 1.45rem) !important;
          line-height: 1.08 !important;
          letter-spacing: -0.025em !important;
        }

        .settings-connected-account-box {
          min-height: 0 !important;
          margin: 0 !important;
          padding: 16px 18px !important;
          border-radius: 22px !important;
          overflow: hidden !important;
        }

        .settings-connected-account-box span {
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

        .settings-connected-account-box strong {
          display: block !important;
          margin: 0 0 8px !important;
          color: #ffffff !important;
          font-size: clamp(1.05rem, 1.8vw, 1.26rem) !important;
          line-height: 1.12 !important;
          word-break: normal !important;
          overflow-wrap: anywhere !important;
        }

        .settings-connected-account-box small {
          display: block !important;
          margin: 0 !important;
          color: rgba(248, 250, 252, 0.62) !important;
          font-size: 0.86rem !important;
          line-height: 1.35 !important;
          overflow-wrap: anywhere !important;
        }

        .settings-channel-grid > .settings-channel-card > div:first-child > p {
          display: none !important;
          min-height: 0 !important;
          margin: 0 !important;
        }

        .settings-channel-grid > .settings-channel-card > button {
          width: 100% !important;
          min-height: 52px !important;
          margin-top: 0 !important;
          align-self: start !important;
          border-radius: 16px !important;
        }

        .manual-collapse-card {
          padding: 18px !important;
          border-radius: 28px !important;
          background: rgba(15, 23, 42, 0.62) !important;
          border: 1px solid rgba(255, 255, 255, 0.09) !important;
        }

        .manual-collapse-card .manual-collapse-content {
          display: grid !important;
          gap: 14px !important;
        }

        .manual-collapse-card .button-row {
          display: flex !important;
          gap: 10px !important;
          flex-wrap: wrap !important;
        }

        .danger-button {
          background: rgba(127, 29, 29, 0.32) !important;
          border-color: rgba(248, 113, 113, 0.38) !important;
          color: #fecaca !important;
        }

        .settings-confirm-actions button {
          min-height: 48px !important;
          border-radius: 16px !important;
        }

        @media (max-width: 1040px) {
          .settings-channel-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 900px) {
          .settings-setup-step-grid,
          .settings-profile-start-layout,
          .settings-simple-setup-grid,
          .settings-simple-form-grid,
          .settings-channel-grid,
          .settings-create-posts-section > div,
          .settings-meta-summary-card,
          .settings-save-strip {
            grid-template-columns: 1fr !important;
          }

          .settings-profile-choice-grid {
            grid-template-columns: 1fr !important;
          }

          .settings-profile-wizard-head,
          .settings-save-strip {
            text-align: center !important;
            justify-items: center !important;
          }

          .settings-meta-summary-card .button-row,
          .manual-collapse-card .button-row,
          .settings-confirm-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
            width: 100% !important;
          }

          .settings-meta-summary-card button,
          .manual-collapse-card button,
          .settings-confirm-actions button {
            width: 100% !important;
          }
        }

        @media (max-width: 760px) {
          .settings-setup-guide,
          .settings-profile-start-card,
          .settings-profile-wizard-card,
          .settings-connections-section,
          .settings-create-posts-section,
          .manual-collapse-card {
            width: min(100%, calc(100vw - 24px)) !important;
            border-radius: 26px !important;
            padding: 20px !important;
          }

          .settings-setup-guide .page-title {
            font-size: clamp(2.25rem, 13vw, 3.5rem) !important;
          }

          .settings-channel-card {
            padding: 18px !important;
            border-radius: 22px !important;
          }
        }


        /* Final fix: channel card headers must not inherit card sizing */
        .settings-channel-grid .settings-channel-card-head {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          display: block !important;
          margin: 0 !important;
        }

        .settings-channel-grid .settings-channel-card-head > div {
          height: auto !important;
          min-height: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
        }

        .settings-channel-grid > .settings-channel-card {
          grid-template-rows: auto auto !important;
          gap: 14px !important;
        }


        /* Client-friendly simple manual profile input */
        .settings-client-simple-profile {
          display: grid;
          gap: 14px;
        }

        .settings-client-simple-card,
        .settings-client-optional-card {
          padding: clamp(18px, 2vw, 24px);
          border-radius: 26px;
          background: rgba(15, 23, 42, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .settings-client-simple-card {
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 34%),
            rgba(15, 23, 42, 0.68);
          border-color: rgba(255, 212, 59, 0.18);
        }

        .settings-client-simple-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: start;
          margin-bottom: 18px;
        }

        .settings-client-simple-head h3 {
          margin: 8px 0 6px;
          color: #ffffff;
          font-size: clamp(1.65rem, 3vw, 2.35rem);
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .settings-client-simple-head p {
          margin: 0;
          color: rgba(248, 250, 252, 0.68);
          line-height: 1.48;
        }

        .settings-client-simple-grid,
        .settings-client-optional-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .settings-client-simple-grid label,
        .settings-client-optional-grid label,
        .settings-client-website-scan label {
          display: grid;
          gap: 7px;
          margin: 0;
        }

        .settings-client-simple-grid label strong,
        .settings-client-optional-grid label strong,
        .settings-client-website-scan label strong {
          color: #ffffff;
          font-size: 0.94rem;
        }

        .settings-client-simple-grid label span,
        .settings-client-optional-grid label span,
        .settings-client-website-scan label span {
          color: rgba(248, 250, 252, 0.58);
          font-size: 0.84rem;
          line-height: 1.35;
        }

        .settings-client-quick-save {
          margin-top: 16px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          padding: 14px;
          border-radius: 20px;
          background: rgba(255, 212, 59, 0.08);
          border: 1px solid rgba(255, 212, 59, 0.16);
        }

        .settings-client-quick-save span {
          color: rgba(248, 250, 252, 0.66);
          line-height: 1.4;
          font-weight: 800;
        }

        .settings-client-optional-card {
          padding: 0;
          overflow: hidden;
        }

        .settings-client-optional-card summary {
          cursor: pointer;
          list-style: none;
          padding: 18px 20px;
        }

        .settings-client-optional-card summary::-webkit-details-marker {
          display: none;
        }

        .settings-client-optional-card summary span {
          display: grid;
          gap: 4px;
        }

        .settings-client-optional-card summary strong {
          color: #ffffff;
          font-size: 1rem;
        }

        .settings-client-optional-card summary small {
          color: rgba(248, 250, 252, 0.62);
          line-height: 1.35;
          font-weight: 760;
        }

        .settings-client-optional-card[open] summary {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .settings-client-optional-grid,
        .settings-client-website-scan {
          padding: 18px 20px 20px;
        }

        .settings-client-website-scan {
          display: grid;
          gap: 14px;
        }

        @media (max-width: 900px) {
          .settings-client-simple-head,
          .settings-client-simple-grid,
          .settings-client-optional-grid,
          .settings-client-quick-save {
            grid-template-columns: 1fr !important;
          }

          .settings-client-simple-head button,
          .settings-client-quick-save button {
            width: 100%;
          }
        }


        /* Ultra-simple client setup polish */
        .settings-simple-entry-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: stretch;
          margin-top: 18px;
        }

        .settings-simple-entry-primary,
        .settings-simple-entry-secondary {
          appearance: none;
          border: 0;
          cursor: pointer;
          text-align: left;
          text-decoration: none;
        }

        .settings-simple-entry-primary {
          min-height: 74px;
          display: grid;
          gap: 5px;
          align-content: center;
          padding: 16px 18px;
          border-radius: 22px;
          background: linear-gradient(135deg, #ffd43b, #f7b733);
          color: #101420;
          box-shadow: 0 18px 42px rgba(255, 212, 59, 0.18);
        }

        .settings-simple-entry-primary strong {
          font-size: 1.06rem;
          line-height: 1.1;
        }

        .settings-simple-entry-primary small {
          color: rgba(16, 20, 32, 0.74);
          font-weight: 900;
          line-height: 1.3;
        }

        .settings-simple-entry-secondary {
          min-height: 74px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.065);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(248, 250, 252, 0.86);
          font-weight: 950;
          white-space: nowrap;
        }

        .settings-profile-progress-card {
          margin-top: 16px !important;
          padding: 14px !important;
          border-radius: 22px !important;
          background: rgba(255, 255, 255, 0.045) !important;
        }

        .settings-profile-progress-card p {
          display: none !important;
        }

        .settings-profile-checklist {
          gap: 8px !important;
        }

        .settings-client-simple-card {
          border-radius: 30px !important;
        }

        .settings-client-simple-grid {
          gap: 12px !important;
        }

        .settings-client-simple-grid textarea {
          min-height: 92px !important;
        }

        @media (max-width: 900px) {
          .settings-simple-entry-actions {
            grid-template-columns: 1fr !important;
          }

          .settings-simple-entry-secondary {
            width: 100%;
          }
        }


        /* Dead-simple business profile start */
        .settings-quick-profile-card {
          overflow: hidden;
        }

        .settings-quick-profile-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.18fr) minmax(280px, 0.82fr);
          gap: clamp(18px, 3vw, 30px);
          align-items: start;
        }

        .settings-quick-profile-copy .settings-live-step-label {
          margin-bottom: 16px;
        }

        .settings-quick-profile-copy h2 {
          margin: 0 0 12px;
          color: #ffffff;
          font-size: clamp(2.25rem, 5vw, 4.4rem);
          line-height: 0.93;
          letter-spacing: -0.07em;
        }

        .settings-quick-profile-copy p {
          max-width: 690px;
          margin: 0;
          color: rgba(248, 250, 252, 0.7);
          font-size: 1.08rem;
          line-height: 1.5;
          font-weight: 760;
        }

        .settings-quick-profile-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }

        .settings-quick-profile-actions .primary-button,
        .settings-quick-profile-actions .secondary-button {
          min-height: 52px;
          border-radius: 17px;
          padding: 0 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 1000;
        }

        .settings-quick-profile-progress {
          padding: 20px;
          border-radius: 26px;
          background: rgba(10, 18, 32, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .settings-quick-progress-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .settings-quick-progress-topline strong {
          color: #ffffff;
          font-size: 1.35rem;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .settings-quick-progress-bar {
          height: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
          margin-bottom: 16px;
        }

        .settings-quick-progress-bar span {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #ffd43b, #f6c72f);
          box-shadow: 0 0 24px rgba(255, 212, 59, 0.24);
          transition: width 180ms ease;
        }

        .settings-quick-step-list {
          display: grid;
          gap: 8px;
        }

        .settings-quick-step-list div {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .settings-quick-step-list div.is-ready {
          background: linear-gradient(135deg, rgba(61, 220, 151, 0.14), rgba(61, 220, 151, 0.07));
          border-color: rgba(61, 220, 151, 0.22);
        }

        .settings-quick-step-list span {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
          color: rgba(248, 250, 252, 0.78);
          font-weight: 1000;
        }

        .settings-quick-step-list .is-ready span {
          background: rgba(61, 220, 151, 0.16);
          color: #bbf7d0;
        }

        .settings-quick-step-list strong {
          color: #ffffff;
          line-height: 1.1;
        }

        .settings-quick-step-list small {
          color: rgba(248, 250, 252, 0.58);
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.055em;
          font-size: 0.72rem;
        }

        .settings-quick-step-list .is-ready small {
          color: #86efac;
        }

        @media (max-width: 920px) {
          .settings-quick-profile-layout {
            grid-template-columns: 1fr !important;
          }

          .settings-quick-profile-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .settings-quick-profile-actions .primary-button,
          .settings-quick-profile-actions .secondary-button {
            width: 100%;
          }
        }

        @media (max-width: 620px) {
          .settings-quick-profile-card {
            padding: 22px !important;
            border-radius: 28px !important;
          }

          .settings-quick-profile-progress {
            padding: 16px;
            border-radius: 22px;
          }

          .settings-quick-step-list div {
            grid-template-columns: 28px minmax(0, 1fr);
          }

          .settings-quick-step-list small {
            grid-column: 2;
          }
        }


        /* Dead-simple social connection section */
        .settings-social-simple-section {
          padding: clamp(22px, 3vw, 32px) !important;
        }

        .settings-social-simple-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: start;
          margin-bottom: 18px;
        }

        .settings-social-simple-head h2 {
          margin: 14px 0 10px;
          color: #ffffff;
          font-size: clamp(2rem, 4vw, 3.55rem);
          line-height: 0.94;
          letter-spacing: -0.065em;
        }

        .settings-social-simple-head p {
          max-width: 720px;
          margin: 0;
          color: rgba(248, 250, 252, 0.7);
          font-size: 1.04rem;
          line-height: 1.5;
          font-weight: 760;
        }

        .settings-social-info-button {
          min-height: 46px;
          padding: 0 16px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.065);
          color: rgba(248, 250, 252, 0.9);
          font-weight: 950;
          cursor: pointer;
          white-space: nowrap;
        }

        .settings-social-info-popover {
          margin-bottom: 16px;
          padding: 15px 16px;
          border-radius: 20px;
          background: rgba(255, 212, 59, 0.08);
          border: 1px solid rgba(255, 212, 59, 0.18);
        }

        .settings-social-info-popover strong {
          display: block;
          color: #ffe58a;
          margin-bottom: 5px;
        }

        .settings-social-info-popover p {
          margin: 0;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.48;
          font-weight: 760;
        }

        .settings-social-simple-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
          gap: 14px;
        }

        .settings-social-connect-card {
          min-width: 0;
          display: grid;
          gap: 16px;
          align-content: start;
          padding: 20px;
          border-radius: 26px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 35%),
            rgba(15, 23, 42, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .settings-social-connect-card.is-manual {
          background: rgba(15, 23, 42, 0.56);
        }

        .settings-social-connect-card h3 {
          margin: 8px 0 8px;
          color: #ffffff;
          font-size: clamp(1.35rem, 2.4vw, 2rem);
          line-height: 1.02;
          letter-spacing: -0.045em;
        }

        .settings-social-connect-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.66);
          line-height: 1.45;
          font-weight: 760;
        }

        .settings-social-account-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .settings-social-account-summary div {
          min-width: 0;
          display: grid;
          gap: 4px;
          padding: 13px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .settings-social-account-summary strong {
          color: #ffffff;
          font-size: 0.86rem;
        }

        .settings-social-account-summary span {
          color: rgba(248, 250, 252, 0.66);
          font-weight: 800;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .settings-social-button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .settings-social-button-row button,
        .settings-social-button-row a {
          min-height: 50px;
          border-radius: 16px;
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 1000;
        }

        @media (max-width: 900px) {
          .settings-social-simple-head,
          .settings-social-simple-grid,
          .settings-social-account-summary {
            grid-template-columns: 1fr !important;
          }

          .settings-social-info-button,
          .settings-social-button-row button,
          .settings-social-button-row a {
            width: 100%;
          }

          .settings-social-button-row {
            display: grid;
            grid-template-columns: 1fr;
          }
        }


        /* One-card business setup with optional details modal */
        .settings-one-card-setup {
          padding: clamp(18px, 2vw, 24px);
          border-radius: 30px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 34%),
            rgba(15, 23, 42, 0.68);
          border: 1px solid rgba(255, 212, 59, 0.18);
        }

        .settings-one-card-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: start;
          margin-bottom: 18px;
        }

        .settings-one-card-head h3 {
          margin: 8px 0 6px;
          color: #ffffff;
          font-size: clamp(1.65rem, 3vw, 2.35rem);
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .settings-one-card-head p {
          margin: 0;
          color: rgba(248, 250, 252, 0.68);
          line-height: 1.48;
        }



        /* Final website scan alignment fix */
        .settings-one-card-website {
          align-items: end !important;
        }

        .settings-one-card-website > button {
          align-self: end !important;
          height: 66px !important;
          min-height: 66px !important;
          margin: 0 0 0 !important;
          padding: 0 22px !important;
          transform: translateY(-16px) !important;
          white-space: nowrap !important;
        }

        .settings-one-card-website input {
          height: 66px !important;
          min-height: 66px !important;
        }

        @media (max-width: 720px) {
          .settings-one-card-website {
            grid-template-columns: 1fr !important;
            align-items: stretch !important;
          }

          .settings-one-card-website > button {
            width: 100% !important;
            height: 54px !important;
            min-height: 54px !important;
            transform: none !important;
          }

          .settings-one-card-website input {
            height: 54px !important;
            min-height: 54px !important;
          }
        }


        .settings-one-card-website {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: end;
          padding: 14px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 14px;
        }

        .settings-one-card-website label,
        .settings-one-card-fields label,
        .settings-profile-modal-grid label {
          display: grid;
          gap: 7px;
          margin: 0;
        }

        .settings-one-card-website label strong,
        .settings-one-card-fields label strong,
        .settings-profile-modal-grid label strong {
          color: #ffffff;
          font-size: 0.94rem;
        }

        .settings-one-card-website label em {
          color: rgba(248, 250, 252, 0.54);
          font-style: normal;
          font-size: 0.78rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.055em;
        }

        .settings-one-card-website label span,
        .settings-one-card-fields label span,
        .settings-profile-modal-grid label span {
          color: rgba(248, 250, 252, 0.58);
          font-size: 0.84rem;
          line-height: 1.35;
        }

        .settings-one-card-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .settings-one-card-fields textarea {
          min-height: 92px;
        }

        .settings-one-card-save {
          margin-top: 16px !important;
        }

        .settings-profile-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(2, 6, 23, 0.72);
          backdrop-filter: blur(10px);
        }

        .settings-profile-modal {
          width: min(760px, 100%);
          max-height: min(86vh, 780px);
          overflow: auto;
          padding: clamp(20px, 3vw, 28px);
          border-radius: 30px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 34%),
            #101722;
          border: 1px solid rgba(255, 212, 59, 0.2);
          box-shadow: 0 34px 100px rgba(0, 0, 0, 0.42);
        }

        .settings-profile-modal-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: start;
          margin-bottom: 18px;
        }

        .settings-profile-modal-head h3 {
          margin: 8px 0 8px;
          color: #ffffff;
          font-size: clamp(1.8rem, 4vw, 2.7rem);
          line-height: 0.96;
          letter-spacing: -0.055em;
        }

        .settings-profile-modal-head p {
          margin: 0;
          color: rgba(248, 250, 252, 0.68);
          line-height: 1.45;
        }

        .settings-profile-modal-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .settings-profile-modal-grid label:first-child,
        .settings-profile-modal-grid label:nth-child(3),
        .settings-profile-modal-grid label:nth-child(5) {
          grid-column: 1 / -1;
        }

        .settings-profile-modal-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
          margin-top: 18px;
        }

        @media (max-width: 860px) {
          .settings-one-card-head,
          .settings-one-card-website,
          .settings-one-card-fields,
          .settings-profile-modal-head,
          .settings-profile-modal-grid {
            grid-template-columns: 1fr !important;
          }

          .settings-one-card-head button,
          .settings-one-card-website button,
          .settings-profile-modal-actions button {
            width: 100%;
          }

          .settings-profile-modal-actions {
            display: grid;
            grid-template-columns: 1fr;
          }
        }


        /* Flash the setup card/action until Business Profile is complete */
        @keyframes settingsProfileSoftPulse {
          0%, 100% {
            box-shadow:
              0 26px 84px rgba(0, 0, 0, 0.22),
              0 0 0 0 rgba(255, 212, 59, 0.0);
            border-color: rgba(255, 212, 59, 0.18);
          }

          50% {
            box-shadow:
              0 30px 92px rgba(0, 0, 0, 0.28),
              0 0 0 6px rgba(255, 212, 59, 0.07),
              0 0 34px rgba(255, 212, 59, 0.14);
            border-color: rgba(255, 212, 59, 0.34);
          }
        }

        .settings-profile-card-pulse {
          animation: settingsProfileSoftPulse 1.9s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .settings-profile-card-pulse,
          .settings-setup-profile-button-pulse {
            animation: none !important;
          }
        }



        /* Guided Business Profile layout - simple, stacked and client-friendly */
        .settings-guided-profile-head {
          align-items: center;
        }

        .settings-guided-profile-head > div {
          max-width: 760px;
        }

        .settings-guided-profile-intro {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 0 0 16px;
          padding: 14px 16px;
          border-radius: 22px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.075), transparent 36%),
            rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.085);
        }

        .settings-guided-profile-intro strong {
          color: #ffffff;
          font-size: 1rem;
          font-weight: 1000;
        }

        .settings-guided-profile-intro span {
          color: rgba(248,250,252,0.62);
          font-size: 0.9rem;
          font-weight: 760;
          text-align: right;
        }

        .settings-guided-website-card {
          align-items: end;
          margin-bottom: 16px;
        }

        .settings-profile-step-mini {
          display: grid;
          gap: 5px;
          align-self: center;
        }

        .settings-profile-step-mini span {
          width: fit-content;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.16);
          color: #ffe58a;
          font-size: 0.68rem;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .settings-profile-step-mini strong {
          color: #ffffff;
          font-size: 1rem;
          font-weight: 1000;
        }

        .settings-guided-profile-fields {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 14px !important;
        }

        .settings-profile-step {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr);
          gap: 14px;
          padding: 16px;
          border-radius: 26px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.055), transparent 34%),
            linear-gradient(145deg, rgba(255,255,255,0.058), rgba(255,255,255,0.026));
          border: 1px solid rgba(255,255,255,0.085);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .settings-profile-step-marker {
          width: 38px;
          height: 38px;
          display: inline-grid;
          place-items: center;
          border-radius: 15px;
          background: linear-gradient(135deg, #ffdd4a, #ffc21a);
          color: #081120;
          font-size: 1rem;
          font-weight: 1000;
          box-shadow: 0 12px 26px rgba(255, 212, 59, 0.13);
        }

        .settings-profile-step-content {
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .settings-profile-step-copy {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.075);
        }

        .settings-profile-step-copy strong {
          color: #ffffff;
          font-size: 1.08rem;
          font-weight: 1000;
          letter-spacing: -0.025em;
        }

        .settings-profile-step-copy span {
          max-width: 560px;
          color: rgba(248,250,252,0.58);
          font-size: 0.86rem;
          line-height: 1.42;
          font-weight: 760;
          text-align: right;
        }

        .settings-profile-step-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .settings-profile-step:first-child .settings-profile-step-fields {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .settings-profile-step-fields label {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .settings-profile-step-fields label::before {
          display: none !important;
          content: none !important;
        }

        .settings-profile-step-fields label strong {
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 1000;
        }

        .settings-profile-step-fields label span {
          color: rgba(248,250,252,0.5);
          font-size: 0.8rem;
          font-weight: 720;
          line-height: 1.35;
        }

        .settings-profile-step-fields label:nth-child(n) {
          border: 0 !important;
          background: transparent !important;
          border-radius: 0 !important;
          padding: 0 !important;
        }

        @media (max-width: 980px) {
          .settings-profile-step:first-child .settings-profile-step-fields,
          .settings-profile-step-fields {
            grid-template-columns: 1fr !important;
          }

          .settings-profile-step-copy {
            display: grid;
            gap: 6px;
          }

          .settings-profile-step-copy span {
            text-align: left;
            max-width: none;
          }

          .settings-guided-website-card {
            align-items: stretch;
          }
        }

        @media (max-width: 760px) {
          .settings-guided-profile-intro {
            display: grid !important;
            justify-items: center !important;
            text-align: center !important;
            gap: 8px !important;
            padding: 14px !important;
          }

          .settings-guided-profile-intro span {
            text-align: center !important;
          }

          .settings-profile-step {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            padding: 14px !important;
            border-radius: 24px !important;
          }

          .settings-profile-step-marker {
            margin: 0 auto !important;
          }

          .settings-profile-step-copy {
            justify-items: center !important;
            text-align: center !important;
          }

          .settings-profile-step-copy span {
            text-align: center !important;
          }

          .settings-profile-step-fields label {
            text-align: left !important;
          }

          .settings-profile-step-fields label strong,
          .settings-profile-step-fields label span {
            text-align: left !important;
          }

          .settings-profile-step-mini {
            justify-items: center !important;
            text-align: center !important;
          }
        }



        /* Cleaner optional website scan card */
        .settings-website-simple-card {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 14px !important;
          margin-bottom: 16px !important;
          padding: 16px !important;
          border-radius: 26px !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.06), transparent 34%),
            rgba(255,255,255,0.035) !important;
          border: 1px solid rgba(255,255,255,0.085) !important;
        }

        .settings-website-simple-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .settings-website-simple-head > div {
          display: grid;
          gap: 7px;
        }

        .settings-website-simple-head span {
          width: fit-content;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.16);
          color: #ffe58a;
          font-size: 0.68rem;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .settings-website-simple-head strong {
          color: #ffffff;
          font-size: 1.05rem;
          font-weight: 1000;
          letter-spacing: -0.025em;
        }

        .settings-website-simple-head p {
          max-width: 520px;
          margin: 0;
          color: rgba(248,250,252,0.58);
          font-size: 0.86rem;
          line-height: 1.42;
          font-weight: 760;
          text-align: right;
        }

        .settings-website-simple-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: start;
        }

        .settings-website-simple-row label {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .settings-website-simple-row label strong {
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 1000;
        }

        .settings-website-simple-row .secondary-button {
          min-width: 150px;
          min-height: 56px;
          height: 56px;
          margin-top: 29px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 760px) {
          .settings-website-simple-card {
            padding: 14px !important;
            border-radius: 24px !important;
          }

          .settings-website-simple-head {
            display: grid !important;
            justify-items: center !important;
            text-align: center !important;
            gap: 9px !important;
          }

          .settings-website-simple-head > div {
            justify-items: center !important;
          }

          .settings-website-simple-head p {
            text-align: center !important;
            max-width: 320px !important;
          }

          .settings-website-simple-row {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          .settings-website-simple-row .secondary-button {
            width: 100% !important;
            min-height: 46px !important;
            height: 46px !important;
            margin-top: 0 !important;
          }
        }

        /* Final override: keep profile image actions as compact utility buttons. */
        .fromone-settings-page .settings-business-image-actions {
          grid-column: 1 / -1 !important;
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          justify-content: flex-start !important;
          align-items: center !important;
        }

        .fromone-settings-page .settings-business-image-actions .settings-image-utility-button {
          width: 140px !important;
          min-width: 140px !important;
          max-width: 140px !important;
          flex: 0 0 140px !important;
          min-height: 38px !important;
          height: 38px !important;
          padding: 0 14px !important;
          margin: 0 !important;
          position: relative !important;
          top: auto !important;
          transform: none !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          vertical-align: top !important;
          border-radius: 12px !important;
          font-size: 0.78rem !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          box-shadow: none !important;
          text-align: center !important;
        }

        .fromone-settings-page .settings-business-image-actions .settings-image-utility-button:first-child {
          border-color: #f72585 !important;
          background: #f72585 !important;
          color: #ffffff !important;
        }

        .fromone-settings-page .settings-business-image-actions .settings-image-utility-button:last-child {
          border-color: #ffd0e4 !important;
          background: #fff7fb !important;
          color: #f72585 !important;
        }

        @media (max-width: 760px) {
          .fromone-settings-page .settings-business-image-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .fromone-settings-page .settings-business-image-actions .settings-image-utility-button {
            width: 100% !important;
            max-width: none !important;
          }
        }


        /*
         * OUTER MOBILE LAYOUT IS OWNED BY AppShell.
         * Settings keeps its internal card styling only.
         */
        @media (max-width: 900px) {
          body:has(.fromone-settings-page) .main-content {
            padding-top: 0 !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .fromone-settings-page.settings-create-style-page {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 0 112px !important;
            box-sizing: border-box !important;
          }

          .fromone-settings-page #fromone-standard-shell.settings-create-style-card {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
        }


        /*
         * SETTINGS TOP-GAP ALIGNMENT
         * Settings was receiving the universal mobile top gap twice.
         */
        @media (max-width: 900px) {
          .fromone-route-settings .fromone-universal-mobile-page-frame {
            padding-top: 0 !important;
          }

          body:has(.fromone-settings-page) .main-content,
          body:has(.fromone-settings-page) .main-content.fromone-mobile-bottom-safe {
            padding-top: 14px !important;
          }
        }

        /* Final booking editor layout — deliberately last so nothing overrides it. */
        .fromone-settings-page .settings-simple-booking-hours {
          display: grid !important;
          gap: 18px !important;
          margin-top: 18px !important;
          padding: 22px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 20px !important;
          background: #f8faff !important;
          box-shadow: none !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-card-head {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 16px !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-card-head span {
          display: block !important;
          margin-bottom: 5px !important;
          color: #f72585 !important;
          font-size: 0.72rem !important;
          font-weight: 900 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-card-head h4 {
          margin: 0 !important;
          color: #071b49 !important;
          font-size: 1.25rem !important;
          line-height: 1.15 !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-card-head > strong {
          display: inline-flex !important;
          align-items: center !important;
          min-height: 36px !important;
          padding: 0 13px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #52617a !important;
          font-size: 0.76rem !important;
          white-space: nowrap !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-day-cards {
          display: grid !important;
          grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          gap: 9px !important;
          width: 100% !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-day-cards button {
          display: grid !important;
          gap: 5px !important;
          min-width: 0 !important;
          min-height: 86px !important;
          padding: 13px 8px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 15px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          text-align: center !important;
          box-shadow: none !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-day-cards button strong {
          font-size: 0.8rem !important;
          font-weight: 900 !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-day-cards button em {
          color: #6d7b91 !important;
          font-size: 0.68rem !important;
          font-style: normal !important;
          font-weight: 700 !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-day-cards button span {
          overflow: hidden !important;
          color: #52617a !important;
          font-size: 0.68rem !important;
          font-weight: 800 !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-day-cards button.is-selected {
          border-color: #f72585 !important;
          background: #fff3f8 !important;
          box-shadow: 0 10px 24px rgba(247, 37, 133, 0.12) !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-day-cards button.is-closed {
          opacity: 0.62 !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-selected-day {
          display: grid !important;
          grid-template-columns: minmax(130px, 0.7fr) auto minmax(260px, 1.3fr) !important;
          align-items: center !important;
          gap: 16px !important;
          padding: 18px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 18px !important;
          background: #ffffff !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-selected-day h5 {
          margin: 4px 0 0 !important;
          color: #071b49 !important;
          font-size: 1rem !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-selected-times {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 12px !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-selected-times label {
          display: grid !important;
          gap: 7px !important;
        }

        .fromone-settings-page .settings-simple-booking-hours .settings-smilez-selected-times input {
          width: 100% !important;
          min-height: 46px !important;
          padding: 10px 12px !important;
          border: 1px solid #dfe5f1 !important;
          border-radius: 12px !important;
          background: #ffffff !important;
          color: #071b49 !important;
          font: inherit !important;
        }

        @media (max-width: 900px) {
          .fromone-settings-page .settings-simple-booking-hours .settings-smilez-day-cards {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }

          .fromone-settings-page .settings-simple-booking-hours .settings-smilez-selected-day {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 620px) {
          .fromone-settings-page .settings-simple-booking-hours {
            padding: 16px !important;
          }

          .fromone-settings-page .settings-simple-booking-hours .settings-smilez-card-head {
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .fromone-settings-page .settings-simple-booking-hours .settings-smilez-day-cards {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .fromone-settings-page .settings-simple-booking-hours .settings-smilez-selected-times {
            grid-template-columns: 1fr !important;
          }
        }

      `}</style>


      {confirmDialog && (() => {
        const activeConfirmDialog = confirmDialog!;

        return (
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
                border: activeConfirmDialog.danger
                  ? '1px solid rgba(255, 95, 109, 0.34)'
                  : '1px solid rgba(255, 212, 59, 0.26)',
                boxShadow: '0 34px 110px rgba(0,0,0,0.48)',
              }}
            >
              <div className="page-eyebrow">
                {activeConfirmDialog.danger ? 'Please confirm' : 'Confirm action'}
              </div>
              <h2 id="settings-confirm-title" style={{ margin: '4px 0 10px' }}>
                {activeConfirmDialog.title}
              </h2>
              <p style={{ margin: '0 0 20px', color: 'var(--muted)', lineHeight: 1.55 }}>
                {activeConfirmDialog.message}
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
                  className={activeConfirmDialog.danger ? 'secondary-button danger-button' : undefined}
                  onClick={() => {
                    if (activeConfirmDialog.type === 'disconnectMeta') {
                      confirmDisconnectMetaAccount(activeConfirmDialog.connectionId);
                      return;
                    }

                    if (activeConfirmDialog.type === 'deleteProfile') {
                      confirmDeleteProfile();
                    }
                  }}
                  disabled={saving || metaConnectionBusy}
                >
                  {saving || metaConnectionBusy ? 'Working...' : activeConfirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

/*
  Settings final polish:
  - shared Supabase browser auth
  - quiet missing-session handling
  - compact publishing channel cards
  - clearer advanced actions
  - mobile-safe final style override
*/