import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAndRecordAiUsage } from '@/lib/aiUsageGuard';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const geminiApiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  '';

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return '';
  }

  return authHeader.slice('bearer '.length).trim();
}

function getSupabaseAnon() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public environment variables.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase admin environment variables.');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function requireUser(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error('Please sign in before creating a post.');
  }

  const supabase = getSupabaseAnon();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.id) {
    throw new Error(error?.message || 'Please sign in before creating a post.');
  }

  return data.user;
}

function extractJsonObject(text: string) {
  const stripped = cleanText(text)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const first = stripped.indexOf('{');
  const last = stripped.lastIndexOf('}');

  if (first === -1 || last === -1 || last <= first) return null;

  try {
    return JSON.parse(
      stripped
        .slice(first, last + 1)
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/,\s*([}\]])/g, '$1'),
    );
  } catch {
    return null;
  }
}

function safeHashtags(value: any) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean).slice(0, 12);
  }

  return cleanText(value)
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter((item) => item.startsWith('#'))
    .slice(0, 12);
}

function fallbackPost(bestPost: any, bestMetric: any) {
  const platform = cleanText(bestMetric?.platform || bestPost?.platform || 'facebook').toLowerCase();
  const originalTitle = cleanText(bestPost?.title) || 'best-performing post';

  return {
    title: `Follow-up: ${originalTitle}`,
    caption:
      'Here is another look at how the right visuals can help a local business stand out, attract attention and make a stronger first impression. If your signage, graphics or shopfront needs a refresh, this is a good time to plan it.',
    cta: 'Message us to talk through your next project.',
    hashtags: ['#LocalBusiness', '#Signage', '#BusinessMarketing'],
    platform,
    reason:
      'Created as a follow-up to the strongest tracked Meta post. More accurate recommendations will appear when engagement data grows.',
  };
}

