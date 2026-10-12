-- Management circulars: official notices published by staff (faculty, IT Dept,
-- Principal) from the admin panel and shown to users under
-- Notifications → Management circulars.
--
-- Audience:
--   everyone  — every signed-in user, guests included
--   students  — student (member) accounts; staff also see them
--   staff     — staff only
-- Staff can always read every circular so they can manage them.

CREATE TABLE IF NOT EXISTS public.circulars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (char_length(body) <= 5000),
  audience text NOT NULL DEFAULT 'everyone' CHECK (audience IN ('everyone', 'students', 'staff')),
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint CHECK (attachment_size IS NULL OR attachment_size <= 10485760),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS circulars_created_at_idx ON public.circulars (created_at DESC);

ALTER TABLE public.circulars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "circulars_select" ON public.circulars;
CREATE POLICY "circulars_select" ON public.circulars
  FOR SELECT TO authenticated
  USING (
    public.is_employee()
    OR audience = 'everyone'
    OR (
      audience = 'students'
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'member')
    )
  );

DROP POLICY IF EXISTS "circulars_insert_staff" ON public.circulars;
CREATE POLICY "circulars_insert_staff" ON public.circulars
  FOR INSERT TO authenticated
  WITH CHECK (public.is_employee() AND created_by = auth.uid());

-- Authors can withdraw their own circulars; superadmins can remove any.
DROP POLICY IF EXISTS "circulars_delete" ON public.circulars;
CREATE POLICY "circulars_delete" ON public.circulars
  FOR DELETE TO authenticated
  USING (public.is_employee() AND (created_by = auth.uid() OR public.is_superadmin()));

GRANT SELECT, INSERT, DELETE ON public.circulars TO authenticated;

-- Live updates for the Notifications window and the bell dot.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'circulars'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.circulars;
  END IF;
END;
$$;

-- Attachments (PDFs, images, documents): public-read bucket, staff upload,
-- 10 MB cap enforced here as well as in the client.
INSERT INTO storage.buckets (id, name, public)
VALUES ('circulars', 'circulars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "circulars_files_select" ON storage.objects;
CREATE POLICY "circulars_files_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'circulars');

DROP POLICY IF EXISTS "circulars_files_insert_staff" ON storage.objects;
CREATE POLICY "circulars_files_insert_staff" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'circulars'
    AND public.is_employee()
    AND (metadata->>'size')::bigint <= 10485760
  );

DROP POLICY IF EXISTS "circulars_files_delete_staff" ON storage.objects;
CREATE POLICY "circulars_files_delete_staff" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'circulars' AND public.is_employee());
