import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

function isImageMedia(mediaType: string) {
  return mediaType.toLowerCase().startsWith('image');
}

function isVideoMedia(mediaType: string) {
  return mediaType.toLowerCase().startsWith('video');
}

function buildCaption(body: InstagramPublishBody) {
  const message = cleanText(body.message || body.text);

  if (message) return message;

  const caption = cleanText(body.caption);
  const cta = cleanText(body.cta);
  const hashtags = Array.isArray(body.hashtags) ? body.hashtags.join(' ') : '';

  return [caption, cta ? `CTA: ${cta}` : '', hashtags].filter(Boolean).join('\n\n').trim();
}

function getInstagramMediaId(result: any) {
  return result?.id || result?.media_id || result?.data?.id || null;
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
  mediaType,
}: {
  containerId: string;
  instagramAccessToken: string;
  mediaType: string;
}) {
  if (!isVideoMedia(mediaType)) {
    return;
  }

  const maxAttempts = 12;
  const delayMs = 5000;

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
        result?.error?.message || result?.message || 'Could not check Instagram video status.'
      );
    }

    const statusCode = String(result?.status_code || '').toUpperCase();

    if (statusCode === 'FINISHED') {
      return;
    }

    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
      throw new Error(result?.status || 'Instagram could not process this video.');
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Instagram is still processing the video. Please try publishing again shortly.');
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

function buildPublishedToValue(currentValue: any) {
  if (Array.isArray(currentValue)) {
    return Array.from(new Set([...currentValue, 'instagram']));
  }

  if (typeof currentValue === 'string' && currentValue.trim()) {
    return Array.from(new Set([currentValue.toLowerCase(), 'instagram']));
  }

  return ['instagram'];
}

async function updatePostAfterPublish({
  postId,
  instagramPostId,
}: {
  postId?: string;
  instagramPostId: string;
}) {
  if (!postId) return;

  const supabase = getSupabaseAdmin();

  const { data: currentPost } = await supabase
    .from('campaign_posts')
    .select('published_to')
    .eq('id', postId)
    .maybeSingle();

  const publishedTo = buildPublishedToValue(currentPost?.published_to);

  const { error } = await supabase
    .from('campaign_posts')
    .update({
      instagram_post_id: instagramPostId,
      published_to: publishedTo,
      published_at: new Date().toISOString(),
      publish_status: 'posted',
      publish_error: null,
      is_posted: true,
      status: 'posted',
    })
    .eq('id', postId);

  if (error) {
    console.error('Instagram publish saved but database update failed:', error.message);
  }
}

export async function POST(req: NextRequest) {
  let body: InstagramPublishBody = {};

  try {
    body = await req.json();

    const instagramBusinessAccountId = cleanText(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID);
    const instagramAccessToken = cleanText(process.env.INSTAGRAM_ACCESS_TOKEN);

    if (!instagramBusinessAccountId || !instagramAccessToken) {
      return NextResponse.json(
        {
          error: 'Instagram account ID or access token is missing.',
        },
        { status: 500 }
      );
    }

    const postId = cleanText(body.postId);
    const caption = buildCaption(body);
    const mediaUrl = cleanText(body.mediaUrl || body.media_url);
    const mediaType = cleanText(body.mediaType || body.media_type);

    if (!caption) {
      return NextResponse.json(
        {
          error: 'Instagram post wording is required.',
        },
        { status: 400 }
      );
    }

    if (!mediaUrl) {
      return NextResponse.json(
        {
          error: 'Instagram needs an image or video before publishing.',
        },
        { status: 400 }
      );
    }

    if (!isImageMedia(mediaType) && !isVideoMedia(mediaType)) {
      return NextResponse.json(
        {
          error: 'Instagram needs an image or video before publishing.',
        },
        { status: 400 }
      );
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
      mediaType,
    });

    const publishResult = await publishInstagramMediaContainer({
      instagramBusinessAccountId,
      instagramAccessToken,
      creationId,
    });

    const instagramPostId = getInstagramMediaId(publishResult);

    if (!instagramPostId) {
      return NextResponse.json(
        {
          error: 'Instagram published the post but did not return a post ID.',
          details: publishResult,
        },
        { status: 500 }
      );
    }

    await updatePostAfterPublish({
      postId,
      instagramPostId,
    });

    return NextResponse.json({
      success: true,
      provider: 'instagram',
      postId: instagramPostId,
      instagramPostId,
      instagram_post_id: instagramPostId,
      creationId,
      instagramResult: publishResult,
    });
  } catch (error: any) {
    console.error('Instagram publish API error:', error?.message || error);

    if (body?.postId) {
      try {
        const supabase = getSupabaseAdmin();

        await supabase
          .from('campaign_posts')
          .update({
            publish_status: 'failed',
            publish_error: error?.message || 'Instagram publish failed.',
            status: 'failed',
          })
          .eq('id', body.postId);
      } catch (databaseError: any) {
        console.error('Failed to save Instagram publish error:', databaseError?.message);
      }
    }

    return NextResponse.json(
      {
        error: error?.message || 'Something went wrong publishing to Instagram.',
      },
      { status: 500 }
    );
  }
}