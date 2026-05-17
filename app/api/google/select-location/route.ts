import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const userId = cleanText(body.user_id || body.userId);
    const accountId = cleanText(body.google_account_id || body.accountId);
    const accountName = cleanText(body.google_account_name || body.accountName);
    const locationId = cleanText(body.google_location_id || body.locationId);
    const locationName = cleanText(body.google_location_name || body.locationName);

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id.' }, { status: 400 });
    }

    if (!accountId || !locationId) {
      return NextResponse.json(
        { error: 'Missing Google account or location.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('social_connections')
      .update({
        google_account_id: accountId,
        google_account_name: accountName || accountId,
        google_location_id: locationId,
        google_location_name: locationName || locationId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'google');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      google_account_id: accountId,
      google_account_name: accountName || accountId,
      google_location_id: locationId,
      google_location_name: locationName || locationId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not save Google location.' },
      { status: 500 }
    );
  }
}