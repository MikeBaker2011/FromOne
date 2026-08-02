import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVOLUT_API_VERSION = "2026-04-20";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "587");
const smtpSecure =
  String(process.env.SMTP_SECURE || "").trim().toLowerCase() === "true";
const smtpUser = process.env.SMTP_USER || "";
const smtpPassword = process.env.SMTP_PASSWORD || "";
const emailFrom =
  process.env.EMAIL_FROM ||
  process.env.FROM_EMAIL ||
  (smtpUser ? `FromOne <${smtpUser}>` : "FromOne");
const subscriptionNotificationEmail = "subscription@uksmilez.co.uk";
const fromOneLogoUrl =
  process.env.FROMONE_EMAIL_LOGO_URL ||
  process.env.EMAIL_LOGO_URL ||
  "https://fromone.co.uk/fromone-logo.png";

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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatActivationDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
    timeZoneName: "short",
  }).format(value);
}

function getEmailErrorMessage(error: unknown) {
  if (!error) return "Unknown email error";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown email error";
  }
}

async function sendSmtpEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!smtpHost || !smtpUser || !smtpPassword) {
    return {
      sent: false,
      error: "SMTP_HOST, SMTP_USER or SMTP_PASSWORD is missing in FromOne.",
    };
  }

  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    return {
      sent: false,
      error: "SMTP_PORT is invalid in FromOne.",
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

    return {
      sent: true,
      error: null,
      messageId: cleanText(result.messageId) || null,
    };
  } catch (error) {
    return {
      sent: false,
      error: getEmailErrorMessage(error),
      messageId: null,
    };
  }
}

async function getBusinessName(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("business_profiles")
    .select("business_name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Subscription confirmed, but business name lookup failed:",
      error.message,
    );
    return "";
  }

  return cleanText(data?.business_name);
}

function buildCustomerEmail({
  customerEmail,
  businessName,
  subscriptionId,
  activatedAt,
}: {
  customerEmail: string;
  businessName: string;
  subscriptionId: string;
  activatedAt: Date;
}) {
  const subject = "Your FromOne Starter subscription is active";
  const safeBusinessName = escapeHtml(businessName || "your business");
  const safeSubscriptionId = escapeHtml(subscriptionId);
  const safeActivationDate = escapeHtml(formatActivationDate(activatedAt));

  const logoMarkup = fromOneLogoUrl
    ? `<img src="${escapeHtml(fromOneLogoUrl)}" width="170" alt="FromOne" style="display:block;width:170px;max-width:100%;height:auto;margin:0 auto;border:0;" />`
    : `<strong style="display:inline-block;color:#071b49;font-size:28px;letter-spacing:-0.04em;">FromOne</strong>`;

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#071b49;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fb;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #dfe5f1;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(7,27,73,0.10);">
                <tr>
                  <td style="padding:24px 28px;border-bottom:1px solid #edf1f7;text-align:center;">
                    ${logoMarkup}
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px 30px 18px;text-align:center;">
                    <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#fff1f7;color:#f72585;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Starter active</div>
                    <h1 style="margin:18px 0 10px;color:#071b49;font-size:32px;line-height:1.15;letter-spacing:-0.04em;">Your subscription is ready</h1>
                    <p style="margin:0;color:#5f6f89;font-size:17px;line-height:1.65;">Your FromOne Starter subscription for <strong style="color:#071b49;">${safeBusinessName}</strong> has been confirmed.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8faff;border:1px solid #dfe6f1;border-radius:18px;">
                      <tr><td style="padding:12px 22px;border-bottom:1px solid #e5eaf2;color:#64748b;">Plan</td><td align="right" style="padding:12px 22px;border-bottom:1px solid #e5eaf2;font-weight:800;">Starter</td></tr>
                      <tr><td style="padding:12px 22px;border-bottom:1px solid #e5eaf2;color:#64748b;">Price</td><td align="right" style="padding:12px 22px;border-bottom:1px solid #e5eaf2;font-weight:800;">£49.99 per month</td></tr>
                      <tr><td style="padding:12px 22px;border-bottom:1px solid #e5eaf2;color:#64748b;">Provider</td><td align="right" style="padding:12px 22px;border-bottom:1px solid #e5eaf2;font-weight:800;">Revolut</td></tr>
                      <tr><td style="padding:12px 22px;border-bottom:1px solid #e5eaf2;color:#64748b;">Activated</td><td align="right" style="padding:12px 22px;border-bottom:1px solid #e5eaf2;font-weight:800;">${safeActivationDate}</td></tr>
                      <tr><td style="padding:12px 22px;color:#64748b;">Reference</td><td align="right" style="padding:12px 22px;font-weight:800;">${safeSubscriptionId}</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 30px 30px;">
                    <div style="padding:18px 20px;border-radius:16px;background:#fff7fb;border:1px solid #ffd6e8;">
                      <p style="margin:0;color:#34425c;font-size:14px;line-height:1.65;">You can now use FromOne Starter features, including post creation, Smilez workflows and supported social publishing.</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 30px;background:#071b49;text-align:center;">
                    <p style="margin:0 0 7px;color:#ffffff;font-size:15px;font-weight:800;">FromOne</p>
                    <p style="margin:0;color:#cbd5e1;font-size:12px;line-height:1.6;">One workflow for your posts and Smilez presence.</p>
                    <p style="margin:12px 0 0;color:#94a3b8;font-size:11px;line-height:1.5;">Sent to ${escapeHtml(customerEmail)} as an automated subscription confirmation.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, html };
}

