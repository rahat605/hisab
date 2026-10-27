# Monthly Hisab notification fix

Changes in this update:
- The unread badge is calculated for the signed-in user, including admins.
- Opening the notification bell no longer silently marks all notices as read.
- “Read all notifications” records unread notice receipts in Supabase and clears the badge immediately.
- Login opens a centered notice modal for both admin and member accounts when that account has unread notices.
- Closing the modal does not mark notices as read; the unread badge remains until “Mark all as read” is used.
- Notice poster images use more of the modal width and height.

## One-time Supabase SQL setup
Run these two files in the Supabase SQL Editor, in order:
1. `SUPABASE-NOTICES-SETUP.sql`
2. `SUPABASE-NOTICE-READS-SETUP.sql`

The second script includes the UPDATE grant and RLS policy required for `upsert` to persist the read status. Do not put a Supabase service-role key in frontend `.env`.

## Verify
In the project folder run `npm run build`, then `npm run dev`. Sign in as a user who has not read a notice; the modal should open. Click “Mark all as read”; the badge should disappear. Sign out and sign in again; the same notice should not reopen unless a new notice has been posted.
