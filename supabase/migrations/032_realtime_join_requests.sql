-- Live join-request routing: publish join requests and memberships over
-- realtime so club/group admins see new requests instantly and requesters
-- see their chats appear as soon as they're approved. RLS still applies to
-- realtime, so each subscriber only receives rows they can already SELECT.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['join_requests', 'memberships', 'academic_group_memberships'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;
