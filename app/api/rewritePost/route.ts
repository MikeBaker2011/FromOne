import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

type RewriteResult = {
  caption: string;
  cta: string;
  hashtags: string[];
  image_prompt: string;
};

function extractJsonFromText(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('AI response did not contain valid JSON.');
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function ensureArray(value: any) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function ensureHashtag(value: string) {
  const cleaned = value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^#a-zA-Z0-9]/g, '');

  if (!cleaned) return '';

  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
}

function cleanText(value: any, fallback = '') {
  return String(value || fallback)
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normaliseRewrite(raw: any): RewriteResult {
  const hashtags = ensureArray(raw.hashtags)
    .map(ensureHashtag)
    .filter(Boolean)
    .slice(0, 8);

  return {
    caption: cleanText(raw.caption),
    cta: cleanText(raw.cta),
    hashtags: hashtags.length ? hashtags : ['#LocalBusiness', '#SmallBusiness', '#SupportLocal'],
    image_prompt: cleanText(raw.image_prompt || raw.imagePrompt),
  };
}

function getIndustryGuidance(industry: string) {
  const lower = industry.toLowerCase();

  if (lower.includes('plumb')) {
    return 'Focus on emergencies, leaks, boilers, prevention, trust, home disruption, landlord responsibilities, and fast local help.';
  }

  if (lower.includes('electric')) {
    return 'Focus on safety, reliability, inspections, repairs, upgrades, emergency callouts, landlords, homes, and small businesses.';
  }

  if (lower.includes('beauty') || lower.includes('hair') || lower.includes('salon')) {
    return 'Focus on confidence, treatments, transformations, appointments, self-care, regular clients, special occasions, and visual results.';
  }

  if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('food')) {
    return 'Focus on local diners, atmosphere, menu highlights, bookings, takeaway, specials, events, and reasons to visit.';
  }

  if (lower.includes('fitness') || lower.includes('gym') || lower.includes('coach')) {
    return 'Focus on motivation, realistic progress, confidence, beginner concerns, habits, personal goals, and approachable coaching.';
  }

  if (lower.includes('estate') || lower.includes('property')) {
    return 'Focus on trust, local market knowledge, sellers, buyers, landlords, tenants, valuations, property presentation, and decision confidence.';
  }

  if (lower.includes('sign') || lower.includes('print')) {
    return 'Focus on visibility, brand impression, shopfronts, vehicles, events, local businesses, professional finish, and practical design.';
  }

  if (lower.includes('account')) {
    return 'Focus on saving time, reducing stress, tax deadlines, clarity, compliance, small business owners, sole traders, and peace of mind.';
  }

  if (lower.includes('legal') || lower.includes('law')) {
    return 'Focus on trust, clarity, reassurance, practical guidance, protecting people or businesses, and making complex issues easier.';
  }

  if (lower.includes('mechanic') || lower.includes('garage') || lower.includes('car')) {
    return 'Focus on safety, reliability, MOTs, servicing, repairs, local drivers, family vehicles, work vans, and avoiding bigger problems.';
  }

  return 'Focus on realistic customer needs, trust, clear benefits, local relevance, service value, and reasons to take action.';
}

function getPlatformGuidance(platform: string) {
  const lower = platform.toLowerCase();

  if (lower.includes('instagram')) {
    return 'Make it visual, benefit-led, caption-friendly, and suited to an image or carousel.';
  }

  if (lower.includes('google')) {
    return 'Make it direct, local, service-focused, search-friendly, and easy for a customer to act on.';
  }

  if (lower.includes('linkedin')) {
    return 'Make it professional, credibility-led, useful, and authority-building without sounding stiff.';
  }

  if (lower.includes('tiktok')) {
    return 'Make it a short hook plus simple video/script idea that the business owner could realistically film.';
  }

  if (lower.includes('pinterest')) {
    return 'Make it visual, inspiration-led, and suited to an image, guide, idea, or transformation.';
  }

  return 'Make it community-friendly, trustworthy, clear, and local.';
}

async function rewriteWithGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in .env.local');
  }

  const response = await axios.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.62,
        maxOutputTokens: 1800,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            caption: { type: 'STRING' },
            cta: { type: 'STRING' },
            hashtags: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            image_prompt: { type: 'STRING' },
          },
          required: ['caption', 'cta', 'hashtags', 'image_prompt'],
        },
      },
    },
    {
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  try {
    return JSON.parse(text);
  } catch {
    return extractJsonFromText(text);
  }
}

