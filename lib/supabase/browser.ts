import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

declare global {
  // eslint-disable-next-line no-var
  var __fromOneSupabaseBrowser: SupabaseClient | undefined;
}

export const supabaseBrowser =
  globalThis.__fromOneSupabaseBrowser ??
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'fromone-auth-session',
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__fromOneSupabaseBrowser = supabaseBrowser;
}