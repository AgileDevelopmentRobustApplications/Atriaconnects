-- Admin panel → Announcements: staff (faculty, IT Dept, Principal) can read
-- every community/group announcement channel and post to any of them, even
-- ones they are not a member of. Regular chats and DMs stay private: these
-- policies only ever match conversations of the two announcement types.
--
-- Policies are permissive, so they widen access alongside the existing
-- member policies (migration 014) rather than replacing them.

CREATE OR REPLACE FUNCTION public.is_announcement_conversation(_conv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = _conv AND c.type IN ('club_announcements', 'group_announcements')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_announcement_conversation(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_announcement_conversation(uuid) FROM anon, public;

DROP POLICY IF EXISTS "conversations_select_staff_announcements" ON public.conversations;
CREATE POLICY "conversations_select_staff_announcements" ON public.conversations
  FOR SELECT TO authenticated
  USING (type IN ('club_announcements', 'group_announcements') AND public.is_employee());

DROP POLICY IF EXISTS "messages_select_staff_announcements" ON public.messages;
CREATE POLICY "messages_select_staff_announcements" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_employee() AND public.is_announcement_conversation(conversation_id));

DROP POLICY IF EXISTS "messages_insert_staff_announcements" ON public.messages;
CREATE POLICY "messages_insert_staff_announcements" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_employee()
    AND public.is_announcement_conversation(conversation_id)
  );
