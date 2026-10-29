# Contact permission fix and UI refresh

## Supabase
Apply the updated `supabase/migrations/20261029_member_contacts.sql` in Supabase SQL Editor. It grants authenticated table privileges and enables member SELECT plus admin-only write policy based on `profiles.id = auth.uid()` and `lower(profiles.role)='admin'`.

If your app stores the admin role in a different profile column or uses a custom auth identity rather than Supabase `auth.uid()`, adjust the policy to match the real auth model before using it.

## UI
- Contact categories are now a two-column card grid on desktop and one column on mobile.
- Each contact is shown as a compact person row with a call action.
- Profile modal, form inputs, password wrappers, and text now use dark-theme surfaces and contrast.

After applying SQL, run `npm run build` and test admin create/edit/delete and member read.
