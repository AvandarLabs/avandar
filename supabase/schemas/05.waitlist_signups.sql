-- Table representing waitlist signups.
-- We do not enable row level security for this table because it should only
-- be accessed via a Supabase Admin client through an edge function.
create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now(),
  signup_code text unique not null,
  code_is_used boolean not null default false
);

-- Enable row level security
-- But we intentionally do not add any policies because this should only be
-- accessed via the Supabase service role.
alter table public.waitlist_signups enable row level security;