async function callGemini(prompt: string) {
  if (!geminiApiKey) {
    throw new Error('Gemini API key is missing.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 900,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result?.error?.message || result?.message || 'Gemini post creation failed.',
    );
  }

  return cleanText(result?.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function loadBestTrackedPost(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data: metrics, error: metricsError } = await supabase
    .from('post_metrics')
    .select(
      'id,campaign_post_id,user_id,platform,provider_post_id,likes,comments,shares,reach,impressions,saves,engagement,synced_at,raw',
    )
    .eq('user_id', userId)
    .order('engagement', { ascending: false })
    .order('synced_at', { ascending: false })
    .limit(12);

  if (metricsError) {
    throw new Error(`Could not load report metrics: ${metricsError.message}`);
  }

  const metricRows = metrics || [];

  if (!metricRows.length) {
    throw new Error('No tracked Facebook or Instagram posts found yet.');
  }

  const bestMetric =
    metricRows.find(
      (row: any) =>
        Number(row.engagement || 0) +
          Number(row.likes || 0) +
          Number(row.comments || 0) +
          Number(row.reach || 0) +
          Number(row.impressions || 0) >
        0,
    ) || metricRows[0];

  const campaignPostId = cleanText((bestMetric as any).campaign_post_id);

  let bestPost: any = null;

  if (campaignPostId) {
    const { data: postRow, error: postError } = await supabase
      .from('campaign_posts')
      .select('*')
      .eq('user_id', userId)
      .eq('id', campaignPostId)
      .maybeSingle();

    if (postError) {
      throw new Error(`Could not load best campaign post: ${postError.message}`);
    }

    bestPost = postRow || null;
  }

  return {
    bestMetric,
    bestPost,
  };
}

function buildPrompt(bestPost: any, bestMetric: any) {
  const title = cleanText(bestPost?.title) || 'Untitled post';
  const caption =
    cleanText(bestPost?.caption) ||
    cleanText(bestPost?.post_caption) ||
    cleanText(bestPost?.content) ||
    cleanText(bestPost?.body);
  const cta = cleanText(bestPost?.cta || bestPost?.call_to_action);
  const hashtags = Array.isArray(bestPost?.hashtags)
    ? bestPost.hashtags.join(' ')
    : cleanText(bestPost?.hashtags);

  return `
You are FromOne, a social media assistant for small local businesses.

Create ONE fresh follow-up social media post based on the best tracked performer below.

Rules:
- Return JSON only.
- Do not use markdown.
- Make the new post similar in style and intent, but do not copy the original.
- Keep it suitable for a small UK local business.
- The caption should be ready to publish.
- Keep it practical, friendly and local.
- Do not invent fake performance numbers.

Required JSON:
{
  "title": "short post title",
  "caption": "ready-to-use social caption, 70 to 130 words",
  "cta": "short call to action",
  "hashtags": ["#Example", "#Example"],
  "platform": "facebook or instagram",
  "reason": "why this post was created from the best performer"
}

Best tracked post:
Title: ${title}
Platform: ${cleanText(bestMetric?.platform || bestPost?.platform || 'facebook')}
Original caption: ${caption || 'Not available'}
Original CTA: ${cta || 'Not available'}
Original hashtags: ${hashtags || 'Not available'}

Metrics:
Engagement: ${Number(bestMetric?.engagement || 0)}
Likes: ${Number(bestMetric?.likes || 0)}
Comments: ${Number(bestMetric?.comments || 0)}
Shares: ${Number(bestMetric?.shares || 0)}
Reach: ${Number(bestMetric?.reach || 0)}
Impressions: ${Number(bestMetric?.impressions || 0)}
`.trim();
}

async function createDraftPost({
  userId,
  sourcePost,
  sourceMetric,
  created,
}: {
  userId: string;
  sourcePost: any;
  sourceMetric: any;
  created: any;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const platform = cleanText(created.platform || sourceMetric?.platform || sourcePost?.platform || 'facebook').toLowerCase();
  const hashtags = safeHashtags(created.hashtags);

  const insertRow: Record<string, any> = {
    user_id: userId,
    title: cleanText(created.title) || 'Follow-up post',
    platform,
    caption: cleanText(created.caption),
    cta: cleanText(created.cta),
    hashtags,
    status: 'ready',
    publish_status: 'draft',
    approval_status: 'needs_review',
    is_posted: false,
    source: 'reports_best_performer',
    created_at: now,
    updated_at: now,
  };

  if (sourcePost?.business_id) insertRow.business_id = sourcePost.business_id;
  if (sourcePost?.campaign_id) insertRow.campaign_id = sourcePost.campaign_id;
  if (sourcePost?.media_url) insertRow.media_url = sourcePost.media_url;
  if (sourcePost?.image_url) insertRow.image_url = sourcePost.image_url;
  if (sourcePost?.media_type) insertRow.media_type = sourcePost.media_type;
  if (sourcePost?.original_media_type) insertRow.original_media_type = sourcePost.original_media_type;

  // If your table does not have one of the optional columns above, this insert
  // may fail. The error will name the missing column so it can be removed.
  const { data, error } = await supabase
    .from('campaign_posts')
    .insert(insertRow)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Could not save new draft post: ${error.message}`);
  }

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);

    await checkAndRecordAiUsage({
      userId: user.id,
      userEmail: user.email,
      feature: 'reports_recommendation',
    });

    const { bestMetric, bestPost } = await loadBestTrackedPost(user.id);
    let created: any = null;

    try {
      const text = await callGemini(buildPrompt(bestPost, bestMetric));
      created = extractJsonObject(text);
    } catch {
      created = null;
    }

    if (!created) {
      created = fallbackPost(bestPost, bestMetric);
    }

    const saved = await createDraftPost({
      userId: user.id,
      sourcePost: bestPost,
      sourceMetric: bestMetric,
      created,
    });

    return NextResponse.json({
      ok: true,
      postId: saved.id,
      message: 'Draft post created from your best performer.',
      post: {
        id: saved.id,
        title: cleanText(created.title),
        platform: cleanText(created.platform || bestMetric?.platform),
        reason: cleanText(created.reason),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Could not create post from best performer.',
      },
      {
        status: error?.status || (String(error?.message || '').includes('sign in') ? 401 : 500),
      },
    );
  }
}
