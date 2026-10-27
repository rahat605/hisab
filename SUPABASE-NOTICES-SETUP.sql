-- Monthly Hisab shared notices. Run once in Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Notice',
  body text NOT NULL DEFAULT '',
  image_url text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.notices TO authenticated;

DROP POLICY IF EXISTS "Active users can read notices" ON public.notices;
CREATE POLICY "Active users can read notices"
ON public.notices FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = auth.uid() AND p.active = true
));

DROP POLICY IF EXISTS "Admins can post notices" ON public.notices;
CREATE POLICY "Admins can post notices"
ON public.notices FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.active = true AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete notices" ON public.notices;
CREATE POLICY "Admins can delete notices"
ON public.notices FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = auth.uid() AND p.active = true AND p.role = 'admin'
));

-- Public image bucket: members can view notice images; only active admins can upload.
INSERT INTO storage.buckets (id, name, public)
VALUES ('notices', 'notices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Anyone can view notice images" ON storage.objects;
CREATE POLICY "Anyone can view notice images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'notices');

DROP POLICY IF EXISTS "Admins can upload notice images" ON storage.objects;
CREATE POLICY "Admins can upload notice images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'notices' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.active = true AND p.role = 'admin'
  )
);


-- Per-member read receipts for notification badges.
CREATE TABLE IF NOT EXISTS public.notice_reads (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notice_id)
);
ALTER TABLE public.notice_reads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.notice_reads TO authenticated;
DROP POLICY IF EXISTS "Members read own notice receipts" ON public.notice_reads;
CREATE POLICY "Members read own notice receipts"
ON public.notice_reads FOR SELECT TO authenticated
USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Members mark own notices read" ON public.notice_reads;
CREATE POLICY "Members mark own notices read"
ON public.notice_reads FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
