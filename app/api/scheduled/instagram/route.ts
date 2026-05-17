import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type InstagramPublishBody = {
  postId?: string;
  message?: string;
  text?: string;
  caption?: string;
  cta?: string;
  hashtags?: string[];
  mediaUrl?: string;
  media_url?: string;
  mediaType?: string;
  media_type?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getCronSecret() {
  return cleanText(process.env.CRON_SECRET);
}

function isAuthorized(request: NextRequest) {
  const cronSecret = getCronSecret();

  if (!cronSecret) {
    return {
      authorized: false,
      reason: 'CRON_SECRET is not set on the deployed web service.',
    };
  }

  const authHeader = cleanText(request.headers.get('authorization'));
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  const headerSecret = cleanText(request.headers.get('x-cron-secret'));
  const querySecret = cleanText(request.nextUrl.searchParams.get('secret'));

  const authorized =
    bearerToken === cronSecret || headerSecret === cronSecret || querySecret === cronSecret;

  return {
    authorized,
    reason: authorized ? null : 'Secret was provided but did not match CRON_SECRET.',
  };
}

function isInstagramPost(post: any) {
  return String(post?.platform || '').toLowerCase().includes('instagram');
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

function isVideoMedia(mediaType: string) {
  return mediaType.toLowerCase().startsWith('video');
}

function buildPostText(post: any) {
  const caption = cleanText(post?.caption);
  const cta = post?.cta ? `CTA: ${cleanText(post.cta)}` : '';
  const hashtags = Array.isArray(post?.hashtags) ? post.hashtags.join(' ') : '';

  return [caption, cta, hashtags].filter(Boolean).join('\n\n').trim();
}

function buildPublishedToValue(currentValue: any) {
  if (Array.isArray(currentValue)) {
    return Array.from(new Set([...currentValue, 'instagram']));
  }

  if (typeof currentValue === 'string' && currentValue.trim()) {
    return Array.from(new Set([currentValue.toLowerCase(), 'instagram']));
  }

  return ['instagram'];
}

function getInstagramMediaId(result: any) {
  return result?.id || result?.media_id || result?.data?.id || null;
}

function buildCaption(body: InstagramPublishBody) {
  const message = cleanText(body.message || body.text);

  if (message) return message;

  const caption = cleanText(body.caption);
  const cta = cleanText(body.cta);
  const hashtags = Array.isArray(body.hashtags) ? body.hashtags.join(' ') : '';

  return [caption, cta ? `CTA: ${cta}` : '', hashtags].filter(Boolean).join('\n\n').trim();
}

async function createInstagramMediaContainer({
  instagramBusinessAccountId,
  instagramAccessToken,
  caption,
  mediaUrl,
  mediaType,
}: {
  instagramBusinessAccountId: string;
  instagramAccessToken: string;
  caption: string;
  mediaUrl: string;
  mediaType: string;
}) {
  const params = new URLSearchParams();

  params.set('access_token', instagramAccessToken);
  params.set('caption', caption);

  if (isImageMedia(mediaType)) {
    params.set('image_url', mediaUrl);
  } else if (isVideoMedia(mediaType)) {
    params.set('media_type', 'REELS');
    params.set('video_url', mediaUrl);
  } else {
    throw new Error('Instagram needs an image or video file.');
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${instagramBusinessAccountId}/media`,
    {
      method: 'POST',
      body: params,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.error?.message || result?.message || 'Instagram media upload failed.'
    );
  }

  const containerId = result?.id;

  if (!containerId) {
    throw new Error('Instagram did not return a media container ID.');
  }

  return containerId;
}

async function waitForInstagramContainer({
  containerId,
  instagramAccessToken,
}: {
  containerId: string;
  instagramAccessToken: string;
}) {
  const maxAttempts = 18;
  const delayMs = 4000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const params = new URLSearchParams();

    params.set('access_token', instagramAccessToken);
    params.set('fields', 'status_code,status');

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${containerId}?${params.toString()}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error?.message || result?.message || 'Could not check Instagram media status.'
      );
    }

    const statusCode = String(result?.status_code || '').toUpperCase();

    if (statusCode === 'FINISHED') {
      return;
    }

    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
      throw new Error(result?.status || 'Instagram could not process this media.');
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Instagram is still preparing the media. Please try publishing again shortly.');
}

async function publishInstagramMediaContainer({
  instagramBusinessAccountId,
  instagramAccessToken,
  creationId,
}: {
  instagramBusinessAccountId: string;
  instagramAccessToken: string;
  creationId: string;
}) {
  const params = new URLSearchParams();

  params.set('access_token', instagramAccessToken);
  params.set('creation_id', creationId);

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${instagramBusinessAccountId}/media_publish`,
    {
      method: 'POST',
      body: params,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || result?.message || 'Instagram publish failed.');
  }

  return result;
}

async function publishScheduledPostToInstagram(post: any) {
  const instagramBusinessAccountId = cleanText(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID);
  const instagramAccessToken = cleanText(process.env.INSTAGRAM_ACCESS_TOKEN);

  if (!instagramBusinessAccountId || !instagramAccessToken) {
    throw new Error('Instagram account ID or access token is missing.');
  }

  const body: InstagramPublishBody = {
    postId: post.id,
    message: buildPostText(post),
    caption: post.caption || '',
    cta: post.cta || '',
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
    mediaUrl: post.media_url || null,
    mediaType: post.media_type || null,
  };

  const caption = buildCaption(body);
  const mediaUrl = cleanText(body.mediaUrl || body.media_url);
  const mediaType = cleanText(body.mediaType || body.media_type);

  if (!caption) {
    throw new Error('Instagram post wording is required.');
  }

  if (!mediaUrl) {
    throw new Error('Instagram needs an image or video before publishing.');
  }

  if (!isImageMedia(mediaType) && !isVideoMedia(mediaType)) {
    throw new Error('Instagram needs an image or video before publishing.');
  }

  const creationId = await createInstagramMediaContainer({
    instagramBusinessAccountId,
    instagramAccessToken,
    caption,
    mediaUrl,
    mediaType,
  });

  await waitForInstagramContainer({
    containerId: creationId,
    instagramAccessToken,
  });

  const publishResult = await publishInstagramMediaContainer({
    instagramBusinessAccountId,
    instagramAccessToken,
    creationId,
  });

  const instagramPostId = getInstagramMediaId(publishResult);

  if (!instagramPostId) {
    throw new Error('Instagram published the post but did not return a post ID.');
  }

  return {
    instagramPostId,
    creationId,
    publishResult,
  };
}

async function runInstagramScheduledPublish(request: NextRequest) {
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
      ?.filter((post) => isInstagramPost(post))
      .filter((post) => !isAlreadyPosted(post))
      .filter((post) => !isCurrentlyPublishing(post))
      .slice(0, MAX_POSTS_PER_RUN) || [];

  const results: Array<{
    postId: string;
    status: 'posted' | 'skipped' | 'failed';
    message?: string;
    instagramPostId?: string | null;
  }> = [];

  for (const post of candidates) {
    const postText = buildPostText(post);

    if (!postText) {
      const message = 'This scheduled Instagram post has no wording to publish.';

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

    if (!post.media_url || !post.media_type) {
      const message = 'Instagram needs an image or video before publishing.';

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
      const instagramResult = await publishScheduledPostToInstagram(post);
      const publishedTo = buildPublishedToValue(post.published_to);

      await supabase
        .from('campaign_posts')
        .update({
          is_posted: true,
          status: 'posted',
          publish_status: 'posted',
          publish_error: null,
          published_to: publishedTo,
          published_at: new Date().toISOString(),
          instagram_post_id: instagramResult.instagramPostId,
        })
        .eq('id', post.id);

      results.push({
        postId: post.id,
        status: 'posted',
        instagramPostId: instagramResult.instagramPostId,
      });
    } catch (error: any) {
      const message = error?.message || 'Scheduled Instagram publishing failed.';

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
  return runInstagramScheduledPublish(request);
}

export async function POST(request: NextRequest) {
  return runInstagramScheduledPublish(request);
}