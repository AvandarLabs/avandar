-- Table: tokens__google
create table public.tokens__google (
  -- Primary key
  id uuid primary key default gen_random_uuid(),

  -- User this token belongs to. This value is not unique because an individual
  -- user might connect multiple different google accounts to our app.
  user_id uuid not null
    references auth.users(id)
    on update cascade
    on delete cascade,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- This makes querying for expired tokens easy
  expiry_date timestamptz not null,

  -- The ID of the Google account that this token belongs to.
  -- This comes from id_token.sub during OAuth. A user's google account ID
  -- will never change.
  google_account_id text not null,

  -- The email address of the Google account that this token belongs to.
  -- This comes from id_token.email during OAuth. This is useful for UI,
  -- to show the user which account is connected. But it is not a stable
  -- identifier. A user can change their email handle.
  google_email text not null,

  -- Short-lived token to send in every API request to prove we're authorized
  access_token text not null,

  -- Long-term token to use when access_token expires. Use this to
  -- request a new access_token. If the refresh_token ever doesn't work,
  -- then it means we need to ask the user to reauthenticate.
  refresh_token text not null,

  -- Useful to check what permissions we have been granted. We can use
  -- this for debugging or before making API calls. This string is a
  -- space-separated list of scopes.
  scope text not null,

  -- Constraint: combinations of user_id and google_account_id are unique.
  constraint tokens__google__user_google_account_unique unique (user_id, google_account_id)
);

-- Enable RLS but don't add any policies so that the only way to
-- access this table is by using the Supabase service role key.
alter table public.tokens__google enable row level security;

-- Policies: tokens__google
create policy "User can SELECT their own google tokens"
  on public.tokens__google for select
  to authenticated
  using (user_id = auth.uid());

create policy "User can INSERT their own google tokens"
  on public.tokens__google for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "User can UPDATE their own google tokens"
  on public.tokens__google for update
  to authenticated
  using (user_id = auth.uid());

create policy "User can DELETE their own google tokens"
  on public.tokens__google for delete
  to authenticated
  using (user_id = auth.uid());

-- Trigger: update `updated_at` on row modification
create trigger tr_tokens__google__set_updated_at
  before update on public.tokens__google
  for each row
  execute function public.util__set_updated_at();