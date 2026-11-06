-- Meal balance settlement ledger.
-- Cash-contribution settlements refund an overpaying member from Cash in Hand.
-- Direct settlements transfer the outstanding meal balance between two members.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.member_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id uuid NOT NULL REFERENCES public.months(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.profiles(id),
  to_user_id uuid NOT NULL REFERENCES public.profiles(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  source_type text NOT NULL DEFAULT 'direct'
    CHECK (source_type IN ('direct', 'cash_contribution')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed')),
  settlement_date date NOT NULL DEFAULT current_date,
  note text NOT NULL DEFAULT 'Meal balance settlement',
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_settlements_different_members
    CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS member_settlements_month_idx
  ON public.member_settlements(month_id, settlement_date DESC);
CREATE INDEX IF NOT EXISTS member_settlements_from_user_idx
  ON public.member_settlements(from_user_id);
CREATE INDEX IF NOT EXISTS member_settlements_to_user_idx
  ON public.member_settlements(to_user_id);

ALTER TABLE public.member_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active users read settlements"
  ON public.member_settlements;
CREATE POLICY "active users read settlements"
  ON public.member_settlements
  FOR SELECT
  TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS "admins manage settlements"
  ON public.member_settlements;
CREATE POLICY "admins manage settlements"
  ON public.member_settlements
  FOR ALL
  TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.member_settlements
  TO authenticated;
REVOKE ALL ON public.member_settlements FROM anon;
