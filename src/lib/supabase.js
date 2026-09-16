import { createClient } from '@supabase/supabase-js'

// Environment variables are the ONLY source for credentials.
// The VITE_SUPABASE_KEY is a publishable anon key — safe for client bundles
// (RLS is the real security boundary). But we still avoid hardcoding to prevent
// credentials from leaking into git history.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY. ' +
    'Copy .env.example to .env and fill in your Supabase project credentials.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

if (import.meta.env.DEV) {
  window.__supabase = supabase
}
