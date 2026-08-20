-- Reset / Remove all user data from Supabase Postgres & Auth
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

BEGIN;

-- 1. Clear user message activity and attachments
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.read_receipts CASCADE;

-- 2. Clear events, RSVPs, and attendance records
TRUNCATE TABLE public.event_attendance CASCADE;
TRUNCATE TABLE public.event_rsvps CASCADE;
TRUNCATE TABLE public.events CASCADE;

-- 3. Clear club memberships and join requests
TRUNCATE TABLE public.join_requests CASCADE;
TRUNCATE TABLE public.memberships CASCADE;

-- 4. Remove Direct Message (1:1) conversations
DELETE FROM public.conversations WHERE type = 'dm';

-- 5. Clear faculty/employee records
TRUNCATE TABLE public.employees CASCADE;

-- 6. Clear public user profiles
DELETE FROM public.profiles;

-- 7. Remove all registered authentication user accounts from auth.users (Cascades to all user links)
DELETE FROM auth.users;

COMMIT;
