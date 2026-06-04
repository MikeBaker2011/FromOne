import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  try {
    const clientId = cleanText(process.env.GOOGLE_CLIENT_ID);
    const redirectUri = cleanText(process.env.GOOGLE_REDIRECT_URI);

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Google client ID or redirect URI is missing.' },
        { status: 500 }
      );
    }

    const userId = cleanText(request.nextUrl.searchParams.get('user_id'));
    const returnTo = cleanText(request.nextUrl.searchParams.get('return_to')) || '/settings';

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id for Google connection.' }, { status: 400 });
    }

    const statePayload = JSON.stringify({
      userId,
      returnTo,
      createdAt: new Date().toISOString(),
      nonce: crypto.randomBytes(16).toString('hex'),
    });

    const encodedPayload = Buffer.from(statePayload).toString('base64url');
    const signature = signState(encodedPayload);
    const state = `${encodedPayload}.${signature}`;

    const params = new URLSearchParams();

    params.set('client_id', clientId);
    params.set('redirect_uri', redirectUri);
    params.set('response_type', 'code');
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
    params.set('state', state);
    params.set('scope', 'https://www.googleapis.com/auth/business.manage');

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not start Google connection.' },
      { status: 500 }
    );
  }
}