import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
const paypalEnvironment = String(process.env.PAYPAL_ENVIRONMENT || 'live').toLowerCase();
const setupSecret = process.env.PAYPAL_SETUP_SECRET || '';

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getPayPalBaseUrl() {
  return paypalEnvironment === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

function isAuthorized(request: NextRequest) {
  const providedSecret =
    cleanText(request.headers.get('x-paypal-setup-secret')) ||
    cleanText(request.nextUrl.searchParams.get('secret'));

  return Boolean(setupSecret && providedSecret && providedSecret === setupSecret);
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

async function createPayPalProduct(accessToken: string) {
  const response = await fetch(`${getPayPalBaseUrl()}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      name: 'FromOne',
      description: 'FromOne weekly social media content workflow for small businesses.',
      type: 'SERVICE',
      category: 'SOFTWARE',
      home_url: 'https://www.fromone.co.uk',
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || result?.name || 'Could not create PayPal product.');
  }

  const productId = cleanText(result?.id);

  if (!productId) {
    throw new Error('PayPal did not return a product ID.');
  }

  return {
    productId,
    product: result,
  };
}

async function createPayPalMonthlyPlan({
  accessToken,
  productId,
}: {
  accessToken: string;
  productId: string;
}) {
  const response = await fetch(`${getPayPalBaseUrl()}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      product_id: productId,
      name: 'FromOne Monthly',
      description: 'Monthly FromOne access for weekly social media content creation.',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: '29.99',
              currency_code: 'GBP',
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
      taxes: {
        percentage: '0',
        inclusive: false,
      },
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || result?.name || 'Could not create PayPal plan.');
  }

  const planId = cleanText(result?.id);

  if (!planId) {
    throw new Error('PayPal did not return a plan ID.');
  }

  return {
    planId,
    plan: result,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Unauthorized. Set PAYPAL_SETUP_SECRET in Render and send it as x-paypal-setup-secret.',
        },
        { status: 401 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    const productResult = await createPayPalProduct(accessToken);

    const planResult = await createPayPalMonthlyPlan({
      accessToken,
      productId: productResult.productId,
    });

    return NextResponse.json({
      ok: true,
      environment: paypalEnvironment,
      product_id: productResult.productId,
      plan_id: planResult.planId,
      next_render_env_var: `PAYPAL_PLAN_ID=${planResult.planId}`,
    });
  } catch (error: any) {
    console.error('Create PayPal monthly plan error:', error?.message || error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Could not create PayPal product and plan.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/paypal/create-monthly-plan',
    method: 'POST',
    purpose: 'Creates the FromOne PayPal product and £29.99 monthly plan once.',
    required_env_vars: [
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'PAYPAL_ENVIRONMENT',
      'PAYPAL_SETUP_SECRET',
    ],
  });
}
