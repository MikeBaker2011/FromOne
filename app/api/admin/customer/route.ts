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

async function getRecentUsers(limit = 40) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: Math.max(limit, 40),
  });

  if (error) {
    throw error;
  }

  return (data?.users || [])
    .sort((firstUser, secondUser) => {
      const firstTime = firstUser.created_at
        ? new Date(firstUser.created_at).getTime()
        : 0;
      const secondTime = secondUser.created_at
        ? new Date(secondUser.created_at).getTime()
        : 0;

      return secondTime - firstTime;
    })
    .slice(0, limit);
}

async function attachAccessAndBilling(users: any[]) {
  const userIds = users.map((user) => user.id);
  const supabase = getSupabaseAdmin();

  const accessPromise = userIds.length
    ? supabase.from('user_access').select('*').in('user_id', userIds)
    : Promise.resolve({ data: [], error: null });

  const billingPromise = userIds.length
    ? supabase.from('user_billing').select('*').in('user_id', userIds)
    : Promise.resolve({ data: [], error: null });

  const [
    { data: accessRows, error: accessError },
    { data: billingRows, error: billingError },
  ] = await Promise.all([accessPromise, billingPromise]);

  if (accessError) throw accessError;
  if (billingError) throw billingError;

  const accessByUserId = new Map(
    (accessRows || []).map((row: any) => [row.user_id, row]),
  );

  const billingByUserId = new Map(
    (billingRows || []).map((row: any) => [row.user_id, row]),
  );

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    created_at: user.created_at || null,
    last_sign_in_at: user.last_sign_in_at || null,
    access: accessByUserId.get(user.id) || null,
    billing: billingByUserId.get(user.id) || null,
  }));
}

async function getRecentBugReports() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    if (
      error.code === 'PGRST205' ||
      String(error.message || '').includes('bug_reports')
    ) {
      return [];
    }

    throw error;
  }

  const reports = data || [];
  const uniqueUserIds = Array.from(
    new Set(
      reports
        .map((report: any) => cleanText(report.user_id))
        .filter(Boolean),
    ),
  );

  const emailByUserId = new Map<string, string>();

  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      try {
        const { data: userData } =
          await supabase.auth.admin.getUserById(userId);

        if (userData?.user?.email) {
          emailByUserId.set(userId, userData.user.email);
        }
      } catch {
        // Missing/deleted users should not break the admin dashboard.
      }
    }),
  );

  return reports.map((report: any) => ({
    ...report,
    user_email: report.user_id
      ? emailByUserId.get(report.user_id) || null
      : null,
  }));
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const mode = cleanText(url.searchParams.get('mode')).toLowerCase();
    const emailQuery = cleanText(url.searchParams.get('email'));

    if (mode === 'overview') {
      const users = await getRecentUsers(40);

      const [customers, bugReports] = await Promise.all([
        attachAccessAndBilling(users),
        getRecentBugReports(),
      ]);

      return NextResponse.json({
        ok: true,
        customers,
        bugReports,
      });
    }

    if (!emailQuery) {
      return NextResponse.json(
        {
          error: 'Email search query is required.',
        },
        { status: 400 },
      );
    }

    const users = await findUsersByEmail(emailQuery);
    const customers = await attachAccessAndBilling(users);

    return NextResponse.json({
      ok: true,
      customers,
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
    const status =
      message.includes('Admin access') || message.includes('sign in')
        ? 401
        : 500;

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