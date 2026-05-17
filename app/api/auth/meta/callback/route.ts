import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

type MetaPage = {
  id?: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: {
    id?: string;
    name?: string;
    username?: string;
  };
};

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

function signState(payload: string) {
  const secret = cleanText(process.env.META_APP_SECRET);

  if (!secret) {
    throw new Error('META_APP_SECRET is missing.');
  }

  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function parseAndVerifyState(state: string) {
  const [payload, signature] = state.split('.');

  if (!payload || !signature) {
    throw new Error('Invalid Meta connection state.');
  }

  const expectedSignature = signState(payload);

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  ) {
    throw new Error('Meta connection state could not be verified.');
  }

  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

  if (!parsed?.userId) {
    throw new Error('Meta connection state is missing the user.');
  }

  return {
    userId: cleanText(parsed.userId),
    returnTo: cleanText(parsed.returnTo) || '/posts',
  };
}

async function exchangeCodeForShortLivedToken(code: string) {
  const appId = cleanText(process.env.META_APP_ID);
  const appSecret = cleanText(process.env.META_APP_SECRET);
  const redirectUri = cleanText(process.env.META_REDIRECT_URI);

  const params = new URLSearchParams();

  params.set('client_id', appId);
  params.set('client_secret', appSecret);
  params.set('redirect_uri', redirectUri);
  params.set('code', code);

  const response = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?${params.toString()}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || 'Could not exchange Meta authorization code.');
  }

  return cleanText(result.access_token);
}

async function exchangeForLongLivedToken(shortLivedToken: string) {
  const appId = cleanText(process.env.META_APP_ID);
  const appSecret = cleanText(process.env.META_APP_SECRET);

  const params = new URLSearchParams();

  params.set('grant_type', 'fb_exchange_token');
  params.set('client_id', appId);
  params.set('client_secret', appSecret);
  params.set('fb_exchange_token', shortLivedToken);

  const response = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?${params.toString()}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || 'Could not create long-lived Meta token.');
  }

  const expiresInSeconds = Number(result.expires_in || 0);

  return {
    accessToken: cleanText(result.access_token),
    tokenType: cleanText(result.token_type) || 'bearer',
    expiresAt:
      expiresInSeconds > 0
        ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
        : null,
  };
}

async function getMetaUser(accessToken: string) {
  const params = new URLSearchParams();

  params.set('access_token', accessToken);
  params.set('fields', 'id,name');

  const response = await fetch(`https://graph.facebook.com/v20.0/me?${params.toString()}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || 'Could not load Meta user.');
  }

  return result;
}

async function getMetaPages(accessToken: string) {
  const params = new URLSearchParams();

  params.set('access_token', accessToken);
  params.set('fields', 'id,name,access_token,instagram_business_account{id,name,username}');

  const response = await fetch(
    `https://graph.facebook.com/v20.0/me/accounts?${params.toString()}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || 'Could not load Facebook Pages.');
  }

  return Array.isArray(result?.data) ? result.data : [];
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
      throw new Error('Missing Meta authorization code or state.');
    }

    const verifiedState = parseAndVerifyState(state);
    const shortLivedToken = await exchangeCodeForShortLivedToken(code);
    const longLived = await exchangeForLongLivedToken(shortLivedToken);
    const metaUser = await getMetaUser(longLived.accessToken);
    const pages = await getMetaPages(longLived.accessToken);

    if (pages.length === 0) {
      throw new Error('No Facebook Pages were returned for this Meta account.');
    }

    const supabase = getSupabaseAdmin();

    for (const page of pages as MetaPage[]) {
      const pageId = cleanText(page.id);

      if (!pageId) continue;

      const instagramAccount = page.instagram_business_account || null;

      const connection = {
        user_id: verifiedState.userId,
        provider: 'meta',
        provider_user_id: cleanText(metaUser?.id),
        provider_user_name: cleanText(metaUser?.name),

        page_id: pageId,
        page_name: cleanText(page.name),
        page_access_token: cleanText(page.access_token),

        instagram_business_account_id: cleanText(instagramAccount?.id) || null,
        instagram_username: cleanText(instagramAccount?.username || instagramAccount?.name) || null,

        access_token: longLived.accessToken,
        token_type: longLived.tokenType,
        expires_at: longLived.expiresAt,

        scopes: [
          'pages_show_list',
          'pages_read_engagement',
          'pages_manage_posts',
          'instagram_basic',
          'instagram_content_publish',
          'business_management',
        ],
        status: 'connected',
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('social_connections')
        .upsert(connection, {
          onConflict: 'user_id,provider,page_id',
        });

      if (upsertError) {
        throw new Error(upsertError.message);
      }
    }

    const redirectUrl = new URL(verifiedState.returnTo, request.nextUrl.origin);
    redirectUrl.searchParams.set('meta_connected', 'true');

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    const redirectUrl = new URL('/posts', request.nextUrl.origin);

    redirectUrl.searchParams.set('meta_connected', 'false');
    redirectUrl.searchParams.set('meta_error', error?.message || 'Meta connection failed.');

    return NextResponse.redirect(redirectUrl);
  }
}