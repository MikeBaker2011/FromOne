import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanDays(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 30;
  }

  if (parsed <= 0) {
    return 0;
  }

  return Math.min(Math.floor(parsed), 3650);
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Please sign in again." },
        { status: 401 }
      );
    }

    const fromOneUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const fromOneAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const smilezUrl = process.env.STOCKPORT_SMILES_SUPABASE_URL;
    const smilezServiceRoleKey =
      process.env.STOCKPORT_SMILES_SUPABASE_SERVICE_ROLE_KEY;

    if (
      !fromOneUrl ||
      !fromOneAnonKey ||
      !smilezUrl ||
      !smilezServiceRoleKey
    ) {
      console.error("Missing Supabase environment variables for Smilez insights.");

      return NextResponse.json(
        { success: false, message: "Customer insights are not configured." },
        { status: 500 }
      );
    }

    const fromOneSupabase = createClient(fromOneUrl, fromOneAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await fromOneSupabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "Please sign in again." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const businessId = cleanText(body?.businessId);
    const days = cleanDays(body?.days);

    if (!businessId) {
      return NextResponse.json(
        { success: false, message: "A Smilez business ID is required." },
        { status: 400 }
      );
    }

    const smilezSupabase = createClient(smilezUrl, smilezServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let query = smilezSupabase
      .from("smilez_engagement_events")
      .select("event_type")
      .eq("business_id", businessId);

    if (days > 0) {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      query = query.gte("created_at", fromDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Could not load Smilez engagement totals:", error.message);

      return NextResponse.json(
        { success: false, message: "Could not load customer engagement." },
        { status: 500 }
      );
    }

    const totals = {
      venue_views: 0,
      offer_views: 0,
      event_views: 0,
      favourites: 0,
      plan_additions: 0,
      booking_starts: 0,
    };

    for (const row of data || []) {
      switch (row.event_type) {
        case "venue_view":
          totals.venue_views += 1;
          break;
        case "offer_view":
          totals.offer_views += 1;
          break;
        case "event_view":
          totals.event_views += 1;
          break;
        case "favourite_added":
          totals.favourites += 1;
          break;
        case "plan_added":
          totals.plan_additions += 1;
          break;
        case "booking_started":
          totals.booking_starts += 1;
          break;
      }
    }

    return NextResponse.json({
      success: true,
      totals,
    });
  } catch (error) {
    console.error("Smilez engagement API error:", error);

    return NextResponse.json(
      { success: false, message: "Could not load customer engagement." },
      { status: 500 }
    );
  }
}