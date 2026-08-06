-- AdraConnects — student semester column
-- Applied to Supabase project zgwckrpeveoemmwtriee as migration: student_semester
--
-- Adds a semester column on profiles. Bounded 1–12; null for non-students.

alter table public.profiles
  add column if not exists semester int
    check (semester is null or semester between 1 and 12);

comment on column public.profiles.semester is 'Current semester (1-12). Null for guests and faculty.';