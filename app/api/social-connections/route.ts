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

export async function GET(request: NextRequest) {
  try {
    const userId = cleanText(request.nextUrl.searchParams.get('user_id'));

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('social_connections')
      .select(
        `
        id,
        provider,
        provider_user_id,
        provider_user_name,
        page_id,
        page_name,
        instagram_business_account_id,
        instagram_username,
        google_account_id,
        google_account_name,
        google_location_id,
        google_location_name,
        expires_at,
        status,
        updated_at
        `
      )
      .eq('user_id', userId)
      .in('provider', ['meta', 'google'])
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      connections: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not load social connections.' },
      { status: 500 }
    );
  }
}