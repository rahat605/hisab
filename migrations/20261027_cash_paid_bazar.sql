-- Run once in Supabase SQL Editor before deploying the updated app.
-- Marks bazar entries paid from the shared Cash in Hand balance.
ALTER TABLE public.bazar_entries
ADD COLUMN IF NOT EXISTS paid_from_cash BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
