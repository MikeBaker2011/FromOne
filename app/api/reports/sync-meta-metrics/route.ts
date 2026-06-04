import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    throw new Error('Please sign in before generating a recommendation.');
  }

  const supabase = getSupabaseAnon();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.id) {
    throw new Error(error?.message || 'Please sign in before generating a recommendation.');
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

  if (first === -1 || last === -1 || last <= first) {
    return null;
  }

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

function fallbackRecommendation(best: any) {
  const platform = cleanText(best?.platform) || 'Facebook';
  const title = cleanText(best?.campaign_posts?.title) || `${platform} post`;

  return {
    title: `Create a follow-up to ${title}`,
    idea: `Use the same topic and visual style as ${title}, but make the next post more specific: show the problem, the result, and why a local customer should act now.`,
    suggestedCaption:
      'Looking for a simple way to stand out locally? Here is a closer look at how the right visuals can help more people notice your business, remember your name and take action.',
    cta: 'Message us to talk through your next project.',
    why:
      'This is based on the first tracked Meta post. As more engagement data comes in, FromOne can make this recommendation more precise.',
    platform,
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
          temperature: 0.65,
          maxOutputTokens: 700,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result?.error?.message || result?.message || 'Gemini recommendation failed.',
    );
  }

  return cleanText(result?.candidates?.[0]?.content?.parts?.[0]?.text);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const supabase = getSupabaseAdmin();

    const { data: metrics, error: metricsError } = await supabase
      .from('post_metrics')
      .select(
        'id,campaign_post_id,user_id,platform,provider_post_id,likes,comments,shares,reach,impressions,saves,engagement,synced_at,campaign_posts(id,title,platform,status,publish_status,created_at,published_at)',
      )
      .eq('user_id', user.id)
      .order('engagement', { ascending: false })
      .order('synced_at', { ascending: false })
      .limit(12);

    if (metricsError) {
      throw new Error(`Could not load report metrics: ${metricsError.message}`);
    }

    const rows = metrics || [];

    if (!rows.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'No tracked Facebook or Instagram posts found yet. Publish a post through FromOne before generating a recommendation.',
        },
        { status: 400 },
      );
    }

    const best =
      rows.find(
        (row: any) =>
          Number(row.engagement || 0) +
            Number(row.likes || 0) +
            Number(row.comments || 0) +
            Number(row.reach || 0) +
            Number(row.impressions || 0) >
          0,
      ) || rows[0];

    const context = rows
      .map((row: any, index: number) => {
        return [
          `#${index + 1}`,
          `Post title: ${cleanText(row?.campaign_posts?.title) || 'Untitled post'}`,
          `Platform: ${cleanText(row.platform) || 'unknown'}`,
          `Engagement: ${Number(row.engagement || 0)}`,
          `Likes: ${Number(row.likes || 0)}`,
          `Comments: ${Number(row.comments || 0)}`,
          `Shares: ${Number(row.shares || 0)}`,
          `Reach: ${Number(row.reach || 0)}`,
          `Impressions: ${Number(row.impressions || 0)}`,
          `Waiting for insights: ${
            Number(row.engagement || 0) +
              Number(row.likes || 0) +
              Number(row.comments || 0) +
              Number(row.reach || 0) +
              Number(row.impressions || 0) ===
            0
              ? 'yes'
              : 'no'
          }`,
        ].join('\n');
      })
      .join('\n\n');

    const prompt = `
You are FromOne, a social media assistant for small local businesses.

Create a practical next-week post recommendation based on the tracked report data below.

Rules:
- Return JSON only.
- Do not use markdown.
- Make it useful for a small UK business.
- If all current engagement is zero, explain that this is an early signal and recommend a sensible follow-up.
- Keep the caption ready to paste into a social post.
- Do not invent exact metrics that are not present.

Required JSON shape:
{
  "title": "short recommendation title",
  "idea": "one or two sentence strategy",
  "suggestedCaption": "ready to use caption, 60 to 120 words",
  "cta": "short call to action",
  "why": "why this recommendation was chosen",
  "platform": "facebook or instagram"
}

Tracked report data:
${context}
`.trim();

    let recommendation: any = null;

    try {
      const text = await callGemini(prompt);
      recommendation = extractJsonObject(text);
    } catch (error) {
      recommendation = null;
    }

    if (!recommendation) {
      recommendation = fallbackRecommendation(best);
    }

    return NextResponse.json({
      ok: true,
      message: geminiApiKey
        ? 'AI recommendation generated.'
        : 'Fallback recommendation generated because Gemini is not configured.',
      recommendation: {
        title: cleanText(recommendation.title) || fallbackRecommendation(best).title,
        idea: cleanText(recommendation.idea) || fallbackRecommendation(best).idea,
        suggestedCaption:
          cleanText(recommendation.suggestedCaption) ||
          cleanText(recommendation.caption) ||
          fallbackRecommendation(best).suggestedCaption,
        cta: cleanText(recommendation.cta) || fallbackRecommendation(best).cta,
        why: cleanText(recommendation.why) || fallbackRecommendation(best).why,
        platform: cleanText(recommendation.platform) || cleanText(best?.platform) || 'facebook',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Could not generate recommendation.',
      },
      {
        status: String(error?.message || '').includes('sign in') ? 401 : 500,
      },
    );
  }
}
