# Monthly Hisab: notification read status

This update stores each member's notice read status in Supabase so the unread badge is per-member and remains cleared across reloads/devices.

## One-time setup

Open `SUPABASE-NOTICES-SETUP.sql` in Supabase SQL Editor and run the whole SQL script. It creates `public.notice_reads` with RLS policies for members to read and mark only their own notices as read. The script also retains the existing notices table and image storage setup.

## Behaviour

- The bell badge counts unread notices for the signed-in member.
- Opening the notification bell marks the currently published notices as read, so the badge disappears.
- The popover includes **Read all notifications** as an explicit action.
- The login notice dialog's close and “Mark all as read” actions also save the read state.
- Admins can post/delete notices; read receipts are tracked for members.

## Build

Run `npm run build` in the Windows project folder. This workspace's Linux `node_modules` is missing its optional Rolldown native binding, so build verification must be done in the user's Windows environment.
