import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type FacebookPublishBody = {
  postId?: string;
  message?: string;
  mediaUrl?: string;
  mediaType?: string;
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
    },
  });
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function isImageMedia(mediaType: string) {
  return mediaType.toLowerCase().startsWith('image');
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

async function updatePostAfterPublish({
  postId,
  facebookPostId,
}: {
  postId?: string;
  facebookPostId: string;
}) {
  if (!postId) return;

  const supabase = getSupabaseAdmin();

  const { data: currentPost } = await supabase
    .from('campaign_posts')
    .select('published_to')
    .eq('id', postId)
    .maybeSingle();

  const currentPublishedTo = Array.isArray(currentPost?.published_to)
    ? currentPost.published_to
    : [];

  const publishedTo = Array.from(new Set([...currentPublishedTo, 'facebook']));

  const { error } = await supabase
    .from('campaign_posts')
    .update({
      facebook_post_id: facebookPostId,
      published_to: publishedTo,
      published_at: new Date().toISOString(),
      publish_status: 'published',
      publish_error: null,
      is_posted: true,
      status: 'posted',
    })
    .eq('id', postId);

  if (error) {
    console.error('Facebook publish saved but database update failed:', error.message);
  }
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

export async function POST(req: NextRequest) {
  let body: FacebookPublishBody = {};

  try {
    body = await req.json();

    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    if (!pageId || !pageAccessToken) {
      return NextResponse.json(
        {
          error: 'Facebook page ID or access token is missing.',
        },
        { status: 500 }
      );
    }

    const message = cleanText(body.message);
    const postId = cleanText(body.postId);
    const mediaUrl = cleanText(body.mediaUrl);
    const mediaType = cleanText(body.mediaType);

    if (!message) {
      return NextResponse.json(
        {
          error: 'Message is required.',
        },
        { status: 400 }
      );
    }

    let result;

    if (mediaUrl && isImageMedia(mediaType)) {
      result = await publishImagePost({
        pageId,
        pageAccessToken,
        message,
        mediaUrl,
      });
    } else {
      result = await publishTextPost({
        pageId,
        pageAccessToken,
        message,
      });
    }

    const facebookPostId = getFacebookPostId(result);

    if (!facebookPostId) {
      return NextResponse.json(
        {
          error: 'Facebook published the post but did not return a post ID.',
          details: result,
        },
        { status: 500 }
      );
    }

    await updatePostAfterPublish({
      postId,
      facebookPostId,
    });

    return NextResponse.json({
      success: true,
      provider: 'facebook',

      // Keep the old response key so existing manual publishing keeps working.
      postId: facebookPostId,

      // Add explicit Facebook keys so scheduled publishing can map this reliably.
      facebookPostId,
      facebook_post_id: facebookPostId,

      // Helpful while testing scheduled publishing.
      facebookResult: result,
    });
  } catch (error: any) {
    console.error('Facebook publish API error:', error?.message || error);

    if (body?.postId) {
      try {
        const supabase = getSupabaseAdmin();

        await supabase
          .from('campaign_posts')
          .update({
            publish_status: 'failed',
            publish_error: error?.message || 'Facebook publish failed.',
          })
          .eq('id', body.postId);
      } catch (databaseError: any) {
        console.error('Failed to save Facebook publish error:', databaseError?.message);
      }
    }

    return NextResponse.json(
      {
        error: error?.message || 'Something went wrong publishing to Facebook.',
      },
      { status: 500 }
    );
  }
}