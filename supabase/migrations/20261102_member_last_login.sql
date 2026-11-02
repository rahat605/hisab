ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

UPDATE public.profiles AS profiles
SET last_login_at = auth_users.last_sign_in_at
FROM auth.users AS auth_users
WHERE auth_users.id = profiles.id
  AND profiles.last_login_at IS NULL
  AND auth_users.last_sign_in_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
