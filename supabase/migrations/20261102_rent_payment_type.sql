-- Keep payment classification independent from the free-form note.
ALTER TABLE public.rent_payments
ADD COLUMN IF NOT EXISTS payment_type text;

-- Preserve the existing note-based classification for historical payments.
UPDATE public.rent_payments
SET payment_type = CASE
  WHEN lower(coalesce(note, '')) LIKE '%rent%' THEN 'rent'
  ELSE 'meal'
END
WHERE payment_type IS NULL;

ALTER TABLE public.rent_payments
ALTER COLUMN payment_type SET DEFAULT 'rent',
ALTER COLUMN payment_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rent_payments_payment_type_check'
      AND conrelid = 'public.rent_payments'::regclass
  ) THEN
    ALTER TABLE public.rent_payments
    ADD CONSTRAINT rent_payments_payment_type_check
    CHECK (payment_type IN ('rent', 'meal'));
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