function buildInternalEmail({
  customerEmail,
  businessName,
  userId,
  subscriptionId,
  activatedAt,
}: {
  customerEmail: string;
  businessName: string;
  userId: string;
  subscriptionId: string;
  activatedAt: Date;
}) {
  const subject = `New FromOne Starter subscription — ${
    businessName || customerEmail
  }`;
  const safeBusinessName = escapeHtml(businessName || "Not set");
  const safeCustomerEmail = escapeHtml(customerEmail);
  const safeUserId = escapeHtml(userId);
  const safeSubscriptionId = escapeHtml(subscriptionId);
  const safeActivationDate = escapeHtml(formatActivationDate(activatedAt));

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#071b49;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fb;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#ffffff;border:1px solid #dfe5f1;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(7,27,73,0.10);">
                <tr>
                  <td style="padding:24px 28px;border-bottom:1px solid #edf1f7;text-align:center;">
                    <img
                      src="${escapeHtml(fromOneLogoUrl)}"
                      width="170"
                      alt="FromOne"
                      style="display:block;width:170px;max-width:100%;height:auto;margin:0 auto;border:0;"
                    />
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px 30px 18px;text-align:center;">
                    <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#fff1f7;color:#f72585;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">
                      New subscription
                    </div>
                    <h1 style="margin:18px 0 10px;color:#071b49;font-size:32px;line-height:1.15;letter-spacing:-0.04em;">
                      FromOne Starter activated
                    </h1>
                    <p style="margin:0;color:#5f6f89;font-size:17px;line-height:1.65;">
                      A customer subscription has been confirmed by Revolut.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8faff;border:1px solid #dfe6f1;border-radius:18px;">
                      <tr><td style="padding:12px 18px;border-bottom:1px solid #e5eaf2;color:#64748b;">Business</td><td align="right" style="padding:12px 18px;border-bottom:1px solid #e5eaf2;font-weight:800;">${safeBusinessName}</td></tr>
                      <tr><td style="padding:12px 18px;border-bottom:1px solid #e5eaf2;color:#64748b;">Customer email</td><td align="right" style="padding:12px 18px;border-bottom:1px solid #e5eaf2;font-weight:800;">${safeCustomerEmail}</td></tr>
                      <tr><td style="padding:12px 18px;border-bottom:1px solid #e5eaf2;color:#64748b;">Plan</td><td align="right" style="padding:12px 18px;border-bottom:1px solid #e5eaf2;font-weight:800;">Starter — £49.99/month</td></tr>
                      <tr><td style="padding:12px 18px;border-bottom:1px solid #e5eaf2;color:#64748b;">Provider</td><td align="right" style="padding:12px 18px;border-bottom:1px solid #e5eaf2;font-weight:800;">Revolut</td></tr>
                      <tr><td style="padding:12px 18px;border-bottom:1px solid #e5eaf2;color:#64748b;">Activated</td><td align="right" style="padding:12px 18px;border-bottom:1px solid #e5eaf2;font-weight:800;">${safeActivationDate}</td></tr>
                      <tr><td style="padding:12px 18px;border-bottom:1px solid #e5eaf2;color:#64748b;">Reference</td><td align="right" style="padding:12px 18px;border-bottom:1px solid #e5eaf2;font-weight:800;">${safeSubscriptionId}</td></tr>
                      <tr><td style="padding:12px 18px;color:#64748b;">User ID</td><td align="right" style="padding:12px 18px;font-weight:800;">${safeUserId}</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 30px 30px;">
                    <div style="padding:18px 20px;border-radius:16px;background:#fff7fb;border:1px solid #ffd6e8;">
                      <p style="margin:0;color:#34425c;font-size:14px;line-height:1.65;">
                        This internal notification confirms that paid Starter access was activated successfully.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 30px;background:#071b49;text-align:center;">
                    <p style="margin:0 0 7px;color:#ffffff;font-size:15px;font-weight:800;">FromOne</p>
                    <p style="margin:0;color:#cbd5e1;font-size:12px;line-height:1.6;">
                      Subscription notification for subscription@uksmilez.co.uk
                    </p>
                    <p style="margin:12px 0 0;color:#94a3b8;font-size:11px;line-height:1.5;">
                      This is an automated internal subscription notification.
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

  return { subject, html };
}

