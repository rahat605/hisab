# Meal Settlement setup

Run [`supabase/migrations/20261105_member_settlements.sql`](supabase/migrations/20261105_member_settlements.sql) once in the Supabase SQL Editor, then refresh the app.

The new **Meal Settlement** page supports:

- automatic matching for every active member;
- refunds funded by an existing cash contribution;
- direct member-to-member transfers;
- pending and completed states;
- partial settlement amounts;
- an auditable monthly settlement history.

Only completed entries change member balances. A completed cash-contribution refund also reduces **Cash in hand**.
