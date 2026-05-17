import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

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

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString('base64url');
}

export async function GET(request: NextRequest) {
  try {
    const appId = cleanText(process.env.META_APP_ID);
    const redirectUri = cleanText(process.env.META_REDIRECT_URI);

    if (!appId || !redirectUri) {
      return NextResponse.json(
        { error: 'Meta app ID or redirect URI is missing.' },
        { status: 500 }
      );
    }

    const userId = cleanText(request.nextUrl.searchParams.get('user_id'));
    const returnTo = cleanText(request.nextUrl.searchParams.get('return_to')) || '/posts';

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user_id for Meta connection.' },
        { status: 400 }
      );
    }

    const statePayload = JSON.stringify({
      userId,
      returnTo,
      createdAt: new Date().toISOString(),
      nonce: crypto.randomBytes(16).toString('hex'),
    });

    const encodedPayload = base64UrlEncode(statePayload);
    const signature = signState(encodedPayload);
    const state = `${encodedPayload}.${signature}`;

    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish',
      'business_management',
    ];

    const params = new URLSearchParams();

    params.set('client_id', appId);
    params.set('redirect_uri', redirectUri);
    params.set('state', state);
    params.set('scope', scopes.join(','));
    params.set('response_type', 'code');

    return NextResponse.redirect(
      `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not start Meta connection.' },
      { status: 500 }
    );
  }
}