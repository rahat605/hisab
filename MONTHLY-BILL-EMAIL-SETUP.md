# Monthly Hisab previous-month monthly bill email

## Schedule and period
- Run on day 5 each month at 22:00 Asia/Dhaka (16:00 UTC).
- Generate bill for the previous complete calendar month. Example: November 1 sends October 1–31.
- One PDF per member, delivered only to that member's own current email.

## Setup checklist
1. Deploy the Edge Function in `supabase/functions/monthly-bill-email`.
2. Configure secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `BILL_FROM_EMAIL`, `CRON_SECRET`.
3. Configure Supabase Vault secrets `monthly_bill_edge_url` and `monthly_bill_cron_token` (same token as CRON_SECRET).
4. Run migration `supabase/migrations/20261029_monthly_bill_email_cron.sql`.
5. Map real Monthly Hisab schema and formulas for rent, meal, expenses, payments, prior balance, and final balance in the function. No totals should be guessed.
6. Test with one member/test email; verify PDF content, recipient, duplicate prevention, sent/failure logging.
7. Enable schedule only after tests pass.

## Current package status
The schedule and run-log migration are provided. Project-specific accounting query, PDF generation, and email sending still need to be wired and tested against the app's real schema. This package does not claim automatic emails are already live.

## Schedule update
The cron expression is `0 16 5 * *` (UTC), which corresponds to 22:00 Bangladesh time on the 5th.
