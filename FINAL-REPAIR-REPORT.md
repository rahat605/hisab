# Repair report (2026-10-29)

## Changes made
- Added `vite.config.js` with React plugin and ignored generated/dependency folders in the file watcher to reduce Windows watcher lock errors.
- Expanded `.env.example` with clear instructions and public-key-only warnings.
- Tightened Supabase client configuration checks so blank or template values do not create a client.
- Added `WINDOWS-LOCAL-SETUP.md` with exact Windows setup, restart, and EBUSY troubleshooting steps.

## Checks
- ZIP source was inspected: login calls `username-login`, password reset calls `username-password-reset`.
- Confirmed the browser client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `npm ci` could not finish in this environment because dependency installation timed out. Therefore a production build and live login were not verified here.
- The Supabase Edge Functions require deployment and server-side secrets in the user's Supabase project.
- The app's existing expense, bazar, rent, and payment data layer is not fully migrated to shared Supabase tables. This ZIP does not claim to finish that migration.

## User must do
1. Copy `.env.example` to `.env` and enter the Supabase Project URL and publishable/anon key.
2. Deploy/configure the two Edge Functions following `SUPABASE-SETUP.md`.
3. Apply the SQL schema/migrations in the documented order.
4. Test with real household accounts and confirm RLS before public deployment.
5. Change any password shown in screenshots.
