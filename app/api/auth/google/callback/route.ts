import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getAppUrl() {
  return cleanText(process.env.NEXT_PUBLIC_APP_URL) || 'https://fromone.co.uk';
}

function signState(payload: string) {
  const secret =
    cleanText(process.env.GOOGLE_CLIENT_SECRET) ||
    cleanText(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!secret) {
    throw new Error('Google state secret is missing.');
  }

  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function parseAndVerifyState(state: string) {
  const [payload, signature] = state.split('.');

  if (!payload || !signature) {
    throw new Error('Invalid Google connection state.');
  }

  const expectedSignature = signState(payload);

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  ) {
    throw new Error('Google connection state could not be verified.');
  }

  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

  if (!parsed?.userId) {
    throw new Error('Google connection state is missing the user.');
  }

  return {
    userId: cleanText(parsed.userId),
    returnTo: cleanText(parsed.returnTo) || '/settings',
  };
}

async function exchangeCodeForTokens(code: string) {
  const clientId = cleanText(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanText(process.env.GOOGLE_CLIENT_SECRET);
  const redirectUri = cleanText(process.env.GOOGLE_REDIRECT_URI);

  const params = new URLSearchParams();

  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);
  params.set('redirect_uri', redirectUri);
  params.set('grant_type', 'authorization_code');
  params.set('code', code);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error_description || result?.error || 'Could not exchange Google code.');
  }

  const expiresInSeconds = Number(result.expires_in || 0);

  return {
    accessToken: cleanText(result.access_token),
    refreshToken: cleanText(result.refresh_token),
    tokenType: cleanText(result.token_type) || 'Bearer',
    expiresAt:
      expiresInSeconds > 0
        ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
        : null,
    scope: cleanText(result.scope),
  };
}

async function getGoogleUser(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    return null;
  }

  return result;
}

async function listBusinessAccounts(accessToken: string) {
  const response = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('Google Business accounts load error:', result);
    return [];
  }

  return Array.isArray(result?.accounts) ? result.accounts : [];
}

export async function GET(request: NextRequest) {
  try {
    const error = cleanText(request.nextUrl.searchParams.get('error'));
    const errorDescription = cleanText(request.nextUrl.searchParams.get('error_description'));

    if (error) {
      throw new Error(errorDescription || error);
    }

    const code = cleanText(request.nextUrl.searchParams.get('code'));
    const state = cleanText(request.nextUrl.searchParams.get('state'));

    if (!code || !state) {
      throw new Error('Missing Google authorization code or state.');
    }

    const verifiedState = parseAndVerifyState(state);
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.accessToken) {
      throw new Error('Google did not return an access token.');
    }

    const googleUser = await getGoogleUser(tokens.accessToken);
    const businessAccounts = await listBusinessAccounts(tokens.accessToken);
    const firstAccount = businessAccounts[0] || null;

    const supabase = getSupabaseAdmin();

    const connection = {
      user_id: verifiedState.userId,
      provider: 'google',

      provider_user_id: cleanText(googleUser?.id || googleUser?.email),
      provider_user_name: cleanText(googleUser?.name || googleUser?.email),

      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || null,
      token_type: tokens.tokenType,
      expires_at: tokens.expiresAt,

      google_account_id: cleanText(firstAccount?.name) || null,
      google_account_name: cleanText(firstAccount?.accountName || firstAccount?.name) || null,

      scopes: tokens.scope ? tokens.scope.split(' ').filter(Boolean) : ['https://www.googleapis.com/auth/business.manage'],
      status: 'connected',
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('social_connections')
      .upsert(connection, {
        onConflict: 'user_id,provider',
      });

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    const redirectUrl = new URL(verifiedState.returnTo, getAppUrl());
    redirectUrl.searchParams.set('google_connected', 'true');

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    const redirectUrl = new URL('/settings', getAppUrl());

    redirectUrl.searchParams.set('google_connected', 'false');
    redirectUrl.searchParams.set('google_error', error?.message || 'Google connection failed.');

    return NextResponse.redirect(redirectUrl);
  }
}