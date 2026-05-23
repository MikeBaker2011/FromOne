import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'mikeb33@hotmail.co.uk';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return '';
  }

  return authHeader.slice('bearer '.length).trim();
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase admin environment variables.');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function requireAdmin(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public environment variables.');
  }

  const token = getBearerToken(request);

  if (!token) {
    throw new Error('Please sign in as admin.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.email) {
    throw new Error(error?.message || 'Please sign in as admin.');
  }

  if (data.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Admin access only.');
  }

  return data.user;
}

async function findUsersByEmail(emailQuery: string) {
  const supabase = getSupabaseAdmin();
  const cleanQuery = emailQuery.toLowerCase();

  const matches: any[] = [];
  let page = 1;
  const perPage = 200;

  while (page <= 10 && matches.length < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users || [];

    matches.push(
      ...users.filter((user) =>
        String(user.email || '').toLowerCase().includes(cleanQuery),
      ),
    );

    if (users.length < perPage) break;

    page += 1;
  }

  return matches.slice(0, 20);
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const emailQuery = cleanText(url.searchParams.get('email'));

    if (!emailQuery) {
      return NextResponse.json(
        {
          error: 'Email search query is required.',
        },
        { status: 400 },
      );
    }

    const users = await findUsersByEmail(emailQuery);
    const userIds = users.map((user) => user.id);

    const supabase = getSupabaseAdmin();

    const accessPromise = userIds.length
      ? supabase.from('user_access').select('*').in('user_id', userIds)
      : Promise.resolve({ data: [], error: null });

    const billingPromise = userIds.length
      ? supabase.from('user_billing').select('*').in('user_id', userIds)
      : Promise.resolve({ data: [], error: null });

    const [{ data: accessRows, error: accessError }, { data: billingRows, error: billingError }] =
      await Promise.all([accessPromise, billingPromise]);

    if (accessError) throw accessError;
    if (billingError) throw billingError;

    const accessByUserId = new Map((accessRows || []).map((row: any) => [row.user_id, row]));
    const billingByUserId = new Map((billingRows || []).map((row: any) => [row.user_id, row]));

    return NextResponse.json({
      ok: true,
      customers: users.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at || null,
        last_sign_in_at: user.last_sign_in_at || null,
        access: accessByUserId.get(user.id) || null,
        billing: billingByUserId.get(user.id) || null,
      })),
    });
  } catch (error: any) {
    console.error('Admin customer search error:', {
      message: error?.message,
      name: error?.name,
      status: error?.status,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });

    const message = error?.message || 'Could not search customer.';
    const status = message.includes('Admin access') || message.includes('sign in') ? 401 : 500;

    return NextResponse.json(
      {
        error: message,
        debug: {
          name: error?.name || null,
          status: error?.status || null,
          code: error?.code || null,
          details: error?.details || null,
          hint: error?.hint || null,
          hasSupabaseUrl: Boolean(supabaseUrl),
          hasAnonKey: Boolean(supabaseAnonKey),
          hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
        },
      },
      { status },
    );
  }
}
