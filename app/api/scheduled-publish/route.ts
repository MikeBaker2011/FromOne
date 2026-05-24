import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const cronSecret = process.env.CRON_SECRET || '';

const MAX_POSTS_PER_RUN = 8;

type ScheduledPost = {
  id: string;
  user_id: string | null;
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

function inferMediaKindFromUrl(mediaUrl?: string | null) {
  const cleanUrl = cleanText(mediaUrl).toLowerCase().split('?')[0];

  if (!cleanUrl) return '';

  if (cleanUrl.match(/\.(jpg|jpeg|png|webp|gif)$/)) return 'image';
  if (cleanUrl.match(/\.(mp4|mov|m4v|webm)$/)) return 'video';
  if (cleanUrl.match(/\.(pdf)$/)) return 'flyer';

  return '';
}

function getPublishMediaType(post: ScheduledPost) {
  const storedMediaType = cleanText(post.media_type).toLowerCase();

  if (storedMediaType.startsWith('image')) return storedMediaType;
  if (storedMediaType.startsWith('video')) return storedMediaType;
  if (storedMediaType === 'photo') return 'image';
  if (storedMediaType === 'picture') return 'image';
  if (storedMediaType === 'reel') return 'video';
  if (storedMediaType === 'movie') return 'video';
  if (storedMediaType === 'flyer' || storedMediaType === 'pdf') return 'flyer';

  return inferMediaKindFromUrl(post.media_url);
}

function canInstagramAutopostMedia(post: ScheduledPost) {
  if (!post.media_url) return false;

  const publishMediaType = getPublishMediaType(post);

  return publishMediaType.startsWith('image') || publishMediaType.startsWith('video');
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

function isFutureDate(value?: string | null) {
  if (!value) return false;
  return new Date(value).getTime() > Date.now();
}

function isPaidSubscription(status?: string | null) {
  return ['active', 'paid', 'trialing'].includes(cleanText(status).toLowerCase());
}

async function userHasActiveAccess(userId?: string | null) {
  if (!userId) {
    return {
      allowed: false,
      message: 'Post has no user_id, so autopost was skipped.',
    };
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('user_access')
    .select('subscription_status, trial_ends_at, extension_ends_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return {
      allowed: false,
      message: `Could not verify user access: ${error.message}`,
    };
  }

  if (!data) {
    return {
      allowed: false,
      message: 'No active user access record found.',
    };
  }

  if (isPaidSubscription(data.subscription_status)) {
    return {
      allowed: true,
      message: 'Subscription active.',
    };
  }

  if (isFutureDate(data.extension_ends_at)) {
    return {
      allowed: true,
      message: 'Manual extension active.',
    };
  }

  if (isFutureDate(data.trial_ends_at)) {
    return {
      allowed: true,
      message: 'Demo active.',
    };
  }

  return {
    allowed: false,
    message: 'User access has expired or subscription is cancelled.',
  };
}

async function markPostPublishing(postId: string) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('campaign_posts')
    .update({
      publish_status: 'publishing',
      status: 'publishing',
      publish_error: null,
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

  const access = await userHasActiveAccess(post.user_id);

  if (!access.allowed) {
    await markPostFailed(post.id, access.message);

    return {
      post_id: post.id,
      platform,
      status: 'skipped',
      message: access.message,
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

  const publishMediaType = getPublishMediaType(post);

  if (platform === 'instagram') {
    if (!canInstagramAutopostMedia(post)) {
      const message = post.media_url
        ? 'Instagram autopost needs an image or video. PDF flyers and unsupported media must be posted manually.'
        : 'Instagram autopost needs an image or video.';

      await markPostFailed(post.id, message);

      return {
        post_id: post.id,
        platform,
        status: 'failed',
        message,
        details: {
          media_url: post.media_url || null,
          media_type: post.media_type || null,
          inferred_media_type: publishMediaType || null,
        },
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
      media_type: publishMediaType || post.media_type || null,
      mediaType: publishMediaType || post.media_type || null,
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
        'user_id',
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
      console.log('Scheduled publish result:', result);
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
