import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const cronSecret = process.env.CRON_SECRET || '';

const MAX_POSTS_PER_RUN = 8;

type ScheduledPost = {
  id: string;
  campaign_id: string | null;
  platform: string | null;
  title: string | null;
  caption: string | null;
  cta: string | null;
  hashtags: string[] | string | null;
  media_url: string | null;
  media_type: string | null;
  scheduled_publish_at: string | null;
  publish_status: string | null;
  status: string | null;
  is_posted: boolean | null;
  deleted_at?: string | null;
};

type PublishResult = {
  post_id: string;
  platform: string;
  status: 'posted' | 'failed' | 'skipped';
  message: string;
  details?: any;
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

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function normalisePlatform(platform?: string | null) {
  const clean = cleanText(platform).toLowerCase();

  if (clean.includes('facebook')) return 'facebook';
  if (clean.includes('instagram')) return 'instagram';
  if (clean.includes('tiktok')) return 'tiktok';

  return clean;
}

function isPostAlreadyPosted(post: ScheduledPost) {
  return (
    post.is_posted === true ||
    cleanText(post.status).toLowerCase() === 'posted' ||
    cleanText(post.publish_status).toLowerCase() === 'posted' ||
    cleanText(post.publish_status).toLowerCase() === 'published'
  );
}

function isCurrentlyPublishing(post: ScheduledPost) {
  return (
    cleanText(post.status).toLowerCase() === 'publishing' ||
    cleanText(post.publish_status).toLowerCase() === 'publishing'
  );
}

function hashtagsToText(hashtags: ScheduledPost['hashtags']) {
  if (Array.isArray(hashtags)) return hashtags.join(' ');
  if (typeof hashtags === 'string') return hashtags;
  return '';
}

function buildPostText(post: ScheduledPost) {
  const caption = cleanText(post.caption);
  const cta = cleanText(post.cta);
  const hashtags = hashtagsToText(post.hashtags);

  return [caption, cta ? `CTA: ${cta}` : '', hashtags].filter(Boolean).join('\n\n').trim();
}

function getRequestOrigin(req: NextRequest) {
  const explicitBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_URL ||
    '';

  if (explicitBaseUrl) {
    if (explicitBaseUrl.startsWith('http://') || explicitBaseUrl.startsWith('https://')) {
      return explicitBaseUrl.replace(/\/$/, '');
    }

    return `https://${explicitBaseUrl.replace(/\/$/, '')}`;
  }

  return req.nextUrl.origin;
}

function isCronAuthorised(req: NextRequest) {
  if (!cronSecret) return true;

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const querySecret = req.nextUrl.searchParams.get('secret') || '';

  return bearerToken === cronSecret || querySecret === cronSecret;
}

async function markPostPublishing(postId: string) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('campaign_posts')
    .update({
      publish_status: 'publishing',
      status: 'publishing',
      publish_error: null,
      publishing_started_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .is('deleted_at', null)
    .neq('publish_status', 'publishing')
    .neq('status', 'posted');

  if (error) {
    throw new Error(`Could not mark post as publishing: ${error.message}`);
  }
}

async function markPostFailed(postId: string, message: string) {
  const supabase = getSupabaseAdmin();

  await supabase
    .from('campaign_posts')
    .update({
      publish_status: 'failed',
      status: 'failed',
      publish_error: message,
      publishing_started_at: null,
    })
    .eq('id', postId);
}

async function markPostPosted(postId: string, platform: string, providerPostId?: string | null) {
  const supabase = getSupabaseAdmin();

  const updates: Record<string, any> = {
    is_posted: true,
    status: 'posted',
    publish_status: 'posted',
    publish_error: null,
    published_at: new Date().toISOString(),
    publishing_started_at: null,
  };

  if (platform === 'facebook' && providerPostId) {
    updates.facebook_post_id = providerPostId;
  }

  if (platform === 'instagram' && providerPostId) {
    updates.instagram_post_id = providerPostId;
  }

  const { error } = await supabase.from('campaign_posts').update(updates).eq('id', postId);

  if (error) {
    console.error('Scheduled publish succeeded but final posted update failed:', error.message);
  }
}

async function publishScheduledPost({
  req,
  post,
}: {
  req: NextRequest;
  post: ScheduledPost;
}): Promise<PublishResult> {
  const platform = normalisePlatform(post.platform);

  if (platform !== 'facebook' && platform !== 'instagram') {
    return {
      post_id: post.id,
      platform: platform || 'unknown',
      status: 'skipped',
      message: 'Only Facebook and Instagram are autoposted. TikTok stays manual.',
    };
  }

  if (isPostAlreadyPosted(post)) {
    return {
      post_id: post.id,
      platform,
      status: 'skipped',
      message: 'Post is already posted.',
    };
  }

  if (isCurrentlyPublishing(post)) {
    return {
      post_id: post.id,
      platform,
      status: 'skipped',
      message: 'Post is already being published.',
    };
  }

  const text = buildPostText(post);

  if (!text) {
    await markPostFailed(post.id, 'This post needs wording before it can autopost.');

    return {
      post_id: post.id,
      platform,
      status: 'failed',
      message: 'This post needs wording before it can autopost.',
    };
  }

  if (platform === 'instagram') {
    const mediaType = cleanText(post.media_type).toLowerCase();

    if (!post.media_url || (!mediaType.startsWith('image') && !mediaType.startsWith('video'))) {
      await markPostFailed(post.id, 'Instagram autopost needs an image or video.');

      return {
        post_id: post.id,
        platform,
        status: 'failed',
        message: 'Instagram autopost needs an image or video.',
      };
    }
  }

  await markPostPublishing(post.id);

  const origin = getRequestOrigin(req);
  const endpoint =
    platform === 'facebook'
      ? `${origin}/api/facebook/publish`
      : `${origin}/api/instagram/publish`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fromone-scheduled-publish': 'true',
    },
    body: JSON.stringify({
      postId: post.id,
      campaignPostId: post.id,
      campaign_id: post.campaign_id,
      platform: post.platform,
      message: text,
      text,
      caption: post.caption || '',
      cta: post.cta || '',
      hashtags: Array.isArray(post.hashtags) ? post.hashtags : hashtagsToText(post.hashtags).split(/\s+/).filter(Boolean),
      media_url: post.media_url || null,
      mediaUrl: post.media_url || null,
      media_type: post.media_type || null,
      mediaType: post.media_type || null,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      result?.error ||
      result?.message ||
      `${platform === 'facebook' ? 'Facebook' : 'Instagram'} autopost failed.`;

    await markPostFailed(post.id, message);

    return {
      post_id: post.id,
      platform,
      status: 'failed',
      message,
      details: result,
    };
  }

  const providerPostId =
    platform === 'facebook'
      ? result?.facebook_post_id || result?.facebookPostId || result?.postId || null
      : result?.instagram_post_id || result?.instagramPostId || result?.postId || null;

  await markPostPosted(post.id, platform, providerPostId);

  return {
    post_id: post.id,
    platform,
    status: 'posted',
    message: `${platform === 'facebook' ? 'Facebook' : 'Instagram'} autoposted successfully.`,
    details: result,
  };
}

async function loadDuePosts() {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('campaign_posts')
    .select(
      [
        'id',
        'campaign_id',
        'platform',
        'title',
        'caption',
        'cta',
        'hashtags',
        'media_url',
        'media_type',
        'scheduled_publish_at',
        'publish_status',
        'status',
        'is_posted',
        'deleted_at',
      ].join(', ')
    )
    .lte('scheduled_publish_at', now)
    .is('deleted_at', null)
    .order('scheduled_publish_at', { ascending: true })
    .limit(MAX_POSTS_PER_RUN);

  if (error) {
    throw new Error(error.message);
  }

  const duePosts = (data || []) as unknown as ScheduledPost[];

  return duePosts.filter((post) => {
    const platform = normalisePlatform(post.platform);

    if (platform !== 'facebook' && platform !== 'instagram') return false;
    if (isPostAlreadyPosted(post)) return false;
    if (isCurrentlyPublishing(post)) return false;

    return true;
  });
}

async function handleScheduledPublish(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json(
      {
        error: 'Unauthorised scheduled publish request.',
      },
      { status: 401 }
    );
  }

  const posts = await loadDuePosts();
  const results: PublishResult[] = [];

  for (const post of posts) {
    try {
      const result = await publishScheduledPost({ req, post });
      results.push(result);
    } catch (error: any) {
      const message = error?.message || 'Scheduled publish failed.';

      await markPostFailed(post.id, message);

      results.push({
        post_id: post.id,
        platform: normalisePlatform(post.platform),
        status: 'failed',
        message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    checked_at: new Date().toISOString(),
    due_posts: posts.length,
    posted: results.filter((item) => item.status === 'posted').length,
    failed: results.filter((item) => item.status === 'failed').length,
    skipped: results.filter((item) => item.status === 'skipped').length,
    results,
  });
}

export async function GET(req: NextRequest) {
  return handleScheduledPublish(req);
}

export async function POST(req: NextRequest) {
  return handleScheduledPublish(req);
}
