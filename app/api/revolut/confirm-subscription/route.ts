import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVOLUT_API_VERSION = "2026-04-20";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type SubscriptionAccessRecord = {
  user_id: string;
  access_status: string | null;
  subscription_status: string | null;
  subscription_provider: string | null;
  subscription_reference: string | null;
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function getRevolutEnvironment() {
  return cleanText(
    process.env.REVOLUT_ENVIRONMENT || "sandbox",
  ).toLowerCase();
}

function getRevolutBaseUrl() {
  return getRevolutEnvironment() === "production"
    ? "https://merchant.revolut.com"
    : "https://sandbox-merchant.revolut.com";
}

function getRevolutSecretKey() {
  if (getRevolutEnvironment() === "production") {
    return cleanText(process.env.REVOLUT_SECRET_KEY);
  }

  return cleanText(
    process.env.REVOLUT_SANDBOX_SECRET_KEY,
  );
}

function getPlanVariationId() {
  return cleanText(
    process.env.REVOLUT_PLAN_VARIATION_ID,
  );
}

function getBearerToken(request: NextRequest) {
  const authHeader =
    request.headers.get("authorization") || "";

  if (
    !authHeader.toLowerCase().startsWith("bearer ")
  ) {
    return "";
  }

  return authHeader
    .slice("bearer ".length)
    .trim();
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase server environment variables.",
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

async function readResponseBody(response: Response) {
  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

async function getSignedInUser(
  request: NextRequest,
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase public environment variables.",
    );
  }

  const token = getBearerToken(request);

  if (!token) {
    throw new Error(
      "Missing auth token. Please sign in again.",
    );
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { data, error } =
    await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error(
      "Please sign in before confirming Revolut checkout.",
    );
  }

  return data.user;
}

async function getSubscriptionRecord(
  userId: string,
): Promise<SubscriptionAccessRecord | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("user_access")
    .select(
      "user_id, access_status, subscription_status, subscription_provider, subscription_reference",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as SubscriptionAccessRecord | null;
}

async function retrieveRevolutSubscription({
  secretKey,
  subscriptionId,
}: {
  secretKey: string;
  subscriptionId: string;
}) {
  const response = await fetch(
    `${getRevolutBaseUrl()}/api/subscriptions/${encodeURIComponent(
      subscriptionId,
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Revolut-Api-Version":
          REVOLUT_API_VERSION,
      },
      cache: "no-store",
    },
  );

  const result = await readResponseBody(response);

  if (!response.ok) {
    const resultObject =
      result &&
      typeof result === "object" &&
      !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : null;

    throw new Error(
      cleanText(resultObject?.message) ||
        cleanText(resultObject?.error) ||
        "Could not confirm the Revolut subscription status.",
    );
  }

  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    throw new Error(
      "Revolut returned an invalid subscription response.",
    );
  }

  return result as Record<string, any>;
}

function validateSubscriptionOwnership({
  subscription,
  userId,
  storedSubscriptionId,
}: {
  subscription: Record<string, any>;
  userId: string;
  storedSubscriptionId: string;
}) {
  const returnedSubscriptionId = cleanText(
    subscription.id,
  );

  const externalReference = cleanText(
    subscription.external_reference,
  );

  const returnedPlanVariationId = cleanText(
    subscription.plan_variation_id,
  );

  const expectedPlanVariationId =
    getPlanVariationId();

  if (
    !returnedSubscriptionId ||
    returnedSubscriptionId !== storedSubscriptionId
  ) {
    throw new Error(
      "The Revolut subscription reference did not match this account.",
    );
  }

  if (
    !externalReference ||
    externalReference !== userId
  ) {
    throw new Error(
      "The Revolut subscription does not belong to this FromOne account.",
    );
  }

  if (
    expectedPlanVariationId &&
    returnedPlanVariationId !==
      expectedPlanVariationId
  ) {
    throw new Error(
      "The Revolut subscription uses an unexpected pricing plan.",
    );
  }
}

function mapRevolutStateToFromOneStatus(
  revolutState: string,
) {
  switch (revolutState) {
    case "active":
      return {
        billingStatus: "active",
        accessStatus: "active",
        subscriptionStatus: "active",
      };

    case "overdue":
      return {
        billingStatus: "past_due",
        accessStatus: "locked",
        subscriptionStatus: "past_due",
      };

    case "paused":
      return {
        billingStatus: "suspended",
        accessStatus: "locked",
        subscriptionStatus: "suspended",
      };

    case "cancelled":
      return {
        billingStatus: "cancelled",
        accessStatus: "expired",
        subscriptionStatus: "cancelled",
      };

    case "finished":
      return {
        billingStatus: "expired",
        accessStatus: "expired",
        subscriptionStatus: "expired",
      };

    case "pending":
    default:
      return {
        billingStatus: "pending_payment",
        accessStatus: "pending_payment",
        subscriptionStatus: "pending_payment",
      };
  }
}

async function saveConfirmedState({
  userId,
  subscriptionId,
  revolutState,
}: {
  userId: string;
  subscriptionId: string;
  revolutState: string;
}) {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const mappedStatus =
    mapRevolutStateToFromOneStatus(
      revolutState,
    );

  const cancelledAt =
    revolutState === "cancelled"
      ? nowIso
      : null;

  const { error: billingError } =
    await supabase.from("user_billing").upsert(
      {
        user_id: userId,
        plan: "starter",
        status:
          mappedStatus.billingStatus,
        cancelled_at: cancelledAt,
        updated_at: nowIso,
      },
      {
        onConflict: "user_id",
      },
    );

  if (billingError) {
    throw billingError;
  }

  const { error: accessError } =
    await supabase.from("user_access").upsert(
      {
        user_id: userId,
        access_status:
          mappedStatus.accessStatus,
        subscription_status:
          mappedStatus.subscriptionStatus,
        subscription_provider: "revolut",
        subscription_reference:
          subscriptionId,
        updated_at: nowIso,
      },
      {
        onConflict: "user_id",
      },
    );

  if (accessError) {
    throw accessError;
  }

  return mappedStatus;
}

export async function POST(
  request: NextRequest,
) {
  try {
    const secretKey =
      getRevolutSecretKey();

    if (!secretKey) {
      throw new Error(
        getRevolutEnvironment() ===
          "production"
          ? "REVOLUT_SECRET_KEY is missing from the server environment."
          : "REVOLUT_SANDBOX_SECRET_KEY is missing from the server environment.",
      );
    }

    const user =
      await getSignedInUser(request);

    const access =
      await getSubscriptionRecord(user.id);

    if (!access) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No subscription record was found for this account.",
        },
        { status: 404 },
      );
    }

    const provider = cleanText(
      access.subscription_provider,
    ).toLowerCase();

    const subscriptionId = cleanText(
      access.subscription_reference,
    );

    if (provider !== "revolut") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This account does not have a pending Revolut subscription.",
        },
        { status: 409 },
      );
    }

    if (!subscriptionId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No Revolut subscription reference was found for this account.",
        },
        { status: 409 },
      );
    }

    const subscription =
      await retrieveRevolutSubscription({
        secretKey,
        subscriptionId,
      });

    validateSubscriptionOwnership({
      subscription,
      userId: user.id,
      storedSubscriptionId:
        subscriptionId,
    });

    const revolutState = cleanText(
      subscription.state,
    ).toLowerCase();

    const mappedStatus =
      await saveConfirmedState({
        userId: user.id,
        subscriptionId,
        revolutState,
      });

    return NextResponse.json({
      ok: true,
      provider: "revolut",
      environment:
        getRevolutEnvironment(),
      status:
        mappedStatus.billingStatus,
      revolut_state:
        revolutState || "unknown",
      subscription_id:
        subscriptionId,
      active:
        revolutState === "active",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not confirm the Revolut subscription.";

    console.error(
      "Confirm Revolut subscription error:",
      message,
    );

    const lowerMessage =
      message.toLowerCase();

    const status =
      lowerMessage.includes("sign in") ||
      lowerMessage.includes(
        "auth token",
      )
        ? 401
        : lowerMessage.includes(
              "does not belong",
            ) ||
            lowerMessage.includes(
              "did not match",
            )
          ? 403
          : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status },
    );
  }
}