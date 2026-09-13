-- Migration: Fix Events RLS violation and Memberships infinite recursion
-- Applied to Supabase project zgwckrpeveoemmwtriee

-- =============================================================================
-- FIX 1: Events Table - Resolve Insert Violation
-- =============================================================================

-- Create a trigger function to automatically set created_by to the current user.
-- This avoids 'new row violates row-level security policy' when the application
-- doesn't provide created_by or does so in a way that conflicts with the RLS check.
CREATE OR REPLACE FUNCTION public.set_events_created_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END; $$;

-- Apply the trigger BEFORE insertion so the value is present during RLS WITH CHECK.
DROP TRIGGER IF EXISTS tr_set_events_created_by ON public.events;
CREATE TRIGGER tr_set_events_created_by
  BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_events_created_by();

-- Simplify the RLS policy: Remove the explicit created_by check as the trigger handles it.
-- Focus purely on whether the user is authorized to create an event for the given club/group.
DROP POLICY IF EXISTS "events_insert_admin" ON public.events;
CREATE POLICY "events_insert_admin" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    (club_id IS NOT NULL AND (public.is_club_admin(club_id) OR public.is_employee()))
    OR
    (academic_group_id IS NOT NULL AND (public.is_academic_group_admin(academic_group_id) OR public.is_employee()))
  );


-- =============================================================================
-- FIX 2: Memberships/Profiles - Break Infinite Recursion
-- =============================================================================

-- Create a SECURITY DEFINER function to check club sharing.
-- This bypasses RLS on the memberships table, breaking the recursion loop
-- that occurs when profiles_select_restricted reads memberships.
CREATE OR REPLACE FUNCTION public.shares_club_with(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m1
    JOIN public.memberships m2 ON m1.club_id = m2.club_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = _user_id
  );
$$;

-- Update the profiles select policy to use the helper function.
-- This replaces the direct subquery on public.memberships.
DROP POLICY IF EXISTS "profiles_select_restricted" ON public.profiles;
CREATE POLICY "profiles_select_restricted" ON public.profiles
  FOR SELECT TO authenticated USING (
    id = auth.uid()
    OR public.is_employee()
    OR public.shares_club_with(id)
  );
