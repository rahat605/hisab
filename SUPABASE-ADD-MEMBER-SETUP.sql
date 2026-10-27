-- Monthly Hisab: permissions needed for Add Member and household profile dropdowns.
-- Run once in Supabase SQL Editor. RLS remains enabled; the Edge Function uses service_role
-- only on the server after verifying that the caller is an active admin.

GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active users can read profiles" ON public.profiles;
CREATE POLICY "active users can read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_active_member());

DROP POLICY IF EXISTS "admin can update profiles" ON public.profiles;
CREATE POLICY "admin can update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.current_app_role() = 'admin' AND public.is_active_member())
WITH CHECK (public.current_app_role() = 'admin' AND public.is_active_member());
