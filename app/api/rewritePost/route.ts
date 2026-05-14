import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

type RewriteResult = {
  caption: string;
  cta: string;
  hashtags: string[];
  image_prompt: string;
  improvement_summary: string;
};

const improvementActionLabels: Record<string, string> = {
  make_shorter: 'Make shorter',
  make_more_local: 'Make more local',
  make_sales_focused: 'Make more sales-focused',
  make_less_generic: 'Make less generic',
  different_version: 'Try a different version',
};

const improvementSummaries: Record<string, string> = {
  make_shorter: 'Shortened the post and removed extra wording.',
  make_more_local: 'Added more local relevance and customer context.',
  make_sales_focused: 'Made the benefit and call to action stronger.',
  make_less_generic: 'Made the wording more specific to the business and industry.',
  different_version: 'Created a fresh alternative version of the post.',
};

const platformCaptionLimits: Record<string, number> = {
  Facebook: 700,
  Instagram: 1200,
  'Google Business': 600,
  LinkedIn: 900,
  TikTok: 300,
  'YouTube Shorts': 350,
  'X / Twitter': 260,
  Pinterest: 500,
};

function getPlatformCaptionLimit(platform: string) {
  const cleanPlatform = String(platform || '').trim();

  if (platformCaptionLimits[cleanPlatform]) {
    return platformCaptionLimits[cleanPlatform];
  }

  const lower = cleanPlatform.toLowerCase();

  if (lower.includes('instagram')) return platformCaptionLimits.Instagram;
  if (lower.includes('google')) return platformCaptionLimits['Google Business'];
  if (lower.includes('linkedin')) return platformCaptionLimits.LinkedIn;
  if (lower.includes('tiktok')) return platformCaptionLimits.TikTok;
  if (lower.includes('youtube') || lower.includes('shorts')) {
    return platformCaptionLimits['YouTube Shorts'];
  }
  if (lower.includes('twitter') || lower === 'x') return platformCaptionLimits['X / Twitter'];
  if (lower.includes('pinterest')) return platformCaptionLimits.Pinterest;

  return platformCaptionLimits.Facebook;
}

function truncateTextToLimit(value: string, limit: number) {
  const clean = cleanText(value);

  if (clean.length <= limit) return clean;

  const trimmed = clean.slice(0, Math.max(limit - 1, 0)).trim();

  const lastSentenceEnd = Math.max(
    trimmed.lastIndexOf('.'),
    trimmed.lastIndexOf('!'),
    trimmed.lastIndexOf('?')
  );

  if (lastSentenceEnd > limit * 0.55) {
    return trimmed.slice(0, lastSentenceEnd + 1).trim();
  }

  const lastSpace = trimmed.lastIndexOf(' ');

  if (lastSpace > limit * 0.55) {
    return `${trimmed.slice(0, lastSpace).trim()}…`;
  }

  return `${trimmed}…`;
}

function enforcePlatformCaptionLimit(caption: string, platform: string) {
  return truncateTextToLimit(caption, getPlatformCaptionLimit(platform));
}

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
      .split(/[\s,]+/)
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

