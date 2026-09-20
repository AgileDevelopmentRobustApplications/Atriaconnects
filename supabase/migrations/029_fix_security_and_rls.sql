-- Migration 029: Fix Profiles Update Policy for Admin Management
-- Relaxes profiles_update_own_restricted to allow employees/admins to manage profiles.

DROP POLICY IF EXISTS "profiles_update_own_restricted" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.is_employee()
  )
  WITH CHECK (
    id = auth.uid()
    OR public.is_employee()
  );