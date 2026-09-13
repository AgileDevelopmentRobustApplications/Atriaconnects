-- Migration: Fix Memberships Recursion and Implement Admin User Request System
-- Applied to Supabase project zgwckrpeveoemmwtriee

-- =============================================================================
-- 1. BREAK RECURSION: Convert Helper Functions to plpgsql
-- =============================================================================
-- We convert these from LANGUAGE sql to LANGUAGE plpgsql to prevent the
-- PostgreSQL optimizer from inlining them. This ensures that the
-- SECURITY DEFINER attribute is respected and RLS on the memberships
-- table is bypassed, breaking the infinite recursion loop.

CREATE OR REPLACE FUNCTION public.is_club_member(_club uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE club_id = _club AND user_id = auth.uid()
  );
END; $$;

CREATE OR REPLACE FUNCTION public.is_club_admin(_club uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE club_id = _club AND user_id = auth.uid() AND role = 'admin'
  );
END; $$;

CREATE OR REPLACE FUNCTION public.shares_club_with(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships m1
    JOIN public.memberships m2 ON m1.club_id = m2.club_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = _user_id
  );
END; $$;


-- =============================================================================
-- 2. ADMIN USER CREATION SYSTEM
-- =============================================================================

-- Since auth.users cannot be inserted into via standard SQL policies,
-- we create a request table. Admins can submit a request here, which
-- can then be fulfilled via an Edge Function using the service_role key.

CREATE TYPE public.user_request_status AS ENUM ('pending', 'completed', 'rejected');

CREATE TABLE public.user_creation_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  email text not null check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  full_name text not null,
  initial_role text,
  club_id uuid references public.clubs(id) on delete set null,
  status public.user_request_status not null default 'pending',
  created_at timestamptz not null default now()
);

ALTER TABLE public.user_creation_requests ENABLE ROW LEVEL SECURITY;

-- Only superadmins can view, create, or update user requests.
CREATE POLICY "user_requests_select_superadmin" ON public.user_creation_requests
  FOR SELECT TO authenticated USING (public.is_superadmin());

CREATE POLICY "user_requests_insert_superadmin" ON public.user_creation_requests
  FOR INSERT TO authenticated WITH CHECK (public.is_superadmin());

CREATE POLICY "user_requests_update_superadmin" ON public.user_creation_requests
  FOR UPDATE TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
