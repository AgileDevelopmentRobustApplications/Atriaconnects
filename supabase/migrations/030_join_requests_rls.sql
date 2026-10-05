-- Enforce the documented join request access rules.
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "join_requests_select" ON public.join_requests;
CREATE POLICY "join_requests_select" ON public.join_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_club_admin(club_id)
    OR public.is_employee()
  );

DROP POLICY IF EXISTS "join_requests_insert" ON public.join_requests;
CREATE POLICY "join_requests_insert" ON public.join_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND decided_by IS NULL
    AND decided_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.user_type <> 'guest' OR public.is_employee())
    )
    AND NOT public.is_club_member(club_id)
  );