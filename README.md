# AdraConnects

**A**gile **D**evelopment, **R**obust **A**utomations — a WhatsApp-style **college club management & communication** web app, fully cloud-based. Direct messages, club group chats, admin-only announcements, event scheduling with RSVPs, and file/resource sharing, all updating in realtime.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite (plain JavaScript), react-router, date-fns |
| Backend | **Supabase cloud** — Postgres, Auth, Realtime, Storage (no custom server, no local data) |
| Realtime | `postgres_changes` for messages/read-receipts, Presence for online status, Broadcast for typing |

## Features

- **Auth & user tiers** — two ways in, two levels of access:
  - **Email signup = Adra member**: full access — request to join communities, chat across the organization, DMs
  - **Google sign-in = Guest**: can browse all communities (view only) and chat **only** with the Admissions Office — e.g. to ask questions or fix an appointment. Faculty can promote guests to members in the admin panel
- **Admissions Office** — a built-in community pinned for every user (including guests); announcements channel included
- **Join requests** — joining any community requires approval: users request, club admins or faculty approve/reject (in the club's Requests tab or the admin panel)
- **Teams-style status** — Active / Idle / Do not disturb / In a meeting / Out of office; set from the sidebar, shown live as colored presence dots everywhere
- **Extended profiles** — name, department, student-or-faculty; for students: year, branch, phone, admission code, DOB — all editable by faculty in the admin panel
- **Clubs** — create a club (you become admin), browse & join clubs, member list with roles, remove members (admin), leave club
- **Group chat** — realtime messaging per club with sender names and date separators
- **Direct messages** — 1:1 chats with online status, typing indicator, and WhatsApp-style ✓✓ read receipts that turn blue live
- **Announcements** — every club gets a 📢 channel; only admins can post (enforced by Row Level Security in the database, not just the UI)
- **Events** — admins schedule events (title, date/time, location, details); members RSVP Going/Maybe/Can't with live counts; upcoming & past sections. **RSVPs are permanent**: one response per member, locked at the database level (no updates or deletes) — a real commitment, not a poll
- **Attendance** — every event shows who will be present (RSVP names); faculty (or the club admin) mark actual attendance per member, and everyone sees the "X of Y present" summary
- **Faculty & admin panel** — teachers/HODs are stored in an `employees` table. New teachers register through the **Faculty Gateway** (`/faculty`) with a staff access code — or an HOD adds/removes them in the Faculty tab. The `/admin` panel (faculty only) has: overview stats; a **Users** tab covering every account with Guest/Member/Faculty filters, search by name/email/**UUID**, per-user editing (all profile + student fields, tier changes, memberships, faculty promotion) and an **Add user** button; a **Requests** tab approving join requests across all communities; community management (member roles, removal, HOD delete); events with attendance marking. Private chats and DMs stay invisible to the admin panel by design.
- **Resources** — attach 📎 images/files in any chat (stored in Supabase Storage); images render inline; every club has a Resources tab listing all shared files
- **Unread badges** — per-chat unread counts computed server-side in one RPC call


