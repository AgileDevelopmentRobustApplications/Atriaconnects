-- AdraConnects — file size limit (10 MB) enforced in storage RLS
-- Applied to Supabase project zgwckrpeveoemmwtriee as migration: storage_10mb_limit
--
-- The 'attachments' bucket is public read, authenticated write. The previous
-- policy only checked that the user is a member of the conversation named in
-- the upload path's first folder. We extend it with a metadata->>'size' check
-- so the database (not just the client) rejects uploads over 10 MB.
--
-- Note: Supabase populates storage.objects.metadata->>'size' with the file size
-- on INSERT. We accept up to 10 * 1024 * 1024 = 10485760 bytes (10 MB).

drop policy if exists "attachments_insert_members" on storage.objects;

create policy "attachments_insert_members" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (metadata->>'size')::bigint <= 10485760
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );