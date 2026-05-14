import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

type Provider = 'openai' | 'gemini';

type BrandColours = {
  primary: string;
  secondary: string;
  accent: string;
};

type BusinessProfileResult = {
  business_name: string;
  industry: string;
  location: string;
  services: string[];
  target_audience: string[];
  tone_of_voice: string;
  content_pillars: string[];
  main_offer: string;
  business_goals: string[];
  brand_primary_color: string;
  brand_secondary_color: string;
  brand_accent_color: string;
  brand_logo_url: string | null;
  brand_summary: string;
  campaign_idea: string;
};

type GeneratedPost = {
  day: string;
  platform: string;
  title: string;
  caption: string;
  cta: string;
  hashtags: string[];
  image_prompt: string;
};

type GenerateResult = {
  posts: GeneratedPost[];
  businessProfile: BusinessProfileResult;
};

const defaultPlatformPlan = [
  'Facebook',
  'Instagram',
  'Google Business',
  'LinkedIn',
  'Instagram',
  'TikTok',
  'Facebook',
];

const allowedPlatformOptions = [
  'Facebook',
  'Instagram',
  'Google Business',
  'LinkedIn',
  'TikTok',
  'YouTube Shorts',
  'X / Twitter',
  'Pinterest',
];

const weeklyAngles = [
  'Trust and credibility',
  'Service spotlight',
  'Helpful tip or education',
  'Customer pain point',
  'Offer or enquiry driver',
  'Behind-the-scenes or personality',
  'Reminder, social proof, or local CTA',
];

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

const fallbackColours: BrandColours = {
  primary: '#2f80ed',
  secondary: '#101420',
  accent: '#27ae60',
};

function getPlatformCaptionLimit(platform: string) {
  return platformCaptionLimits[platform] || 700;
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

function buildPlatformLimitGuide(platforms: string[]) {
  const uniquePlatforms = Array.from(new Set(platforms));

  return uniquePlatforms
    .map((platform) => `- ${platform}: maximum ${getPlatformCaptionLimit(platform)} characters`)
    .join('\n');
}

function normaliseSelectedPlatforms(value: any) {
  const rawPlatforms = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const cleanedPlatforms = rawPlatforms
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
    .filter((platform: string) => allowedPlatformOptions.includes(platform));

  const uniquePlatforms = Array.from(new Set(cleanedPlatforms));

  return uniquePlatforms.length > 0 ? uniquePlatforms : defaultPlatformPlan;
}

function getPlatformForDay(platforms: string[], index: number) {
  return platforms[index % platforms.length] || defaultPlatformPlan[index] || 'Facebook';
}

function buildSelectedPlatformPlan(platforms: string[]) {
  return Array.from({ length: 7 }).map((_, index) => ({
    day: `Day ${index + 1}`,
    platform: getPlatformForDay(platforms, index),
    angle: weeklyAngles[index] || 'Helpful business post',
  }));
}

function getFallbackHashtags(marketReach = 'Local customers') {
  const reach = marketReach.toLowerCase();

  if (reach.includes('nationwide')) {
    return ['#UKBusiness', '#SmallBusiness', '#BusinessGrowth', '#Marketing'];
  }

  if (reach.includes('online')) {
    return ['#OnlineBusiness', '#SmallBusiness', '#DigitalMarketing', '#Marketing'];
  }

  return ['#LocalBusiness', '#SmallBusiness', '#SupportLocal', '#Marketing'];
}

function cleanWebsiteText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

function normaliseWebsiteUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function makeAbsoluteUrl(url: string | null, website: string) {
  if (!url) return null;

  try {
    return new URL(url, website).toString();
  } catch {
    return url;
  }
}

function extractLogoUrl(html: string, website: string) {
  const logoPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i,
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i,
    /<img[^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["'][^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["']/i,
  ];

  for (const pattern of logoPatterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return makeAbsoluteUrl(match[1], website);
    }
  }

  return null;
}

function extractCssUrls(html: string, website: string) {
  const urls: string[] = [];
  const linkPattern =
    /<link[^>]+rel=["'][^"']*stylesheet[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/gi;

  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    if (match[1]) {
      const absoluteUrl = makeAbsoluteUrl(match[1], website);

      if (absoluteUrl) {
        urls.push(absoluteUrl);
      }
    }
  }

  return Array.from(new Set(urls)).slice(0, 8);
}

async function getExternalCss(cssUrls: string[]) {
  const cssResults = await Promise.allSettled(
    cssUrls.map(async (url) => {
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FromOneBot/1.0; +https://fromone.app)',
        },
      });

      return String(response.data || '');
    })
  );

  return cssResults
    .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
    .map((result) => result.value)
    .join('\n')
    .slice(0, 60000);
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);

  const f = (n: number) => {
    const colour = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * colour)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function normaliseHex(hex: string) {
  const clean = hex.trim();

  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    const r = clean[1];
    const g = clean[2];
    const b = clean[3];

    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
    return clean.toLowerCase();
  }

  return null;
}

