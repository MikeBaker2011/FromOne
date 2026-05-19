import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getAppUrl() {
  return cleanText(process.env.NEXT_PUBLIC_APP_URL) || 'https://fromone.co.uk';
}

export async function GET(request: NextRequest) {
  const demoMode = cleanText(process.env.NEXT_PUBLIC_TIKTOK_DEMO_MODE) === 'true';

  if (!demoMode) {
    return NextResponse.json(
      { error: 'TikTok demo mode is not enabled.' },
      { status: 403 }
    );
  }

  const returnTo = cleanText(request.nextUrl.searchParams.get('return_to')) || '/settings';

  const redirectUrl = new URL(returnTo, getAppUrl());

  redirectUrl.searchParams.set('tiktok_connected', 'true');
  redirectUrl.searchParams.set('tiktok_demo', 'true');

  return NextResponse.redirect(redirectUrl);
}