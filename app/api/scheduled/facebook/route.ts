import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

async function publishScheduledPostToFacebook(post: any) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !pageAccessToken) {
    throw new Error('Facebook page ID or access token is missing.');
  }

  const message = buildPostText(post);
  const mediaUrl = cleanText(post?.media_url);
  const mediaType = cleanText(post?.media_type);

  if (!message) {
    throw new Error('This scheduled post has no wording to publish.');
  }

  if (mediaUrl && isImageMedia(mediaType)) {
    return publishImagePost({
      pageId,
      pageAccessToken,
      message,
      mediaUrl,
    });
  }

  return publishTextPost({
    pageId,
    pageAccessToken,
    message,
  });
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
  }> = [];

  for (const post of candidates) {
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
      results.push({
        postId: post.id,
        status: 'failed',
        message: lockError.message,
      });

      continue;
    }

    try {
      const facebookResult = await publishScheduledPostToFacebook(post);
      const facebookPostId = getFacebookPostId(facebookResult);
      const publishedTo = buildPublishedToValue(post.published_to);

      if (!facebookPostId) {
        throw new Error('Facebook published the post but did not return a post ID.');
      }

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

      results.push({
        postId: post.id,
        status: 'posted',
        facebookPostId,
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