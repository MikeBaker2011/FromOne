import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const cronSecret = process.env.CRON_SECRET || '';

function isCronAuthorised(req: NextRequest) {
  if (!cronSecret) return false;

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const querySecret = req.nextUrl.searchParams.get('secret') || '';

  return bearerToken === cronSecret || querySecret === cronSecret;
}

async function handleScheduledPublish(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Unauthorised scheduled publish request.',
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    success: true,
    scheduling_enabled: false,
    checked_at: new Date().toISOString(),
    due_posts: 0,
    posted: 0,
    failed: 0,
    skipped: 0,
    message:
      'Scheduled autoposting is paused for beta. Use Post manually or Autopost now from the post modal.',
    results: [],
  });
}

export async function GET(req: NextRequest) {
  return handleScheduledPublish(req);
}

export async function POST(req: NextRequest) {
  return handleScheduledPublish(req);
}
