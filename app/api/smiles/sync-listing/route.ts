import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SyncListingBody = {
  businessProfileId?: string;
  business_profile_id?: string;
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

function getProfileId(body: SyncListingBody) {
  return cleanText(body.businessProfileId || body.business_profile_id);
}

function getSmilesVenueId(submission: any) {
  return cleanText(
    submission?.published_record_id ||
      submission?.payload?.smiles_venue_id ||
      submission?.payload?.fromone_venue_id
  );
}

function getNextFromOneStatus(submissionStatus: string) {
  if (submissionStatus === "published") return "live";
  if (submissionStatus === "approved") return "approved_not_live";
  if (submissionStatus === "needs_changes") return "needs_changes";
  if (submissionStatus === "rejected") return "rejected";
  return "pending_review";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as SyncListingBody;
    const profileId = getProfileId(body);

    if (!profileId) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "Missing business profile id.",
        },
        { status: 400 }
      );
    }

    const userSupabase = getFromOneSupabaseForUser(req);
    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "Please sign in again.",
        },
        { status: 401 }
      );
    }

    const fromOne = getFromOneSupabaseAdmin();

    const { data: profile, error: profileError } = await fromOne
      .from("business_profiles")
      .select(
        "id, user_id, smiles_listing_status, smiles_listing_submission_id"
      )
      .eq("id", profileId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (!profile || profile.user_id !== user.id) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "Business profile not found.",
        },
        { status: 404 }
      );
    }

    const submissionId = cleanText(profile.smiles_listing_submission_id);

    if (!submissionId) {
      return NextResponse.json({
        ok: true,
        success: true,
        changed: false,
        status: cleanText(profile.smiles_listing_status) || "",
        message: "No Smiles submission has been sent yet.",
      });
    }

    const smiles = getSmilesSupabaseAdmin();

    const { data: submission, error: submissionError } = await smiles
      .from("submissions")
      .select("id, status, published_record_id, published_record_type, payload")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) {
      throw new Error(submissionError.message);
    }

    if (!submission) {
      return NextResponse.json({
        ok: true,
        success: true,
        changed: false,
        status: "pending_review",
        message: "Smiles submission is not available yet.",
      });
    }

    const nextStatus = getNextFromOneStatus(cleanText(submission.status));
    const smilesVenueId =
      submission.published_record_type === "venue"
        ? getSmilesVenueId(submission)
        : "";
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = {
      smiles_listing_status: nextStatus,
      smiles_listing_error: null,
      updated_at: now,
    };

    if (nextStatus === "live" && smilesVenueId) {
      updates.smiles_listing_venue_id = smilesVenueId;
      updates.smiles_listing_published_at = now;
    }

    const { error: updateError } = await fromOne
      .from("business_profiles")
      .update(updates)
      .eq("id", profileId)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      ok: true,
      success: true,
      changed: true,
      status: nextStatus,
      smilesSubmissionId: submission.id,
      smilesVenueId: smilesVenueId || null,
      message:
        nextStatus === "live"
          ? "Business listing is live on Stockport Smiles."
          : "Business listing status synced from Stockport Smiles.",
    });
  } catch (error: any) {
    const message =
      error?.message || "Could not sync this Smiles business listing.";

    console.error("Smiles listing sync API error:", message);

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
