-- Extend join requests to academic groups and route decisions to resource admins.
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.join_requests
  ADD COLUMN IF NOT EXISTS academic_group_id uuid REFERENCES public.academic_groups(id) ON DELETE CASCADE;
ALTER TABLE public.join_requests ALTER COLUMN club_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'join_requests_one_target'
  ) THEN
    ALTER TABLE public.join_requests
      ADD CONSTRAINT join_requests_one_target CHECK (
        (club_id IS NOT NULL AND academic_group_id IS NULL)
        OR (club_id IS NULL AND academic_group_id IS NOT NULL)
      );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_group_request
  ON public.join_requests(academic_group_id, user_id)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.is_academic_group_member(_g uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.academic_group_memberships
    WHERE group_id = _g AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_academic_group_admin(_g uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.academic_group_memberships
    WHERE group_id = _g AND user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.shares_academic_group_with(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.academic_group_memberships mine
    JOIN public.academic_group_memberships theirs ON mine.group_id = theirs.group_id
    WHERE mine.user_id = auth.uid() AND theirs.user_id = _user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_review_join_requester(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.join_requests request_row
    WHERE request_row.user_id = _user_id
      AND request_row.status = 'pending'
      AND (
        public.is_employee()
        OR (request_row.club_id IS NOT NULL AND public.is_club_admin(request_row.club_id))
        OR (request_row.academic_group_id IS NOT NULL
            AND public.is_academic_group_admin(request_row.academic_group_id))
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_academic_group_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_academic_group_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_academic_group_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_review_join_requester(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.shares_academic_group_with(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_review_join_requester(uuid) FROM anon, public;

DROP POLICY IF EXISTS "profiles_select_shared_academic_group" ON public.profiles;
CREATE POLICY "profiles_select_shared_academic_group" ON public.profiles
  FOR SELECT TO authenticated USING (public.shares_academic_group_with(id));
DROP POLICY IF EXISTS "profiles_select_pending_join_request" ON public.profiles;
CREATE POLICY "profiles_select_pending_join_request" ON public.profiles
  FOR SELECT TO authenticated USING (public.can_review_join_requester(id));

DROP POLICY IF EXISTS "join_requests_select" ON public.join_requests;
CREATE POLICY "join_requests_select" ON public.join_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (club_id IS NOT NULL AND public.is_club_admin(club_id))
    OR (academic_group_id IS NOT NULL AND public.is_academic_group_admin(academic_group_id))
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
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.user_type <> 'guest' OR public.is_employee())
    )
    AND (
      (club_id IS NOT NULL AND academic_group_id IS NULL
        AND NOT public.is_club_member(club_id))
      OR
      (academic_group_id IS NOT NULL AND club_id IS NULL
        AND NOT public.is_academic_group_member(academic_group_id))
    )
  );

CREATE OR REPLACE FUNCTION public.decide_membership_request(_request uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  request_row public.join_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO request_row
  FROM public.join_requests
  WHERE id = _request
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'join request not found';
  END IF;

  IF request_row.status <> 'pending' THEN
    RAISE EXCEPTION 'join request is no longer pending';
  END IF;

  IF request_row.club_id IS NOT NULL THEN
    IF NOT (public.is_club_admin(request_row.club_id) OR public.is_employee()) THEN
      RAISE EXCEPTION 'not authorized to decide this request';
    END IF;
    IF _approve THEN
      INSERT INTO public.memberships (club_id, user_id, role)
      VALUES (request_row.club_id, request_row.user_id, 'member')
      ON CONFLICT (club_id, user_id) DO NOTHING;
    END IF;
  ELSE
    IF NOT (public.is_academic_group_admin(request_row.academic_group_id) OR public.is_employee()) THEN
      RAISE EXCEPTION 'not authorized to decide this request';
    END IF;
    IF _approve THEN
      INSERT INTO public.academic_group_memberships (group_id, user_id, role)
      VALUES (request_row.academic_group_id, request_row.user_id, 'member')
      ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
  END IF;

  UPDATE public.join_requests
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      decided_by = auth.uid(),
      decided_at = now()
  WHERE id = _request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decide_membership_request(uuid, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.decide_membership_request(uuid, boolean) FROM anon, public;