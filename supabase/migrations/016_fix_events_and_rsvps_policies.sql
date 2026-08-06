-- Drop existing conflicting policies
drop policy if exists "events_select" on public.events;
drop policy if exists "events_insert_admin" on public.events;
drop policy if exists "rsvps_select" on public.event_rsvps;
drop policy if exists "rsvps_insert_own" on public.event_rsvps;
drop policy if exists "attendance_select" on public.event_attendance;

-- 1. Enable RLS (just in case)
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.event_attendance enable row level security;

-- 2. Define events_select policy
-- Club events are public to browse for all authenticated users (including guests).
-- Academic group events are private, visible only to group members or employees.
create policy "events_select" on public.events
  for select to authenticated
  using (
    club_id is not null
    or (academic_group_id is not null and (public.is_academic_group_member(academic_group_id) or public.is_employee()))
  );

-- 3. Define events_insert_admin policy
-- Allows club admins, academic group admins, or any staff member (employee) to schedule events.
create policy "events_insert_admin" on public.events
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (club_id is not null and (public.is_club_admin(club_id) or public.is_employee()))
      or (academic_group_id is not null and (public.is_academic_group_admin(academic_group_id) or public.is_employee()))
    )
  );

-- 4. Define rsvps_select policy
-- RSVPs are visible if the user can select/view the event.
create policy "rsvps_select" on public.event_rsvps
  for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (
          e.club_id is not null
          or (e.academic_group_id is not null and (public.is_academic_group_member(e.academic_group_id) or public.is_employee()))
        )
    )
  );

-- 5. Define rsvps_insert_own policy
-- Allows users to RSVP to events if they are a member of the hosting club or academic group.
create policy "rsvps_insert_own" on public.event_rsvps
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and (
          (e.club_id is not null and public.is_club_member(e.club_id))
          or (e.academic_group_id is not null and public.is_academic_group_member(e.academic_group_id))
        )
    )
  );

-- 6. Define attendance_select policy
-- Attendance records are visible to staff or to members of the hosting club / academic group.
create policy "attendance_select" on public.event_attendance
  for select to authenticated
  using (
    public.is_employee()
    or exists (
      select 1 from public.events e
      where e.id = event_id
        and (
          (e.club_id is not null and public.is_club_member(e.club_id))
          or (e.academic_group_id is not null and public.is_academic_group_member(e.academic_group_id))
        )
    )
  );
