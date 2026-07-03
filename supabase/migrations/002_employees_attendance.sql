-- AdraConnects — employees (faculty) + event attendance + admin oversight
-- Applied to Supabase project zgwckrpeveoemmwtriee as migrations:
--   employees_and_attendance, revoke_anon_new_functions

create table public.employees (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'teacher' check (role in ('teacher','hod')),
  department text not null default '',
  created_at timestamptz not null default now()
);

create table public.event_attendance (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  present boolean not null default false,
  marked_by uuid not null references public.profiles(id),
  marked_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ============ Helpers ============
create or replace function public.is_employee()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from employees where user_id = auth.uid());
$$;

create or replace function public.is_hod()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from employees where user_id = auth.uid() and role = 'hod');
$$;

-- Attendance can be marked by any employee or by the club's admin
create or replace function public.can_manage_event(_event uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_employee() or exists (
    select 1 from events e where e.id = _event and public.is_club_admin(e.club_id)
  );
$$;

-- Self-service faculty registration with a staff access code
-- Codes: FACULTY-2026 -> teacher, HOD-2026 -> hod (change before real use)
create or replace function public.register_employee(_code text, _department text)
returns void language plpgsql security definer set search_path = public as $$
declare _role text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if _code = 'FACULTY-2026' then _role := 'teacher';
  elsif _code = 'HOD-2026' then _role := 'hod';
  else raise exception 'Invalid staff access code';
  end if;
  insert into employees (user_id, role, department)
  values (auth.uid(), _role, coalesce(_department, ''))
  on conflict (user_id) do update set role = excluded.role, department = excluded.department;
end; $$;

grant execute on function public.is_employee() to authenticated;
grant execute on function public.is_hod() to authenticated;
grant execute on function public.can_manage_event(uuid) to authenticated;
grant execute on function public.register_employee(text, text) to authenticated;

revoke execute on function public.is_employee() from anon, public;
revoke execute on function public.is_hod() from anon, public;
revoke execute on function public.can_manage_event(uuid) from anon, public;
revoke execute on function public.register_employee(text, text) from anon, public;

-- ============ RLS: new tables ============
alter table public.employees enable row level security;
alter table public.event_attendance enable row level security;

create policy "employees_select" on public.employees
  for select to authenticated using (true);
create policy "employees_insert_hod" on public.employees
  for insert to authenticated with check (public.is_hod());
create policy "employees_update_hod" on public.employees
  for update to authenticated using (public.is_hod()) with check (public.is_hod());
create policy "employees_delete_hod" on public.employees
  for delete to authenticated using (public.is_hod());

create policy "attendance_select" on public.event_attendance
  for select to authenticated
  using (public.is_employee() or exists (
    select 1 from public.events e where e.id = event_id and public.is_club_member(e.club_id)));
create policy "attendance_insert" on public.event_attendance
  for insert to authenticated
  with check (marked_by = auth.uid() and public.can_manage_event(event_id));
create policy "attendance_update" on public.event_attendance
  for update to authenticated
  using (public.can_manage_event(event_id)) with check (public.can_manage_event(event_id));
create policy "attendance_delete" on public.event_attendance
  for delete to authenticated using (public.can_manage_event(event_id));

-- ============ RLS: employee oversight on existing tables ============
-- (chats/DMs stay private to their members; employees oversee clubs, events, attendance)

drop policy "events_select" on public.events;
create policy "events_select" on public.events
  for select to authenticated
  using (public.is_club_member(club_id) or public.is_employee());

drop policy "events_update_admin" on public.events;
create policy "events_update" on public.events
  for update to authenticated
  using (public.is_club_admin(club_id) or public.is_employee())
  with check (public.is_club_admin(club_id) or public.is_employee());

drop policy "events_delete_admin" on public.events;
create policy "events_delete" on public.events
  for delete to authenticated
  using (public.is_club_admin(club_id) or public.is_employee());

drop policy "rsvps_select" on public.event_rsvps;
create policy "rsvps_select" on public.event_rsvps
  for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id
                 and (public.is_club_member(e.club_id) or public.is_employee())));

drop policy "memberships_delete" on public.memberships;
create policy "memberships_delete" on public.memberships
  for delete to authenticated
  using (user_id = auth.uid() or public.is_club_admin(club_id) or public.is_employee());

drop policy "clubs_delete_admin" on public.clubs;
create policy "clubs_delete" on public.clubs
  for delete to authenticated
  using (public.is_club_admin(id) or public.is_hod());
