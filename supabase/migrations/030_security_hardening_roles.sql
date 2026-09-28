-- Hardening RLS for user_roles table
-- Prevents any authenticated user from seeing all role assignments.
-- Only allows users to see their own roles, or admins to see everyone's.

drop policy if exists "user_roles_select" on public.user_roles;

create policy "user_roles_select_hardened" on public.user_roles
  for select to authenticated
  using (
    auth.uid() = user_id
    or
    public.is_superadmin()
  );

-- Adding missing index on profiles(user_type) for performance
create index if not exists idx_profiles_user_type on public.profiles(user_type);

-- Strengthening admission_code constraint to prevent empty strings
alter table public.clubs
add constraint check_admission_code_not_empty
check (char_length(trim(admission_code)) > 0);
