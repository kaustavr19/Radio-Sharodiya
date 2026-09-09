create extension if not exists pgcrypto;

create table if not exists public.beta_testers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) <= 254),
  name text not null default '' check (char_length(name) <= 80),
  status text not null default 'pending' check (status in ('pending', 'invited', 'active', 'rejected', 'revoked')),
  invite_code_hash text,
  invite_expires_at timestamptz,
  invite_sent_at timestamptz,
  activated_at timestamptz,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  session_version integer not null default 1 check (session_version > 0),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beta_testers_status_requested_idx
  on public.beta_testers (status, requested_at desc);

create table if not exists public.beta_admin_codes (
  email text primary key check (email = lower(email) and char_length(email) <= 254),
  code_hash text,
  expires_at timestamptz,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  last_sent_at timestamptz
);

alter table public.beta_testers enable row level security;
alter table public.beta_admin_codes enable row level security;

revoke all on table public.beta_testers from anon, authenticated;
revoke all on table public.beta_admin_codes from anon, authenticated;

comment on table public.beta_testers is 'Manual-approval Radio Sharodiya beta access ledger. Accessed only by server-side functions.';
comment on table public.beta_admin_codes is 'Short-lived administrator sign-in codes. Accessed only by server-side functions.';
