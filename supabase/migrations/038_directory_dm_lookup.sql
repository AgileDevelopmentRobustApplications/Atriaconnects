-- Let anyone message committee members from the Management directory.
--
-- Profiles are only readable for yourself, staff (if you are staff) and people
-- you share a club/group with (migrations 024/025/031). So a student opening a
-- committee page couldn't resolve a teacher's email to an account, and the
-- card's "Message" button stayed disabled. get_or_create_dm() itself already
-- allows any two non-guest users.
--
-- 1. find_directory_accounts(): email → account id, for college addresses only
--    (@atria.edu / @atria.edu.in — already public in the committee directory).
--    Returns nothing but the id; no other profile data is exposed.
-- 2. DM partners can see each other's profile (name on messages, presence).
--
-- Numbered 038 because the live project already has 036/037 applied from
-- elsewhere. Safe to re-run.

CREATE OR REPLACE FUNCTION public.find_directory_accounts(_emails text[])
RETURNS TABLE (email text, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(p.email), p.id
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND lower(p.email) = ANY (SELECT lower(btrim(e)) FROM unnest(_emails) AS e)
    AND (lower(p.email) LIKE '%@atria.edu' OR lower(p.email) LIKE '%@atria.edu.in')
  LIMIT 500;
$$;

REVOKE EXECUTE ON FUNCTION public.find_directory_accounts(text[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.find_directory_accounts(text[]) TO authenticated;

-- SECURITY DEFINER so the policy below doesn't re-enter conversations RLS.
CREATE OR REPLACE FUNCTION public.has_dm_with(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.type = 'dm'
      AND ((c.dm_user_a = auth.uid() AND c.dm_user_b = _user_id)
        OR (c.dm_user_b = auth.uid() AND c.dm_user_a = _user_id))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_dm_with(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_dm_with(uuid) TO authenticated;

DROP POLICY IF EXISTS "profiles_select_dm_partner" ON public.profiles;
CREATE POLICY "profiles_select_dm_partner" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_dm_with(id));
