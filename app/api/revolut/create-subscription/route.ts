import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVOLUT_API_VERSION = "2026-04-20";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function createRevolutIdempotencyKey(value: string) {
  return createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 50);
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

  return cleanText(process.env.REVOLUT_SANDBOX_SECRET_KEY);
}

function getPlanVariationId() {
  return cleanText(process.env.REVOLUT_PLAN_VARIATION_ID);
}

function getSiteBaseUrl(request: NextRequest) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://fromone.co.uk";

  const host = request.headers.get("host") || "";

  if (host.includes("localhost")) {
    return `http://${host}`;
  }

  return configuredUrl.replace(/\/$/, "");
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice("bearer ".length).trim();
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase server environment variables.",
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
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

function getRevolutHeaders({
  secretKey,
  idempotencyKey,
}: {
  secretKey: string;
  idempotencyKey?: string;
}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
    "Revolut-Api-Version": REVOLUT_API_VERSION,
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  return headers;
}

async function getSignedInUser(request: NextRequest) {
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
      "Please sign in before starting Revolut checkout.",
    );
  }

  return data.user;
}

async function getExistingBilling(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("user_billing")
    .select(
      "plan, status, paypal_subscription_id, trial_ends_at, manual_access_until, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getExistingAccess(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("user_access")
    .select(
      "access_status, subscription_status, subscription_provider, subscription_reference",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function hasManualAccess(billing: any) {
  if (!billing?.manual_access_until) {
    return false;
  }

  const manualAccessUntil = new Date(
    billing.manual_access_until,
  );

  return (
    billing.status === "manual" &&
    manualAccessUntil.getTime() > Date.now()
  );
}

function validateCanCreateSubscription({
  billing,
  access,
}: {
  billing: any;
  access: any;
}) {
  const billingPlan = cleanText(
    billing?.plan || "demo",
  ).toLowerCase();

  const billingStatus = cleanText(
    billing?.status || "trialing",
  ).toLowerCase();

  const accessStatus = cleanText(
    access?.access_status,
  ).toLowerCase();

  const subscriptionStatus = cleanText(
    access?.subscription_status,
  ).toLowerCase();

  const subscriptionProvider = cleanText(
    access?.subscription_provider,
  ).toLowerCase();

  const subscriptionReference = cleanText(
    access?.subscription_reference,
  );

  const hasLegacyPayPalSubscription = cleanText(
    billing?.paypal_subscription_id,
  ).startsWith("I-");

  const hasActiveSubscription =
    billingStatus === "active" ||
    accessStatus === "active" ||
    subscriptionStatus === "active";

  if (
    hasActiveSubscription &&
    (billingPlan === "starter" ||
      billingPlan === "pro" ||
      hasLegacyPayPalSubscription ||
      Boolean(subscriptionReference))
  ) {
    throw new Error(
      "You already have active Starter access. Contact support before changing payment provider.",
    );
  }

  if (
    billingStatus === "pending_payment" ||
    accessStatus === "pending_payment" ||
    subscriptionStatus === "pending_payment"
  ) {
    const providerLabel =
      subscriptionProvider === "revolut"
        ? "Revolut"
        : subscriptionProvider === "paypal"
          ? "PayPal"
          : "payment";

    throw new Error(
      `You already have a pending ${providerLabel} checkout. Complete it or cancel it before starting again.`,
    );
  }

  if (hasManualAccess(billing)) {
    throw new Error(
      "Manual account access is currently active. Contact support before changing billing.",
    );
  }
}

async function findExistingRevolutCustomer({
  secretKey,
  email,
}: {
  secretKey: string;
  email: string;
}) {
  let pageToken = "";
  let pageCount = 0;

  while (pageCount < 20) {
    const searchParams = new URLSearchParams({
      limit: "100",
    });

    if (pageToken) {
      searchParams.set("page_token", pageToken);
    }

    const response = await fetch(
      `${getRevolutBaseUrl()}/api/customers?${searchParams.toString()}`,
      {
        method: "GET",
        headers: getRevolutHeaders({
          secretKey,
        }),
        cache: "no-store",
      },
    );

    const result = await readResponseBody(response);

    if (!response.ok) {
      throw new Error(
        result &&
          typeof result === "object" &&
          "message" in result
          ? cleanText(
              (result as Record<string, unknown>).message,
            )
          : "Could not search Revolut customers.",
      );
    }

    const resultObject =
      result &&
      typeof result === "object" &&
      !Array.isArray(result)
        ? (result as Record<string, any>)
        : {};

    const customers = Array.isArray(
      resultObject.customers,
    )
      ? resultObject.customers
      : [];

    const matchingCustomer = customers.find(
      (customer: any) =>
        cleanText(customer?.email).toLowerCase() ===
        email.toLowerCase(),
    );

    if (matchingCustomer?.id) {
      return cleanText(matchingCustomer.id);
    }

    pageToken = cleanText(
      resultObject.next_page_token,
    );

    if (!pageToken) {
      return "";
    }

    pageCount += 1;
  }

  throw new Error(
    "Could not finish searching Revolut customers.",
  );
}

async function createRevolutCustomer({
  secretKey,
  email,
  fullName,
  idempotencyKey,
}: {
  secretKey: string;
  email: string;
  fullName: string;
  idempotencyKey: string;
}) {
  const response = await fetch(
    `${getRevolutBaseUrl()}/api/customers`,
    {
      method: "POST",
      headers: getRevolutHeaders({
        secretKey,
        idempotencyKey,
      }),
      body: JSON.stringify({
        email,
        ...(fullName
          ? {
              full_name: fullName,
            }
          : {}),
      }),
      cache: "no-store",
    },
  );

  const result = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      result &&
        typeof result === "object" &&
        "message" in result
        ? cleanText(
            (result as Record<string, unknown>).message,
          )
        : "Could not create the Revolut customer.",
    );
  }

  const resultObject =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
      ? (result as Record<string, any>)
      : {};

  const customerId = cleanText(resultObject.id);

  if (!customerId) {
    throw new Error(
      "Revolut did not return a customer ID.",
    );
  }

  return customerId;
}

async function getOrCreateRevolutCustomer({
  secretKey,
  email,
  fullName,
  userId,
}: {
  secretKey: string;
  email: string;
  fullName: string;
  userId: string;
}) {
  const existingCustomerId =
    await findExistingRevolutCustomer({
      secretKey,
      email,
    });

  if (existingCustomerId) {
    return existingCustomerId;
  }

  const customerIdempotencyKey =
    createRevolutIdempotencyKey(
      `fromone-revolut-customer:${userId}:${email}`,
    );

  return createRevolutCustomer({
    secretKey,
    email,
    fullName,
    idempotencyKey: customerIdempotencyKey,
  });
}

async function createRevolutSubscription({
  secretKey,
  customerId,
  userId,
  siteBaseUrl,
  billingUpdatedAt,
}: {
  secretKey: string;
  customerId: string;
  userId: string;
  siteBaseUrl: string;
  billingUpdatedAt: string;
}) {
  const planVariationId = getPlanVariationId();

  if (!planVariationId) {
    throw new Error(
      "REVOLUT_PLAN_VARIATION_ID is missing from the server environment.",
    );
  }

  const idempotencyKey =
    createRevolutIdempotencyKey(
      [
        "fromone-revolut-subscription",
        userId,
        planVariationId,
        billingUpdatedAt || "new-account",
      ].join(":"),
    );

  const response = await fetch(
    `${getRevolutBaseUrl()}/api/subscriptions`,
    {
      method: "POST",
      headers: getRevolutHeaders({
        secretKey,
        idempotencyKey,
      }),
      body: JSON.stringify({
        plan_variation_id: planVariationId,
        customer_id: customerId,
        setup_order_redirect_url:
          `${siteBaseUrl}/subscription?revolut=approved`,
        external_reference: userId,
      }),
      cache: "no-store",
    },
  );

  const result = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      result &&
        typeof result === "object" &&
        "message" in result
        ? cleanText(
            (result as Record<string, unknown>).message,
          )
        : "Could not create the Revolut subscription.",
    );
  }

  const resultObject =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
      ? (result as Record<string, any>)
      : {};

  const subscriptionId = cleanText(
    resultObject.id,
  );

  const setupOrderId = cleanText(
    resultObject.setup_order_id,
  );

  if (!subscriptionId) {
    throw new Error(
      "Revolut did not return a subscription ID.",
    );
  }

  if (!setupOrderId) {
    throw new Error(
      "Revolut did not return a setup order ID.",
    );
  }

  return {
    subscriptionId,
    setupOrderId,
    subscriptionState: cleanText(
      resultObject.state || "pending",
    ),
  };
}

