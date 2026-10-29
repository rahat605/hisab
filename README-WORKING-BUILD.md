# Monthly Hisab - Updated project package

This package contains the project source and Supabase integration scaffold.

## Important
This app cannot sign in until it is connected to the Supabase project that holds your users and expense data. Supabase URL and public publishable/anon key are private project settings and are not present in the uploaded source ZIP. Do not put a `service_role` or secret key in this Vite app.

## Run locally (Windows)
1. Install Node.js 20 or newer.
2. Open this folder in VS Code.
3. In Supabase, open Project Settings > API. Copy the Project URL and the publishable key (or legacy anon key).
4. Create a file named `.env` beside `package.json` using this content:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
   ```

5. Open a terminal in this folder and run:

   ```bash
   npm ci
   npm run dev
   ```

6. Open the local URL printed by Vite.

## Supabase setup
Read `SUPABASE-SETUP.md` and `README-SUPABASE.txt`. Apply the schema and required migrations in the Supabase SQL Editor, then deploy the Edge Functions in `supabase/functions` using the Supabase CLI. The username login and password reset screens call these functions:

- `username-login`
- `username-password-reset`

The app also expects a valid active profile in `profiles` after login.

## Build
Run:

```bash
npm run build
```

## Data status
The uploaded project is a Supabase integration scaffold. It is not a completed migration of every expense feature to a shared database. Verify the live Supabase schema, Edge Functions, access policies, storage rules, and household data before relying on it for real records.
