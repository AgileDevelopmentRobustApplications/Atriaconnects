-- Migration: Refine Admin User Management Permissions and Implement Deletion Requests
-- Applied to Supabase project zgwckrpeveoemmwtriee

-- =============================================================================
-- 1. UPDATE USER CREATION PERMISSIONS
-- =============================================================================

-- The original policy restricted insertion to superadmins (itdept, principal).
-- We expand this to all employees (itdept, principal, faculty).
DROP POLICY IF EXISTS "user_requests_insert_superadmin" ON public.user_creation_requests;

CREATE POLICY "user_requests_insert_employee" ON public.user_creation_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_employee());

-- Keep SELECT and UPDATE restricted to superadmins for oversight.
-- (These were already restricted to is_superadmin in migration 026).


-- =============================================================================
-- 2. IMPLEMENT USER DELETION REQUEST SYSTEM
-- =============================================================================

-- Users cannot be deleted directly via standard RLS if we want an audit trail
-- and a request-based workflow for critical account deletions.
CREATE TABLE public.user_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status public.user_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint no_self_deletion check (requested_by <> user_id)
);

ALTER TABLE public.user_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Only the IT Department has the power to request/manage user deletions.
CREATE POLICY "user_deletion_it_only" ON public.user_deletion_requests
  FOR ALL TO authenticated
  USING (public.has_role('itdept'))
  WITH CHECK (public.has_role('itdept'));