async function sendSubscriptionActivationEmails({
  customerEmail,
  businessName,
  userId,
  subscriptionId,
  activatedAt,
}: {
  customerEmail: string;
  businessName: string;
  userId: string;
  subscriptionId: string;
  activatedAt: Date;
}) {
  const customerMessage = buildCustomerEmail({
    customerEmail,
    businessName,
    subscriptionId,
    activatedAt,
  });
  const internalMessage = buildInternalEmail({
    customerEmail,
    businessName,
    userId,
    subscriptionId,
    activatedAt,
  });

  const [customerResult, internalResult] = await Promise.all([
    sendSmtpEmail({
      to: customerEmail,
      subject: customerMessage.subject,
      html: customerMessage.html,
    }),
    sendSmtpEmail({
      to: subscriptionNotificationEmail,
      subject: internalMessage.subject,
      html: internalMessage.html,
    }),
  ]);

  if (!customerResult.sent) {
    console.error("Subscription activated, but customer email failed:", {
      customerEmail,
      subscriptionId,
      error: customerResult.error,
    });
  }

  if (!internalResult.sent) {
    console.error("Subscription activated, but internal notification failed:", {
      recipient: subscriptionNotificationEmail,
      subscriptionId,
      error: internalResult.error,
    });
  }

  return {
    customerEmailSent: customerResult.sent,
    internalEmailSent: internalResult.sent,
  };
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

    const wasAlreadyActive =
      cleanText(access.access_status).toLowerCase() === "active" &&
      cleanText(access.subscription_status).toLowerCase() === "active";

    const mappedStatus =
      await saveConfirmedState({
        userId: user.id,
        subscriptionId,
        revolutState,
      });

    let customerEmailSent = false;
    let internalEmailSent = false;
    let activationEmailsAttempted = false;

    if (revolutState === "active" && !wasAlreadyActive) {
      activationEmailsAttempted = true;

      const customerEmail = cleanText(user.email).toLowerCase();

      if (!customerEmail) {
        console.error(
          "Subscription activated, but the signed-in user has no email address:",
          {
            userId: user.id,
            subscriptionId,
          },
        );
      } else {
        const businessName = await getBusinessName(user.id);

        const emailResults = await sendSubscriptionActivationEmails({
          customerEmail,
          businessName,
          userId: user.id,
          subscriptionId,
          activatedAt: new Date(),
        });

        customerEmailSent = emailResults.customerEmailSent;
        internalEmailSent = emailResults.internalEmailSent;
      }
    }

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
      activation_emails_attempted:
        activationEmailsAttempted,
      customer_email_sent:
        customerEmailSent,
      internal_notification_sent:
        internalEmailSent,
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