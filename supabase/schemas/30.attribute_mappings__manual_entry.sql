create table public.attribute_mappings__manual_entry (
  id uuid primary key default gen_random_uuid(),
  -- Workspace this attribute mapping belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  concept_attribute_id uuid not null unique references concept_attributes (id) on update cascade on delete cascade
);

-- Enable row level security
alter table public.attribute_mappings__manual_entry enable row level security;

-- Policies
create policy "
  User can SELECT attribute_mappings__manual_entry
" on public.attribute_mappings__manual_entry for
select
  to authenticated using (
    public.attribute_mappings__manual_entry.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT attribute_mappings__manual_entry
" on public.attribute_mappings__manual_entry for insert to authenticated
with
  check (
    public.attribute_mappings__manual_entry.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can UPDATE attribute_mappings__manual_entry
" on public.attribute_mappings__manual_entry
for update
  to authenticated
with
  check (
    public.attribute_mappings__manual_entry.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can DELETE attribute_mappings__manual_entry
" on public.attribute_mappings__manual_entry for delete to authenticated using (
  public.attribute_mappings__manual_entry.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_attribute_mappings__manual_entry_set_updated_at before
update on public.attribute_mappings__manual_entry for each row
execute function public.util__set_updated_at ();

-- Index for concept attribute + workspace filtering. Named to match its
-- `dataset_column` peer, which has to drop the `_id` suffixes to stay inside
-- Postgres' 63-byte identifier limit.
create index idx_attribute_mappings__manual_entry__attribute_workspace on public.attribute_mappings__manual_entry (concept_attribute_id, workspace_id);
