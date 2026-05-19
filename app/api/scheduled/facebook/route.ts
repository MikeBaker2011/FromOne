import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type FacebookCredentials = {
  pageId: string;
  pageAccessToken: string;
  source: 'social_connections' | 'env';
  connectionId?: string | null;
};

type PublishLogInput = {
  userId?: string | null;
  postId?: string | null;
  platform: string;
  action: string;
  status: string;
  message?: string | null;
  error?: string | null;
  credentialSource?: string | null;
  socialConnectionId?: string | null;
  providerPostId?: string | null;
  metadata?: Record<string, any>;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_POSTS_PER_RUN = 10;

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

function cleanSecret(value: unknown) {
  return String(value || '').trim();
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getCronSecret() {
  return cleanSecret(process.env.CRON_SECRET);
}

function isAuthorized(request: NextRequest) {
  const cronSecret = getCronSecret();

  if (!cronSecret) {
    return {
      authorized: false,
      reason: 'CRON_SECRET is not set on the deployed web service.',
    };
  }

  const authHeader = cleanSecret(request.headers.get('authorization'));
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  const headerSecret = cleanSecret(request.headers.get('x-cron-secret'));
  const querySecret = cleanSecret(request.nextUrl.searchParams.get('secret'));

  const authorized =
    bearerToken === cronSecret || headerSecret === cronSecret || querySecret === cronSecret;

  return {
    authorized,
    reason: authorized ? null : 'Secret was provided but did not match CRON_SECRET.',
  };
}

function isFacebookPost(post: any) {
  return String(post?.platform || '').toLowerCase().includes('facebook');
}

function isAlreadyPosted(post: any) {
  return (
    post?.is_posted === true ||
    String(post?.status || '').toLowerCase() === 'posted' ||
    String(post?.publish_status || '').toLowerCase() === 'posted' ||
    String(post?.publish_status || '').toLowerCase() === 'published'
  );
}

function isCurrentlyPublishing(post: any) {
  return String(post?.publish_status || '').toLowerCase() === 'publishing';
}

function isImageMedia(mediaType: string) {
  return mediaType.toLowerCase().startsWith('image');
}

function buildPostText(post: any) {
  const caption = cleanText(post?.caption);
  const cta = post?.cta ? `CTA: ${cleanText(post.cta)}` : '';
  const hashtags = Array.isArray(post?.hashtags) ? post.hashtags.join(' ') : '';

  return [caption, cta, hashtags].filter(Boolean).join('\n\n').trim();
}

function getFacebookPostId(result: any) {
  return (
    result?.id ||
    result?.post_id ||
    result?.photo_id ||
    result?.data?.id ||
    result?.post?.id ||
    null
  );
}

function buildPublishedToValue(currentValue: any) {
  if (Array.isArray(currentValue)) {
    return Array.from(new Set([...currentValue, 'facebook']));
  }

  if (typeof currentValue === 'string' && currentValue.trim()) {
    return Array.from(new Set([currentValue.toLowerCase(), 'facebook']));
  }

  return ['facebook'];
}

async function insertPublishLog({
  userId,
  postId,
  platform,
  action,
  status,
  message,
  error,
  credentialSource,
  socialConnectionId,
  providerPostId,
  metadata = {},
}: PublishLogInput) {
  try {
    const supabase = getSupabaseAdmin();

    const { error: logError } = await supabase.from('publish_logs').insert({
      user_id: userId || null,
      post_id: postId || null,
      platform,
      action,
      status,
      message: message || null,
      error: error || null,
      credential_source: credentialSource || null,
      social_connection_id: socialConnectionId || null,
      provider_post_id: providerPostId || null,
      metadata,
    });

    if (logError) {
      console.error('Publish log insert failed:', logError.message);
    }
  } catch (logError: any) {
    console.error('Publish log insert error:', logError?.message || logError);
  }
}

async function findUserIdForPost({
  supabase,
  post,
}: {
  supabase: any;
  post: any;
}) {
  const postUserId = cleanText(post?.user_id || post?.created_by || post?.owner_id);

  if (postUserId) return postUserId;

  const campaignId = cleanText(post?.campaign_id);

  if (!campaignId) return '';

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle();

  return cleanText(
    (campaign as any)?.user_id ||
      (campaign as any)?.created_by ||
      (campaign as any)?.owner_id ||
      ''
  );
}

async function getFacebookCredentialsForPost({
  supabase,
  post,
}: {
  supabase: any;
  post: any;
}): Promise<FacebookCredentials> {
  const userId = await findUserIdForPost({
    supabase,
    post,
  });

  if (userId) {
    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('id, page_id, page_access_token, access_token, status, updated_at')
      .eq('user_id', userId)
      .eq('provider', 'meta')
      .eq('status', 'connected')
      .not('page_id', 'is', null)
      .not('page_access_token', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Could not load scheduled Facebook social connection:', error.message);
    }

    const connectedPageId = cleanText((connection as any)?.page_id);
    const connectedAccessToken = cleanText(
      (connection as any)?.page_access_token || (connection as any)?.access_token
    );

    if (connectedPageId && connectedAccessToken) {
      return {
        pageId: connectedPageId,
        pageAccessToken: connectedAccessToken,
        source: 'social_connections',
        connectionId: cleanText((connection as any)?.id) || null,
      };
    }
  }

  const envPageId = cleanText(process.env.FACEBOOK_PAGE_ID);
  const envPageAccessToken = cleanText(process.env.FACEBOOK_PAGE_ACCESS_TOKEN);

  if (envPageId && envPageAccessToken) {
    return {
      pageId: envPageId,
      pageAccessToken: envPageAccessToken,
      source: 'env',
      connectionId: null,
    };
  }

  throw new Error(
    userId
      ? 'No connected Facebook Page was found, and fallback Facebook env vars are missing.'
      : 'Facebook page ID or access token is missing.'
  );
}

async function publishTextPost({
  pageId,
  pageAccessToken,
  message,
}: {
  pageId: string;
  pageAccessToken: string;
  message: string;
}) {
  const response = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      access_token: pageAccessToken,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || 'Facebook text post failed.');
  }

  return result;
}

