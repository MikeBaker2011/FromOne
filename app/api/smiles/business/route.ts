import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

type SmilesBusinessAction =
  | {
      action?: "mark_booking_handled" | "decline_booking";
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
      action?: "moderate_customer_photo";
      photoId?: string;
      photo_id?: string;
      decision?: "approved" | "rejected";
      rejectionReason?: string;
      rejection_reason?: string;
    }
  | {
      action?: "dismiss_customer_photo_report" | "remove_reported_customer_photo";
      reportId?: string;
      report_id?: string;
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
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "587");
const smtpSecure =
  String(process.env.SMTP_SECURE || "").trim().toLowerCase() === "true";
const smtpUser = process.env.SMTP_USER || "";
const smtpPassword = process.env.SMTP_PASSWORD || "";
const emailFrom =
  process.env.EMAIL_FROM ||
  process.env.FROM_EMAIL ||
  (smtpUser ? `Stockport Smilez <${smtpUser}>` : "Stockport Smilez");
const emailLogoUrl =
  process.env.EMAIL_LOGO_URL ||
  "https://www.stockportsmilez.co.uk/images/logo/stockport-smiles-logo.png";

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

async function sendSmtpEmail({
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
  if (!smtpHost || !smtpUser || !smtpPassword) {
    const errorMessage =
      "SMTP_HOST, SMTP_USER or SMTP_PASSWORD is missing in FromOne.";

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

  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    const errorMessage = "SMTP_PORT is invalid in FromOne.";

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

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        minVersion: "TLSv1.2",
      },
    });

    const result = await transporter.sendMail({
      from: emailFrom,
      to,
      subject,
      html,
    });

    const providerMessageId = cleanText(result.messageId);

    await logSmilesEmail({
      smiles,
      recipient: to,
      subject,
      template,
      status: "sent",
      providerMessageId: providerMessageId || null,
      entityType,
      entityId,
    });

    return {
      sent: true,
      error: null,
    };
  } catch (error) {
    const errorMessage = getEmailErrorMessage(error) || "Unknown SMTP error";

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

    console.error("SMTP email failed:", {
      recipient: to,
      template,
      error: errorMessage,
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
  const bookingReference =
    cleanText(booking?.reference_code || booking?.booking_reference) ||
    `SM-BK-${cleanText(booking?.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;

  const safeBusinessName = escapeHtml(businessName || "the venue");
  const safeCustomerName = escapeHtml(customerName);
  const safeBookingDate = escapeHtml(bookingDate);
  const safeBookingTime = escapeHtml(bookingTime);
  const safeBookingReference = escapeHtml(bookingReference);

  const subject = `Your booking with ${businessName} is confirmed`;

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#071b49;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f7fb;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(7,27,73,0.10);">
                <tr>
                  <td style="padding:24px 28px;background:#ffffff;border-bottom:1px solid #edf1f7;text-align:center;">
                    <img
                      src="${escapeHtml(emailLogoUrl)}"
                      width="170"
                      alt="Stockport Smilez"
                      style="display:block;width:170px;max-width:100%;height:auto;margin:0 auto;border:0;"
                    />
                  </td>
                </tr>

                <tr>
                  <td style="padding:34px 30px 18px;text-align:center;">
                    <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#fff1f7;color:#f72585;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">
                      Booking confirmed
                    </div>

                    <h1 style="margin:18px 0 10px;color:#071b49;font-size:32px;line-height:1.15;letter-spacing:-0.04em;">
                      You’re booked in
                    </h1>

                    <p style="margin:0;color:#5f6f89;font-size:17px;line-height:1.65;">
                      Hi ${safeCustomerName}, good news — <strong style="color:#071b49;">${safeBusinessName}</strong> has confirmed your booking.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 30px 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8faff;border:1px solid #dfe6f1;border-radius:18px;">
                      <tr>
                        <td style="padding:22px 22px 10px;">
                          <p style="margin:0 0 4px;color:#f72585;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">
                            Booking details
                          </p>
                          <h2 style="margin:0;color:#071b49;font-size:22px;line-height:1.3;">
                            ${safeBusinessName}
                          </h2>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 22px 22px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="padding:12px 0;border-bottom:1px solid #e5eaf2;color:#64748b;font-size:14px;">Date</td>
                              <td align="right" style="padding:12px 0;border-bottom:1px solid #e5eaf2;color:#071b49;font-size:15px;font-weight:800;">${safeBookingDate}</td>
                            </tr>
                            <tr>
                              <td style="padding:12px 0;border-bottom:1px solid #e5eaf2;color:#64748b;font-size:14px;">Time</td>
                              <td align="right" style="padding:12px 0;border-bottom:1px solid #e5eaf2;color:#071b49;font-size:15px;font-weight:800;">${safeBookingTime}</td>
                            </tr>
                            ${
                              partySize > 0
                                ? `<tr>
                                    <td style="padding:12px 0;border-bottom:1px solid #e5eaf2;color:#64748b;font-size:14px;">Party size</td>
                                    <td align="right" style="padding:12px 0;border-bottom:1px solid #e5eaf2;color:#071b49;font-size:15px;font-weight:800;">${partySize}</td>
                                  </tr>`
                                : ""
                            }
                            <tr>
                              <td style="padding:12px 0 0;color:#64748b;font-size:14px;">Reference</td>
                              <td align="right" style="padding:12px 0 0;color:#071b49;font-size:15px;font-weight:800;">${safeBookingReference}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px 30px;">
                    <div style="padding:18px 20px;border-radius:16px;background:#fff7fb;border:1px solid #ffd6e8;">
                      <p style="margin:0;color:#34425c;font-size:14px;line-height:1.65;">
                        The venue manages this booking directly. Contact them if you need to change or cancel your booking.
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 30px;background:#071b49;text-align:center;">
                    <p style="margin:0 0 7px;color:#ffffff;font-size:15px;font-weight:800;">
                      Stockport Smilez
                    </p>
                    <p style="margin:0;color:#cbd5e1;font-size:12px;line-height:1.6;">
                      Food, drink, events and good times across Stockport.
                    </p>
                    <p style="margin:12px 0 0;color:#94a3b8;font-size:11px;line-height:1.5;">
                      This is an automated booking confirmation sent by Stockport Smilez.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const result = await sendSmtpEmail({
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

async function declineBookingStatusWithFallback({
  smiles,
  bookingId,
  venueId,
}: {
  smiles: ReturnType<typeof getSmilesSupabaseAdmin>;
  bookingId: string;
  venueId: string;
}) {
  const statusesToTry = ["declined", "rejected", "cancelled"];
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
      .select("id, status, booking_date, booking_time")
      .single();

    if (!error && data?.id) {
      return data;
    }

    lastError = error?.message || "Booking was not declined.";
  }

  throw new Error(lastError || "Booking was not declined. Please try again.");
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
          customerPhotos: [],
          photos: [],
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
      photosResult,
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
      smiles
        .from("customer_photos")
        .select(
          "id, user_id, title, caption, image_path, image_alt, linked_item_type, linked_item_title, linked_item_href, linked_venue_id, status, rejection_reason, created_at",
        )
        .eq("linked_venue_id", ownedVenue.smilesVenueId)
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

    if (photosResult.error) {
      throw new Error(photosResult.error.message);
    }

    const customerPhotos = await Promise.all(
      (photosResult.data || []).map(async (photo: any) => {
        const imagePath = cleanText(photo.image_path);

        if (!imagePath) {
          return { ...photo, image_url: null };
        }

        const { data, error } = await smiles.storage
          .from("customer-photos")
          .createSignedUrl(imagePath, 60 * 15);

        if (error) {
          console.error("Could not create customer photo URL:", error.message);
        }

        return {
          ...photo,
          image_url: data?.signedUrl || null,
        };
      }),
    );

    const photoIds = customerPhotos.map((photo: any) => photo.id).filter(Boolean);
    let customerPhotoReports: any[] = [];

    if (photoIds.length > 0) {
      const { data: reportsData, error: reportsError } = await smiles
        .from("customer_photo_reports")
        .select("id, photo_id, reason, details, status, created_at, reviewed_at")
        .in("photo_id", photoIds)
        .order("created_at", { ascending: false });

      if (reportsError) {
        throw new Error(reportsError.message);
      }

      customerPhotoReports = reportsData || [];
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
      customerPhotos,
      photos: customerPhotos,
      customerPhotoReports,
      photoReports: customerPhotoReports,
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
          ? "Booking confirmed and customer emailed."
          : "Booking confirmed. Customer confirmation email was not sent.",
        booking: data,
        customerEmailSent: emailResult.sent,
      });
    }

    if (action === "decline_booking") {
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

      const data = await declineBookingStatusWithFallback({
        smiles,
        bookingId,
        venueId: ownedVenue.smilesVenueId,
      });

      const bookingDate = cleanDate((data as any).booking_date);
      const bookingStartTime = cleanTime((data as any).booking_time);

      if (bookingDate && bookingStartTime) {
        const { error: legacyBlockError } = await smiles
          .from("client_booking_blocks")
          .delete()
          .eq("venue_id", ownedVenue.smilesVenueId)
          .eq("block_date", bookingDate)
          .eq("start_time", bookingStartTime)
          .eq("reason", "Confirmed booking");

        if (legacyBlockError) {
          console.error(
            "Booking was declined but its legacy auto-block could not be removed:",
            legacyBlockError.message,
          );
        }
      }

      return NextResponse.json({
        ok: true,
        success: true,
        message: "Booking declined and slot capacity released.",
        booking: data,
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

    if (action === "moderate_customer_photo") {
      const photoId = cleanText(
        (body as any).photoId || (body as any).photo_id,
      );
      const decision = cleanText((body as any).decision).toLowerCase();
      const rejectionReason = cleanText(
        (body as any).rejectionReason || (body as any).rejection_reason,
      );

      if (!photoId) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Missing photo id.",
          },
          { status: 400 },
        );
      }

      if (decision !== "approved" && decision !== "rejected") {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Choose approve or reject.",
          },
          { status: 400 },
        );
      }

      if (decision === "rejected" && !rejectionReason) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Add a short reason before rejecting the photo.",
          },
          { status: 400 },
        );
      }

      const { data, error } = await smiles
        .from("customer_photos")
        .update({
          status: decision,
          rejection_reason: decision === "rejected" ? rejectionReason : null,
        })
        .eq("id", photoId)
        .eq("linked_venue_id", ownedVenue.smilesVenueId)
        .select("id, status, rejection_reason")
        .single();

      if (error || !data?.id) {
        throw new Error(
          error?.message || "Photo moderation could not be saved.",
        );
      }

      return NextResponse.json({
        ok: true,
        success: true,
        message:
          decision === "approved"
            ? "Photo approved."
            : "Photo rejected.",
        photo: data,
      });
    }

    if (
      action === "dismiss_customer_photo_report" ||
      action === "remove_reported_customer_photo"
    ) {
      const reportId = cleanText(
        (body as any).reportId || (body as any).report_id,
      );

      if (!reportId) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Missing report id.",
          },
          { status: 400 },
        );
      }

      const { data: report, error: reportError } = await smiles
        .from("customer_photo_reports")
        .select("id, photo_id, status")
        .eq("id", reportId)
        .single();

      if (reportError || !report?.id || !report?.photo_id) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "That photo report could not be found.",
          },
          { status: 404 },
        );
      }

      const { data: reportedPhoto, error: photoLookupError } = await smiles
        .from("customer_photos")
        .select("id, linked_venue_id")
        .eq("id", report.photo_id)
        .eq("linked_venue_id", ownedVenue.smilesVenueId)
        .single();

      if (photoLookupError || !reportedPhoto?.id) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "This report is not linked to your venue.",
          },
          { status: 403 },
        );
      }

      if (action === "dismiss_customer_photo_report") {
        const { data, error } = await smiles
          .from("customer_photo_reports")
          .update({
            status: "dismissed",
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", reportId)
          .select("id, status, reviewed_at")
          .single();

        if (error || !data?.id) {
          throw new Error(error?.message || "The report could not be dismissed.");
        }

        return NextResponse.json({
          ok: true,
          success: true,
          message: "Report dismissed. The photo remains public.",
          report: data,
        });
      }

      const { data: updatedPhoto, error: updatePhotoError } = await smiles
        .from("customer_photos")
        .update({
          status: "rejected",
          rejection_reason: "Removed from public display after a customer report.",
        })
        .eq("id", reportedPhoto.id)
        .eq("linked_venue_id", ownedVenue.smilesVenueId)
        .select("id, status, rejection_reason")
        .single();

      if (updatePhotoError || !updatedPhoto?.id) {
        throw new Error(
          updatePhotoError?.message || "The reported photo could not be removed.",
        );
      }

      const { data: updatedReport, error: updateReportError } = await smiles
        .from("customer_photo_reports")
        .update({
          status: "photo_removed",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId)
        .select("id, status, reviewed_at")
        .single();

      if (updateReportError || !updatedReport?.id) {
        throw new Error(
          updateReportError?.message || "The report status could not be updated.",
        );
      }

      return NextResponse.json({
        ok: true,
        success: true,
        message: "Photo removed from public display.",
        photo: updatedPhoto,
        report: updatedReport,
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