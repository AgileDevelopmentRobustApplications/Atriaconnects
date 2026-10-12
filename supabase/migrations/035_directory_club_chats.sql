-- A chat room for every student club in the Communities directory
-- (src/data/clubs.json). Each directory club becomes a normal community:
-- a row in public.clubs (linked by directory_id) with its club_chat and
-- club_announcements conversations — the same shape create_club() makes.
--
-- Joining works like any community: members request to join and club admins
-- or staff approve (migration 031). These clubs start with no admin, so staff
-- review requests until admins are appointed in Admin → Communities.
-- Safe to re-run: existing clubs/conversations are left untouched.

ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS directory_id text;
CREATE UNIQUE INDEX IF NOT EXISTS clubs_directory_id_key ON public.clubs (directory_id);

INSERT INTO public.clubs (directory_id, name, description, avatar_color, created_by)
VALUES
  ('club-iste', 'ISTE Atria Student Chapter', 'Fostering tech innovation and community through workshops, hackathons and events.', '#1f3b73', NULL),
  ('club-cca', 'Cultural Committee of Atria', 'Cultural Committee of Atria IT.', '#1a1a1a', NULL),
  ('club-gdg', 'GDG Atria', 'Google Developer Group — unleashing innovation one code at a time.', '#4285f4', NULL),
  ('club-afl', 'Atria Football League', 'Atria''s premier football competition.', '#c0213e', NULL),
  ('club-atria-foundation', 'The Atria Foundation', 'Humane for Humanity — committed to a hunger-free Bangalore.', '#c8102e', NULL),
  ('club-rotaract', 'Rotaract Club of Atria', 'RI District 3191, Zone Mirage.', '#d41367', NULL),
  ('club-aws-sbg', 'AWS Student Builder Group', 'Bridging the gap from campus to cloud.', '#7b2ff7', NULL),
  ('club-oscode', 'OS Code', 'Code – Create – Collaborate. Building ideas into reality.', '#0aa5d6', NULL),
  ('club-green-innovators', 'Green Innovators', 'Sustainable ideas, smart solutions. Small steps, big impact.', '#2e7d32', NULL),
  ('club-ieee-ras', 'IEEE RAS Atria', 'IEEE Robotics & Automation Society — workshops, projects and events.', '#7a1f6b', NULL)
ON CONFLICT (directory_id) DO NOTHING;

-- Chat + announcements rooms for each directory club that doesn't have them yet.
INSERT INTO public.conversations (type, club_id)
SELECT t.type, c.id
FROM public.clubs c
CROSS JOIN (VALUES ('club_chat'), ('club_announcements')) AS t(type)
WHERE c.directory_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.conversations x WHERE x.club_id = c.id AND x.type = t.type
  );
