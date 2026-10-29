# Member Contacts setup
1. Apply `supabase/migrations/20261029_member_contacts.sql` in the Supabase SQL editor.
2. Deploy the updated frontend.
3. Admin opens Admin Management > Contact Management and adds Flatmate, Caretaker, Maid, or Emergency contacts.
4. Members open Contacts in the sidebar. Contacts are grouped by section and phone numbers have a Call link.

The app reads/writes `public.member_contacts`. Ensure your Supabase admin role value is `admin`; adjust the RLS policy if your project uses a different role representation.
