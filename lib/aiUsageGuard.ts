import { createClient } from '@supabase/supabase-js';

export type AiUsageFeature =
  | 'generate_posts'
  | 'rewrite_post'
  | 'reports_recommendation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const DAILY_USER_LIMITS: Record<AiUsageFeature, number> = {
  generate_posts: 1,
  rewrite_post: 8,
  reports_recommendation: 2,
};

const GLOBAL_DAILY_LIMIT = Number(process.env.BETA_AI_GLOBAL_DAILY_LIMIT || 40);
const GLOBAL_WEEKLY_LIMIT = Number(process.env.BETA_AI_GLOBAL_WEEKLY_LIMIT || 150);

const DEFAULT_BYPASS_EMAILS = ['mikeb33@hotmail.co.uk'];

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase service role environment variables.');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getStartOfUtcDay() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
}

function getStartOfUtcWeek() {
  const now = new Date();
  const day = now.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );

  start.setUTCDate(start.getUTCDate() + mondayOffset);

  return start;
}

function getBypassEmails() {
  const envEmails = cleanText(process.env.BETA_AI_CAP_BYPASS_EMAILS);

  if (!envEmails) {
    return DEFAULT_BYPASS_EMAILS;
  }

  return envEmails
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function shouldBypassCaps(email?: string | null) {
  const cleanEmail = cleanText(email).toLowerCase();

  if (!cleanEmail) return false;

  return getBypassEmails().includes(cleanEmail);
}

async function countEvents({
  userId,
  feature,
  since,
}: {
  userId?: string;
  feature?: AiUsageFeature;
  since: Date;
}) {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('ai_usage_events')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .gte('created_at', since.toISOString());

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (feature) {
    query = query.eq('feature', feature);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Could not check AI usage: ${error.message}`);
  }

  return count || 0;
}

export class AiUsageLimitError extends Error {
  status = 429;

  constructor(message: string) {
    super(message);
    this.name = 'AiUsageLimitError';
  }
}

export async function checkAndRecordAiUsage({
  userId,
  userEmail,
  feature,
}: {
  userId: string;
  userEmail?: string | null;
  feature: AiUsageFeature;
}) {
  const cleanUserId = cleanText(userId);

  if (!cleanUserId) {
    throw new Error('Missing user for AI usage check.');
  }

  if (shouldBypassCaps(userEmail)) {
    return {
      ok: true,
      bypassed: true,
      feature,
    };
  }

  const supabase = getSupabaseAdmin();
  const dayStart = getStartOfUtcDay();
  const weekStart = getStartOfUtcWeek();

  const [userFeatureToday, globalToday, globalThisWeek] = await Promise.all([
    countEvents({
      userId: cleanUserId,
      feature,
      since: dayStart,
    }),
    countEvents({
      since: dayStart,
    }),
    countEvents({
      since: weekStart,
    }),
  ]);

  const userDailyLimit = DAILY_USER_LIMITS[feature];

  if (userFeatureToday >= userDailyLimit) {
    throw new AiUsageLimitError(
      feature === 'generate_posts'
        ? 'You have reached today’s beta limit for weekly post generation. Please try again tomorrow.'
        : feature === 'rewrite_post'
          ? 'You have reached today’s beta limit for wording improvements. Please try again tomorrow.'
          : 'You have reached today’s beta limit for AI report recommendations. Please try again tomorrow.',
    );
  }

  if (globalToday >= GLOBAL_DAILY_LIMIT) {
    throw new AiUsageLimitError(
      'Today’s beta AI limit has been reached. Please try again tomorrow.',
    );
  }

  if (globalThisWeek >= GLOBAL_WEEKLY_LIMIT) {
    throw new AiUsageLimitError(
      'This week’s beta AI limit has been reached. Please try again next week.',
    );
  }

  const { error } = await supabase.from('ai_usage_events').insert({
    user_id: cleanUserId,
    feature,
  });

  if (error) {
    throw new Error(`Could not record AI usage: ${error.message}`);
  }

  return {
    ok: true,
    bypassed: false,
    feature,
    usedToday: userFeatureToday + 1,
    dailyLimit: userDailyLimit,
    globalToday: globalToday + 1,
    globalDailyLimit: GLOBAL_DAILY_LIMIT,
    globalThisWeek: globalThisWeek + 1,
    globalWeeklyLimit: GLOBAL_WEEKLY_LIMIT,
  };
}