async function rewriteWithOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY in .env.local');
  }

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a premium small-business social media strategist. Rewrite posts for specific audiences. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.68,
      max_tokens: 1600,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const text = response.data.choices?.[0]?.message?.content || '';

  if (!text) {
    throw new Error('OpenAI returned an empty response.');
  }

  return extractJsonFromText(text);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const provider = body.provider === 'openai' ? 'openai' : 'gemini';

    const audienceTarget = String(body.audienceTarget || '').trim();
    const businessName = String(body.businessName || 'the business').trim();
    const industry = String(body.industry || 'general business').trim();
    const platform = String(body.platform || 'Facebook').trim();
    const tone = String(body.tone || 'Professional').trim();

    const caption = String(body.caption || '').trim();
    const cta = String(body.cta || '').trim();
    const hashtags = ensureArray(body.hashtags);
    const imagePrompt = String(body.image_prompt || body.imagePrompt || '').trim();

    if (!audienceTarget) {
      return NextResponse.json(
        {
          error: 'Audience target is required.',
        },
        { status: 400 }
      );
    }

    if (!caption) {
      return NextResponse.json(
        {
          error: 'Caption is required.',
        },
        { status: 400 }
      );
    }

    const industryGuidance = getIndustryGuidance(industry);
    const platformGuidance = getPlatformGuidance(platform);

    const prompt = `
You are rewriting a social media post for a specific customer audience.

The rewritten post should feel like it was written by a skilled social media manager who understands the business, the industry, the platform, and the audience.

Return ONLY valid JSON. Do not use markdown. Do not explain anything.

Return this exact JSON shape:
{
  "caption": "rewritten post caption",
  "cta": "short CTA",
  "hashtags": ["#Example"],
  "image_prompt": "specific image idea"
}

Audience target:
${audienceTarget}

Business:
${businessName}

Industry:
${industry}

Industry guidance:
${industryGuidance}

Platform:
${platform}

Platform guidance:
${platformGuidance}

Tone:
${tone}

Original caption:
${caption}

Original CTA:
${cta || 'No CTA provided'}

Original hashtags:
${hashtags.length ? hashtags.join(' ') : 'No hashtags provided'}

Original image idea:
${imagePrompt || 'No image idea provided'}

Rewrite rules:
- Make it speak directly to ${audienceTarget}.
- Keep the original post idea, but sharpen the angle for this audience.
- Make the caption more specific, useful, and client-ready.
- Use realistic customer needs, objections, desires, or pain points for this industry.
- Keep it suitable for ${platform}.
- Avoid generic AI wording such as "look no further", "elevate your", "unlock your potential", or "we are passionate".
- Do not add big headings.
- Do not include markdown.
- Do not use bullet-heavy formatting.
- Do not exaggerate or overpromise.
- Do not repeat the exact original caption.
- Use natural, human wording.
- Use no emojis unless the brand clearly suits them.
- Caption should usually be 45 to 120 words unless ${platform} needs shorter copy.
- CTA should be specific and natural.
- Hashtags must be 4 to 8 items, relevant to the industry, audience, and local/small business context.
- Hashtags must start with # and have no spaces.
- Image prompt must be practical for a small business to create, choose, or upload.
`;

    const rawResult =
      provider === 'openai'
        ? await rewriteWithOpenAI(prompt)
        : await rewriteWithGemini(prompt);

    const result = normaliseRewrite(rawResult);

    if (!result.caption) {
      return NextResponse.json(
        {
          error: 'Rewrite did not return a caption.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      caption: result.caption,
      cta: result.cta,
      hashtags: result.hashtags,
      image_prompt: result.image_prompt,
      audience_target: audienceTarget,
      provider,
    });
  } catch (error: any) {
    console.error('Rewrite post API error:', error?.response?.data || error?.message || error);

    return NextResponse.json(
      {
        error:
          error?.response?.data?.error?.message ||
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Something went wrong rewriting the post.',
      },
      { status: 500 }
    );
  }
}