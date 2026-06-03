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
  make_more_premium: 'Make more premium',
  location_rewrite: 'Rewrite for selected location',
  make_sales_focused: 'Make more sales-focused',
  make_less_generic: 'Make less generic',
  different_version: 'Try a different version',
};

const improvementSummaries: Record<string, string> = {
  make_shorter: 'Shortened the post and removed extra wording.',
  make_more_local: 'Added more local relevance and customer context.',
  make_more_premium: 'Made the wording more polished and premium.',
  location_rewrite: 'Rewritten for the selected location.',
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

function stripJsonFences(value: string) {
  return String(value || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractJsonFromText(text: string) {
  const cleaned = stripJsonFences(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue to recovery below.
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI response did not contain valid JSON.');
  }

  const possibleJson = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(possibleJson);
  } catch {
    const repaired = possibleJson
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, '$1');

    return JSON.parse(repaired);
  }
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

function buildFallbackRewriteFromText({
  text,
  fallbackSummary,
  platform,
  originalCaption,
  audienceTarget,
  marketReach,
}: {
  text: string;
  fallbackSummary: string;
  platform: string;
  originalCaption: string;
  audienceTarget: string;
  marketReach: string;
}) {
  const cleaned = cleanText(text || originalCaption);
  const caption = cleaned
    .replace(/^caption\s*[:\-]\s*/i, '')
    .replace(/^improved caption\s*[:\-]\s*/i, '')
    .trim();

  const reachHashtags = getReachHashtags(marketReach || audienceTarget, '');

  return {
    caption: enforcePlatformCaptionLimit(caption || originalCaption, platform),
    cta: 'Message us to find out more.',
    hashtags: reachHashtags,
    image_prompt: 'Use a clear image, flyer, product photo, result photo, or service image that matches this post.',
    improvement_summary: fallbackSummary,
  };
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

  if (action === 'location_rewrite') {
    return `
Improvement action:
Rewrite the post for the selected location/reach.

Specific instructions:
- This must be a true AI rewrite, not the same caption repeated.
- Keep the business and offer aligned with the original caption.
- Change the angle and wording to match the selected location/reach.
- If the selected reach is Nationwide UK, make it clearly UK-wide and remove local-only wording.
- If the selected reach is Online, make it clearly online/enquiry/website focused.
- If the selected reach is Regional, make it wider than one town but not fully national.
- If the selected reach is Local, make it naturally local.
`;
  }

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


  if (action === 'make_more_premium') {
    return `
Improvement action:
Make the post more premium.

Specific instructions:
- Make the wording more polished, confident, and professional.
- Keep it clear and natural, not luxury clichés.
- Avoid cheap-sounding sales language.
- Focus on quality, trust, presentation, finish, reliability, and brand impression.
- Keep the selected market reach guidance stronger than the original caption.
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

function getMarketReachGuidance(audienceTarget: string, marketReach: string) {
  const combined = `${audienceTarget} ${marketReach}`.toLowerCase();

  if (
    combined.includes('nationwide') ||
    combined.includes('national') ||
    combined.includes('uk wide') ||
    combined.includes('across the uk') ||
    combined.includes('all over the uk')
  ) {
    return `
Market reach:
Nationwide / UK-wide.

MANDATORY wording direction:
- The rewritten caption must clearly sound UK-wide or nationwide.
- Include one natural phrase such as "across the UK", "UK-wide", "nationwide", "wherever you are in the UK", or "for customers across the country".
- Do not use local-only wording such as "local customers", "nearby customers", "nearby areas", "local area", "pop in", "around the corner", or "in your area".
- Do not mention a specific town, city, village, borough, county, or neighbourhood unless the original post explicitly requires it as part of the business name or legal address.
- If the original caption mentions a town such as Altrincham, Manchester, Sale, Stockport, Trafford or similar, remove that local focus and rewrite it as UK-wide.
- Focus on trust, convenience, delivery, remote service, online booking, online ordering, courier/postage, or nationwide availability only when those are supported by the business context.
- Do not invent delivery promises, prices, offers, or exact coverage details that were not supplied.
- The CTA should suit a nationwide customer, such as enquiring online, ordering online, booking online, or messaging for details.
`;
  }

  if (
    combined.includes('online') ||
    combined.includes('ecommerce') ||
    combined.includes('e-commerce') ||
    combined.includes('webshop') ||
    combined.includes('website') ||
    combined.includes('delivery')
  ) {
    return `
Market reach:
Online customers / ecommerce.

MANDATORY wording direction:
- The rewritten caption must clearly sound suitable for online customers.
- Include one natural phrase such as "order online", "book online", "browse online", "shop from home", "visit the website", or "send an online enquiry" where appropriate.
- Do not use local-only wording such as "local customers", "nearby areas", "pop in", "visit us locally", or town-focused wording unless the original post specifically needs it.
- If the original caption mentions a town or nearby areas, remove that local focus and rewrite it for online customers.
- Focus on convenience, speed, browsing, ordering, booking, delivery, remote service, or online enquiries.
- The CTA must be suitable for online action.
`;
  }

  if (
    combined.includes('regional') ||
    combined.includes('county') ||
    combined.includes('surrounding areas') ||
    combined.includes('nearby towns')
  ) {
    return `
Market reach:
Regional and local customers.

MANDATORY wording direction:
- The rewritten caption must sound suitable for a wider regional service area.
- Include one natural phrase such as "across the region", "across the area", "surrounding areas", "nearby towns", or "throughout the county".
- Do not invent exact place names.
- Avoid making it sound limited to one street or neighbourhood.
- The CTA should suit customers from a wider area.
`;
  }

  return `
Market reach:
Local customers.

MANDATORY wording direction:
- The rewritten caption should sound useful for local customers and nearby enquiries.
- Use natural phrases like "local customers", "nearby homes", "in your area", or "the local community" if no exact location is supplied.
- Do not invent town names.
`;
}


function getReachKind(marketReach: string) {
  const cleanReach = String(marketReach || '').toLowerCase();

  if (
    cleanReach.includes('nationwide') ||
    cleanReach.includes('national') ||
    cleanReach.includes('uk wide') ||
    cleanReach.includes('across the uk')
  ) {
    return 'nationwide';
  }

  if (
    cleanReach.includes('online') ||
    cleanReach.includes('ecommerce') ||
    cleanReach.includes('e-commerce') ||
    cleanReach.includes('webshop') ||
    cleanReach.includes('website')
  ) {
    return 'online';
  }

  if (
    cleanReach.includes('regional and local') ||
    cleanReach.includes('local and regional') ||
    cleanReach.includes('regional') ||
    cleanReach.includes('county') ||
    cleanReach.includes('surrounding')
  ) {
    return 'regional';
  }

  return 'local';
}

function getReachHashtags(marketReach: string, industry: string) {
  const reachKind = getReachKind(marketReach);
  const cleanIndustry = String(industry || 'Business')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');

  if (reachKind === 'nationwide') {
    return ['#UKBusiness', '#NationwideService', '#BusinessMarketing', cleanIndustry ? `#${cleanIndustry}` : '#SmallBusiness'];
  }

  if (reachKind === 'online') {
    return ['#OnlineBusiness', '#ShopOnline', '#OnlineService', cleanIndustry ? `#${cleanIndustry}` : '#SmallBusiness'];
  }

  if (reachKind === 'regional') {
    return ['#RegionalBusiness', '#BusinessGrowth', '#SmallBusiness', cleanIndustry ? `#${cleanIndustry}` : '#LocalBusiness'];
  }

  return ['#LocalBusiness', '#SmallBusiness', '#SupportLocal', cleanIndustry ? `#${cleanIndustry}` : '#CommunityBusiness'];
}

function hasBannedLocalWordingForReach(caption: string, marketReach: string) {
  const reachKind = getReachKind(marketReach);
  const cleanCaption = String(caption || '').toLowerCase();

  if (reachKind !== 'nationwide' && reachKind !== 'online') {
    return false;
  }

  const bannedLocalPatterns = [
    /\blocal customers?\b/i,
    /\blocal businesses?\b/i,
    /\blocal small business owner\b/i,
    /\blocal small business owners\b/i,
    /\blocal business owner\b/i,
    /\blocal business owners\b/i,
    /\blocal area\b/i,
    /\blocal community\b/i,
    /\blocal visibility\b/i,
    /\bnearby areas?\b/i,
    /\bnearby customers?\b/i,
    /\bnearby homes?\b/i,
    /\bin your area\b/i,
    /\bstand out in your area\b/i,
    /\bin and around\b/i,
    /\baround the corner\b/i,
    /\bfoot traffic\b/i,
    /\bpassersby\b/i,
    /\bpassers-by\b/i,
    /\bpop in\b/i,
    /\bwalk in\b/i,
    /\bAltrincham\b/i,
    /\bManchester\b/i,
    /\bSale\b/i,
    /\bStockport\b/i,
    /\bTrafford\b/i,
  ];

  return bannedLocalPatterns.some((pattern) => pattern.test(cleanCaption));
}

function lacksRequiredReachWording(caption: string, marketReach: string) {
  const reachKind = getReachKind(marketReach);
  const cleanCaption = String(caption || '').toLowerCase();

  if (reachKind === 'nationwide') {
    return !(
      cleanCaption.includes('across the uk') ||
      cleanCaption.includes('uk-wide') ||
      cleanCaption.includes('uk wide') ||
      cleanCaption.includes('nationwide') ||
      cleanCaption.includes('across the country') ||
      cleanCaption.includes('wherever you are in the uk')
    );
  }

  if (reachKind === 'online') {
    return !(
      cleanCaption.includes('online') ||
      cleanCaption.includes('website') ||
      cleanCaption.includes('online enquiry') ||
      cleanCaption.includes('order online') ||
      cleanCaption.includes('book online') ||
      cleanCaption.includes('browse online') ||
      cleanCaption.includes('shop from home')
    );
  }

  if (reachKind === 'regional') {
    return !(
      cleanCaption.includes('across the region') ||
      cleanCaption.includes('across the area') ||
      cleanCaption.includes('surrounding areas') ||
      cleanCaption.includes('nearby towns') ||
      cleanCaption.includes('throughout the county') ||
      cleanCaption.includes('regional')
    );
  }

  return false;
}

function getReachComplianceIssues(result: RewriteResult, marketReach: string) {
  const caption = result?.caption || '';
  const reachKind = getReachKind(marketReach);
  const issues: string[] = [];

  if (hasBannedLocalWordingForReach(caption, marketReach)) {
    issues.push('Caption still contains local-only wording that conflicts with the selected reach.');
  }

  if (lacksRequiredReachWording(caption, marketReach)) {
    if (reachKind === 'nationwide') {
      issues.push('Caption does not clearly sound nationwide or UK-wide.');
    }

    if (reachKind === 'online') {
      issues.push('Caption does not clearly sound suitable for online customers.');
    }

    if (reachKind === 'regional') {
      issues.push('Caption does not clearly sound regional.');
    }
  }

  return issues;
}

async function correctReachWithGemini({
  result,
  marketReach,
  reachInstruction,
  platform,
  platformLimit,
  industry,
}: {
  result: RewriteResult;
  marketReach: string;
  reachInstruction: string;
  platform: string;
  platformLimit: number;
  industry: string;
}) {
  const reachGuidance = getMarketReachGuidance(marketReach, marketReach);
  const reachHashtags = getReachHashtags(marketReach, industry);

  const correctionPrompt = `
Correct this social post so it fully follows the selected reach.

Return ONLY valid JSON:
{
  "caption": "corrected caption",
  "cta": "short CTA",
  "hashtags": ["#Example"],
  "image_prompt": "specific image idea",
  "improvement_summary": "one short sentence explaining what changed"
}

Selected reach:
${marketReach}

Reach instruction:
${reachInstruction || 'No extra instruction supplied'}

${reachGuidance}

Current caption:
${result.caption}

Current CTA:
${result.cta}

Current hashtags:
${Array.isArray(result.hashtags) ? result.hashtags.join(' ') : ''}

Rules:
- Keep the same business meaning.
- Keep the caption under ${platformLimit} characters.
- If Nationwide UK is selected, remove all local-only phrases such as local customers, local small business owner, nearby areas, in Altrincham, in Manchester, in Sale, in your area, local visibility, local community, foot traffic, passersby, or pop in.
- If Nationwide UK is selected, make it clearly UK-wide using natural wording such as across the UK, UK-wide, nationwide, or for customers across the country.
- If Online is selected, remove local walk-in wording and make the CTA suitable for online action.
- If Regional is selected, make it wider than one town but not fully national.
- Use these reach-appropriate hashtags where useful: ${reachHashtags.join(' ')}.
- Do not add markdown or explanations.
`;

  const rawCorrection = await rewriteWithGemini(correctionPrompt);
  return normaliseRewrite(rawCorrection, 'Corrected the reach wording.', platform);
}

async function correctReachWithOpenAI({
  result,
  marketReach,
  reachInstruction,
  platform,
  platformLimit,
  industry,
}: {
  result: RewriteResult;
  marketReach: string;
  reachInstruction: string;
  platform: string;
  platformLimit: number;
  industry: string;
}) {
  const reachGuidance = getMarketReachGuidance(marketReach, marketReach);
  const reachHashtags = getReachHashtags(marketReach, industry);

  const correctionPrompt = `
Correct this social post so it fully follows the selected reach.

Return ONLY valid JSON:
{
  "caption": "corrected caption",
  "cta": "short CTA",
  "hashtags": ["#Example"],
  "image_prompt": "specific image idea",
  "improvement_summary": "one short sentence explaining what changed"
}

Selected reach:
${marketReach}

Reach instruction:
${reachInstruction || 'No extra instruction supplied'}

${reachGuidance}

Current caption:
${result.caption}

Current CTA:
${result.cta}

Current hashtags:
${Array.isArray(result.hashtags) ? result.hashtags.join(' ') : ''}

Rules:
- Keep the same business meaning.
- Keep the caption under ${platformLimit} characters.
- If Nationwide UK is selected, remove all local-only phrases such as local customers, local small business owner, nearby areas, in Altrincham, in Manchester, in Sale, in your area, local visibility, local community, foot traffic, passersby, or pop in.
- If Nationwide UK is selected, make it clearly UK-wide using natural wording such as across the UK, UK-wide, nationwide, or for customers across the country.
- If Online is selected, remove local walk-in wording and make the CTA suitable for online action.
- If Regional is selected, make it wider than one town but not fully national.
- Use these reach-appropriate hashtags where useful: ${reachHashtags.join(' ')}.
- Do not add markdown or explanations.
`;

  const rawCorrection = await rewriteWithOpenAI(correctionPrompt);
  return normaliseRewrite(rawCorrection, 'Corrected the reach wording.', platform);
}

function applyReachHashtagSafety(result: RewriteResult, marketReach: string, industry: string) {
  if (getReachKind(marketReach) === 'local') {
    return result;
  }

  const reachHashtags = getReachHashtags(marketReach, industry);
  const existing = ensureArray(result.hashtags).map(ensureHashtag).filter(Boolean);
  const merged = [...reachHashtags, ...existing]
    .filter(Boolean)
    .filter((tag, index, array) => array.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 8);

  return {
    ...result,
    hashtags: merged,
  };
}


function stripQuotedTheBusiness(value: string, businessName: string) {
  const cleanBusinessName = cleanText(businessName);
  const hasRealBusinessName =
    cleanBusinessName &&
    cleanBusinessName.toLowerCase() !== 'the business' &&
    cleanBusinessName.toLowerCase() !== 'business';

  return String(value || '')
    .replace(/\bAt\s+["“”']?the business["“”']?,?\s+we\b/gi, hasRealBusinessName ? `At ${cleanBusinessName}, we` : 'We')
    .replace(/\bAt\s+["“”']?the business["“”']?,?\s+/gi, hasRealBusinessName ? `At ${cleanBusinessName}, ` : '')
    .replace(/\b["“”']the business["“”']\b/gi, hasRealBusinessName ? cleanBusinessName : 'we');
}

function finalReachSafeCaption({
  caption,
  marketReach,
  businessName,
  industry,
  platform,
}: {
  caption: string;
  marketReach: string;
  businessName: string;
  industry: string;
  platform: string;
}) {
  const reachKind = getReachKind(marketReach);
  let nextCaption = stripQuotedTheBusiness(cleanText(caption), businessName);

  if (reachKind === 'nationwide') {
    nextCaption = nextCaption
      .replace(/\blocal small business owners?\b/gi, 'business owners across the UK')
      .replace(/\blocal business owners?\b/gi, 'business owners across the UK')
      .replace(/\blocal customers?\b/gi, 'customers across the UK')
      .replace(/\blocal businesses?\b/gi, 'businesses across the UK')
      .replace(/\blocal area\b/gi, 'the UK')
      .replace(/\blocal community\b/gi, 'customers across the UK')
      .replace(/\blocal visibility\b/gi, 'nationwide visibility')
      .replace(/\bnearby areas?\b/gi, 'the UK')
      .replace(/\bnearby customers?\b/gi, 'customers across the UK')
      .replace(/\bnearby homes?\b/gi, 'homes across the UK')
      .replace(/\bin your area\b/gi, 'across the UK')
      .replace(/\bstand out in your area\b/gi, 'stand out across the UK')
      .replace(/\bin and around\s+[A-Z][A-Za-z\s-]+/g, 'across the UK')
      .replace(/\bin\s+(Altrincham|Manchester|Sale|Stockport|Trafford)\b(?:\s+and\s+nearby\s+areas)?/gi, 'across the UK')
      .replace(/\baround\s+(Altrincham|Manchester|Sale|Stockport|Trafford)\b/gi, 'across the UK')
      .replace(/\bturning passersby into foot traffic\b/gi, 'turning attention into enquiries')
      .replace(/\bturning passers-by into foot traffic\b/gi, 'turning attention into enquiries')
      .replace(/\bpassersby\b/gi, 'potential customers')
      .replace(/\bpassers-by\b/gi, 'potential customers')
      .replace(/\bfoot traffic\b/gi, 'enquiries')
      .replace(/\bpop in\b/gi, 'get in touch')
      .replace(/\bwalk in\b/gi, 'enquire');

    if (lacksRequiredReachWording(nextCaption, marketReach)) {
      nextCaption = `For businesses across the UK, ${nextCaption.replace(/^\s*(As a small business owner,?\s*)/i, '').trim()}`;
    }
  }

  if (reachKind === 'online') {
    nextCaption = nextCaption
      .replace(/\blocal customers?\b/gi, 'online customers')
      .replace(/\blocal businesses?\b/gi, 'online businesses')
      .replace(/\blocal area\b/gi, 'online')
      .replace(/\bnearby areas?\b/gi, 'online')
      .replace(/\bin your area\b/gi, 'online')
      .replace(/\bin\s+(Altrincham|Manchester|Sale|Stockport|Trafford)\b(?:\s+and\s+nearby\s+areas)?/gi, 'online')
      .replace(/\bpop in\b/gi, 'visit the website')
      .replace(/\bwalk in\b/gi, 'send an online enquiry');

    if (lacksRequiredReachWording(nextCaption, marketReach)) {
      nextCaption = `${nextCaption} Send an online enquiry to find out more.`;
    }
  }

  if (reachKind === 'regional') {
    nextCaption = nextCaption
      .replace(/\blocal customers?\b/gi, 'customers across the region')
      .replace(/\blocal businesses?\b/gi, 'businesses across the region')
      .replace(/\bin your area\b/gi, 'across the region');

    if (lacksRequiredReachWording(nextCaption, marketReach)) {
      nextCaption = `${nextCaption} Available across the region.`;
    }
  }

  return enforcePlatformCaptionLimit(nextCaption, platform);
}

function forceReachCompliance({
  result,
  marketReach,
  businessName,
  industry,
  platform,
}: {
  result: RewriteResult;
  marketReach: string;
  businessName: string;
  industry: string;
  platform: string;
}) {
  const reachIssues = getReachComplianceIssues(result, marketReach);

  if (reachIssues.length === 0) {
    return result;
  }

  const safeCaption = finalReachSafeCaption({
    caption: result.caption,
    marketReach,
    businessName,
    industry,
    platform,
  });

  const safeResult = {
    ...result,
    caption: safeCaption,
    hashtags: getReachKind(marketReach) === 'local'
      ? result.hashtags
      : getReachHashtags(marketReach, industry),
    improvement_summary: 'Updated the reach wording.',
  };

  const remainingIssues = getReachComplianceIssues(safeResult, marketReach);

  if (remainingIssues.length === 0) {
    return safeResult;
  }

  const reachKind = getReachKind(marketReach);
  const cleanBusinessName = cleanText(businessName);
  const displayName =
    cleanBusinessName &&
    cleanBusinessName.toLowerCase() !== 'the business' &&
    cleanBusinessName.toLowerCase() !== 'business'
      ? cleanBusinessName
      : 'we';

  if (reachKind === 'nationwide') {
    return {
      ...safeResult,
      caption: enforcePlatformCaptionLimit(
        `${displayName === 'we' ? 'We help' : `${displayName} helps`} businesses across the UK create clear, professional visuals that make their brand easier to notice and remember. From signage and large format print to branded displays and promotional materials, we support businesses that want a stronger presence beyond one local area. Message us to discuss your next project.`,
        platform,
      ),
      hashtags: getReachHashtags(marketReach, industry),
      improvement_summary: 'Rewritten for nationwide reach.',
    };
  }

  if (reachKind === 'online') {
    return {
      ...safeResult,
      caption: enforcePlatformCaptionLimit(
        `${displayName === 'we' ? 'We help' : `${displayName} helps`} customers online with clear, professional support that makes it easier to choose, enquire or order from wherever they are. Browse online or send an enquiry to find out more.`,
        platform,
      ),
      hashtags: getReachHashtags(marketReach, industry),
      improvement_summary: 'Rewritten for online reach.',
    };
  }

  if (reachKind === 'regional') {
    return {
      ...safeResult,
      caption: enforcePlatformCaptionLimit(
        `${displayName === 'we' ? 'We help' : `${displayName} helps`} customers across the region with clear, professional support that makes it easier to get noticed, make a strong impression and take the next step. Message us to discuss what you need.`,
        platform,
      ),
      hashtags: getReachHashtags(marketReach, industry),
      improvement_summary: 'Rewritten for regional reach.',
    };
  }

  return safeResult;
}

async function rewriteWithGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in .env.local');
  }

  async function callGemini(promptText: string, strictJson = true) {
    const payload: any = {
      contents: [
        {
          parts: [
            {
              text: promptText,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: strictJson ? 0.35 : 0.55,
        maxOutputTokens: 1800,
        responseMimeType: 'application/json',
      },
    };

    if (strictJson) {
      payload.generationConfig.responseSchema = {
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
      };
    }

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      payload,
      {
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const parts = response.data.candidates?.[0]?.content?.parts || [];
    const text = parts
      .map((part: any) => part?.text || '')
      .filter(Boolean)
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }

    return text;
  }

  const firstText = await callGemini(prompt, true);

  try {
    return extractJsonFromText(firstText);
  } catch {
    const repairPrompt = `
Convert this response into ONLY valid JSON.

Required JSON shape:
{
  "caption": "string",
  "cta": "string",
  "hashtags": ["#Example"],
  "image_prompt": "string",
  "improvement_summary": "string"
}

Rules:
- Return JSON only.
- No markdown.
- No explanation.
- Hashtags must be an array of strings.
- Keep the caption exactly as close as possible to the supplied response.

Response to convert:
${firstText}
`;

    const repairedText = await callGemini(repairPrompt, true);

    return extractJsonFromText(repairedText);
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
    const selectedReach = String(
      body.selectedReach ||
        body.locationScope ||
        body.marketReach ||
        body.reach ||
        'Regional and local customers'
    ).trim();
    const marketReach = selectedReach || 'Regional and local customers';
    const reachInstruction = String(body.reachInstruction || '').trim();
    const forceRewrite = Boolean(body.forceRewrite);

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
    const marketReachGuidance = getMarketReachGuidance(audienceTarget, marketReach);

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

${marketReachGuidance}

Selected reach from the app:
${marketReach || 'No reach selected'}

Force rewrite:
${forceRewrite ? 'Yes. The caption must materially change.' : 'No.'}

Additional reach instruction from the app:
${reachInstruction || 'No extra reach instruction supplied'}

Hard reach rule:
- The selected reach from the app overrides the original caption if they conflict.
- If selected reach is Nationwide UK customers, remove local-only wording from the original caption.
- If selected reach is Nationwide UK customers, do not mention local customers, local business owners, nearby areas, local visibility, local community, foot traffic, passersby, or any specific town/city from the original caption.
- If selected reach is Online customers, avoid local walk-in wording and make the CTA suitable for online action.
- If selected reach is Regional and local customers, make the wording wider than one town but not fully national.
- Only use local/town wording when selected reach is Local customers.

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
- If forceRewrite is true, the caption must materially change from the supplied caption.
- Use natural, human wording.
- Use no emojis unless the brand clearly suits them.
- Caption should usually be 45 to 120 words only if the platform limit allows it.
- The market reach instruction is mandatory. If Nationwide, Regional, or Online is selected, the caption must visibly reflect that.
- Do not preserve local phrases from the original caption when they conflict with the selected reach.
- For Nationwide UK customers, banned phrases include "local customers", "local small business owner", "nearby areas", "in Altrincham", "in Manchester", "in Sale", "local area", "local visibility", "local community", "foot traffic", "passersby", and similar town-only wording.
- If the selected improvement action asks for shorter copy, make it shorter.
- TikTok, YouTube Shorts, and X / Twitter should be especially short.
- CTA should be specific and natural.
- Hashtags must be 4 to 8 items, relevant to the industry, audience, and local/small business context.
- Hashtags must start with # and have no spaces.
- Image prompt must be practical for a small business to create, choose, or use when posting manually.
- improvement_summary must be short, clear, and no more than 14 words.
`;

    let rawResult: any;

    try {
      rawResult =
        provider === 'openai'
          ? await rewriteWithOpenAI(prompt)
          : await rewriteWithGemini(prompt);
    } catch (rewriteError: any) {
      const jsonFailed =
        rewriteError?.message === 'AI response did not contain valid JSON.' ||
        rewriteError?.message === 'The AI returned an unexpected format. Please try again.';

      if (!jsonFailed) {
        throw rewriteError;
      }

      rawResult = buildFallbackRewriteFromText({
        text: caption,
        fallbackSummary,
        platform,
        originalCaption: caption,
        audienceTarget,
        marketReach,
      });
    }

    let result = normaliseRewrite(rawResult, fallbackSummary, platform);
    let reachComplianceIssues = getReachComplianceIssues(result, marketReach);
    let reachCorrectionApplied = false;

    if (reachComplianceIssues.length > 0) {
      try {
        const corrected =
          provider === 'openai'
            ? await correctReachWithOpenAI({
                result,
                marketReach,
                reachInstruction,
                platform,
                platformLimit,
                industry,
              })
            : await correctReachWithGemini({
                result,
                marketReach,
                reachInstruction,
                platform,
                platformLimit,
                industry,
              });

        const correctedIssues = getReachComplianceIssues(corrected, marketReach);

        if (corrected.caption) {
          result = corrected;
          reachComplianceIssues = correctedIssues;
          reachCorrectionApplied = true;
        }
      } catch (correctionError: any) {
        console.warn('Reach correction failed:', correctionError?.message || correctionError);
      }
    }

    result = applyReachHashtagSafety(result, marketReach, industry);
    result = forceReachCompliance({
      result,
      marketReach,
      businessName,
      industry,
      platform,
    });
    reachComplianceIssues = getReachComplianceIssues(result, marketReach);

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
      market_reach: marketReach,
      selected_reach: selectedReach,
      location_scope: selectedReach,
      reach_instruction: reachInstruction,
      reach_kind: getReachKind(marketReach),
      reach_correction_applied: reachCorrectionApplied,
      reach_compliance_issues: reachComplianceIssues,
      improvement_action: improvementAction,
      provider,
      platform_caption_limit: platformLimit,
    });
  } catch (error: any) {
    console.error('Rewrite post API error:', error?.response?.data || error?.message || error);

    return NextResponse.json(
      {
        error:
          error?.message === 'AI response did not contain valid JSON.'
            ? 'The AI returned an unexpected format. Please try again.'
            : error?.response?.data?.error?.message ||
              error?.response?.data?.error ||
              error?.response?.data?.message ||
              error?.message ||
              'Something went wrong rewriting the post.',
      },
      { status: 500 }
    );
  }
}