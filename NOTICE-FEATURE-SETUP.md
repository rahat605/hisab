# Monthly Hisab: Password visibility and Notices

## Features added
- Login password show/hide eye button.
- Admin Management → Notices page for posting a title, text, and optional image.
- Notices are stored in Supabase `public.notices`; optional images are uploaded to the public Supabase Storage bucket `notices`.
- Members see notices in a modal after login and can reopen them using the notification bell in the top-right header.
- Notification bell shows published announcements plus automatic bazar, payment, and cash-contribution activity.
- Activity updates arrive through Supabase Realtime, with a 30-second refresh fallback.

## Required one-time Supabase setup
1. Open Supabase Dashboard → SQL Editor.
2. Run `SUPABASE-NOTICES-SETUP.sql` from this ZIP.
3. Recommended: run `supabase/migrations/20261108_financial_activity_notifications.sql` for database-triggered Realtime activity. The app also derives activity directly from the financial tables as a fallback.
4. Reload the app. Log in as admin, expand **Admin Management**, then open **Notices**.
5. Add a bazar entry, payment, or cash contribution and verify it appears in the bell for another member.

The SQL enables RLS. Active users can read notices; only active admins can insert/delete notices and upload notice images. The image bucket is public so members can see the posted image without signing a URL.

## Build
Run `npm run build` in the Windows project folder. This workspace could not complete Vite build because its installed Rolldown native optional dependency is missing; TypeScript's JSX parser reported no syntax diagnostics for `src/main.jsx`. This is not a live Supabase integration test.
