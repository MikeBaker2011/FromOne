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

async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = cleanText(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanText(process.env.GOOGLE_CLIENT_SECRET);

  const params = new URLSearchParams();

  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);
  params.set('refresh_token', refreshToken);
  params.set('grant_type', 'refresh_token');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error_description || result?.error || 'Could not refresh Google token.');
  }

  const expiresInSeconds = Number(result.expires_in || 0);

  return {
    accessToken: cleanText(result.access_token),
    expiresAt:
      expiresInSeconds > 0
        ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
        : null,
  };
}

async function getValidGoogleToken(connection: any, supabase: any) {
  const accessToken = cleanText(connection?.access_token);
  const refreshToken = cleanText(connection?.refresh_token);
  const expiresAt = connection?.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const expiresSoon = !expiresAt || expiresAt < Date.now() + 2 * 60 * 1000;

  if (accessToken && !expiresSoon) {
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error('Google refresh token is missing. Reconnect Google in Settings.');
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken);

  await supabase
    .from('social_connections')
    .update({
      access_token: refreshed.accessToken,
      expires_at: refreshed.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id);

  return refreshed.accessToken;
}

async function listGoogleAccounts(accessToken: string) {
  const response = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || 'Could not load Google accounts.');
  }

  return Array.isArray(result?.accounts) ? result.accounts : [];
}

async function listGoogleLocations(accessToken: string, accountName: string) {
  const response = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,metadata`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || 'Could not load Google locations.');
  }

  return Array.isArray(result?.locations) ? result.locations : [];
}

export async function GET(request: NextRequest) {
  try {
    const userId = cleanText(request.nextUrl.searchParams.get('user_id'));

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('status', 'connected')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({ error: 'Google is not connected.' }, { status: 404 });
    }

    const accessToken = await getValidGoogleToken(connection, supabase);
    const accounts = await listGoogleAccounts(accessToken);

    const locations: any[] = [];

    for (const account of accounts) {
      const accountName = cleanText(account?.name);

      if (!accountName) continue;

      const accountLocations = await listGoogleLocations(accessToken, accountName);

      for (const location of accountLocations) {
        locations.push({
          accountId: accountName,
          accountName: cleanText(account?.accountName || account?.name),
          locationId: cleanText(location?.name),
          locationName: cleanText(location?.title || location?.name),
          address:
            location?.storefrontAddress?.addressLines?.join(', ') ||
            cleanText(location?.storefrontAddress?.locality) ||
            '',
        });
      }
    }

    return NextResponse.json({
      accounts,
      locations,
      selectedLocationId: connection.google_location_id || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not load Google locations.' },
      { status: 500 }
    );
  }
}