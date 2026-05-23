import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

type InstagramPublishBody = {
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

type InstagramCredentials = {
  instagramBusinessAccountId: string;
  instagramAccessToken: string;
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
const MEDIA_BUCKET = 'campaign-assets';

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
      message: 'Could not verify account access for this Instagram publish.',
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
    message: 'Your demo has ended or your subscription is not active. Instagram publishing is locked until access is active.',
  };
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function isInstagramAuthorizationError(message: string) {
  const lowerMessage = cleanText(message).toLowerCase();

  return (
    lowerMessage.includes('authorization') ||
    lowerMessage.includes('oauth') ||
    lowerMessage.includes('access token') ||
    lowerMessage.includes('permission') ||
    lowerMessage.includes('permissions') ||
    lowerMessage.includes('session has expired') ||
    lowerMessage.includes('token has expired') ||
    lowerMessage.includes('invalid token') ||
    lowerMessage.includes('not authorized') ||
    lowerMessage.includes('does not have permission')
  );
}

function getInstagramErrorStatus(message: string) {
  const lowerMessage = cleanText(message).toLowerCase();

  if (isInstagramAuthorizationError(message)) return 401;

  if (
    lowerMessage.includes('image or video') ||
    lowerMessage.includes('media') ||
    lowerMessage.includes('caption') ||
    lowerMessage.includes('aspect ratio') ||
    lowerMessage.includes('unsupported')
  ) {
    return 400;
  }

  return 500;
}

function getFriendlyInstagramError(message: string) {
  const cleanMessage = cleanText(message);
  const lowerMessage = cleanMessage.toLowerCase();

  if (isInstagramAuthorizationError(cleanMessage)) {
    return 'Instagram could not publish because Meta authorization failed. Please reconnect Facebook and Instagram in Settings, then try again. Also check that the Instagram account is professional and linked to the connected Facebook Page.';
  }

  if (lowerMessage.includes('aspect ratio')) {
    return 'Instagram needs a square, portrait, or supported video shape. FromOne tried to prepare the image, but Instagram still rejected it. Replace the media with a square or portrait image, or post it manually.';
  }

  if (lowerMessage.includes('media') && lowerMessage.includes('unsupported')) {
    return 'Instagram could not use this media. Replace it with a square/portrait image or supported video, then try again.';
  }

  if (lowerMessage.includes('video') && lowerMessage.includes('processing')) {
    return 'Instagram is still processing this video. Try again shortly, or replace the video if it keeps failing.';
  }

  return cleanMessage || 'Instagram publish failed.';
}

function getSafeStorageName(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'instagram-image';
}

function isAlreadyInstagramSafeImage(width?: number, height?: number) {
  if (!width || !height) return false;

  const ratio = width / height;

  return ratio >= 0.8 && ratio <= 1.91;
}

async function downloadMediaBuffer(mediaUrl: string) {
  const response = await fetch(mediaUrl);

  if (!response.ok) {
    throw new Error('Could not download the image for Instagram.');
  }

  const arrayBuffer = await response.arrayBuffer();

  return Buffer.from(arrayBuffer);
}

async function createInstagramSafeImage({
  mediaUrl,
  postId,
}: {
  mediaUrl: string;
  postId?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const originalBuffer = await downloadMediaBuffer(mediaUrl);
  const image = sharp(originalBuffer, { failOn: 'none' });
  const metadata = await image.metadata();

  if (isAlreadyInstagramSafeImage(metadata.width, metadata.height)) {
    return {
      mediaUrl,
      resized: false,
      width: metadata.width || null,
      height: metadata.height || null,
      storagePath: null,
    };
  }

  const outputWidth = 1080;
  const outputHeight = 1350;

  const background = await sharp(originalBuffer, { failOn: 'none' })
    .rotate()
    .resize(outputWidth, outputHeight, {
      fit: 'cover',
      position: 'centre',
    })
    .blur(32)
    .modulate({ brightness: 0.72, saturation: 0.82 })
    .jpeg({ quality: 88 })
    .toBuffer();

  const foreground = await sharp(originalBuffer, { failOn: 'none' })
    .rotate()
    .resize(outputWidth, outputHeight, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const outputBuffer = await sharp(background)
    .composite([{ input: foreground, gravity: 'centre' }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  const safePostId = getSafeStorageName(postId || String(Date.now()));
  const storagePath = `instagram-safe/${safePostId}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, outputBuffer, {
      cacheControl: '3600',
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Could not save Instagram-safe image.');
  }

  const { data: publicUrlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

  return {
    mediaUrl: publicUrlData.publicUrl,
    resized: true,
    width: metadata.width || null,
    height: metadata.height || null,
    storagePath,
  };
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

async function findUserIdForPost({
  supabase,
  body,
}: {
  supabase: any;
  body: InstagramPublishBody;
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

async function getInstagramCredentials(body: InstagramPublishBody): Promise<InstagramCredentials> {
  const supabase = getSupabaseAdmin();

  const userId = await findUserIdForPost({
    supabase,
    body,
  });

  if (userId) {
    const { data: connection, error } = await supabase
      .from('social_connections')
      .select(
        'id, instagram_business_account_id, page_access_token, access_token, status, updated_at'
      )
      .eq('user_id', userId)
      .eq('provider', 'meta')
      .eq('status', 'connected')
      .not('instagram_business_account_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Could not load Instagram social connection:', error.message);
    }

    const connectedInstagramBusinessAccountId = cleanText(
      (connection as any)?.instagram_business_account_id
    );
    const connectedAccessToken = cleanText(
      (connection as any)?.page_access_token || (connection as any)?.access_token
    );

    if (connectedInstagramBusinessAccountId && connectedAccessToken) {
      return {
        instagramBusinessAccountId: connectedInstagramBusinessAccountId,
        instagramAccessToken: connectedAccessToken,
        source: 'social_connections',
        connectionId: cleanText((connection as any)?.id) || null,
      };
    }
  }

  const envInstagramBusinessAccountId = cleanText(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID);
  const envInstagramAccessToken = cleanText(process.env.INSTAGRAM_ACCESS_TOKEN);

  if (envInstagramBusinessAccountId && envInstagramAccessToken) {
    return {
      instagramBusinessAccountId: envInstagramBusinessAccountId,
      instagramAccessToken: envInstagramAccessToken,
      source: 'env',
      connectionId: null,
    };
  }

  throw new Error(
    userId
      ? 'No connected Instagram account was found, and fallback Instagram env vars are missing.'
      : 'Instagram account ID or access token is missing.'
  );
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

function buildPublishedToValue(currentValue: any) {
  if (Array.isArray(currentValue)) {
    return Array.from(new Set([...currentValue, 'instagram']));
  }

  if (typeof currentValue === 'string' && currentValue.trim()) {
    return Array.from(new Set([currentValue.toLowerCase(), 'instagram']));
  }

  return ['instagram'];
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

async function updatePostAfterPublish({
  postId,
  instagramPostId,
  credentialSource,
  connectionId,
}: {
  postId?: string;
  instagramPostId: string;
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
    instagram_post_id: instagramPostId,
    published_to: publishedTo,
    published_at: new Date().toISOString(),
    publish_status: 'posted',
    publish_error: null,
    is_posted: true,
    status: 'posted',
  };

  if (credentialSource) {
    updates.publish_source = credentialSource;
  }

  if (connectionId) {
    updates.social_connection_id = connectionId;
  }

  const { error } = await supabase.from('campaign_posts').update(updates).eq('id', postId);

  if (error) {
    console.error('Instagram publish saved but database update failed:', error.message);

    const fallbackUpdates = {
      instagram_post_id: instagramPostId,
      published_to: publishedTo,
      published_at: new Date().toISOString(),
      publish_status: 'posted',
      publish_error: null,
      is_posted: true,
      status: 'posted',
    };

    const { error: fallbackError } = await supabase
      .from('campaign_posts')
      .update(fallbackUpdates)
      .eq('id', postId);

    if (fallbackError) {
      console.error('Instagram publish fallback database update failed:', fallbackError.message);
    }
  }
}

export async function POST(req: NextRequest) {
  let body: InstagramPublishBody = {};

  try {
    body = await req.json();

    const postId = cleanText(body.postId || body.campaignPostId);
    const userId = await findUserIdForPost({ supabase: getSupabaseAdmin(), body });

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
        platform: 'instagram',
        action: req.headers.get('x-fromone-scheduled-publish') === 'true' ? 'scheduled_publish' : 'manual_publish',
        status: 'failed',
        message: 'Instagram publish blocked.',
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

    const caption = buildCaption(body);
    let mediaUrl = cleanText(body.mediaUrl || body.media_url);
    const mediaType = cleanText(body.mediaType || body.media_type);
    let instagramSafeImage: Awaited<ReturnType<typeof createInstagramSafeImage>> | null = null;

    if (!caption) {
      await insertPublishLog({
        userId,
        postId,
        platform: 'instagram',
        action: req.headers.get('x-fromone-scheduled-publish') === 'true' ? 'scheduled_publish' : 'manual_publish',
        status: 'failed',
        message: 'Instagram publish failed.',
        error: 'Instagram post wording is required.',
        credentialSource: null,
        socialConnectionId: null,
        metadata: {
          reason: 'missing_caption',
        },
      });

      return NextResponse.json(
        {
          error: 'Instagram post wording is required.',
        },
        { status: 400 }
      );
    }

    if (!mediaUrl) {
      await insertPublishLog({
        userId,
        postId,
        platform: 'instagram',
        action: req.headers.get('x-fromone-scheduled-publish') === 'true' ? 'scheduled_publish' : 'manual_publish',
        status: 'failed',
        message: 'Instagram publish failed.',
        error: 'Instagram needs an image or video before publishing. PDF flyers cannot be posted directly to Instagram.',
        credentialSource: null,
        socialConnectionId: null,
        metadata: {
          reason: 'missing_media',
        },
      });

      return NextResponse.json(
        {
          error: 'Instagram needs an image or video before publishing. PDF flyers cannot be posted directly to Instagram.',
        },
        { status: 400 }
      );
    }

    if (!isImageMedia(mediaType) && !isVideoMedia(mediaType)) {
      await insertPublishLog({
        userId,
        postId,
        platform: 'instagram',
        action: req.headers.get('x-fromone-scheduled-publish') === 'true' ? 'scheduled_publish' : 'manual_publish',
        status: 'failed',
        message: 'Instagram publish failed.',
        error: 'Instagram needs an image or video before publishing. PDF flyers cannot be posted directly to Instagram.',
        credentialSource: null,
        socialConnectionId: null,
        metadata: {
          reason: 'invalid_media_type',
          media_type: mediaType || null,
        },
      });

      return NextResponse.json(
        {
          error: 'Instagram needs an image or video before publishing. PDF flyers cannot be posted directly to Instagram.',
        },
        { status: 400 }
      );
    }

    if (isImageMedia(mediaType)) {
      instagramSafeImage = await createInstagramSafeImage({
        mediaUrl,
        postId,
      });

      mediaUrl = instagramSafeImage.mediaUrl;
    }

    const credentials = await getInstagramCredentials(body);

    const creationId = await createInstagramMediaContainer({
      instagramBusinessAccountId: credentials.instagramBusinessAccountId,
      instagramAccessToken: credentials.instagramAccessToken,
      caption,
      mediaUrl,
      mediaType: instagramSafeImage?.resized ? 'image/jpeg' : mediaType,
    });

    await waitForInstagramContainer({
      containerId: creationId,
      instagramAccessToken: credentials.instagramAccessToken,
    });

    const publishResult = await publishInstagramMediaContainer({
      instagramBusinessAccountId: credentials.instagramBusinessAccountId,
      instagramAccessToken: credentials.instagramAccessToken,
      creationId,
    });

    const instagramPostId = getInstagramMediaId(publishResult);

    if (!instagramPostId) {
      await insertPublishLog({
        userId,
        postId,
        platform: 'instagram',
        action: req.headers.get('x-fromone-scheduled-publish') === 'true' ? 'scheduled_publish' : 'manual_publish',
        status: 'failed',
        message: 'Instagram published but did not return a post ID.',
        error: 'Missing Instagram post ID.',
        credentialSource: credentials.source,
        socialConnectionId: credentials.connectionId || null,
        metadata: {
          creation_id: creationId,
          instagram_result: publishResult,
        },
      });

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
      credentialSource: credentials.source,
      connectionId: credentials.connectionId,
    });

    await insertPublishLog({
      userId,
      postId,
      platform: 'instagram',
      action: req.headers.get('x-fromone-scheduled-publish') === 'true' ? 'scheduled_publish' : 'manual_publish',
      status: 'posted',
      message: 'Instagram posted successfully.',
      error: null,
      credentialSource: credentials.source,
      socialConnectionId: credentials.connectionId || null,
      providerPostId: instagramPostId,
      metadata: {
        creation_id: creationId,
        media_url: mediaUrl || null,
        media_type: instagramSafeImage?.resized ? 'image/jpeg' : mediaType || null,
        instagram_safe_image_created: Boolean(instagramSafeImage?.resized),
        original_image_width: instagramSafeImage?.width || null,
        original_image_height: instagramSafeImage?.height || null,
        instagram_safe_storage_path: instagramSafeImage?.storagePath || null,
      },
    });

    return NextResponse.json({
      success: true,
      provider: 'instagram',
      postId: instagramPostId,
      instagramPostId,
      instagram_post_id: instagramPostId,
      creationId,
      credentialSource: credentials.source,
      connectionId: credentials.connectionId || null,
      instagramResult: publishResult,
    });
  } catch (error: any) {
    const rawErrorMessage = error?.message || 'Something went wrong publishing to Instagram.';
    const friendlyErrorMessage = getFriendlyInstagramError(rawErrorMessage);
    const responseStatus = getInstagramErrorStatus(rawErrorMessage);
    const isAuthorizationFailure = isInstagramAuthorizationError(rawErrorMessage);

    console.error('Instagram publish API error:', rawErrorMessage);

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
      console.error('Failed to resolve user for Instagram publish log:', userLookupError?.message);
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
        console.error('Failed to save Instagram publish error:', databaseError?.message);
      }
    }

    await insertPublishLog({
      userId,
      postId,
      platform: 'instagram',
      action: req.headers.get('x-fromone-scheduled-publish') === 'true' ? 'scheduled_publish' : 'manual_publish',
      status: 'failed',
      message: 'Instagram publish failed.',
      error: friendlyErrorMessage,
      credentialSource: null,
      socialConnectionId: null,
      metadata: {
        route: '/api/instagram/publish',
        raw_error: rawErrorMessage,
        response_status: responseStatus,
        authorization_failure: isAuthorizationFailure,
      },
    });

    return NextResponse.json(
      {
        error: friendlyErrorMessage,
        reconnectMeta: isAuthorizationFailure,
      },
      { status: responseStatus }
    );
  }
}