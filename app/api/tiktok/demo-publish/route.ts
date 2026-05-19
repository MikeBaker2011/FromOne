import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

export async function POST(request: NextRequest) {
  try {
    const demoMode = cleanText(process.env.NEXT_PUBLIC_TIKTOK_DEMO_MODE) === 'true';

    if (!demoMode) {
      return NextResponse.json(
        { error: 'TikTok demo mode is not enabled.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const postId = cleanText(body.postId || body.post_id || body.campaignPostId);
    const userId = cleanText(body.userId || body.user_id);
    const caption = cleanText(body.caption || body.message || body.text);
    const mediaUrl = cleanText(body.mediaUrl || body.media_url);

    if (!postId) {
      return NextResponse.json({ error: 'Missing post ID.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const demoTikTokPostId = `tiktok_demo_${Date.now()}`;

    const updates: Record<string, any> = {
      publish_status: 'posted',
      status: 'posted',
      publish_error: null,
      is_posted: true,
      published_at: new Date().toISOString(),
      tiktok_post_id: demoTikTokPostId,
      publish_source: 'tiktok_sandbox_demo',
    };

    const { error: postUpdateError } = await supabase
      .from('campaign_posts')
      .update(updates)
      .eq('id', postId);

    if (postUpdateError) {
      console.error('TikTok demo post update error:', postUpdateError.message);
    }

    try {
      await supabase.from('publish_logs').insert({
        user_id: userId || null,
        post_id: postId,
        platform: 'tiktok',
        action: 'demo_publish',
        status: 'posted',
        message: 'TikTok sandbox demo publish complete. No live TikTok post was published.',
        error: null,
        credential_source: 'tiktok_sandbox_demo',
        provider_post_id: demoTikTokPostId,
        metadata: {
          caption,
          media_url: mediaUrl,
          demo: true,
        },
      });
    } catch (logError: any) {
      console.error('TikTok demo publish log error:', logError?.message || logError);
    }

    return NextResponse.json({
      success: true,
      provider: 'tiktok',
      demo: true,
      postId: demoTikTokPostId,
      tiktokPostId: demoTikTokPostId,
      message: 'TikTok sandbox demo publish complete. No live TikTok post was published.',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'TikTok demo publish failed.',
      },
      { status: 500 }
    );
  }
}