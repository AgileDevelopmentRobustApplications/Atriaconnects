-- AdraConnects — Admissions becomes a PRIVATE per-user contact.
-- Applied to Supabase project zgwckrpeveoemmwtriee as migration: admissions_private_contact
-- (This file is the repo reference copy; the authoritative version is in the
--  project's migration history.)
--
-- Before: "Admissions Office" was a club whose club_chat was a shared room where
--   everyone saw everyone else's messages.
-- After:  a new conversation type 'admission', each owned by exactly one user
--   (owner_id). A student sees only their own private thread; employees (faculty)
--   see every student's thread as an inbox and may reply in any of them. RLS
--   enforces the privacy.

-- ===== 1. Schema: owner_id + 'admission' type =====
alter table public.conversations
  add column owner_id uuid references public.profiles(id) on delete cascade;

alter table public.conversations drop constraint conversations_type_check;
alter table public.conversations add constraint conversations_type_check
  check (type in ('dm','club_chat','club_announcements','admission'));

alter table public.conversations drop constraint conversations_check;
alter table public.conversations add constraint conversations_check check (
  (type = 'dm' and club_id is null and dm_user_a is not null and dm_user_b is not null
     and dm_user_a < dm_user_b and owner_id is null)
  or (type in ('club_chat','club_announcements') and club_id is not null
     and dm_user_a is null and dm_user_b is null and owner_id is null)
  or (type = 'admission' and club_id is null and dm_user_a is null and dm_user_b is null
     and owner_id is not null)
);

create unique index uq_admission_owner on public.conversations(owner_id) where type = 'admission';

-- ===== 2. One private admission thread per non-faculty user =====
insert into public.conversations (type, owner_id)
select 'admission', p.id
from public.profiles p
where not exists (select 1 from public.employees e where e.user_id = p.id)
  and not exists (select 1 from public.conversations c where c.type = 'admission' and c.owner_id = p.id);

-- ===== 3. Migrate old shared-room messages into each sender's private thread =====
-- Each message is attributed to the most recent non-employee sender at/before it,
-- so a student's messages go to their own thread and a staff reply follows the
-- student it was answering.
with base as (
  select m.id, m.created_at,
    case when e.user_id is null then m.sender_id end as ne_sender,
    count(case when e.user_id is null then 1 end)
      over (order by m.created_at rows between unbounded preceding and current row) as grp
  from public.messages m
  left join public.employees e on e.user_id = m.sender_id
  where m.conversation_id in ('2ad8ba92-4119-4763-8dde-6392166cfa89',
                              '665d4e5d-9d2f-4b48-a5d1-0234cb3341ec')
),
owned as (
  -- exactly one non-null ne_sender per group; text cast because uuid has no max()
  select id, max(ne_sender::text) over (partition by grp)::uuid as owner_id from base
)
update public.messages m
set conversation_id = c.id
from owned o
join public.conversations c on c.type = 'admission' and c.owner_id = o.owner_id
where m.id = o.id;

-- ===== 4. Remove the old Admissions Office club and its channels =====
-- (messages already moved out; empty channels + club row are dropped)
delete from public.conversations where club_id = '5dfd4ff8-592b-4b34-81d9-68f995dc5c85';
delete from public.clubs where id = '5dfd4ff8-592b-4b34-81d9-68f995dc5c85';

-- ===== 5. Access rules =====
-- is_conversation_member: admission thread visible to its owner or any employee.
create or replace function public.is_conversation_member(_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations c
    where c.id = _conv and (
      (c.type = 'admission' and (c.owner_id = auth.uid() or public.is_employee()))
      or (c.type = 'dm' and auth.uid() in (c.dm_user_a, c.dm_user_b))
      or (c.club_id is not null and exists (
            select 1 from memberships m
            where m.club_id = c.club_id and m.user_id = auth.uid()))
    ));
$$;

-- can_post_in: in an admission thread, the owner (student/guest) and any employee
-- may post; announcements still require a club admin or employee.
create or replace function public.can_post_in(_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations c
    where c.id = _conv
      and case
        when c.type = 'admission'
          then c.owner_id = auth.uid() or public.is_employee()
        else public.is_conversation_member(_conv)
          and (c.type <> 'club_announcements'
               or public.is_club_admin(c.club_id) or public.is_employee())
      end
  );
$$;

-- ===== 6. Chat list: own thread for students, active queue for faculty =====
create or replace function public.get_chat_list()
returns table (
  conversation_id uuid, type text, club_id uuid, title text, avatar_color text,
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
  )
  select
    mc.id, mc.type, mc.club_id,
    case when mc.type = 'admission' and mc.other_id is null then 'Admissions'
         when mc.type = 'admission' then p.full_name
         else coalesce(cl.name, p.full_name) end as title,
    case when mc.type = 'admission' and mc.other_id is null then '#0a7cff'
         else coalesce(cl.avatar_color, p.avatar_color) end as avatar_color,
    mc.other_id, (mc.type = 'admission') as is_admission,
    lm.content, lm.created_at, lm.sender_id, sp.full_name,
    (lm.attachment_path is not null),
    coalesce((select count(*) from messages m
              where m.conversation_id = mc.id
                and m.sender_id <> auth.uid()
                and m.created_at > coalesce(cr.last_read_at, 'epoch'::timestamptz)), 0)
  from my_convs mc
  left join clubs cl on cl.id = mc.club_id
  left join profiles p on p.id = mc.other_id
  left join conversation_reads cr on cr.conversation_id = mc.id and cr.user_id = auth.uid()
  left join lateral (select * from messages m where m.conversation_id = mc.id
                     order by m.created_at desc limit 1) lm on true
  left join profiles sp on sp.id = lm.sender_id
  order by coalesce(lm.created_at, mc.created_at) desc;
$$;

-- ===== 7. Auto-create a private thread for every new (non-faculty) signup =====
create or replace function public.ensure_admission_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from employees e where e.user_id = new.id)
     and not exists (select 1 from conversations c where c.type = 'admission' and c.owner_id = new.id) then
    insert into conversations (type, owner_id) values ('admission', new.id);
  end if;
  return new;
end; $$;

create trigger on_profile_created_admission
  after insert on public.profiles
  for each row execute function public.ensure_admission_conversation();

revoke execute on function public.ensure_admission_conversation() from anon, authenticated, public;