async function retrieveSetupOrder({
  secretKey,
  setupOrderId,
}: {
  secretKey: string;
  setupOrderId: string;
}) {
  const response = await fetch(
    `${getRevolutBaseUrl()}/api/orders/${encodeURIComponent(
      setupOrderId,
    )}`,
    {
      method: "GET",
      headers: getRevolutHeaders({
        secretKey,
      }),
      cache: "no-store",
    },
  );

  const result = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      result &&
        typeof result === "object" &&
        "message" in result
        ? cleanText(
            (result as Record<string, unknown>).message,
          )
        : "Could not retrieve the Revolut setup order.",
    );
  }

  const resultObject =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
      ? (result as Record<string, any>)
      : {};

  const checkoutUrl = cleanText(
    resultObject.checkout_url,
  );

  if (!checkoutUrl) {
    throw new Error(
      "Revolut did not return a hosted checkout URL.",
    );
  }

  return checkoutUrl;
}

async function savePendingSubscription({
  userId,
  subscriptionId,
}: {
  userId: string;
  subscriptionId: string;
}) {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { error: billingError } =
    await supabase.from("user_billing").upsert(
      {
        user_id: userId,
        plan: "starter",
        status: "pending_payment",
        cancelled_at: null,
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
        access_status: "pending_payment",
        subscription_status: "pending_payment",
        subscription_provider: "revolut",
        subscription_reference: subscriptionId,
        updated_at: nowIso,
      },
      {
        onConflict: "user_id",
      },
    );

  if (accessError) {
    throw accessError;
  }
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = getRevolutSecretKey();

    if (!secretKey) {
      throw new Error(
        getRevolutEnvironment() === "production"
          ? "REVOLUT_SECRET_KEY is missing from the server environment."
          : "REVOLUT_SANDBOX_SECRET_KEY is missing from the server environment.",
      );
    }

    if (!getPlanVariationId()) {
      throw new Error(
        "REVOLUT_PLAN_VARIATION_ID is missing from the server environment.",
      );
    }

    const user = await getSignedInUser(request);

    const userId = user.id;
    const userEmail = cleanText(user.email);
    const userFullName = cleanText(
      user.user_metadata?.full_name ||
        user.user_metadata?.name,
    );

    if (!userEmail) {
      throw new Error(
        "Your signed-in account does not have an email address.",
      );
    }

    const siteBaseUrl = getSiteBaseUrl(request);

    const [existingBilling, existingAccess] =
      await Promise.all([
        getExistingBilling(userId),
        getExistingAccess(userId),
      ]);

    validateCanCreateSubscription({
      billing: existingBilling,
      access: existingAccess,
    });

    const customerId =
      await getOrCreateRevolutCustomer({
        secretKey,
        email: userEmail,
        fullName: userFullName,
        userId,
      });

    const subscription =
      await createRevolutSubscription({
        secretKey,
        customerId,
        userId,
        siteBaseUrl,
        billingUpdatedAt: cleanText(
          existingBilling?.updated_at,
        ),
      });

    const checkoutUrl = await retrieveSetupOrder({
      secretKey,
      setupOrderId:
        subscription.setupOrderId,
    });

    await savePendingSubscription({
      userId,
      subscriptionId:
        subscription.subscriptionId,
    });

    return NextResponse.json({
      ok: true,
      environment: getRevolutEnvironment(),
      provider: "revolut",
      subscription_id:
        subscription.subscriptionId,
      subscription_state:
        subscription.subscriptionState,
      setup_order_id:
        subscription.setupOrderId,
      checkout_url: checkoutUrl,
      price: "49.99",
      amount_minor_units: 4999,
      currency: "GBP",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not create the Revolut subscription.";

    console.error(
      "Create Revolut subscription error:",
      message,
    );

    const lowerMessage = message.toLowerCase();

    const status =
      lowerMessage.includes("sign in") ||
      lowerMessage.includes("auth token")
        ? 401
        : lowerMessage.includes("already have") ||
            lowerMessage.includes("pending") ||
            lowerMessage.includes("manual account")
          ? 409
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