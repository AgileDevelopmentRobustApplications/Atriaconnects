import { createClient } from '@supabase/supabase-js'

// Publishable values — safe to ship in the client bundle (RLS is the security
// boundary). Env vars override them for local development against another project.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://zgwckrpeveoemmwtriee.supabase.co'
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_J7ezco2M177uP-eUvVZjXQ_AAFOk84V'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

if (import.meta.env.DEV) {
  window.__supabase = supabase
}
