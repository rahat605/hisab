# Monthly Hisab: Supabase setup

## Project configuration
Create `.env` in the project root (same level as `package.json`) using `.env.example`:
- `VITE_SUPABASE_URL` = the project URL from Supabase
- `VITE_SUPABASE_ANON_KEY` = the publishable key (`sb_publishable_...`) or legacy anon public key

These are browser-visible client settings. Never use a `service_role` or secret key in this React app.

## Database
1. Open Supabase > SQL Editor > New query.
2. Paste `supabase-schema.sql` and run it.
3. In Authentication > Users, create accounts for the four household users.
4. For each Auth user, add a matching row in `public.profiles` with the same UUID:
   - Rahat: role `admin`
   - Mahir, Shad, Uttom: role `member`
   - set username and rent as needed.
5. Use strong individual passwords. Do not reuse the old demo passwords.

Example profile insert (replace UUIDs and review values first):
```sql
insert into public.profiles (id, full_name, username, role, active, rent)
values
  ('AUTH-USER-UUID-FOR-RAHAT', 'Rahat', 'rahat', 'admin', true, 17500),
  ('AUTH-USER-UUID-FOR-MAHIR', 'Mahir', 'mahir', 'member', true, 7445),
  ('AUTH-USER-UUID-FOR-SHAD', 'Shad', 'shad', 'member', true, 6570),
  ('AUTH-USER-UUID-FOR-UTTOM', 'Uttom', 'uttom', 'member', true, 6570);
```
The UUID values above are placeholders, not valid UUIDs. Replace all four with IDs shown under Authentication > Users before running.

## Important status
This package includes the Supabase client configuration and a secured normalized schema. The existing React screens still use their original local state and have **not yet been fully migrated to Supabase queries/auth**. Do not deploy this as a completed Supabase-connected app yet. The next integration step is to replace the old `signIn` and localStorage data layer with Supabase Auth and table queries, then migrate any existing local data deliberately.


## Username + password login (secure approach)
Supabase Auth authenticates email/password by default. To keep the app's login screen username/password, this package includes a server-side Edge Function at `supabase/functions/username-login/index.ts`. It looks up the username in `profiles`, then verifies the password through Supabase Auth. It never stores plaintext passwords.

To use it:
1. Create each Auth user with a unique real email (or a household-controlled email address) and set a strong password. Keep email confirmation settings appropriate for your use case.
2. Insert a profile row using that Auth user's UUID and a unique username.
3. Deploy the function with the Supabase CLI:
   `supabase functions deploy username-login`
4. Set function secrets through the Supabase CLI or dashboard:
   - `SUPABASE_URL` (project URL)
   - `SUPABASE_ANON_KEY` (publishable/anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` (secret; ONLY as an Edge Function secret, never in frontend code)
5. The current React login screen still needs to be wired to invoke this function and establish the returned Supabase session. That UI integration is not completed in this scaffold yet.

If you do not want to manage four real email addresses, an alternative is to use unique alias emails accepted by Supabase Auth and disable email confirmation for this private household app. However, password reset emails will not work for aliases. Do not disable protections for a public app.


## Deploy the login and password-reset functions
Both functions must be deployed before username login and the forgot-password button can work:
- `supabase/functions/username-login/index.ts`
- `supabase/functions/username-password-reset/index.ts`

Set secrets for the functions in Supabase:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never put in `.env` or frontend)
- Optional `PASSWORD_RESET_REDIRECT_URL` (the app URL/page that handles Supabase password recovery)

Then deploy:
```bash
supabase functions deploy username-login
supabase functions deploy username-password-reset
```

The login screen now calls these functions and has a Forgot password link. Password reset sends a recovery email to the email attached to that user's Supabase Auth account. This means the user still needs access to that email inbox to complete a reset.

## Remaining integration limitation
The existing dashboard's expense/bazar/payment CRUD is still backed by the old local state/localStorage. The login UI and server-side auth function are scaffolded, but the whole financial data layer has not been fully migrated to Supabase yet. Test login only after functions are deployed and profiles are created. Do not treat this package as production-ready until the data layer and RLS have been end-to-end tested.


## Local environment file
A `.env` file is included with the Supabase project URL and publishable key you supplied. These are public client settings. Never add a database password or service-role/secret key to this file. Restart the Vite dev server after environment changes.

## What is and is not complete in this build
- Added Supabase JS client configuration.
- Login screen now uses the username-login Edge Function and establishes a Supabase Auth session.
- Added a Forgot password flow that requests a recovery email through the username-password-reset Edge Function.
- Added deployment/configuration instructions for both functions.
- The existing dashboard's bazar, rent, payment, categories, and cash-contribution mutations are **not yet fully wired to Supabase tables**. They still use local state/localStorage. This build is an intermediate integration package and should not be treated as the finished shared database app.
