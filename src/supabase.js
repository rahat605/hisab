import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Fail closed for missing/template values. These are public browser keys only.
const looksLikeProjectUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
const looksLikePublicKey = key.length > 20 &&
  !/(YOUR_|service_role|secret)/i.test(key);

export const supabaseConfigured = looksLikeProjectUrl && looksLikePublicKey;
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
