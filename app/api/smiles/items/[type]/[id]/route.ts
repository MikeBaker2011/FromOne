import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SmilesItemType = "offer" | "event";

type RouteContext = {
  params: Promise<{
    type: string;
    id: string;
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

function normaliseType(value: unknown): SmilesItemType | "" {
  const cleanValue = cleanText(value).toLowerCase();

  if (cleanValue === "offer" || cleanValue === "offers") return "offer";
  if (cleanValue === "event" || cleanValue === "events") return "event";

  return "";
}

function cleanNullableText(value: unknown) {
  const cleaned = cleanText(value);
  return cleaned || null;
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
      smilesVenueId: "",
    };
  }

  const fromOne = getFromOneSupabaseAdmin();

  const { data: profile, error: profileError } = await fromOne
    .from("business_profiles")
    .select("id, user_id, smiles_listing_venue_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const smilesVenueId = cleanText((profile as any)?.smiles_listing_venue_id);

  if (!smilesVenueId) {
    return {
      ok: false as const,
      status: 404,
      message: "No linked Stockport Smiles venue was found.",
      smilesVenueId: "",
    };
  }

  return {
    ok: true as const,
    status: 200,
    message: "",
    smilesVenueId,
  };
}

function getSelectColumns(type: SmilesItemType) {
  if (type === "offer") {
    return [
      "id",
      "venue_id",
      "title",
      "slug",
      "description",
      "short_description",
      "saving_text",
      "pricing_label",
      "price_value",
      "terms",
      "start_date",
      "end_date",
      "valid_days",
      "valid_times",
      "main_image_url",
      "reference_code",
      "is_published",
      "created_at",
      "updated_at",
    ].join(", ");
  }

  return [
    "id",
    "venue_id",
    "title",
    "slug",
    "description",
    "short_description",
    "location_name",
    "address",
    "start_date",
    "end_date",
    "start_time",
    "end_time",
    "ticket_type",
    "ticket_price",
    "price_text",
    "booking_url",
    "main_image_url",
    "reference_code",
    "is_published",
    "created_at",
    "updated_at",
  ].join(", ");
}

async function loadOwnedItem({
  req,
  type,
  id,
}: {
  req: NextRequest;
  type: SmilesItemType;
  id: string;
}) {
  const ownedVenue = await getOwnedSmilesVenueId(req);

  if (!ownedVenue.ok) {
    return {
      ok: false as const,
      status: ownedVenue.status,
      message: ownedVenue.message,
      item: null,
      smiles: null,
      smilesVenueId: "",
    };
  }

  const smiles = getSmilesSupabaseAdmin();
  const table = type === "offer" ? "offers" : "events";

  const { data, error } = await smiles
    .from(table)
    .select(getSelectColumns(type))
    .eq("id", id)
    .eq("venue_id", ownedVenue.smilesVenueId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return {
      ok: false as const,
      status: 404,
      message: "This Smiles item could not be found for your venue.",
      item: null,
      smiles,
      smilesVenueId: ownedVenue.smilesVenueId,
    };
  }

  return {
    ok: true as const,
    status: 200,
    message: "",
    item: {
      ...(data as any),
      type,
    },
    smiles,
    smilesVenueId: ownedVenue.smilesVenueId,
  };
}

function buildOfferUpdate(body: any) {
  return {
    title: cleanText(body.title) || "Untitled offer",
    description: cleanNullableText(body.description),
    short_description: cleanNullableText(body.short_description || body.shortDescription),
    saving_text: cleanNullableText(body.saving_text || body.savingText),
    pricing_label: cleanNullableText(body.pricing_label || body.pricingLabel),
    price_value: cleanNullableText(body.price_value || body.priceValue),
    terms: cleanNullableText(body.terms),
    start_date: cleanDate(body.start_date || body.startDate),
    end_date: cleanDate(body.end_date || body.endDate),
    valid_days: cleanNullableText(body.valid_days || body.validDays),
    valid_times: cleanNullableText(body.valid_times || body.validTimes),
    main_image_url: cleanNullableText(body.main_image_url || body.mainImageUrl),
    is_published: body.is_published === false ? false : true,
    updated_at: new Date().toISOString(),
  };
}

function buildEventUpdate(body: any) {
  return {
    title: cleanText(body.title) || "Untitled event",
    description: cleanNullableText(body.description),
    short_description: cleanNullableText(body.short_description || body.shortDescription),
    location_name: cleanNullableText(body.location_name || body.locationName),
    address: cleanNullableText(body.address),
    start_date: cleanDate(body.start_date || body.startDate),
    end_date: cleanDate(body.end_date || body.endDate),
    start_time: cleanTime(body.start_time || body.startTime),
    end_time: cleanTime(body.end_time || body.endTime),
    ticket_type: cleanNullableText(body.ticket_type || body.ticketType),
    ticket_price: cleanNullableText(body.ticket_price || body.ticketPrice),
    price_text: cleanNullableText(body.price_text || body.priceText),
    booking_url: cleanNullableText(body.booking_url || body.bookingUrl),
    main_image_url: cleanNullableText(body.main_image_url || body.mainImageUrl),
    is_published: body.is_published === false ? false : true,
    updated_at: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const type = normaliseType(params.type);
    const id = cleanText(params.id);

    if (!type || !id) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "Invalid Smiles item link.",
          item: null,
        },
        { status: 400 }
      );
    }

    const result = await loadOwnedItem({ req, type, id });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: result.message,
          item: null,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      success: true,
      item: result.item,
    });
  } catch (error: any) {
    const message = error?.message || "Could not load this Smiles item.";

    console.error("Smiles item GET error:", message);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        message,
        item: null,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const type = normaliseType(params.type);
    const id = cleanText(params.id);

    if (!type || !id) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "Invalid Smiles item link.",
          item: null,
        },
        { status: 400 }
      );
    }

    const ownedItem = await loadOwnedItem({ req, type, id });

    if (!ownedItem.ok || !ownedItem.smiles) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: ownedItem.message,
          item: null,
        },
        { status: ownedItem.status }
      );
    }

    const body = await req.json().catch(() => ({}));
    const table = type === "offer" ? "offers" : "events";
    const updates = type === "offer" ? buildOfferUpdate(body) : buildEventUpdate(body);

    const { data, error } = await ownedItem.smiles
      .from(table)
      .update(updates)
      .eq("id", id)
      .eq("venue_id", ownedItem.smilesVenueId)
      .select(getSelectColumns(type))
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Smiles item updated.",
      item: {
        ...(data as any),
        type,
      },
    });
  } catch (error: any) {
    const message = error?.message || "Could not save this Smiles item.";

    console.error("Smiles item PATCH error:", message);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        message,
        item: null,
      },
      { status: 500 }
    );
  }
}
