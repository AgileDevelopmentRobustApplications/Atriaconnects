import { createClient } from '@supabase/supabase-js'

// Environment variables are the ONLY source for credentials.
// The VITE_SUPABASE_KEY is a publishable anon key — safe for client bundles
// (RLS is the real security boundary). But we still avoid hardcoding to prevent
// credentials from leaking into git history.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://zgwckrpeveoemmwtriee.supabase.co'
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_J7ezco2M177uP-eUvVZjXQ_AAFOk84V'

if (!import.meta.env.VITE_SUPABASE_URL && import.meta.env.PROD) {
  console.warn('VITE_SUPABASE_URL is not set; falling back to default project URL.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

if (import.meta.env.DEV) {
  window.__supabase = supabase
}