async function publishImagePost({
  pageId,
  pageAccessToken,
  message,
  mediaUrl,
}: {
  pageId: string;
  pageAccessToken: string;
  message: string;
  mediaUrl: string;
}) {
  const response = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: mediaUrl,
      caption: message,
      access_token: pageAccessToken,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || 'Facebook image post failed.');
  }

  return result;
}

async function publishScheduledPostToFacebook({
  post,
  supabase,
}: {
  post: any;
  supabase: any;
}) {
  const credentials = await getFacebookCredentialsForPost({
    supabase,
    post,
  });

  const message = buildPostText(post);
  const mediaUrl = cleanText(post?.media_url);
  const mediaType = cleanText(post?.media_type);

  if (!message) {
    throw new Error('This scheduled post has no wording to publish.');
  }

  let result;

  if (mediaUrl && isImageMedia(mediaType)) {
    result = await publishImagePost({
      pageId: credentials.pageId,
      pageAccessToken: credentials.pageAccessToken,
      message,
      mediaUrl,
    });
  } else {
    result = await publishTextPost({
      pageId: credentials.pageId,
      pageAccessToken: credentials.pageAccessToken,
      message,
    });
  }

  return {
    result,
    credentialSource: credentials.source,
    connectionId: credentials.connectionId || null,
  };
}

