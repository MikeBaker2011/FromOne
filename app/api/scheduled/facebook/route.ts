import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;

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

function isAuthorized(request: NextRequest) {
  if (!cronSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const headerSecret = request.headers.get('x-cron-secret') || '';
  const querySecret = request.nextUrl.searchParams.get('secret') || '';

  return bearerToken === cronSecret || headerSecret === cronSecret || querySecret === cronSecret;
}

function isFacebookPost(post: any) {
  return String(post?.platform || '').toLowerCase().includes('facebook');
}

function isAlreadyPosted(post: any) {
  return (
    post?.is_posted === true ||
    String(post?.status || '').toLowerCase() === 'posted' ||
    String(post?.publish_status || '').toLowerCase() === 'posted'
  );
}

function isCurrentlyPublishing(post: any) {
  return String(post?.publish_status || '').toLowerCase() === 'publishing';
}

function buildPostText(post: any) {
  const caption = post?.caption || '';
  const cta = post?.cta ? `CTA: ${post.cta}` : '';
  const hashtags = Array.isArray(post?.hashtags) ? post.hashtags.join(' ') : '';

  return [caption, cta, hashtags].filter(Boolean).join('\n\n').trim();
}

async function runFacebookScheduledPublish(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Unauthorized.',
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

  const publishUrl = new URL('/api/facebook/publish', request.nextUrl.origin).toString();

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
      const publishResponse = await fetch(publishUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-scheduled-publish': 'true',
        },
        body: JSON.stringify({
          postId: post.id,
          campaignPostId: post.id,
          campaign_id: post.campaign_id,
          platform: post.platform || 'Facebook',
          message: postText,
          text: postText,
          caption: post.caption || '',
          cta: post.cta || '',
          hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
          media_url: post.media_url || null,
          mediaUrl: post.media_url || null,
          media_type: post.media_type || null,
          mediaType: post.media_type || null,
        }),
      });

      const responseBody = await publishResponse.json().catch(() => null);

      if (!publishResponse.ok) {
        const message =
          responseBody?.error ||
          responseBody?.message ||
          responseBody?.details ||
          `Facebook publish failed with status ${publishResponse.status}.`;

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

      const facebookPostId =
        responseBody?.facebook_post_id ||
        responseBody?.post_id ||
        responseBody?.id ||
        responseBody?.result?.id ||
        null;

      await supabase
        .from('campaign_posts')
        .update({
          is_posted: true,
          status: 'posted',
          publish_status: 'posted',
          publish_error: null,
          published_to: 'Facebook',
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