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
    const connectionId = cleanText(body.connection_id || body.connectionId);

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('social_connections')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'meta');

    if (connectionId) {
      query = query.eq('id', connectionId);
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      disconnected: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not disconnect Meta account.' },
      { status: 500 }
    );
  }
}