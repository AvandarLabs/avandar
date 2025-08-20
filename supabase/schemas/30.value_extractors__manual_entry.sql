create table public.value_extractors__manual_entry (
  id uuid primary key default gen_random_uuid(),
  -- Workspace this value extractor config belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entity_field_config_id uuid not null unique references entity_field_configs (id) on update cascade on delete cascade
);

-- Enable row level security
alter table public.value_extractors__manual_entry enable row level security;

-- Policies
create policy "
  User can SELECT value_extractors__manual_entry
" on public.value_extractors__manual_entry for
select
  to authenticated using (
    public.value_extractors__manual_entry.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT value_extractors__manual_entry
" on public.value_extractors__manual_entry for insert to authenticated
with
  check (
    public.value_extractors__manual_entry.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can UPDATE value_extractors__manual_entry
" on public.value_extractors__manual_entry
for update
  to authenticated
with
  check (
    public.value_extractors__manual_entry.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can DELETE value_extractors__manual_entry
" on public.value_extractors__manual_entry for delete to authenticated using (
  public.value_extractors__manual_entry.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_value_extractors__manual_entry_set_updated_at before
update on public.value_extractors__manual_entry for each row
execute function public.util__set_updated_at ();

-- Index for entity field + workspace filtering
create index idx_manual_entry_value_extractors__efc_id_workspace_id on public.value_extractors__manual_entry (
  entity_field_config_id,
  workspace_id
);
