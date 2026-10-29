Monthly Hisab — Profile settings/login fix

Changes in this package:
- Login edge-function failures now prefer the server's safe JSON error, including the generic "Invalid username or password." message, instead of displaying the raw Edge Function non-2xx error.
- Email change message now explains confirmation is required to finish the change.
- Added migration migrations/20261029_profile_settings_security.sql for photo_url, profile self-update RLS, public photo read, and owner-only upload/update/delete policies.

IMPORTANT DEPLOY STEPS:
1. Open Supabase Dashboard -> SQL Editor and run migrations/20261029_profile_settings_security.sql.
2. Deploy the updated supabase/functions/username-login/index.ts as the username-login Edge Function.
3. Deploy the frontend to Vercel from this source.
4. Test a valid login, invalid password, password update while signed in, and photo upload with each member account.

This archive has not been live-tested against the user's Supabase project. Build verification was attempted but could not run because npm dependencies were unavailable in this environment (vite not found). Do not treat deployment as complete until steps above are done.
