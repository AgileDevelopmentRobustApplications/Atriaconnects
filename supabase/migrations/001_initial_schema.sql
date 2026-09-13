-- AdraConnects — consolidated schema reference
-- Applied to Supabase project zgwckrpeveoemmwtriee as migrations:
--   core_schema, functions_and_triggers, rls_policies, realtime_and_storage, harden_function_grants

-- ============ TABLES ============

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_color text not null default '#00a884',
  created_at timestamptz not null default now()
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  avatar_color text not null default '#00a884',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.memberships (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index idx_memberships_user on public.memberships(user_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('dm','club_chat','club_announcements')),
  club_id uuid references public.clubs(id) on delete cascade,
  dm_user_a uuid references public.profiles(id) on delete cascade,
  dm_user_b uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (type = 'dm' and club_id is null and dm_user_a is not null
       and dm_user_b is not null and dm_user_a < dm_user_b)
    or
    (type in ('club_chat','club_announcements') and club_id is not null
       and dm_user_a is null and dm_user_b is null)
  )
);
create unique index uq_dm_pair on public.conversations(dm_user_a, dm_user_b) where type = 'dm';
create unique index uq_club_conv on public.conversations(club_id, type) where club_id is not null;

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  content text not null default '',
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_at timestamptz not null default now(),
  check (content <> '' or attachment_path is not null)
);
create index idx_messages_conv_time on public.messages(conversation_id, created_at desc);

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  location text not null default '',
  starts_at timestamptz not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index idx_events_club_time on public.events(club_id, starts_at);

create table public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('going','maybe','not_going')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ============ TRIGGERS ============

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    (array['#00a884','#7f66ff','#fe527a','#f5a623','#009de2','#d9534f','#5cb85c','#e83e8c'])[1 + floor(random()*8)::int]
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-confirm emails so signups can log in immediately (no SMTP configured)
create or replace function public.auto_confirm_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end; $$;

create trigger auto_confirm_before_insert
  before insert on auth.users
  for each row execute function public.auto_confirm_email();

-- ============ SECURITY-DEFINER HELPERS (avoid RLS recursion) ============

create or replace function public.is_club_member(_club uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where club_id = _club and user_id = auth.uid());
$$;

