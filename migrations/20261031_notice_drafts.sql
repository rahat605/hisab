-- Monthly Hisab notice drafts and publishing.
-- Run once in Supabase SQL Editor.

ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

ALTER TABLE public.notices
  DROP CONSTRAINT IF EXISTS notices_status_check;
ALTER TABLE public.notices
  ADD CONSTRAINT notices_status_check
  CHECK (status IN ('draft', 'published'));

GRANT UPDATE ON public.notices TO authenticated;

-- Members can only see published notices. Active admins can also see drafts.
DROP POLICY IF EXISTS "Active users can read notices" ON public.notices;
CREATE POLICY "Active users can read notices"
ON public.notices FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.active = true
    AND (public.notices.status = 'published' OR p.role = 'admin')
));

-- Admins may publish their own saved drafts. Keep the creator unchanged.
DROP POLICY IF EXISTS "Admins can update notices" ON public.notices;
CREATE POLICY "Admins can update notices"
ON public.notices FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = auth.uid() AND p.active = true AND p.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = auth.uid() AND p.active = true AND p.role = 'admin'
));

-- Refresh PostgREST schema cache so the new status column is visible.
NOTIFY pgrst, 'reload schema';
