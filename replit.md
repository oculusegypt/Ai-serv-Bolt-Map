# Project Overview

This project is an Expo Router mobile/web app with a separate Next.js admin web app in `admin-web/`.

# Current Replit Migration Notes

- The Replit workflow runs the Expo web preview on port 5000 and the admin web app on port 3000.
- Supabase-dependent clients now fail safely when Supabase environment variables are missing instead of crashing the Replit preview.
- Server-only push notification handling has been ported to a Next.js API route at `admin-web/src/app/api/send-order-push/route.ts`.
- Do not put service secrets in `app.json` or any client-exposed `EXPO_PUBLIC_*` variable.

# Required Environment Variables

- `DATABASE_URL` is provisioned by Replit PostgreSQL.
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are optional client variables for the existing Supabase-backed app flows.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are optional admin client variables for the existing admin flows.
- `FUNCTION_SECRET` and `EXPO_ACCESS_TOKEN` are server-only variables for the push notification API route.