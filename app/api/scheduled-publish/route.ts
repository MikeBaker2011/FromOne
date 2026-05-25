import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const cronSecret = process.env.CRON_SECRET || '';
const scheduledPublishingEnabled =
  String(process.env.SCHEDULED_PUBLISHING_ENABLED || '').toLowerCase() === 'true';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

type ScheduledPost = {
  id: string;
  user_id?: string | null;
  campaign_id?: string | null;
  platform?: string | null;
  caption?: string | null;
  cta?: string | null;
  hashtags?: string[] | string | null;
  media_url?: string | null;
  media_type?: string | null;
  prepared_media_url?: string | null;
  scheduled_publish_at?: string | null;
  publish_status?: string | null;
  status?: string | null;
  is_posted?: boolean | null;
};

type ScheduledPublishResult = {
  postId: string;
  platform: string;
  status: 'posted' | 'failed' | 'skipped';
  code?: string;
  message: string;
};

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables.');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isCronAuthorised(req: NextRequest) {
  if (!cronSecret) return false;

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const querySecret = req.nextUrl.searchParams.get('secret') || '';

  return bearerToken === cronSecret || querySecret === cronSecret;
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function normalisePlatform(platform?: string | null) {
  const cleanPlatform = cleanText(platform).toLowerCase();

  if (cleanPlatform.includes('facebook')) return 'facebook';
  if (cleanPlatform.includes('instagram')) return 'instagram';
  if (cleanPlatform.includes('tiktok')) return 'tiktok';

  return cleanPlatform || 'unknown';
}

