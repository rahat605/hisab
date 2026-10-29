create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.monthly_bill_email_runs (
  id bigint generated always as identity primary key,
  bill_month date not null,
  member_id uuid not null,
  recipient_email text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (bill_month, member_id)
);
alter table public.monthly_bill_email_runs enable row level security;
-- No client-side policies: only service-role function should access this table.

-- Schedule: every month on the 5th at 22:00 Asia/Dhaka (16:00 UTC).
-- Set Vault secrets first:
-- monthly_bill_edge_url = https://PROJECT_REF.supabase.co/functions/v1/monthly-bill-email
-- monthly_bill_cron_token = same random value as Edge Function CRON_SECRET
select cron.schedule(
  'monthly-hisab-prev-month-bill-email', '0 16 5 * *',
  $$select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='monthly_bill_edge_url'),
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name='monthly_bill_cron_token')),
    body := jsonb_build_object('trigger','monthly_cron')
  );$$
);