async function runFacebookScheduledPublish(request: NextRequest) {
  const auth = isAuthorized(request);

  if (!auth.authorized) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Unauthorized.',
        reason: auth.reason,
        hasCronSecret: Boolean(getCronSecret()),
      },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: duePosts, error: duePostsError } = await supabase
    .from('campaign_posts')
    .select('*')
    .not('scheduled_publish_at', 'is', null)
    .lte('scheduled_publish_at', nowIso)
    .is('deleted_at', null)
    .order('scheduled_publish_at', { ascending: true })
    .limit(MAX_POSTS_PER_RUN * 3);

  if (duePostsError) {
    return NextResponse.json(
      {
        ok: false,
        error: duePostsError.message,
      },
      { status: 500 }
    );
  }

  const candidates =
    duePosts
      ?.filter((post) => isFacebookPost(post))
      .filter((post) => !isAlreadyPosted(post))
      .filter((post) => !isCurrentlyPublishing(post))
      .slice(0, MAX_POSTS_PER_RUN) || [];

  const results: Array<{
    postId: string;
    status: 'posted' | 'skipped' | 'failed';
    message?: string;
    facebookPostId?: string | null;
    credentialSource?: string;
    connectionId?: string | null;
  }> = [];

  for (const post of candidates) {
    const userId = await findUserIdForPost({
      supabase,
      post,
    });

    const postText = buildPostText(post);

    if (!postText) {
      const message = 'This scheduled post has no wording to publish.';

      await supabase
        .from('campaign_posts')
        .update({
          publish_status: 'failed',
          status: 'failed',
          publish_error: message,
        })
        .eq('id', post.id);

      await insertPublishLog({
        userId,
        postId: post.id,
        platform: 'facebook',
        action: 'scheduled_publish',
        status: 'failed',
        message: 'Scheduled Facebook publish failed.',
        error: message,
        metadata: {
          scheduled_publish_at: post.scheduled_publish_at || null,
          reason: 'missing_wording',
        },
      });

      results.push({
        postId: post.id,
        status: 'failed',
        message,
      });

      continue;
    }

    const { error: lockError } = await supabase
      .from('campaign_posts')
      .update({
        publish_status: 'publishing',
        publish_error: null,
      })
      .eq('id', post.id);

    if (lockError) {
      await insertPublishLog({
        userId,
        postId: post.id,
        platform: 'facebook',
        action: 'scheduled_publish',
        status: 'failed',
        message: 'Scheduled Facebook publish could not start.',
        error: lockError.message,
        metadata: {
          scheduled_publish_at: post.scheduled_publish_at || null,
          reason: 'lock_failed',
        },
      });

      results.push({
        postId: post.id,
        status: 'failed',
        message: lockError.message,
      });

      continue;
    }

    try {
      const facebookResult = await publishScheduledPostToFacebook({
        post,
        supabase,
      });

      const facebookPostId = getFacebookPostId(facebookResult.result);
      const publishedTo = buildPublishedToValue(post.published_to);

      if (!facebookPostId) {
        throw new Error('Facebook published the post but did not return a post ID.');
      }

      const updates: Record<string, any> = {
        is_posted: true,
        status: 'posted',
        publish_status: 'posted',
        publish_error: null,
        published_to: publishedTo,
        published_at: new Date().toISOString(),
        facebook_post_id: facebookPostId,
      };

      if (facebookResult.credentialSource) {
        updates.publish_source = facebookResult.credentialSource;
      }

      if (facebookResult.connectionId) {
        updates.social_connection_id = facebookResult.connectionId;
      }

      const { error: updateError } = await supabase
        .from('campaign_posts')
        .update(updates)
        .eq('id', post.id);

      if (updateError) {
        console.error(
          'Scheduled Facebook publish saved but database update failed:',
          updateError.message
        );

        await supabase
          .from('campaign_posts')
          .update({
            is_posted: true,
            status: 'posted',
            publish_status: 'posted',
            publish_error: null,
            published_to: publishedTo,
            published_at: new Date().toISOString(),
            facebook_post_id: facebookPostId,
          })
          .eq('id', post.id);
      }

      await insertPublishLog({
        userId,
        postId: post.id,
        platform: 'facebook',
        action: 'scheduled_publish',
        status: 'posted',
        message: 'Facebook posted automatically.',
        error: null,
        credentialSource: facebookResult.credentialSource,
        socialConnectionId: facebookResult.connectionId || null,
        providerPostId: facebookPostId,
        metadata: {
          scheduled_publish_at: post.scheduled_publish_at || null,
          media_url: post.media_url || null,
          media_type: post.media_type || null,
          used_media: Boolean(post.media_url),
        },
      });

      results.push({
        postId: post.id,
        status: 'posted',
        facebookPostId,
        credentialSource: facebookResult.credentialSource,
        connectionId: facebookResult.connectionId,
      });
    } catch (error: any) {
      const message = error?.message || 'Scheduled Facebook publishing failed.';

      await supabase
        .from('campaign_posts')
        .update({
          publish_status: 'failed',
          status: 'failed',
          publish_error: message,
        })
        .eq('id', post.id);

      await insertPublishLog({
        userId,
        postId: post.id,
        platform: 'facebook',
        action: 'scheduled_publish',
        status: 'failed',
        message: 'Scheduled Facebook publish failed.',
        error: message,
        metadata: {
          scheduled_publish_at: post.scheduled_publish_at || null,
          route: '/api/scheduled/facebook',
        },
      });

      results.push({
        postId: post.id,
        status: 'failed',
        message,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checked_at: nowIso,
    due_found: duePosts?.length || 0,
    attempted: candidates.length,
    posted: results.filter((item) => item.status === 'posted').length,
    failed: results.filter((item) => item.status === 'failed').length,
    skipped: results.filter((item) => item.status === 'skipped').length,
    results,
  });
}

export async function GET(request: NextRequest) {
  return runFacebookScheduledPublish(request);
}

export async function POST(request: NextRequest) {
  return runFacebookScheduledPublish(request);
}