function hashtagsToArray(value: ScheduledPost['hashtags']) {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);

  if (typeof value === 'string') {
    return value
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildPostText(post: ScheduledPost) {
  const caption = cleanText(post.caption);
  const cta = cleanText(post.cta);
  const hashtags = hashtagsToArray(post.hashtags).join(' ');

  return [caption, cta ? `CTA: ${cta}` : '', hashtags]
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function getPublishEndpoint(platform: string) {
  if (platform === 'facebook') return '/api/facebook/publish';
  if (platform === 'instagram') return '/api/instagram/publish';
  return null;
}

function getPublishMedia(post: ScheduledPost) {
  const preparedMediaUrl = cleanText(post.prepared_media_url);
  const mediaUrl = cleanText(post.media_url);

  if (preparedMediaUrl) {
    return {
      mediaUrl: preparedMediaUrl,
      mediaType: 'image',
    };
  }

  return {
    mediaUrl,
    mediaType: cleanText(post.media_type),
  };
}

async function markPostFailed(postId: string, message: string, code?: string) {
  const supabase = getSupabaseAdmin();

  await supabase
    .from('campaign_posts')
    .update({
      publish_status: 'failed',
      status: 'failed',
      publish_error: code ? `${code}: ${message}` : message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);
}

async function markPostSkipped(postId: string, message: string, code?: string) {
  const supabase = getSupabaseAdmin();

  await supabase
    .from('campaign_posts')
    .update({
      publish_status: 'skipped',
      status: 'ready',
      publish_error: code ? `${code}: ${message}` : message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);
}

async function loadDuePosts(limit: number) {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('campaign_posts')
    .select('*')
    .not('scheduled_publish_at', 'is', null)
    .lte('scheduled_publish_at', nowIso)
    .neq('publish_status', 'posted')
    .neq('publish_status', 'published')
    .neq('status', 'posted')
    .eq('is_posted', false)
    .is('deleted_at', null)
    .order('scheduled_publish_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message || 'Could not load due scheduled posts.');
  }

  return (data || []) as ScheduledPost[];
}

async function publishDuePost({
  req,
  post,
}: {
  req: NextRequest;
  post: ScheduledPost;
}): Promise<ScheduledPublishResult> {
  const platform = normalisePlatform(post.platform);
  const endpoint = getPublishEndpoint(platform);

  if (!endpoint) {
    const message =
      platform === 'tiktok'
        ? 'TikTok is manual posting only for now.'
        : 'This platform is not supported for scheduled autopublish.';

    await markPostSkipped(post.id, message, 'UNSUPPORTED_PLATFORM');

    return {
      postId: post.id,
      platform,
      status: 'skipped',
      code: 'UNSUPPORTED_PLATFORM',
      message,
    };
  }

  const text = buildPostText(post);

  if (!text) {
    const message = 'This post needs wording before it can be scheduled published.';

    await markPostFailed(post.id, message, 'MESSAGE_REQUIRED');

    return {
      postId: post.id,
      platform,
      status: 'failed',
      code: 'MESSAGE_REQUIRED',
      message,
    };
  }

  const { mediaUrl, mediaType } = getPublishMedia(post);

  if (platform === 'instagram' && !mediaUrl) {
    const message = 'Instagram scheduled publishing needs an image or video.';

    await markPostFailed(post.id, message, 'MEDIA_REQUIRED');

    return {
      postId: post.id,
      platform,
      status: 'failed',
      code: 'MEDIA_REQUIRED',
      message,
    };
  }

  const response = await fetch(new URL(endpoint, req.nextUrl.origin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fromone-scheduled-publish': 'true',
    },
    body: JSON.stringify({
      postId: post.id,
      campaignPostId: post.id,
      campaign_id: post.campaign_id || null,
      userId: post.user_id || null,
      user_id: post.user_id || null,
      platform: post.platform || platform,
      message: text,
      text,
      caption: post.caption || '',
      cta: post.cta || '',
      hashtags: hashtagsToArray(post.hashtags),
      media_url: mediaUrl || null,
      mediaUrl: mediaUrl || null,
      media_type: mediaType || null,
      mediaType: mediaType || null,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result?.ok === false || result?.success === false) {
    const message =
      cleanText(result?.message || result?.error) ||
      `Could not scheduled publish to ${platform}.`;
    const code = cleanText(result?.code) || 'PUBLISH_FAILED';

    await markPostFailed(post.id, message, code);

    return {
      postId: post.id,
      platform,
      status: 'failed',
      code,
      message,
    };
  }

  return {
    postId: post.id,
    platform,
    status: 'posted',
    code: 'POSTED',
    message: cleanText(result?.message) || `Scheduled post published to ${platform}.`,
  };
}

async function handleScheduledPublish(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Unauthorised scheduled publish request.',
      },
      { status: 401 },
    );
  }

  if (!scheduledPublishingEnabled) {
    return NextResponse.json({
      ok: true,
      success: true,
      scheduling_enabled: false,
      checked_at: new Date().toISOString(),
      due_posts: 0,
      posted: 0,
      failed: 0,
      skipped: 0,
      message:
        'Scheduled autoposting is paused for beta. Set SCHEDULED_PUBLISHING_ENABLED=true to enable it.',
      results: [],
    });
  }

  const limitParam = Number(req.nextUrl.searchParams.get('limit') || 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 25)
    : 10;

  try {
    const duePosts = await loadDuePosts(limit);
    const results: ScheduledPublishResult[] = [];

    for (const post of duePosts) {
      try {
        const result = await publishDuePost({ req, post });
        results.push(result);
      } catch (postError: any) {
        const message = postError?.message || 'Scheduled publish failed.';
        await markPostFailed(post.id, message, 'SCHEDULED_PUBLISH_FAILED');

        results.push({
          postId: post.id,
          platform: normalisePlatform(post.platform),
          status: 'failed',
          code: 'SCHEDULED_PUBLISH_FAILED',
          message,
        });
      }
    }

    const posted = results.filter((item) => item.status === 'posted').length;
    const failed = results.filter((item) => item.status === 'failed').length;
    const skipped = results.filter((item) => item.status === 'skipped').length;

    return NextResponse.json({
      ok: true,
      success: true,
      scheduling_enabled: true,
      checked_at: new Date().toISOString(),
      due_posts: duePosts.length,
      posted,
      failed,
      skipped,
      message:
        duePosts.length === 0
          ? 'No scheduled posts are due.'
          : `Checked ${duePosts.length} due scheduled post${
              duePosts.length === 1 ? '' : 's'
            }.`,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        scheduling_enabled: true,
        checked_at: new Date().toISOString(),
        code: 'SCHEDULED_PUBLISH_ERROR',
        error: error?.message || 'Scheduled publishing failed.',
        message: error?.message || 'Scheduled publishing failed.',
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handleScheduledPublish(req);
}

export async function POST(req: NextRequest) {
  return handleScheduledPublish(req);
}