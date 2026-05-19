import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource_type?: string;
  summary?: string;
  resource?: Record<string, any>;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID || '';
const paypalEnvironment = String(process.env.PAYPAL_ENVIRONMENT || 'live').toLowerCase();

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

function getPayPalBaseUrl() {
  return paypalEnvironment === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getHeader(request: NextRequest, name: string) {
  return cleanText(request.headers.get(name));
}

async function getPayPalAccessToken() {
  if (!paypalClientId || !paypalClientSecret) {
    throw new Error('Missing PayPal API credentials.');
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

async function verifyPayPalWebhook({
  request,
  event,
}: {
  request: NextRequest;
  event: PayPalWebhookEvent;
}) {
  if (!paypalWebhookId) {
    throw new Error('Missing PAYPAL_WEBHOOK_ID.');
  }

  const accessToken = await getPayPalAccessToken();

  const payload = {
    auth_algo: getHeader(request, 'paypal-auth-algo'),
    cert_url: getHeader(request, 'paypal-cert-url'),
    transmission_id: getHeader(request, 'paypal-transmission-id'),
    transmission_sig: getHeader(request, 'paypal-transmission-sig'),
    transmission_time: getHeader(request, 'paypal-transmission-time'),
    webhook_id: paypalWebhookId,
    webhook_event: event,
  };

  const response = await fetch(
    `${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || result?.name || 'PayPal webhook signature verification failed.'
    );
  }

  const verificationStatus = cleanText(result?.verification_status).toUpperCase();

  if (verificationStatus !== 'SUCCESS') {
    throw new Error(`Invalid PayPal webhook signature: ${verificationStatus || 'unknown'}.`);
  }

  return true;
}

function getSubscriptionId(event: PayPalWebhookEvent) {
  const resource = event.resource || {};

  return cleanText(
    resource.id ||
      resource.billing_agreement_id ||
      resource.subscription_id ||
      resource.parent_payment ||
      resource.supplementary_data?.related_ids?.subscription_id ||
      resource.supplementary_data?.related_ids?.billing_agreement_id
  );
}

function getCustomUserId(event: PayPalWebhookEvent) {
  const resource = event.resource || {};

  return cleanText(
    resource.custom_id ||
      resource.customId ||
      resource.custom ||
      resource.purchase_units?.[0]?.custom_id ||
      resource.supplementary_data?.custom_id
  );
}

function getSubscriberEmail(event: PayPalWebhookEvent) {
  const resource = event.resource || {};

  return cleanText(
    resource.subscriber?.email_address ||
      resource.payer?.email_address ||
      resource.billing_info?.subscriber?.email_address
  ).toLowerCase();
}

function mapEventToBillingStatus(eventType: string, resourceStatus?: string | null) {
  const cleanEventType = eventType.toUpperCase();
  const cleanResourceStatus = cleanText(resourceStatus).toUpperCase();

  if (
    cleanEventType === 'BILLING.SUBSCRIPTION.ACTIVATED' ||
    cleanEventType === 'BILLING.SUBSCRIPTION.RE-ACTIVATED' ||
    cleanEventType === 'PAYMENT.SALE.COMPLETED' ||
    cleanEventType === 'PAYMENT.CAPTURE.COMPLETED'
  ) {
    return 'active';
  }

  if (
    cleanEventType === 'BILLING.SUBSCRIPTION.CANCELLED' ||
    cleanEventType === 'BILLING.SUBSCRIPTION.EXPIRED'
  ) {
    return 'cancelled';
  }

  if (
    cleanEventType === 'BILLING.SUBSCRIPTION.SUSPENDED' ||
    cleanResourceStatus === 'SUSPENDED'
  ) {
    return 'suspended';
  }

  if (
    cleanEventType === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED' ||
    cleanEventType === 'PAYMENT.SALE.DENIED' ||
    cleanEventType === 'PAYMENT.CAPTURE.DENIED'
  ) {
    return 'past_due';
  }

  return null;
}

async function findUserIdForWebhook({
  supabase,
  event,
  subscriptionId,
}: {
  supabase: any;
  event: PayPalWebhookEvent;
  subscriptionId: string;
}) {
  const customUserId = getCustomUserId(event);

  if (customUserId) {
    return customUserId;
  }

  if (subscriptionId) {
    const { data: billing } = await supabase
      .from('user_billing')
      .select('user_id')
      .eq('paypal_subscription_id', subscriptionId)
      .maybeSingle();

    if (billing?.user_id) {
      return cleanText(billing.user_id);
    }
  }

  return '';
}

async function updateAccessForSubscription({
  event,
  billingStatus,
  subscriptionId,
}: {
  event: PayPalWebhookEvent;
  billingStatus: string;
  subscriptionId: string;
}) {
  const supabase = getSupabaseAdmin();

  const userId = await findUserIdForWebhook({
    supabase,
    event,
    subscriptionId,
  });

  if (!userId) {
    console.warn('PayPal webhook could not be linked to a FromOne user.', {
      eventId: event.id,
      eventType: event.event_type,
      subscriptionId,
      subscriberEmail: getSubscriberEmail(event),
    });

    return {
      linked: false,
      userId: null,
    };
  }

  const nowIso = new Date().toISOString();
  const cancelledAt = ['cancelled', 'suspended'].includes(billingStatus) ? nowIso : null;

  const billingUpdates: Record<string, any> = {
    user_id: userId,
    plan: 'starter',
    status: billingStatus,
    paypal_subscription_id: subscriptionId || null,
    updated_at: nowIso,
  };

  if (cancelledAt) {
    billingUpdates.cancelled_at = cancelledAt;
  }

  const { error: billingError } = await supabase
    .from('user_billing')
    .upsert(billingUpdates, {
      onConflict: 'user_id',
    });

  if (billingError) {
    throw billingError;
  }

  const accessStatus = billingStatus === 'active' ? 'active' : 'locked';

  const { error: accessError } = await supabase
    .from('user_access')
    .upsert(
      {
        user_id: userId,
        access_status: accessStatus,
        subscription_status: billingStatus,
        updated_at: nowIso,
      },
      {
        onConflict: 'user_id',
      }
    );

  if (accessError) {
    throw accessError;
  }

  return {
    linked: true,
    userId,
  };
}

export async function POST(request: NextRequest) {
  let event: PayPalWebhookEvent | null = null;

  try {
    event = (await request.json()) as PayPalWebhookEvent;

    if (!event?.event_type) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing PayPal event type.',
        },
        { status: 400 }
      );
    }

    await verifyPayPalWebhook({
      request,
      event,
    });

    const eventType = cleanText(event.event_type);
    const resourceStatus = cleanText(event.resource?.status);
    const billingStatus = mapEventToBillingStatus(eventType, resourceStatus);
    const subscriptionId = getSubscriptionId(event);

    if (!billingStatus) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        eventType,
        reason: 'Event does not update subscription access.',
      });
    }

    const result = await updateAccessForSubscription({
      event,
      billingStatus,
      subscriptionId,
    });

    return NextResponse.json({
      ok: true,
      eventType,
      billingStatus,
      subscriptionId: subscriptionId || null,
      linked: result.linked,
      userId: result.userId,
    });
  } catch (error: any) {
    console.error('PayPal webhook error:', error?.message || error, {
      eventId: event?.id,
      eventType: event?.event_type,
    });

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'PayPal webhook failed.',
      },
      { status: 400 }
    );
  }
}
