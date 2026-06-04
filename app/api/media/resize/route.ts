import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MEDIA_BUCKET = 'campaign-assets';

type ResizePresetKey =
  | 'instagram-square'
  | 'instagram-portrait'
  | 'instagram-story'
  | 'facebook-feed'
  | 'facebook-square'
  | 'facebook-story'
  | 'tiktok-vertical'
  | 'tiktok-square'
  | 'story-reel';

type ResizePreset = {
  value: ResizePresetKey;
  label: string;
  width: number;
  height: number;
};

type CropBox = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

const resizePresets: Record<ResizePresetKey, ResizePreset> = {
  'instagram-square': {
    value: 'instagram-square',
    label: 'Instagram square',
    width: 1080,
    height: 1080,
  },
  'instagram-portrait': {
    value: 'instagram-portrait',
    label: 'Instagram portrait',
    width: 1080,
    height: 1350,
  },
  'instagram-story': {
    value: 'instagram-story',
    label: 'Instagram story / reel',
    width: 1080,
    height: 1920,
  },
  'facebook-feed': {
    value: 'facebook-feed',
    label: 'Facebook feed',
    width: 1200,
    height: 630,
  },
  'facebook-square': {
    value: 'facebook-square',
    label: 'Facebook square',
    width: 1080,
    height: 1080,
  },
  'facebook-story': {
    value: 'facebook-story',
    label: 'Facebook story',
    width: 1080,
    height: 1920,
  },
  'tiktok-vertical': {
    value: 'tiktok-vertical',
    label: 'TikTok vertical',
    width: 1080,
    height: 1920,
  },
  'tiktok-square': {
    value: 'tiktok-square',
    label: 'TikTok square',
    width: 1080,
    height: 1080,
  },
  'story-reel': {
    value: 'story-reel',
    label: 'Story / Reel',
    width: 1080,
    height: 1920,
  },
};

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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normaliseCropBox(value: unknown): CropBox | null {
  if (!value || typeof value !== 'object') return null;

  const crop = value as CropBox;
  const x = Number(crop.x);
  const y = Number(crop.y);
  const width = Number(crop.width);
  const height = Number(crop.height);

  if (![x, y, width, height].every(Number.isFinite)) return null;
  if (width <= 0 || height <= 0) return null;

  return {
    x: clampNumber(x, 0, 99),
    y: clampNumber(y, 0, 99),
    width: clampNumber(width, 1, 100),
    height: clampNumber(height, 1, 100),
  };
}

function getSafeFileName(value: string) {
  return (
    cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'fromone-media'
  );
}

function getPreset(value: unknown) {
  const key = cleanText(value) as ResizePresetKey;
  return resizePresets[key] || resizePresets['instagram-portrait'];
}

