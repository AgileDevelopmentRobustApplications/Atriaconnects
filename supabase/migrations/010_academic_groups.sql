-- AdraConnects — academic groups + community subgroups
-- Applied to Supabase project zgwckrpeveoemmwtriee as migration: academic_groups
--
-- Adds a parallel 'academic_groups' table for course/section/subject groups
-- (separate from clubs/communities which are extracurricular). Each group can
-- itself have subgroups via parent_id. Existing clubs also gain a parent_id
-- column for nested community structure (sub-clubs).
--
-- Conversations gain an academic_group_id column and a new conversation type
-- pair ('group_chat', 'group_announcements') that mirror the club_* pair but
-- live under academic_group_memberships.
--
-- Helper functions is_conversation_member, can_post_in, and get_chat_list are
-- updated to handle group_* types. Existing types ('dm', 'club_chat',
-- 'club_announcements', 'admission') keep working unchanged.

-- ============ ACADEMIC GROUPS ============

create table if not exists public.academic_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  avatar_color text not null default '#0a7cff',
  parent_id uuid references public.academic_groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index if not exists idx_academic_groups_parent on public.academic_groups(parent_id);

create table if not exists public.academic_group_memberships (
  group_id uuid not null references public.academic_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists idx_acgm_user on public.academic_group_memberships(user_id);

-- ============ SUB-CLUBS ============

alter table public.clubs
  add column if not exists parent_id uuid references public.clubs(id) on delete cascade;

-- Add CHECK that a club isn't its own parent (skip if check exists already).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clubs_no_self_parent'
  ) then
    alter table public.clubs add constraint clubs_no_self_parent
      check (parent_id is null or parent_id <> id);
  end if;
end $$;

create index if not exists idx_clubs_parent on public.clubs(parent_id);

-- ============ CONVERSATIONS: new columns + new types ============

alter table public.conversations
  add column if not exists academic_group_id uuid references public.academic_groups(id) on delete cascade;

-- Replace the row-shape check with an extended one (idempotent).
alter table public.conversations drop constraint if exists conversations_check;
alter table public.conversations add constraint conversations_check check (
  (type = 'dm' and club_id is null and dm_user_a is not null and dm_user_b is not null
     and dm_user_a < dm_user_b and owner_id is null and academic_group_id is null)
  or (type in ('club_chat','club_announcements') and club_id is not null
     and dm_user_a is null and dm_user_b is null and owner_id is null and academic_group_id is null)
  or (type = 'admission' and club_id is null and dm_user_a is null and dm_user_b is null
     and owner_id is not null and academic_group_id is null)
  or (type in ('group_chat','group_announcements') and academic_group_id is not null
     and club_id is null and dm_user_a is null and dm_user_b is null and owner_id is null)
);

alter table public.conversations drop constraint if exists conversations_type_check;
alter table public.conversations add constraint conversations_type_check
  check (type in ('dm','club_chat','club_announcements','admission','group_chat','group_announcements'));

create unique index if not exists uq_group_conv
  on public.conversations(academic_group_id, type) where academic_group_id is not null;

-- ============ EVENTS: support groups ============

alter table public.events
  add column if not exists academic_group_id uuid references public.academic_groups(id) on delete cascade;

-- The CHECK / RLS for events assumed club_id is required. Drop the old check
-- (it doesn't exist as named) and replace events_select / events_insert /
-- events_update / events_delete to handle both clubs and groups.

drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select to authenticated
  using (
    (club_id is not null and (public.is_club_member(club_id) or public.is_employee()))
    or
    (academic_group_id is not null and (
       exists (select 1 from academic_group_memberships m
               where m.group_id = academic_group_id and m.user_id = auth.uid())
       or public.is_employee()
    ))
  );

drop policy if exists "events_insert_admin" on public.events;
create policy "events_insert_admin" on public.events
  for insert to authenticated
  with check (
    created_by = auth.uid() and (
      (club_id is not null and public.is_club_admin(club_id))
      or
      (academic_group_id is not null and exists (
        select 1 from academic_group_memberships m
        where m.group_id = academic_group_id and m.user_id = auth.uid() and m.role = 'admin'
      ))
    )
  );

drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events
  for update to authenticated
  using (
    (club_id is not null and (public.is_club_admin(club_id) or public.is_employee()))
    or
    (academic_group_id is not null and (
       exists (select 1 from academic_group_memberships m
               where m.group_id = academic_group_id and m.user_id = auth.uid() and m.role = 'admin')
       or public.is_employee()
    ))
  )
  with check (
    (club_id is not null and (public.is_club_admin(club_id) or public.is_employee()))
    or
    (academic_group_id is not null and (
       exists (select 1 from academic_group_memberships m
               where m.group_id = academic_group_id and m.user_id = auth.uid() and m.role = 'admin')
       or public.is_employee()
    ))
  );

drop policy if exists "events_delete" on public.events;
create policy "events_delete" on public.events
  for delete to authenticated
  using (
    (club_id is not null and (public.is_club_admin(club_id) or public.is_employee()))
    or
    (academic_group_id is not null and (
       exists (select 1 from academic_group_memberships m
               where m.group_id = academic_group_id and m.user_id = auth.uid() and m.role = 'admin')
       or public.is_employee()
    ))
  );

-- ============ HELPERS ============

create or replace function public.is_academic_group_member(_g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from academic_group_memberships
                 where group_id = _g and user_id = auth.uid());
$$;

create or replace function public.is_academic_group_admin(_g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from academic_group_memberships
                 where group_id = _g and user_id = auth.uid() and role = 'admin');
$$;

-- Extend is_conversation_member to include group_* types.
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
      or (c.academic_group_id is not null and exists (
            select 1 from academic_group_memberships m
            where m.group_id = c.academic_group_id and m.user_id = auth.uid()))
    ));
