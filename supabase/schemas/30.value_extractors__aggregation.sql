create type public.value_extractors__aggregation_type as enum(
  'sum',
  'max',
  'count'
);

create table public.value_extractors__aggregation (
  id uuid primary key default gen_random_uuid(),
  -- Workspace this value extractor config belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entity_field_config_id uuid not null unique references entity_field_configs (id) on update cascade on delete cascade,
  aggregation_type public.value_extractors__aggregation_type not null,
  dataset_id uuid not null,
  dataset_field_id uuid not null,
  filter jsonb
);

-- Enable row level security
alter table public.value_extractors__aggregation enable row level security;

-- Policies
create policy "
  User can SELECT value_extractors__aggregation
" on public.value_extractors__aggregation for
select
  to authenticated using (
    public.value_extractors__aggregation.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT value_extractors__aggregation
" on public.value_extractors__aggregation for insert to authenticated
with
  check (
    public.value_extractors__aggregation.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can UPDATE value_extractors__aggregation
" on public.value_extractors__aggregation
for update
  to authenticated
with
  check (
    public.value_extractors__aggregation.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can DELETE value_extractors__aggregation
" on public.value_extractors__aggregation for delete to authenticated using (
  public.value_extractors__aggregation.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_value_extractors__aggregation_set_updated_at before
update on public.value_extractors__aggregation for each row
execute function public.util__set_updated_at ();

-- Index for entity field + workspace filtering
create index idx_value_extractors__aggregation__entity_field_config_id_workspace_id on public.value_extractors__aggregation (
  entity_field_config_id,
  workspace_id
);
