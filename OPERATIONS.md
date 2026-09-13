# Operational Readiness & Runbook - AdraConnects

This document provides operational guidance for the AdraConnects platform, including deployment, monitoring, and disaster recovery.

## 🚀 Deployment Guide

### Environment Setup
The application requires the following environment variables:
- `VITE_SUPABASE_URL`: Your Supabase project URL.
- `VITE_SUPABASE_KEY`: Your Supabase anon key.

### Deployment Pipeline
1. **CI Pipeline**: Every push to `main` or `master` triggers a GitHub Action that:
   - Installs dependencies (`npm ci`).
   - Audits dependencies for high-severity vulnerabilities (`npm audit`).
   - Lints the code (`npm run lint`).
   - Runs the test suite (`npm test`).
   - Builds the project (`npm run build`).
2. **Vercel Deployment**: Once the CI passes, Vercel automatically deploys the build to the production environment.

### Database Migrations
Database schema is managed via Supabase migrations located in `supabase/migrations/`.
- To apply migrations locally: use the Supabase CLI.
- Production migrations are applied via the Supabase dashboard or CLI.

## 🛠 Monitoring & Logging

### Current State
- **Client-side Logs**: Basic `console.error` logging.
- **Database Logs**: Supabase project logs provide insights into PostgreSQL performance and RLS failures.

### Recommended Observability Stack (Roadmap)
- **Error Tracking**: Integrate **Sentry** to capture runtime exceptions.
- **Uptime Monitoring**: Use **Better Stack** or **UptimeRobot** to monitor the Vercel deployment.
- **User Analytics**: Integrate **PostHog** or **Google Analytics** to track feature adoption.

## 🛡 Security & Compliance

### Access Control
- **RBAC**: Managed via the `user_roles` table and Supabase RLS.
- **Superadmin**: Only users with `itdept` or `principal` roles can manage other users' roles.
- **Privileged Access**: Access to the Supabase project dashboard should be restricted to project owners.

### Audit Logging
- Role changes are automatically logged in the `public.role_audit_log` table.

## 🆘 Disaster Recovery & Rollback

### Database Backup
- Supabase provides automated daily backups.
- In case of data loss, use the Supabase dashboard to restore a backup to a point-in-time.

### Application Rollback
- Use the Vercel dashboard to roll back the deployment to a previous stable commit if a production bug is detected.

### Emergency Contacts
- **Lead Developer**: [Insert Name/Email]
- **IT Department**: [Insert Email]
