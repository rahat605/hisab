-- Partial settlement payments with receiver confirmation.

ALTER TABLE public.member_settlements
  ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

UPDATE public.member_settlements
SET paid_amount = amount
WHERE status = 'completed' AND paid_amount = 0;

ALTER TABLE public.member_settlements
  DROP CONSTRAINT IF EXISTS member_settlements_status_check;

ALTER TABLE public.member_settlements
  DROP CONSTRAINT IF EXISTS member_settlements_paid_amount_check;

ALTER TABLE public.member_settlements
  ADD CONSTRAINT member_settlements_status_check
    CHECK (status IN ('pending', 'partially_paid', 'completed')),
  ADD CONSTRAINT member_settlements_paid_amount_check
    CHECK (paid_amount >= 0 AND paid_amount <= amount);

CREATE TABLE IF NOT EXISTS public.member_settlement_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL
    REFERENCES public.member_settlements(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  confirmed_by uuid NOT NULL REFERENCES public.profiles(id),
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_settlement_payments_settlement_idx
  ON public.member_settlement_payments(settlement_id, confirmed_at DESC);

ALTER TABLE public.member_settlement_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active users read settlement payments"
  ON public.member_settlement_payments;
CREATE POLICY "active users read settlement payments"
  ON public.member_settlement_payments
  FOR SELECT
  TO authenticated
  USING (public.is_active_member());

CREATE OR REPLACE FUNCTION public.confirm_settlement_payment(
  p_settlement_id uuid,
  p_amount numeric
)
RETURNS public.member_settlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_settlement public.member_settlements%ROWTYPE;
  v_remaining numeric(12,2);
BEGIN
  IF v_actor IS NULL OR NOT public.is_active_member() THEN
    RAISE EXCEPTION 'Only an active member can confirm a settlement payment.';
  END IF;

  SELECT *
  INTO v_settlement
  FROM public.member_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement not found.';
  END IF;

  IF v_settlement.to_user_id <> v_actor
     AND public.current_app_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only the receiver can confirm this payment.';
  END IF;

  v_remaining := v_settlement.amount - v_settlement.paid_amount;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Payment amount exceeds the remaining settlement balance.';
  END IF;

  INSERT INTO public.member_settlement_payments (
    settlement_id,
    amount,
    confirmed_by
  ) VALUES (
    v_settlement.id,
    p_amount,
    v_actor
  );

  UPDATE public.member_settlements
  SET
    paid_amount = paid_amount + p_amount,
    status = CASE
      WHEN paid_amount + p_amount >= amount THEN 'completed'
      ELSE 'partially_paid'
    END,
    confirmed_by = v_actor,
    confirmed_at = now(),
    updated_at = now()
  WHERE id = v_settlement.id
  RETURNING * INTO v_settlement;

  RETURN v_settlement;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_settlement_payment(uuid, numeric)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_settlement_payment(uuid, numeric)
  TO authenticated;

GRANT SELECT ON public.member_settlement_payments TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.member_settlement_payments FROM authenticated;
