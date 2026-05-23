import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type FacebookPublishBody = {
  postId?: string;
  campaignPostId?: string;
  campaign_id?: string;
  userId?: string;
  user_id?: string;
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
      message: 'Could not verify account access for this Facebook publish.',
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
      message: `Could not verify account access: ${error.message}`,
    };
  }

  if (!data) {
    return {
      allowed: false,
      message: 'No active account access record found.',
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
    message: 'Your demo has ended or your subscription is not active. Facebook publishing is locked until access is active.',
  };
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function isImageMedia(mediaType: string) {
  return mediaType.toLowerCase().startsWith('image');
}

function buildMessage(body: FacebookPublishBody) {
  const message = cleanText(body.message || body.text);

  if (message) return message;

  const caption = cleanText(body.caption);
  const cta = cleanText(body.cta);
  const hashtags = Array.isArray(body.hashtags) ? body.hashtags.join(' ') : '';

  return [caption, cta ? `CTA: ${cta}` : '', hashtags].filter(Boolean).join('\n\n').trim();
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

function isInvalidMetaTokenError(message?: string | null) {
  const lowerMessage = cleanText(message).toLowerCase();

  return (
    lowerMessage.includes('error validating access token') ||
    lowerMessage.includes('session is invalid') ||
    lowerMessage.includes('user logged out') ||
    lowerMessage.includes('access token') && lowerMessage.includes('invalid') ||
    lowerMessage.includes('oauth') && lowerMessage.includes('token')
  );
}

function getFriendlyFacebookError(message?: string | null) {
  if (isInvalidMetaTokenError(message)) {
    return 'Facebook connection has expired. Please reconnect Facebook and Instagram in Settings, then try again.';
  }

  return cleanText(message) || 'Facebook publish failed.';
}

async function markMetaConnectionExpired(connectionId?: string | null, userId?: string | null) {
  try {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('social_connections')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('provider', 'meta');

    if (connectionId) {
      query = query.eq('id', connectionId);
    } else if (userId) {
      query = query.eq('user_id', userId).eq('status', 'connected');
    } else {
      return;
    }

    const { error } = await query;

    if (error) {
      console.error('Could not mark Meta connection expired:', error.message);
    }
  } catch (markError: any) {
    console.error('Meta connection expiry update failed:', markError?.message || markError);
  }
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
  body,
}: {
  supabase: any;
  body: FacebookPublishBody;
}) {
  const explicitUserId = cleanText(body.userId || body.user_id);

  if (explicitUserId) return explicitUserId;

  const postId = cleanText(body.postId || body.campaignPostId);

  if (!postId) return '';

  const { data: post } = await supabase
    .from('campaign_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle();

  const postUserId = cleanText((post as any)?.user_id || (post as any)?.created_by);

  if (postUserId) return postUserId;

  const campaignId = cleanText((post as any)?.campaign_id || body.campaign_id);

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

async function getFacebookCredentials(body: FacebookPublishBody): Promise<FacebookCredentials> {
  const supabase = getSupabaseAdmin();

  const userId = await findUserIdForPost({
    supabase,
    body,
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
      console.error('Could not load Facebook social connection:', error.message);
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

async function updatePostAfterPublish({
  postId,
  facebookPostId,
  credentialSource,
  connectionId,
}: {
  postId?: string;
  facebookPostId: string;
  credentialSource: string;
  connectionId?: string | null;
}) {
  if (!postId) return;

  const supabase = getSupabaseAdmin();

  const { data: currentPost } = await supabase
    .from('campaign_posts')
    .select('published_to')
    .eq('id', postId)
    .maybeSingle();

  const publishedTo = buildPublishedToValue(currentPost?.published_to);

  const updates: Record<string, any> = {
    facebook_post_id: facebookPostId,
    published_to: publishedTo,
    published_at: new Date().toISOString(),
    publish_status: 'published',
    publish_error: null,
    is_posted: true,
    status: 'posted',
  };

  if (credentialSource) {
    updates.publish_source = credentialSource;
  }

  // Keep the connection ID in publish_logs and the API response.
  // Do not write social_connection_id to campaign_posts unless that column exists in Supabase.
  const { error } = await supabase.from('campaign_posts').update(updates).eq('id', postId);

  if (error) {
    console.error('Facebook publish saved but database update failed:', error.message);

    const fallbackUpdates = {
      facebook_post_id: facebookPostId,
      published_to: publishedTo,
      published_at: new Date().toISOString(),
      publish_status: 'published',
      publish_error: null,
      is_posted: true,
      status: 'posted',
    };

    const { error: fallbackError } = await supabase
      .from('campaign_posts')
      .update(fallbackUpdates)
      .eq('id', postId);

    if (fallbackError) {
      console.error('Facebook publish fallback database update failed:', fallbackError.message);
    }
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

    const postId = cleanText(body.postId || body.campaignPostId);
    const userId = await findUserIdForPost({ supabase: getSupabaseAdmin(), body });
    const publishAction =
      req.headers.get('x-fromone-scheduled-publish') === 'true'
        ? 'scheduled_publish'
        : 'manual_publish';

    const access = await userHasActiveAccess(userId);

    if (!access.allowed) {
      if (postId) {
        await getSupabaseAdmin()
          .from('campaign_posts')
          .update({
            publish_status: 'failed',
            publish_error: access.message,
            status: 'failed',
          })
          .eq('id', postId);
      }

      await insertPublishLog({
        userId,
        postId,
        platform: 'facebook',
        action: publishAction,
        status: 'failed',
        message: 'Facebook publish blocked.',
        error: access.message,
        credentialSource: null,
        socialConnectionId: null,
        metadata: {
          reason: 'access_inactive',
        },
      });

      return NextResponse.json(
        {
          error: access.message,
        },
        { status: 403 }
      );
    }

    const credentials = await getFacebookCredentials(body);

    const message = buildMessage(body);
    const mediaUrl = cleanText(body.mediaUrl || body.media_url);
    const mediaType = cleanText(body.mediaType || body.media_type);

    if (!message) {
      await insertPublishLog({
        userId,
        postId,
        platform: 'facebook',
        action: publishAction,
        status: 'failed',
        message: 'Facebook publish failed.',
        error: 'Message is required.',
        credentialSource: credentials.source,
        socialConnectionId: credentials.connectionId || null,
        metadata: {
          reason: 'missing_message',
        },
      });

      return NextResponse.json(
        {
          error: 'Message is required.',
        },
        { status: 400 }
      );
    }

    let result;
    let usedMedia = false;
    let mediaFallbackReason: string | null = null;

    if (mediaUrl && isImageMedia(mediaType)) {
      try {
        result = await publishImagePost({
          pageId: credentials.pageId,
          pageAccessToken: credentials.pageAccessToken,
          message,
          mediaUrl,
        });
        usedMedia = true;
      } catch (mediaError: any) {
        const mediaErrorMessage = mediaError?.message || 'Facebook image post failed.';

        if (isInvalidMetaTokenError(mediaErrorMessage)) {
          await markMetaConnectionExpired(credentials.connectionId, userId);
          throw new Error(getFriendlyFacebookError(mediaErrorMessage));
        }

        console.error('Facebook image publish failed. Retrying as text-only post:', mediaErrorMessage);

        mediaFallbackReason = mediaErrorMessage;

        result = await publishTextPost({
          pageId: credentials.pageId,
          pageAccessToken: credentials.pageAccessToken,
          message,
        });
      }
    } else {
      result = await publishTextPost({
        pageId: credentials.pageId,
        pageAccessToken: credentials.pageAccessToken,
        message,
      });
    }

    const facebookPostId = getFacebookPostId(result);

    if (!facebookPostId) {
      await insertPublishLog({
        userId,
        postId,
        platform: 'facebook',
        action: publishAction,
        status: 'failed',
        message: 'Facebook published but did not return a post ID.',
        error: 'Missing Facebook post ID.',
        credentialSource: credentials.source,
        socialConnectionId: credentials.connectionId || null,
        metadata: {
          facebook_result: result,
        },
      });

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
      credentialSource: credentials.source,
      connectionId: credentials.connectionId,
    });

    await insertPublishLog({
      userId,
      postId,
      platform: 'facebook',
      action: publishAction,
      status: 'posted',
      message: 'Facebook posted successfully.',
      error: null,
      credentialSource: credentials.source,
      socialConnectionId: credentials.connectionId || null,
      providerPostId: facebookPostId,
      metadata: {
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        used_media: usedMedia,
        media_fallback_reason: mediaFallbackReason,
      },
    });

    return NextResponse.json({
      success: true,
      provider: 'facebook',
      postId: facebookPostId,
      facebookPostId,
      facebook_post_id: facebookPostId,
      credentialSource: credentials.source,
      connectionId: credentials.connectionId || null,
      facebookResult: result,
    });
  } catch (error: any) {
    console.error('Facebook publish API error:', error?.message || error);

    const postId = cleanText(body?.postId || body?.campaignPostId);
    let userId = cleanText(body?.userId || body?.user_id);

    try {
      if (!userId) {
        userId = await findUserIdForPost({
          supabase: getSupabaseAdmin(),
          body,
        });
      }
    } catch (userLookupError: any) {
      console.error('Failed to resolve user for Facebook publish log:', userLookupError?.message);
    }

    const rawErrorMessage = error?.message || 'Something went wrong publishing to Facebook.';
    const friendlyErrorMessage = getFriendlyFacebookError(rawErrorMessage);

    if (isInvalidMetaTokenError(rawErrorMessage)) {
      await markMetaConnectionExpired(null, userId);
    }

    if (postId) {
      try {
        const supabase = getSupabaseAdmin();

        await supabase
          .from('campaign_posts')
          .update({
            publish_status: 'failed',
            publish_error: friendlyErrorMessage,
            status: 'failed',
          })
          .eq('id', postId);
      } catch (databaseError: any) {
        console.error('Failed to save Facebook publish error:', databaseError?.message);
      }
    }

    await insertPublishLog({
      userId,
      postId,
      platform: 'facebook',
      action: req.headers.get('x-fromone-scheduled-publish') === 'true' ? 'scheduled_publish' : 'manual_publish',
      status: 'failed',
      message: 'Facebook publish failed.',
      error: friendlyErrorMessage,
      credentialSource: null,
      socialConnectionId: null,
      metadata: {
        route: '/api/facebook/publish',
        raw_error: rawErrorMessage,
        marked_meta_connection_expired: isInvalidMetaTokenError(rawErrorMessage),
      },
    });

    return NextResponse.json(
      {
        error: friendlyErrorMessage,
      },
      { status: isInvalidMetaTokenError(rawErrorMessage) ? 401 : 500 }
    );
  }
}