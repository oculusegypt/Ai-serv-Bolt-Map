# Project Overview

This project is an Expo Router mobile/web app with a separate Next.js admin web app in `admin-web/`.

# Current Replit Migration Notes

- The Replit workflow runs the Expo web preview on port 5000 and the admin web app on port 3000.
- Replit PostgreSQL is provisioned through `DATABASE_URL`.
- `npm run db:push` applies the Replit-compatible PostgreSQL schema from `server/schema.sql` and seed data from `supabase_seed.sql`.
- The admin web app no longer uses a browser Supabase client for dashboard data. Admin dashboard reads and writes go through the server route at `admin-web/src/app/api/data/route.ts`, which queries PostgreSQL server-side.
- Server-only push notification handling has been ported to a Next.js API route at `admin-web/src/app/api/send-order-push/route.ts` and uses server-side PostgreSQL/Drizzle access.
- Supabase-dependent Expo client flows fail safely when Supabase environment variables are missing instead of crashing the Replit preview.
- The Expo app includes a local development authentication fallback when Supabase env vars are not configured, so login/register work in the Replit preview.
- The admin web app includes a local development admin session fallback when Supabase env vars are not configured.
- Do not put service secrets in `app.json` or any client-exposed `EXPO_PUBLIC_*` variable.

# Required Environment Variables

- `DATABASE_URL` is provisioned by Replit PostgreSQL.
- `FUNCTION_SECRET` and `EXPO_ACCESS_TOKEN` are server-only variables for the push notification API route when those production integrations are enabled.
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` remain optional only for legacy Expo client flows that have not been fully replaced by Replit PostgreSQL APIs.
