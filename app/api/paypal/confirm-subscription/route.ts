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
    throw new Error('Please sign in before confirming PayPal checkout.');
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

async function getBillingForUser(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('user_billing')
    .select('plan, status, paypal_subscription_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getPayPalSubscription({
  accessToken,
  paypalSubscriptionId,
}: {
  accessToken: string;
  paypalSubscriptionId: string;
}) {
  const response = await fetch(
    `${getPayPalBaseUrl()}/v1/billing/subscriptions/${encodeURIComponent(
      paypalSubscriptionId,
    )}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.name ||
        'Could not confirm PayPal subscription status.'
    );
  }

  return result;
}

async function upsertActiveAccess({
  userId,
  paypalSubscriptionId,
}: {
  userId: string;
  paypalSubscriptionId: string;
}) {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const accessPayload = {
    user_id: userId,
    access_status: 'active',
    subscription_status: 'active',
    subscription_provider: 'paypal',
    subscription_reference: paypalSubscriptionId,
    updated_at: nowIso,
  };

  const { data: existingAccess, error: lookupError } = await supabase
    .from('user_access')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existingAccess?.user_id) {
    const { error: updateError } = await supabase
      .from('user_access')
      .update(accessPayload)
      .eq('user_id', userId);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: insertError } = await supabase
    .from('user_access')
    .insert({
      ...accessPayload,
      created_at: nowIso,
    });

  if (insertError) {
    throw insertError;
  }
}

async function markActiveSubscription({
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
    .upsert(
      {
        user_id: userId,
        plan: 'starter',
        status: 'active',
        paypal_subscription_id: paypalSubscriptionId,
        cancelled_at: null,
        updated_at: nowIso,
      },
      {
        onConflict: 'user_id',
      },
    );

  if (billingError) {
    throw billingError;
  }

  await upsertActiveAccess({
    userId,
    paypalSubscriptionId,
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSignedInUser(request);
    const billing = await getBillingForUser(user.id);
    const paypalSubscriptionId = cleanText(billing?.paypal_subscription_id);

    if (!billing) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No billing record found for this account.',
        },
        { status: 404 },
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

    const accessToken = await getPayPalAccessToken();

    const paypalSubscription = await getPayPalSubscription({
      accessToken,
      paypalSubscriptionId,
    });

    const paypalStatus = cleanText(paypalSubscription?.status).toUpperCase();

    if (paypalStatus === 'ACTIVE') {
      await markActiveSubscription({
        userId: user.id,
        paypalSubscriptionId,
      });

      return NextResponse.json({
        ok: true,
        status: 'active',
        paypal_status: paypalStatus,
        paypal_subscription_id: paypalSubscriptionId,
      });
    }

    return NextResponse.json({
      ok: true,
      status: 'pending_payment',
      paypal_status: paypalStatus || 'UNKNOWN',
      paypal_subscription_id: paypalSubscriptionId,
    });
  } catch (error: any) {
    const message = error?.message || 'Could not confirm PayPal subscription.';

    console.error('Confirm PayPal subscription error:', message);

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