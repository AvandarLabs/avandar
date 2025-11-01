create type public.value_extractors__value_picker_rule_type as enum(
  'most_frequent',
  'first',
  'sum',
  'avg',
  'count',
  'max',
  'min'
);

create table public.value_extractors__dataset_column_value (
  id uuid primary key default gen_random_uuid(),
  -- Workspace this value extractor config belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entity_field_config_id uuid not null unique references entity_field_configs (id) on update cascade on delete cascade,
  value_picker_rule_type public.value_extractors__value_picker_rule_type not null,
  dataset_id uuid not null,
  dataset_column_id uuid not null
);

-- Enable row level security
alter table public.value_extractors__dataset_column_value enable row level security;

-- Policies
create policy "
  User can SELECT value_extractors__dataset_column_value
" on public.value_extractors__dataset_column_value for
select
  to authenticated using (
    public.value_extractors__dataset_column_value.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT value_extractors__dataset_column_value
" on public.value_extractors__dataset_column_value for insert to authenticated
with
  check (
    public.value_extractors__dataset_column_value.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can UPDATE value_extractors__dataset_column_value
" on public.value_extractors__dataset_column_value
for update
  to authenticated
with
  check (
    public.value_extractors__dataset_column_value.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can DELETE value_extractors__dataset_column_value
" on public.value_extractors__dataset_column_value for delete to authenticated using (
  public.value_extractors__dataset_column_value.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_value_extractors__dataset_column_value_set_updated_at before
update on public.value_extractors__dataset_column_value for each row
execute function public.util__set_updated_at ();

-- Index for entity field + workspace filtering
create index idx_dataset_column_value_extractors__efc_id_workspace_id on public.value_extractors__dataset_column_value (
  entity_field_config_id,
  workspace_id
);