function colourBrightness(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return (r * 299 + g * 587 + b * 114) / 1000;
}

function isUsefulBrandColour(hex: string) {
  const clean = hex.toLowerCase();

  const ignored = new Set([
    '#ffffff',
    '#fff',
    '#000000',
    '#000',
    '#111111',
    '#121212',
    '#171717',
    '#1a1a1a',
    '#222222',
    '#333333',
    '#444444',
    '#eeeeee',
    '#f1f1f1',
    '#f2f2f2',
    '#f3f3f3',
    '#f4f4f4',
    '#f5f5f5',
    '#f6f6f6',
    '#f7f7f7',
    '#f8f8f8',
    '#f9f9f9',
    '#fafafa',
  ]);

  if (ignored.has(clean)) return false;

  const brightness = colourBrightness(clean);

  if (brightness > 245) return false;
  if (brightness < 18) return false;

  return true;
}

function countColours(colours: string[]) {
  const counts = new Map<string, number>();

  for (const colour of colours) {
    counts.set(colour, (counts.get(colour) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([colour]) => colour);
}

function extractBrandColours(source: string): BrandColours {
  const colours: string[] = [];

  const hexMatches = source.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
  for (const match of hexMatches) {
    const hex = normaliseHex(match);

    if (hex && isUsefulBrandColour(hex)) {
      colours.push(hex);
    }
  }

  const rgbPattern =
    /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)/gi;
  let rgbMatch;

  while ((rgbMatch = rgbPattern.exec(source)) !== null) {
    const hex = rgbToHex(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]));

    if (isUsefulBrandColour(hex)) {
      colours.push(hex);
    }
  }

  const hslPattern =
    /hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*[\d.]+)?\s*\)/gi;
  let hslMatch;

  while ((hslMatch = hslPattern.exec(source)) !== null) {
    const hex = hslToHex(Number(hslMatch[1]), Number(hslMatch[2]), Number(hslMatch[3]));

    if (isUsefulBrandColour(hex)) {
      colours.push(hex);
    }
  }

  const brandVariablePattern =
    /--(?:brand|primary|secondary|accent|theme|main|color|colour)[a-z0-9-]*\s*:\s*([^;]+)/gi;

  let variableMatch;

  while ((variableMatch = brandVariablePattern.exec(source)) !== null) {
    const value = variableMatch[1];
    const variableHexMatches = value.match(/#[0-9a-fA-F]{3,6}\b/g) || [];

    for (const match of variableHexMatches) {
      const hex = normaliseHex(match);

      if (hex && isUsefulBrandColour(hex)) {
        colours.unshift(hex);
      }
    }
  }

  const rankedColours = countColours(colours);

  return {
    primary: rankedColours[0] || fallbackColours.primary,
    secondary: rankedColours[1] || fallbackColours.secondary,
    accent: rankedColours[2] || rankedColours[0] || fallbackColours.accent,
  };
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

  const jsonString = cleaned.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonString);
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

