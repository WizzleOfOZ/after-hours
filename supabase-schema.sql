-- Run once in your own Supabase project: SQL Editor > New Query > Run.
-- Keep the secret API key ONLY as a private host environment variable.
create table if not exists public.after_hours_rooms (
  code text primary key check (code ~ '^[A-F0-9]{6}$'),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
-- Block public anonymous clients. The server uses an admin secret key, which bypasses RLS.
alter table public.after_hours_rooms enable row level security;
revoke all on table public.after_hours_rooms from anon, authenticated;
grant select, insert, update on table public.after_hours_rooms to service_role;
create index if not exists after_hours_rooms_updated_at_idx on public.after_hours_rooms(updated_at desc);
