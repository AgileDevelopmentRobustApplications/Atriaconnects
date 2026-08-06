-- AdraConnects — multi-tag user roles replacing the legacy employees.role enum
-- Applied to Supabase project zgwckrpeveoemmwtriee as migration: user_roles_multi
--
-- The previous schema only allowed one role per user (employees.role in
-- ('teacher','hod')). The new model lets a single user carry any subset of
-- role tags: management, intern, floor_incharge, faculty, itdept, principal.
-- 'itdept' and 'principal' together constitute the "superadmin" pair — only
-- they can create or remove admin-grade users.
--
-- The 'employees' table is kept intact (not dropped) so this migration is
-- reversible. New code paths use user_roles exclusively. The employees row
-- becomes legacy metadata that will be removed in a later cleanup migration.

-- ============ NEW TABLE ============

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in (
    'management','intern','floor_incharge','faculty','itdept','principal'
  )),
  department text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index if not exists idx_user_roles_role on public.user_roles(role);

-- ============ BACKFILL ============
-- Existing employees rows -> 'faculty' role (with their department).
insert into public.user_roles (user_id, role, department)
select user_id, 'faculty', department
from public.employees
on conflict do nothing;

-- ============ HELPERS ============

create or replace function public.has_role(_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles
                 where user_id = auth.uid() and role = _role);
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role in ('itdept','principal')
  );
$$;

-- Replace the old is_employee()/is_hod() so existing RLS keeps working.
-- 'is_employee' now means: user has any staff-grade role.
create or replace function public.is_employee()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid()
      and role in ('faculty','itdept','principal')
  );
$$;

-- 'is_hod' becomes a synonym of is_employee until we wire up the new
-- department-based HOD concept. Marked DEPRECATED in code comments.
create or replace function public.is_hod()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_employee();
$$;

grant execute on function public.has_role(text) to authenticated;
grant execute on function public.is_superadmin() to authenticated;
revoke execute on function public.has_role(text) from anon, public;
revoke execute on function public.is_superadmin() from anon, public;

-- ============ RLS on user_roles ============
alter table public.user_roles enable row level security;

-- Anyone authenticated can see roles (needed for chip rendering in lists).
create policy "user_roles_select" on public.user_roles
  for select to authenticated using (true);

-- Only superadmins can insert or update or delete role assignments.
create policy "user_roles_insert_superadmin" on public.user_roles
  for insert to authenticated with check (public.is_superadmin());
create policy "user_roles_update_superadmin" on public.user_roles
  for update to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
create policy "user_roles_delete_superadmin" on public.user_roles
  for delete to authenticated using (public.is_superadmin());

-- ============ PROMOTE EMPLOYEE INSERTS TO SUPERADMIN ============
-- The legacy employees insert/update/delete policies still gate on is_hod().
-- In the new model we want those gated on is_superadmin(). The cleanest way
-- is to drop and re-create those policies.
drop policy if exists "employees_insert_hod" on public.employees;
drop policy if exists "employees_update_hod" on public.employees;
drop policy if exists "employees_delete_hod" on public.employees;

create policy "employees_insert_superadmin" on public.employees
  for insert to authenticated with check (public.is_superadmin());
create policy "employees_update_superadmin" on public.employees
  for update to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
create policy "employees_delete_superadmin" on public.employees
  for delete to authenticated using (public.is_superadmin());