create or replace function public.is_club_admin(_club uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships
                 where club_id = _club and user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_conversation_member(_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations c
    where c.id = _conv and (
      (c.type = 'dm' and auth.uid() in (c.dm_user_a, c.dm_user_b))
      or (c.club_id is not null and exists (
            select 1 from memberships m
            where m.club_id = c.club_id and m.user_id = auth.uid()))
    ));
$$;

create or replace function public.can_post_in(_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations c
    where c.id = _conv
      and public.is_conversation_member(_conv)
      and (c.type <> 'club_announcements' or public.is_club_admin(c.club_id))
  );
$$;

-- ============ RPCS ============

create or replace function public.create_club(_name text, _description text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _club uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into clubs (name, description, avatar_color, created_by)
  values (
    _name, _description,
    (array['#00a884','#7f66ff','#fe527a','#f5a623','#009de2','#d9534f','#5cb85c','#e83e8c'])[1 + floor(random()*8)::int],
    auth.uid()
  )
  returning id into _club;
  insert into memberships (club_id, user_id, role) values (_club, auth.uid(), 'admin');
  insert into conversations (type, club_id) values ('club_chat', _club), ('club_announcements', _club);
  return _club;
end; $$;

create or replace function public.get_or_create_dm(_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare _a uuid;
        _b uuid;
        _conv uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if _other is null or _other = auth.uid() then raise exception 'invalid user'; end if;
  if not exists (select 1 from profiles where id = _other) then raise exception 'no such user'; end if;
  _a := least(auth.uid(), _other);
  _b := greatest(auth.uid(), _other);
  begin
    insert into conversations (type, dm_user_a, dm_user_b) values ('dm', _a, _b);
  exception when unique_violation then
    null;
  end;
  select id into _conv from conversations where type = 'dm' and dm_user_a = _a and dm_user_b = _b;
  return _conv;
end; $$;

create or replace function public.get_chat_list()
returns table (
  conversation_id uuid, type text, club_id uuid, title text, avatar_color text,
  other_user_id uuid,
  last_message text, last_message_at timestamptz, last_sender_id uuid, last_sender_name text,
  last_has_attachment boolean, unread_count bigint
) language sql stable security definer set search_path = public as $$
  with my_convs as (
    select c.*,
      case when c.type = 'dm'
           then case when c.dm_user_a = auth.uid() then c.dm_user_b else c.dm_user_a end
      end as other_id
    from conversations c
    where (c.type = 'dm' and auth.uid() in (c.dm_user_a, c.dm_user_b))
       or (c.club_id is not null and exists (
             select 1 from memberships m where m.club_id = c.club_id and m.user_id = auth.uid()))
  )
  select
    mc.id, mc.type, mc.club_id,
    coalesce(cl.name, p.full_name) as title,
    coalesce(cl.avatar_color, p.avatar_color) as avatar_color,
    mc.other_id,
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

-- ============ RLS ============

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.memberships enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "clubs_select" on public.clubs
  for select to authenticated using (true);
create policy "clubs_update_admin" on public.clubs
  for update to authenticated using (public.is_club_admin(id)) with check (public.is_club_admin(id));
create policy "clubs_delete_admin" on public.clubs
  for delete to authenticated using (public.is_club_admin(id));

create policy "memberships_select" on public.memberships
  for select to authenticated using (
    public.is_club_member(club_id) or public.is_club_admin(club_id)
  );
create policy "memberships_update_admin" on public.memberships
  for update to authenticated using (public.is_club_admin(club_id)) with check (public.is_club_admin(club_id));
create policy "memberships_delete" on public.memberships
  for delete to authenticated using (user_id = auth.uid() or public.is_club_admin(club_id));

create policy "conversations_select" on public.conversations
  for select to authenticated using (public.is_conversation_member(id));

create policy "messages_select" on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.can_post_in(conversation_id));
create policy "messages_delete_own" on public.messages
  for delete to authenticated using (sender_id = auth.uid());

create policy "reads_select" on public.conversation_reads
  for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "reads_insert_own" on public.conversation_reads
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "reads_update_own" on public.conversation_reads
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "events_select" on public.events
  for select to authenticated using (public.is_club_member(club_id));
create policy "events_insert_admin" on public.events
  for insert to authenticated
  with check (created_by = auth.uid() and public.is_club_admin(club_id));
create policy "events_update_admin" on public.events
  for update to authenticated using (public.is_club_admin(club_id)) with check (public.is_club_admin(club_id));
create policy "events_delete_admin" on public.events
  for delete to authenticated using (public.is_club_admin(club_id));

create policy "rsvps_select" on public.event_rsvps
  for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and public.is_club_member(e.club_id)));
create policy "rsvps_insert_own" on public.event_rsvps
  for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.events e where e.id = event_id and public.is_club_member(e.club_id)));
create policy "rsvps_update_own" on public.event_rsvps
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "rsvps_delete_own" on public.event_rsvps
  for delete to authenticated using (user_id = auth.uid());

-- ============ REALTIME + STORAGE ============

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_reads;
alter table public.conversation_reads replica identity full;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "attachments_insert_members" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );

create policy "attachments_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and owner = auth.uid());

-- ============ FUNCTION GRANT HARDENING ============

revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.auto_confirm_email() from anon, authenticated, public;
revoke execute on function public.is_club_member(uuid) from anon, public;
revoke execute on function public.is_club_admin(uuid) from anon, public;
revoke execute on function public.is_conversation_member(uuid) from anon, public;
revoke execute on function public.can_post_in(uuid) from anon, public;
revoke execute on function public.create_club(text, text) from anon, public;
revoke execute on function public.get_or_create_dm(uuid) from anon, public;
revoke execute on function public.get_chat_list() from anon, public;
alter default privileges in schema public revoke execute on functions from anon, public;
