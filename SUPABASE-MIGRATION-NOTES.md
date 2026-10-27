-- Monthly Hisab: permissions for the Supabase-backed app.
-- Run once in Supabase SQL Editor after deploying admin-create-member.

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.months,
  public.expense_categories,
  public.rent_payments,
  public.bazar_entries,
  public.cash_contributions
TO authenticated;

-- All active household users can read the household roster; admins can manage profiles.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "active users can read profiles" ON public.profiles;
CREATE POLICY "active users can read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_active_member());

-- Members must record their own identity as the payer. Admins can select any active user.
DROP POLICY IF EXISTS "insert own bazar" ON public.bazar_entries;
CREATE POLICY "insert own bazar"
ON public.bazar_entries FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_member()
  AND (
    (public.current_app_role() = 'admin')
    OR (created_by = auth.uid() AND paid_by = auth.uid())
  )
);
