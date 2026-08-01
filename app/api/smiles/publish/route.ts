import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SmilesDraftType = "venue" | "offer" | "event";
type SmilesReferencePrefix = "OF" | "EV";

type BookingCapacityRuleInput = {
  id?: string;
  day_of_week?: number | string;
  dayOfWeek?: number | string;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
  max_covers?: number | string;
  maxCovers?: number | string;
};

type BookingSettingsInput = {
  slot_interval_minutes?: number | string;
  max_covers_per_slot?: number | string;
  max_party_size?: number | string;
  minimum_notice_minutes?: number | string;
  advance_booking_days?: number | string;
  capacity_rules?: BookingCapacityRuleInput[];
  capacityRules?: BookingCapacityRuleInput[];
};

type BookingBlockInput = {
  id?: string;
  block_date?: string;
  blockDate?: string;
  is_full_day?: boolean;
  isFullDay?: boolean;
  start_time?: string | null;
  startTime?: string | null;
  end_time?: string | null;
  endTime?: string | null;
  reason?: string | null;
};

type WeeklyBookingHour = {
  day_of_week?: number;
  dayOfWeek?: number;
  is_closed?: boolean;
  isClosed?: boolean;
  opens_at?: string | null;
  opensAt?: string | null;
  closes_at?: string | null;
  closesAt?: string | null;
};

type SmilesPublishBody = {
  postId?: string;
  campaignPostId?: string;
  campaign_id?: string;
  userId?: string;
  user_id?: string;
  businessProfileId?: string;
  business_profile_id?: string;
  fromoneProfileId?: string;
  fromone_profile_id?: string;
  smilesVenueId?: string;
  smiles_venue_id?: string;
  smilesClientId?: string;
  smiles_client_id?: string;
  venueId?: string;
  venue_id?: string;
  draftType?: SmilesDraftType;
  smilesType?: SmilesDraftType;
  title?: string;
  name?: string;
  caption?: string;
  description?: string;
  shortDescription?: string;
  short_description?: string;
  mediaUrl?: string;
  media_url?: string;
  logoUrl?: string;
  logo_url?: string;
  websiteUrl?: string;
  website_url?: string;
  bookingUrl?: string;
  booking_url?: string;
  locationArea?: string;
  location_area?: string;
  locationName?: string;
  location_name?: string;
  address?: string;
  postcode?: string;
  postcodePrefix?: string;
  postcode_prefix?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  geoEnabled?: boolean;
  geo_enabled?: boolean;
  geoAccuracy?: string;
  geo_accuracy?: string;
  geoSource?: string;
  geo_source?: string;
  serviceRadiusMiles?: number | string;
  service_radius_miles?: number | string;
  geoUpdatedAt?: string | null;
  geo_updated_at?: string | null;
  mapLatitude?: number | string | null;
  map_latitude?: number | string | null;
  mapLongitude?: number | string | null;
  map_longitude?: number | string | null;
  mapLocationVerified?: boolean;
  map_location_verified?: boolean;
  mapLocationVerifiedAt?: string | null;
  map_location_verified_at?: string | null;
  phone?: string;
  email?: string;
  openingHours?: string;
  opening_hours?: string;
  parkingInfo?: string;
  parking_info?: string;
  accessibilityInfo?: string;
  accessibility_info?: string;
  galleryImageUrls?: string[];
  gallery_image_urls?: string[];
  acceptsBookings?: boolean;
  accepts_bookings?: boolean;
  bookingHours?: WeeklyBookingHour[];
  booking_hours?: WeeklyBookingHour[];
  bookingSettings?: BookingSettingsInput;
  booking_settings?: BookingSettingsInput;
  bookingBlocks?: BookingBlockInput[];
  booking_blocks?: BookingBlockInput[];
  venueType?: string;
  venue_type?: string;
  savingText?: string;
  saving_text?: string;
  savingValue?: string;
  saving_value?: string;
  priceValue?: string;
  price_value?: string;
  pricingLabel?: string;
  pricing_label?: string;
  terms?: string;
  validDays?: string;
  valid_days?: string;
  validTimes?: string;
  valid_times?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  priceText?: string;
  price_text?: string;
  ticketPrice?: string;
  ticket_price?: string;
  ticketType?: string;
  ticket_type?: string;
  smilesDraftId?: string;
  smiles_draft_id?: string;
  smilesOfferId?: string;
  smiles_offer_id?: string;
  smilesEventId?: string;
  smiles_event_id?: string;
  smilesReferenceCode?: string;
  smiles_reference_code?: string;
  referenceCode?: string;
  reference_code?: string;
};

const fromOneSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const fromOneServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const smilesSupabaseUrl = process.env.STOCKPORT_SMILES_SUPABASE_URL || "";
const smilesServiceRoleKey =
  process.env.STOCKPORT_SMILES_SUPABASE_SERVICE_ROLE_KEY || "";

function getFromOneSupabaseAdmin() {
  if (!fromOneSupabaseUrl || !fromOneServiceRoleKey) {
    throw new Error("Missing FromOne Supabase environment variables.");
  }

  return createClient(fromOneSupabaseUrl, fromOneServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getSmilesSupabaseAdmin() {
  if (!smilesSupabaseUrl || !smilesServiceRoleKey) {
    throw new Error("Missing Stockport Smiles Supabase environment variables.");
  }

  return createClient(smilesSupabaseUrl, smilesServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanNullableText(value: unknown) {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function cleanImageUrlList(value: unknown, limit = 6) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => cleanText(item))
        .filter(
          (item) =>
            item.startsWith("https://") ||
            item.startsWith("http://") ||
            (item.startsWith("/") && !item.startsWith("//"))
        )
    )
  ).slice(0, limit);
}

function normalisePostcode(value: unknown) {
  return cleanText(value).replace(/\s+/g, " ").trim().toUpperCase();
}

function getPostcodePrefixFromValue(value: unknown) {
  const postcode = normalisePostcode(value).replace(/\s+/g, "");

  if (postcode.length <= 3) {
    return postcode;
  }

  return postcode.slice(0, -3);
}

function getPostcodePrefix(body: SmilesPublishBody) {
  return (
    getPostcodePrefixFromValue(body.postcodePrefix || body.postcode_prefix) ||
    getPostcodePrefixFromValue(body.postcode)
  );
}

function makeSmilesReference(prefix: SmilesReferencePrefix) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const randomPart = Array.from({ length: 6 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");

  return `SM-${prefix}-${randomPart}`;
}

async function makeUniqueSmilesReference({
  smiles,
  table,
  prefix,
}: {
  smiles: ReturnType<typeof getSmilesSupabaseAdmin>;
  table: string;
  prefix: SmilesReferencePrefix;
}) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const referenceCode = makeSmilesReference(prefix);

    const { data, error } = await smiles
      .from(table)
      .select("id")
      .eq("reference_code", referenceCode)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return referenceCode;
    }
  }

  throw new Error("Could not generate a unique Smiles reference. Please try again.");
}

