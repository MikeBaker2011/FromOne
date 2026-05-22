import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
const paypalEnvironment = String(process.env.PAYPAL_ENVIRONMENT || 'live').toLowerCase();

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getPayPalBaseUrl() {
  return paypalEnvironment === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
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
    throw new Error('Please sign in before cancelling your subscription.');
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

async function loadBillingForUser(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data: billing, error: billingError } = await supabase
    .from('user_billing')
    .select('plan, status, paypal_subscription_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (billingError) {
    throw billingError;
  }

  const { data: access, error: accessError } = await supabase
    .from('user_access')
    .select('subscription_reference')
    .eq('user_id', userId)
    .maybeSingle();

  if (accessError) {
    throw accessError;
  }

  return {
    ...billing,
    access_subscription_reference: access?.subscription_reference || null,
  };
}

function getValidPayPalSubscriptionId(...values: Array<unknown>) {
  for (const value of values) {
    const candidate = cleanText(value);

    if (candidate.toUpperCase().startsWith('I-')) {
      return candidate;
    }
  }

  return '';
}

async function cancelPayPalSubscription({
  accessToken,
  paypalSubscriptionId,
}: {
  accessToken: string;
  paypalSubscriptionId: string;
}) {
  const response = await fetch(
    `${getPayPalBaseUrl()}/v1/billing/subscriptions/${encodeURIComponent(
      paypalSubscriptionId,
    )}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Customer cancelled FromOne Starter subscription.',
      }),
    },
  );

  if (response.status === 204) {
    return;
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.name ||
        'PayPal cancellation failed. Please try again or contact support.',
    );
  }
}

async function markSubscriptionCancelled({
  userId,
  paypalSubscriptionId,
}: {
  userId: string;
  paypalSubscriptionId: string;
}) {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { error: billingError } = await supabase
    .from('user_billing')
    .update({
      plan: 'starter',
      status: 'cancelled',
      paypal_subscription_id: paypalSubscriptionId,
      cancelled_at: nowIso,
      updated_at: nowIso,
    })
    .eq('user_id', userId);

  if (billingError) {
    throw billingError;
  }

  const { error: accessError } = await supabase
    .from('user_access')
    .upsert(
      {
        user_id: userId,
        access_status: 'cancelled',
        subscription_status: 'cancelled',
        subscription_provider: 'paypal',
        subscription_reference: paypalSubscriptionId,
        updated_at: nowIso,
      },
      {
        onConflict: 'user_id',
      },
    );

  if (accessError) {
    throw accessError;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSignedInUser(request);
    const body = await request.json().catch(() => null);
    const requestedSubscriptionId = cleanText(body?.paypalSubscriptionId);

    const billing = await loadBillingForUser(user.id);
    const billingSubscriptionId = cleanText(billing?.paypal_subscription_id);
    const accessSubscriptionId = cleanText(billing?.access_subscription_reference);
    const paypalSubscriptionId = getValidPayPalSubscriptionId(
      requestedSubscriptionId,
      billingSubscriptionId,
      accessSubscriptionId,
    );

    if (!billing) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No billing record found for this account.',
        },
        { status: 404 },
      );
    }

    if (billing.status !== 'active' || billing.plan !== 'starter') {
      return NextResponse.json(
        {
          ok: false,
          error: 'There is no active Starter subscription to cancel.',
        },
        { status: 409 },
      );
    }

    if (!paypalSubscriptionId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No PayPal subscription reference found for this account.',
        },
        { status: 409 },
      );
    }

    if (
      requestedSubscriptionId &&
      getValidPayPalSubscriptionId(requestedSubscriptionId) !== paypalSubscriptionId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'PayPal subscription reference does not match this account.',
        },
        { status: 403 },
      );
    }

    const accessToken = await getPayPalAccessToken();

    await cancelPayPalSubscription({
      accessToken,
      paypalSubscriptionId,
    });

    await markSubscriptionCancelled({
      userId: user.id,
      paypalSubscriptionId,
    });

    return NextResponse.json({
      ok: true,
      status: 'cancelled',
      paypal_subscription_id: paypalSubscriptionId,
    });
  } catch (error: any) {
    const message = error?.message || 'Could not cancel PayPal subscription.';

    console.error('Cancel PayPal subscription error:', message);

    const status =
      message.includes('sign in') || message.includes('auth token')
        ? 401
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