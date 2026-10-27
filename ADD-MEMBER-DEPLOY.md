# Monthly Hisab: Enable Add Member from the app

After this one-time setup, an active admin can create a household account directly from **Members → Add member**. No manual Auth user or `profiles` row creation is needed for each new member.

## 1. Run the SQL once

Open Supabase Dashboard → SQL Editor, paste the contents of `SUPABASE-ADD-MEMBER-SETUP.sql`, and run it. This restores active household profile reads and allows admin profile updates. Row Level Security stays enabled.

## 2. Deploy the Edge Function once

From the project root, with Supabase CLI installed and the project linked:

```powershell
supabase login
supabase link --project-ref pxmojiswztqxlaijswiz
supabase functions deploy admin-create-member
```

The function uses Supabase's server-side `SUPABASE_SERVICE_ROLE_KEY` secret. Do not put this key in `.env`, React code, or any browser-visible file. Supabase provides its built-in function secrets to deployed Edge Functions. If the project requires explicit secrets, set them through Supabase Edge Function secrets, never through Vite `VITE_` variables.

## 3. Add members in the app

Sign in as Rahat (active admin) → Admin Management → Members. Enter Full name, User ID, Email address, Password (minimum 6 characters), and monthly rent, then click **Add member**. The function verifies the signed-in user's active admin profile, creates the Supabase Auth account with confirmed email, and inserts the matching `profiles` row. If profile creation fails, it attempts to remove the just-created Auth user.

## Notes

- User IDs must be 3–32 characters using letters, numbers, `.`, `_`, or `-`.
- Email addresses must be unique in Supabase Auth and User IDs unique in `profiles`.
- Passwords are sent only to the server-side Edge Function over the authenticated request and are not saved in the `profiles` table.
- The function does not let a member create accounts; it checks the caller's token and role server-side.
