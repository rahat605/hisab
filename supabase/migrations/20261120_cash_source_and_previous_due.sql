-- Allow Cash in Hand settlements that pay a carried previous-month balance.
-- from_user_id identifies the cash contributor and to_user_id the receiver.
-- Cash in Hand bazar rows use their existing paid_by field for the contributor.

ALTER TABLE public.member_settlements
  DROP CONSTRAINT IF EXISTS member_settlements_source_type_check;

ALTER TABLE public.member_settlements
  ADD CONSTRAINT member_settlements_source_type_check
  CHECK (source_type IN ('direct', 'cash_contribution', 'previous_due'));
