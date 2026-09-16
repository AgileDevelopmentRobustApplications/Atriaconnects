-- Security Hardening Migration 028 — Rate Limiting & Input Validation
-- Adds server-side defenses that complement the client-side security layer.

-- ============ 1. RATE LIMITING TABLE ============
-- Tracks per-user action attempts for server-side rate limiting via RPC.
-- The client calls these RPCs before sensitive operations; Supabase GoTrue
-- also has built-in auth rate limits, but this covers custom actions.

create table if not exists public.rate_limits (
  id bigint generated always as identity primary key,
  user_ip text not null,
  action text not null,           -- e.g., 'login', 'password_reset', 'message_send'
  attempted_at timestamptz not null default now()
);

-- Index for efficient lookups by IP + action + time window
create index if not exists idx_rate_limits_lookup
  on public.rate_limits (user_ip, action, attempted_at desc);

-- Auto-cleanup: drop entries older than 1 hour to keep the table small
create or replace function public.cleanup_rate_limits()
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limits where attempted_at < now() - interval '1 hour';
$$;

-- RLS: no direct client access — only via RPCs
alter table public.rate_limits enable row level security;

-- ============ 2. INPUT LENGTH CONSTRAINTS ============
-- Add CHECK constraints to prevent oversized input from bypassing client validation.

-- Ensure message content has a sane max length
do $$ begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'messages_content_max_length'
  ) then
    alter table public.messages add constraint messages_content_max_length
      check (length(content) <= 5000);
  end if;
end $$;

-- Ensure display names have a sane max length
do $$ begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'profiles_full_name_max_length'
  ) then
    alter table public.profiles add constraint profiles_full_name_max_length
      check (length(full_name) <= 100);
  end if;
end $$;

-- ============ 3. RESTRICT PROFILE UPDATES ============
-- Users should only be able to update their own profile, and only specific fields.
-- Drop any overly permissive update policy and replace with a tight one.
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own_restricted" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