function cleanText(value: any, fallback = '') {
  return String(value || fallback)
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function ensureHashtag(value: string) {
  const cleaned = value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^#a-zA-Z0-9]/g, '');

  if (!cleaned) return '';

  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
}

function fallbackBusinessProfile({
  clientName,
  industry,
  website,
  logoUrl,
  colours,
  marketReach,
}: {
  clientName: string;
  industry: string;
  website: string;
  logoUrl: string | null;
  colours: BrandColours;
  marketReach: string;
}): BusinessProfileResult {
  const reach = marketReach.toLowerCase();

  return {
    business_name: clientName || 'Website Scan Business',
    industry: industry || 'General business',
    location: reach.includes('nationwide') ? 'UK' : reach.includes('online') ? 'Online' : 'Local',
    services: [],
    target_audience: [marketReach],
    tone_of_voice: 'Professional',
    content_pillars: ['Helpful advice', 'Trust building', 'Services', 'Customer action'],
    main_offer: 'Contact us today to find out more.',
    business_goals: ['Increase awareness', 'Generate enquiries', 'Build trust'],
    brand_primary_color: colours.primary,
    brand_secondary_color: colours.secondary,
    brand_accent_color: colours.accent,
    brand_logo_url: logoUrl,
    brand_summary: website
      ? 'Brand style detected from website HTML and stylesheet scan where possible.'
      : 'Brand style based on the saved business profile.',
    campaign_idea: `Seven-day content campaign for ${marketReach.toLowerCase()}`,
  };
}

function buildFallbackPosts(
  profile: BusinessProfileResult,
  selectedPlatforms = defaultPlatformPlan,
  marketReach = 'Local customers'
): GeneratedPost[] {
  return Array.from({ length: 7 }).map((_, index) => {
    const platform = getPlatformForDay(selectedPlatforms, index);

    return {
      day: `Day ${index + 1}`,
      platform,
      title: weeklyAngles[index] || `${platform} Post`,
      caption: enforcePlatformCaptionLimit(
        `A useful ${platform} post for ${profile.business_name}, focused on ${profile.industry} and designed to build trust with ${marketReach.toLowerCase()}.`,
        platform
      ),
      cta: profile.main_offer || 'Contact us today to find out more.',
      hashtags: getFallbackHashtags(marketReach),
      image_prompt: `Create a professional image for ${profile.business_name} showing ${profile.industry} in a realistic, trustworthy way. Match the brand style.`,
    };
  });
}

function normalisePost(
  value: any,
  index: number,
  fallbackProfile: BusinessProfileResult,
  selectedPlatforms = defaultPlatformPlan,
  marketReach = 'Local customers'
): GeneratedPost {
  const fallbackPlatform = getPlatformForDay(selectedPlatforms, index);

  if (typeof value === 'string') {
    return {
      day: `Day ${index + 1}`,
      platform: fallbackPlatform,
      title: weeklyAngles[index] || `${fallbackPlatform} Post`,
      caption: enforcePlatformCaptionLimit(value, fallbackPlatform),
      cta: fallbackProfile.main_offer || 'Contact us today to find out more.',
      hashtags: getFallbackHashtags(marketReach),
      image_prompt: 'Use a clean, professional image that matches the business and post message.',
    };
  }

  const rawHashtags = ensureArray(value?.hashtags)
    .map(ensureHashtag)
    .filter(Boolean)
    .slice(0, 8);

  const aiPlatform = cleanText(value?.platform);
  const safePlatform = selectedPlatforms.includes(aiPlatform) ? aiPlatform : fallbackPlatform;

  return {
    day: value?.day || `Day ${index + 1}`,
    platform: safePlatform,
    title: cleanText(value?.title, weeklyAngles[index] || `${safePlatform} Post`),
    caption: enforcePlatformCaptionLimit(cleanText(value?.caption), safePlatform),
    cta: cleanText(value?.cta, fallbackProfile.main_offer || 'Contact us today to find out more.'),
    hashtags: rawHashtags.length ? rawHashtags : getFallbackHashtags(marketReach),
    image_prompt:
      cleanText(value?.image_prompt || value?.imagePrompt) ||
      'Use a clean, professional image that matches the business and post message.',
  };
}

function normaliseResult(
  raw: any,
  fallback: BusinessProfileResult,
  selectedPlatforms = defaultPlatformPlan,
  marketReach = 'Local customers'
): GenerateResult {
  const rawProfile = raw.businessProfile || raw.business_profile || raw.profile || raw.brief || raw;

  const businessProfile: BusinessProfileResult = {
    business_name: cleanText(rawProfile.business_name, fallback.business_name),
    industry: cleanText(rawProfile.industry, fallback.industry),
    location: cleanText(rawProfile.location, fallback.location),
    services: ensureArray(rawProfile.services).length
      ? ensureArray(rawProfile.services)
      : fallback.services,
    target_audience: ensureArray(rawProfile.target_audience).length
      ? ensureArray(rawProfile.target_audience)
      : fallback.target_audience,
    tone_of_voice: cleanText(rawProfile.tone_of_voice, fallback.tone_of_voice),
    content_pillars: ensureArray(rawProfile.content_pillars).length
      ? ensureArray(rawProfile.content_pillars)
      : fallback.content_pillars,
    main_offer: cleanText(rawProfile.main_offer, fallback.main_offer),
    business_goals: ensureArray(rawProfile.business_goals).length
      ? ensureArray(rawProfile.business_goals)
      : fallback.business_goals,
    brand_primary_color:
      normaliseHex(rawProfile.brand_primary_color || rawProfile.primary_brand_color || '') ||
      fallback.brand_primary_color,
    brand_secondary_color:
      normaliseHex(rawProfile.brand_secondary_color || rawProfile.secondary_brand_color || '') ||
      fallback.brand_secondary_color,
    brand_accent_color:
      normaliseHex(rawProfile.brand_accent_color || rawProfile.accent_brand_color || '') ||
      fallback.brand_accent_color,
    brand_logo_url:
      rawProfile.brand_logo_url || rawProfile.logo_url || fallback.brand_logo_url || null,
    brand_summary: cleanText(rawProfile.brand_summary, fallback.brand_summary),
    campaign_idea: cleanText(rawProfile.campaign_idea, fallback.campaign_idea),
  };

  const rawPosts = Array.isArray(raw.posts) ? raw.posts : [];

  const posts = rawPosts
    .slice(0, 7)
    .map((post: any, index: number) =>
      normalisePost(post, index, businessProfile, selectedPlatforms, marketReach)
    )
    .filter((post: GeneratedPost) => post.caption.trim());

  const completePosts = [...posts];

  while (completePosts.length < 7) {
    const fallbackPosts = buildFallbackPosts(businessProfile, selectedPlatforms, marketReach);
    completePosts.push(fallbackPosts[completePosts.length]);
  }

  return {
    posts: completePosts.slice(0, 7),
    businessProfile,
  };
}

async function getWebsiteHtml(website: string) {
  try {
    const response = await axios.get(website, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FromOneBot/1.0; +https://fromone.app)',
      },
    });

    return String(response.data || '');
  } catch (error: any) {
    console.error('Website scan failed:', error?.message || error);
    return '';
  }
}

