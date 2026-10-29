# Monthly Hisab: Fix Supabase Login Configuration

The login page shows this message when the app cannot find its Supabase URL and public key:

`Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart the app.`

## Local setup

1. Open the project folder in VS Code.
2. Copy `.env.example` to a new file named `.env` in the same folder as `package.json`.
3. In Supabase, open **Project Settings → API** (or **API Keys**).
4. Copy the Project URL and the publishable key (or legacy anon public key).
5. Put them in `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

6. Save the file. Stop Vite with `Ctrl+C`, then run:

```bash
npm run dev
```

7. Reload the local app.

## Vercel setup

Add the same two variables in **Vercel → Project → Settings → Environment Variables**. Apply them to the environments you use, then redeploy.

## Important

- Do not commit `.env`. It is ignored by `.gitignore`.
- Use only the Supabase publishable/anon public key in a browser app. Never put a `service_role` or secret key in `VITE_*` variables.
- This fixes the missing configuration message only. Username login and password reset also require the project's Supabase Edge Functions to be deployed and configured.
- The project archive does not contain your private Supabase URL or key. Add your own values before running it.
