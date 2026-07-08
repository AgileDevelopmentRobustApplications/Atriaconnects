-- AdraConnects — user tiers (guest/member), student info, Teams-style statuses,
-- admin-approved join requests, Admissions Office open to everyone.
-- Applied to Supabase project zgwckrpeveoemmwtriee as migration: rbac_admissions_statuses
-- (This file is the repo reference copy; the authoritative version is in the
--  project's migration history.)

-- ============ PROFILES: tiers, status, student info ============
alter table public.profiles
  add column user_type text not null default 'member' check (user_type in ('guest','member')),
  add column status text not null default 'active' check (status in ('active','idle','dnd','in_meeting','out_of_office')),
  add column phone text not null default '',
  add column department text not null default '',
  add column branch text not null default '',
  add column year int,
  add column admission_code text not null default '',
  add column dob date;

-- Backfill: Google accounts -> guest (unless faculty)
update public.profiles p set user_type = 'guest'
where exists (select 1 from auth.users u where u.id = p.id and u.raw_app_meta_data->>'provider' = 'google')
  and not exists (select 1 from public.employees e where e.user_id = p.id);

-- New signups: provider decides tier (google -> guest, email -> adra member)
-- handle_new_user() now inserts user_type from raw_app_meta_data->>'provider'.

-- ============ ADMISSIONS OFFICE ============
alter table public.clubs alter column created_by drop not null;
alter table public.clubs add column is_admission boolean not null default false;
-- Seeded one 'Admissions Office' club (is_admission = true) + its two conversations.

-- ============ HELPERS (all security definer, search_path pinned) ============
-- is_guest(): profile.user_type = 'guest' AND not an employee
-- is_conversation_member(): now also true for anyone on admissions conversations
-- can_post_in(): guests may post ONLY in the admissions club chat; announcements
--                need club admin or faculty
-- get_or_create_dm(): raises for guests
-- create_club(): raises for guests
-- get_chat_list(): admissions conversations included for every user; returns is_admission

-- ============ JOIN REQUESTS (admin-approved membership) ============
create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz
);
create unique index uq_pending_request on public.join_requests(club_id, user_id) where status = 'pending';

-- RLS: select = own requests / club admins / faculty
--      insert = self, pending, not guest, not already a member
--      decisions only via decide_join_request(_request, _approve) RPC, which
--      (club admin or faculty) approves -> inserts membership, or rejects.

-- Self-service joining removed:
--   drop policy "memberships_join_self" on public.memberships;
-- Club role management extended to faculty:
--   memberships update policy = is_club_admin(club_id) or is_employee()

-- ============ PROFILE EDITING ============
-- profiles update policy = own row or is_employee()
-- user_type is NOT client-updatable (column-level grant excludes it);
-- faculty change tiers via set_user_type(_user, _type) RPC.
-- Client-updatable columns: full_name, avatar_color, phone, department, branch,
--                           year, admission_code, dob, status

-- ============ REALTIME ============
alter publication supabase_realtime add table public.profiles;  -- live status dots

-- All new functions: execute granted to authenticated, revoked from anon/public.
