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

function isExpired(value?: string | null) {
  const cleanValue = cleanText(value);

  if (!cleanValue) return false;

  const expiryTime = new Date(cleanValue).getTime();

  if (Number.isNaN(expiryTime)) return false;

  return expiryTime <= Date.now();
}

function buildMetaConnectionStatus(connection: any) {
  const status = cleanText(connection.status).toLowerCase();
  const isConnectedStatus = status === 'connected';

  const hasPageId = Boolean(cleanText(connection.page_id));
  const hasPageAccessToken = Boolean(cleanText(connection.page_access_token));
  const hasGeneralAccessToken = Boolean(cleanText(connection.access_token));

  const hasInstagramBusinessAccountId = Boolean(
    cleanText(connection.instagram_business_account_id),
  );

  const expired = isExpired(connection.expires_at);

  const facebookReady =
    isConnectedStatus && hasPageId && hasPageAccessToken && !expired;

  const instagramReady =
    isConnectedStatus &&
    hasInstagramBusinessAccountId &&
    (hasGeneralAccessToken || hasPageAccessToken) &&
    !expired;

  let connectionHealth:
    | 'ready'
    | 'needs_reconnect'
    | 'facebook_missing'
    | 'instagram_missing'
    | 'expired'
    | 'disconnected' = 'ready';

  let friendlyStatus = 'Connected';
  let friendlyMessage = 'Facebook and Instagram are connected.';

  if (!isConnectedStatus) {
    connectionHealth = 'disconnected';
    friendlyStatus = 'Needs reconnecting';
    friendlyMessage = 'Reconnect Facebook and Instagram in Settings.';
  } else if (expired) {
    connectionHealth = 'expired';
    friendlyStatus = 'Needs reconnecting';
    friendlyMessage =
      'Your Facebook and Instagram connection has expired. Reconnect in Settings.';
  } else if (!facebookReady && !instagramReady) {
    connectionHealth = 'needs_reconnect';
    friendlyStatus = 'Needs reconnecting';
    friendlyMessage =
      'Facebook and Instagram need reconnecting before autopublish can work.';
  } else if (!facebookReady) {
    connectionHealth = 'facebook_missing';
    friendlyStatus = 'Partly connected';
    friendlyMessage =
      'Instagram may be connected, but Facebook autopublish needs reconnecting.';
  } else if (!instagramReady) {
    connectionHealth = 'instagram_missing';
    friendlyStatus = 'Partly connected';
    friendlyMessage =
      'Facebook may be connected, but Instagram autopublish needs reconnecting.';
  }

  return {
    facebook_ready: facebookReady,
    instagram_ready: instagramReady,
    connection_health: connectionHealth,
    friendly_status: friendlyStatus,
    friendly_message: friendlyMessage,
    token_health: {
      has_page_access_token: hasPageAccessToken,
      has_access_token: hasGeneralAccessToken,
      expires_at: connection.expires_at || null,
      expired,
    },
  };
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
        page_access_token,
        access_token,
        instagram_business_account_id,
        instagram_username,
        google_account_id,
        google_account_name,
        google_location_id,
        google_location_name,
        expires_at,
        status,
        updated_at
        `,
      )
      .eq('user_id', userId)
      .in('provider', ['meta', 'google'])
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const safeConnections = (data || []).map((connection: any) => {
      const isMeta = cleanText(connection.provider).toLowerCase() === 'meta';
      const metaStatus = isMeta ? buildMetaConnectionStatus(connection) : {};

      return {
        id: connection.id,
        provider: connection.provider,
        provider_user_id: connection.provider_user_id,
        provider_user_name: connection.provider_user_name,
        page_id: connection.page_id,
        page_name: connection.page_name,
        instagram_business_account_id: connection.instagram_business_account_id,
        instagram_username: connection.instagram_username,
        google_account_id: connection.google_account_id,
        google_account_name: connection.google_account_name,
        google_location_id: connection.google_location_id,
        google_location_name: connection.google_location_name,
        expires_at: connection.expires_at,
        status: connection.status,
        updated_at: connection.updated_at,
        ...metaStatus,
      };
    });

    return NextResponse.json({
      connections: safeConnections,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not load social connections.' },
      { status: 500 },
    );
  }
}
