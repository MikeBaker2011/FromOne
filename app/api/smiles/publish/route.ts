import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SmilesDraftType = "venue" | "offer" | "event";
type SmilesReferencePrefix = "OF" | "EV";

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
  websiteUrl?: string;
  website_url?: string;
  bookingUrl?: string;
  booking_url?: string;
  locationArea?: string;
  location_area?: string;
  locationName?: string;
  location_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  venueType?: string;
  venue_type?: string;
  savingText?: string;
  saving_text?: string;
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

function cleanNullableText(value: unknown) {
  const cleaned = cleanText(value);
  return cleaned || null;
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

async function createVenueDraft(body: SmilesPublishBody, userId = "") {
  const smiles = getSmilesSupabaseAdmin();

  const name = cleanText(body.name || body.title) || "FromOne venue draft";
  const description = buildDescription(body);
  const shortDescription = buildShortDescription(body, description);
  const now = new Date().toISOString();
  const fromOneProfileId = getFromOneProfileId(body);
  const payload = {
    business_name: name,
    venue_name: name,
    description,
    short_description: shortDescription,
    venue_type: cleanText(body.venueType || body.venue_type) || "Business",
    location_area:
      cleanText(body.locationArea || body.location_area) || "Stockport",
    address: cleanNullableText(body.address),
    phone: cleanNullableText(body.phone),
    email: cleanNullableText(body.email),
    website_url: cleanNullableText(body.websiteUrl || body.website_url),
    booking_url: cleanNullableText(body.bookingUrl || body.booking_url),
    main_image_url: cleanNullableText(body.mediaUrl || body.media_url),
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

async function createOfferDraft(body: SmilesPublishBody, smilesVenueId = "") {
  const smiles = getSmilesSupabaseAdmin();

  const title = cleanText(body.title || body.name) || "FromOne offer draft";
  const description = buildDescription(body);
  const shortDescription = buildShortDescription(body, description);
  const now = new Date().toISOString();
  const referenceCode = await makeUniqueSmilesReference({
    smiles,
    table: "offers",
    prefix: "OF",
  });

  const draft = {
    id: crypto.randomUUID(),
    reference_code: referenceCode,
    client_id: null,
    venue_id: cleanNullableText(smilesVenueId),
    category_id: null,
    title,
    slug: createSlug(title),
    description,
    short_description: shortDescription,
    start_date: cleanDate(body.startDate || body.start_date),
    end_date: cleanDate(body.endDate || body.end_date),
    valid_days: cleanNullableText(body.validDays || body.valid_days),
    valid_times: cleanNullableText(body.validTimes || body.valid_times),
    terms: cleanText(body.terms) || "Subject to availability.",
    saving_text:
      cleanText(body.savingText || body.saving_text) || "Special offer",
    main_image_url: cleanNullableText(body.mediaUrl || body.media_url),
    is_featured: false,
    is_published: false,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await smiles
    .from("offers")
    .insert(draft)
    .select("id, slug, reference_code")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    table: "offers",
    draftId: data.id,
    slug: data.slug,
    referenceCode: (data as any).reference_code || referenceCode,
    draft,
  };
}

async function createEventDraft(body: SmilesPublishBody, smilesVenueId = "") {
  const smiles = getSmilesSupabaseAdmin();

  const title = cleanText(body.title || body.name) || "FromOne event draft";
  const description = buildDescription(body);
  const shortDescription = buildShortDescription(body, description);
  const now = new Date().toISOString();
  const referenceCode = await makeUniqueSmilesReference({
    smiles,
    table: "events",
    prefix: "EV",
  });

  const draft = {
    id: crypto.randomUUID(),
    reference_code: referenceCode,
    client_id: null,
    venue_id: cleanNullableText(smilesVenueId),
    category_id: null,
    title,
    slug: createSlug(title),
    description,
    short_description: shortDescription,
    location_name: cleanNullableText(body.locationName || body.location_name),
    address: cleanNullableText(body.address),
    start_date: cleanDate(body.startDate || body.start_date),
    end_date: cleanDate(body.endDate || body.end_date),
    start_time: cleanTime(body.startTime || body.start_time),
    end_time: cleanTime(body.endTime || body.end_time),
    price_text: cleanNullableText(body.priceText || body.price_text),
    booking_url: cleanNullableText(body.bookingUrl || body.booking_url),
    main_image_url: cleanNullableText(body.mediaUrl || body.media_url),
    is_featured: false,
    is_published: false,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await smiles
    .from("events")
    .insert(draft)
    .select("id, slug, reference_code")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    table: "events",
    draftId: data.id,
    slug: data.slug,
    referenceCode: (data as any).reference_code || referenceCode,
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
    const smilesVenueId =
      draftType === "offer" || draftType === "event"
        ? await findSmilesVenueIdForBody({
            supabase: fromOneSupabase,
            body,
            userId,
          })
        : "";

    const result =
      draftType === "venue"
        ? await createVenueDraft(body, userId)
        : draftType === "event"
          ? await createEventDraft(body, smilesVenueId)
          : await createOfferDraft(body, smilesVenueId);

    await updateFromOnePostAfterSmilesDraft({
      postId,
      smilesTable: result.table,
      smilesDraftId: result.draftId,
    });

    await insertPublishLog({
      userId,
      postId,
      status: "posted",
      message: "Draft sent to Stockport Smiles.",
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
      message: "Draft sent to Stockport Smiles.",
      smilesType: draftType,
      smilesTable: result.table,
      smilesDraftId: result.draftId,
      smilesSlug: result.slug,
      smilesReferenceCode: (result as any).referenceCode || null,
      smilesVenueId: smilesVenueId || null,
      isPublished: false,
    });
  } catch (error: any) {
    const message =
      error?.message || "Something went wrong sending this draft to Smiles.";

    console.error("Smiles publish API error:", message);

    const postId = cleanText(body?.postId || body?.campaignPostId);
    const userId = cleanText(body?.userId || body?.user_id);

    await insertPublishLog({
      userId,
      postId,
      status: "failed",
      message: "Smiles draft failed.",
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
