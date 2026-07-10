import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SmilesBusinessAction =
  | {
      action?: "mark_booking_handled";
      bookingId?: string;
      booking_id?: string;
    }
  | {
      action?: "save_review_reply";
      reviewId?: string;
      review_id?: string;
      clientReply?: string;
      client_reply?: string;
    }
  | {
      action?: "create_booking_block";
      blockDate?: string;
      block_date?: string;
      isFullDay?: boolean;
      is_full_day?: boolean;
      startTime?: string;
      start_time?: string;
      endTime?: string;
      end_time?: string;
      reason?: string;
    }
  | {
      action?: "delete_booking_block";
      blockId?: string;
      block_id?: string;
    }
  | {
      action?: "save_booking_hours";
      hours?: Array<{
        day_of_week?: number;
        is_closed?: boolean;
        opens_at?: string | null;
        closes_at?: string | null;
      }>;
    };

const fromOneSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const fromOneAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const fromOneServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const smilesSupabaseUrl = process.env.STOCKPORT_SMILES_SUPABASE_URL || "";
const smilesServiceRoleKey =
  process.env.STOCKPORT_SMILES_SUPABASE_SERVICE_ROLE_KEY || "";
const resendApiKey = process.env.RESEND_API_KEY || "";
const emailFrom =
  process.env.EMAIL_FROM ||
  process.env.FROM_EMAIL ||
  "Stockport Smilez <onboarding@resend.dev>";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanDate(value: unknown) {
  const cleaned = cleanText(value);

  if (!cleaned) return "";

  const date = new Date(`${cleaned}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function cleanTime(value: unknown) {
  const cleaned = cleanText(value);

  if (!cleaned) return null;

  const match = cleaned.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);

  if (!match) return null;

  return `${match[1].padStart(2, "0")}:${match[2]}:${match[3] || "00"}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDisplayDate(value: unknown) {
  const cleaned = cleanDate(value);

  if (!cleaned) return "Date to be confirmed";

  const date = new Date(`${cleaned}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "Date to be confirmed";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(date);
}

function formatDisplayTime(value: unknown) {
  const cleaned = cleanTime(value);

  if (!cleaned) return "Time to be confirmed";

  return cleaned.slice(0, 5);
}

function getEmailErrorMessage(error: unknown) {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown email error";
  }
}

async function logSmilesEmail({
  smiles,
  recipient,
  subject,
  template,
  status,
  providerMessageId,
  errorMessage,
  entityType,
  entityId,
}: {
  smiles: ReturnType<typeof getSmilesSupabaseAdmin>;
  recipient: string;
  subject: string;
  template: string;
  status: "sent" | "failed";
  providerMessageId?: string | null;
  errorMessage?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}) {
  const { error } = await smiles.from("email_logs").insert({
    recipient,
    subject,
    template,
    status,
    provider_message_id: providerMessageId ?? null,
    error_message: errorMessage ?? null,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });

  if (error) {
    console.error("Could not log Smiles email:", error.message);
  }
}

async function sendResendEmail({
  smiles,
  to,
  subject,
  html,
  template,
  entityType,
  entityId,
}: {
  smiles: ReturnType<typeof getSmilesSupabaseAdmin>;
  to: string;
  subject: string;
  html: string;
  template: string;
  entityType?: string | null;
  entityId?: string | null;
}) {
  if (!resendApiKey) {
    await logSmilesEmail({
      smiles,
      recipient: to,
      subject,
      template,
      status: "failed",
      errorMessage: "RESEND_API_KEY is missing in FromOne.",
      entityType,
      entityId,
    });

    return {
      sent: false,
      error: "RESEND_API_KEY is missing in FromOne.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to,
        subject,
        html,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.id) {
      const errorMessage =
        cleanText(result?.message) ||
        cleanText(result?.error) ||
        `Resend returned ${response.status}`;

      await logSmilesEmail({
        smiles,
        recipient: to,
        subject,
        template,
        status: "failed",
        errorMessage,
        entityType,
        entityId,
      });

      return {
        sent: false,
        error: errorMessage,
      };
    }

    await logSmilesEmail({
      smiles,
      recipient: to,
      subject,
      template,
      status: "sent",
      providerMessageId: cleanText(result.id),
      entityType,
      entityId,
    });

    return {
      sent: true,
      error: null,
    };
  } catch (error) {
    const errorMessage = getEmailErrorMessage(error) || "Unknown email error";

    await logSmilesEmail({
      smiles,
      recipient: to,
      subject,
      template,
      status: "failed",
      errorMessage,
      entityType,
      entityId,
    });

    return {
      sent: false,
      error: errorMessage,
    };
  }
}

async function sendBookingConfirmedEmail({
  smiles,
  booking,
  businessName,
}: {
  smiles: ReturnType<typeof getSmilesSupabaseAdmin>;
  booking: any;
  businessName: string;
}) {
  const customerEmail = cleanText(booking?.customer_email).toLowerCase();

  if (!customerEmail) {
    return { sent: false, reason: "missing_customer_email" };
  }

  const customerName = cleanText(booking?.customer_name) || "there";
  const bookingDate = formatDisplayDate(booking?.booking_date);
  const bookingTime = formatDisplayTime(booking?.booking_time);
  const partySize = Number(booking?.party_size || 0);
  const safeBusinessName = escapeHtml(businessName || "the venue");
  const safeCustomerName = escapeHtml(customerName);

  const subject = `Your booking with ${businessName} is confirmed`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #172554; line-height: 1.6;">
      <h1 style="margin: 0 0 12px;">Booking confirmed</h1>
      <p>Hi ${safeCustomerName},</p>
      <p>Good news — <strong>${safeBusinessName}</strong> has confirmed your booking request.</p>

      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 16px; padding: 18px; margin: 20px 0;">
        <p><strong>Venue:</strong> ${safeBusinessName}</p>
        <p><strong>Date:</strong> ${bookingDate}</p>
        <p><strong>Time:</strong> ${bookingTime}</p>
        ${partySize > 0 ? `<p><strong>Party size:</strong> ${partySize}</p>` : ""}
      </div>

      <p>The venue manages this booking directly. Contact them if you need to change or cancel it.</p>

      <p style="color: #64748b; font-size: 14px;">
        Stockport Smilez helps local people discover venues, offers and events across Stockport.
      </p>
    </div>
  `;

  const result = await sendResendEmail({
    smiles,
    to: customerEmail,
    subject,
    html,
    template: "booking-confirmed-customer",
    entityType: "booking",
    entityId: cleanText(booking?.id) || null,
  });

  if (result.sent && cleanText(booking?.id)) {
    const { error } = await smiles
      .from("bookings")
      .update({
        last_notification_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (error) {
      console.error(
        "Booking confirmation email sent, but notification timestamp update failed:",
        error.message,
      );
    }
  }

  return result;
}

async function attachFromOnePostIds({
  offers,
  events,
  userId,
}: {
  offers: any[];
  events: any[];
  userId?: string;
}) {
  const draftIds = [
    ...offers.map((offer) => cleanText(offer.id)),
    ...events.map((event) => cleanText(event.id)),
  ].filter(Boolean);
  const referenceCodes = [
    ...offers.map((offer) => cleanText(offer.reference_code)),
    ...events.map((event) => cleanText(event.reference_code)),
  ].filter(Boolean);

  if (draftIds.length === 0 && referenceCodes.length === 0) {
    return { offers, events };
  }

  const fromOne = getFromOneSupabaseAdmin();
  let query = fromOne
    .from("campaign_posts")
    .select(
      "id, user_id, title, caption, smiles_draft_id, smiles_table, smiles_draft, created_at, updated_at",
    )
    .or("smiles_draft.not.is.null,smiles_draft_id.not.is.null")
    .order("updated_at", { ascending: false });

  const cleanUserId = cleanText(userId);
  if (cleanUserId) {
    query = query.eq("user_id", cleanUserId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Could not load FromOne post references:", error.message);
    return { offers, events };
  }

  const offerPostIdByDraftId = new Map<string, string>();
  const eventPostIdByDraftId = new Map<string, string>();
  const offerPostIdByReferenceCode = new Map<string, string>();
  const eventPostIdByReferenceCode = new Map<string, string>();
  const offerPostIdByTitle = new Map<string, string>();
  const eventPostIdByTitle = new Map<string, string>();
  const normaliseMatchText = (value: unknown) =>
    cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  (data || []).forEach((post: any) => {
    const postId = cleanText(post.id);
    if (!postId) return;

    const draft = post.smiles_draft || {};
    const draftType = cleanText(draft.type || post.smiles_table)
      .toLowerCase()
      .replace(/s$/, "");
    const isOfferPost = draftType === "offer";
    const isEventPost = draftType === "event";

    if (!isOfferPost && !isEventPost) return;

    const idMap = isOfferPost ? offerPostIdByDraftId : eventPostIdByDraftId;
    const referenceMap = isOfferPost
      ? offerPostIdByReferenceCode
      : eventPostIdByReferenceCode;
    const titleMap = isOfferPost ? offerPostIdByTitle : eventPostIdByTitle;

    const draftId = cleanText(post.smiles_draft_id);
    if (draftId && !idMap.has(draftId)) {
      idMap.set(draftId, postId);
    }

    const possibleDraftIds = [
      cleanText(draft.id),
      cleanText(draft.draftId),
      cleanText(draft.smilesDraftId),
      cleanText(draft.smiles_draft_id),
    ].filter(Boolean);

    possibleDraftIds.forEach((id) => {
      if (!idMap.has(id)) {
        idMap.set(id, postId);
      }
    });

    const possibleReferenceCodes = [
      cleanText(draft.referenceCode),
      cleanText(draft.reference_code),
      cleanText(draft.smilesReferenceCode),
      cleanText(draft.smiles_reference_code),
    ].filter(Boolean);

    possibleReferenceCodes.forEach((referenceCode) => {
      if (!referenceMap.has(referenceCode)) {
        referenceMap.set(referenceCode, postId);
      }
    });

    const possibleTitles = [
      draft.title,
      draft.savingText,
      draft.saving_text,
      post.title,
    ]
      .map(normaliseMatchText)
      .filter(Boolean);

    possibleTitles.forEach((title) => {
      if (!titleMap.has(title)) {
        titleMap.set(title, postId);
      }
    });
  });

  return {
    offers: offers.map((offer) => ({
      ...offer,
      fromone_post_id:
        cleanText(offer.fromone_post_id) ||
        offerPostIdByDraftId.get(cleanText(offer.id)) ||
        offerPostIdByReferenceCode.get(cleanText(offer.reference_code)) ||
        offerPostIdByTitle.get(normaliseMatchText(offer.title)) ||
        offerPostIdByTitle.get(normaliseMatchText(offer.saving_text)) ||
        null,
    })),
    events: events.map((event) => ({
      ...event,
      fromone_post_id:
        cleanText(event.fromone_post_id) ||
        eventPostIdByDraftId.get(cleanText(event.id)) ||
        eventPostIdByReferenceCode.get(cleanText(event.reference_code)) ||
        eventPostIdByTitle.get(normaliseMatchText(event.title)) ||
        null,
    })),
  };
}

function addMinutesToTime(value: unknown, minutesToAdd: number) {
  const cleaned = cleanTime(value);

  if (!cleaned) return null;

  const [hours, minutes] = cleaned.split(":").map((part) => Number(part));
  const date = new Date("2000-01-01T00:00:00");
  date.setHours(hours, minutes + minutesToAdd, 0, 0);

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}:00`;
}

function getFromOneSupabaseForUser(req: NextRequest) {
  if (!fromOneSupabaseUrl || !fromOneAnonKey) {
    throw new Error("Missing FromOne public Supabase environment variables.");
  }

  const authorization = req.headers.get("authorization") || "";

  return createClient(fromOneSupabaseUrl, fromOneAnonKey, {
    global: {
      headers: authorization ? { Authorization: authorization } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

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

async function updateBookingStatusWithFallback({
  smiles,
  bookingId,
  venueId,
}: {
  smiles: ReturnType<typeof getSmilesSupabaseAdmin>;
  bookingId: string;
  venueId: string;
}) {
  const statusesToTry = ["confirmed", "handled", "completed"];
  let lastError = "";

  for (const status of statusesToTry) {
    const { data, error } = await smiles
      .from("bookings")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("venue_id", venueId)
      .select(
        "id, status, booking_date, booking_time, party_size, customer_name, customer_email",
      )
      .single();

    if (!error && data?.id) {
      return data;
    }

    lastError = error?.message || "Booking was not updated.";
  }

  throw new Error(lastError || "Booking was not updated. Please try again.");
}

async function getOwnedSmilesVenueId(req: NextRequest) {
  const userSupabase = getFromOneSupabaseForUser(req);
  const {
    data: { user },
    error: userError,
  } = await userSupabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      status: 401,
      message: "Please sign in again.",
      profile: null,
    };
  }

  const fromOne = getFromOneSupabaseAdmin();

  const { data: profile, error: profileError } = await fromOne
    .from("business_profiles")
    .select(
      "id, user_id, business_name, smiles_listing_status, smiles_listing_venue_id",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    return {
      ok: false as const,
      status: 404,
      message: "No FromOne business profile was found.",
      profile: null,
    };
  }

  const smilesVenueId = cleanText((profile as any).smiles_listing_venue_id);

  if (!smilesVenueId) {
    return {
      ok: false as const,
      status: 200,
      message:
        "Your Stockport Smiles listing is not live yet. Once Smiles admin publishes it, bookings and reviews will appear here.",
      profile,
    };
  }

  return {
    ok: true as const,
    status: 200,
    message: "Smiles listing found.",
    profile,
    smilesVenueId,
  };
}

export async function GET(req: NextRequest) {
  try {
    const ownedVenue = await getOwnedSmilesVenueId(req);

    if (!ownedVenue.ok) {
      return NextResponse.json(
        {
          ok: ownedVenue.status === 200,
          success: ownedVenue.status === 200,
          message: ownedVenue.message,
          profile: ownedVenue.profile,
          bookings: [],
          reviews: [],
          sentOffers: [],
          sentEvents: [],
          offers: [],
          events: [],
        },
        { status: ownedVenue.status },
      );
    }

    const smiles = getSmilesSupabaseAdmin();

    const [
      bookingsResult,
      reviewsResult,
      blocksResult,
      hoursResult,
      offersResult,
      eventsResult,
    ] = await Promise.all([
      smiles
        .from("bookings")
        .select(
          "id, venue_id, customer_name, customer_email, customer_phone, booking_date, booking_time, party_size, notes, status, created_at, updated_at",
        )
        .eq("venue_id", ownedVenue.smilesVenueId)
        .order("created_at", { ascending: false }),
      smiles
        .from("client_reviews")
        .select(
          "id, venue_id, customer_name, customer_email, rating, review_text, status, client_reply, created_at, updated_at",
        )
        .eq("venue_id", ownedVenue.smilesVenueId)
        .order("created_at", { ascending: false }),
      smiles
        .from("client_booking_blocks")
        .select(
          "id, venue_id, block_date, is_full_day, start_time, end_time, reason, created_at, updated_at",
        )
        .eq("venue_id", ownedVenue.smilesVenueId)
        .order("block_date", { ascending: true })
        .order("start_time", { ascending: true }),
      smiles
        .from("client_booking_hours")
        .select(
          "id, venue_id, day_of_week, is_closed, opens_at, closes_at, created_at, updated_at",
        )
        .eq("venue_id", ownedVenue.smilesVenueId)
        .order("day_of_week", { ascending: true }),
      smiles
        .from("offers")
        .select(
          "id, venue_id, title, slug, short_description, description, saving_text, start_date, end_date, is_published, reference_code, fromone_post_id, created_at, updated_at",
        )
        .eq("venue_id", ownedVenue.smilesVenueId)
        .order("created_at", { ascending: false }),
      smiles
        .from("events")
        .select(
          "id, venue_id, title, slug, short_description, description, location_name, start_date, end_date, start_time, end_time, price_text, is_published, reference_code, fromone_post_id, created_at, updated_at",
        )
        .eq("venue_id", ownedVenue.smilesVenueId)
        .order("created_at", { ascending: false }),
    ]);

    if (bookingsResult.error) {
      throw new Error(bookingsResult.error.message);
    }

    if (reviewsResult.error) {
      throw new Error(reviewsResult.error.message);
    }

    if (blocksResult.error) {
      throw new Error(blocksResult.error.message);
    }

    if (hoursResult.error) {
      throw new Error(hoursResult.error.message);
    }

    if (offersResult.error) {
      throw new Error(offersResult.error.message);
    }

    if (eventsResult.error) {
      throw new Error(eventsResult.error.message);
    }

    const sentItemsWithPostIds = await attachFromOnePostIds({
      offers: offersResult.data || [],
      events: eventsResult.data || [],
      userId: cleanText((ownedVenue.profile as any)?.user_id),
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Smiles bookings, reviews, offers and events loaded.",
      profile: ownedVenue.profile,
      smilesVenueId: ownedVenue.smilesVenueId,
      bookings: bookingsResult.data || [],
      reviews: reviewsResult.data || [],
      bookingBlocks: blocksResult.data || [],
      bookingHours: hoursResult.data || [],
      sentOffers: sentItemsWithPostIds.offers,
      sentEvents: sentItemsWithPostIds.events,
      offers: sentItemsWithPostIds.offers,
      events: sentItemsWithPostIds.events,
    });
  } catch (error: any) {
    const message =
      error?.message ||
      "Could not load Stockport Smiles bookings, reviews, offers and events.";

    console.error("Smiles business inbox API error:", message);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        message,
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ownedVenue = await getOwnedSmilesVenueId(req);

    if (!ownedVenue.ok) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: ownedVenue.message,
        },
        { status: ownedVenue.status === 200 ? 400 : ownedVenue.status },
      );
    }

    const body = (await req.json().catch(() => ({}))) as SmilesBusinessAction;
    const action = cleanText((body as any).action);
    const smiles = getSmilesSupabaseAdmin();

    if (action === "mark_booking_handled") {
      const bookingId = cleanText(
        (body as any).bookingId || (body as any).booking_id,
      );

      if (!bookingId) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Missing booking id.",
          },
          { status: 400 },
        );
      }

      const data = await updateBookingStatusWithFallback({
        smiles,
        bookingId,
        venueId: ownedVenue.smilesVenueId,
      });

      const bookingDate = cleanDate((data as any).booking_date);
      const bookingStartTime = cleanTime((data as any).booking_time);
      const bookingEndTime = addMinutesToTime(bookingStartTime, 120);

      if (bookingDate && bookingStartTime && bookingEndTime) {
        const { error: blockError } = await smiles
          .from("client_booking_blocks")
          .insert({
            client_id: null,
            venue_id: ownedVenue.smilesVenueId,
            block_date: bookingDate,
            is_full_day: false,
            start_time: bookingStartTime,
            end_time: bookingEndTime,
            reason: "Confirmed booking",
          });

        if (blockError) {
          console.error(
            "Confirmed booking was saved but auto-block failed:",
            blockError.message,
          );
        }
      }

      const emailResult = await sendBookingConfirmedEmail({
        smiles,
        booking: data,
        businessName:
          cleanText((ownedVenue.profile as any)?.business_name) ||
          "Stockport Smilez venue",
      });

      return NextResponse.json({
        ok: true,
        success: true,
        message: emailResult.sent
          ? "Booking confirmed, customer emailed and time blocked."
          : "Booking confirmed and time blocked. Customer confirmation email was not sent.",
        booking: data,
        customerEmailSent: emailResult.sent,
      });
    }

    if (action === "save_review_reply") {
      const reviewId = cleanText(
        (body as any).reviewId || (body as any).review_id,
      );
      const clientReply = cleanText(
        (body as any).clientReply || (body as any).client_reply,
      );

      if (!reviewId) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Missing review id.",
          },
          { status: 400 },
        );
      }

      const { data, error } = await smiles
        .from("client_reviews")
        .update({
          client_reply: clientReply || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reviewId)
        .eq("venue_id", ownedVenue.smilesVenueId)
        .select("id, client_reply")
        .single();

      if (error || !data?.id) {
        throw new Error(
          error?.message || "Review reply was not saved. Please try again.",
        );
      }

      return NextResponse.json({
        ok: true,
        success: true,
        message: "Review reply saved.",
        review: data,
      });
    }

    if (action === "create_booking_block") {
      const blockDate = cleanDate(
        (body as any).blockDate || (body as any).block_date,
      );
      const isFullDay = Boolean(
        (body as any).isFullDay || (body as any).is_full_day,
      );
      const startTime = isFullDay
        ? null
        : cleanTime((body as any).startTime || (body as any).start_time);
      const endTime = isFullDay
        ? null
        : cleanTime((body as any).endTime || (body as any).end_time);
      const reason = cleanText((body as any).reason);

      if (!blockDate) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Choose a date to block.",
          },
          { status: 400 },
        );
      }

      if (!isFullDay && (!startTime || !endTime)) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Choose a start and end time, or block the full day.",
          },
          { status: 400 },
        );
      }

      const { data, error } = await smiles
        .from("client_booking_blocks")
        .insert({
          client_id: null,
          venue_id: ownedVenue.smilesVenueId,
          block_date: blockDate,
          is_full_day: isFullDay,
          start_time: startTime,
          end_time: endTime,
          reason: reason || null,
        })
        .select("id")
        .single();

      if (error || !data?.id) {
        throw new Error(
          error?.message || "Booking block was not saved. Please try again.",
        );
      }

      return NextResponse.json({
        ok: true,
        success: true,
        message: "Booking time blocked.",
        bookingBlock: data,
      });
    }

    if (action === "delete_booking_block") {
      const blockId = cleanText(
        (body as any).blockId || (body as any).block_id,
      );

      if (!blockId) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Missing booking block id.",
          },
          { status: 400 },
        );
      }

      const { error } = await smiles
        .from("client_booking_blocks")
        .delete()
        .eq("id", blockId)
        .eq("venue_id", ownedVenue.smilesVenueId);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        ok: true,
        success: true,
        message: "Booking block removed.",
      });
    }

    if (action === "save_booking_hours") {
      const suppliedHours = Array.isArray((body as any).hours)
        ? ((body as any).hours as any[])
        : [];

      if (suppliedHours.length !== 7) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Please provide booking hours for all seven days.",
          },
          { status: 400 },
        );
      }

      const now = new Date().toISOString();
      const rows = suppliedHours.map((hour, index) => {
        const dayOfWeek = Number(hour?.day_of_week ?? index);
        const isClosed = Boolean(hour?.is_closed);
        const opensAt = isClosed ? null : cleanTime(hour?.opens_at);
        const closesAt = isClosed ? null : cleanTime(hour?.closes_at);

        if (dayOfWeek < 0 || dayOfWeek > 6) {
          throw new Error("Booking day is invalid.");
        }

        if (!isClosed && (!opensAt || !closesAt)) {
          throw new Error("Open days need an opening and closing time.");
        }

        return {
          client_id: null,
          venue_id: ownedVenue.smilesVenueId,
          day_of_week: dayOfWeek,
          is_closed: isClosed,
          opens_at: opensAt,
          closes_at: closesAt,
          created_at: now,
          updated_at: now,
        };
      });

      const { error: deleteError } = await smiles
        .from("client_booking_hours")
        .delete()
        .eq("venue_id", ownedVenue.smilesVenueId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      const { error: insertError } = await smiles
        .from("client_booking_hours")
        .insert(rows);

      if (insertError) {
        throw new Error(insertError.message);
      }

      return NextResponse.json({
        ok: true,
        success: true,
        message: "Booking hours saved.",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        success: false,
        message: "Unknown Smiles action.",
      },
      { status: 400 },
    );
  } catch (error: any) {
    const message =
      error?.message || "Could not update this Stockport Smiles item.";

    console.error("Smiles business inbox update API error:", message);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        message,
        error: message,
      },
      { status: 500 },
    );
  }
}
