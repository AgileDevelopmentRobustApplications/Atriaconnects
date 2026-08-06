# AdraConnects

**A**gile **D**evelopment, **R**obust **A**utomations — a WhatsApp-style **college club management & communication** web app, fully cloud-based. Direct messages, club group chats, admin-only announcements, event scheduling with RSVPs, and file/resource sharing, all updating in realtime.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite (plain JavaScript), react-router, date-fns |
| Backend | **Supabase cloud** — Postgres, Auth, Realtime, Storage (no custom server, no local data) |
| Realtime | `postgres_changes` for messages/read-receipts, Presence for online status, Broadcast for typing |

## Features

- **Invite-only accounts** — every user is created by a superadmin (IT Dept / Principal) via the admin panel. Users log in with their college email + the temporary password (`Welcome@123`) and are redirected to `/welcome` to set a new password.
- **Multi-tag user roles** — a user can carry any combination of: `management`, `intern`, `floor_incharge`, `faculty`, `itdept`, `principal`. Faculty, IT Dept, and Principal are staff-grade. Only **superadmins** (IT Dept + Principal) can create new admin accounts or assign elevated roles.
- **Continue as guest** — from the login page, anyone can start a session with a display name; the account can browse communities and message the Admissions Office.
- **Admissions Office** — a built-in private contact (one thread per user) pinned for every user (including guests); any staff member can reply.
- **Join requests** — joining any community requires approval: users request, club admins or faculty approve/reject (in the club's Requests tab or the admin panel)
- **Teams-style status** — Active / Idle / Do not disturb / In a meeting / Out of office; set from the sidebar, shown live as colored presence dots everywhere
- **Extended profiles** — name, department, branch, semester, year, phone, admission code, DOB — all editable by superadmins in the admin panel
- **Clubs** — create a club (you become admin), browse & join clubs, member list with roles, remove members (admin), leave club
- **Group chat** — realtime messaging per club with sender names and date separators
- **Direct messages** — 1:1 chats with online status, typing indicator, and WhatsApp-style ✓✓ read receipts that turn blue live
- **Announcements** — every club gets a 📢 channel; only admins can post (enforced by Row Level Security in the database, not just the UI)
- **Events** — admins schedule events (title, date/time, location, details); members RSVP Going/Maybe/Can't with live counts; upcoming & past sections. **RSVPs are permanent**: one response per member, locked at the database level.
- **Attendance** — every event shows who will be present (RSVP names); staff mark actual attendance per member, and everyone sees the "X of Y present" summary
- **Admin panel** — staff-only (`/admin`) with overview stats; **Students** tab covering every account with Guest/Student/Staff filters, search by name/email/UUID, per-user editing (profile fields, semester, role management, force password reset) and an **Invite user** button; **Requests** tab; **Communities** management; **Events** with attendance; **Roles** tab for managing user_roles tags. Private chats and DMs stay invisible to the admin panel by design.
- **Resources** — attach 📎 images/files in any chat (stored in Supabase Storage); images render inline; every club has a Resources tab listing all shared files. **10 MB hard limit enforced by storage RLS** (migration 006) plus a client-side guard.
- **PWA install prompt** — custom in-app card on the empty state captures `beforeinstallprompt` so users can install AdraConnects as a home-screen app.
- **Name accent** — user names render in `--c-name-accent` (#d4391f) across all lists (admin Students tab, member pickers, chat headers, sidebar).
- **Unread badges** — per-chat unread counts computed server-side in one RPC call

## Pending features (not yet implemented)

The following are tracked in the project plan (`C:\Users\aryan\.claude\plans\giggly-tumbling-cocke.md`) but not in this iteration:

- **Admin panel as a separate subdomain** — `/admin` will move to a second Vite project at `apps/admin/` and deploy to `admin.<your-domain>` on Vercel. The admin code currently lives alongside the chat app.
- **Academic groups + community subgroups** — separate `academic_groups` table; subgroups via `parent_id`.
- **Canteen (Phase 1)** — shops, menu, inventory, token generation, shopkeeper dashboard. Payment gateway is out of scope for Phase 1.
- **Social-media ad preview** — Open Graph tags + ad management UI.