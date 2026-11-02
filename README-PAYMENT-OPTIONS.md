## Payment options feature

Added an admin-only **Payments & Contacts** screen under Admin Management. The payment preview card offers **Add Payment Option** and **Edit Payment Option** controls, and supports custom payment method names. Members see enabled methods with account numbers in their My Account page and can copy the number.

### One-time Supabase setup
Run `PAYMENT-OPTIONS-SETUP.sql` in Supabase SQL Editor. Re-run it on existing setups to allow custom payment method names. RLS lets active members read these settings while only admins can create or update them.

See `PAYMENT-OPTIONS-SETUP.md` for steps.
