# Monthly Hisab payment options setup

1. Open Supabase Dashboard → SQL Editor.
2. Open `PAYMENT-OPTIONS-SETUP.sql` from this project ZIP and run the SQL in the editor. It is safe to rerun on an existing setup.
3. Start the app and log in as admin.
4. Open **Admin Management → Payments & Contacts**.
5. Use **Add Payment Option** to add a method, or **Edit Payment Option** to update an existing one. Enable methods to show them to members. Re-run the setup SQL to allow custom payment method names on an existing database.
6. Members will see the enabled methods with configured account numbers in **My Account → Pay your rent**.

Only payment method names, account numbers, account names, and transfer instructions belong here. Never store a PIN, password, OTP, or other secret.
