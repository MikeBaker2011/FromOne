import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'mikeb33@hotmail.co.uk';
const DEFAULT_WEEKLY_POST_LIMIT = 4;
const MIN_WEEKLY_POST_LIMIT = 1;
const MAX_WEEKLY_POST_LIMIT = 100;

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

async function upsertAccess(
  userId: string,
  values: Record<string, unknown>,
) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('user_access')
    .upsert(
      {
        user_id: userId,
        updated_at: new Date().toISOString(),
        ...values,
      },
      {
        onConflict: 'user_id',
      },
    );

  if (error) {
    throw error;
  }
}

async function upsertBilling(
  userId: string,
  values: Record<string, unknown>,
) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('user_billing')
    .upsert(
      {
        user_id: userId,
        updated_at: new Date().toISOString(),
        ...values,
      },
      {
        onConflict: 'user_id',
      },
    );

  if (error) {
    throw error;
  }
}

async function getLatestBusinessProfile(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('business_profiles')
    .select('id, user_id, business_name, post_limit_override')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function setPostLimitOverride(
  userId: string,
  requestedLimit: unknown,
) {
  const parsedLimit = Number(requestedLimit);

  if (!Number.isInteger(parsedLimit)) {
    throw new Error('Weekly post limit must be a whole number.');
  }

  if (
    parsedLimit < MIN_WEEKLY_POST_LIMIT ||
    parsedLimit > MAX_WEEKLY_POST_LIMIT
  ) {
    throw new Error(
      `Weekly post limit must be between ${MIN_WEEKLY_POST_LIMIT} and ${MAX_WEEKLY_POST_LIMIT}.`,
    );
  }

  const profile = await getLatestBusinessProfile(userId);

  if (!profile?.id) {
    throw new Error(
      'This customer does not have a business profile yet.',
    );
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('business_profiles')
    .update({
      post_limit_override: parsedLimit,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return parsedLimit;
}

async function clearPostLimitOverride(userId: string) {
  const profile = await getLatestBusinessProfile(userId);

  if (!profile?.id) {
    throw new Error(
      'This customer does not have a business profile yet.',
    );
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('business_profiles')
    .update({
      post_limit_override: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const userId = cleanText(body?.userId);
    const action = cleanText(body?.action);
    const nowIso = new Date().toISOString();

    if (!userId) {
      return NextResponse.json(
        {
          error: 'userId is required.',
        },
        {
          status: 400,
        },
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          error: 'action is required.',
        },
        {
          status: 400,
        },
      );
    }

    if (action === 'set_post_limit_override') {
      const weeklyLimit = await setPostLimitOverride(
        userId,
        body?.postLimitOverride,
      );

      return NextResponse.json({
        ok: true,
        message: `Weekly post limit set to ${weeklyLimit}.`,
        post_limit_override: weeklyLimit,
        effective_post_limit: weeklyLimit,
      });
    }

    if (action === 'clear_post_limit_override') {
      await clearPostLimitOverride(userId);

      return NextResponse.json({
        ok: true,
        message: `Weekly post limit reset to the default of ${DEFAULT_WEEKLY_POST_LIMIT}.`,
        post_limit_override: null,
        effective_post_limit: DEFAULT_WEEKLY_POST_LIMIT,
      });
    }

    if (action === 'save_notes') {
      await upsertAccess(userId, {
        admin_notes: cleanText(body?.adminNotes),
      });

      return NextResponse.json({
        ok: true,
        message: 'Admin notes saved.',
      });
    }

    if (action === 'grant_beta') {
      await upsertAccess(userId, {
        access_status: 'beta',
        subscription_status: 'beta',
        subscription_provider: 'manual',
        subscription_reference: 'controlled-beta',
        extension_ends_at: null,
      });

      await upsertBilling(userId, {
        plan: 'demo',
        status: 'beta',
        payment_status: 'none',
        paypal_subscription_id: null,
        cancelled_at: null,
      });

      return NextResponse.json({
        ok: true,
        message: 'Beta access granted.',
      });
    }

    if (action === 'revoke_beta') {
      await upsertAccess(userId, {
        access_status: 'expired',
        subscription_status: 'none',
        subscription_provider: null,
        subscription_reference: null,
        extension_ends_at: null,
      });

      await upsertBilling(userId, {
        plan: 'demo',
        status: 'expired',
        payment_status: 'none',
        paypal_subscription_id: null,
        cancelled_at: nowIso,
      });

      return NextResponse.json({
        ok: true,
        message: 'Beta access revoked.',
      });
    }

    if (
      action === 'extend_7' ||
      action === 'extend_14' ||
      action === 'extend_30'
    ) {
      const days =
        action === 'extend_7'
          ? 7
          : action === 'extend_14'
            ? 14
            : 30;

      const extensionEndsAt = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000,
      ).toISOString();

      await upsertAccess(userId, {
        access_status: 'trial',
        subscription_status: 'none',
        subscription_provider: null,
        subscription_reference: null,
        extension_ends_at: extensionEndsAt,
      });

      await upsertBilling(userId, {
        plan: 'demo',
        status: 'trial',
        payment_status: 'none',
      });

      return NextResponse.json({
        ok: true,
        message: `Demo extended for ${days} days.`,
      });
    }

    if (action === 'remove_extension') {
      await upsertAccess(userId, {
        extension_ends_at: null,
      });

      return NextResponse.json({
        ok: true,
        message: 'Extension removed.',
      });
    }

    if (action === 'manual_active') {
      await upsertAccess(userId, {
        access_status: 'active',
        subscription_status: 'active',
        subscription_provider: 'manual',
        subscription_reference: 'manual-support',
        extension_ends_at: null,
      });

      await upsertBilling(userId, {
        plan: 'starter',
        status: 'active',
        payment_status: 'none',
        paypal_subscription_id: 'manual-support',
        cancelled_at: null,
      });

      return NextResponse.json({
        ok: true,
        message: 'Customer manually activated.',
      });
    }

    if (action === 'owner_unlimited') {
      await upsertAccess(userId, {
        access_status: 'active',
        subscription_status: 'active',
        subscription_provider: 'manual',
        subscription_reference: 'owner-unlimited-access',
        extension_ends_at: '2099-12-31T23:59:59.000Z',
      });

      await upsertBilling(userId, {
        plan: 'starter',
        status: 'active',
        payment_status: 'none',
        paypal_subscription_id: 'owner-unlimited-access',
        cancelled_at: null,
      });

      return NextResponse.json({
        ok: true,
        message: 'Owner unlimited access granted.',
      });
    }

    if (action === 'clear_pending') {
      await upsertAccess(userId, {
        access_status: 'cancelled',
        subscription_status: 'cancelled',
      });

      await upsertBilling(userId, {
        status: 'cancelled',
        payment_status: 'none',
      });

      return NextResponse.json({
        ok: true,
        message: 'Pending payment cleared.',
      });
    }

    if (action === 'expire') {
      await upsertAccess(userId, {
        access_status: 'expired',
        subscription_status: 'none',
        subscription_provider: null,
        subscription_reference: null,
        extension_ends_at: null,
      });

      await upsertBilling(userId, {
        plan: 'demo',
        status: 'expired',
        payment_status: 'none',
        paypal_subscription_id: null,
        cancelled_at: nowIso,
      });

      return NextResponse.json({
        ok: true,
        message: 'Customer access expired.',
      });
    }

    return NextResponse.json(
      {
        error: 'Unknown admin action.',
      },
      {
        status: 400,
      },
    );
  } catch (error: any) {
    console.error('Admin action error:', {
      message: error?.message,
      name: error?.name,
      status: error?.status,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });

    const message = error?.message || 'Admin action failed.';

    const status =
      message.includes('Admin access') ||
      message.includes('sign in')
        ? 401
        : message.includes('required') ||
            message.includes('whole number') ||
            message.includes('between') ||
            message.includes('does not have a business profile')
          ? 400
          : 500;

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      },
    );
  }
}