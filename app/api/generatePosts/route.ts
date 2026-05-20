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

type UploadedMediaContext = {
  id?: string;
  name?: string;
  type?: string;
  url?: string;
  description?: string;
  extractedText?: string;
  context?: string;
};

type InlineMediaPart = {
  uploadIndex: number;
  name: string;
  mimeType: string;
  data: string;
};

type GenerateResult = {
  posts: GeneratedPost[];
  businessProfile: BusinessProfileResult;
};

const defaultPlatformPlan = ['Facebook', 'Instagram', 'TikTok'];

const allowedPlatformOptions = ['Facebook', 'Instagram', 'TikTok'];

const weeklyAngles = [
  'Uploaded media spotlight',
  'Service or offer explanation',
  'Local trust and credibility',
  'Customer problem solved',
  'Clear enquiry driver',
  'Behind-the-scenes or proof of work',
  'Reminder, social proof, or CTA',
];

const platformCaptionLimits: Record<string, number> = {
  Facebook: 700,
  Instagram: 1200,
  TikTok: 300,
};

const fallbackColours: BrandColours = {
  primary: '#2f80ed',
  secondary: '#101420',
  accent: '#27ae60',
};

const MAX_INLINE_MEDIA_BYTES = 8 * 1024 * 1024;

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

function buildSelectedPlatformPlan(platforms: string[], postCount = 7) {
  return Array.from({ length: postCount }).map((_, index) => ({
    day: `Post ${index + 1}`,
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
    campaign_idea: `Weekly post set for ${marketReach.toLowerCase()}`,
  };
}

function buildFallbackPosts(
  profile: BusinessProfileResult,
  selectedPlatforms = defaultPlatformPlan,
  marketReach = 'Local customers',
  postCount = 7
): GeneratedPost[] {
  return Array.from({ length: postCount }).map((_, index) => {
    const platform = getPlatformForDay(selectedPlatforms, index);

    return {
      day: `Post ${index + 1}`,
      platform,
      title: weeklyAngles[index] || `${platform} Post`,
      caption: enforcePlatformCaptionLimit(
        `A useful ${platform} post for ${profile.business_name}, focused on ${profile.industry} and designed to turn this week's photo, flyer, offer, or business update into a clear reason for ${marketReach.toLowerCase()} to enquire.`,
        platform
      ),
      cta: profile.main_offer || 'Contact us today to find out more.',
      hashtags: getFallbackHashtags(marketReach),
      image_prompt: `Use the uploaded photo or flyer where available. Otherwise use a realistic ${profile.industry} image for ${profile.business_name} that supports the post and matches the brand style.`,
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
      day: `Post ${index + 1}`,
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
    day: value?.day || `Post ${index + 1}`,
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
  marketReach = 'Local customers',
  postCount = 7
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
    .slice(0, postCount)
    .map((post: any, index: number) =>
      normalisePost(post, index, businessProfile, selectedPlatforms, marketReach)
    )
    .filter((post: GeneratedPost) => post.caption.trim());

  const completePosts = [...posts];

  while (completePosts.length < postCount) {
    const fallbackPosts = buildFallbackPosts(
      businessProfile,
      selectedPlatforms,
      marketReach,
      postCount
    );
    completePosts.push(fallbackPosts[completePosts.length]);
  }

  return {
    posts: completePosts.slice(0, postCount),
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

function isVisionSupportedMedia(item: UploadedMediaContext) {
  const type = String(item.type || '').toLowerCase();
  const url = String(item.url || '').toLowerCase();
  const name = String(item.name || '').toLowerCase();

  if (type.startsWith('image/')) return true;
  if (url.match(/\.(jpg|jpeg|png|webp)(\?|$)/)) return true;
  if (name.match(/\.(jpg|jpeg|png|webp)$/)) return true;

  return false;
}

function inferMimeType(item: UploadedMediaContext, responseContentType?: string) {
  const explicitType = String(item.type || '').toLowerCase();
  const contentType = String(responseContentType || '').toLowerCase();
  const source = `${item.url || ''} ${item.name || ''}`.toLowerCase();

  if (explicitType.startsWith('image/')) return explicitType;
  if (contentType.startsWith('image/')) return contentType.split(';')[0];
  if (source.includes('.png')) return 'image/png';
  if (source.includes('.webp')) return 'image/webp';
  if (source.includes('.jpg') || source.includes('.jpeg')) return 'image/jpeg';

  return 'image/jpeg';
}

async function fetchInlineMediaParts(mediaItems: UploadedMediaContext[]) {
  const visionItems = mediaItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.url && isVisionSupportedMedia(item))
    .slice(0, 7);

  const settled = await Promise.allSettled(
    visionItems.map(async ({ item, index }) => {
      const response = await axios.get(item.url as string, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxContentLength: MAX_INLINE_MEDIA_BYTES,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FromOneBot/1.0; +https://fromone.app)',
        },
      });

      const buffer = Buffer.from(response.data);

      if (buffer.length > MAX_INLINE_MEDIA_BYTES) {
        throw new Error(`Upload ${index + 1} is too large for inline vision.`);
      }

      return {
        uploadIndex: index,
        name: item.name || `Upload ${index + 1}`,
        mimeType: inferMimeType(item, String(response.headers?.['content-type'] || '')),
        data: buffer.toString('base64'),
      } satisfies InlineMediaPart;
    })
  );

  return settled
    .filter((result): result is PromiseFulfilledResult<InlineMediaPart> => result.status === 'fulfilled')
    .map((result) => result.value);
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
  postCount,
  mediaItems,
  inlineMediaParts,
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
  postCount: number;
  mediaItems: UploadedMediaContext[];
  inlineMediaParts: InlineMediaPart[];
}) {
  const selectedPlatformPlan = buildSelectedPlatformPlan(selectedPlatforms, postCount)
    .map((item) => `- ${item.day}: ${item.platform} — ${item.angle}`)
    .join('\n');

  const platformLimitGuide = buildPlatformLimitGuide(selectedPlatforms);

  const visualUploads = inlineMediaParts.length
    ? inlineMediaParts
        .map((item) => `- Upload ${item.uploadIndex + 1}: visual image attached for direct analysis (${item.name}).`)
        .join('\n')
    : 'No image pixels were available to the AI. Use metadata and business details only.';

  const mediaContext = mediaItems.length
    ? mediaItems
        .map((item, index) => {
          const details = [
            item.description || item.context || '',
            item.extractedText ? `Extracted flyer/text details: ${item.extractedText}` : '',
            item.name ? `Filename: ${item.name}` : '',
            item.type ? `Media type: ${item.type}` : '',
            item.url ? `Stored media URL: ${item.url}` : '',
          ]
            .filter(Boolean)
            .join(' | ');

          return `- Upload ${index + 1}: ${details || 'Uploaded photo or flyer'}`;
        })
        .join('\n')
    : 'No uploaded media supplied. Create posts from the business profile and website details.';

  const mediaModeRule = mediaItems.length
    ? `There are ${mediaItems.length} uploaded item(s). Create exactly ${postCount} posts. Match Post 1 to Upload 1, Post 2 to Upload 2, and so on.`
    : `No uploads were supplied. Create exactly ${postCount} posts from the website/business profile.`;

  return `
You are FromOne's premium social media strategist, website analyst, brand interpreter, visual media analyst, and local business copywriter.

Your task is to create a simple weekly set of posts that feels like it was written by a skilled social media manager who understands the client's industry and can turn photos or flyers into strong business posts.

CRITICAL VISION RULE:
- When image uploads are attached in this request, visually inspect the actual image content.
- Do not guess what is in an image from the business name, website, filename, or industry.
- If the visual image shows a shopfront, vehicle, sign, food, beauty result, building work, product, flyer, or anything else, the post must match what is actually visible.
- If the image conflicts with the business profile, trust the visible image for the post subject.
- Example: if the photo shows a restaurant shopfront, do not write about van graphics unless a van is actually visible.

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
      "day": "Post 1",
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
- TikTok should read like a short hook plus simple manual posting caption/script, not a long caption.

Market reach:
${marketReach}

Market reach rules:
- If market reach is local, make the posts feel relevant to that area and nearby customers.
- If market reach is nationwide, avoid overly local wording and write for a wider UK audience.
- If market reach is online, focus on online enquiries, digital buying intent, ecommerce, remote services, delivery, or online conversion where relevant.

Weekly platform and content strategy:
${selectedPlatformPlan}

Uploaded media metadata:
${mediaContext}

Visual uploads attached to this Gemini request:
${visualUploads}

Media matching rule:
${mediaModeRule}

Core media quality rule:
- The uploaded image, flyer, poster, offer graphic, product photo, food image, salon result, job photo, shopfront, sign, van, or before/after image gives you the subject of the post.
- The business profile and website scan give you the quality layer: business name, industry, services, location/service area, audience, tone, offer, CTA, business goals, content pillars, and sales angle.
- Do not only describe the image.
- Turn the upload into a professional business post.
- For flyers, extract offer, date, price, service, location, contact details, and CTA where supplied, then rewrite them naturally as a social post.
- For photos, identify what is visibly in the photo first, then write a useful, local, industry-specific caption around that visible subject.
- If no uploaded media is supplied, use the website/business profile.

Strict platform rule:
- You must only use these selected platforms: ${selectedPlatforms.join(', ')}.
- Do not create posts for platforms that are not selected.
- Spread the posts naturally across the selected platforms.
- If only one platform is selected, all posts should use that platform.
- Facebook and Instagram can be published/scheduled where Meta is connected.
- TikTok is manual posting for now, so provide copy/open friendly wording with a hook/script where useful.

Industry quality rules:
- Write with industry knowledge, not generic marketing fluff.
- Mention realistic customer problems, buying triggers, objections, service moments, benefits, or seasonal/local needs for the detected industry.
- Use the business services and offer where available.
- Use local trust where location is available.
- Avoid vague lines like "we are passionate about excellence" unless supported by details.
- Avoid repeated wording across posts.
- Each post must have a different purpose and angle.
- Make posts feel human, specific, and useful.

Platform rules:
- Facebook: community-friendly, clear, trustworthy, local.
- Instagram: visual, benefit-led, aspirational but not cheesy.
- TikTok: short hook plus simple video/script idea that a business owner could realistically film or post manually.
- Do not make short-form video content sound like a long corporate advert.

Caption style:
- Do not include "Day 1", "Day 2", platform names, or big headings inside captions.
- Do not use markdown.
- Do not use bullet-heavy formatting.
- Do not use exaggerated hype.
- Emojis are allowed only if the business tone suits them. Use none by default.
- Captions should usually be 45 to 120 words only when the platform limit allows it.
- TikTok must be shorter where appropriate and include a simple hook or script-style first line.
- Every caption must be ready to copy and paste.

CTA rules:
- Make CTAs specific and natural.
- Avoid using the same CTA repeatedly.
- CTAs should match the action: book, enquire, call, message, visit, request quote, learn more, reserve, order, etc.

Hashtag rules:
- Use 4 to 8 hashtags per post.
- Include industry-specific hashtags.
- Include local hashtags if location is known.
- Avoid silly or irrelevant hashtags.
- Hashtags must start with # and have no spaces.

Image prompt rules:
- Every image_prompt must describe the actual uploaded visual subject when an image is attached.
- Include subject, setting, mood, and brand style where useful.
- Avoid generic prompts like "professional image".

Brand rules:
- Use the detected brand colours provided unless the website or visible uploaded image strongly suggests otherwise.
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

Return exactly ${postCount} posts. Use only Facebook, Instagram, and TikTok. Follow the weekly platform plan exactly.
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

function buildGeminiParts(prompt: string, inlineMediaParts: InlineMediaPart[]) {
  const parts: any[] = [
    {
      text: prompt,
    },
  ];

  for (const media of inlineMediaParts) {
    parts.push({
      text: `Visual upload ${media.uploadIndex + 1}: ${media.name}. Analyse this exact image and use it as the subject for Post ${media.uploadIndex + 1}.`,
    });

    parts.push({
      inlineData: {
        mimeType: media.mimeType,
        data: media.data,
      },
    });
  }

  return parts;
}

async function generateWithGemini(prompt: string, inlineMediaParts: InlineMediaPart[] = []) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in .env.local');
  }

  const response = await axios.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      contents: [
        {
          parts: buildGeminiParts(prompt, inlineMediaParts),
        },
      ],
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 6200,
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

function normalisePostCount(value: any, mediaItems: UploadedMediaContext[]) {
  const requested = Number(value);

  if (mediaItems.length > 0) {
    return Math.max(1, Math.min(mediaItems.length, 7));
  }

  if (Number.isFinite(requested) && requested > 0) {
    return Math.max(1, Math.min(Math.round(requested), 7));
  }

  return 7;
}

function normaliseMediaItems(value: any): UploadedMediaContext[] {
  const rawItems = Array.isArray(value) ? value : [];

  return rawItems
    .map((item) => ({
      id: cleanText(item?.id || item?.upload_id),
      name: cleanText(item?.name || item?.fileName || item?.filename || item?.file_name),
      type: cleanText(item?.type || item?.media_type || item?.mimeType || item?.content_type),
      url: cleanText(item?.url || item?.media_url || item?.publicUrl),
      description: cleanText(item?.description || item?.alt || item?.summary),
      extractedText: cleanText(item?.extractedText || item?.extracted_text || item?.text),
      context: cleanText(item?.context || item?.notes || item?.topic_hint),
    }))
    .filter(
      (item) =>
        item.name ||
        item.type ||
        item.url ||
        item.description ||
        item.extractedText ||
        item.context
    )
    .slice(0, 7);
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
    const mediaItems = normaliseMediaItems(
      body.mediaItems || body.uploads || body.weeklyUploads || body.media || []
    );
    const postCount = normalisePostCount(
      body.numberOfPosts || body.postingFrequency || body.postCount,
      mediaItems
    );

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

    const inlineMediaParts = provider === 'gemini' ? await fetchInlineMediaParts(mediaItems) : [];

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
      postCount,
      mediaItems,
      inlineMediaParts,
    });

    const rawResult =
      provider === 'openai'
        ? await generateWithOpenAI(prompt)
        : await generateWithGemini(prompt, inlineMediaParts);

    const result = normaliseResult(rawResult, fallback, selectedPlatforms, marketReach, postCount);

    if (!result.posts.length) {
      return NextResponse.json(
        {
          posts: [],
          businessProfile: result.businessProfile,
          selectedPlatforms,
          marketReach,
          postCount,
          mediaItemsUsed: mediaItems.length,
          visionMediaUsed: inlineMediaParts.length,
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
      postCount,
      mediaItemsUsed: mediaItems.length,
      visionMediaUsed: inlineMediaParts.length,
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