async function downloadImageBuffer(mediaUrl: string) {
  const response = await fetch(mediaUrl);

  if (!response.ok) {
    throw new Error('Could not download the image for resizing.');
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType && !contentType.toLowerCase().startsWith('image/')) {
    throw new Error('Only images can be resized for social posting.');
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    throw new Error('The image file was empty.');
  }

  return buffer;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const postId = cleanText(body?.postId || body?.post_id);
    const requestedMediaUrl = cleanText(body?.mediaUrl || body?.media_url);
    const preset = getPreset(body?.preset);
    const cropBox = normaliseCropBox(body?.crop);

    const mode = cleanText(body?.mode).toLowerCase() || 'crop';
    const fitMode = cleanText(body?.fitMode || body?.fit_mode).toLowerCase();
    const rotation = Number(body?.rotation);
    const flipX = Boolean(body?.flipX ?? body?.flip_x);
    const flipY = Boolean(body?.flipY ?? body?.flip_y);
    const requestedWidth = Number(body?.outputWidth || body?.output_width);
    const requestedHeight = Number(body?.outputHeight || body?.output_height);

    const outputWidth =
      Number.isFinite(requestedWidth) && requestedWidth > 0
        ? Math.round(requestedWidth)
        : preset.width;

    const outputHeight =
      Number.isFinite(requestedHeight) && requestedHeight > 0
        ? Math.round(requestedHeight)
        : preset.height;

    const resizeFit =
      fitMode === 'contain' || mode === 'fit' ? 'contain' : 'cover';

    const supabase = getSupabaseAdmin();

    let mediaUrl = requestedMediaUrl;
    let userId = cleanText(body?.userId || body?.user_id) || 'anonymous';
    let mediaType = cleanText(body?.mediaType || body?.media_type).toLowerCase();

    if (postId) {
      const { data: post, error } = await supabase
        .from('campaign_posts')
        .select('id, user_id, media_url, media_type')
        .eq('id', postId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!post) {
        throw new Error('Post was not found.');
      }

      mediaUrl = cleanText((post as any).media_url) || mediaUrl;
      userId = cleanText((post as any).user_id) || userId;
      mediaType = cleanText((post as any).media_type).toLowerCase() || mediaType;
    }

    if (!mediaUrl) {
      throw new Error('No media URL was provided.');
    }

    if (mediaType === 'video' || mediaType === 'flyer' || mediaType === 'pdf') {
      throw new Error('Resize for social currently supports images only.');
    }

    const inputBuffer = await downloadImageBuffer(mediaUrl);
    const normalisedBuffer = await sharp(inputBuffer, { failOn: 'none' })
      .rotate()
      .toBuffer();

    const metadata = await sharp(normalisedBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Could not read the image dimensions.');
    }

    let imagePipeline = sharp(normalisedBuffer, { failOn: 'none' });

    if (Number.isFinite(rotation) && rotation !== 0) {
      imagePipeline = imagePipeline.rotate(rotation);
    }

    if (flipX) {
      imagePipeline = imagePipeline.flop();
    }

    if (flipY) {
      imagePipeline = imagePipeline.flip();
    }

    if (cropBox) {
      const cropLeft = Math.round(
        (metadata.width * clampNumber(cropBox.x || 0, 0, 99)) / 100,
      );
      const cropTop = Math.round(
        (metadata.height * clampNumber(cropBox.y || 0, 0, 99)) / 100,
      );
      const cropWidth = Math.round(
        (metadata.width * clampNumber(cropBox.width || 100, 1, 100)) / 100,
      );
      const cropHeight = Math.round(
        (metadata.height * clampNumber(cropBox.height || 100, 1, 100)) / 100,
      );

      const safeLeft = clampNumber(cropLeft, 0, Math.max(metadata.width - 1, 0));
      const safeTop = clampNumber(cropTop, 0, Math.max(metadata.height - 1, 0));
      const safeWidth = clampNumber(cropWidth, 1, metadata.width - safeLeft);
      const safeHeight = clampNumber(cropHeight, 1, metadata.height - safeTop);

      imagePipeline = imagePipeline.extract({
        left: safeLeft,
        top: safeTop,
        width: safeWidth,
        height: safeHeight,
      });
    }

    const resizedBuffer = await imagePipeline
      .resize({
        width: outputWidth,
        height: outputHeight,
        fit: resizeFit,
        background: '#0f172a',
        withoutEnlargement: false,
      })
      .jpeg({
        quality: 92,
        mozjpeg: true,
      })
      .toBuffer();

    const fileBase = getSafeFileName(
      `${preset.value}-${postId || Date.now()}`,
    );
    const path = `${userId}/posts/${postId || 'manual'}/resized/${Date.now()}-${fileBase}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, resizedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(path);

    const publicUrl = publicUrlData.publicUrl;

    if (postId) {
      const { error: updateError } = await supabase
        .from('campaign_posts')
        .update({
          prepared_media_url: publicUrl,
          prepared_media_width: outputWidth,
          prepared_media_height: outputHeight,
          media_prepare_status: 'prepared',
          media_prepare_error: null,
          media_prepared_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      publicUrl,
      public_url: publicUrl,
      path,
      label: preset.label,
      preset: preset.value,
      width: outputWidth,
      height: outputHeight,
      original_width: metadata.width,
      original_height: metadata.height,
      mode,
      fit: resizeFit,
      crop: cropBox,
    });
  } catch (error: any) {
    console.error('Media resize API error:', error?.message || error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Could not resize this image.',
      },
      { status: 400 },
    );
  }
}