function normaliseRewrite(raw: any, fallbackSummary: string, platform: string): RewriteResult {
  const hashtags = ensureArray(raw.hashtags)
    .map(ensureHashtag)
    .filter(Boolean)
    .slice(0, 8);

  return {
    caption: enforcePlatformCaptionLimit(cleanText(raw.caption), platform),
    cta: cleanText(raw.cta),
    hashtags: hashtags.length ? hashtags : ['#LocalBusiness', '#SmallBusiness', '#SupportLocal'],
    image_prompt: cleanText(raw.image_prompt || raw.imagePrompt),
    improvement_summary: truncateTextToLimit(
      cleanText(raw.improvement_summary, fallbackSummary),
      120
    ),
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
  const limit = getPlatformCaptionLimit(platform);

  if (lower.includes('instagram')) {
    return `Make it visual, benefit-led, caption-friendly, and suited to an image or carousel. Keep the caption under ${limit} characters.`;
  }

  if (lower.includes('google')) {
    return `Make it direct, local, service-focused, search-friendly, and easy for a customer to act on. Keep the caption under ${limit} characters.`;
  }

  if (lower.includes('linkedin')) {
    return `Make it professional, credibility-led, useful, and authority-building without sounding stiff. Keep the caption under ${limit} characters.`;
  }

  if (lower.includes('tiktok')) {
    return `Make it a short hook plus simple video/script idea that the business owner could realistically film. Keep the caption under ${limit} characters.`;
  }

  if (lower.includes('youtube')) {
    return `Make it suitable for a short video script, with a strong first line and a simple idea the business can film. Keep the caption under ${limit} characters.`;
  }

  if (lower.includes('pinterest')) {
    return `Make it visual, inspiration-led, and suited to an image, guide, idea, or transformation. Keep the caption under ${limit} characters.`;
  }

  if (lower.includes('twitter') || lower === 'x') {
    return `Make it short, punchy, clear, and easy to post as a quick update. Keep the caption under ${limit} characters.`;
  }

  return `Make it community-friendly, trustworthy, clear, and local. Keep the caption under ${limit} characters.`;
}

function getImprovementGuidance(action: string, audienceTarget: string) {
  if (action === 'make_shorter') {
    return `
Improvement action:
Make the post shorter.

Specific instructions:
- Keep the main meaning.
- Remove filler and repetition.
- Make it quick to read.
- Keep the CTA clear.
- Caption should usually be 25 to 70 words.
`;
  }

  if (action === 'make_more_local') {
    return `
Improvement action:
Make the post more local.

Specific instructions:
- Add local trust, local customer needs, local service wording, or nearby-area relevance.
- Do not invent a town unless one is clearly supplied.
- If no exact location is supplied, use wording like "local customers", "nearby homes", "in your area", or "the local community".
- Keep it natural, not forced.
`;
  }

  if (action === 'make_sales_focused') {
    return `
Improvement action:
Make the post more sales-focused.

Specific instructions:
- Make the customer benefit clearer.
- Strengthen the reason to enquire, book, call, message, visit, or buy.
- Keep it helpful rather than pushy.
- Use a stronger CTA.
- Avoid hype and overpromising.
`;
  }

  if (action === 'make_less_generic') {
    return `
Improvement action:
Make the post less generic.

Specific instructions:
- Remove vague marketing wording.
- Add realistic customer problems, moments, concerns, or service details.
- Make it sound like it belongs to this specific type of business.
- Avoid phrases like "look no further", "elevate your", "unlock", "passionate about", and "quality service".
`;
  }

  if (action === 'different_version') {
    return `
Improvement action:
Try a different version.

Specific instructions:
- Keep the same business, platform, and general goal.
- Use a fresh angle and different wording.
- Do not repeat the original structure.
- Make it feel like a useful alternative the user could choose instead.
`;
  }

  if (audienceTarget) {
    return `
Improvement action:
Make the post more specific for this audience: ${audienceTarget}.

Specific instructions:
- Speak directly to that audience.
- Keep the original post idea, but sharpen the angle for this group.
- Use realistic needs, objections, desires, or pain points for this audience.
`;
  }

  return `
Improvement action:
Improve the post.

Specific instructions:
- Make it more useful, specific, natural, and ready to publish.
- Keep the same overall idea.
- Remove generic wording.
`;
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
            improvement_summary: { type: 'STRING' },
          },
          required: ['caption', 'cta', 'hashtags', 'image_prompt', 'improvement_summary'],
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
            'You are a premium small-business social media strategist. Improve posts so they feel specific, useful, and ready to publish. Return only valid JSON.',
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

    const improvementAction = String(body.improvementAction || '').trim();
    const improvementLabel =
      improvementActionLabels[improvementAction] || improvementAction || 'Improve post';

    const audienceTarget = String(body.audienceTarget || '').trim();

    const fallbackSummary =
      improvementSummaries[improvementAction] ||
      (audienceTarget
        ? 'Made the post more specific for the selected audience.'
        : 'Improved the post so it is clearer and more specific.');

    const businessName = String(body.businessName || 'the business').trim();
    const industry = String(body.industry || 'general business').trim();
    const platform = String(body.platform || 'Facebook').trim();
    const tone = String(body.tone || 'Professional').trim();
    const platformLimit = getPlatformCaptionLimit(platform);

    const caption = String(body.caption || '').trim();
    const cta = String(body.cta || '').trim();
    const hashtags = ensureArray(body.hashtags);
    const imagePrompt = String(body.image_prompt || body.imagePrompt || '').trim();

    if (!improvementAction && !audienceTarget) {
      return NextResponse.json(
        {
          error: 'Audience target or improvement action is required.',
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
    const improvementGuidance = getImprovementGuidance(improvementAction, audienceTarget);

    const prompt = `
You are improving a social media post for a small business.

The improved post should feel like it was written by a skilled social media manager who understands the business, the industry, the platform, and the customer.

Return ONLY valid JSON. Do not use markdown. Do not explain anything.

Return this exact JSON shape:
{
  "caption": "improved post caption",
  "cta": "short CTA",
  "hashtags": ["#Example"],
  "image_prompt": "specific image idea",
  "improvement_summary": "one short sentence explaining what changed"
}

Improvement selected:
${improvementLabel}

${improvementGuidance}

Audience target:
${audienceTarget || 'No specific audience supplied'}

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

Platform-safe caption limit:
${platformLimit} characters maximum.

Original caption:
${caption}

Original CTA:
${cta || 'No CTA provided'}

Original hashtags:
${hashtags.length ? hashtags.join(' ') : 'No hashtags provided'}

Original image idea:
${imagePrompt || 'No image idea provided'}

Rewrite rules:
- Keep the post ready to copy and paste.
- Keep the original business context.
- Make the caption specific, useful, and client-ready.
- The caption must stay under ${platformLimit} characters.
- Do not aim for the absolute maximum; make it readable and practical.
- Use realistic customer needs, objections, desires, service moments, buying triggers, or pain points for this industry.
- Keep it suitable for ${platform}.
- Avoid generic AI wording such as "look no further", "elevate your", "unlock your potential", "transform your", or "we are passionate".
- Do not add big headings.
- Do not include markdown.
- Do not use bullet-heavy formatting.
- Do not exaggerate or overpromise.
- Do not repeat the exact original caption.
- Use natural, human wording.
- Use no emojis unless the brand clearly suits them.
- Caption should usually be 45 to 120 words only if the platform limit allows it.
- If the selected improvement action asks for shorter copy, make it shorter.
- TikTok, YouTube Shorts, and X / Twitter should be especially short.
- CTA should be specific and natural.
- Hashtags must be 4 to 8 items, relevant to the industry, audience, and local/small business context.
- Hashtags must start with # and have no spaces.
- Image prompt must be practical for a small business to create, choose, or use when posting manually.
- improvement_summary must be short, clear, and no more than 14 words.
`;

    const rawResult =
      provider === 'openai'
        ? await rewriteWithOpenAI(prompt)
        : await rewriteWithGemini(prompt);

    const result = normaliseRewrite(rawResult, fallbackSummary, platform);

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
      improvement_summary: result.improvement_summary,
      audience_target: audienceTarget,
      improvement_action: improvementAction,
      provider,
      platform_caption_limit: platformLimit,
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