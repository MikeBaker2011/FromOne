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

function addMinutesToTime(value: unknown, minutesToAdd: number) {
  const cleaned = cleanTime(value);

  if (!cleaned) return null;

  const [hours, minutes] = cleaned.split(":").map((part) => Number(part));
  const date = new Date("2000-01-01T00:00:00");
  date.setHours(hours, minutes + minutesToAdd, 0, 0);

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
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
        .select("id, status, booking_date, booking_time")
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
      "id, user_id, business_name, smiles_listing_status, smiles_listing_venue_id"
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
        { status: ownedVenue.status }
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
    ] =
      await Promise.all([
        smiles
          .from("bookings")
          .select(
            "id, venue_id, customer_name, customer_email, customer_phone, booking_date, booking_time, party_size, notes, status, created_at, updated_at"
          )
          .eq("venue_id", ownedVenue.smilesVenueId)
          .order("created_at", { ascending: false }),
        smiles
          .from("client_reviews")
          .select(
            "id, venue_id, customer_name, customer_email, rating, review_text, status, client_reply, created_at, updated_at"
          )
          .eq("venue_id", ownedVenue.smilesVenueId)
          .order("created_at", { ascending: false }),
        smiles
          .from("client_booking_blocks")
          .select(
            "id, venue_id, block_date, is_full_day, start_time, end_time, reason, created_at, updated_at"
          )
          .eq("venue_id", ownedVenue.smilesVenueId)
          .order("block_date", { ascending: true })
          .order("start_time", { ascending: true }),
        smiles
          .from("client_booking_hours")
          .select(
            "id, venue_id, day_of_week, is_closed, opens_at, closes_at, created_at, updated_at"
          )
          .eq("venue_id", ownedVenue.smilesVenueId)
          .order("day_of_week", { ascending: true }),
        smiles
          .from("offers")
          .select(
            "id, venue_id, title, slug, short_description, description, saving_text, start_date, end_date, is_published, reference_code, created_at, updated_at"
          )
          .eq("venue_id", ownedVenue.smilesVenueId)
          .order("created_at", { ascending: false }),
        smiles
          .from("events")
          .select(
            "id, venue_id, title, slug, short_description, description, location_name, start_date, end_date, start_time, end_time, price_text, is_published, reference_code, created_at, updated_at"
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
      sentOffers: offersResult.data || [],
      sentEvents: eventsResult.data || [],
      offers: offersResult.data || [],
      events: eventsResult.data || [],
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
      { status: 500 }
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
        { status: ownedVenue.status === 200 ? 400 : ownedVenue.status }
      );
    }

    const body = (await req.json().catch(() => ({}))) as SmilesBusinessAction;
    const action = cleanText((body as any).action);
    const smiles = getSmilesSupabaseAdmin();

    if (action === "mark_booking_handled") {
      const bookingId = cleanText(
        (body as any).bookingId || (body as any).booking_id
      );

      if (!bookingId) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Missing booking id.",
          },
          { status: 400 }
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
            blockError.message
          );
        }
      }

      return NextResponse.json({
        ok: true,
        success: true,
        message: "Booking confirmed and time blocked.",
        booking: data,
      });
    }

    if (action === "save_review_reply") {
      const reviewId = cleanText(
        (body as any).reviewId || (body as any).review_id
      );
      const clientReply = cleanText(
        (body as any).clientReply || (body as any).client_reply
      );

      if (!reviewId) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Missing review id.",
          },
          { status: 400 }
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
          error?.message || "Review reply was not saved. Please try again."
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
        (body as any).blockDate || (body as any).block_date
      );
      const isFullDay = Boolean(
        (body as any).isFullDay || (body as any).is_full_day
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
          { status: 400 }
        );
      }

      if (!isFullDay && (!startTime || !endTime)) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Choose a start and end time, or block the full day.",
          },
          { status: 400 }
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
          error?.message || "Booking block was not saved. Please try again."
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
      const blockId = cleanText((body as any).blockId || (body as any).block_id);

      if (!blockId) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            message: "Missing booking block id.",
          },
          { status: 400 }
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
          { status: 400 }
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
      { status: 400 }
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
      { status: 500 }
    );
  }
}
