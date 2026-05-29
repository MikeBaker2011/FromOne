import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This must match app/signin/page.tsx.
// If different pages use different storage keys, /signin and /dashboard can read different sessions,
// which can cause a redirect flicker between the two pages.
export const supabaseBrowser = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'fromone-auth-session',
  },
});
