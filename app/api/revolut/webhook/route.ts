import {
  createHmac,
  createHash,
  timingSafeEqual,
} from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVOLUT_API_VERSION = "2026-04-20";
const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type RevolutWebhookEvent = {
  event?: string;
  id?: string;
  subscription_id?: string;
  external_reference?: string;
  customer_id?: string;
  data?: {
    id?: string;
    subscription_id?: string;
    external_reference?: string;
    customer_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type RevolutSubscription = {
  id?: string;
  external_reference?: string;
  plan_variation_id?: string;
  state?: string;
  customer_id?: string;
  [key: string]: unknown;
};

type StoredAccessRecord = {
  user_id: string;
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

function getWebhookSigningSecret() {
  if (getRevolutEnvironment() === "production") {
    return cleanText(
      process.env.REVOLUT_WEBHOOK_SIGNING_SECRET,
    );
  }

  return (
    cleanText(
      process.env
        .REVOLUT_SANDBOX_WEBHOOK_SIGNING_SECRET,
    ) ||
    cleanText(
      process.env.REVOLUT_WEBHOOK_SIGNING_SECRET,
    )
  );
}

function getExpectedPlanVariationId() {
  return cleanText(
    process.env.REVOLUT_PLAN_VARIATION_ID,
  );
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

function createSafeBuffer(value: string) {
  return Buffer.from(value, "utf8");
}

function safeStringEqual(
  firstValue: string,
  secondValue: string,
) {
  const firstBuffer = createSafeBuffer(firstValue);
  const secondBuffer = createSafeBuffer(secondValue);

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return timingSafeEqual(
    firstBuffer,
    secondBuffer,
  );
}

function validateWebhookTimestamp(timestamp: string) {
  if (!/^\d+$/.test(timestamp)) {
    throw new Error(
      "Invalid Revolut webhook timestamp.",
    );
  }

  const timestampNumber = Number(timestamp);

  if (
    !Number.isFinite(timestampNumber) ||
    timestampNumber <= 0
  ) {
    throw new Error(
      "Invalid Revolut webhook timestamp.",
    );
  }

  const difference = Math.abs(
    Date.now() - timestampNumber,
  );

  if (difference > WEBHOOK_TOLERANCE_MS) {
    throw new Error(
      "Revolut webhook timestamp is outside the allowed five-minute window.",
    );
  }
}

function verifyWebhookSignature({
  rawBody,
  timestamp,
  receivedSignatureHeader,
  signingSecret,
}: {
  rawBody: string;
  timestamp: string;
  receivedSignatureHeader: string;
  signingSecret: string;
}) {
  validateWebhookTimestamp(timestamp);

  const payloadToSign =
    `v1.${timestamp}.${rawBody}`;

  const digest = createHmac(
    "sha256",
    signingSecret,
  )
    .update(payloadToSign, "utf8")
    .digest("hex");

  const expectedSignature = `v1=${digest}`;

  const receivedSignatures =
    receivedSignatureHeader
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

  if (!receivedSignatures.length) {
    throw new Error(
      "Missing Revolut webhook signature.",
    );
  }

  const signatureMatched =
    receivedSignatures.some((signature) =>
      safeStringEqual(
        signature,
        expectedSignature,
      ),
    );

  if (!signatureMatched) {
    throw new Error(
      "Invalid Revolut webhook signature.",
    );
  }
}

function getWebhookEventType(
  event: RevolutWebhookEvent,
) {
  return cleanText(event.event).toUpperCase();
}

function isSupportedSubscriptionEvent(
  eventType: string,
) {
  return [
    "SUBSCRIPTION_INITIATED",
    "SUBSCRIPTION_OVERDUE",
    "SUBSCRIPTION_CANCELLED",
    "SUBSCRIPTION_FINISHED",
  ].includes(eventType);
}

function getWebhookSubscriptionId(
  event: RevolutWebhookEvent,
) {
  return cleanText(
    event.subscription_id ||
      event.data?.subscription_id ||
      event.data?.id ||
      event.id,
  );
}

function getWebhookExternalReference(
  event: RevolutWebhookEvent,
) {
  return cleanText(
    event.external_reference ||
      event.data?.external_reference,
  );
}

async function retrieveRevolutSubscription({
  secretKey,
  subscriptionId,
}: {
  secretKey: string;
  subscriptionId: string;
}): Promise<RevolutSubscription> {
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
        "Could not retrieve the Revolut subscription.",
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

  return result as RevolutSubscription;
}

async function findUserBySubscriptionReference(
  subscriptionId: string,
) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("user_access")
    .select(
      "user_id, subscription_provider, subscription_reference",
    )
    .eq("subscription_provider", "revolut")
    .eq(
      "subscription_reference",
      subscriptionId,
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  const access =
    data as StoredAccessRecord | null;

  return cleanText(access?.user_id);
}

async function resolveUserId({
  subscription,
  subscriptionId,
  webhookExternalReference,
}: {
  subscription: RevolutSubscription;
  subscriptionId: string;
  webhookExternalReference: string;
}) {
  const subscriptionExternalReference =
    cleanText(
      subscription.external_reference,
    );

  if (subscriptionExternalReference) {
    return subscriptionExternalReference;
  }

  if (webhookExternalReference) {
    return webhookExternalReference;
  }

  return findUserBySubscriptionReference(
    subscriptionId,
  );
}

function validateSubscription({
  subscription,
  subscriptionId,
}: {
  subscription: RevolutSubscription;
  subscriptionId: string;
}) {
  const returnedSubscriptionId =
    cleanText(subscription.id);

  if (
    !returnedSubscriptionId ||
    returnedSubscriptionId !== subscriptionId
  ) {
    throw new Error(
      "The retrieved Revolut subscription ID did not match the webhook subscription ID.",
    );
  }

  const expectedPlanVariationId =
    getExpectedPlanVariationId();

  const returnedPlanVariationId =
    cleanText(
      subscription.plan_variation_id,
    );

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

function mapSubscriptionState(
  revolutState: string,
) {
  switch (revolutState) {
    case "active":
      return {
        billingStatus: "active",
        accessStatus: "active",
        subscriptionStatus: "active",
        cancelledAt: null,
      };

    case "overdue":
      return {
        billingStatus: "past_due",
        accessStatus: "locked",
        subscriptionStatus: "past_due",
        cancelledAt: null,
      };

    case "paused":
      return {
        billingStatus: "suspended",
        accessStatus: "locked",
        subscriptionStatus: "suspended",
        cancelledAt: null,
      };

    case "cancelled":
      return {
        billingStatus: "cancelled",
        accessStatus: "expired",
        subscriptionStatus: "cancelled",
        cancelledAt: new Date().toISOString(),
      };

    case "finished":
      return {
        billingStatus: "expired",
        accessStatus: "expired",
        subscriptionStatus: "expired",
        cancelledAt: null,
      };

    case "pending":
    default:
      return {
        billingStatus: "pending_payment",
        accessStatus: "pending_payment",
        subscriptionStatus:
          "pending_payment",
        cancelledAt: null,
      };
  }
}

async function saveSubscriptionState({
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

  const mapped =
    mapSubscriptionState(revolutState);

  const { error: billingError } =
    await supabase.from("user_billing").upsert(
      {
        user_id: userId,
        plan: "starter",
        status: mapped.billingStatus,
        cancelled_at: mapped.cancelledAt,
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
        access_status: mapped.accessStatus,
        subscription_status:
          mapped.subscriptionStatus,
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

  return mapped;
}

function createDeliveryFingerprint({
  timestamp,
  rawBody,
}: {
  timestamp: string;
  rawBody: string;
}) {
  return createHash("sha256")
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")
    .slice(0, 16);
}

export async function POST(
  request: NextRequest,
) {
  let event:
    | RevolutWebhookEvent
    | null = null;

  let eventType = "";
  let subscriptionId = "";

  try {
    const signingSecret =
      getWebhookSigningSecret();

    if (!signingSecret) {
      throw new Error(
        getRevolutEnvironment() === "production"
          ? "REVOLUT_WEBHOOK_SIGNING_SECRET is missing from the server environment."
          : "REVOLUT_SANDBOX_WEBHOOK_SIGNING_SECRET is missing from the server environment.",
      );
    }

    const secretKey =
      getRevolutSecretKey();

    if (!secretKey) {
      throw new Error(
        getRevolutEnvironment() === "production"
          ? "REVOLUT_SECRET_KEY is missing from the server environment."
          : "REVOLUT_SANDBOX_SECRET_KEY is missing from the server environment.",
      );
    }

    const rawBody = await request.text();

    if (!rawBody) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing Revolut webhook body.",
        },
        { status: 400 },
      );
    }

    const timestamp = cleanText(
      request.headers.get(
        "revolut-request-timestamp",
      ),
    );

    const signatureHeader = cleanText(
      request.headers.get(
        "revolut-signature",
      ),
    );

    if (!timestamp || !signatureHeader) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing Revolut webhook security headers.",
        },
        { status: 401 },
      );
    }

    verifyWebhookSignature({
      rawBody,
      timestamp,
      receivedSignatureHeader:
        signatureHeader,
      signingSecret,
    });

    try {
      event =
        JSON.parse(
          rawBody,
        ) as RevolutWebhookEvent;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid Revolut webhook JSON.",
        },
        { status: 400 },
      );
    }

    eventType =
      getWebhookEventType(event);

    if (!eventType) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing Revolut webhook event type.",
        },
        { status: 400 },
      );
    }

    if (
      !isSupportedSubscriptionEvent(
        eventType,
      )
    ) {
      console.info(
        "Ignoring Revolut webhook event:",
        {
          eventType,
          fingerprint:
            createDeliveryFingerprint({
              timestamp,
              rawBody,
            }),
        },
      );

      return new NextResponse(null, {
        status: 204,
      });
    }

    subscriptionId =
      getWebhookSubscriptionId(event);

    if (!subscriptionId) {
      throw new Error(
        "The Revolut subscription webhook did not contain a subscription ID.",
      );
    }

    const subscription =
      await retrieveRevolutSubscription({
        secretKey,
        subscriptionId,
      });

    validateSubscription({
      subscription,
      subscriptionId,
    });

    const userId = await resolveUserId({
      subscription,
      subscriptionId,
      webhookExternalReference:
        getWebhookExternalReference(event),
    });

    if (!userId) {
      console.warn(
        "Revolut webhook could not be linked to a FromOne user.",
        {
          eventType,
          subscriptionId,
          fingerprint:
            createDeliveryFingerprint({
              timestamp,
              rawBody,
            }),
        },
      );

      return new NextResponse(null, {
        status: 204,
      });
    }

    const subscriptionExternalReference =
      cleanText(
        subscription.external_reference,
      );

    if (
      subscriptionExternalReference &&
      subscriptionExternalReference !== userId
    ) {
      throw new Error(
        "The Revolut subscription external reference did not match the resolved FromOne user.",
      );
    }

    const revolutState = cleanText(
      subscription.state,
    ).toLowerCase();

    const mapped =
      await saveSubscriptionState({
        userId,
        subscriptionId,
        revolutState,
      });

    console.info(
      "Revolut subscription webhook processed:",
      {
        eventType,
        subscriptionId,
        userId,
        revolutState:
          revolutState || "unknown",
        billingStatus:
          mapped.billingStatus,
        fingerprint:
          createDeliveryFingerprint({
            timestamp,
            rawBody,
          }),
      },
    );

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Revolut webhook processing failed.";

    console.error(
      "Revolut webhook error:",
      {
        message,
        eventType:
          eventType || cleanText(event?.event),
        subscriptionId:
          subscriptionId || null,
        environment:
          getRevolutEnvironment(),
      },
    );

    const lowerMessage =
      message.toLowerCase();

    const status =
      lowerMessage.includes("signature") ||
      lowerMessage.includes("timestamp")
        ? 401
        : lowerMessage.includes(
              "missing revolut webhook body",
            ) ||
            lowerMessage.includes(
              "did not contain a subscription id",
            )
          ? 400
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