## Payment options feature

Added an admin-only **Payment Options** screen under Admin Management. Admin can configure and enable/disable bKash, Nagad, BRAC Bank, and Islami Bank payment details. Members see enabled methods with account numbers in their My Account page and can copy the number.

### One-time Supabase setup
Run `PAYMENT-OPTIONS-SETUP.sql` in Supabase SQL Editor. RLS lets active members read these settings while only admins can create or update them.

See `PAYMENT-OPTIONS-SETUP.md` for steps.
