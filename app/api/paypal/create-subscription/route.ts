import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
const paypalPlanId = process.env.PAYPAL_PLAN_ID || '';
const paypalEnvironment = String(process.env.PAYPAL_ENVIRONMENT || 'live').toLowerCase();

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getPayPalBaseUrl() {
  return paypalEnvironment === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

function getSiteBaseUrl(request: NextRequest) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://fromone.co.uk';

  const host = request.headers.get('host') || '';

  if (host.includes('localhost')) {
    return `http://${host}`;
  }

  return configuredUrl.replace(/\/$/, '');
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return '';
  }

  return authHeader.slice('bearer '.length).trim();
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase server environment variables.');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}


async function getExistingBilling(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('user_billing')
    .select('plan, status, paypal_subscription_id, trial_ends_at, manual_access_until')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function hasActiveTrial(billing: any) {
  if (!billing?.trial_ends_at) return false;

  const trialEndsAt = new Date(billing.trial_ends_at);

  return (
    billing.plan === 'demo' &&
    billing.status === 'trialing' &&
    trialEndsAt.getTime() > Date.now()
  );
}

function hasManualAccess(billing: any) {
  if (!billing?.manual_access_until) return false;

  const manualAccessUntil = new Date(billing.manual_access_until);

  return billing.status === 'manual' && manualAccessUntil.getTime() > Date.now();
}

function validateCanCreateSubscription(billing: any) {
  if (!billing) return;

  const plan = String(billing.plan || 'demo');
  const status = String(billing.status || 'trialing');
  const hasPayPalSubscription = Boolean(cleanText(billing.paypal_subscription_id));

  if ((plan === 'starter' || plan === 'pro') && status === 'active' && hasPayPalSubscription) {
    throw new Error('You already have an active Starter subscription.');
  }

  if (status === 'pending_payment' && hasPayPalSubscription) {
    throw new Error(
      'You already have a pending PayPal checkout. Complete it or cancel the pending payment first.'
    );
  }

  if (hasManualAccess(billing)) {
    throw new Error('Manual account access is currently active. Contact support before changing billing.');
  }

  // Active trial users can start checkout. PayPal confirmation still controls paid access.
  if (hasActiveTrial(billing)) return;
}

async function getSignedInUser(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public environment variables.');
  }

  const token = getBearerToken(request);

  if (!token) {
    throw new Error('Missing auth token. Please sign in again.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error('Please sign in before starting PayPal checkout.');
  }

  return data.user;
}

async function getPayPalAccessToken() {
  if (!paypalClientId || !paypalClientSecret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET.');
  }

  const credentials = Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64');

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error_description || result?.error || 'Could not get PayPal token.');
  }

  const accessToken = cleanText(result?.access_token);

  if (!accessToken) {
    throw new Error('PayPal did not return an access token.');
  }

  return accessToken;
}

function getApproveLink(paypalResult: any) {
  const links = Array.isArray(paypalResult?.links) ? paypalResult.links : [];

  const approveLink =
    links.find((link: any) => String(link?.rel || '').toLowerCase() === 'approve') ||
    links.find((link: any) => String(link?.rel || '').toLowerCase() === 'payer-action');

  return cleanText(approveLink?.href);
}

async function createPayPalSubscription({
  accessToken,
  userId,
  userEmail,
  siteBaseUrl,
}: {
  accessToken: string;
  userId: string;
  userEmail: string;
  siteBaseUrl: string;
}) {
  if (!paypalPlanId) {
    throw new Error('Missing PAYPAL_PLAN_ID.');
  }

  const response = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      plan_id: paypalPlanId,
      custom_id: userId,
      application_context: {
        brand_name: 'FromOne',
        locale: 'en-GB',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${siteBaseUrl}/subscription?paypal=approved`,
        cancel_url: `${siteBaseUrl}/subscription?paypal=cancelled`,
      },
      subscriber: userEmail
        ? {
            email_address: userEmail,
          }
        : undefined,
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || result?.name || 'Could not create PayPal subscription.');
  }

  const subscriptionId = cleanText(result?.id);
  const approveUrl = getApproveLink(result);

  if (!subscriptionId) {
    throw new Error('PayPal did not return a subscription ID.');
  }

  if (!approveUrl) {
    throw new Error('PayPal did not return an approval URL.');
  }

  return {
    subscriptionId,
    approveUrl,
  };
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

  const { error: billingError } = await supabase.from('user_billing').upsert(
    {
      user_id: userId,
      plan: 'starter',
      status: 'pending_payment',
      paypal_subscription_id: subscriptionId,
      cancelled_at: null,
      updated_at: nowIso,
    },
    {
      onConflict: 'user_id',
    }
  );

  if (billingError) {
    throw billingError;
  }

  const { error: accessError } = await supabase.from('user_access').upsert(
    {
      user_id: userId,
      access_status: 'pending_payment',
      subscription_status: 'pending_payment',
      updated_at: nowIso,
    },
    {
      onConflict: 'user_id',
    }
  );

  if (accessError) {
    throw accessError;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSignedInUser(request);
    const userId = user.id;
    const userEmail = cleanText(user.email);
    const siteBaseUrl = getSiteBaseUrl(request);

    const existingBilling = await getExistingBilling(userId);
    validateCanCreateSubscription(existingBilling);

    const accessToken = await getPayPalAccessToken();

    const subscription = await createPayPalSubscription({
      accessToken,
      userId,
      userEmail,
      siteBaseUrl,
    });

    await savePendingSubscription({
      userId,
      subscriptionId: subscription.subscriptionId,
    });

    return NextResponse.json({
      ok: true,
      environment: paypalEnvironment,
      subscription_id: subscription.subscriptionId,
      approve_url: subscription.approveUrl,
    });
  } catch (error: any) {
    const message = error?.message || 'Could not create PayPal subscription.';

    console.error('Create PayPal subscription error:', message);

    const status =
      message.includes('sign in') || message.includes('auth token')
        ? 401
        : message.includes('already have')
          ? 409
          : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status }
    );
  }
}
