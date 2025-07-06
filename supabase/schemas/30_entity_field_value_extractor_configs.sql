-- Enums for value_extractors
create type public.value_extractors__value_picker_rule_type as enum ('most_frequent', 'first');
create type public.value_extractors__aggregation_type as enum ('sum', 'max', 'count');

-- Table: value_extractors__dataset_column_value
create table public.value_extractors__dataset_column_value (
  id uuid primary key default gen_random_uuid(),

  -- Workspace this value extractor config belongs to
  workspace_id uuid not null
    references public.workspaces(id)
    on update cascade
    on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entity_field_config_id uuid not null
    references entity_field_configs(id)
    on update cascade
    on delete cascade,
  value_picker_rule_type public.value_extractors__value_picker_rule_type not null,
  dataset_id uuid not null,
  dataset_field_id uuid not null
);

-- Table: value_extractors__manual_entry
create table public.value_extractors__manual_entry (
  id uuid primary key default gen_random_uuid(),

  -- Workspace this value extractor config belongs to
  workspace_id uuid not null
    references public.workspaces(id)
    on update cascade
    on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entity_field_config_id uuid not null
    references entity_field_configs(id)
    on update cascade
    on delete cascade
);

-- Table: value_extractors__aggregation
create table public.value_extractors__aggregation (
  id uuid primary key default gen_random_uuid(),

  -- Workspace this value extractor config belongs to
  workspace_id uuid not null
    references public.workspaces(id)
    on update cascade
    on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entity_field_config_id uuid not null
    references entity_field_configs(id)
    on update cascade
    on delete cascade,
  aggregation_type public.value_extractors__aggregation_type not null,
  dataset_id uuid not null,
  dataset_field_id uuid not null,
  filter jsonb
);

-- Enable row level security
alter table public.value_extractors__dataset_column_value enable row level security;
alter table public.value_extractors__manual_entry enable row level security;
alter table public.value_extractors__aggregation enable row level security;

-- Create policies
-- `select` policies
create policy "User can SELECT value_extractors__dataset_column_value"
  on public.value_extractors__dataset_column_value for select
  to authenticated
  using (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can SELECT value_extractors__manual_entry"
  on public.value_extractors__manual_entry for select
  to authenticated
  using (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can SELECT value_extractors__aggregation"
  on public.value_extractors__aggregation for select
  to authenticated
  using (public.util__auth_user_is_workspace_member(workspace_id));

-- `insert` policies
create policy "User can INSERT value_extractors__dataset_column_value"
  on public.value_extractors__dataset_column_value for insert
  to authenticated
  with check (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can INSERT value_extractors__manual_entry"
  on public.value_extractors__manual_entry for insert
  to authenticated
  with check (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can INSERT value_extractors__aggregation"
  on public.value_extractors__aggregation for insert
  to authenticated
  with check (public.util__auth_user_is_workspace_member(workspace_id));

-- `update` policies
create policy "User can UPDATE value_extractors__dataset_column_value"
  on public.value_extractors__dataset_column_value for update
  to authenticated
  with check (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can UPDATE value_extractors__manual_entry"
  on public.value_extractors__manual_entry for update
  to authenticated
  with check (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can UPDATE value_extractors__aggregation"
  on public.value_extractors__aggregation for update
  to authenticated
  with check (public.util__auth_user_is_workspace_member(workspace_id));

-- `delete` policies
create policy "User can DELETE value_extractors__dataset_column_value"
  on public.value_extractors__dataset_column_value for delete
  to authenticated
  using (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can DELETE value_extractors__manual_entry"
  on public.value_extractors__manual_entry for delete
  to authenticated
  using (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can DELETE value_extractors__aggregation"
  on public.value_extractors__aggregation for delete
  to authenticated
  using (public.util__auth_user_is_workspace_member(workspace_id));

-- Create updated_at triggers
create trigger tr_value_extractors__dataset_column_value_set_updated_at
  before update on public.value_extractors__dataset_column_value
  for each row
  execute function public.util__set_updated_at();

create trigger tr_value_extractors__manual_entry_set_updated_at
  before update on public.value_extractors__manual_entry
  for each row
  execute function public.util__set_updated_at();

create trigger tr_value_extractors__aggregation_set_updated_at
  before update on public.value_extractors__aggregation
  for each row
  execute function public.util__set_updated_at();

-- Create indexes for better query performance on workspace filtering
create index idx_value_extractors__dataset_column_value__entity_field_config_id_workspace_id on public.value_extractors__dataset_column_value(entity_field_config_id, workspace_id);
create index idx_value_extractors__manual_entry__entity_field_config_id_workspace_id on public.value_extractors__manual_entry(entity_field_config_id, workspace_id);
create index idx_value_extractors__aggregation__entity_field_config_id_workspace_id on public.value_extractors__aggregation(entity_field_config_id, workspace_id);
