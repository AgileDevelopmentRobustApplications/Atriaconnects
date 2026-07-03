# AdraConnects

**A**gile **D**evelopment, **R**obust **A**utomations — a WhatsApp-style **college club management & communication** web app, fully cloud-based. Direct messages, club group chats, admin-only announcements, event scheduling with RSVPs, and file/resource sharing, all updating in realtime.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite (plain JavaScript), react-router, date-fns |
| Backend | **Supabase cloud** — Postgres, Auth, Realtime, Storage (no custom server, no local data) |
| Realtime | `postgres_changes` for messages/read-receipts, Presence for online status, Broadcast for typing |

## Features

- **Auth** — sign up / log in with email + password; profile with colored-initials avatar (auto-created by DB trigger)
- **Clubs** — create a club (you become admin), browse & join clubs, member list with roles, remove members (admin), leave club
- **Group chat** — realtime messaging per club with sender names and date separators
- **Direct messages** — 1:1 chats with online status, typing indicator, and WhatsApp-style ✓✓ read receipts that turn blue live
- **Announcements** — every club gets a 📢 channel; only admins can post (enforced by Row Level Security in the database, not just the UI)
- **Events** — admins schedule events (title, date/time, location, details); members RSVP Going/Maybe/Can't with live counts; upcoming & past sections
- **Attendance** — every event shows who will be present (RSVP names); faculty (or the club admin) mark actual attendance per member, and everyone sees the "X of Y present" summary
- **Faculty & admin panel** — teachers/HODs are stored in an `employees` table (sign up as Faculty with a staff access code, or get promoted by an HOD). Employees get a shield button opening `/admin`: overview stats, all students with club memberships (removable), all clubs with member management, all events with attendance marking, and faculty management (HOD-only: promote/demote/remove). Private chats and DMs stay invisible to the admin panel by design.
- **Resources** — attach 📎 images/files in any chat (stored in Supabase Storage); images render inline; every club has a Resources tab listing all shared files
- **Unread badges** — per-chat unread counts computed server-side in one RPC call

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. To test realtime with two users, open a second window in incognito and sign up a second account.

Test accounts already seeded: `alice@test.com`, `bob@test.com`, `carol@test.com`, and faculty `teacher@test.com` (password `test1234`).

**Staff access codes** (for Faculty signup; defined in `register_employee` in the DB — change them before real use): `FACULTY-2026` registers a teacher, `HOD-2026` registers an HOD. HODs can also promote existing users from the admin panel's Faculty tab.

## Architecture notes

- **Everything is a conversation** — club chats, announcement channels and DMs are rows in `conversations`; messages, read-state, typing channels and storage folders all key off the conversation UUID.
- **Security lives in the database** — every table has RLS. Membership checks use `security definer` helper functions (`is_club_member`, `is_conversation_member`, `can_post_in`) to avoid policy recursion. Verified: non-members read zero rows, cannot post, and cannot upload into conversations they don't belong to.
- **3 realtime channels per client** — `db-changes` (message inserts + read receipts, scoped by RLS), `presence:lobby` (online users), `typing:{conversationId}` (only while a chat is open).
- **Unread counts** — single `get_chat_list()` RPC returns every chat with title, last-message preview and unread count; no N+1 queries.
- The full schema (tables, triggers, RPCs, RLS policies, storage policies) is in [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql).

### Trade-offs to know about

- The `attachments` storage bucket is **public-read**: anyone with the exact URL can fetch a file, but paths contain random UUIDs so they aren't guessable. Flip the bucket to private + signed URLs if clubs will share sensitive files.
- Email confirmation is bypassed by a DB trigger (`auto_confirm_email`) since no SMTP is configured — fine for a college project; remove the trigger and configure SMTP for production.
- Consider enabling [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) in the Supabase dashboard (Auth → Providers → Password).

## Supabase project

- Project: `clubconnect` (`zgwckrpeveoemmwtriee`), region `ap-south-1` (Mumbai), free tier — the Supabase project keeps its original name; only the app brand is AdraConnects
- The frontend connects with the publishable API key in `.env` (safe to expose — RLS is the security boundary)
