-- Infrastructure & Scalability Optimization for 50k Users
-- Target: Reduce query complexity and eliminate full table scans

-- 1. Index Creation
-- Optimize chat list and routing
CREATE INDEX IF NOT EXISTS idx_conversations_club_id ON public.conversations(club_id);
CREATE INDEX IF NOT EXISTS idx_conversations_academic_group_id ON public.conversations(academic_group_id);
CREATE INDEX IF NOT EXISTS idx_conversations_owner_id ON public.conversations(owner_id);

-- Optimize member listing for clubs
CREATE INDEX IF NOT EXISTS idx_memberships_club_id ON public.memberships(club_id);

-- Optimize user discovery (composite index for type and status)
CREATE INDEX IF NOT EXISTS idx_profiles_user_type_status ON public.profiles(user_type, status);

-- Optimize "My RSVPs" and attendance checks
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_user_id ON public.event_attendance(user_id);

-- 2. Unread Count Optimization
-- Add cached column to conversation_reads
ALTER TABLE public.conversation_reads
ADD COLUMN IF NOT EXISTS unread_count bigint DEFAULT 0;

-- Initialize unread_count for existing data
UPDATE public.conversation_reads cr
SET unread_count = (
  SELECT count(*)
  FROM public.messages m
  WHERE m.conversation_id = cr.conversation_id
    AND m.sender_id <> cr.user_id
    AND m.created_at > cr.last_read_at
);

-- 3. Trigger-based Unread Count Logic
-- Trigger function to increment unread count on new message
CREATE OR REPLACE FUNCTION public.increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment unread_count for all members of the conversation except the sender
  UPDATE public.conversation_reads
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id <> NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to messages table
DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.increment_unread_count();

-- Trigger function to reset unread count when marked as read
CREATE OR REPLACE FUNCTION public.reset_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset to 0 if the read timestamp has progressed
  IF NEW.last_read_at > OLD.last_read_at THEN
    NEW.unread_count := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to conversation_reads table
DROP TRIGGER IF EXISTS on_conversation_read_updated ON public.conversation_reads;
CREATE TRIGGER on_conversation_read_updated
  BEFORE UPDATE ON public.conversation_reads
  FOR EACH ROW EXECUTE FUNCTION public.reset_unread_count();

-- 4. Optimized get_chat_list()
-- Redefining the function to use the pre-calculated unread_count column
CREATE OR REPLACE FUNCTION public.get_chat_list()
RETURNS TABLE (
  conversation_id uuid, type text, club_id uuid, academic_group_id uuid,
  title text, avatar_color text, avatar_url text,
  other_user_id uuid, is_admission boolean,
  last_message text, last_message_at timestamptz, last_sender_id uuid, last_sender_name text,
  last_has_attachment boolean, unread_count bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_convs AS (
    SELECT c.*,
      CASE WHEN c.type = 'dm'
           THEN CASE WHEN c.dm_user_a = auth.uid() THEN c.dm_user_b ELSE c.dm_user_a END
           WHEN c.type = 'admission' AND c.owner_id <> auth.uid()
           THEN c.owner_id
      END AS other_id
    FROM conversations c
    WHERE (c.type = 'dm' AND auth.uid() IN (c.dm_user_a, c.dm_user_b))
       OR (c.type = 'admission' AND c.owner_id = auth.uid() AND NOT public.is_employee())
       OR (c.type = 'admission' AND public.is_employee()
             AND EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id))
       OR (c.club_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM memberships m WHERE m.club_id = c.club_id AND m.user_id = auth.uid()))
       OR (c.academic_group_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM academic_group_memberships m
             WHERE m.group_id = c.academic_group_id AND m.user_id = auth.uid()))
  )
  SELECT
    mc.id, mc.type, mc.club_id, mc.academic_group_id,
    CASE WHEN mc.type = 'admission' AND mc.other_id IS NULL THEN 'Admissions'
         WHEN mc.type = 'admission' THEN p.full_name
         WHEN mc.type IN ('group_chat','group_announcements')
           THEN COALESCE(g.name, 'Group')
         ELSE COALESCE(cl.name, p.full_name) END AS title,
    CASE WHEN mc.type = 'admission' AND mc.other_id IS NULL THEN '#0a7cff'
         WHEN mc.type IN ('group_chat','group_announcements')
           THEN COALESCE(g.avatar_color, '#0a7cff')
         ELSE COALESCE(cl.avatar_color, p.avatar_color) END AS avatar_color,
    CASE WHEN mc.type = 'admission' AND mc.other_id IS NULL THEN NULL
         WHEN mc.type IN ('group_chat','group_announcements') THEN NULL
         ELSE p.avatar_url END AS avatar_url,
    mc.other_id, (mc.type = 'admission') AS is_admission,
    lm.content, lm.created_at, lm.sender_id, sp.full_name,
    (lm.attachment_path IS NOT NULL),
    COALESCE(cr.unread_count, 0)
  FROM my_convs mc
  LEFT JOIN clubs cl ON cl.id = mc.club_id
  LEFT JOIN academic_groups g ON g.id = mc.academic_group_id
  LEFT JOIN profiles p ON p.id = mc.other_id
  LEFT JOIN conversation_reads cr ON cr.conversation_id = mc.id AND cr.user_id = auth.uid()
  LEFT JOIN LATERAL (SELECT * FROM messages m WHERE m.conversation_id = mc.id
                     ORDER BY m.created_at DESC LIMIT 1) lm ON TRUE
  LEFT JOIN profiles sp ON sp.id = lm.sender_id
  ORDER BY COALESCE(lm.created_at, mc.created_at) DESC;
$$;
