# Monthly Hisab updates

## Included changes
- Member bazar form shows the logged-in user's name as read-only; the insert also forces `paid_by` to the logged-in user.
- Admin bazar form can choose any active user.
- Removed the Bangla language selector.
- Removed the overview greeting and explanatory sentence.
- Styled the Reset monthly hisab button.
- Added `admin-create-member` Edge Function so an admin can create an Auth user and matching profile from the app. The member is active immediately and receives the app's member permissions from the existing role-based RLS policies.

## One-time Supabase setup for Add Member
For security, the app must not create Auth users directly with the public key. Deploy the included Edge Function once using the Supabase CLI from the project root:

```bash
supabase functions deploy admin-create-member
```

The project must already have the standard `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` function secrets configured. Never put the service-role key in `.env` or frontend code.

Then run `SUPABASE-MIGRATION-NOTES.md` in Supabase SQL Editor once. It grants the authenticated table privileges and ensures active users can read the household roster, while RLS remains enabled. It also enforces that non-admin members can only create bazar entries with their own user ID as `paid_by`.

New members need a valid email address and a temporary password (at least 8 characters). They are created through the app; you do not need to manually add them in Supabase Dashboard each time.

## Build
```bash
npm install
npm run build
npm run dev
```

Build could not be verified in the packaging environment because its Linux `@rolldown/binding-linux-x64-gnu` native dependency is missing. Run the build on your Windows development machine, where the project previously built successfully.
