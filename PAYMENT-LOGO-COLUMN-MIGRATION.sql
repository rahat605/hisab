-- Run this once in Supabase SQL Editor before using custom payment logos.
alter table public.payment_options
  add column if not exists logo_url text not null default '';