function buildPrompt({
  clientName,
  industry,
  description,
  website,
  websiteContent,
  logoUrl,
  colours,
  selectedPlatforms,
  marketReach,
}: {
  clientName: string;
  industry: string;
  description: string;
  website: string;
  websiteContent: string;
  logoUrl: string | null;
  colours: BrandColours;
  selectedPlatforms: string[];
  marketReach: string;
}) {
  const selectedPlatformPlan = buildSelectedPlatformPlan(selectedPlatforms)
    .map((item) => `- ${item.day}: ${item.platform} — ${item.angle}`)
    .join('\n');

  const platformLimitGuide = buildPlatformLimitGuide(selectedPlatforms);

  return `
You are FromOne's premium social media strategist, website analyst, brand interpreter, and local business copywriter.

Your task is to create a 7-day content campaign that feels like it was written by a skilled social media manager who understands the client's industry.

The output must make a small business owner think:
"That sounds like us. That is useful. I could post that today."

Return ONLY valid JSON. Do not use markdown. Do not explain anything.

Required JSON shape:
{
  "businessProfile": {
    "business_name": "string",
    "industry": "string",
    "location": "string",
    "services": ["string"],
    "target_audience": ["string"],
    "tone_of_voice": "string",
    "content_pillars": ["string"],
    "main_offer": "string",
    "business_goals": ["string"],
    "brand_primary_color": "#000000",
    "brand_secondary_color": "#000000",
    "brand_accent_color": "#000000",
    "brand_logo_url": "string. Use empty string if no logo is found.",
    "brand_summary": "string",
    "campaign_idea": "string"
  },
  "posts": [
    {
      "day": "Day 1",
      "platform": "Facebook",
      "title": "Short clean title",
      "caption": "Ready-to-post caption.",
      "cta": "Short call to action",
      "hashtags": ["#Example", "#LocalBusiness"],
      "image_prompt": "Specific image idea"
    }
  ]
}

Selected social media platforms:
${selectedPlatforms.join(', ')}

Platform-safe caption limits:
${platformLimitGuide}

Important caption length rule:
- Every caption must stay under the platform-safe character limit for its platform.
- Do not use the absolute maximum allowed by social platforms.
- Keep captions practical, readable, and easy for a small business owner to post.
- X / Twitter must be especially short.
- TikTok and YouTube Shorts should read like short video ideas/scripts, not long captions.

Market reach:
${marketReach}

Market reach rules:
- If market reach is local, make the posts feel relevant to that area and nearby customers.
- If market reach is nationwide, avoid overly local wording and write for a wider UK audience.
- If market reach is online, focus on online enquiries, digital buying intent, ecommerce, remote services, delivery, or online conversion where relevant.

Seven-day platform and content strategy:
${selectedPlatformPlan}

Strict platform rule:
- You must only use these selected platforms: ${selectedPlatforms.join(', ')}.
- Do not create posts for platforms that are not selected.
- Spread the 7 posts naturally across the selected platforms.
- If only one platform is selected, all 7 posts should use that platform.
- If YouTube Shorts is selected, create short video script style content.
- If X / Twitter is selected, create short, punchy update-style content.
- If Pinterest is selected, create visual discovery style content.

Industry quality rules:
- Write with industry knowledge, not generic marketing fluff.
- Mention realistic customer problems, buying triggers, objections, service moments, benefits, or seasonal/local needs for the detected industry.
- Use the business services and offer where available.
- Use local trust where location is available.
- Avoid vague lines like "we are passionate about excellence" unless supported by details.
- Avoid repeated wording across posts.
- Each day must have a different purpose and angle.
- Make posts feel human, specific, and useful.

Platform rules:
- Facebook: community-friendly, clear, trustworthy, local.
- Instagram: visual, benefit-led, aspirational but not cheesy.
- Google Business: direct, local, search-friendly, clear service/update language.
- LinkedIn: credible, professional, expertise-building.
- TikTok: short hook plus simple video/script idea that a business owner could realistically film.
- YouTube Shorts: short video script, strong first line, clear scene idea, simple spoken wording.
- X / Twitter: short, punchy, clear, useful, and easy to post as a quick update.
- Pinterest: visual, searchable, inspiration-led, and image-friendly.
- Do not make short-form video content sound like a long corporate advert.

Caption style:
- Do not include "Day 1", "Day 2", platform names, or big headings inside captions.
- Do not use markdown.
- Do not use bullet-heavy formatting.
- Do not use exaggerated hype.
- Emojis are allowed only if the business tone suits them. Use none by default.
- Captions should usually be 45 to 120 words only when the platform limit allows it.
- Google Business may be shorter and more direct.
- TikTok, YouTube Shorts, and X / Twitter must be shorter where appropriate.
- Every caption must be ready to copy and paste.

CTA rules:
- Make CTAs specific and natural.
- Avoid using the same CTA seven times.
- CTAs should match the action: book, enquire, call, message, visit, request quote, learn more, reserve, order, etc.

Hashtag rules:
- Use 4 to 8 hashtags per post.
- Include industry-specific hashtags.
- Include local hashtags if location is known.
- Avoid silly or irrelevant hashtags.
- Hashtags must start with # and have no spaces.

Image prompt rules:
- Every image_prompt must be specific enough for a user to choose or create an image.
- Include subject, setting, mood, and brand style where useful.
- Avoid generic prompts like "professional image".

Brand rules:
- Use the detected brand colours provided unless the website strongly suggests otherwise.
- If logo is unclear, return an empty string.
- Brand summary should explain the style in plain language.

Business name supplied:
${clientName || 'Unknown'}

Industry supplied:
${industry || 'Unknown'}

Business profile supplied:
${description || 'No manual details provided.'}

Website:
${website || 'No website provided.'}

Detected logo URL:
${logoUrl || 'No logo detected'}

Detected brand colours from website HTML and CSS:
Primary: ${colours.primary}
Secondary: ${colours.secondary}
Accent: ${colours.accent}

Website scan content:
${websiteContent || 'No website content was available. Use the supplied business profile instead.'}

Return exactly 7 posts. Use only the selected platforms and follow the seven-day platform plan exactly.
`;
}

