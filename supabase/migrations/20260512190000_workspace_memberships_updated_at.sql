-- `tr_workspace_memberships__set_updated_at` calls `util__set_updated_at`,
-- which requires an `updated_at` column on the table.
alter table public.workspace_memberships
add column if not exists updated_at timestamptz not null default now();

update public.workspace_memberships
set
  updated_at = created_at;
