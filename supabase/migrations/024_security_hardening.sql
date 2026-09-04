-- Security Hardening Migration 024
-- Focus: Restricting wide-read policies, implementing private clubs, and role auditing.

-- ============ 1. RESTRICT PROFILE VISIBILITY ============
-- Drop the permissive "permit all" select policy
drop policy if exists "profiles_select" on public.profiles;

-- New policy: Allow read if:
-- 1. It is the user's own profile
-- 2. The requester is a staff member (employee)
-- 3. The requester shares at least one club with the profile owner
create policy "profiles_select_restricted" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or public.is_employee()
    or exists (
      select 1 from public.memberships m1
      join public.memberships m2 on m1.club_id = m2.club_id
      where m1.user_id = auth.uid() and m2.user_id = public.profiles.id
    )
  );

-- ============ 2. RESTRICT ROLE VISIBILITY ============
-- Drop the permissive "permit all" select policy on user_roles
drop policy if exists "user_roles_select" on public.user_roles;

-- New policy: Only employees can see the organizational role mapping
create policy "user_roles_select_staff_only" on public.user_roles
  for select to authenticated using (public.is_employee());

-- ============ 3. PRIVATE CLUBS ============
-- Add is_private column to clubs
alter table public.clubs add column if not exists is_private boolean not null default false;

-- Restrict club visibility:
-- Non-private clubs are public to all authenticated users.
-- Private clubs are visible only to members and admins.
drop policy if exists "clubs_select" on public.clubs;
create policy "clubs_select_restricted" on public.clubs
  for select to authenticated using (
    is_private = false
    or public.is_club_member(id)
    or public.is_club_admin(id)
  );

-- ============ 4. ROLE AUDIT LOGGING ============
-- Create audit table to track role changes
create table if not exists public.role_audit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  changed_by uuid not null references public.profiles(id),
  old_role text,
  new_role text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_at timestamptz not null default now()
);

alter table public.role_audit_log enable row level security;
create policy "role_audit_select_superadmin" on public.role_audit_log
  for select to authenticated using (public.is_superadmin());

-- Create trigger function for auditing
create or replace function public.audit_role_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.role_audit_log (user_id, changed_by, new_role, action)
    values (new.user_id, auth.uid(), new.role, 'INSERT');
  elsif (TG_OP = 'UPDATE') then
    insert into public.role_audit_log (user_id, changed_by, old_role, new_role, action)
    values (new.user_id, auth.uid(), old.role, new.role, 'UPDATE');
  elsif (TG_OP = 'DELETE') then
    insert into public.role_audit_log (user_id, changed_by, old_role, action)
    values (old.user_id, auth.uid(), old.role, 'DELETE');
  end if;
  return null;
end; $$;

create trigger tr_audit_role_changes
  after insert or update or delete on public.user_roles
  for each row execute function public.audit_role_changes();
