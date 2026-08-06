-- AdraConnects — avatar_url and storage bucket for profile pictures
-- Applied to Supabase project zgwckrpeveoemmwtriee as migration: avatar_url_storage

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and owner = auth.uid()
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and owner = auth.uid()
  ) with check (
    bucket_id = 'avatars'
    and owner = auth.uid()
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and owner = auth.uid()
  );

-- Update get_chat_list to include avatar_url
create or replace function public.get_chat_list()
returns table (
  conversation_id uuid, type text, club_id uuid, academic_group_id uuid,
  title text, avatar_color text, avatar_url text,
  other_user_id uuid, is_admission boolean,
  last_message text, last_message_at timestamptz, last_sender_id uuid, last_sender_name text,
  last_has_attachment boolean, unread_count bigint
) language sql stable security definer set search_path = public as $$
  with my_convs as (
    select c.*,
      case when c.type = 'dm'
           then case when c.dm_user_a = auth.uid() then c.dm_user_b else c.dm_user_a end
           when c.type = 'admission' and c.owner_id <> auth.uid()
           then c.owner_id
      end as other_id
    from conversations c
    where (c.type = 'dm' and auth.uid() in (c.dm_user_a, c.dm_user_b))
       or (c.type = 'admission' and c.owner_id = auth.uid() and not public.is_employee())
       or (c.type = 'admission' and public.is_employee()
             and exists (select 1 from messages m where m.conversation_id = c.id))
       or (c.club_id is not null and exists (
             select 1 from memberships m where m.club_id = c.club_id and m.user_id = auth.uid()))
       or (c.academic_group_id is not null and exists (
             select 1 from academic_group_memberships m
             where m.group_id = c.academic_group_id and m.user_id = auth.uid()))
  )
  select
    mc.id, mc.type, mc.club_id, mc.academic_group_id,
    case when mc.type = 'admission' and mc.other_id is null then 'Admissions'
         when mc.type = 'admission' then p.full_name
         when mc.type in ('group_chat','group_announcements')
           then coalesce(g.name, 'Group')
         else coalesce(cl.name, p.full_name) end as title,
    case when mc.type = 'admission' and mc.other_id is null then '#0a7cff'
         when mc.type in ('group_chat','group_announcements')
           then coalesce(g.avatar_color, '#0a7cff')
         else coalesce(cl.avatar_color, p.avatar_color) end as avatar_color,
    case when mc.type = 'admission' and mc.other_id is null then null
         when mc.type in ('group_chat','group_announcements') then null
         else p.avatar_url end as avatar_url,
    mc.other_id, (mc.type = 'admission') as is_admission,
    lm.content, lm.created_at, lm.sender_id, sp.full_name,
    (lm.attachment_path is not null),
    coalesce((select count(*) from messages m
              where m.conversation_id = mc.id
                and m.sender_id <> auth.uid()
                and m.created_at > coalesce(cr.last_read_at, 'epoch'::timestamptz)), 0)
  from my_convs mc
  left join clubs cl on cl.id = mc.club_id
  left join academic_groups g on g.id = mc.academic_group_id
  left join profiles p on p.id = mc.other_id
  left join conversation_reads cr on cr.conversation_id = mc.id and cr.user_id = auth.uid()
  left join lateral (select * from messages m where m.conversation_id = mc.id
                     order by m.created_at desc limit 1) lm on true
  left join profiles sp on sp.id = lm.sender_id
  order by coalesce(lm.created_at, mc.created_at) desc;
$$;