$$;

create or replace function public.can_post_in(_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations c
    where c.id = _conv
      and case
        when c.type = 'admission'
          then c.owner_id = auth.uid() or public.is_employee()
        when c.type = 'group_announcements'
          then public.is_academic_group_admin(c.academic_group_id) or public.is_employee()
        when c.type in ('group_chat')
          then public.is_academic_group_member(c.academic_group_id) or public.is_employee()
        else public.is_conversation_member(_conv)
          and (c.type <> 'club_announcements'
               or public.is_club_admin(c.club_id) or public.is_employee())
      end
  );
$$;

-- Update get_chat_list to include group chats for members.
create or replace function public.get_chat_list()
returns table (
  conversation_id uuid, type text, club_id uuid, academic_group_id uuid,
  title text, avatar_color text,
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

-- ============ RLS on academic_groups + memberships ============

alter table public.academic_groups enable row level security;
alter table public.academic_group_memberships enable row level security;

create policy "academic_groups_select" on public.academic_groups
  for select to authenticated using (true);
create policy "academic_groups_insert_employee" on public.academic_groups
  for insert to authenticated with check (public.is_employee());
create policy "academic_groups_update_admin" on public.academic_groups
  for update to authenticated
  using (public.is_academic_group_admin(id) or public.is_employee())
  with check (public.is_academic_group_admin(id) or public.is_employee());
create policy "academic_groups_delete_admin" on public.academic_groups
  for delete to authenticated
  using (public.is_employee());

create policy "acgm_select" on public.academic_group_memberships
  for select to authenticated using (true);
create policy "acgm_insert_employee_or_admin" on public.academic_group_memberships
  for insert to authenticated
  with check (
    public.is_academic_group_admin(group_id)
    or public.is_employee()
    or user_id = auth.uid()  -- joining yourself
  );
create policy "acgm_update_admin" on public.academic_group_memberships
  for update to authenticated
  using (public.is_academic_group_admin(group_id) or public.is_employee())
  with check (public.is_academic_group_admin(group_id) or public.is_employee());
create policy "acgm_delete" on public.academic_group_memberships
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_academic_group_admin(group_id)
    or public.is_employee()
  );

-- ============ CLUB parent_id RLS update ============
-- Sub-club membership inherits parent's admin? Keep simple: a sub-club's admin
-- is independent of its parent's. But let superadmins / employees delete a
-- sub-club too.

drop policy if exists "clubs_delete" on public.clubs;
create policy "clubs_delete" on public.clubs
  for delete to authenticated
  using (public.is_club_admin(id) or public.is_employee());

-- ============ RPC: create_academic_group ============

create or replace function public.create_academic_group(_name text, _description text, _parent uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare _g uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_employee() then
    raise exception 'only staff can create academic groups';
  end if;
  insert into academic_groups (name, description, parent_id, created_by)
  values (_name, _description, _parent, auth.uid())
  returning id into _g;
  insert into academic_group_memberships (group_id, user_id, role)
  values (_g, auth.uid(), 'admin');
  insert into conversations (type, academic_group_id)
  values ('group_chat', _g), ('group_announcements', _g);
  return _g;
end; $$;

grant execute on function public.create_academic_group(text, text, uuid) to authenticated;
grant execute on function public.is_academic_group_member(uuid) to authenticated;
grant execute on function public.is_academic_group_admin(uuid) to authenticated;
revoke execute on function public.create_academic_group(text, text, uuid) from anon, public;
revoke execute on function public.is_academic_group_member(uuid) from anon, public;
revoke execute on function public.is_academic_group_admin(uuid) from anon, public;

-- ============ Sub-club support: create_subclub ============
-- Creates a community nested under a parent club. Caller becomes admin of the
-- sub-club. Sub-club admin is independent of parent admin.

create or replace function public.create_subclub(_parent uuid, _name text, _description text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _club uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from clubs where id = _parent) then
    raise exception 'no such parent club';
  end if;
  insert into clubs (name, description, avatar_color, created_by, parent_id)
  values (
    _name, _description,
    (array['#00a884','#7f66ff','#fe527a','#f5a623','#009de2','#d9534f','#5cb85c','#e83e8c'])[1 + floor(random()*8)::int],
    auth.uid(), _parent
  )
  returning id into _club;
  insert into memberships (club_id, user_id, role) values (_club, auth.uid(), 'admin');
  insert into conversations (type, club_id) values ('club_chat', _club), ('club_announcements', _club);
  return _club;
end; $$;

grant execute on function public.create_subclub(uuid, text, text) to authenticated;
revoke execute on function public.create_subclub(uuid, text, text) from anon, public;