async function generateWithOpenAI(prompt: string) {
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
            'You are a premium social media strategist for small businesses. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.72,
      max_tokens: 4200,
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

async function generateWithGemini(prompt: string) {
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
        maxOutputTokens: 5200,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            businessProfile: {
              type: 'OBJECT',
              properties: {
                business_name: { type: 'STRING' },
                industry: { type: 'STRING' },
                location: { type: 'STRING' },
                services: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
                target_audience: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
                tone_of_voice: { type: 'STRING' },
                content_pillars: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
                main_offer: { type: 'STRING' },
                business_goals: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
                brand_primary_color: { type: 'STRING' },
                brand_secondary_color: { type: 'STRING' },
                brand_accent_color: { type: 'STRING' },
                brand_logo_url: { type: 'STRING' },
                brand_summary: { type: 'STRING' },
                campaign_idea: { type: 'STRING' },
              },
              required: [
                'business_name',
                'industry',
                'location',
                'services',
                'target_audience',
                'tone_of_voice',
                'content_pillars',
                'main_offer',
                'business_goals',
                'brand_primary_color',
                'brand_secondary_color',
                'brand_accent_color',
                'brand_logo_url',
                'brand_summary',
                'campaign_idea',
              ],
            },
            posts: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  day: { type: 'STRING' },
                  platform: { type: 'STRING' },
                  title: { type: 'STRING' },
                  caption: { type: 'STRING' },
                  cta: { type: 'STRING' },
                  hashtags: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                  },
                  image_prompt: { type: 'STRING' },
                },
                required: [
                  'day',
                  'platform',
                  'title',
                  'caption',
                  'cta',
                  'hashtags',
                  'image_prompt',
                ],
              },
            },
          },
          required: ['businessProfile', 'posts'],
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
    console.error('Gemini raw response:', text);
    throw new Error(`Gemini returned invalid JSON. Raw response starts with: ${text.slice(0, 300)}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawWebsite = String(body.website || '').trim();
    const website = normaliseWebsiteUrl(rawWebsite);
    const clientName = String(body.clientName || 'the business').trim();
    const industry = String(body.industry || 'general business').trim();
    const description = String(body.description || '').trim();
    const selectedPlatforms = normaliseSelectedPlatforms(body.platforms || body.selectedPlatforms);
    const marketReach = String(body.marketReach || 'Local customers').trim();

    const provider: Provider = body.provider === 'openai' ? 'openai' : 'gemini';

    let websiteHtml = '';
    let websiteContent = '';
    let logoUrl: string | null = null;
    let colours = fallbackColours;

    if (website) {
      websiteHtml = await getWebsiteHtml(website);
      websiteContent = cleanWebsiteText(websiteHtml);
      logoUrl = extractLogoUrl(websiteHtml, website);

      const cssUrls = extractCssUrls(websiteHtml, website);
      const externalCss = await getExternalCss(cssUrls);
      const styleBlocks = (websiteHtml.match(/<style[\s\S]*?<\/style>/gi) || []).join('\n');

      colours = extractBrandColours(`${websiteHtml}\n${styleBlocks}\n${externalCss}`);
    }

    const fallback = fallbackBusinessProfile({
      clientName,
      industry,
      website,
      logoUrl,
      colours,
      marketReach,
    });

    const prompt = buildPrompt({
      clientName,
      industry,
      description,
      website,
      websiteContent,
      logoUrl,
      colours,
      selectedPlatforms,
      marketReach,
    });

    const rawResult =
      provider === 'openai'
        ? await generateWithOpenAI(prompt)
        : await generateWithGemini(prompt);

    const result = normaliseResult(rawResult, fallback, selectedPlatforms, marketReach);

    if (!result.posts.length) {
      return NextResponse.json(
        {
          posts: [],
          businessProfile: result.businessProfile,
          selectedPlatforms,
          marketReach,
          error: 'No posts were generated.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      posts: result.posts,
      businessProfile: result.businessProfile,
      provider,
      selectedPlatforms,
      marketReach,
      usedWebsiteScan: Boolean(website && websiteContent),
      detectedBrandColours: colours,
      platformCaptionLimits,
    });
  } catch (error: any) {
    console.error('Generate posts API error:', error?.response?.data || error?.message || error);

    return NextResponse.json(
      {
        posts: [],
        error:
          error?.response?.data?.error?.message ||
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Something went wrong generating posts.',
      },
      { status: 500 }
    );
  }
}