function createSlug(value: string) {
  const base =
    cleanText(value)
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "fromone-draft";

  const suffix = Math.floor(100000 + Math.random() * 900000);

  return `${base}-${suffix}`;
}

function cleanCoordinate(value: unknown, minimum: number, maximum: number, label: string) {
  if (value === null || value === undefined || cleanText(value) === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${label} is not valid.`);
  return parsed;
}

function cleanServiceRadius(value: unknown) {
  const parsed = Number(value ?? 5);
  if (!Number.isFinite(parsed) || parsed < 0.5 || parsed > 50) throw new Error('Nearby discovery radius must be between 0.5 and 50 miles.');
  return parsed;
}

function cleanBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  const cleaned = cleanText(value).toLowerCase();
  return cleaned === 'true' || cleaned === '1' || cleaned === 'yes';
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }

  return "";
}

function firstArray<T = unknown>(...values: unknown[]): T[] {
  for (const value of values) {
    if (Array.isArray(value)) return value as T[];
  }

  return [];
}

function firstDefinedBoolean(...values: unknown[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && cleanText(value) !== "") {
      return cleanBoolean(value);
    }
  }

  return false;
}

function getWeeklyBookingHours(body: SmilesPublishBody) {
  const supplied = body.bookingHours || body.booking_hours;

  if (!Array.isArray(supplied)) {
    return [];
  }

  const seenDays = new Set<number>();

  return supplied.flatMap((row) => {
    const rawDay = row.day_of_week ?? row.dayOfWeek;
    const dayOfWeek = Number(rawDay);

    if (
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      seenDays.has(dayOfWeek)
    ) {
      return [];
    }

    const isClosed = cleanBoolean(row.is_closed ?? row.isClosed);
    const opensAt = isClosed
      ? null
      : cleanTime(row.opens_at ?? row.opensAt);
    const closesAt = isClosed
      ? null
      : cleanTime(row.closes_at ?? row.closesAt);

    if (!isClosed && (!opensAt || !closesAt || opensAt >= closesAt)) {
      throw new Error(
        `Booking hours for day ${dayOfWeek} must include a valid opening and closing time.`
      );
    }

    seenDays.add(dayOfWeek);

    return [
      {
        day_of_week: dayOfWeek,
        is_closed: isClosed,
        opens_at: opensAt,
        closes_at: closesAt,
      },
    ];
  });
}

function getBookingSettings(body: SmilesPublishBody) {
  const supplied = body.bookingSettings || body.booking_settings || {};

  const settings = {
    slot_interval_minutes: Number(supplied.slot_interval_minutes ?? 30),
    max_covers_per_slot: Number(supplied.max_covers_per_slot ?? 20),
    max_party_size: Number(supplied.max_party_size ?? 9),
    minimum_notice_minutes: Number(supplied.minimum_notice_minutes ?? 60),
    advance_booking_days: Number(supplied.advance_booking_days ?? 14),
  };

  if (
    ![15, 30, 45, 60].includes(settings.slot_interval_minutes) ||
    settings.max_covers_per_slot < 1 ||
    settings.max_covers_per_slot > 200 ||
    settings.max_party_size < 1 ||
    settings.max_party_size > settings.max_covers_per_slot ||
    settings.minimum_notice_minutes < 0 ||
    settings.advance_booking_days < 1 ||
    settings.advance_booking_days > 365
  ) {
    throw new Error("Booking capacity settings are not valid.");
  }

  return settings;
}

function getBookingCapacityRules(body: SmilesPublishBody) {
  const suppliedSettings =
    body.bookingSettings || body.booking_settings || {};
  const supplied =
    suppliedSettings.capacity_rules || suppliedSettings.capacityRules;

  if (!Array.isArray(supplied)) {
    return [];
  }

  const rules = supplied.map((rule) => {
    const dayOfWeek = Number(rule.day_of_week ?? rule.dayOfWeek);
    const startTime = cleanTime(rule.start_time ?? rule.startTime);
    const endTime = cleanTime(rule.end_time ?? rule.endTime);
    const maxCovers = Number(rule.max_covers ?? rule.maxCovers);

    if (
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      !startTime ||
      !endTime ||
      startTime >= endTime ||
      !Number.isInteger(maxCovers) ||
      maxCovers < 1 ||
      maxCovers > 200
    ) {
      throw new Error("An advanced booking capacity rule is not valid.");
    }

    return {
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      max_covers: maxCovers,
    };
  });

  const sortedRules = [...rules].sort(
    (first, second) =>
      first.day_of_week - second.day_of_week ||
      first.start_time.localeCompare(second.start_time),
  );

  for (let index = 1; index < sortedRules.length; index += 1) {
    const previous = sortedRules[index - 1];
    const current = sortedRules[index];

    if (
      previous.day_of_week === current.day_of_week &&
      current.start_time < previous.end_time
    ) {
      throw new Error(
        "Advanced booking capacity rules cannot overlap on the same day.",
      );
    }
  }

  return rules;
}

function getBookingBlocks(body: SmilesPublishBody) {
  const supplied = body.bookingBlocks || body.booking_blocks;

  if (!Array.isArray(supplied)) {
    return null;
  }

  return supplied.map((block) => {
    const blockDate = cleanDate(block.block_date || block.blockDate);
    const isFullDay = cleanBoolean(block.is_full_day ?? block.isFullDay);
    const startTime = isFullDay
      ? null
      : cleanTime(block.start_time ?? block.startTime);
    const endTime = isFullDay
      ? null
      : cleanTime(block.end_time ?? block.endTime);

    if (!blockDate) {
      throw new Error("Each blocked booking period needs a valid date.");
    }

    if (!isFullDay && (!startTime || !endTime || startTime >= endTime)) {
      throw new Error(
        `Blocked booking times on ${blockDate} need a valid start and end time.`
      );
    }

    return {
      block_date: blockDate,
      is_full_day: isFullDay,
      start_time: startTime,
      end_time: endTime,
      reason: cleanNullableText(block.reason),
    };
  });
}

function buildOpeningHoursText(
  body: SmilesPublishBody,
  weeklyHours: ReturnType<typeof getWeeklyBookingHours>
) {
  const supplied = cleanNullableText(body.openingHours || body.opening_hours);

  if (supplied) {
    return supplied;
  }

  if (weeklyHours.length === 0) {
    return null;
  }

  const dayLabels = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return weeklyHours
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((row) =>
      row.is_closed
        ? `${dayLabels[row.day_of_week]}: Closed`
        : `${dayLabels[row.day_of_week]}: ${cleanText(row.opens_at).slice(
            0,
            5
          )}-${cleanText(row.closes_at).slice(0, 5)}`
    )
    .join("\n");
}

function cleanDate(value: unknown) {
  const cleaned = cleanText(value);

  if (!cleaned) return null;

  const date = new Date(cleaned);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function cleanTime(value: unknown) {
  const cleaned = cleanText(value);

  if (!cleaned) return null;

  const match = cleaned.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);

  if (!match) return null;

  return `${match[1].padStart(2, "0")}:${match[2]}:${match[3] || "00"}`;
}

function getDraftType(body: SmilesPublishBody): SmilesDraftType {
  const requestedType = cleanText(body.draftType || body.smilesType)
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (
    requestedType === "venue" ||
    requestedType === "offer" ||
    requestedType === "event"
  ) {
    return requestedType;
  }

  return "offer";
}

function getFromOneProfileId(body: SmilesPublishBody) {
  return cleanText(
    body.businessProfileId ||
      body.business_profile_id ||
      body.fromoneProfileId ||
      body.fromone_profile_id
  );
}

function getExplicitSmilesVenueId(body: SmilesPublishBody) {
  return cleanText(
    body.smilesVenueId || body.smiles_venue_id || body.venueId || body.venue_id
  );
}

function getExplicitSmilesClientId(body: SmilesPublishBody) {
  return cleanText(body.smilesClientId || body.smiles_client_id);
}

function buildPublishedToValue(currentValue: unknown) {
  if (Array.isArray(currentValue)) {
    return Array.from(new Set([...currentValue, "stockport_smiles"]));
  }

  if (typeof currentValue === "string" && currentValue.trim()) {
    return Array.from(
      new Set([currentValue.toLowerCase(), "stockport_smiles"])
    );
  }

  return ["stockport_smiles"];
}

function buildDescription(body: SmilesPublishBody, fallback = "") {
  return (
    cleanText(body.description) ||
    cleanText(body.caption) ||
    cleanText(fallback) ||
    "Created from FromOne."
  );
}

function buildShortDescription(body: SmilesPublishBody, fallback = "") {
  const supplied =
    cleanText(body.shortDescription || body.short_description) ||
    cleanText(body.caption) ||
    cleanText(fallback);

  if (!supplied) return "Created from FromOne.";

  return supplied.length > 160
    ? `${supplied.slice(0, 157).trim()}...`
    : supplied;
}

function getExistingSmilesDraftId(body: SmilesPublishBody, draftType: SmilesDraftType) {
  if (draftType === "offer") {
    return cleanText(
      body.smilesOfferId || body.smiles_offer_id || body.smilesDraftId || body.smiles_draft_id
    );
  }

  if (draftType === "event") {
    return cleanText(
      body.smilesEventId || body.smiles_event_id || body.smilesDraftId || body.smiles_draft_id
    );
  }

  return cleanText(body.smilesDraftId || body.smiles_draft_id);
}

function getExistingSmilesReferenceCode(body: SmilesPublishBody) {
  return cleanText(
    body.smilesReferenceCode ||
      body.smiles_reference_code ||
      body.referenceCode ||
      body.reference_code
  );
}

function buildOfferPricing(body: SmilesPublishBody) {
  const pricingLabel = cleanNullableText(body.pricingLabel || body.pricing_label);
  const priceValue = cleanNullableText(
    body.priceValue || body.price_value || body.savingValue || body.saving_value
  );
  const savingText =
    cleanText(body.savingText || body.saving_text) ||
    [pricingLabel, priceValue].filter(Boolean).join(" · ") ||
    "Special offer";

  return {
    pricing_label: pricingLabel,
    price_value: priceValue,
    saving_text: savingText,
  };
}

function buildEventTicketing(body: SmilesPublishBody) {
  const ticketType = cleanNullableText(body.ticketType || body.ticket_type);
  const ticketPrice = cleanNullableText(
    body.ticketPrice || body.ticket_price || body.priceValue || body.price_value
  );
  const priceText =
    cleanNullableText(body.priceText || body.price_text) ||
    [ticketType, ticketPrice].filter(Boolean).join(" · ") ||
    ticketType ||
    ticketPrice;

  return {
    ticket_type: ticketType,
    ticket_price: ticketPrice,
    price_text: priceText || null,
  };
}

async function findExistingSmilesDraftIdForPost({
  postId,
  draftType,
}: {
  postId: string;
  draftType: SmilesDraftType;
}) {
  if (!postId || (draftType !== "offer" && draftType !== "event")) {
    return "";
  }

  const supabase = getFromOneSupabaseAdmin();
  const { data: post, error } = await supabase
    .from("campaign_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    console.error("Could not load existing Smiles reference:", error.message);
    return "";
  }

  const metadata = (post as any)?.smiles_metadata || (post as any)?.metadata || {};
  const table = cleanText((post as any)?.smiles_table || metadata?.smiles_table);
  const draftId = cleanText(
    (post as any)?.smiles_draft_id ||
      (post as any)?.smiles_offer_id ||
      (post as any)?.smiles_event_id ||
      metadata?.smiles_draft_id
  );

  if (!draftId) {
    return "";
  }

  if (draftType === "offer" && table && table !== "offers") {
    return "";
  }

  if (draftType === "event" && table && table !== "events") {
    return "";
  }

  return draftId;
}

async function findExistingSmilesItem({
  smiles,
  table,
  postId,
  explicitId,
  referenceCode,
}: {
  smiles: ReturnType<typeof getSmilesSupabaseAdmin>;
  table: "offers" | "events";
  postId: string;
  explicitId?: string;
  referenceCode?: string;
}) {
  if (explicitId) {
    const { data, error } = await smiles
      .from(table)
      .select("*")
      .eq("id", explicitId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) return data as any;
  }

  if (referenceCode) {
    const { data, error } = await smiles
      .from(table)
      .select("*")
      .eq("reference_code", referenceCode)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) return data as any;
  }

  if (!postId) return null;

  const { data, error } = await smiles
    .from(table)
    .select("*")
    .eq("fromone_post_id", postId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as any) || null;
}

async function findUserIdForPost({
  supabase,
  body,
}: {
  supabase: any;
  body: SmilesPublishBody;
}) {
  const explicitUserId = cleanText(body.userId || body.user_id);

  if (explicitUserId) return explicitUserId;

  const postId = cleanText(body.postId || body.campaignPostId);

  if (!postId) return "";

  const { data: post } = await supabase
    .from("campaign_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  const postUserId = cleanText(
    (post as any)?.user_id || (post as any)?.created_by
  );

  if (postUserId) return postUserId;

  const campaignId = cleanText((post as any)?.campaign_id || body.campaign_id);

  if (!campaignId) return "";

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  return cleanText(
    (campaign as any)?.user_id ||
      (campaign as any)?.created_by ||
      (campaign as any)?.owner_id ||
      ""
  );
}

async function findSmilesVenueIdForBody({
  supabase,
  body,
  userId,
}: {
  supabase: any;
  body: SmilesPublishBody;
  userId: string;
}) {
  const explicitVenueId = getExplicitSmilesVenueId(body);

  if (explicitVenueId) return explicitVenueId;

  const profileId = getFromOneProfileId(body);

  if (profileId) {
    const { data: profile, error } = await supabase
      .from("business_profiles")
      .select("smiles_listing_venue_id")
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      console.error("Could not load Smiles venue id from profile:", error.message);
    }

    const venueId = cleanText((profile as any)?.smiles_listing_venue_id);

    if (venueId) return venueId;
  }

  if (!userId) return "";

  const { data: profile, error } = await supabase
    .from("business_profiles")
    .select("smiles_listing_venue_id")
    .eq("user_id", userId)
    .not("smiles_listing_venue_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Could not load Smiles venue id from user profile:", error.message);
  }

  return cleanText((profile as any)?.smiles_listing_venue_id);
}

async function insertPublishLog({
  userId,
  postId,
  status,
  message,
  error,
  metadata = {},
}: {
  userId?: string | null;
  postId?: string | null;
  status: "posted" | "failed";
  message: string;
  error?: string | null;
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = getFromOneSupabaseAdmin();

    await supabase.from("publish_logs").insert({
      user_id: userId || null,
      post_id: postId || null,
      platform: "stockport_smiles",
      action: "smiles_draft_publish",
      status,
      message,
      error: error || null,
      credential_source: "stockport_smiles_service_role",
      social_connection_id: null,
      provider_post_id: null,
      metadata,
    });
  } catch (logError: any) {
    console.error(
      "Smiles publish log insert failed:",
      logError?.message || logError
    );
  }
}

async function updateFromOnePostAfterSmilesDraft({
  postId,
  smilesTable,
  smilesDraftId,
}: {
  postId?: string;
  smilesTable: string;
  smilesDraftId: string;
}) {
  if (!postId) return;

  const supabase = getFromOneSupabaseAdmin();

  const { data: currentPost } = await supabase
    .from("campaign_posts")
    .select("published_to")
    .eq("id", postId)
    .maybeSingle();

  const updates = {
    published_to: buildPublishedToValue((currentPost as any)?.published_to),
    publish_error: null,
    smiles_table: smilesTable,
    smiles_draft_id: smilesDraftId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("campaign_posts")
    .update(updates)
    .eq("id", postId);

  if (error) {
    console.error(
      "Could not update FromOne post after Smiles draft:",
      error.message
    );
  }

  await insertPublishLog({
    postId,
    status: "posted",
    message: "Draft sent to Stockport Smiles.",
    metadata: {
      smiles_table: smilesTable,
      smiles_draft_id: smilesDraftId,
    },
  });
}

async function syncLinkedSmilesClientGeo(body: SmilesPublishBody) {
  const fromOne = getFromOneSupabaseAdmin();
  const smiles = getSmilesSupabaseAdmin();

  const fromOneProfileId = getFromOneProfileId(body);
  let smilesClientId = getExplicitSmilesClientId(body);
  let smilesVenueId = getExplicitSmilesVenueId(body);
  let profile: any = null;

  if (fromOneProfileId) {
    const { data, error: profileError } = await fromOne
      .from("business_profiles")
      .select("*")
      .eq("id", fromOneProfileId)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Could not load linked Smilez business profile:",
        profileError.message
      );
      throw new Error(profileError.message);
    }

    profile = data;
    smilesClientId =
      smilesClientId ||
      cleanText(profile?.smiles_listing_client_id);
    smilesVenueId =
      smilesVenueId ||
      cleanText(profile?.smiles_listing_venue_id);
  }

  if (!smilesVenueId) {
    return {
      synced: false,
      clientId: smilesClientId || null,
      venueId: null,
      reason: "missing_smiles_venue_id",
    };
  }

  const latitude = cleanCoordinate(
    body.mapLatitude ??
      body.map_latitude ??
      body.latitude ??
      profile?.latitude,
    -90,
    90,
    "Latitude",
  );
  const longitude = cleanCoordinate(
    body.mapLongitude ??
      body.map_longitude ??
      body.longitude ??
      profile?.longitude,
    -180,
    180,
    "Longitude",
  );
  const geoEnabled = firstDefinedBoolean(
    body.mapLocationVerified,
    body.map_location_verified,
    body.geoEnabled,
    body.geo_enabled,
    profile?.geo_enabled,
  );
  const serviceRadiusMiles = cleanServiceRadius(
    body.serviceRadiusMiles ??
      body.service_radius_miles ??
      profile?.service_radius_miles
  );

  if (geoEnabled && (latitude === null || longitude === null)) {
    throw new Error(
      "Confirm the venue location before enabling nearby discovery."
    );
  }

  const name = firstText(body.name, body.title, profile?.business_name);
  const description = firstText(
    body.description,
    body.caption,
    profile?.brand_summary,
    profile?.main_offer,
    Array.isArray(profile?.services) ? profile.services.join(", ") : "",
    name ? `${name} is a local business.` : "",
  );
  const shortDescription = buildShortDescription(
    {
      ...body,
      shortDescription: firstText(
        body.shortDescription,
        body.short_description,
        profile?.brand_summary,
      ),
    },
    description,
  );
  const venueType =
    cleanNullableText(
      firstText(body.venueType, body.venue_type, profile?.industry)
    ) || "Business";
  const area = cleanNullableText(
    firstText(body.locationArea, body.location_area, profile?.location)
  );
  const postcode = normalisePostcode(
    firstText(body.postcode, profile?.postcode)
  );
  const postcodePrefix =
    getPostcodePrefix(body) ||
    getPostcodePrefixFromValue(profile?.postcode_prefix) ||
    getPostcodePrefixFromValue(profile?.postcode);
  const phone = cleanNullableText(firstText(body.phone, profile?.phone));
  const email = cleanNullableText(firstText(body.email, profile?.email));
  const websiteUrl = cleanNullableText(
    firstText(body.websiteUrl, body.website_url, profile?.website_url)
  );
  const mainImageUrl = cleanNullableText(
    firstText(
      body.mediaUrl,
      body.media_url,
      profile?.brand_logo_url,
      firstArray<string>(profile?.gallery_image_urls)[0],
    )
  );
  const logoUrl = cleanNullableText(
    firstText(body.logoUrl, body.logo_url, profile?.brand_logo_url)
  );
  const weeklyBookingHours = getWeeklyBookingHours({
    ...body,
    bookingHours: firstArray<WeeklyBookingHour>(
      body.bookingHours,
      body.booking_hours,
      profile?.booking_hours,
    ),
  });
  const openingHours = buildOpeningHoursText(
    {
      ...body,
      openingHours: firstText(
        body.openingHours,
        body.opening_hours,
        profile?.opening_hours,
      ),
    },
    weeklyBookingHours,
  );
  const parkingInfo = cleanNullableText(
    firstText(body.parkingInfo, body.parking_info, profile?.parking_info)
  );
  const accessibilityInfo = cleanNullableText(
    firstText(
      body.accessibilityInfo,
      body.accessibility_info,
      profile?.accessibility_info,
    )
  );
  const galleryImageUrls = cleanImageUrlList(
    firstArray<string>(
      body.galleryImageUrls,
      body.gallery_image_urls,
      profile?.gallery_image_urls,
    )
  );
  const acceptsBookings =
    firstDefinedBoolean(
      body.acceptsBookings,
      body.accepts_bookings,
      profile?.accepts_bookings,
    ) ||
    weeklyBookingHours.length > 0 ||
    Boolean(firstText(body.bookingUrl, body.booking_url, profile?.booking_url));
  const bookingUrl = acceptsBookings
    ? cleanNullableText(
        firstText(body.bookingUrl, body.booking_url, profile?.booking_url)
      )
    : null;
  const resolvedBookingSettings =
    body.bookingSettings ||
    body.booking_settings ||
    profile?.booking_settings;

  const bookingSettings = getBookingSettings({
    ...body,
    bookingSettings: resolvedBookingSettings,
  });
  const bookingCapacityRules = getBookingCapacityRules({
    ...body,
    bookingSettings: resolvedBookingSettings,
  });
  const bookingBlocks = getBookingBlocks({
    ...body,
    bookingBlocks:
      body.bookingBlocks ||
      body.booking_blocks ||
      profile?.booking_blocks,
  });
  const now = new Date().toISOString();
  const geoUpdatedAt =
    cleanNullableText(
      body.mapLocationVerifiedAt ||
        body.map_location_verified_at ||
        body.geoUpdatedAt ||
        body.geo_updated_at ||
        profile?.geo_updated_at,
    ) || (latitude !== null && longitude !== null ? now : null);

  const sharedLocationUpdates = {
    address: cleanNullableText(firstText(body.address, profile?.address)),
    postcode: postcode || null,
    postcode_prefix: postcodePrefix || null,
    latitude,
    longitude,
    geo_enabled: geoEnabled,
    geo_accuracy: cleanNullableText(
      firstText(body.geoAccuracy, body.geo_accuracy, profile?.geo_accuracy)
    ),
    geo_source: cleanNullableText(
      firstText(body.geoSource, body.geo_source, profile?.geo_source)
    ),
    service_radius_miles: serviceRadiusMiles,
    geo_updated_at: geoUpdatedAt,
    updated_at: now,
  };

  const clientUpdates = {
    ...sharedLocationUpdates,
    map_latitude: latitude,
    map_longitude: longitude,
    map_location_verified:
      geoEnabled && latitude !== null && longitude !== null,
    map_location_verified_at:
      geoEnabled && latitude !== null && longitude !== null
        ? geoUpdatedAt || now
        : null,
    ...(name ? { business_name: name } : {}),
    description,
    short_description: shortDescription,
    area,
    phone,
    email,
    website_url: websiteUrl,
    opening_hours: openingHours,
    parking_info: parkingInfo,
    accessibility_info: accessibilityInfo,
    gallery_image_urls: galleryImageUrls,
    accepts_bookings: acceptsBookings,
    booking_url: bookingUrl,
    main_image_url: mainImageUrl,
    logo_url: logoUrl,
  };

  const venueUpdates = {
    ...sharedLocationUpdates,
    ...(name ? { name } : {}),
    description,
    short_description: shortDescription,
    venue_type: venueType,
    location_area: area,
    phone,
    email,
    website_url: websiteUrl,
    booking_url: bookingUrl,
    opening_hours: openingHours,
    parking_info: parkingInfo,
    accessibility_info: accessibilityInfo,
    gallery_images: galleryImageUrls,
    main_image_url: mainImageUrl,
  };

  if (smilesClientId) {
    const { data: updatedClient, error: clientUpdateError } = await smiles
      .from("clients")
      .update(clientUpdates)
      .eq("id", smilesClientId)
      .select("id")
      .maybeSingle();

    if (clientUpdateError) {
      console.error("Linked Smilez client update failed:", {
        clientId: smilesClientId,
        message: clientUpdateError.message,
      });
      throw new Error(
        `The linked Smilez client record could not be updated: ${clientUpdateError.message}`
      );
    }

    if (!updatedClient?.id) {
      throw new Error("The linked Smilez client record could not be found.");
    }
  }

  const { data: updatedVenue, error: venueUpdateError } = await smiles
    .from("venues")
    .update(venueUpdates)
    .eq("id", smilesVenueId)
    .select("id")
    .maybeSingle();

  if (venueUpdateError) {
    console.error("Linked Smilez venue update failed:", {
      venueId: smilesVenueId,
      message: venueUpdateError.message,
    });
    throw new Error(
      `The linked Smilez venue record could not be updated: ${venueUpdateError.message}`
    );
  }

  if (!updatedVenue?.id) {
    throw new Error("The linked Smilez venue record could not be found.");
  }

  if (weeklyBookingHours.length > 0) {
    const bookingHourRows = weeklyBookingHours.map((row) => ({
      client_id: smilesClientId || null,
      venue_id: smilesVenueId,
      day_of_week: row.day_of_week,
      is_closed: row.is_closed,
      opens_at: row.is_closed ? null : row.opens_at,
      closes_at: row.is_closed ? null : row.closes_at,
      created_at: now,
      updated_at: now,
    }));

    const { error: deleteBookingHoursError } = await smiles
      .from("client_booking_hours")
      .delete()
      .eq("venue_id", smilesVenueId);

    if (deleteBookingHoursError) {
      throw new Error(deleteBookingHoursError.message);
    }

    const { error: insertBookingHoursError } = await smiles
      .from("client_booking_hours")
      .insert(bookingHourRows);

    if (insertBookingHoursError) {
      throw new Error(insertBookingHoursError.message);
    }
  }

  if (acceptsBookings && !bookingUrl) {
    const { data: existingVenueSettings, error: existingSettingsError } =
      await smiles
        .from("client_booking_settings")
        .select("id")
        .eq("venue_id", smilesVenueId)
        .limit(1)
        .maybeSingle();

    if (existingSettingsError) {
      throw new Error(existingSettingsError.message);
    }

    const settingsPayload = {
      client_id: smilesClientId || null,
      venue_id: smilesVenueId,
      ...bookingSettings,
      updated_at: now,
    };

    const settingsQuery = existingVenueSettings?.id
      ? smiles
          .from("client_booking_settings")
          .update(settingsPayload)
          .eq("id", existingVenueSettings.id)
      : smiles
          .from("client_booking_settings")
          .insert({
            ...settingsPayload,
            created_at: now,
          });

    const { error: settingsError } = await settingsQuery;

    if (settingsError) {
      throw new Error(settingsError.message);
    }
  }

  const { error: deleteCapacityRulesError } = await smiles
    .from("client_booking_capacity_rules")
    .delete()
    .eq("venue_id", smilesVenueId);

  if (deleteCapacityRulesError) {
    throw new Error(deleteCapacityRulesError.message);
  }

  if (bookingCapacityRules.length > 0) {
    const { error: insertCapacityRulesError } = await smiles
      .from("client_booking_capacity_rules")
      .insert(
        bookingCapacityRules.map((rule) => ({
          client_id: smilesClientId || null,
          venue_id: smilesVenueId,
          day_of_week: rule.day_of_week,
          start_time: rule.start_time,
          end_time: rule.end_time,
          max_covers: rule.max_covers,
          created_at: now,
          updated_at: now,
        })),
      );

    if (insertCapacityRulesError) {
      throw new Error(insertCapacityRulesError.message);
    }
  }

  if (bookingBlocks !== null) {
    let deleteBlocksQuery = smiles
      .from("client_booking_blocks")
      .delete()
      .eq("venue_id", smilesVenueId);

    if (smilesClientId) {
      deleteBlocksQuery = deleteBlocksQuery.eq("client_id", smilesClientId);
    }

    const { error: deleteBlocksError } = await deleteBlocksQuery;

    if (deleteBlocksError) {
      throw new Error(deleteBlocksError.message);
    }

    if (bookingBlocks.length > 0) {
      const { error: insertBlocksError } = await smiles
        .from("client_booking_blocks")
        .insert(
          bookingBlocks.map((block) => ({
            client_id: smilesClientId || null,
            venue_id: smilesVenueId,
            ...block,
            updated_at: now,
          }))
        );

      if (insertBlocksError) {
        throw new Error(insertBlocksError.message);
      }
    }
  }

  return {
    synced: true,
    clientId: smilesClientId,
    venueId: smilesVenueId,
    reason: null as string | null,
  };
}

async function createVenueDraft(body: SmilesPublishBody, userId = "") {
  const smiles = getSmilesSupabaseAdmin();

  const name = cleanText(body.name || body.title) || "FromOne venue draft";
  const description = buildDescription(body);
  const shortDescription = buildShortDescription(body, description);
  const now = new Date().toISOString();
  const fromOneProfileId = getFromOneProfileId(body);
  const postcode = normalisePostcode(body.postcode);
  const postcodePrefix = getPostcodePrefix(body);
  const latitude = cleanCoordinate(
    body.mapLatitude ??
      body.map_latitude ??
      body.latitude,
    -90,
    90,
    'Latitude',
  );
  const longitude = cleanCoordinate(
    body.mapLongitude ??
      body.map_longitude ??
      body.longitude,
    -180,
    180,
    'Longitude',
  );
  const geoEnabled = cleanBoolean(
    body.mapLocationVerified ??
      body.map_location_verified ??
      body.geoEnabled ??
      body.geo_enabled,
  );
  const serviceRadiusMiles = cleanServiceRadius(body.serviceRadiusMiles ?? body.service_radius_miles);
  const geoUpdatedAt = cleanNullableText(
    body.mapLocationVerifiedAt ||
      body.map_location_verified_at ||
      body.geoUpdatedAt ||
      body.geo_updated_at,
  );
  const weeklyBookingHours = getWeeklyBookingHours(body);
  const openingHours = buildOpeningHoursText(body, weeklyBookingHours);
  const parkingInfo = cleanNullableText(body.parkingInfo || body.parking_info);
  const accessibilityInfo = cleanNullableText(
    body.accessibilityInfo || body.accessibility_info
  );
  const galleryImageUrls = cleanImageUrlList(
    body.galleryImageUrls || body.gallery_image_urls
  );

  if (geoEnabled && (latitude === null || longitude === null)) {
    throw new Error('Confirm the venue location before enabling nearby discovery.');
  }

  const payload = {
    business_name: name,
    venue_name: name,
    description,
    short_description: shortDescription,
    venue_type: cleanText(body.venueType || body.venue_type) || "Business",
    location_area:
      cleanText(body.locationArea || body.location_area) || "Stockport",
    address: cleanNullableText(body.address),
    postcode: postcode || null,
    postcode_prefix: postcodePrefix || null,
    latitude,
    longitude,
    geo_enabled: geoEnabled,
    geo_accuracy: cleanNullableText(body.geoAccuracy || body.geo_accuracy),
    geo_source: cleanNullableText(body.geoSource || body.geo_source),
    service_radius_miles: serviceRadiusMiles,
    geo_updated_at: geoUpdatedAt,
    phone: cleanNullableText(body.phone),
    email: cleanNullableText(body.email),
    website_url: cleanNullableText(body.websiteUrl || body.website_url),
    opening_hours: openingHours,
    parking_info: parkingInfo,
    accessibility_info: accessibilityInfo,
    gallery_image_urls: galleryImageUrls,
    accepts_bookings: cleanBoolean(
      body.acceptsBookings ?? body.accepts_bookings
    ),
    booking_url: cleanNullableText(body.bookingUrl || body.booking_url),
    booking_hours: weeklyBookingHours,
    booking_settings: getBookingSettings(body),
    booking_blocks: getBookingBlocks(body) || [],
    main_image_url: cleanNullableText(body.mediaUrl || body.media_url),
    logo_url: cleanNullableText(body.logoUrl || body.logo_url),
    source: "fromone",
    fromone_source: "business_profile",
    fromone_user_id: userId || null,
    fromone_profile_id: fromOneProfileId || null,
    fromone_business_name: name,
  };

  const draft = {
    id: crypto.randomUUID(),
    client_id: null,
    source: "fromone",
    submission_type: "venue_update",
    title: name,
    summary: shortDescription,
    payload,
    status: "pending",
    admin_notes: null,
    submitted_at: now,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await smiles
    .from("submissions")
    .insert(draft)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    table: "submissions",
    draftId: data.id,
    slug: createSlug(name),
    draft,
  };
}

async function createOfferDraft(
  body: SmilesPublishBody,
  smilesVenueId = "",
  existingDraftId = ""
) {
  const smiles = getSmilesSupabaseAdmin();
  const postId = cleanText(body.postId || body.campaignPostId);
  const referenceCodeFromBody = getExistingSmilesReferenceCode(body);
  const existingOffer = await findExistingSmilesItem({
    smiles,
    table: "offers",
    postId,
    explicitId: existingDraftId,
    referenceCode: referenceCodeFromBody,
  });

  const title = cleanText(body.title || body.name) || "FromOne offer draft";
  const description = buildDescription(body);
  const shortDescription = buildShortDescription(body, description);
  const now = new Date().toISOString();
  const referenceCode = existingOffer
    ? cleanText(existingOffer.reference_code)
    : referenceCodeFromBody ||
      (await makeUniqueSmilesReference({
        smiles,
        table: "offers",
        prefix: "OF",
      }));
  const pricing = buildOfferPricing(body);

  const draft = {
    client_id: null,
    venue_id: cleanNullableText(smilesVenueId),
    category_id: null,
    title,
    slug: existingOffer?.slug || createSlug(title),
    description,
    short_description: shortDescription,
    start_date: cleanDate(body.startDate || body.start_date),
    end_date: cleanDate(body.endDate || body.end_date),
    valid_days: cleanNullableText(body.validDays || body.valid_days),
    valid_times: cleanNullableText(body.validTimes || body.valid_times),
    terms: cleanText(body.terms) || "Subject to availability.",
    ...pricing,
    main_image_url: cleanNullableText(body.mediaUrl || body.media_url),
    fromone_post_id: cleanNullableText(postId),
    fromone_profile_id: cleanNullableText(getFromOneProfileId(body)),
    is_featured: Boolean(existingOffer?.is_featured),
    is_published: true,
    updated_at: now,
  };

  const query = existingOffer?.id
    ? smiles
        .from("offers")
        .update(draft)
        .eq("id", existingOffer.id)
        .select("id, slug, reference_code")
        .single()
    : smiles
        .from("offers")
        .insert({
          ...draft,
          id: crypto.randomUUID(),
          reference_code: referenceCode,
          created_at: now,
        })
        .select("id, slug, reference_code")
        .single();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    table: "offers",
    draftId: data.id,
    slug: data.slug,
    referenceCode: (data as any).reference_code || referenceCode,
    updatedExisting: Boolean(existingOffer?.id),
    draft,
  };
}

async function createEventDraft(
  body: SmilesPublishBody,
  smilesVenueId = "",
  existingDraftId = ""
) {
  const smiles = getSmilesSupabaseAdmin();
  const postId = cleanText(body.postId || body.campaignPostId);
  const referenceCodeFromBody = getExistingSmilesReferenceCode(body);
  const existingEvent = await findExistingSmilesItem({
    smiles,
    table: "events",
    postId,
    explicitId: existingDraftId,
    referenceCode: referenceCodeFromBody,
  });

  const title = cleanText(body.title || body.name) || "FromOne event draft";
  const description = buildDescription(body);
  const shortDescription = buildShortDescription(body, description);
  const now = new Date().toISOString();
  const referenceCode = existingEvent
    ? cleanText(existingEvent.reference_code)
    : referenceCodeFromBody ||
      (await makeUniqueSmilesReference({
        smiles,
        table: "events",
        prefix: "EV",
      }));
  const ticketing = buildEventTicketing(body);

  const draft = {
    client_id: null,
    venue_id: cleanNullableText(smilesVenueId),
    category_id: null,
    title,
    slug: existingEvent?.slug || createSlug(title),
    description,
    short_description: shortDescription,
    location_name: cleanNullableText(body.locationName || body.location_name),
    address: cleanNullableText(body.address),
    start_date: cleanDate(body.startDate || body.start_date),
    end_date: cleanDate(body.endDate || body.end_date),
    start_time: cleanTime(body.startTime || body.start_time),
    end_time: cleanTime(body.endTime || body.end_time),
    ...ticketing,
    booking_url: cleanNullableText(body.bookingUrl || body.booking_url),
    main_image_url: cleanNullableText(body.mediaUrl || body.media_url),
    fromone_post_id: cleanNullableText(postId),
    fromone_profile_id: cleanNullableText(getFromOneProfileId(body)),
    is_featured: Boolean(existingEvent?.is_featured),
    is_published: true,
    updated_at: now,
  };

  const query = existingEvent?.id
    ? smiles
        .from("events")
        .update(draft)
        .eq("id", existingEvent.id)
        .select("id, slug, reference_code")
        .single()
    : smiles
        .from("events")
        .insert({
          ...draft,
          id: crypto.randomUUID(),
          reference_code: referenceCode,
          created_at: now,
        })
        .select("id, slug, reference_code")
        .single();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    table: "events",
    draftId: data.id,
    slug: data.slug,
    referenceCode: (data as any).reference_code || referenceCode,
    updatedExisting: Boolean(existingEvent?.id),
    draft,
  };
}

export async function POST(req: NextRequest) {
  let body: SmilesPublishBody = {};

  try {
    body = await req.json();

    const fromOneSupabase = getFromOneSupabaseAdmin();
    const postId = cleanText(body.postId || body.campaignPostId);
    const userId = await findUserIdForPost({
      supabase: fromOneSupabase,
      body,
    });

    const draftType = getDraftType(body);

    if (draftType === "venue") {
      const directSync = await syncLinkedSmilesClientGeo(body);

      if (directSync.synced) {
        const successMessage =
          "Live Smilez business profile updated automatically.";

        await insertPublishLog({
          userId,
          postId,
          status: "posted",
          message: successMessage,
          metadata: {
            smiles_type: draftType,
            fromone_profile_id: getFromOneProfileId(body) || null,
            direct_client_sync: true,
            synced_client_id: directSync.clientId,
            synced_venue_id: directSync.venueId,
            admin_approval_bypassed: true,
          },
        });

        return NextResponse.json({
          ok: true,
          success: true,
          provider: "stockport_smiles",
          message: successMessage,
          smilesType: draftType,
          smilesTable: "clients,venues",
          smilesDraftId: null,
          smilesSlug: null,
          smilesReferenceCode: null,
          smilesVenueId: directSync.venueId,
          directSync: true,
          syncedClientId: directSync.clientId,
          syncedVenueId: directSync.venueId,
          directSyncReason: null,
          isPublished: true,
          updatedExisting: true,
          requiresAdminApproval: false,
        });
      }

      const result = await createVenueDraft(body, userId);

      await updateFromOnePostAfterSmilesDraft({
        postId,
        smilesTable: result.table,
        smilesDraftId: result.draftId,
      });

      await insertPublishLog({
        userId,
        postId,
        status: "posted",
        message: "New Smilez business listing sent for admin approval.",
        metadata: {
          smiles_type: draftType,
          smiles_table: result.table,
          smiles_draft_id: result.draftId,
          smiles_slug: result.slug,
          fromone_profile_id: getFromOneProfileId(body) || null,
          direct_client_sync: false,
          direct_client_sync_reason: directSync.reason,
          linked_client_id: directSync.clientId,
          linked_venue_id: directSync.venueId,
          requires_admin_approval: true,
        },
      });

      return NextResponse.json({
        ok: true,
        success: true,
        provider: "stockport_smiles",
        message: "New Smilez business listing sent for admin approval.",
        smilesType: draftType,
        smilesTable: result.table,
        smilesDraftId: result.draftId,
        smilesSlug: result.slug,
        smilesReferenceCode: null,
        smilesVenueId: directSync.venueId,
        directSync: false,
        syncedClientId: directSync.clientId,
        syncedVenueId: directSync.venueId,
        directSyncReason: directSync.reason,
        isPublished: false,
        updatedExisting: false,
        requiresAdminApproval: true,
      });
    }

    const existingSmilesDraftId =
      getExistingSmilesDraftId(body, draftType) ||
      (await findExistingSmilesDraftIdForPost({ postId, draftType }));

    const smilesVenueId = await findSmilesVenueIdForBody({
      supabase: fromOneSupabase,
      body,
      userId,
    });

    const result =
      draftType === "event"
        ? await createEventDraft(body, smilesVenueId, existingSmilesDraftId)
        : await createOfferDraft(body, smilesVenueId, existingSmilesDraftId);

    await updateFromOnePostAfterSmilesDraft({
      postId,
      smilesTable: result.table,
      smilesDraftId: result.draftId,
    });

    const updatedExisting = Boolean(
      (result as any).updatedExisting || existingSmilesDraftId
    );
    const successMessage = updatedExisting
      ? "Smilez item updated."
      : "Draft sent to Stockport Smilez.";

    await insertPublishLog({
      userId,
      postId,
      status: "posted",
      message: successMessage,
      metadata: {
        smiles_type: draftType,
        smiles_table: result.table,
        smiles_draft_id: result.draftId,
        smiles_slug: result.slug,
        smiles_reference_code: (result as any).referenceCode || null,
        smiles_venue_id: smilesVenueId || null,
        fromone_profile_id: getFromOneProfileId(body) || null,
      },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      provider: "stockport_smiles",
      message: successMessage,
      smilesType: draftType,
      smilesTable: result.table,
      smilesDraftId: result.draftId,
      smilesSlug: result.slug,
      smilesReferenceCode: (result as any).referenceCode || null,
      smilesVenueId: smilesVenueId || null,
      directSync: false,
      syncedClientId: null,
      syncedVenueId: null,
      directSyncReason: null,
      isPublished: true,
      updatedExisting,
    });
  } catch (error: any) {
    const message =
      error?.message || "Something went wrong sending this draft to Smilez.";

    console.error("Smilez publish API error:", message);

    const postId = cleanText(body?.postId || body?.campaignPostId);
    const userId = cleanText(body?.userId || body?.user_id);

    await insertPublishLog({
      userId,
      postId,
      status: "failed",
      message: "Smilez publish failed.",
      error: message,
      metadata: {
        route: "/api/smiles/publish",
        fromone_profile_id: getFromOneProfileId(body) || null,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        success: false,
        provider: "stockport_smiles",
        message,
        error: message,
      },
      { status: 500 }
    );
  }
}